"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "framer-motion";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { PanelCard } from "@/components/admin/analytics/_panel-card";

export interface TrendChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface TrendChartProps {
  title: string;
  description?: string;
  data: Array<{ day: string } & Record<string, number | string>>;
  series: TrendChartSeries[];
  className?: string;
  action?: React.ReactNode;
}

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatDayTick(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return MONTH_FORMAT.format(parsed);
}

const NUMBER_FORMAT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function TrendChart({
  title,
  description,
  data,
  series,
  className,
  action,
}: TrendChartProps) {
  const reduced = useReducedMotion();

  const chartConfig = React.useMemo<ChartConfig>(() => {
    return series.reduce<ChartConfig>((acc, s) => {
      acc[s.key] = { label: s.label, color: s.color };
      return acc;
    }, {});
  }, [series]);

  const stacked = series.length > 1;
  const gradientPrefix = React.useId();

  return (
    <PanelCard
      title={title}
      description={description}
      className={className}
      variant="ambient"
      action={action}
    >
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[280px] w-full"
      >
        <AreaChart
          data={data}
          margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            {series.map((s) => {
              const id = `${gradientPrefix}-${s.key}`;
              return (
                <linearGradient
                  key={id}
                  id={id}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.55} />
                  <stop offset="60%" stopColor={s.color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="2 4"
            opacity={0.4}
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={formatDayTick}
            minTickGap={24}
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
            tickMargin={8}
            width={36}
            tickFormatter={(v: number) => NUMBER_FORMAT.format(v)}
            tick={{
              fontSize: 10,
              fontFamily: "var(--font-jetbrains-mono, monospace)",
              fill: "var(--muted-foreground)",
            }}
          />
          <ChartTooltip
            cursor={{
              stroke: "var(--foreground)",
              strokeOpacity: 0.3,
              strokeDasharray: "2 4",
            }}
            content={
              <ChartTooltipContent
                className="tabular-nums"
                labelFormatter={(value) =>
                  typeof value === "string"
                    ? formatDayTick(value)
                    : String(value)
                }
              />
            }
          />
          {series.map((s) => (
            <Area
              key={s.key}
              dataKey={s.key}
              name={s.label}
              type="monotone"
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#${gradientPrefix}-${s.key})`}
              stackId={stacked ? "stack" : undefined}
              isAnimationActive={!reduced}
              animationDuration={1000}
              animationEasing="ease-out"
              activeDot={{
                r: 4,
                strokeWidth: 2,
                stroke: "var(--background)",
              }}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </PanelCard>
  );
}
