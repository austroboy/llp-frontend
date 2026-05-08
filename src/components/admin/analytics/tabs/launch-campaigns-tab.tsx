"use client";

import { useMemo } from "react";
import { CircleDashed } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAnalyticsQuery } from "@/components/admin/analytics/use-analytics-query";
import type { UtmSourceCampaignRow } from "@/lib/posthog/queries";

import { PanelCard } from "@/components/admin/analytics/_panel-card";
import {
  MotionItem,
  MotionStagger,
} from "@/components/admin/analytics/_motion";

const HEAD_CLS =
  "font-jetbrains uppercase text-[11px] tracking-[0.16em] text-muted-foreground";

const SOURCE_ROWS: Array<{ id: string; label: string }> = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "email", label: "Email" },
  { id: "referral", label: "Referral" },
];

function num(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

interface RowAggregate {
  sessions: number;
  signups: number;
  activated: number;
}

export function LaunchCampaignsTab() {
  const utm = useAnalyticsQuery<UtmSourceCampaignRow & Record<string, unknown>>(
    "utmSourceCampaign",
  );

  const lookup = useMemo(() => {
    const map = new Map<string, RowAggregate>();
    for (const row of utm.rows) {
      const key = String(row.utm_source ?? "").toLowerCase().trim();
      if (!key) continue;
      // Aggregate any synonym variants — e.g. "wa" + "whatsapp" → whatsapp.
      const normalized = normalizeUtmSource(key);
      const existing = map.get(normalized) ?? {
        sessions: 0,
        signups: 0,
        activated: 0,
      };
      existing.sessions += num(row.sessions);
      existing.signups += num(row.signups);
      existing.activated += num(row.activated);
      map.set(normalized, existing);
    }
    return map;
  }, [utm.rows]);

  const reduced = useReducedMotion();
  return (
    <MotionStagger className="grid grid-cols-12 gap-4 sm:gap-6">
      <MotionItem className="col-span-12">
      <Card className="relative overflow-hidden border bg-card shadow-none">
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
            <div className="flex flex-col gap-1">
              <CardDescription className="font-jetbrains uppercase text-[11px] tracking-[0.16em] text-muted-foreground">
                Launch campaigns
              </CardDescription>
              <CardTitle className="font-fraunces font-light text-2xl">
                UTM-source attribution
              </CardTitle>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5",
                "font-jetbrains uppercase text-[10px] tracking-[0.16em]",
                "border-amber-700/30 bg-amber-50/40 text-amber-800",
                "dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200/80",
              )}
            >
              <CircleDashed className="h-2.5 w-2.5" aria-hidden />
              <span>Pending campaign launch</span>
            </span>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-3">
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Sessions, signups, and activated counts populate the moment a tagged
            link goes live — PostHog already captures `$utm_source`. The Paid
            column unlocks once the payment provider is wired.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            <span className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground">
              Unlocked by
            </span>
            <span className="text-foreground/80">
              Consistent UTM tagging when launch campaigns ship
            </span>
            <span className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground/80">
              Paid column waits on payments
            </span>
          </div>
        </CardContent>
      </Card>
      </MotionItem>

      <MotionItem className="col-span-12">
      <PanelCard
        title="Source breakdown"
        description="Aggregated by utm_source"
        contentClassName="px-0"
      >
        {utm.loading ? (
          <div className="px-4 pb-4">
            <Skeleton className="h-[260px] w-full rounded-xl" />
          </div>
        ) : utm.error ? (
          <div className="px-4 pb-4 text-xs text-muted-foreground">
            UTM query failed: {utm.error}
          </div>
        ) : (
          <div className="max-h-[480px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                    <TableHead className={cn(HEAD_CLS, "border-b")}>
                      Source
                    </TableHead>
                    <TableHead className={cn(HEAD_CLS, "border-b text-right")}>
                      Sessions
                    </TableHead>
                    <TableHead className={cn(HEAD_CLS, "border-b text-right")}>
                      Signups
                    </TableHead>
                    <TableHead className={cn(HEAD_CLS, "border-b text-right")}>
                      Activated
                    </TableHead>
                    <TableHead className={cn(HEAD_CLS, "border-b text-right")}>
                      Paid
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SOURCE_ROWS.map((source, i) => {
                    const agg = lookup.get(source.id) ?? {
                      sessions: 0,
                      signups: 0,
                      activated: 0,
                    };
                    return (
                      <motion.tr
                        key={source.id}
                        initial={reduced ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.03 }}
                        className="border-b transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="text-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-foreground">
                              {source.label}
                            </span>
                            <span className="font-jetbrains text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              utm_source = {source.id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-jetbrains tabular-nums text-foreground">
                          {agg.sessions}
                        </TableCell>
                        <TableCell className="text-right font-jetbrains tabular-nums text-foreground">
                          {agg.signups}
                        </TableCell>
                        <TableCell className="text-right font-jetbrains tabular-nums text-foreground">
                          {agg.activated}
                        </TableCell>
                        <TableCell className="text-right font-jetbrains tabular-nums text-muted-foreground/60">
                          —
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
      </PanelCard>
      </MotionItem>
    </MotionStagger>
  );
}

function normalizeUtmSource(raw: string): string {
  const v = raw.toLowerCase().replace(/\s+/g, "");
  if (v === "wa" || v === "whatsapp") return "whatsapp";
  if (v === "fb" || v === "facebook" || v === "meta") return "facebook";
  if (v === "ig" || v === "instagram") return "instagram";
  if (v === "li" || v === "linkedin") return "linkedin";
  if (v === "mail" || v === "email" || v === "newsletter") return "email";
  if (
    v === "referral" ||
    v === "ref" ||
    v === "wom" ||
    v === "wordofmouth"
  ) {
    return "referral";
  }
  return v;
}
