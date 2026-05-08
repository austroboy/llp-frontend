"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";

export interface KpiCardSparklinePoint {
  day: string;
  value: number;
}

export interface KpiCardProps {
  label: string;
  value: number;
  delta?: number;
  prefix?: string;
  suffix?: string;
  sparkline?: KpiCardSparklinePoint[];
  tone?: "default" | "positive" | "negative";
  href?: string;
  className?: string;
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

const SPARK_HEIGHT = 56;

export function KpiCard({
  label,
  value,
  delta,
  prefix,
  suffix,
  sparkline,
  tone = "default",
  href,
  className,
}: KpiCardProps) {
  const reduced = useReducedMotion();
  const gradientId = React.useId();
  const hasSparkline = Array.isArray(sparkline) && sparkline.length > 1;
  const hasDelta = typeof delta === "number" && !Number.isNaN(delta);

  let deltaVariant: "secondary" | "destructive" | "outline" = "outline";
  let DeltaIcon: typeof ArrowUp = Minus;
  if (hasDelta) {
    if (delta! > 0) {
      deltaVariant = tone === "negative" ? "destructive" : "secondary";
      DeltaIcon = ArrowUp;
    } else if (delta! < 0) {
      deltaVariant = tone === "positive" ? "secondary" : "destructive";
      DeltaIcon = ArrowDown;
    } else {
      DeltaIcon = Minus;
    }
  }

  const accentColor =
    tone === "negative"
      ? "var(--destructive)"
      : tone === "positive"
        ? "var(--p-blue-hi)"
        : "var(--p-blue)";

  const card = (
    <motion.div
      className="relative h-full"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduced ? undefined : { y: -3 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card
        className={cn(
          "relative h-full overflow-hidden",
          "lf-card lf-card--feature",
          className,
        )}
        style={{ padding: "var(--s-4) var(--s-5)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 opacity-70"
          style={{
            background: `radial-gradient(120% 80% at 100% 0%, color-mix(in oklab, ${accentColor} 12%, transparent), transparent 55%)`,
          }}
        />
        <CardHeader
          className="relative z-[1] flex flex-row items-center justify-between gap-2 space-y-0"
          style={{ padding: 0, paddingBottom: "var(--s-2)" }}
        >
          <CardDescription
            className="lf-meta"
            style={{ textTransform: "uppercase" }}
          >
            {label}
          </CardDescription>
          <CardTitle className="sr-only">{label}</CardTitle>
          {hasDelta ? (
            <Badge
              variant={deltaVariant}
              className="font-jetbrains tabular-nums uppercase tracking-[0.08em] text-[10px]"
            >
              <DeltaIcon aria-hidden />
              {formatDelta(delta!)}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent
          className="relative z-[1] flex flex-col gap-3"
          style={{ padding: 0 }}
        >
          <div
            className="flex items-baseline gap-1 tabular-nums leading-none"
            style={{
              fontFamily: "var(--lf-display)",
              fontWeight: 400,
              color: "var(--ink)",
            }}
          >
            {prefix ? (
              <span className="text-2xl" style={{ color: "var(--ink-3)" }}>{prefix}</span>
            ) : null}
            <NumberTicker
              value={value}
              className="text-[44px] leading-none"
            />
            {suffix ? (
              <span className="text-2xl" style={{ color: "var(--ink-3)" }}>{suffix}</span>
            ) : null}
          </div>

          {hasSparkline ? (
            <div
              className="w-full"
              style={{ height: SPARK_HEIGHT }}
              aria-hidden
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sparkline}
                  margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id={`kpi-spark-${gradientId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={accentColor} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={accentColor}
                    strokeWidth={1.75}
                    fill={`url(#kpi-spark-${gradientId})`}
                    isAnimationActive={!reduced}
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        {card}
      </Link>
    );
  }

  return card;
}
