import "server-only";

import { createServerClient } from "@/lib/supabase";
import type {
  KpiTargetPatch,
  KpiTargetRow,
  KpiUnit,
} from "@/lib/analytics/kpi-status";

const TABLE = "kpi_targets";

/**
 * Allowlist of editable columns. Whitelist-style sanitiser so unknown
 * keys never touch the row (mirrors the tier-config pattern).
 */
function sanitizePatch(patch: KpiTargetPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof patch.display_name === "string" && patch.display_name.trim().length > 0) {
    out.display_name = patch.display_name.trim().slice(0, 120);
  }
  if (typeof patch.target_value === "number" && Number.isFinite(patch.target_value)) {
    out.target_value = Math.max(0, patch.target_value);
  }
  if (typeof patch.warn_threshold_pct === "number" && Number.isFinite(patch.warn_threshold_pct)) {
    out.warn_threshold_pct = clampPct(patch.warn_threshold_pct);
  }
  if (typeof patch.red_threshold_pct === "number" && Number.isFinite(patch.red_threshold_pct)) {
    out.red_threshold_pct = clampPct(patch.red_threshold_pct);
  }
  if (
    patch.unit === "percent" ||
    patch.unit === "count" ||
    patch.unit === "bdt"
  ) {
    out.unit = patch.unit as KpiUnit;
  }
  return out;
}

function clampPct(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

export async function getKpiTargets(): Promise<KpiTargetRow[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("kpi_id", { ascending: true });
  if (error) {
    throw new Error(`kpi_targets select failed: ${error.message}`);
  }
  return (data ?? []) as KpiTargetRow[];
}

export async function getKpiTargetById(
  kpiId: string,
): Promise<KpiTargetRow | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("kpi_id", kpiId)
    .maybeSingle();
  if (error) {
    throw new Error(`kpi_targets getById(${kpiId}) failed: ${error.message}`);
  }
  return (data ?? null) as KpiTargetRow | null;
}

export async function updateKpiTarget(
  kpiId: string,
  patch: KpiTargetPatch,
  setBy: string,
): Promise<KpiTargetRow> {
  const supabase = createServerClient();
  const sanitized = sanitizePatch(patch);
  if (Object.keys(sanitized).length === 0) {
    throw new Error("no_editable_fields");
  }
  sanitized.set_by = setBy.slice(0, 200);
  const { data, error } = await supabase
    .from(TABLE)
    .update(sanitized)
    .eq("kpi_id", kpiId)
    .select("*")
    .single();
  if (error) {
    throw new Error(`kpi_targets update(${kpiId}) failed: ${error.message}`);
  }
  return data as KpiTargetRow;
}
