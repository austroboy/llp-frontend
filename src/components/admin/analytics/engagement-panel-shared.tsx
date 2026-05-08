"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

import { PanelCard } from "@/components/admin/analytics/_panel-card";

export interface PanelRow {
  user_id_short: string;
  score: number;
  primary_label: string;
  computed_at: string;
}

interface PanelResponse {
  at_risk?: PanelRow[];
  power_users?: PanelRow[];
  error?: string;
}

export interface PanelState {
  rows: PanelRow[];
  loading: boolean;
  error: string | null;
  computedAt: string | null;
}

export type PanelKind = "at_risk" | "power_users";

/**
 * Both panels read the same endpoint. We keep one in-flight request per
 * mount so the cost stays the same as a single panel; React re-uses
 * the cached fetch when both panels mount in the same tab render.
 */
export function useEngagementPanel(kind: PanelKind): PanelState {
  const [state, setState] = useState<PanelState>({
    rows: [],
    loading: true,
    error: null,
    computedAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/engagement-scores", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${txt.slice(0, 120)}`);
        }
        return (await res.json()) as PanelResponse;
      })
      .then((json) => {
        if (cancelled) return;
        const rows = (kind === "at_risk" ? json.at_risk : json.power_users) ?? [];
        setState({
          rows,
          loading: false,
          error: null,
          computedAt: rows[0]?.computed_at ?? null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          rows: [],
          loading: false,
          error: err instanceof Error ? err.message : "fetch failed",
          computedAt: null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return state;
}

export function EngagementPanelShell({
  folio,
  title,
  blurb,
  state,
  emptyHint,
}: {
  folio: string;
  title: string;
  blurb: string;
  state: PanelState;
  emptyHint: string;
}) {
  return (
    <PanelCard
      title={title}
      description={blurb}
      action={
        state.computedAt ? (
          <span className="text-[10px] uppercase tracking-[0.16em] font-jetbrains text-muted-foreground whitespace-nowrap">
            {formatComputedAt(state.computedAt)}
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.16em] font-jetbrains text-muted-foreground whitespace-nowrap">
            {folio}
          </span>
        )
      }
      contentClassName="px-6 pb-6"
    >
      <PanelBody state={state} emptyHint={emptyHint} />
    </PanelCard>
  );
}

function PanelBody({
  state,
  emptyHint,
}: {
  state: PanelState;
  emptyHint: string;
}) {
  const reduced = useReducedMotion();
  if (state.loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
    );
  }
  if (state.error) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Engagement scores unavailable</EmptyTitle>
          <EmptyDescription>{state.error}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  if (state.rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No matching users</EmptyTitle>
          <EmptyDescription>{emptyHint}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="divide-y rounded-lg border bg-background/40">
      {state.rows.map((row, i) => (
        <motion.div
          key={row.user_id_short}
          initial={reduced ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: i * 0.03, ease: "easeOut" }}
          className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
        >
          <div className="min-w-0 flex-1">
            <p className="font-jetbrains text-xs tracking-tight truncate">
              {row.user_id_short}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {row.primary_label}
            </p>
          </div>
          <span
            className={
              "shrink-0 inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded-md px-1.5 font-jetbrains text-xs tabular-nums " +
              scoreBadgeClass(row.score)
            }
          >
            {row.score > 0 ? `+${row.score}` : row.score}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function scoreBadgeClass(score: number): string {
  if (score >= 4) {
    return "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200/90 border border-amber-700/30";
  }
  if (score <= -2) {
    return "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200/90 border border-emerald-700/30";
  }
  return "bg-muted text-muted-foreground";
}

function formatComputedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
