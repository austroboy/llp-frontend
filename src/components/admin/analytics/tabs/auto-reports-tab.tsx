"use client";

import { CircleDashed, Play } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MotionItem,
  MotionStagger,
} from "@/components/admin/analytics/_motion";

const UNLOCKED_BY = "Internal `llp-analytics-reporter` agent + AWS SES";
const TIMELINE = "Phase 2 — after AI reporting agent is provisioned";

interface ReportSpec {
  title: string;
  cadence: string;
  body: string;
}

const REPORTS: ReportSpec[] = [
  {
    title: "Daily Pulse Report",
    cadence: "Daily — 07:00 BST",
    body: "One-page snapshot of yesterday's DAU, signups, chat volume, citation health, and any KPI status changes. Goes to operators.",
  },
  {
    title: "Weekly Growth Report",
    cadence: "Weekly — Monday 08:00 BST",
    body: "7-day funnel, channel ROI, top topics, cohort retention, and the week's biggest behavioural shifts. Goes to growth + product.",
  },
  {
    title: "Monthly Executive Report",
    cadence: "Monthly — 1st of month 09:00 BST",
    body: "Stakeholder-grade PDF with KPI scorecard, qualitative narrative, and the next 30 days of bets. Goes to executives + the board.",
  },
];

export function AutoReportsTab() {
  return (
    <TooltipProvider>
      <MotionStagger className="grid grid-cols-12 gap-4 sm:gap-6">
        <div className="col-span-12 flex flex-col gap-1 pt-2">
          <span className="font-jetbrains uppercase text-[10px] tracking-[0.18em] text-muted-foreground">
            Phase 2 · Reporting
          </span>
          <h2 className="font-fraunces font-light text-2xl tracking-tight">
            Automated reports
          </h2>
          <p className="text-sm text-muted-foreground">
            Daily / weekly / monthly digests powered by the internal reporting
            agent.
          </p>
        </div>
        {REPORTS.map((report) => (
          <MotionItem
            key={report.title}
            className="col-span-12 md:col-span-6 lg:col-span-4"
          >
          <Card
            className={cn(
              "relative h-full overflow-hidden border bg-card/80 backdrop-blur-sm shadow-none",
              "transition-colors duration-300 hover:border-foreground/30",
            )}
          >
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
                  {report.title}
                </CardDescription>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5",
                    "font-jetbrains uppercase text-[10px] tracking-[0.16em]",
                    "border-amber-700/30 bg-amber-50/40 text-amber-800",
                    "dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200/80",
                  )}
                >
                  <CircleDashed className="h-2.5 w-2.5" aria-hidden />
                  <span>Pending AI reporting</span>
                </span>
              </div>
              <CardTitle className="sr-only">{report.title}</CardTitle>
            </CardHeader>

            <CardContent className="relative flex flex-col gap-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {report.body}
              </p>

              <dl className="grid grid-cols-1 gap-2 border-t border-dashed border-border/60 pt-3 text-xs">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground">
                    Cadence
                  </dt>
                  <dd className="text-foreground/80">{report.cadence}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground">
                    Next run
                  </dt>
                  <dd className="font-fraunces font-light tabular-nums text-muted-foreground/60">
                    —
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground">
                    Last delivered
                  </dt>
                  <dd className="font-fraunces font-light tabular-nums text-muted-foreground/60">
                    —
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground">
                    Recipients
                  </dt>
                  <dd className="font-fraunces font-light tabular-nums text-muted-foreground/60">
                    —
                  </dd>
                </div>
              </dl>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled
                      aria-disabled
                      className="gap-2 font-jetbrains uppercase text-[11px] tracking-[0.16em]"
                    >
                      <Play className="h-3.5 w-3.5" aria-hidden />
                      Run report now
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  AI reporting agent not connected.
                </TooltipContent>
              </Tooltip>

              <div className="flex flex-col gap-1">
                <span className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground">
                  Unlocked by
                </span>
                <span className="text-xs text-foreground/80">
                  {UNLOCKED_BY}
                </span>
                <span className="font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground/80">
                  {TIMELINE}
                </span>
              </div>
            </CardContent>
          </Card>
          </MotionItem>
        ))}
      </MotionStagger>
    </TooltipProvider>
  );
}
