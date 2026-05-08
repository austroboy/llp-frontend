import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { rateGuard } from "@/lib/rate-limit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await rateGuard(request, 60);
  if (guard) return guard;

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    updates.title = body.title;
  }
  if (typeof body.is_archived === "boolean") {
    updates.is_archived = body.is_archived;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const supabase = createServerClient();
  const { error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[conversations/[id]] PATCH error", { id, code: error.code, message: error.message, details: error.details });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await rateGuard(request, 60);
  if (guard) return guard;

  const { id } = await params;

  const supabase = createServerClient();
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[conversations/[id]] DELETE error", { id, code: error.code, message: error.message, details: error.details });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
