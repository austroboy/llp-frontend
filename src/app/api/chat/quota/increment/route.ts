import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { getTierConfigAsync } from "@/lib/ai/tier-middleware";
import { resolveTier, type ClerkTierMetadata, type Tier } from "@/lib/ai/framework-types";

/**
 * Bumps the per-user daily counter and returns the live cap from the
 * Convex tier-config table (admin-editable). Admins bypass with an
 * Infinity limit so the cap-hit modal never opens for them.
 */

interface AdminMetadata extends ClerkTierMetadata {
  role?: string;
  contributor?: boolean;
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const metadata = user?.publicMetadata as AdminMetadata | undefined;
  const tier: Tier = metadata?.tier ? resolveTier(metadata) : "free_subscribed";
  const isAdmin = metadata?.role === "admin" || metadata?.contributor === true;

  const supabase = createServerClient();
  const date = todayUtcDate();

  const { data: existing } = await supabase
    .from("user_search_counter")
    .select("count")
    .eq("user_id", userId)
    .eq("count_date", date)
    .maybeSingle();

  const nextCount = (existing?.count ?? 0) + 1;

  const { error } = await supabase
    .from("user_search_counter")
    .upsert(
      {
        user_id: userId,
        count_date: date,
        count: nextCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,count_date" },
    );

  if (error) {
    return NextResponse.json(
      { error: "Failed to increment counter" },
      { status: 500 },
    );
  }

  const config = await getTierConfigAsync(tier);
  const limit = isAdmin ? Number.POSITIVE_INFINITY : config.dailyRequestLimit;

  return NextResponse.json({
    count: nextCount,
    limit,
    tier_id: tier,
  });
}
