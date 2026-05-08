"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { KpiCard } from "@/components/admin/analytics/kpi-card";
import { KpiScorecard } from "@/components/admin/analytics/kpi-scorecard";
import { DonutSplit } from "@/components/admin/analytics/donut-split";
import { QueryTable } from "@/components/admin/analytics/query-table";
import { HistogramBars } from "@/components/admin/analytics/histogram-bars";
import { CalendarHeatmap } from "@/components/admin/analytics/calendar-heatmap";
import { CTAPerformanceList } from "@/components/admin/analytics/cta-performance-list";
import { TopicCloud } from "@/components/admin/analytics/topic-cloud";
import { TrendChart } from "@/components/admin/analytics/trend-chart";
import {
  LiveStrip,
  type LiveEvent,
} from "@/components/admin/analytics/live-strip";
import { useAnalyticsQuery } from "@/components/admin/analytics/use-analytics-query";
import {
  MotionFade,
  MotionItem,
  MotionStagger,
} from "@/components/admin/analytics/_motion";
import type {
  BrowserSplitRow,
  DauTrendRow,
  DeviceSplitRow,
  DropoffPagesRow,
  GeoSplitRow,
  HourOfDayHeatmapRow,
  KpiBehaviorRow,
  KpiSnapshotRow,
  PageEngagementRow,
  SessionDurationHistogramRow,
  TopClickedElementsRow,
} from "@/lib/posthog/queries";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isoDay(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function formatSecondsClock(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDwell(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "0s";
  if (s < 60) return `${s.toFixed(0)}s`;
  return formatSecondsClock(s);
}

function CardSkeleton({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-[180px] w-full rounded-xl ${className}`} />;
}

function ChartSkeleton({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-[320px] w-full rounded-xl ${className}`} />;
}

const BUCKET_ORDER = ["0-30s", "30s-2m", "2-5m", "5-15m", "15m+"];

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

export function OverviewTab() {
  const kpi = useAnalyticsQuery<KpiSnapshotRow & Record<string, unknown>>(
    "kpiSnapshot",
  );
  const beh = useAnalyticsQuery<KpiBehaviorRow & Record<string, unknown>>(
    "kpiBehavior",
  );
  const dau = useAnalyticsQuery<DauTrendRow & Record<string, unknown>>(
    "dauTrend",
  );
  const eng = useAnalyticsQuery<PageEngagementRow & Record<string, unknown>>(
    "pageEngagement",
  );
  const clicks = useAnalyticsQuery<
    TopClickedElementsRow & Record<string, unknown>
  >("topClickedElements");
  const exits = useAnalyticsQuery<DropoffPagesRow & Record<string, unknown>>(
    "dropoffPages",
  );
  const dur = useAnalyticsQuery<
    SessionDurationHistogramRow & Record<string, unknown>
  >("sessionDurationHistogram");
  const heat = useAnalyticsQuery<
    HourOfDayHeatmapRow & Record<string, unknown>
  >("hourOfDayHeatmap");
  const geo = useAnalyticsQuery<GeoSplitRow & Record<string, unknown>>(
    "geoSplit",
  );
  const dev = useAnalyticsQuery<DeviceSplitRow & Record<string, unknown>>(
    "deviceSplit",
  );
  const browser = useAnalyticsQuery<
    BrowserSplitRow & Record<string, unknown>
  >("browserSplit");

  const sparkline = useMemo(
    () =>
      dau.rows.map((r) => ({
        day: isoDay(r.day),
        value: num(r.dau),
      })),
    [dau.rows],
  );

  const trendData = useMemo(
    () =>
      dau.rows.map((r) => ({
        day: isoDay(r.day),
        dau: num(r.dau),
      })),
    [dau.rows],
  );

  const engRows = useMemo(
    () =>
      eng.rows.map((r) => ({
        path: String(r.path ?? "/"),
        views: num(r.views),
        uniques: num(r.uniques),
        dwell: formatDwell(num(r.avg_dwell_s)),
        scroll: `${Math.round(num(r.avg_max_scroll))}%`,
      })),
    [eng.rows],
  );

  const clickRows = useMemo(
    () =>
      clicks.rows.map((r) => ({
        text: String(r.text ?? "—"),
        path: String(r.path ?? "—"),
        clicks: num(r.clicks),
      })),
    [clicks.rows],
  );

  const exitRows = useMemo(
    () =>
      exits.rows.map((r) => ({
        path: String(r.path ?? "/"),
        exits: num(r.exits),
        rate: `${(num(r.exit_rate) * 100).toFixed(1)}%`,
      })),
    [exits.rows],
  );

  const durData = useMemo(() => {
    const lookup = new Map<string, number>();
    for (const r of dur.rows) {
      lookup.set(String(r.bucket ?? ""), num(r.sessions));
    }
    return BUCKET_ORDER.map((bucket) => ({
      bucket,
      value: lookup.get(bucket) ?? 0,
    }));
  }, [dur.rows]);

  const heatData = useMemo(
    () =>
      heat.rows.map((r) => ({
        dow: num(r.dow),
        hour: num(r.hour),
        value: num(r.hits),
      })),
    [heat.rows],
  );

  const geoData = useMemo(() => {
    const sorted = [...geo.rows].sort((a, b) => num(b.hits) - num(a.hits));
    const top = sorted.slice(0, 8).map((r) => ({
      label: String(r.country ?? "Unknown"),
      value: num(r.hits),
    }));
    const otherSum = sorted
      .slice(8)
      .reduce((acc, r) => acc + num(r.hits), 0);
    if (otherSum > 0) top.push({ label: "Other", value: otherSum });
    return top;
  }, [geo.rows]);

  const devData = useMemo(
    () =>
      dev.rows.map((r) => ({
        label: String(r.device ?? "unknown"),
        value: num(r.hits),
      })),
    [dev.rows],
  );

  const browserData = useMemo(
    () =>
      browser.rows.map((r) => ({
        label: String(r.browser ?? "unknown"),
        value: num(r.hits),
      })),
    [browser.rows],
  );

  const kpiRow = kpi.rows[0];
  const behRow = beh.rows[0];
  const avgDuration = num(behRow?.avg_session_duration_s);
  const avgPages = num(behRow?.avg_pages_per_session);
  const bounce = num(behRow?.bounce_rate) * 100;

  const kpiLoading = kpi.loading || beh.loading;

  return (
    <MotionStagger className="grid grid-cols-12 gap-4 sm:gap-6">
      <MotionItem className="col-span-12">
        <KpiScorecard />
      </MotionItem>

      <SectionHeader
        eyebrow="Pulse"
        title="At a glance"
        description="Headline numbers for the selected window."
      />

      {kpiLoading ? (
        <>
          <CardSkeleton className="col-span-12 sm:col-span-6 xl:col-span-3" />
          <CardSkeleton className="col-span-12 sm:col-span-6 xl:col-span-3" />
          <CardSkeleton className="col-span-12 sm:col-span-6 xl:col-span-3" />
          <CardSkeleton className="col-span-12 sm:col-span-6 xl:col-span-3" />
        </>
      ) : (
        <>
          <MotionItem className="col-span-12 sm:col-span-6 xl:col-span-3">
            <KpiCard
              label="DAU"
              value={num(kpiRow?.dau)}
              sparkline={sparkline}
            />
          </MotionItem>
          <MotionItem className="col-span-12 sm:col-span-6 xl:col-span-3">
            <KpiCard
              label="Avg session"
              value={avgDuration}
              suffix={` (${formatSecondsClock(avgDuration)})`}
              sparkline={sparkline}
            />
          </MotionItem>
          <MotionItem className="col-span-12 sm:col-span-6 xl:col-span-3">
            <KpiCard
              label="Pages / session"
              value={Number(avgPages.toFixed(2))}
              sparkline={sparkline}
            />
          </MotionItem>
          <MotionItem className="col-span-12 sm:col-span-6 xl:col-span-3">
            <KpiCard
              label="Bounce rate"
              value={Number(bounce.toFixed(1))}
              suffix="%"
              tone="negative"
              sparkline={sparkline}
            />
          </MotionItem>
        </>
      )}

      <MotionItem className="col-span-12">
        {dau.loading ? (
          <ChartSkeleton />
        ) : trendData.length === 0 ? (
          <EmptyBlock title="No DAU yet" hint="DAU populates as users visit." />
        ) : (
          <TrendChart
            title="Daily active users"
            description="Unique distinct_id per day"
            data={trendData}
            series={[
              {
                key: "dau",
                label: "DAU",
                color: "var(--p-blue)",
              },
            ]}
          />
        )}
      </MotionItem>

      <SectionHeader
        eyebrow="Engagement"
        title="Pages, clicks & exits"
        description="Where attention lands and where it leaks."
      />

      <MotionItem className="col-span-12">
        {eng.loading ? (
          <ChartSkeleton />
        ) : engRows.length === 0 ? (
          <EmptyBlock
            title="No engagement data"
            hint="Page engagement reads $pageleave dwell + scroll. Will populate as users leave pages."
          />
        ) : (
          <QueryTable
            title="Page engagement"
            description="Top paths · views · uniques · avg dwell · max scroll"
            columns={[
              { key: "path", label: "Path" },
              { key: "views", label: "Views", align: "right", bar: true },
              { key: "uniques", label: "Uniques", align: "right" },
              { key: "dwell", label: "Avg dwell", align: "right" },
              { key: "scroll", label: "Max scroll %", align: "right" },
            ]}
            rows={engRows}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 lg:col-span-7">
        {clicks.loading ? (
          <ChartSkeleton />
        ) : clickRows.length === 0 ? (
          <EmptyBlock
            title="No clicks captured"
            hint="$autocapture fires on tagged interactive elements."
          />
        ) : (
          <QueryTable
            title="Top clicked elements"
            description="Most-tapped buttons, links, and CTAs"
            columns={[
              { key: "text", label: "Element" },
              { key: "path", label: "Path" },
              { key: "clicks", label: "Clicks", align: "right", bar: true },
            ]}
            rows={clickRows}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 lg:col-span-5">
        {exits.loading ? (
          <ChartSkeleton />
        ) : exitRows.length === 0 ? (
          <EmptyBlock
            title="No exit data"
            hint="Drop-off pages compute from per-session last $pageview."
          />
        ) : (
          <QueryTable
            title="Top exit pages"
            description="Where sessions end"
            columns={[
              { key: "path", label: "Path" },
              { key: "exits", label: "Exits", align: "right", bar: true },
              { key: "rate", label: "Exit rate", align: "right" },
            ]}
            rows={exitRows}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 lg:col-span-6">
        {clicks.loading ? (
          <ChartSkeleton />
        ) : (
          <CTAPerformanceList
            title="CTA performance"
            description="Top CTAs by autocapture el_text."
            rows={clickRows}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 lg:col-span-6">
        <TopicCloud />
      </MotionItem>

      <SectionHeader
        eyebrow="Patterns"
        title="When & how"
        description="Session length, time-of-day pattern, channel mix."
      />

      <MotionItem className="col-span-12 lg:col-span-6">
        {dur.loading ? (
          <ChartSkeleton />
        ) : durData.every((d) => d.value === 0) ? (
          <EmptyBlock
            title="No session data"
            hint="Sessions table populates within minutes of activity."
          />
        ) : (
          <HistogramBars
            title="Session duration"
            description="How long visits last."
            data={durData}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 lg:col-span-6">
        {heat.loading ? (
          <ChartSkeleton />
        ) : heatData.length === 0 ? (
          <EmptyBlock
            title="No traffic pattern"
            hint="Heatmap shows pageviews by day-of-week × hour."
          />
        ) : (
          <CalendarHeatmap
            title="When users visit"
            description="Pageviews by day & hour"
            data={heatData}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 sm:col-span-6 xl:col-span-4">
        {geo.loading ? (
          <ChartSkeleton />
        ) : geoData.length === 0 ? (
          <EmptyBlock title="No geo data" hint="Requires PostHog GeoIP." />
        ) : (
          <DonutSplit
            title="Country"
            description="Top 8 + other"
            data={geoData}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 sm:col-span-6 xl:col-span-4">
        {dev.loading ? (
          <ChartSkeleton />
        ) : devData.length === 0 ? (
          <EmptyBlock title="No device data" hint="$device_type missing." />
        ) : (
          <DonutSplit
            title="Device"
            description="$device_type split"
            data={devData}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 sm:col-span-12 xl:col-span-4">
        {browser.loading ? (
          <ChartSkeleton />
        ) : browserData.length === 0 ? (
          <EmptyBlock title="No browser data" hint="$browser missing." />
        ) : (
          <DonutSplit
            title="Browser"
            description="$browser split"
            data={browserData}
          />
        )}
      </MotionItem>

      <MotionFade className="col-span-12" delay={0.2}>
        <LiveStripPanel />
      </MotionFade>
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

function LiveStripPanel() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled || document.hidden) return;
      try {
        const res = await fetch("/api/admin/analytics/live", {
          cache: "no-store",
        });
        if (!res.ok) {
          setError(`Live feed ${res.status}`);
          return;
        }
        const body = (await res.json()) as {
          events?: Array<{
            event?: string;
            distinct_id?: string;
            path?: string;
            timestamp?: string;
          }>;
          error?: string;
        };
        if (body.error) {
          setError(body.error);
          return;
        }
        setError(null);
        const fresh: LiveEvent[] = [];
        for (const data of body.events ?? []) {
          const id = `${data.timestamp ?? ""}-${data.distinct_id ?? ""}-${data.event ?? ""}`;
          if (seenIds.current.has(id)) continue;
          seenIds.current.add(id);
          fresh.push({
            id,
            event: data.event ?? "unknown",
            path: data.path,
            user: data.distinct_id,
            ts: data.timestamp ?? new Date().toISOString(),
          });
        }
        if (fresh.length > 0) {
          setEvents((prev) => [...fresh, ...prev].slice(0, 50));
        }
      } catch (err) {
        setError((err as Error).message);
      }
    };

    void tick();
    const interval = setInterval(() => void tick(), 7000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error && events.length === 0) {
    return <EmptyBlock title="Live feed unavailable" hint={error} />;
  }
  if (events.length === 0) {
    return <Skeleton className="h-[120px] w-full rounded-xl" />;
  }
  return <LiveStrip events={events} />;
}
