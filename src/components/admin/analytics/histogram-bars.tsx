"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "framer-motion";

import { NumberTicker } from "@/components/ui/number-ticker";

import { PanelCard } from "@/components/admin/analytics/_panel-card";

export interface HistogramBarsDatum {
  bucket: string;
  value: number;
}

export interface HistogramBarsProps {
  title: string;
  description?: string;
  data: HistogramBarsDatum[];
  className?: string;
}

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const FULL = new Intl.NumberFormat("en-US");

export function HistogramBars({
  title,
  description,
  data,
  className,
}: HistogramBarsProps) {
  const reduced = useReducedMotion();
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  const max = React.useMemo(
    () => data.reduce((acc, d) => Math.max(acc, d.value), 0),
    [data],
  );
  const total = React.useMemo(
    () => data.reduce((acc, d) => acc + d.value, 0),
    [data],
  );

  return (
    <PanelCard
      title={title}
      description={description}
      className={className}
      action={
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-jetbrains uppercase text-[9px] tracking-[0.18em] text-muted-foreground">
            Total
          </span>
          <NumberTicker
            value={total}
            className="font-fraunces text-2xl font-light tabular-nums leading-none text-foreground dark:text-foreground"
          />
        </div>
      }
    >
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 16, right: 8, left: -8, bottom: 0 }}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              <linearGradient id="hist-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--p-blue)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="var(--p-blue)" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="2 4"
              opacity={0.4}
            />
            <XAxis
              dataKey="bucket"
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: 10,
                fontFamily: "var(--font-jetbrains-mono, monospace)",
                fill: "var(--muted-foreground)",
                letterSpacing: "0.12em",
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: 10,
                fontFamily: "var(--font-jetbrains-mono, monospace)",
                fill: "var(--muted-foreground)",
              }}
              tickFormatter={(v) => COMPACT.format(Number(v))}
              width={36}
            />
            <Tooltip
              cursor={{ fill: "color-mix(in oklab, var(--muted) 4%, transparent)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0];
                const raw = p.payload as HistogramBarsDatum;
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 shadow-md">
                    <div className="font-jetbrains text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {raw.bucket}
                    </div>
                    <div className="font-fraunces text-lg font-light tabular-nums text-foreground">
                      {FULL.format(raw.value)}
                    </div>
                    {max > 0 ? (
                      <div className="font-jetbrains text-[10px] tabular-nums text-muted-foreground">
                        {((raw.value / max) * 100).toFixed(1)}% of peak
                      </div>
                    ) : null}
                  </div>
                );
              }}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 2, 2]}
              isAnimationActive={!reduced}
              animationDuration={900}
              onMouseEnter={(_, i) => setHoveredIdx(i)}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill="url(#hist-grad)"
                  opacity={hoveredIdx === null || hoveredIdx === i ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  );
}
