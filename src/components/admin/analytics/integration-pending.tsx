"use client";

import * as React from "react";
import { CircleDashed } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type IntegrationPendingStatus = "not-connected" | "pending-data" | "soon";

export type IntegrationPendingPill =
  | "Pending payment integration"
  | "Pending email automation"
  | "Pending AI reporting"
  | "Pending campaign launch"
  | "Pending data";

export interface IntegrationPendingCardProps {
  /** Headline of the metric / surface, e.g. "Monthly Recurring Revenue". */
  title: string;
  /** 1–2 sentences describing what this metric will measure. */
  body: string;
  /** Which integration unlocks this surface, e.g. "Stripe payment webhook". */
  unlockedBy: string;
  /** Pipeline status — drives the visible pill text. */
  status: IntegrationPendingStatus;
  /** Optional roadmap hint, e.g. "Phase 2 — after payments". */
  estimatedTimeline?: string;
  /** Optional reference target, e.g. "≥ ৳50K/month". Renders below the dashes. */
  targetValue?: string;
  /** Override the default pill copy with a more specific label. */
  pillLabel?: IntegrationPendingPill;
  className?: string;
}

const DEFAULT_PILL_FOR_STATUS: Record<
  IntegrationPendingStatus,
  IntegrationPendingPill
> = {
  "not-connected": "Pending payment integration",
  "pending-data": "Pending data",
  soon: "Pending AI reporting",
};

export function IntegrationPendingCard({
  title,
  body,
  unlockedBy,
  status,
  estimatedTimeline,
  targetValue,
  pillLabel,
  className,
}: IntegrationPendingCardProps) {
  const resolvedPill = pillLabel ?? DEFAULT_PILL_FOR_STATUS[status];

  return (
    <Card
      className={cn(
        // Match KpiCard surface: border, no shadow, hover border lift.
        "relative overflow-hidden border bg-card transition-[border-color] duration-200 ease-out hover:border-foreground/40",
        "shadow-none",
        className,
      )}
    >
      {/* Muted ash overlay + dashed border accent — signals "inert until wired". */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl bg-zinc-50/40 dark:bg-zinc-900/30"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-px rounded-[10px] border border-dashed border-zinc-300/60 dark:border-zinc-700/60"
      />

      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-3">
          <CardDescription className="font-jetbrains uppercase text-[11px] tracking-[0.16em] text-muted-foreground">
            {title}
          </CardDescription>

          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5",
              "font-jetbrains uppercase text-[10px] tracking-[0.16em]",
              // Muted rust/amber tone — never green.
              "border-amber-700/30 bg-amber-50/40 text-amber-800",
              "dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200/80",
            )}
          >
            <CircleDashed className="h-2.5 w-2.5" aria-hidden />
            <span>{resolvedPill}</span>
          </span>
        </div>
        <CardTitle className="sr-only">{title}</CardTitle>
      </CardHeader>

      <CardContent className="relative flex flex-col gap-4">
        <div className="flex items-baseline justify-center gap-1 font-fraunces font-light tabular-nums leading-none text-muted-foreground/60">
          <span className="text-[56px] leading-none">—</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          {targetValue ? (
            <span className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground">
              Target {targetValue}
            </span>
          ) : null}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>

        <div className="flex flex-col gap-1 border-t border-dashed border-border/60 pt-3">
          <span className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground">
            Unlocked by
          </span>
          <span className="text-xs text-foreground/80">{unlockedBy}</span>
          {estimatedTimeline ? (
            <span className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground/80">
              {estimatedTimeline}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
