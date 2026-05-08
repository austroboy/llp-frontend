"use client"

import * as React from "react"

import { CalendarHeatmap, type CalendarHeatmapDatum } from "@/components/admin/analytics/calendar-heatmap"

export interface HeatmapDatum {
  /** Day-of-week, 1 = Mon ... 7 = Sun (PostHog `toDayOfWeek`). */
  dow: number
  /** 0 .. 23 (PostHog `toHour`). */
  hour: number
  /** Cell value (count of events). */
  value: number
}

export interface HeatmapProps {
  title: string
  description?: string
  data: HeatmapDatum[]
  className?: string
}

/**
 * Generic 7×24 heatmap wrapper for SI8 (Time-of-Use) and any future
 * dow×hour panel that should not look like the existing
 * `CalendarHeatmap` because it carries different semantics. Today
 * the visual is identical to `CalendarHeatmap`; the wrapper exists
 * so the SI8 panel can evolve (different palette, week start, etc.)
 * without touching every other consumer.
 */
export function Heatmap({ title, description, data, className }: HeatmapProps) {
  const mapped = React.useMemo<CalendarHeatmapDatum[]>(
    () =>
      data.map((d) => ({
        dow: d.dow,
        hour: d.hour,
        value: d.value,
      })),
    [data],
  )
  return (
    <CalendarHeatmap
      title={title}
      description={description}
      data={mapped}
      className={className}
    />
  )
}
