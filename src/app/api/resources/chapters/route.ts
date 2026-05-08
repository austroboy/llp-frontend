import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const parentLaw = req.nextUrl.searchParams.get("parentLaw");

  let query = supabase
    .from("resource_chapters")
    .select("id, parent_law, chapter_number, title, title_bn, sections_range, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  if (parentLaw === "act" || parentLaw === "rules") {
    query = query.eq("parent_law", parentLaw);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ chapters: data || [] });
}
