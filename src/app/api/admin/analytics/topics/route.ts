import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-guard";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CacheRow {
  id: number;
  computed_at: string;
  window_days: number;
  topics: Array<{ topic: string; count: number; examples: string[] }>;
}

const STALE_HOURS = 48;

/**
 * GET /api/admin/analytics/topics
 *
 * Returns the latest cached topic cluster + an `is_stale` flag if
 * the cache is older than 48h. Admin-gated.
 */
export async function GET() {
  try {
    await requireAdminUser();
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "auth_failed" }, { status: 500 });
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("search_topic_cache")
      .select("id, computed_at, window_days, topics")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const row = (data ?? null) as CacheRow | null;
    if (!row) {
      return NextResponse.json({
        topics: [],
        computed_at: null,
        window_days: 7,
        stale: true,
      });
    }
    const ageMs = Date.now() - new Date(row.computed_at).getTime();
    const stale = ageMs > STALE_HOURS * 3_600_000;
    return NextResponse.json({
      topics: row.topics,
      computed_at: row.computed_at,
      window_days: row.window_days,
      stale,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    console.error("[admin/analytics/topics] GET failed:", msg);
    return NextResponse.json(
      { error: msg, topics: [], computed_at: null, stale: true },
      { status: 500 },
    );
  }
}
