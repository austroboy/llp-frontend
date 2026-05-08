import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAdminUser } from "@/lib/admin-guard";

export async function GET(request: NextRequest) {
  // M-4: replace hand-rolled role check with shared guard.
  try {
    await requireAdminUser();
  } catch (resp) {
    if (resp instanceof Response) return resp;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const docFilter = searchParams.get("doc");
  const opFilter = searchParams.get("operation");

  const supabase = createServerClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (docFilter) query = query.eq("document_id", docFilter);
  if (opFilter) query = query.eq("operation", opFilter);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Stats queries — use DB-level counting instead of fetching all rows
  const [totalQ, auditsQ, savesQ, reragsQ, costQ, healthQ] = await Promise.all([
    supabase.from("audit_logs").select("*", { count: "exact", head: true }),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }).eq("operation", "audit"),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }).eq("operation", "save"),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }).eq("operation", "rerag"),
    supabase.from("audit_logs").select("cost_usd").not("cost_usd", "is", null),
    supabase.from("audit_logs").select("health_score").not("health_score", "is", null),
  ]);

  // Fix count: count all operations starting with "fix:" — fetch only the operation column
  const { data: fixOps } = await supabase
    .from("audit_logs")
    .select("operation")
    .like("operation", "fix:%");

  const costRows = costQ.data ?? [];
  const healthRows = healthQ.data ?? [];
  const totalCost = costRows.reduce((sum: number, r: { cost_usd: number }) => sum + (parseFloat(String(r.cost_usd)) || 0), 0);
  const avgHealth = healthRows.length > 0
    ? Math.round(healthRows.reduce((sum: number, r: { health_score: number }) => sum + r.health_score, 0) / healthRows.length)
    : null;

  const stats = {
    total: totalQ.count ?? 0,
    audits: auditsQ.count ?? 0,
    saves: savesQ.count ?? 0,
    rerags: reragsQ.count ?? 0,
    fixes: fixOps?.length ?? 0,
    totalCost,
    avgHealth,
  };

  return NextResponse.json({ logs: data ?? [], total: count ?? 0, page, stats });
}
