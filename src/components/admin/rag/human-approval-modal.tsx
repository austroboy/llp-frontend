"use client";

/**
 * HumanApprovalModal — read-only viewer for past approval decisions.
 *
 * 2026-04-22 refactor: approval submission removed. Modal now fetches and
 * displays the document's approval history from audit_logs. For new
 * approvals, use the CLI or the audit-logs admin tab.
 */

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ClipboardCheck,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Decision = "approved" | "needs-improvements" | "declined";

interface ApprovalEntry {
  id: string;
  decision: Decision | string;
  signature?: string;
  comments?: string;
  user_id?: string;
  user_email?: string;
  created_at: string;
}

interface HumanApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docId: string;
  docTitle: string;
  /** Kept for backward-compat; no longer invoked (read-only). */
  onSubmitted?: () => void;
}

const DECISION_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle2; color: string; bg: string }
> = {
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
  },
  "needs-improvements": {
    label: "Needs Improvements",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  },
  declined: {
    label: "Declined",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  },
};

export function HumanApprovalModal({
  open,
  onOpenChange,
  docId,
  docTitle,
}: HumanApprovalModalProps) {
  const [entries, setEntries] = useState<ApprovalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/rag/${docId}/human-approval`,
          { method: "GET" }
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) {
          setEntries(Array.isArray(data.approvals) ? data.approvals : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load approvals");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, docId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5" />
            Approval History
          </DialogTitle>
          <DialogDescription>
            Past human audit decisions for{" "}
            <span className="font-medium text-foreground">{docTitle}</span>{" "}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
              {docId}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {/* Read-only notice */}
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 border border-border rounded-md p-2">
          <Info className="size-3 shrink-0 mt-0.5" />
          <span>
            Approvals are read-only as of 2026-04-22. To record a new decision,
            use the CLI audit pipeline.
          </span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" />
            Loading history…
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="size-4" />
            {error}
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No approval records for this document.
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="space-y-2 max-h-80 overflow-auto">
            {entries.map((entry) => {
              const cfg = DECISION_CONFIG[entry.decision] ?? {
                label: entry.decision,
                icon: ClipboardCheck,
                color: "text-muted-foreground",
                bg: "bg-muted/40 border-border",
              };
              const Icon = cfg.icon;
              return (
                <div
                  key={entry.id}
                  className={cn("rounded-md border p-3 text-sm", cfg.bg)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("size-4", cfg.color)} />
                      <span className="font-medium">{cfg.label}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  {entry.signature && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Signed by{" "}
                      <span className="font-medium text-foreground">
                        {entry.signature}
                      </span>
                      {entry.user_email && <> ({entry.user_email})</>}
                    </div>
                  )}
                  {entry.comments && (
                    <div className="text-xs mt-1.5 text-foreground/80">
                      {entry.comments}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
