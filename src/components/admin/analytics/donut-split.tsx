"use client";

import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { NumberTicker } from "@/components/ui/number-ticker";

import { PanelCard } from "@/components/admin/analytics/_panel-card";

export interface DonutSplitDatum {
  label: string;
  value: number;
  color?: string;
}

export interface DonutSplitProps {
  title: string;
  data: DonutSplitDatum[];
  className?: string;
  description?: string;
}

// Theme-aware palette — uses palette-picker tokens (--p-blue / --p-rust /
// --p-amber + soft variants) so swapping theme actually re-skins the donut.
// Order picks max contrast first so a 2-slice donut gets primary + rust.
const FALLBACK_COLORS = [
  "var(--p-blue)",
  "var(--p-rust)",
  "var(--p-amber)",
  "var(--p-blue-hi)",
  "color-mix(in oklab, var(--p-rust) 65%, var(--p-amber) 35%)",
  "color-mix(in oklab, var(--p-blue) 55%, var(--p-amber) 45%)",
  "color-mix(in oklab, var(--p-blue) 50%, transparent)",
];

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const FULL = new Intl.NumberFormat("en-US");

function slugifyKey(label: string, index: number): string {
  const cleaned = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.length > 0 ? `${cleaned}-${index}` : `slice-${index}`;
}

export function DonutSplit({
  title,
  data,
  className,
  description,
}: DonutSplitProps) {
  const reduced = useReducedMotion();
  const [activeKey, setActiveKey] = React.useState<string | null>(null);

  const enriched = React.useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        key: slugifyKey(d.label, i),
        color: d.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      })),
    [data],
  );

  const total = React.useMemo(
    () =>
      enriched.reduce(
        (acc, d) => acc + (Number.isFinite(d.value) ? d.value : 0),
        0,
      ),
    [enriched],
  );

  const chartConfig = React.useMemo<ChartConfig>(() => {
    return enriched.reduce<ChartConfig>((acc, d) => {
      acc[d.key] = { label: d.label, color: d.color };
      return acc;
    }, {});
  }, [enriched]);

  const focused = enriched.find((d) => d.key === activeKey);
  const focusedPct =
    focused && total > 0 ? (focused.value / total) * 100 : null;

  return (
    <PanelCard
      title={title}
      description={description}
      className={className}
      variant="ambient"
    >
      <div className="flex flex-col gap-6">
        <div className="relative">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-[220px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="tabular-nums"
                    nameKey="label"
                    hideLabel
                  />
                }
              />
              <Pie
                data={enriched}
                dataKey="value"
                nameKey="label"
                innerRadius={64}
                outerRadius={96}
                strokeWidth={2}
                stroke="var(--background)"
                isAnimationActive={!reduced}
                animationDuration={900}
                animationBegin={0}
                onMouseEnter={(_, i) => setActiveKey(enriched[i]?.key ?? null)}
                onMouseLeave={() => setActiveKey(null)}
              >
                {enriched.map((d) => (
                  <Cell
                    key={d.key}
                    fill={d.color}
                    opacity={
                      activeKey === null || activeKey === d.key ? 1 : 0.35
                    }
                    style={{ transition: "opacity 200ms ease-out" }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1"
            aria-hidden
          >
            <span className="font-jetbrains uppercase text-[9px] tracking-[0.18em] text-muted-foreground">
              {focused ? focused.label : "Total"}
            </span>
            <span className="font-fraunces text-3xl font-light tabular-nums leading-none text-foreground">
              {focused ? (
                <span>
                  {focusedPct !== null ? `${focusedPct.toFixed(1)}%` : "—"}
                </span>
              ) : (
                <NumberTicker
                  value={total}
                  className="font-fraunces text-3xl font-light tabular-nums leading-none text-foreground dark:text-foreground"
                />
              )}
            </span>
            {focused ? (
              <span className="font-jetbrains text-[10px] tabular-nums text-muted-foreground">
                {FULL.format(focused.value)}
              </span>
            ) : enriched.length > 0 ? (
              <span className="font-jetbrains text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                {COMPACT.format(total)} total
              </span>
            ) : null}
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
          {enriched.map((d, i) => {
            const pct = total > 0 ? (d.value / total) * 100 : 0;
            const isActive = activeKey === d.key;
            return (
              <motion.li
                key={d.key}
                onMouseEnter={() => setActiveKey(d.key)}
                onMouseLeave={() => setActiveKey(null)}
                initial={reduced ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                className={cn(
                  "flex items-center gap-2 min-w-0 cursor-default rounded-md px-1 py-0.5",
                  "transition-colors duration-150",
                  isActive && "bg-muted/40",
                )}
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="flex-1 truncate font-jetbrains text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {d.label}
                </span>
                <span className="font-jetbrains text-[11px] tabular-nums text-foreground">
                  {pct.toFixed(1)}%
                </span>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </PanelCard>
  );
}
