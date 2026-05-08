"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import {
  computeKpiStatus,
  formatKpiTarget,
  formatKpiValue,
  statusAccent,
  type KpiStatus,
  type KpiUnit,
} from "@/lib/analytics/kpi-status"
import { MotionStagger, MotionItem } from "@/components/admin/analytics/_motion"
import { useAnalyticsQuery } from "@/components/admin/analytics/use-analytics-query"
import type {
  ChatActivationRow,
  CitationHealthRow,
  DauMauStickinessRow,
  KpiSnapshotRow,
  SearchSatisfactionRow,
  SignupFunnelRow,
} from "@/lib/posthog/queries"

interface KpiTargetApiRow {
  kpi_id: string
  display_name: string
  target_value: number
  warn_threshold_pct: number
  red_threshold_pct: number
  unit: KpiUnit
}

interface KpiTargetsResponse {
  targets?: KpiTargetApiRow[]
  error?: string
}

function num(v: unknown): number {
  if (typeof v === "number") return v
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function nullableNum(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * KPI Scorecard — renders the six target rows with traffic-light
 * status pills. The actuals are computed from the existing
 * `useAnalyticsQuery` hook (so they respect the date-range picker)
 * and `computeKpiStatus` decides the pill colour.
 *
 * `max_tier_file_adoption` has no event source yet, so it always
 * lands in the "no-data" bucket. Kept in the scorecard so the matrix
 * is visible from day one.
 */
export function KpiScorecard({ className }: { className?: string }) {
  const [targets, setTargets] = React.useState<KpiTargetApiRow[]>([])
  const [targetsLoading, setTargetsLoading] = React.useState(true)
  const [targetsError, setTargetsError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    fetch("/api/admin/analytics/targets", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "")
          throw new Error(`HTTP ${res.status}: ${txt.slice(0, 120)}`)
        }
        return (await res.json()) as KpiTargetsResponse
      })
      .then((json) => {
        if (cancelled) return
        setTargets(json.targets ?? [])
        setTargetsLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setTargetsError(err instanceof Error ? err.message : "load failed")
        setTargetsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const kpiSnap = useAnalyticsQuery<KpiSnapshotRow & Record<string, unknown>>(
    "kpiSnapshot",
  )
  const funnel = useAnalyticsQuery<SignupFunnelRow & Record<string, unknown>>(
    "signupFunnel",
  )
  const activation = useAnalyticsQuery<
    ChatActivationRow & Record<string, unknown>
  >("chatActivation")
  const stickiness = useAnalyticsQuery<
    DauMauStickinessRow & Record<string, unknown>
  >("dauMauStickiness")
  const satisfaction = useAnalyticsQuery<
    SearchSatisfactionRow & Record<string, unknown>
  >("searchSatisfaction")
  // Citation health unused for this scorecard but kept in the hook list
  // so the cache remains warm; the pre-existing overview tab does not
  // consume it from here.
  void useAnalyticsQuery<CitationHealthRow & Record<string, unknown>>(
    "citationHealth",
  )

  const metrics = React.useMemo<Record<string, number | null>>(() => {
    const sFunnel = funnel.rows[0]
    const sSnap = kpiSnap.rows[0]
    const sAct = activation.rows[0]
    const sStick = stickiness.rows[0]
    const sSat = satisfaction.rows[0]

    const visitorPv = num(sFunnel?.step1_landing)
    const completed = num(sFunnel?.step3_completed)
    const visitorToSignup =
      visitorPv > 0 ? (completed / visitorPv) * 100 : null

    const signups = num(sAct?.signups)
    const firstChat = num(sAct?.activated_first_chat)
    const signupToFirstChat = signups > 0 ? (firstChat / signups) * 100 : null

    const signupsRecent = num(sSnap?.signups)
    const chatQueries = num(sSnap?.chat_queries)
    // Activation in 7d ≈ chat queries / signups in window — proxy until a
    // dedicated cohort-7d HogQL ships. Capped at 100 so a busy week with
    // few signups doesn't crash the pill into "spike" territory unfairly.
    const activationProxy =
      signupsRecent > 0
        ? Math.min((chatQueries / Math.max(signupsRecent, 1)) * 14, 100)
        : null

    const stick = nullableNum(sStick?.stickiness)
    const stickPct = stick === null ? null : stick * 100

    const satRaw = nullableNum(sSat?.satisfaction_rate)
    const satPct = satRaw === null ? null : satRaw * 100

    return {
      visitor_to_signup_rate: visitorToSignup,
      signup_to_first_chat_rate: signupToFirstChat,
      activation_rate_day_7: activationProxy,
      dau_mau_stickiness: stickPct,
      search_satisfaction_rate: satPct,
      max_tier_file_adoption: null,
    }
  }, [funnel.rows, kpiSnap.rows, activation.rows, stickiness.rows, satisfaction.rows])

  const dataLoading =
    kpiSnap.loading ||
    funnel.loading ||
    activation.loading ||
    stickiness.loading ||
    satisfaction.loading

  if (targetsLoading) {
    return (
      <Card className={cn("lf-card lf-card--feature", className)} style={{ padding: 0 }}>
        <CardHeader style={{ padding: "var(--s-5)" }}>
          <CardTitle className="lf-h2" style={{ margin: 0 }}>
            KPI Scorecard
          </CardTitle>
          <CardDescription className="lf-meta" style={{ textTransform: "uppercase" }}>
            Loading targets...
          </CardDescription>
        </CardHeader>
        <CardContent style={{ padding: "0 var(--s-5) var(--s-5)" }}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[110px] w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (targetsError) {
    return (
      <Card className={cn("lf-card lf-card--feature", className)} style={{ padding: 0 }}>
        <CardHeader style={{ padding: "var(--s-5)" }}>
          <CardTitle className="lf-h2" style={{ margin: 0 }}>
            KPI Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: "0 var(--s-5) var(--s-5)" }}>
          <p className="lf-meta" style={{ color: "var(--rust)" }}>
            Targets failed to load: {targetsError}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (targets.length === 0) {
    return (
      <Card className={cn("lf-card lf-card--feature", className)} style={{ padding: 0 }}>
        <CardHeader style={{ padding: "var(--s-5)" }}>
          <CardTitle className="lf-h2" style={{ margin: 0 }}>
            KPI Scorecard
          </CardTitle>
          <CardDescription className="lf-meta" style={{ textTransform: "uppercase" }}>
            No KPI targets configured
          </CardDescription>
        </CardHeader>
        <CardContent style={{ padding: "0 var(--s-5) var(--s-5)" }}>
          <p className="lf-body" style={{ color: "var(--ink-3)" }}>
            Run the kpi_targets migration to seed the default scorecard rows.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden lf-card lf-card--feature",
        className,
      )}
      style={{ padding: 0 }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in oklab, var(--chart-1) 7%, transparent),transparent_55%)]"
      />
      <CardHeader className="relative z-[1]" style={{ padding: "var(--s-5) var(--s-5) var(--s-3)" }}>
        <CardTitle className="lf-h2" style={{ margin: 0 }}>
          KPI Scorecard
        </CardTitle>
        <CardDescription className="lf-meta" style={{ textTransform: "uppercase" }}>
          Each ring fills toward target. Edit targets at{" "}
          <code style={{ fontFamily: "var(--lf-mono)", fontSize: 10 }}>/admin/analytics/targets</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-[1]" style={{ padding: "0 var(--s-5) var(--s-5)" }}>
        <MotionStagger className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {targets.map((t) => {
            const metric = metrics[t.kpi_id] ?? null
            const status = dataLoading
              ? ("no-data" as KpiStatus)
              : computeKpiStatus(
                  metric,
                  t.target_value,
                  t.warn_threshold_pct,
                  t.red_threshold_pct,
                )
            return (
              <MotionItem key={t.kpi_id}>
                <ScoreTile
                  title={t.display_name}
                  value={dataLoading ? null : metric}
                  target={t.target_value}
                  unit={t.unit}
                  status={status}
                />
              </MotionItem>
            )
          })}
        </MotionStagger>
      </CardContent>
    </Card>
  )
}

const STATUS_STROKE: Record<KpiStatus, string> = {
  green: "var(--chart-2)",
  yellow: "var(--chart-4)",
  red: "var(--destructive)",
  spike: "var(--chart-3)",
  "no-data": "var(--muted-foreground)",
}

function ScoreTile({
  title,
  value,
  target,
  unit,
  status,
}: {
  title: string
  value: number | null
  target: number
  unit: KpiUnit
  status: KpiStatus
}) {
  const accent = statusAccent(status)
  const reduced = useReducedMotion()
  const pct =
    value !== null && target > 0
      ? Math.max(0, Math.min(1.5, value / target))
      : 0
  const ringPct = Math.min(1, pct) // visual cap at 100%
  const stroke = STATUS_STROKE[status]

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-background/60 p-4",
        "transition-colors duration-200 hover:border-foreground/30",
        "hover:bg-background/80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-fraunces text-sm font-light leading-snug tracking-tight text-foreground">
          {title}
        </h4>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 font-jetbrains text-[9px] uppercase tracking-[0.14em]",
            accent.bg,
            accent.border,
            accent.text,
          )}
        >
          {accent.label}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Ring percent={ringPct} stroke={stroke} animate={!reduced} />
        <div className="flex flex-col">
          <span className="font-fraunces text-2xl font-light leading-none tabular-nums text-foreground">
            {formatKpiValue(value, unit)}
          </span>
          <span className="mt-1 font-jetbrains text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            of {formatKpiTarget(target, unit)}
          </span>
        </div>
      </div>
    </div>
  )
}

function Ring({
  percent,
  stroke,
  animate,
  size = 48,
}: {
  percent: number
  stroke: string
  animate: boolean
  size?: number
}) {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - percent)
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={3}
        className="stroke-border/50"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={animate ? { strokeDashoffset: c } : { strokeDashoffset: offset }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}
