import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

async function isAdmin() {
  const user = await currentUser();
  return user?.publicMetadata?.role === "admin";
}

// PATCH — update chapter content
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("resource_chapters")
    .update(body)
    .eq("id", parseInt(id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chapter: data });
}
