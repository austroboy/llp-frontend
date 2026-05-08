import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { assertSameOrigin } from "@/lib/admin-csrf";
import { writeAuditLog } from "@/lib/admin-audit";
import { rateGuard } from "@/lib/rate-limit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const isAdmin = (user?.publicMetadata as Record<string, unknown>)?.role === "admin";
  if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const csrf = assertSameOrigin(req);
  if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const blocked = await rateGuard(req, 5);
  if (blocked) return blocked;

  const { id } = await params;
  const { status } = await req.json();

  if (!status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "status must be 'approved' or 'rejected'" }, { status: 400 });
  }

  const supabase = createServerClient();

  const updateData: Record<string, unknown> = {
    status,
    approved_by: userId,
  };

  if (status === "approved") {
    updateData.approved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("query_cache")
    .update(updateData)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    actorClerkId: userId,
    op: "cache.status-change",
    targetId: String(id),
    after: { status },
  });

  return NextResponse.json({ ok: true, status });
}
