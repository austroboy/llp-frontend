"use client";

import { CircleDashed } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
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

import { PanelCard } from "@/components/admin/analytics/_panel-card";
import {
  MotionItem,
  MotionStagger,
} from "@/components/admin/analytics/_motion";

const HEAD_CLS =
  "font-jetbrains uppercase text-[11px] tracking-[0.16em] text-muted-foreground";

const UNLOCKED_BY = "Brevo or Mailchimp account";
const TIMELINE = "Phase 2 — after email automation provider is wired";

interface TriggerRow {
  id: string;
  event: string;
  audience: string;
  intent: string;
}

// Spec 7.2 — 10 trigger templates. The chat-signup-wall trigger is excluded
// because chat is gated to logged-in users (see implementation-plan.md top).
const TRIGGERS: TriggerRow[] = [
  {
    id: "cap-hit-free",
    event: "search_limit_reached",
    audience: "Logged-in free users",
    intent: "Nudge upgrade once per day after the daily-cap modal is dismissed.",
  },
  {
    id: "file-upload-blocked",
    event: "file_upload_blocked",
    audience: "Logged-in free users",
    intent: "Explain which tier unlocks file uploads when the gate fires.",
  },
  {
    id: "verdict-download-blocked",
    event: "verdict_download_blocked",
    audience: "Logged-in free users",
    intent: "Explain which tier unlocks verdict export when the gate fires.",
  },
  {
    id: "upgrade-page-dwell",
    event: "upgrade_page_dwell",
    audience: "Free users with ≥30s on /pricing",
    intent: "Soft re-engagement 24h after a high-intent pricing visit.",
  },
  {
    id: "subscription-cancelled",
    event: "subscription_cancelled",
    audience: "Cancelled paying users",
    intent: "Send the exit survey + a soft win-back offer two weeks later.",
  },
  {
    id: "payment-lapsed",
    event: "payment_lapsed",
    audience: "Paying users with a failed charge",
    intent: "Trigger a payment-recovery sequence before involuntary churn.",
  },
  {
    id: "search-result-negative-rating",
    event: "search_result_rated (rating = -1)",
    audience: "Any signed-in user",
    intent: "Acknowledge the bad answer and link to the feedback follow-up.",
  },
  {
    id: "signup-day-1",
    event: "signup_completed (T+1d)",
    audience: "New free users",
    intent: "First-day welcome and a one-question activation survey.",
  },
  {
    id: "signup-day-7",
    event: "signup_completed (T+7d)",
    audience: "New free users with no chat activity",
    intent: "Re-engagement nudge before the 7-day decay window closes.",
  },
  {
    id: "win-back",
    event: "no_login (T+30d)",
    audience: "Lapsed users (no login 30+ days)",
    intent: "Win-back sequence highlighting the latest legal updates.",
  },
];

export function EmailTriggersTab() {
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
                Email triggers
              </CardDescription>
              <CardTitle className="font-fraunces font-light text-2xl">
                Spec 7.2 trigger templates
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
              <span>Pending email automation</span>
            </span>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-3">
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Each row below is a behaviour-driven email sequence wired to a
            captured event. The PostHog event is already firing (or will fire
            after Tier 1) — the email side ships once an automation provider is
            connected.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            <span className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground">
              Unlocked by
            </span>
            <span className="text-foreground/80">{UNLOCKED_BY}</span>
            <span className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground/80">
              {TIMELINE}
            </span>
          </div>
        </CardContent>
      </Card>
      </MotionItem>

      <MotionItem className="col-span-12">
      <PanelCard
        title="Trigger catalogue"
        description="10 behaviour-driven sequences"
        contentClassName="px-0"
      >
        <div className="max-h-[640px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(HEAD_CLS, "border-b")}>
                    Trigger event
                  </TableHead>
                  <TableHead className={cn(HEAD_CLS, "border-b")}>
                    Audience
                  </TableHead>
                  <TableHead className={cn(HEAD_CLS, "border-b")}>
                    Template status
                  </TableHead>
                  <TableHead className={cn(HEAD_CLS, "border-b text-right")}>
                    Last fired
                  </TableHead>
                  <TableHead className={cn(HEAD_CLS, "border-b text-right")}>
                    Conversions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TRIGGERS.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={reduced ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.025 }}
                    className="border-b transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="font-jetbrains text-foreground">
                          {row.event}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.intent}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground/80">
                      {row.audience}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
                          "font-jetbrains uppercase text-[10px] tracking-[0.16em]",
                          "border-amber-700/30 bg-amber-50/40 text-amber-800",
                          "dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200/80",
                        )}
                      >
                        <CircleDashed className="h-2.5 w-2.5" aria-hidden />
                        Not connected
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-jetbrains tabular-nums text-muted-foreground/60">
                      —
                    </TableCell>
                    <TableCell className="text-right font-jetbrains tabular-nums text-muted-foreground/60">
                      —
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </PanelCard>
      </MotionItem>
    </MotionStagger>
  );
}
