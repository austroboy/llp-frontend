"use client";

/**
 * AuditPanel — read-only quality inspector for a document.
 *
 * 2026-04-22 rewrite: mutation actions (fix, re-ocr, re-translate, re-rag,
 * verify-translation, ai-fix) removed as part of admin ingest deprecation.
 * Corpus mutations are CLI-only via scripts/mineru-reingest.ts.
 *
 * Current capabilities:
 * - Run audit check (read-only — backend /audit route streams findings, no DB write)
 * - Display summary health score + categorized findings
 * - Collapse/expand findings, filter by severity
 * - Show suggested-action labels (informational — no action button)
 */

import { useState, useCallback } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Stethoscope,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import type {
  AuditEvent,
  AuditFinding,
  AuditSummary,
  QualityMode,
} from "@/lib/audit/types";
import { QUALITY_MODE_META } from "@/lib/audit/types";

interface AuditPanelProps {
  docId: string;
  activeLang: "en" | "bn";
  isTranslated: boolean;
  onSummary?: (summary: AuditSummary | null) => void;
}

const SEVERITY_ICON = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: CheckCircle2,
};

const SEVERITY_COLOR: Record<string, string> = {
  error: "text-red-500",
  warning: "text-amber-500",
  info: "text-emerald-500",
};

const SEVERITY_BG: Record<string, string> = {
  error: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  warning:
    "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  info: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
};

export default function AuditPanel({
  docId,
  activeLang,
  onSummary,
}: AuditPanelProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<QualityMode>("standard");
  const [running, setRunning] = useState(false);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAudit = useCallback(async () => {
    setRunning(true);
    setFindings([]);
    setSummary(null);
    setProgress(null);
    setError(null);
    onSummary?.(null);

    try {
      const res = await fetch(`/api/admin/rag/${docId}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, language: activeLang }),
      });

      if (!res.ok) {
        throw new Error(`Audit failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!;

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event: AuditEvent = JSON.parse(line);
            if (event.type === "progress") {
              setProgress(event.message);
            } else if (event.type === "finding") {
              setFindings((prev) => [...prev, event.finding]);
            } else if (event.type === "done") {
              setSummary(event.summary);
              onSummary?.(event.summary);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }, [docId, mode, activeLang, onSummary]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredFindings = filterSeverity
    ? findings.filter((f) => f.severity === filterSeverity)
    : findings;

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const infoCount = findings.filter((f) => f.severity === "info").length;

  return (
    <div className="border-b border-border bg-muted/20 shrink-0 max-h-[50vh] overflow-auto">
      <div className="px-4 py-3 flex items-center justify-between gap-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Stethoscope className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("admin.rag.audit.title")}</span>
          <Badge variant="outline" className="text-[10px]">
            {activeLang.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as QualityMode)}
            disabled={running}
            className="text-xs rounded-md border border-border bg-background px-2 py-1"
          >
            {Object.entries(QUALITY_MODE_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={runAudit}
            disabled={running}
            className="gap-1.5"
          >
            {running ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5 " />
            )}
            {running ? t("admin.rag.audit.running") : t("admin.rag.audit.run")}
          </Button>
        </div>
      </div>

      {/* Read-only notice */}
      <div className="px-4 py-2 flex items-start gap-2 text-[11px] text-muted-foreground border-b border-border/30">
        <Info className="size-3 shrink-0 mt-0.5" />
        <span>
          Audit findings are read-only. To apply fixes (re-OCR, re-translate,
          re-chunk), run the CLI pipeline — see{" "}
          <code className="px-1 rounded bg-background border">
            docs/data-accuracy-plan/INGEST-*.md
          </code>
          .
        </span>
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}

      {progress && running && (
        <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin" />
          {progress}
        </div>
      )}

      {summary && (
        <div className="px-4 py-3 grid grid-cols-4 gap-2 text-xs border-b border-border/30">
          <div>
            <div className="text-muted-foreground">Health</div>
            <div
              className={cn(
                "text-lg font-semibold",
                summary.healthScore >= 70
                  ? "text-emerald-600"
                  : summary.healthScore >= 40
                    ? "text-amber-600"
                    : "text-red-600"
              )}
            >
              {summary.healthScore}%
            </div>
          </div>
          <button
            onClick={() =>
              setFilterSeverity(filterSeverity === "error" ? null : "error")
            }
            className={cn(
              "text-left",
              filterSeverity === "error" && "bg-red-50 dark:bg-red-950/30 rounded-md px-1"
            )}
          >
            <div className="text-muted-foreground">Errors</div>
            <div className="text-lg font-semibold text-red-600">{errorCount}</div>
          </button>
          <button
            onClick={() =>
              setFilterSeverity(filterSeverity === "warning" ? null : "warning")
            }
            className={cn(
              "text-left",
              filterSeverity === "warning" && "bg-amber-50 dark:bg-amber-950/30 rounded-md px-1"
            )}
          >
            <div className="text-muted-foreground">Warnings</div>
            <div className="text-lg font-semibold text-amber-600">{warningCount}</div>
          </button>
          <button
            onClick={() =>
              setFilterSeverity(filterSeverity === "info" ? null : "info")
            }
            className={cn(
              "text-left",
              filterSeverity === "info" && "bg-emerald-50 dark:bg-emerald-950/30 rounded-md px-1"
            )}
          >
            <div className="text-muted-foreground">Info</div>
            <div className="text-lg font-semibold text-emerald-600">{infoCount}</div>
          </button>
        </div>
      )}

      {filteredFindings.length > 0 && (
        <div className="divide-y divide-border/30">
          {filteredFindings.map((f) => {
            const expanded = expandedFindings.has(f.id);
            const Icon = SEVERITY_ICON[f.severity as keyof typeof SEVERITY_ICON] ?? Info;

            return (
              <div
                key={f.id}
                className={cn(
                  "px-4 py-2.5 border-l-2",
                  SEVERITY_BG[f.severity] ?? ""
                )}
              >
                <button
                  onClick={() => toggleExpand(f.id)}
                  className="flex items-start gap-2 w-full text-left"
                >
                  {expanded ? (
                    <ChevronDown className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  )}
                  <Icon
                    className={cn(
                      "size-3.5 mt-0.5 shrink-0",
                      SEVERITY_COLOR[f.severity] ?? ""
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{f.title}</div>
                    {!expanded && f.description && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {f.description}
                      </div>
                    )}
                  </div>
                  {f.action && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 shrink-0"
                      title="Suggested action (CLI-only)"
                    >
                      {f.action.label}
                    </Badge>
                  )}
                </button>

                {expanded && (
                  <div className="mt-2 ml-8 text-xs text-muted-foreground space-y-1">
                    {f.description && <div>{f.description}</div>}
                    {f.location?.snippet && (
                      <pre className="mt-1 p-2 bg-background/50 rounded border border-border/50 font-mono text-[11px] whitespace-pre-wrap break-words max-h-32 overflow-auto">
                        {f.location.snippet}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!running && !error && findings.length === 0 && !summary && (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
          Click Run to generate audit findings (read-only quality report).
        </div>
      )}
    </div>
  );
}
