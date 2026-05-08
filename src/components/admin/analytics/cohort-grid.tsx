"use client"

import * as React from "react"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

import { PanelCard } from "@/components/admin/analytics/_panel-card"

export type Cohort = {
  cohortLabel: string
  size: number
  weeks: number[]
}

export interface CohortGridProps {
  title: string
  cohorts: Cohort[]
  className?: string
}

const LABEL_CLS =
  "font-jetbrains uppercase text-[11px] tracking-[0.16em] text-muted-foreground"

const formatPercent = (n: number): string => `${Math.round(n)}%`

export function CohortGrid({ title, cohorts, className }: CohortGridProps) {
  const maxWeeks = cohorts.reduce(
    (m, c) => Math.max(m, c.weeks.length),
    0
  )
  const weekHeaders = Array.from({ length: maxWeeks }, (_, i) => `W${i}`)

  return (
    <PanelCard title={title} className={cn("overflow-hidden", className)}>
      <div className="overflow-x-auto">
          <div
            role="table"
            className="grid w-full min-w-fit"
            style={{
              gridTemplateColumns: `minmax(180px,200px) repeat(${maxWeeks}, minmax(56px,1fr))`,
            }}
          >
            <div
              role="columnheader"
              className={cn(
                LABEL_CLS,
                "sticky left-0 z-10 border-b border-r bg-card px-3 py-2"
              )}
            >
              Cohort
            </div>
            {weekHeaders.map((w) => (
              <div
                key={w}
                role="columnheader"
                className={cn(
                  LABEL_CLS,
                  "border-b px-2 py-2 text-center tabular-nums"
                )}
              >
                {w}
              </div>
            ))}

            {cohorts.map((c) => (
              <React.Fragment key={c.cohortLabel}>
                <div
                  role="rowheader"
                  className="sticky left-0 z-10 flex flex-col gap-0.5 border-b border-r bg-card px-3 py-2"
                >
                  <span className="font-fraunces text-sm text-foreground">
                    {c.cohortLabel}
                  </span>
                  <span
                    className={cn(LABEL_CLS, "tabular-nums normal-case")}
                  >
                    n={c.size.toLocaleString("en-US")}
                  </span>
                </div>
                {weekHeaders.map((_, wi) => {
                  const value = c.weeks[wi]
                  const hasValue = typeof value === "number"
                  const pct =
                    hasValue && c.size > 0 ? (value / c.size) * 100 : 0
                  // 2-stop opacity ramp from chart-1/0 to chart-1/1.
                  const opacity = hasValue ? Math.min(pct / 100, 1) : 0
                  const showLabel = hasValue && pct >= 10

                  return (
                    <HoverCard key={wi} openDelay={120} closeDelay={80}>
                      <HoverCardTrigger asChild>
                        <div
                          role="cell"
                          className="relative flex items-center justify-center border-b border-l text-xs tabular-nums text-foreground transition-colors duration-200 ease-out hover:border-primary"
                          style={{ minHeight: 38 }}
                        >
                          <div
                            aria-hidden
                            className="absolute inset-0"
                            style={{
                              backgroundColor: "var(--p-blue)",
                              opacity,
                            }}
                          />
                          <span
                            className={cn(
                              "relative z-[1] font-jetbrains",
                              opacity > 0.5
                                ? "text-background"
                                : "text-foreground"
                            )}
                          >
                            {showLabel ? formatPercent(pct) : ""}
                          </span>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent
                        side="top"
                        className="w-auto px-3 py-2 text-xs"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="font-fraunces text-sm text-foreground">
                            {c.cohortLabel} · W{wi}
                          </div>
                          <div className={cn(LABEL_CLS, "normal-case")}>
                            count{" "}
                            <span className="font-jetbrains tabular-nums text-foreground">
                              {hasValue
                                ? value.toLocaleString("en-US")
                                : "—"}
                            </span>
                          </div>
                          <div className={cn(LABEL_CLS, "normal-case")}>
                            retention{" "}
                            <span className="font-jetbrains tabular-nums text-foreground">
                              {hasValue ? formatPercent(pct) : "—"}
                            </span>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  )
                })}
              </React.Fragment>
            ))}
        </div>
      </div>
    </PanelCard>
  )
}
