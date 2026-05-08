"use client"

import * as React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import { useReducedMotion } from "framer-motion"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

import { PanelCard } from "@/components/admin/analytics/_panel-card"

export interface CohortTrendDatum {
  /** Cohort label (e.g. "2026-01-01"). */
  cohortLabel: string
  /** Cohort baseline size — drives the n= legend. */
  size: number
  /** Per-week retention as a percent (0..100). Index 0 = W0. */
  weeks: number[]
}

export interface CohortTrendLinesProps {
  title: string
  description?: string
  cohorts: CohortTrendDatum[]
  className?: string
}

// Recycle the existing chart-1..5 palette plus rust/sage extras so a
// 6+-cohort window still has distinct hues without inventing new
// design tokens. Lines are drawn in cohort order so the most recent
// cohort lands on top of the older traces.
const PALETTE = [
  "var(--p-blue)",
  "var(--p-blue-hi)",
  "var(--chart-3)",
  "var(--p-amber)",
  "var(--p-rust)",
  "hsl(15 70% 45%)",
  "hsl(160 40% 35%)",
  "hsl(220 50% 45%)",
]

const PERCENT_FORMAT = (v: number): string => `${Math.round(v)}%`

export function CohortTrendLines({
  title,
  description,
  cohorts,
  className,
}: CohortTrendLinesProps) {
  const { data, series, maxWeek } = React.useMemo(() => {
    if (cohorts.length === 0) {
      return {
        data: [] as Array<Record<string, number | string>>,
        series: [] as Array<{ key: string; label: string; color: string }>,
        maxWeek: 0,
      }
    }
    const m = cohorts.reduce((acc, c) => Math.max(acc, c.weeks.length - 1), 0)
    // Build x-axis: W0..Wm
    const rows: Array<Record<string, number | string>> = Array.from(
      { length: m + 1 },
      (_, i) => ({ week: `W${i}` }),
    )
    const seriesArr: Array<{ key: string; label: string; color: string }> = []
    cohorts.forEach((c, idx) => {
      const key = `c${idx}`
      seriesArr.push({
        key,
        label: `${c.cohortLabel} (n=${c.size.toLocaleString("en-US")})`,
        color: PALETTE[idx % PALETTE.length],
      })
      c.weeks.forEach((pct, wi) => {
        if (wi <= m) {
          rows[wi][key] = pct
        }
      })
    })
    return { data: rows, series: seriesArr, maxWeek: m }
  }, [cohorts])

  const chartConfig = React.useMemo<ChartConfig>(() => {
    return series.reduce<ChartConfig>((acc, s) => {
      acc[s.key] = { label: s.label, color: s.color }
      return acc
    }, {})
  }, [series])

  const reduced = useReducedMotion()

  return (
    <PanelCard
      title={title}
      description={description}
      className={className}
      variant="ambient"
    >
      {data.length === 0 || series.length === 0 ? (
          <div className="font-jetbrains text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            No cohort retention data
          </div>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="aspect-[16/9] w-full"
            >
              <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="font-jetbrains"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  domain={[0, 100]}
                  tickFormatter={PERCENT_FORMAT}
                  className="font-jetbrains"
                  tick={{ fontSize: 11 }}
                  width={36}
                />
                <ChartTooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={
                    <ChartTooltipContent
                      className="tabular-nums"
                      formatter={(value) => `${Math.round(Number(value))}%`}
                    />
                  }
                />
                {series.map((s, i) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ r: 2.5, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
                    isAnimationActive={!reduced}
                    animationDuration={1000}
                    animationBegin={i * 80}
                    animationEasing="ease-out"
                    connectNulls
                  />
                ))}
              </LineChart>
            </ChartContainer>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {series.map((s) => (
                <li key={s.key} className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate font-jetbrains text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-jetbrains text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              x: weeks since signup · y: % of cohort still active · max W{maxWeek}
            </p>
          </>
        )}
    </PanelCard>
  )
}
