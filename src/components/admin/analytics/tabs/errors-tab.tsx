"use client";

import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { KpiCard } from "@/components/admin/analytics/kpi-card";
import { TrendChart } from "@/components/admin/analytics/trend-chart";
import {
  QueryTable,
  type QueryColumn,
} from "@/components/admin/analytics/query-table";
import { PanelCard } from "@/components/admin/analytics/_panel-card";
import {
  MotionItem,
  MotionStagger,
} from "@/components/admin/analytics/_motion";
import { useAnalyticsQuery } from "@/components/admin/analytics/use-analytics-query";
import type {
  EventVolumeRow,
  TopExceptionsRow,
} from "@/lib/posthog/queries";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function ErrorsTab() {
  const volume = useAnalyticsQuery<EventVolumeRow & Record<string, unknown>>(
    "eventVolume",
  );
  const top = useAnalyticsQuery<TopExceptionsRow & Record<string, unknown>>(
    "topExceptions",
  );

  const trendData = useMemo(() => {
    const out = new Map<string, number>();
    for (const r of volume.rows as unknown as EventVolumeRow[]) {
      if (r.event !== "$exception") continue;
      const day = String(r.day);
      out.set(day, (out.get(day) ?? 0) + num(r.hits));
    }
    return Array.from(out.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([day, exceptions]) => ({ day, exceptions }));
  }, [volume.rows]);

  const sparkline = useMemo(
    () => trendData.map((d) => ({ day: d.day, value: d.exceptions })),
    [trendData],
  );

  const totalExceptions = useMemo(
    () => trendData.reduce((s, d) => s + d.exceptions, 0),
    [trendData],
  );

  const topRows = useMemo(
    () =>
      top.rows.map((r) => ({
        message: String(r.message ?? "(unknown)"),
        hits: num(r.hits),
        users: num(r.users),
      })),
    [top.rows],
  );

  const topColumns: QueryColumn[] = [
    { key: "message", label: "Message", align: "left" },
    { key: "hits", label: "Hits", align: "right", bar: true },
    { key: "users", label: "Users", align: "right" },
  ];

  return (
    <MotionStagger className="grid grid-cols-12 gap-4 sm:gap-6">
      <div className="col-span-12 flex flex-col gap-1 pt-2">
        <span className="font-jetbrains uppercase text-[10px] tracking-[0.18em] text-muted-foreground">
          Reliability
        </span>
        <h2 className="font-fraunces font-light text-2xl tracking-tight">
          Exceptions & flags
        </h2>
        <p className="text-sm text-muted-foreground">
          Browser errors caught by posthog-js.
        </p>
      </div>

      <MotionItem className="col-span-12 lg:col-span-8">
        {volume.loading ? (
          <Skeleton className="h-[320px] w-full rounded-xl" />
        ) : trendData.length === 0 ? (
          <EmptyBlock
            title="No exceptions captured"
            hint="$exception events appear when posthog-js catches a browser error."
          />
        ) : (
          <TrendChart
            title="Exceptions"
            description="Browser exceptions per day"
            data={trendData.map((d) => ({
              day: d.day,
              exceptions: d.exceptions,
            }))}
            series={[
              {
                key: "exceptions",
                label: "Exceptions",
                color: "var(--destructive)",
              },
            ]}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 lg:col-span-4">
        {volume.loading ? (
          <Skeleton className="h-[180px] w-full rounded-xl" />
        ) : (
          <KpiCard
            label="Total exceptions"
            value={totalExceptions}
            sparkline={sparkline}
            tone={totalExceptions > 0 ? "negative" : "default"}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12">
        {top.loading ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : topRows.length === 0 ? (
          <EmptyBlock
            title="No exception messages"
            hint="Top exceptions populate from $exception_message."
          />
        ) : (
          <QueryTable
            title="Top exceptions"
            description="Grouped by $exception_message"
            columns={topColumns}
            rows={topRows}
            rowHref={() => null}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12">
        <PanelCard title="Feature flag rollout" variant="ambient">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Coming soon</EmptyTitle>
              <EmptyDescription>
                PostHog feature flags API integration is future work.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </PanelCard>
      </MotionItem>
    </MotionStagger>
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
