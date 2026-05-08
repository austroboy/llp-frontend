"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

import { PanelCard } from "@/components/admin/analytics/_panel-card";

export type FunnelStep = {
  label: string;
  count: number;
};

export interface FunnelChartProps {
  title: string;
  description?: string;
  steps: FunnelStep[];
  className?: string;
}

const LABEL_CLS =
  "font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground";

const formatNumber = (n: number): string => n.toLocaleString("en-US");
const formatPercent = (n: number): string => `${Math.round(n)}%`;

export function FunnelChart({
  title,
  description,
  steps,
  className,
}: FunnelChartProps) {
  const reduced = useReducedMotion();
  const top = steps[0]?.count ?? 0;
  const stepCount = Math.max(steps.length, 1);

  return (
    <PanelCard
      title={title}
      description={description}
      className={className}
      variant="ambient"
    >
      <ol className="flex flex-col gap-0">
        {steps.map((step, idx) => {
          const ratio = top > 0 ? step.count / top : 0;
          const widthPct = Math.max(ratio * 100, 10);
          const opacityRamp =
            stepCount > 1 ? 1 - (idx / (stepCount - 1)) * 0.55 : 1;
          const prev = idx > 0 ? steps[idx - 1] : null;
          const conv =
            prev && prev.count > 0 ? (step.count / prev.count) * 100 : null;
          const drop = prev ? step.count - prev.count : null;

          return (
            <li key={`${step.label}-${idx}`} className="flex flex-col">
              {prev ? (
                <div className="flex items-center gap-3 py-1.5 pl-1">
                  <span
                    className={cn(
                      LABEL_CLS,
                      "rounded-full border px-2 py-0.5 tabular-nums text-foreground/80",
                    )}
                  >
                    {conv !== null ? formatPercent(conv) : "—"}
                  </span>
                  <span
                    className={cn(
                      LABEL_CLS,
                      "tabular-nums",
                      drop !== null && drop < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-foreground/60",
                    )}
                  >
                    {drop !== null
                      ? `${drop < 0 ? "−" : "+"}${formatNumber(Math.abs(drop))}`
                      : ""}
                  </span>
                </div>
              ) : null}
              <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3 py-2 sm:grid-cols-[160px_1fr_auto] sm:gap-4">
                <div className={cn(LABEL_CLS, "truncate text-foreground")}>
                  {step.label}
                </div>
                <div className="relative h-9 overflow-hidden rounded-md border bg-muted/30">
                  <motion.div
                    aria-hidden
                    className="absolute inset-y-0 left-0 rounded-md"
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{
                      duration: 0.8,
                      delay: idx * 0.08,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      background: `linear-gradient(90deg, var(--p-blue) 0%, color-mix(in oklab, var(--p-blue) 7%, transparent) 100%)`,
                      opacity: opacityRamp,
                    }}
                  />
                </div>
                <div className="font-jetbrains tabular-nums text-sm text-foreground">
                  {formatNumber(step.count)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </PanelCard>
  );
}
