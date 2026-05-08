"use client";

import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { FunnelChart, type FunnelStep } from "@/components/admin/analytics/funnel-chart";
import {
  CohortGrid,
  type Cohort,
} from "@/components/admin/analytics/cohort-grid";
import {
  CohortTrendLines,
  type CohortTrendDatum,
} from "@/components/admin/analytics/cohort-trend-lines";
import { ChannelROITable } from "@/components/admin/analytics/channel-roi-table";
import { useAnalyticsQuery } from "@/components/admin/analytics/use-analytics-query";
import { AtRiskFreeUsersPanel } from "@/components/admin/analytics/at-risk-free-users";
import { PowerFreeUsersPanel } from "@/components/admin/analytics/power-free-users";
import {
  MotionItem,
  MotionStagger,
} from "@/components/admin/analytics/_motion";
import type {
  ChannelROIRow,
  CohortRetentionRow,
  EventVolumeRow,
  SignupFunnelRow,
} from "@/lib/posthog/queries";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function totalForEvent(rows: EventVolumeRow[], event: string): number {
  let sum = 0;
  for (const r of rows) if (r.event === event) sum += num(r.hits);
  return sum;
}

function syntheticFunnel(
  rows: EventVolumeRow[],
  step1Event: string,
  step2Event: string,
  step1Label: string,
  step2Label: string,
): FunnelStep[] {
  const a = totalForEvent(rows, step1Event);
  const b = totalForEvent(rows, step2Event);
  if (a === 0 && b === 0) return [];
  return [
    { label: step1Label, count: a },
    { label: step2Label, count: b },
  ];
}

function buildCohorts(rows: CohortRetentionRow[]): Cohort[] {
  const byCohort = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const cohort = String(r.cohort);
    const week = String(r.active_week);
    const slot = byCohort.get(cohort) ?? new Map<string, number>();
    slot.set(week, num(r.active));
    byCohort.set(cohort, slot);
  }
  const result: Cohort[] = [];
  for (const [cohort, weeks] of Array.from(byCohort.entries())) {
    const sorted = Array.from(weeks.entries()).sort((a, b) =>
      a[0] < b[0] ? -1 : 1,
    );
    if (sorted.length === 0) continue;
    const baseline = sorted[0]?.[1] ?? 0;
    const weekValues = sorted.map(([, v]) =>
      baseline === 0 ? 0 : Math.round((v / baseline) * 100),
    );
    result.push({ cohortLabel: cohort.slice(0, 10), size: baseline, weeks: weekValues });
  }
  return result.sort((a, b) => (a.cohortLabel < b.cohortLabel ? 1 : -1));
}

export function ConversionTab() {
  const signup = useAnalyticsQuery<SignupFunnelRow & Record<string, unknown>>(
    "signupFunnel",
  );
  const volume = useAnalyticsQuery<EventVolumeRow & Record<string, unknown>>(
    "eventVolume",
  );
  const cohorts = useAnalyticsQuery<
    CohortRetentionRow & Record<string, unknown>
  >("cohortRetention");
  const channels = useAnalyticsQuery<
    ChannelROIRow & Record<string, unknown>
  >("channelROI");

  const signupSteps: FunnelStep[] = useMemo(() => {
    const r = signup.rows[0];
    if (!r) return [];
    const steps = [
      { label: "Landing", count: num(r.step1_landing) },
      { label: "Signup page", count: num(r.step2_signup_page) },
      { label: "Completed", count: num(r.step3_completed) },
    ];
    if (steps.every((s) => s.count === 0)) return [];
    return steps;
  }, [signup.rows]);

  const paywallSteps = useMemo(
    () =>
      syntheticFunnel(
        volume.rows as unknown as EventVolumeRow[],
        "paywall_shown",
        "paywall_clicked",
        "Shown",
        "Clicked",
      ),
    [volume.rows],
  );

  const expertSteps = useMemo(
    () =>
      syntheticFunnel(
        volume.rows as unknown as EventVolumeRow[],
        "expert_profile_viewed",
        "expert_application_submitted",
        "Profile viewed",
        "Application sent",
      ),
    [volume.rows],
  );

  const cvSteps = useMemo(
    () =>
      syntheticFunnel(
        volume.rows as unknown as EventVolumeRow[],
        "cv_template_selected",
        "cv_pdf_downloaded",
        "Template picked",
        "PDF downloaded",
      ),
    [volume.rows],
  );

  const cohortRows = useMemo(
    () => buildCohorts(cohorts.rows as unknown as CohortRetentionRow[]),
    [cohorts.rows],
  );

  return (
    <MotionStagger className="grid grid-cols-12 gap-4 sm:gap-6">
      <SectionHeader
        eyebrow="Funnels"
        title="Conversion paths"
        description="Where users drop along each critical journey."
      />
      <FunnelSlot
        loading={signup.loading}
        steps={signupSteps}
        title="Signup"
        emptyHint="No landing/signup events captured yet."
      />
      <FunnelSlot
        loading={volume.loading}
        steps={paywallSteps}
        title="Paywall"
        emptyHint="No paywall_shown / paywall_clicked events recorded."
      />
      <FunnelSlot
        loading={volume.loading}
        steps={expertSteps}
        title="Expert apply"
        emptyHint="Awaiting expert_profile_viewed / expert_application_submitted events."
      />
      <FunnelSlot
        loading={volume.loading}
        steps={cvSteps}
        title="CV download"
        emptyHint="Awaiting cv_template_selected / cv_pdf_downloaded events."
      />

      <SectionHeader
        eyebrow="Channels"
        title="Where signups come from"
      />

      <MotionItem className="col-span-12">
        {channels.loading ? (
          <Skeleton className="h-[320px] w-full rounded-xl" />
        ) : (
          <ChannelROITable
            title="Channel ROI"
            description="Sessions, signups, and activated users by UTM source"
            data={channels.rows as unknown as ChannelROIRow[]}
          />
        )}
      </MotionItem>

      <SectionHeader
        eyebrow="Retention"
        title="Cohort behaviour"
        description="Weekly retention per signup cohort."
      />

      <MotionItem className="col-span-12 lg:col-span-6">
        {cohorts.loading ? (
          <Skeleton className="h-[320px] w-full rounded-xl" />
        ) : cohortRows.length === 0 ? (
          <EmptyBlock
            title="No retention cohorts"
            hint="Cohorts derive from signup_completed + return pageviews."
          />
        ) : (
          <CohortGrid title="Cohort retention" cohorts={cohortRows} />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 lg:col-span-6">
        {cohorts.loading ? (
          <Skeleton className="h-[320px] w-full rounded-xl" />
        ) : cohortRows.length === 0 ? (
          <EmptyBlock
            title="No cohort trends"
            hint="Multi-line view of weekly retention per cohort."
          />
        ) : (
          <CohortTrendLines
            title="Cohort retention trend"
            description="One line per cohort, plotted by weeks since signup"
            cohorts={cohortRows as CohortTrendDatum[]}
          />
        )}
      </MotionItem>

      <SectionHeader
        eyebrow="Engagement panels"
        title="At-risk vs power users"
      />

      <MotionItem className="col-span-12 lg:col-span-6">
        <AtRiskFreeUsersPanel />
      </MotionItem>
      <MotionItem className="col-span-12 lg:col-span-6">
        <PowerFreeUsersPanel />
      </MotionItem>
    </MotionStagger>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="col-span-12 flex flex-col gap-1 pt-2">
      <span className="font-jetbrains uppercase text-[10px] tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </span>
      <h2 className="font-fraunces font-light text-2xl tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function FunnelSlot({
  loading,
  steps,
  title,
  emptyHint,
}: {
  loading: boolean;
  steps: FunnelStep[];
  title: string;
  emptyHint: string;
}) {
  return (
    <MotionItem className="col-span-12 lg:col-span-6">
      {loading ? (
        <Skeleton className="h-[260px] w-full rounded-xl" />
      ) : steps.length === 0 ? (
        <EmptyBlock title={`${title} funnel idle`} hint={emptyHint} />
      ) : (
        <FunnelChart title={title} steps={steps} />
      )}
    </MotionItem>
  );
}

function EmptyBlock({ title, hint }: { title: string; hint: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{hint}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
