"use client";

import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  SankeyFlow,
  type SankeyLink,
  type SankeyNode,
} from "@/components/admin/analytics/sankey-flow";
import { TopList } from "@/components/admin/analytics/top-list";
import { DonutSplit } from "@/components/admin/analytics/donut-split";
import { Heatmap } from "@/components/admin/analytics/heatmap";
import { useAnalyticsQuery } from "@/components/admin/analytics/use-analytics-query";
import {
  MotionItem,
  MotionStagger,
} from "@/components/admin/analytics/_motion";
import type {
  ChatNextStepRow,
  DeviceSplitRow,
  GeoSplitRow,
  LanguagePreferenceRow,
  TimeOfUseHeatmapRow,
  TopPagesRow,
} from "@/lib/posthog/queries";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildSankey(rows: ChatNextStepRow[]): {
  nodes: SankeyNode[];
  links: SankeyLink[];
} {
  if (rows.length === 0) return { nodes: [], links: [] };
  const nodes: SankeyNode[] = [{ name: "/chat" }];
  const links: SankeyLink[] = [];
  rows.forEach((r) => {
    nodes.push({ name: String(r.next_path) });
    links.push({ source: 0, target: nodes.length - 1, value: num(r.hits) });
  });
  return { nodes, links };
}

// /chat-prefixed paths are the dataset's "entry"; everything else is "exit".
function classifyPages(rows: TopPagesRow[]): {
  entry: { label: string; value: number }[];
  exit: { label: string; value: number }[];
  role: { label: string; value: number }[];
} {
  const entry: { label: string; value: number }[] = [];
  const exit: { label: string; value: number }[] = [];
  const roleMap = new Map<string, number>();

  for (const r of rows) {
    const path = String(r.path ?? "/");
    const views = num(r.views);
    if (path.startsWith("/chat") || path === "/") {
      entry.push({ label: path, value: views });
    } else {
      exit.push({ label: path, value: views });
    }
    // Heuristic role bucketing from path prefix.
    if (path.startsWith("/admin")) roleMap.set("admin", (roleMap.get("admin") ?? 0) + views);
    else if (path.startsWith("/experts")) roleMap.set("experts", (roleMap.get("experts") ?? 0) + views);
    else if (path.startsWith("/cv")) roleMap.set("cv", (roleMap.get("cv") ?? 0) + views);
    else roleMap.set("public", (roleMap.get("public") ?? 0) + views);
  }

  const role = Array.from(roleMap.entries()).map(([label, value]) => ({ label, value }));

  return { entry, exit, role };
}

export function JourneysTab() {
  const next = useAnalyticsQuery<ChatNextStepRow & Record<string, unknown>>(
    "chatNextStep",
  );
  const pages = useAnalyticsQuery<TopPagesRow & Record<string, unknown>>(
    "topPages",
  );
  const heat = useAnalyticsQuery<
    TimeOfUseHeatmapRow & Record<string, unknown>
  >("timeOfUseHeatmap");
  const lang = useAnalyticsQuery<
    LanguagePreferenceRow & Record<string, unknown>
  >("languagePreference");
  const geo = useAnalyticsQuery<GeoSplitRow & Record<string, unknown>>(
    "geoSplit",
  );
  const dev = useAnalyticsQuery<DeviceSplitRow & Record<string, unknown>>(
    "deviceSplit",
  );

  const sankey = useMemo(
    () => buildSankey(next.rows as unknown as ChatNextStepRow[]),
    [next.rows],
  );

  const { entry, exit, role } = useMemo(
    () => classifyPages(pages.rows as unknown as TopPagesRow[]),
    [pages.rows],
  );

  const heatData = useMemo(
    () =>
      heat.rows.map((r) => ({
        dow: num(r.dow),
        hour: num(r.hour),
        value: num(r.queries),
      })),
    [heat.rows],
  );

  const langData = useMemo(
    () =>
      lang.rows.map((r) => ({
        label: String(r.lang ?? "unknown"),
        value: num(r.hits),
      })),
    [lang.rows],
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

  const deviceData = useMemo(
    () =>
      dev.rows.map((r) => ({
        label: String(r.device ?? "unknown"),
        value: num(r.hits),
      })),
    [dev.rows],
  );

  return (
    <MotionStagger className="grid grid-cols-12 gap-4 sm:gap-6">
      <MotionItem className="col-span-12">
        {next.loading ? (
          <Skeleton className="h-[360px] w-full rounded-xl" />
        ) : sankey.links.length === 0 ? (
          <EmptyBlock
            title="No /chat journeys yet"
            hint="Sankey shows the next pageview after a /chat session."
          />
        ) : (
          <SankeyFlow
            title="From /chat"
            nodes={sankey.nodes}
            links={sankey.links}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 lg:col-span-6">
        {pages.loading ? (
          <Skeleton className="h-[260px] w-full rounded-xl" />
        ) : entry.length === 0 ? (
          <EmptyBlock title="No entry pages" hint="Awaiting pageviews." />
        ) : (
          <TopList title="Top entry pages" data={entry} max={8} />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 lg:col-span-6">
        {pages.loading ? (
          <Skeleton className="h-[260px] w-full rounded-xl" />
        ) : exit.length === 0 ? (
          <EmptyBlock title="No exit pages" hint="Awaiting pageviews." />
        ) : (
          <TopList title="Top exit pages" data={exit} max={8} />
        )}
      </MotionItem>

      <MotionItem className="col-span-12">
        {heat.loading ? (
          <Skeleton className="h-[320px] w-full rounded-xl" />
        ) : heatData.length === 0 ? (
          <EmptyBlock
            title="No chat usage yet"
            hint="Time-of-Use heatmap shows chat_query_sent volume by day-of-week x hour."
          />
        ) : (
          <Heatmap
            title="Chat time-of-use"
            description="When users actually send chat queries."
            data={heatData}
          />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 md:col-span-6 lg:col-span-4">
        {lang.loading ? (
          <Skeleton className="h-[260px] w-full rounded-xl" />
        ) : langData.length === 0 ? (
          <EmptyBlock
            title="No language data"
            hint="Awaiting chat_query_sent events with properties.lang."
          />
        ) : (
          <DonutSplit title="Language preference" data={langData} />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 md:col-span-6 lg:col-span-4">
        {pages.loading ? (
          <Skeleton className="h-[260px] w-full rounded-xl" />
        ) : role.length === 0 ? (
          <EmptyBlock
            title="No role split"
            hint="Heuristic role bucketing from URL prefix."
          />
        ) : (
          <DonutSplit title="Role split" data={role} />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 md:col-span-6 lg:col-span-4">
        {dev.loading ? (
          <Skeleton className="h-[260px] w-full rounded-xl" />
        ) : deviceData.length === 0 ? (
          <EmptyBlock
            title="No device split"
            hint="Awaiting PostHog $device_type autocapture."
          />
        ) : (
          <DonutSplit title="Device split" data={deviceData} />
        )}
      </MotionItem>

      <MotionItem className="col-span-12 md:col-span-6 lg:col-span-6">
        {geo.loading ? (
          <Skeleton className="h-[260px] w-full rounded-xl" />
        ) : geoData.length === 0 ? (
          <EmptyBlock
            title="No geography data"
            hint="Awaiting PostHog GeoIP $geoip_country_code property."
          />
        ) : (
          <DonutSplit title="Geography" data={geoData} />
        )}
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
