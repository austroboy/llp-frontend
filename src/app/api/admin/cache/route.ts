import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { assertSameOrigin } from "@/lib/admin-csrf";
import { writeAuditLog } from "@/lib/admin-audit";
import { rateGuard } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const isAdmin = (user?.publicMetadata as Record<string, unknown>)?.role === "admin";
  if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const supabase = createServerClient();
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const statusFilter = req.nextUrl.searchParams.get("status"); // pending, approved, auto_approved, rejected
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("query_cache")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: entries, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get total and status counts
  const [
    { count: total },
    { count: pendingCount },
    { count: approvedCount },
    { count: autoApprovedCount },
    { count: rejectedCount },
  ] = await Promise.all([
    supabase.from("query_cache").select("*", { count: "exact", head: true }),
    supabase.from("query_cache").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("query_cache").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("query_cache").select("*", { count: "exact", head: true }).eq("status", "auto_approved"),
    supabase.from("query_cache").select("*", { count: "exact", head: true }).eq("status", "rejected"),
  ]);

  return NextResponse.json({
    entries: entries || [],
    total: total || 0,
    page,
    pages: Math.ceil((total || 0) / limit),
    stats: {
      total: total || 0,
      pending: pendingCount || 0,
      approved: (approvedCount || 0) + (autoApprovedCount || 0),
      auto_approved: autoApprovedCount || 0,
      rejected: rejectedCount || 0,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const isAdmin = (user?.publicMetadata as Record<string, unknown>)?.role === "admin";
  if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const csrf = assertSameOrigin(req);
  if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const blocked = await rateGuard(req, 5);
  if (blocked) return blocked;

  const cacheId = req.nextUrl.searchParams.get("id");
  if (!cacheId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase.from("query_cache").delete().eq("id", cacheId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    actorClerkId: userId,
    op: "cache.delete",
    targetId: String(cacheId),
  });

  return NextResponse.json({ ok: true });
}
