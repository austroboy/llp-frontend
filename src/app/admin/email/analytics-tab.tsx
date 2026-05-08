"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Send,
  AlertTriangle,
  Ban,
  CheckCircle2,
  BarChart3,
  Loader2,
  Mail,
  AtSign,
  Inbox,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Server,
  Users,
  UserCheck,
  Trash2,
  HardDrive,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SesStats {
  sendQuota: {
    max24HourSend: number;
    maxSendRate: number;
    sentLast24Hours: number;
  };
  rates: {
    bounceRate: number;
    complaintRate: number;
    deliveryRate: number;
  };
}

interface SendEvent {
  id: string;
  type: "bounce" | "complaint" | "delivery" | "send";
  email: string;
  subject: string;
  timestamp: string;
  details: string | null;
}

// Phase B — Cloudflare inbound types (must mirror the API route shape)
type RangeKey = "24h" | "7d" | "30d";

interface InboundConfig {
  customAddressCount: number;
  destinationCount: number;
  domainCount: number;
  routingEnabled: boolean;
  dnsConfigured: boolean;
}

interface InboundSummary {
  totalReceived: number;
  forwarded: number;
  dropped: number;
  deliveryFailed: number;
  rejected: number;
  other: number;
}

interface InboundBucket {
  timestamp: string;
  forwarded: number;
  dropped: number;
  deliveryFailed: number;
  rejected: number;
  other: number;
}

interface InboundPayload {
  config: InboundConfig;
  summary: InboundSummary;
  timeseries: InboundBucket[];
  range: { start: string; end: string; label: RangeKey };
}

// Phase C — LLP value-adds (must mirror the API route shape)
interface ReputationPayload {
  sendingEnabled: boolean;
  reputationStatus: "HEALTHY" | "AT_RISK" | "SHUTDOWN" | "UNKNOWN";
  bounceRate: number;
  complaintRate: number;
  warning: null | {
    level: "warning" | "critical";
    message: string;
    action: string;
  };
}

interface MailboxRow {
  address: string;
  label: string;
  inboundCount: number;
  outboundCount: number;
  lastActivity: string | null;
}

interface CorrespondentRow {
  email: string;
  count: number;
}

interface CorrespondentsPayload {
  topSenders: CorrespondentRow[];
  topRecipients: CorrespondentRow[];
}

interface StorageFolder {
  count: number;
  bytes: number;
}

interface StoragePayload {
  folders: {
    inbox: StorageFolder;
    sent: StorageFolder;
    spam: StorageFolder;
    deleted: StorageFolder;
  };
  totalCount: number;
  totalBytes: number;
}

interface PhaseCMeta {
  sampledInbox: boolean;
  sampledSent: boolean;
}

// Cloudflare-style palette for the bar segments + chart lines.
const CATEGORY_COLORS = {
  forwarded: "#3B82F6",
  dropped: "#A855F7",
  deliveryFailed: "#F59E0B",
  rejected: "#EF4444",
  other: "#FACC15",
} as const;

const CATEGORY_LABELS = {
  forwarded: "Forwarded",
  dropped: "Dropped",
  deliveryFailed: "Delivery Failed",
  rejected: "Rejected",
  other: "Other",
} as const;

type CategoryKey = keyof typeof CATEGORY_COLORS;
const CATEGORY_ORDER: CategoryKey[] = [
  "forwarded",
  "dropped",
  "deliveryFailed",
  "rejected",
  "other",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnalyticsTab() {
  const [stats, setStats] = useState<SesStats | null>(null);
  const [events, setEvents] = useState<SendEvent[]>([]);
  const [inbound, setInbound] = useState<InboundPayload | null>(null);
  // Phase C state
  const [reputation, setReputation] = useState<ReputationPayload | null>(null);
  const [mailboxes, setMailboxes] = useState<MailboxRow[]>([]);
  const [correspondents, setCorrespondents] = useState<CorrespondentsPayload | null>(null);
  const [storage, setStorage] = useState<StoragePayload | null>(null);
  const [phaseCMeta, setPhaseCMeta] = useState<PhaseCMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<RangeKey>("7d");

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchAnalytics = useCallback(
    async (silent = false, rangeOverride?: RangeKey) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const r = rangeOverride ?? range;
        const res = await fetch(`/api/admin/email-analytics?range=${r}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        setStats(data.stats || null);
        setEvents(data.events || []);
        setInbound(data.inbound || null);
        // Phase C — these fields may be missing if the route is older
        setReputation(data.reputation || null);
        setMailboxes(Array.isArray(data.mailboxes) ? data.mailboxes : []);
        setCorrespondents(data.correspondents || null);
        setStorage(data.storage || null);
        setPhaseCMeta(data.meta || null);
      } catch (e: unknown) {
        // If the endpoint doesn't exist yet, show empty state
        if (e instanceof Error && !e.message.includes("404")) {
          toast.error(e.message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range]
  );

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when the user picks a different time range. Silent so the page
  // doesn't blank — only the inbound chart should visibly refresh.
  const handleRangeChange = useCallback(
    (next: RangeKey) => {
      setRange(next);
      fetchAnalytics(true, next);
    },
    [fetchAnalytics]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // The Phase B inbound section renders in EVERY return path so the user sees
  // it whether SES is up, down, or still loading. The outbound section below
  // is unchanged from Phase A.
  const inboundSection = (
    <InboundSection
      data={inbound}
      loading={loading}
      range={range}
      onRangeChange={handleRangeChange}
    />
  );

  // Phase C — reputation banner renders ABOVE everything else, but only when
  // there is an actual warning to show. Hidden state is the common case.
  const reputationBanner = reputation?.warning ? (
    <ReputationBanner warning={reputation.warning} />
  ) : null;

  // Phase C — mailbox / correspondents / storage renders BELOW the existing
  // outbound section. We pass loading + nullable data so the section shows
  // skeletons while the first fetch is in flight.
  const phaseCSections = (
    <>
      <MailboxBreakdown rows={mailboxes} loading={loading} meta={phaseCMeta} />
      <TopCorrespondents data={correspondents} loading={loading} />
      <StorageUsage data={storage} loading={loading} />
    </>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        {reputationBanner}
        {inboundSection}
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
        {phaseCSections}
      </div>
    );
  }

  // No data / endpoint not available
  if (!stats) {
    return (
      <div className="space-y-8">
        {reputationBanner}
        {inboundSection}
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatsCard
              label="Sent (24h)"
              value="—"
              icon={Send}
              color="text-blue-600"
            />
            <StatsCard
              label="Bounce Rate"
              value="—"
              icon={AlertTriangle}
              color="text-amber-600"
            />
            <StatsCard
              label="Complaint Rate"
              value="—"
              icon={Ban}
              color="text-red-600"
            />
            <StatsCard
              label="Delivery Rate"
              value="—"
              icon={CheckCircle2}
              color="text-emerald-600"
            />
          </div>

          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <BarChart3 className="mx-auto mb-3 size-10 opacity-20 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Analytics Not Available
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              The email analytics endpoint (/api/admin/email-analytics) needs to be
              configured to pull data from AWS SES. Once connected, you will see
              real-time sending statistics and event logs here.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => fetchAnalytics()}
            >
              <RefreshCw className="mr-1.5 size-4" />
              Retry
            </Button>
          </div>
        </div>
        {phaseCSections}
      </div>
    );
  }

  const remainingQuota = stats.sendQuota.max24HourSend - stats.sendQuota.sentLast24Hours;
  const quotaPercent =
    stats.sendQuota.max24HourSend > 0
      ? (stats.sendQuota.sentLast24Hours / stats.sendQuota.max24HourSend) * 100
      : 0;

  return (
    <div className="space-y-8">
      {reputationBanner}
      {inboundSection}
      <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatsCard
          label="Sent (24h)"
          value={stats.sendQuota.sentLast24Hours.toLocaleString()}
          subtitle={`of ${stats.sendQuota.max24HourSend.toLocaleString()} quota`}
          icon={Send}
          color="text-blue-600"
        />
        <StatsCard
          label="Bounce Rate"
          value={`${stats.rates.bounceRate.toFixed(2)}%`}
          subtitle={stats.rates.bounceRate > 5 ? "Above threshold!" : "Healthy"}
          icon={AlertTriangle}
          color={stats.rates.bounceRate > 5 ? "text-red-600" : "text-amber-600"}
          warning={stats.rates.bounceRate > 5}
        />
        <StatsCard
          label="Complaint Rate"
          value={`${stats.rates.complaintRate.toFixed(3)}%`}
          subtitle={stats.rates.complaintRate > 0.1 ? "Above threshold!" : "Healthy"}
          icon={Ban}
          color={stats.rates.complaintRate > 0.1 ? "text-red-600" : "text-red-500"}
          warning={stats.rates.complaintRate > 0.1}
        />
        <StatsCard
          label="Delivery Rate"
          value={`${stats.rates.deliveryRate.toFixed(1)}%`}
          icon={CheckCircle2}
          color="text-emerald-600"
        />
      </div>

      {/* Quota bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Send Quota (24h)</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {remainingQuota.toLocaleString()} remaining
            </span>
            <span className="text-xs text-muted-foreground">
              Max rate: {stats.sendQuota.maxSendRate}/sec
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              quotaPercent > 80
                ? "bg-red-500"
                : quotaPercent > 50
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(quotaPercent, 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          {stats.sendQuota.sentLast24Hours.toLocaleString()} /{" "}
          {stats.sendQuota.max24HourSend.toLocaleString()} emails sent ({quotaPercent.toFixed(1)}%)
        </p>
      </div>

      {/* Recent Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Recent Events</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-1.5 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Mail className="mb-3 size-8 opacity-20" />
              <p className="text-sm">No recent events</p>
              <p className="text-xs mt-1">
                Bounce, complaint, and delivery events will appear here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <EventBadge type={event.type} />
                    </TableCell>
                    <TableCell className="text-sm">{event.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {event.subject}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {event.details || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      </div>
      {phaseCSections}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function StatsCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  warning,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-3.5 ${
        warning ? "border-red-500/30" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`size-4 ${color}`} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-semibold">{value}</p>
      {subtitle && (
        <p
          className={`text-[11px] mt-0.5 ${
            warning ? "text-red-600 font-medium" : "text-muted-foreground"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function EventBadge({ type }: { type: string }) {
  const configs: Record<string, { color: string; label: string }> = {
    bounce: { color: "bg-amber-500/10 text-amber-600", label: "Bounce" },
    complaint: { color: "bg-red-500/10 text-red-600", label: "Complaint" },
    delivery: { color: "bg-emerald-500/10 text-emerald-600", label: "Delivery" },
    send: { color: "bg-blue-500/10 text-blue-600", label: "Send" },
  };
  const cfg = configs[type] || { color: "bg-gray-100 text-gray-500", label: type };

  return (
    <Badge variant="secondary" className={`${cfg.color} text-[10px]`}>
      {cfg.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Phase B — Cloudflare Inbound Routing section
// ---------------------------------------------------------------------------

function InboundSection({
  data,
  loading,
  range,
  onRangeChange,
}: {
  data: InboundPayload | null;
  loading: boolean;
  range: RangeKey;
  onRangeChange: (next: RangeKey) => void;
}) {
  const config = data?.config ?? null;
  const summary = data?.summary ?? null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Inbox className="size-4 text-blue-600" />
            Inbound Email Routing
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cloudflare Email Routing for laborlawpartner.com
          </p>
        </div>
      </div>

      {/* Configuration summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <ConfigCard
          label="Custom addresses"
          value={loading ? "—" : (config?.customAddressCount ?? "—").toString()}
          icon={AtSign}
          color="text-blue-600"
        />
        <ConfigCard
          label="Destination addresses"
          value={loading ? "—" : (config?.destinationCount ?? "—").toString()}
          icon={Server}
          color="text-purple-600"
        />
        <ConfigCard
          label="Domain"
          value={loading ? "—" : (config?.domainCount ?? "—").toString()}
          icon={Globe}
          color="text-emerald-600"
        />
        <ConfigCard
          label="Routing status"
          icon={config?.routingEnabled ? ShieldCheck : ShieldAlert}
          color={config?.routingEnabled ? "text-emerald-600" : "text-red-600"}
          badge={
            loading
              ? { tone: "muted", label: "—" }
              : config?.routingEnabled
                ? { tone: "green", label: "Enabled" }
                : { tone: "red", label: "Disabled" }
          }
        />
        <ConfigCard
          label="DNS records"
          icon={config?.dnsConfigured ? ShieldCheck : ShieldAlert}
          color={config?.dnsConfigured ? "text-emerald-600" : "text-amber-600"}
          badge={
            loading
              ? { tone: "muted", label: "—" }
              : config?.dnsConfigured
                ? { tone: "green", label: "Configured" }
                : { tone: "amber", label: "Issues" }
          }
        />
      </div>

      {/* Routing summary card with chart */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Email Routing Summary</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Inbound mail processed by Cloudflare in the selected window
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            <Select
              value={range}
              onValueChange={(v) => onRangeChange(v as RangeKey)}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-3 rounded-full" />
            <Skeleton className="h-56 rounded-lg" />
          </>
        ) : !data ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
            <BarChart3 className="mx-auto mb-2 size-8 opacity-30 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              Cloudflare analytics unavailable
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-md mx-auto">
              Could not reach the Cloudflare GraphQL Analytics API. Verify the
              API token has the <code>Zone Analytics: Read</code> permission for
              laborlawpartner.com.
            </p>
          </div>
        ) : (
          <InboundBody summary={summary!} timeseries={data.timeseries} />
        )}
      </div>
    </section>
  );
}

function InboundBody({
  summary,
  timeseries,
}: {
  summary: InboundSummary;
  timeseries: InboundBucket[];
}) {
  // Pre-compute the segment percentages for the stacked bar.
  const segments = useMemo(() => {
    const total = summary.totalReceived || 0;
    return CATEGORY_ORDER.map((key) => {
      const value = summary[key];
      const pct = total > 0 ? (value / total) * 100 : 0;
      return { key, value, pct };
    });
  }, [summary]);

  // The dominant segment label (Cloudflare highlights the biggest one).
  const dominant = useMemo(() => {
    const sorted = [...segments].sort((a, b) => b.value - a.value);
    return sorted[0]?.value ? sorted[0] : null;
  }, [segments]);

  // Pretty x-axis labels — match the "Mon 06, 12 PM" Cloudflare style.
  const chartData = useMemo(
    () =>
      timeseries.map((row) => ({
        ...row,
        label: formatHourLabel(row.timestamp),
      })),
    [timeseries]
  );

  if (summary.totalReceived === 0) {
    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCell label="Total received" value={0} dotColor="#94A3B8" />
          {CATEGORY_ORDER.map((k) => (
            <SummaryCell
              key={k}
              label={CATEGORY_LABELS[k]}
              value={0}
              dotColor={CATEGORY_COLORS[k]}
            />
          ))}
        </div>
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
          <Inbox className="mx-auto mb-2 size-8 opacity-30 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            No inbound mail in this window
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Try a longer date range, or wait for new traffic to arrive.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Numeric cells */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCell
          label="Total received"
          value={summary.totalReceived}
          dotColor="#94A3B8"
        />
        {CATEGORY_ORDER.map((k) => (
          <SummaryCell
            key={k}
            label={CATEGORY_LABELS[k]}
            value={summary[k]}
            dotColor={CATEGORY_COLORS[k]}
          />
        ))}
      </div>

      {/* Stacked percentage bar */}
      <div>
        <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-muted">
          {segments.map((s) =>
            s.pct > 0 ? (
              <div
                key={s.key}
                style={{
                  width: `${s.pct}%`,
                  backgroundColor: CATEGORY_COLORS[s.key],
                }}
                title={`${CATEGORY_LABELS[s.key]}: ${s.value.toLocaleString()} (${s.pct.toFixed(1)}%)`}
              />
            ) : null
          )}
        </div>
        {dominant && (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            <span
              className="inline-block size-2 rounded-full mr-1.5 align-middle"
              style={{ backgroundColor: CATEGORY_COLORS[dominant.key] }}
            />
            {CATEGORY_LABELS[dominant.key]} —{" "}
            {dominant.value.toLocaleString()} ({dominant.pct.toFixed(1)}%)
          </p>
        )}
      </div>

      {/* Time series chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-border"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              stroke="currentColor"
              className="text-muted-foreground"
              minTickGap={24}
            />
            <YAxis
              fontSize={10}
              tickLine={false}
              axisLine={false}
              stroke="currentColor"
              className="text-muted-foreground"
              allowDecimals={false}
            />
            <RTooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--popover))",
              }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle"
            />
            {CATEGORY_ORDER.map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                name={CATEGORY_LABELS[k]}
                stroke={CATEGORY_COLORS[k]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function ConfigCard({
  label,
  value,
  icon: Icon,
  color,
  badge,
}: {
  label: string;
  value?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge?: { tone: "green" | "red" | "amber" | "muted"; label: string };
}) {
  const toneClasses: Record<string, string> = {
    green: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    red: "bg-red-500/10 text-red-600 border-red-500/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    muted: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`size-4 ${color}`} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      {badge ? (
        <Badge
          variant="outline"
          className={`text-[11px] ${toneClasses[badge.tone]}`}
        >
          {badge.label}
        </Badge>
      ) : (
        <p className="text-xl font-semibold">{value}</p>
      )}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  dotColor,
}: {
  label: string;
  value: number;
  dotColor: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className="inline-block size-2 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function formatHourLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // "Mon 06, 12 PM" — matches Cloudflare's own dashboard formatting.
  return d.toLocaleString("en-US", {
    weekday: "short",
    day: "2-digit",
    hour: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Phase C — Reputation banner / Mailbox breakdown / Top correspondents /
//          Storage usage
// ---------------------------------------------------------------------------

function ReputationBanner({
  warning,
}: {
  warning: NonNullable<ReputationPayload["warning"]>;
}) {
  const isCritical = warning.level === "critical";
  return (
    <div
      className={`rounded-xl border p-4 flex items-start gap-3 ${
        isCritical
          ? "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-100"
          : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
      }`}
      role="alert"
    >
      <AlertTriangle
        className={`size-5 shrink-0 mt-0.5 ${
          isCritical ? "text-red-600" : "text-amber-600"
        }`}
      />
      <div className="flex-1">
        <p className="font-semibold text-sm leading-snug">{warning.message}</p>
        <p className="text-xs mt-1 opacity-90 leading-relaxed">
          {warning.action}
        </p>
      </div>
      <Badge
        variant="outline"
        className={`text-[10px] uppercase tracking-wide ${
          isCritical
            ? "border-red-500/40 text-red-700 dark:text-red-200"
            : "border-amber-500/40 text-amber-700 dark:text-amber-200"
        }`}
      >
        {warning.level}
      </Badge>
    </div>
  );
}

function MailboxBreakdown({
  rows,
  loading,
  meta,
}: {
  rows: MailboxRow[];
  loading: boolean;
  meta: PhaseCMeta | null;
}) {
  // Sort by total activity descending so the most active mailbox is on top.
  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          b.inboundCount + b.outboundCount - (a.inboundCount + a.outboundCount)
      ),
    [rows]
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AtSign className="size-4 text-blue-600" />
            Per-Mailbox Breakdown
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inbound and outbound traffic over the last 7 days, by mailbox
            address.
          </p>
        </div>
        {(meta?.sampledInbox || meta?.sampledSent) && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Sampled
          </Badge>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <AtSign className="mb-2 size-7 opacity-20" />
            <p className="text-sm">No mailbox activity</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Inbound (7d)</TableHead>
                <TableHead className="text-right">Outbound (7d)</TableHead>
                <TableHead className="text-right">Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.address}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{row.address}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {row.label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {row.inboundCount > 0 ? (
                      row.inboundCount.toLocaleString()
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {row.outboundCount > 0 ? (
                      row.outboundCount.toLocaleString()
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(row.lastActivity)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}

function TopCorrespondents({
  data,
  loading,
}: {
  data: CorrespondentsPayload | null;
  loading: boolean;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="size-4 text-purple-600" />
          Top Correspondents
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Most frequent senders and recipients over the last 30 days. Internal
          @laborlawpartner.com addresses are filtered out.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <CorrespondentCard
          title="Top senders to your inboxes"
          icon={ArrowDownToLine}
          iconColor="text-blue-600"
          rows={data?.topSenders ?? []}
          loading={loading}
        />
        <CorrespondentCard
          title="Top recipients of your outbound"
          icon={ArrowUpFromLine}
          iconColor="text-emerald-600"
          rows={data?.topRecipients ?? []}
          loading={loading}
        />
      </div>
    </section>
  );
}

function CorrespondentCard({
  title,
  icon: Icon,
  iconColor,
  rows,
  loading,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  rows: CorrespondentRow[];
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`size-4 ${iconColor}`} />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 rounded" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <UserCheck className="mb-2 size-6 opacity-20" />
          <p className="text-xs">No data in the last 30 days</p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((row) => (
            <li
              key={row.email}
              className="flex items-center justify-between py-1.5"
            >
              <span className="text-xs text-foreground truncate pr-2">
                {row.email}
              </span>
              <Badge
                variant="secondary"
                className="text-[10px] tabular-nums shrink-0"
              >
                {row.count.toLocaleString()}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StorageUsage({
  data,
  loading,
}: {
  data: StoragePayload | null;
  loading: boolean;
}) {
  const folders: Array<{
    key: keyof StoragePayload["folders"];
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }> = [
    { key: "inbox", label: "Inbox", icon: Inbox, color: "text-blue-600" },
    { key: "sent", label: "Sent", icon: Send, color: "text-emerald-600" },
    { key: "spam", label: "Spam", icon: Ban, color: "text-amber-600" },
    { key: "deleted", label: "Deleted", icon: Trash2, color: "text-rose-600" },
  ];

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <HardDrive className="size-4 text-slate-600" />
          Storage Usage
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          S3 object counts and bytes for the llp-email-inbox bucket.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {folders.map((f) => {
          const folder = data?.folders?.[f.key];
          return (
            <StorageCard
              key={f.key}
              label={f.label}
              icon={f.icon}
              color={f.color}
              count={folder?.count ?? 0}
              bytes={folder?.bytes ?? 0}
              loading={loading}
            />
          );
        })}
        <StorageCard
          label="Total"
          icon={HardDrive}
          color="text-slate-600"
          count={data?.totalCount ?? 0}
          bytes={data?.totalBytes ?? 0}
          loading={loading}
          highlight
        />
      </div>
    </section>
  );
}

function StorageCard({
  label,
  icon: Icon,
  color,
  count,
  bytes,
  loading,
  highlight,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  count: number;
  bytes: number;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3.5 ${
        highlight
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`size-4 ${color}`} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-5 w-16 rounded" />
      ) : (
        <>
          <p className="text-base font-semibold tabular-nums">
            {count.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">emails</span>
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
            {formatBytes(bytes)}
          </p>
        </>
      )}
    </div>
  );
}

// --- Phase C helpers --------------------------------------------------------

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
