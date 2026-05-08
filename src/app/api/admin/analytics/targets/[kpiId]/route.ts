import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/admin-guard";
import {
  getKpiTargetById,
  updateKpiTarget,
} from "@/lib/kpi-targets";
import type { KpiTargetPatch } from "@/lib/analytics/kpi-status";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ kpiId: string }>;
}

/**
 * PATCH /api/admin/analytics/targets/[kpiId]
 *
 * Body: KpiTargetPatch. Strict role gate — only super_admin and
 * growth_admin may mutate KPI targets. read_only and tech_admin
 * see the resulting status pills but cannot rewrite the target.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext) {
  let user;
  try {
    user = await requireRole(["super_admin", "growth_admin"]);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "auth_failed" }, { status: 500 });
  }

  const { kpiId: rawKpiId } = await ctx.params;
  const kpiId = (rawKpiId ?? "").trim();
  if (!kpiId || kpiId.length > 80) {
    return NextResponse.json({ error: "invalid_kpi_id" }, { status: 400 });
  }

  let body: KpiTargetPatch;
  try {
    body = (await request.json()) as KpiTargetPatch;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const existing = await getKpiTargetById(kpiId);
    if (!existing) {
      return NextResponse.json({ error: "kpi_not_found" }, { status: 404 });
    }
    const updated = await updateKpiTarget(kpiId, body, user.id);
    return NextResponse.json({ target: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    console.error("[admin/analytics/targets/PATCH] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
