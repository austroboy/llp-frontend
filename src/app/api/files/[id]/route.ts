import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { softDeleteFile } from "@/lib/generated-files";

// DELETE /api/files/[id]
// Soft-delete: stamps `deleted_at` on the row + best-effort removes the
// object from Supabase Storage. Verifies ownership first.

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  try {
    const ok = await softDeleteFile(id, userId);
    if (!ok) {
      return NextResponse.json(
        { error: "not_found", message: "File not found or access denied." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: true, id },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[/api/files/${id}] DELETE failed:`, msg);
    return NextResponse.json(
      { error: "delete_failed", message: msg.slice(0, 200) },
      { status: 500 }
    );
  }
}
