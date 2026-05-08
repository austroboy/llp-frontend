import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { rateGuard } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await rateGuard(request, 30);
  if (guard) return guard;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at, is_archived, language")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
