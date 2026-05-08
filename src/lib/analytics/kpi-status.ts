/**
 * Pure KPI status calculator. Used by the analytics scorecard.
 *
 *   - "spike"   : actual >= target * 1.5 (well above target)
 *   - "green"   : actual >= target
 *   - "yellow"  : shortfall <= warnPct (close-but-not-yet)
 *   - "red"     : shortfall > warnPct
 *   - "no-data" : metric is null
 *
 * `warnPct` and `redPct` are percentages (0-100). Today only `warnPct`
 * is consulted by the calculator; `redPct` is wired into the data
 * model so a future split (yellow vs red separately) can land
 * without a migration.
 */
export type KpiStatus = "green" | "yellow" | "red" | "spike" | "no-data";

export interface KpiTargetRow {
  kpi_id: string;
  display_name: string;
  target_value: number;
  warn_threshold_pct: number;
  red_threshold_pct: number;
  unit: KpiUnit;
  set_by: string;
  updated_at: string;
}

export type KpiUnit = "percent" | "count" | "bdt";

export type KpiTargetPatch = Partial<
  Pick<
    KpiTargetRow,
    "display_name" | "target_value" | "warn_threshold_pct" | "red_threshold_pct" | "unit"
  >
>;

export function computeKpiStatus(
  metric: number | null,
  target: number,
  warnPct: number,
  redPct: number,
): KpiStatus {
  if (metric === null || Number.isNaN(metric)) return "no-data";
  if (target <= 0) return "no-data";
  if (metric >= target * 1.5) return "spike";
  if (metric >= target) return "green";
  const shortfall = (target - metric) / target;
  if (shortfall <= warnPct / 100) return "yellow";
  // `redPct` is reserved for a future split: today anything past warn
  // is red. A consumer that wants a stricter "very-red" threshold can
  // compare against `redPct` separately.
  void redPct;
  return "red";
}

/**
 * Map a KpiStatus to a Codex-aesthetic palette accent. Used by the
 * scorecard pill component. Kept here so server + client share one
 * source of truth.
 */
export function statusAccent(status: KpiStatus): {
  label: string;
  text: string;
  bg: string;
  border: string;
} {
  switch (status) {
    case "green":
      return {
        label: "On target",
        text: "text-emerald-700 dark:text-emerald-300",
        bg: "bg-emerald-50/60 dark:bg-emerald-950/30",
        border: "border-emerald-700/30 dark:border-emerald-500/30",
      };
    case "yellow":
      return {
        label: "Below target",
        text: "text-amber-800 dark:text-amber-200",
        bg: "bg-amber-50/60 dark:bg-amber-950/30",
        border: "border-amber-700/30 dark:border-amber-500/30",
      };
    case "red":
      return {
        // Codex rust accent — same family as the jb-primary CTA.
        label: "Off track",
        text: "text-rose-800 dark:text-rose-200",
        bg: "bg-rose-50/60 dark:bg-rose-950/30",
        border: "border-rose-700/30 dark:border-rose-500/30",
      };
    case "spike":
      return {
        label: "Spike",
        text: "text-yellow-900 dark:text-yellow-100",
        bg: "bg-yellow-50/70 dark:bg-yellow-900/30",
        border: "border-yellow-700/40 dark:border-yellow-400/30",
      };
    case "no-data":
    default:
      return {
        label: "No data",
        text: "text-muted-foreground",
        bg: "bg-muted/40",
        border: "border-border",
      };
  }
}

/**
 * Format a metric value with the unit suffix used by the scorecard.
 */
export function formatKpiValue(
  metric: number | null,
  unit: KpiUnit,
): string {
  if (metric === null || !Number.isFinite(metric)) return "—";
  switch (unit) {
    case "percent":
      return `${metric.toFixed(1)}%`;
    case "bdt":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 0,
      }).format(metric);
    case "count":
    default:
      return new Intl.NumberFormat("en-US").format(Math.round(metric));
  }
}

export function formatKpiTarget(target: number, unit: KpiUnit): string {
  return formatKpiValue(target, unit);
}
