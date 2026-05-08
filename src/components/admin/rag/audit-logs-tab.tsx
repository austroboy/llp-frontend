"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Save,
  ShieldCheck,
  Wrench,
  RefreshCcw,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  FileText,
  Activity,
  DollarSign,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Trash2,
  ClipboardCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

interface AuditLog {
  id: string;
  created_at: string;
  operation: string;
  document_id: string;
  document_title: string | null;
  language: string | null;
  user_id: string;
  user_email: string | null;
  quality_mode: string | null;
  ai_model: string | null;
  health_score: number | null;
  health: string | null;
  total_findings: number | null;
  errors: number | null;
  warnings: number | null;
  infos: number | null;
  result: string | null;
  result_message: string | null;
  chunks_count: number | null;
  duration_ms: number | null;
  tokens: Record<string, { input: number; output: number; pages?: number }> | null;
  cost_usd: number | null;
}

interface Stats {
  total: number;
  audits: number;
  saves: number;
  rerags: number;
  fixes: number;
  totalCost: number;
  avgHealth: number | null;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(usd: number | null): string {
  if (usd == null || usd === 0) return "";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function getTotalTokens(tokens: Record<string, { input: number; output: number; pages?: number }> | null): { input: number; output: number } {
  if (!tokens) return { input: 0, output: 0 };
  let input = 0, output = 0;
  for (const u of Object.values(tokens)) {
    input += u.input || 0;
    output += u.output || 0;
  }
  return { input, output };
}

const OPERATION_CONFIG: Record<
  string,
  { label: string; icon: typeof Save; color: string; bgColor: string }
> = {
  save: {
    label: "Saved",
    icon: Save,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  audit: {
    label: "Audited",
    icon: ShieldCheck,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  "fix:clean-preamble": {
    label: "Clean Preamble",
    icon: Wrench,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  "fix:re-ocr": {
    label: "Re-OCR",
    icon: Wrench,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  "fix:re-translate": {
    label: "Re-Translate",
    icon: Wrench,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  rerag: {
    label: "Re-RAG",
    icon: RefreshCcw,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  "add-document": {
    label: "Added",
    icon: Plus,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  delete: {
    label: "Deleted",
    icon: Trash2,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  "human-approval": {
    label: "Human Approval",
    icon: ClipboardCheck,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-100 dark:bg-sky-900/30",
  },
};

function getOperationConfig(op: string) {
  return (
    OPERATION_CONFIG[op] ?? {
      label: op,
      icon: Activity,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    }
  );
}

function HealthBadge({ score, health }: { score: number; health: string }) {
  const colors =
    health === "good"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : health === "fair"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return (
    <Badge variant="secondary" className={cn("text-[11px] font-mono", colors)}>
      {score}%
    </Badge>
  );
}

function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const config = getOperationConfig(log.operation);
  const Icon = config.icon;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
      >
        <div className="text-muted-foreground">
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </div>

        {/* Operation icon */}
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg shrink-0",
            config.bgColor
          )}
        >
          <Icon className={cn("size-4", config.color)} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{config.label}</span>
            <span className="text-xs text-muted-foreground font-mono">
              {log.document_id}
            </span>
            {log.language && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {log.language.toUpperCase()}
              </Badge>
            )}
            {log.quality_mode && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4",
                  log.quality_mode === "premium"
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                    : ""
                )}
              >
                {log.quality_mode}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {log.document_title}
          </p>
        </div>

        {/* Right-side badges */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {log.health_score != null && log.health && (
            <HealthBadge score={log.health_score} health={log.health} />
          )}

          {log.result && log.operation === "human-approval" && (
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-1.5 py-0 h-4",
                log.result === "approved"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : log.result === "needs-improvements"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}
            >
              {log.result === "approved"
                ? "Approved"
                : log.result === "needs-improvements"
                  ? "Needs Improvements"
                  : "Declined"}
            </Badge>
          )}

          {log.result && log.operation !== "audit" && log.operation !== "human-approval" && (
            <div className="flex items-center gap-1">
              {log.result === "success" ? (
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              ) : (
                <XCircle className="size-3.5 text-red-500" />
              )}
            </div>
          )}

          {/* Token count summary */}
          {log.tokens && Object.keys(log.tokens).length > 0 && (() => {
            const t = getTotalTokens(log.tokens);
            return t.input + t.output > 0 ? (
              <span className="text-[11px] text-muted-foreground font-mono">
                {formatTokens(t.input + t.output)}
              </span>
            ) : null;
          })()}

          {/* Cost badge */}
          {log.cost_usd != null && log.cost_usd > 0 && (
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] font-mono px-1.5 py-0 h-4",
                log.cost_usd >= 0.1
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : log.cost_usd >= 0.01
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : ""
              )}
            >
              {formatCost(log.cost_usd)}
            </Badge>
          )}

          {log.duration_ms != null && (
            <span className="text-xs text-muted-foreground font-mono w-12 text-right">
              {formatDuration(log.duration_ms)}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
          {timeAgo(log.created_at)}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pl-[60px]">
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                  User
                </p>
                <div className="flex items-center gap-1.5">
                  <User className="size-3.5 text-muted-foreground" />
                  <span className="text-xs truncate">
                    {log.user_email || log.user_id}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                  Time
                </p>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span className="text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
              {log.duration_ms != null && (
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    Duration
                  </p>
                  <span className="text-xs font-mono">
                    {formatDuration(log.duration_ms)}
                  </span>
                </div>
              )}
            </div>

            {/* Audit-specific details */}
            {log.operation === "audit" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-2 border-t border-border">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    AI Model
                  </p>
                  <span className="text-xs">{log.ai_model || "—"}</span>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    Findings
                  </p>
                  <span className="text-xs font-mono">
                    {log.total_findings ?? "—"}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    Breakdown
                  </p>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    {log.errors != null && log.errors > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        {log.errors}E
                      </span>
                    )}
                    {log.warnings != null && log.warnings > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {log.warnings}W
                      </span>
                    )}
                    {log.infos != null && log.infos > 0 && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {log.infos}I
                      </span>
                    )}
                    {!log.errors && !log.warnings && !log.infos && "—"}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    Health
                  </p>
                  {log.health_score != null && log.health ? (
                    <HealthBadge score={log.health_score} health={log.health} />
                  ) : (
                    <span className="text-xs">—</span>
                  )}
                </div>
              </div>
            )}

            {/* Fix-specific details */}
            {log.operation.startsWith("fix:") && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm pt-2 border-t border-border">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    AI Model
                  </p>
                  <span className="text-xs">{log.ai_model || "None"}</span>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    Result
                  </p>
                  <div className="flex items-center gap-1">
                    {log.result === "success" ? (
                      <CheckCircle2 className="size-3 text-emerald-500" />
                    ) : (
                      <XCircle className="size-3 text-red-500" />
                    )}
                    <span className="text-xs capitalize">
                      {log.result || "—"}
                    </span>
                  </div>
                </div>
                {log.result_message && (
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      Message
                    </p>
                    <span className="text-xs">{log.result_message}</span>
                  </div>
                )}
              </div>
            )}

            {/* ReRAG-specific details */}
            {log.operation === "rerag" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm pt-2 border-t border-border">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    Chunks
                  </p>
                  <span className="text-xs font-mono">
                    {log.chunks_count ?? "—"}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    Result
                  </p>
                  <div className="flex items-center gap-1">
                    {log.result === "success" ? (
                      <CheckCircle2 className="size-3 text-emerald-500" />
                    ) : log.result === "partial" ? (
                      <AlertCircle className="size-3 text-amber-500" />
                    ) : (
                      <XCircle className="size-3 text-red-500" />
                    )}
                    <span className="text-xs capitalize">
                      {log.result || "—"}
                    </span>
                  </div>
                </div>
                {log.result_message && (
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      Detail
                    </p>
                    <span className="text-xs">{log.result_message}</span>
                  </div>
                )}
              </div>
            )}

            {/* Human Approval details */}
            {log.operation === "human-approval" && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      Decision
                    </p>
                    <div className="flex items-center gap-1.5">
                      {log.result === "approved" ? (
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                      ) : log.result === "needs-improvements" ? (
                        <AlertCircle className="size-3.5 text-amber-500" />
                      ) : (
                        <XCircle className="size-3.5 text-red-500" />
                      )}
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          log.result === "approved"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : log.result === "needs-improvements"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}
                      >
                        {log.result === "approved"
                          ? "Approved"
                          : log.result === "needs-improvements"
                            ? "Needs Improvements"
                            : "Declined"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      Signed By
                    </p>
                    <span className="text-xs font-medium">
                      {log.result_message?.match(/^\[Signed: (.+?)\]/)?.[1] || log.user_email || log.user_id}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      Admin
                    </p>
                    <span className="text-xs">
                      {log.user_email || log.user_id}
                    </span>
                  </div>
                </div>
                {log.result_message && (
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      Comments
                    </p>
                    <p className="text-xs bg-background rounded-md border border-border p-2 whitespace-pre-wrap">
                      {log.result_message.replace(/^\[Signed: .+?\]\s*/, "")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Token usage breakdown */}
            {log.tokens && Object.keys(log.tokens).length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
                  Token Usage
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Model</th>
                        <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Input</th>
                        <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Output</th>
                        <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(log.tokens).map(([model, usage]) => (
                        <tr key={model} className="border-t border-border">
                          <td className="px-3 py-1.5 font-mono text-foreground">{model}</td>
                          <td className="text-right px-3 py-1.5 font-mono text-muted-foreground">
                            {usage.pages ? `${usage.pages} pages` : formatTokens(usage.input)}
                          </td>
                          <td className="text-right px-3 py-1.5 font-mono text-muted-foreground">
                            {usage.pages ? "—" : formatTokens(usage.output)}
                          </td>
                          <td className="text-right px-3 py-1.5 font-mono">
                            {usage.pages ? `${usage.pages} pg` : formatTokens(usage.input + usage.output)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {log.cost_usd != null && log.cost_usd > 0 && (
                  <div className="flex justify-end mt-2">
                    <span className="text-xs font-medium">
                      Estimated cost:{" "}
                      <span className={cn(
                        "font-mono",
                        log.cost_usd >= 0.1
                          ? "text-red-600 dark:text-red-400"
                          : log.cost_usd >= 0.01
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                      )}>
                        {formatCost(log.cost_usd)}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AuditLogsTab() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docFilter, setDocFilter] = useState<string>("all");
  const [opFilter, setOpFilter] = useState<string>("all");
  const limit = 15;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (docFilter !== "all") params.set("doc", docFilter);
      if (opFilter !== "all") params.set("operation", opFilter);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, docFilter, opFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [docFilter, opFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {stats && (
        <>
        <div className="-mx-4 px-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
          <div className="min-w-[160px] flex-shrink-0 snap-start rounded-2xl border border-border bg-card p-5 sm:min-w-0 sm:flex-shrink">
            <div className="flex items-center justify-between mb-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Activity className="size-5" />
              </div>
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-sm font-medium">
              {t("admin.logs.totalOps")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("admin.logs.allTime")}
            </p>
          </div>

          <div className="min-w-[160px] flex-shrink-0 snap-start rounded-2xl border border-border bg-card p-5 sm:min-w-0 sm:flex-shrink">
            <div className="flex items-center justify-between mb-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <ShieldCheck className="size-5" />
              </div>
              <span className="text-2xl font-bold">{stats.audits}</span>
            </div>
            <p className="text-sm font-medium">
              {t("admin.logs.audits")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.avgHealth != null
                ? `${t("admin.logs.avgHealth")}: ${stats.avgHealth}%`
                : t("admin.logs.noAudits")}
            </p>
          </div>

          <div className="min-w-[160px] flex-shrink-0 snap-start rounded-2xl border border-border bg-card p-5 sm:min-w-0 sm:flex-shrink">
            <div className="flex items-center justify-between mb-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Save className="size-5" />
              </div>
              <span className="text-2xl font-bold">{stats.saves}</span>
            </div>
            <p className="text-sm font-medium">
              {t("admin.logs.saves")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("admin.logs.docEdits")}
            </p>
          </div>

          <div className="min-w-[160px] flex-shrink-0 snap-start rounded-2xl border border-border bg-card p-5 sm:min-w-0 sm:flex-shrink">
            <div className="flex items-center justify-between mb-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <RefreshCcw className="size-5" />
              </div>
              <span className="text-2xl font-bold">
                {stats.rerags + stats.fixes}
              </span>
            </div>
            <p className="text-sm font-medium">
              {t("admin.logs.reragsAndFixes")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.rerags} re-RAG · {stats.fixes}{" "}
              {t("admin.logs.fixOps")}
            </p>
          </div>
        </div>

        {/* Total cost banner */}
        {stats.totalCost > 0 && (
          <div className="col-span-full rounded-xl border border-border bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950/20 dark:to-blue-950/20 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-medium">{t("admin.logs.totalCost")}</span>
            </div>
            <span className="text-lg font-bold font-mono text-violet-700 dark:text-violet-300">
              {formatCost(stats.totalCost)}
            </span>
          </div>
        )}
        </>
      )}

      {/* Filters + Log list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Filter bar */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
          <Filter className="size-4 text-muted-foreground shrink-0" />
          <Select value={docFilter} onValueChange={setDocFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="All documents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.logs.allDocs")}</SelectItem>
              {Array.from({ length: 8 }, (_, i) => {
                const id = `DOC-${String(i + 1).padStart(3, "0")}`;
                return (
                  <SelectItem key={id} value={id}>
                    {id}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={opFilter} onValueChange={setOpFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All operations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.logs.allOps")}</SelectItem>
              <SelectItem value="save">{t("admin.logs.op.save")}</SelectItem>
              <SelectItem value="audit">{t("admin.logs.op.audit")}</SelectItem>
              <SelectItem value="rerag">{t("admin.logs.op.rerag")}</SelectItem>
              <SelectItem value="add-document">{t("admin.logs.op.addDocument")}</SelectItem>
              <SelectItem value="delete">{t("admin.logs.op.delete")}</SelectItem>
              <SelectItem value="fix:re-ocr">
                {t("admin.logs.op.reocr")}
              </SelectItem>
              <SelectItem value="fix:re-translate">
                {t("admin.logs.op.retranslate")}
              </SelectItem>
              <SelectItem value="fix:clean-preamble">
                {t("admin.logs.op.cleanPreamble")}
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="h-8 text-xs gap-1"
          >
            <RefreshCcw
              className={cn("size-3.5", loading && "animate-spin")}
            />
            {t("admin.logs.refresh")}
          </Button>
        </div>

        {/* Loading */}
        {loading && logs.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center justify-center py-16 text-destructive gap-2">
            <AlertCircle className="size-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <FileText className="size-8 opacity-40" />
            <p className="text-sm">{t("admin.logs.empty")}</p>
          </div>
        )}

        {/* Log list */}
        {!error && logs.length > 0 && (
          <div className={cn(loading && "opacity-60 pointer-events-none")}>
            {logs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {t("admin.logs.showing")} {(page - 1) * limit + 1}–
              {Math.min(page * limit, total)} {t("admin.logs.of")} {total}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs px-2 font-medium">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
