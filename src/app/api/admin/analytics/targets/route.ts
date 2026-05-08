import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-guard";
import { getKpiTargets } from "@/lib/kpi-targets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/analytics/targets
 *
 * Returns the KPI target rows. Admin-gated (any analytics role).
 * Read-only callers may consume this to render the scorecard;
 * mutations live on `/api/admin/analytics/targets/[kpiId]`.
 */
export async function GET() {
  try {
    await requireAdminUser();
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "auth_failed" }, { status: 500 });
  }

  try {
    const targets = await getKpiTargets();
    return NextResponse.json({ targets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    console.error("[admin/analytics/targets] GET failed:", msg);
    return NextResponse.json({ error: msg, targets: [] }, { status: 500 });
  }
}
