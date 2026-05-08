"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Activity, Ban, MessageSquare, Zap } from "lucide-react";
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

export function AnalyticsTab() {
  const analytics = useQuery(api.intentLogs.getAnalytics, {});
  const recentLogs = useQuery(api.intentLogs.listRecent, { limit: 25 });

  if (!analytics) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Queries",
      value: analytics.totalQueries.toLocaleString(),
      icon: MessageSquare,
      color: "text-blue-600",
    },
    {
      label: "Product Queries",
      value: analytics.productQueriesCount?.toLocaleString() ?? "0",
      icon: Zap,
      color: "text-purple-600",
    },
    {
      label: "Out of Scope",
      value: analytics.outOfScopeCount.toLocaleString(),
      icon: Ban,
      color: "text-orange-600",
    },
    {
      label: "Blocked",
      value: analytics.blockedCount.toLocaleString(),
      icon: Activity,
      color: "text-red-600",
    },
    {
      label: "Total Tokens",
      value: `${Math.round((analytics.totalInputTokens + analytics.totalOutputTokens) / 1000)}K`,
      icon: Zap,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards — hairline grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1px",
          background: "var(--glass-border)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
        }}
      >
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            style={{
              background: "var(--glass-bg)",
              padding: "var(--s-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
            }}
          >
            <div className="flex items-center gap-2">
              <Icon className={`size-4 ${color}`} />
              <span className="lf-meta" style={{ textTransform: "uppercase" }}>
                {label}
              </span>
            </div>
            <p
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 24,
                fontWeight: 400,
                lineHeight: 1.05,
                color: "var(--ink)",
              }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Breakdowns */}
      <div className="grid sm:grid-cols-3 gap-4">
        <BreakdownCard title="By Domain" data={analytics.domainCounts} />
        <BreakdownCard title="By Intent" data={analytics.intentCounts} />
        <BreakdownCard title="By Tier" data={analytics.tierCounts} />
      </div>

      {/* Product awareness breakdowns */}
      {(analytics.productQueriesCount ?? 0) > 0 && (
        <div>
          <p className="text-sm font-medium mb-3">Product Awareness</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <BreakdownCard
              title="Products Surfaced"
              data={analytics.productMentionedCounts ?? {}}
            />
            <BreakdownCard
              title="Trigger Type"
              data={analytics.productTriggerCounts ?? {}}
            />
          </div>
        </div>
      )}

      {/* Recent logs */}
      <div>
        <p
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: 18,
            fontWeight: 500,
            color: "var(--ink)",
            marginBottom: "var(--s-3)",
          }}
        >
          Recent Queries
        </p>
        <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
          {!recentLogs ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No queries logged yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        {log.primaryIntent}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{log.domain}</TableCell>
                    <TableCell className="text-xs">{log.tier}</TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {log.inputTokens + log.outputTokens}
                    </TableCell>
                    <TableCell>
                      {log.productMentioned ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-purple-500/10 text-purple-600">
                            {log.productMentioned}
                          </Badge>
                          {log.productTrigger && (
                            <span className="text-[9px] text-muted-foreground">{log.productTrigger}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.blocked ? (
                        <Badge className="bg-red-500/10 text-red-600 text-[9px] px-1.5 py-0">
                          Blocked
                        </Badge>
                      ) : log.outOfScope ? (
                        <Badge className="bg-orange-500/10 text-orange-600 text-[9px] px-1.5 py-0">
                          OOS
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-600 text-[9px] px-1.5 py-0">
                          OK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="lf-card" style={{ padding: "var(--s-4)" }}>
      <p
        className="lf-meta"
        style={{ textTransform: "uppercase", marginBottom: "var(--s-3)" }}
      >
        {title}
      </p>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data</p>
      ) : (
        <div className="space-y-1.5">
          {entries.slice(0, 6).map(([key, count]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="truncate">{key}</span>
                  <span className="text-muted-foreground ml-2">{count}</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/40 rounded-full"
                    style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
