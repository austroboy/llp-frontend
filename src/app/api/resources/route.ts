import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServerClient();

  const [{ data: categories, error: catErr }, { data: files, error: fileErr }] =
    await Promise.all([
      supabase
        .from("resource_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("resource_files")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

  if (catErr || fileErr) {
    return NextResponse.json(
      { error: catErr?.message || fileErr?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ categories: categories || [], files: files || [] });
}
