"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Zap,
  Check,
  X,
  Eye,
  AlertTriangle,
  Trash2,
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
import {
  type DecisionTreeBranch,
  type BranchStatus,
  type ContributorCorrection,
  branchStatusColor,
  branchStatusLabel,
  nodeStatusIcon,
  confidenceColor,
  timeAgo,
} from "./helpers";

interface BranchStats {
  total: number;
  draft: number;
  under_review: number;
  partially_confirmed: number;
  confirmed: number;
  recheck_required: number;
  rejected: number;
}

export default function BranchesTab() {
  const [branches, setBranches] = useState<DecisionTreeBranch[]>([]);
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedBranch, setExpandedBranch] = useState<number | null>(null);
  const [autoBuilding, setAutoBuilding] = useState(false);

  // Review queue
  const [reviewQueue, setReviewQueue] = useState<ContributorCorrection[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab: "branches" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/decision-tree?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
        setStats(data.stats || null);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchReviewQueue = useCallback(async () => {
    setReviewLoading(true);
    try {
      const res = await fetch("/api/admin/decision-tree?tab=review-queue");
      if (res.ok) {
        const data = await res.json();
        setReviewQueue(data.corrections || []);
      }
    } finally {
      setReviewLoading(false);
    }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);
  useEffect(() => { fetchReviewQueue(); }, [fetchReviewQueue]);

  const handleAutoBuild = async () => {
    setAutoBuilding(true);
    try {
      const res = await fetch("/api/admin/decision-tree/auto-build", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(`Auto-build: ${data.proposed} branches proposed, ${data.skipped} skipped (overlap)`);
        fetchBranches();
      }
    } finally {
      setAutoBuilding(false);
    }
  };

  const handleDeleteBranch = async (branchId: number) => {
    if (!confirm("Delete this branch? This cannot be undone.")) return;
    const res = await fetch("/api/admin/decision-tree", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove-branch", id: branchId }),
    });
    if (res.ok) {
      fetchBranches();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Delete failed");
    }
  };

  const handleUpdateStatus = async (branchId: number, newStatus: BranchStatus, notes?: string) => {
    const res = await fetch("/api/admin/decision-tree", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-branch-status",
        branch_id: branchId,
        status: newStatus,
        notes,
      }),
    });
    if (res.ok) fetchBranches();
  };

  const handleReviewCorrection = async (correctionId: number, decision: "approved" | "rejected") => {
    const res = await fetch("/api/admin/decision-tree", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "review-correction",
        correction_id: correctionId,
        decision,
      }),
    });
    if (res.ok) {
      fetchReviewQueue();
      fetchBranches();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stats Bar ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Total", value: stats.total, color: "" },
            { label: "Confirmed", value: stats.confirmed, color: "text-green-600" },
            { label: "Under Review", value: stats.under_review, color: "text-blue-600" },
            { label: "Partial", value: stats.partially_confirmed, color: "text-amber-600" },
            { label: "Draft", value: stats.draft, color: "text-gray-500" },
            { label: "Recheck", value: stats.recheck_required, color: "text-orange-600" },
            { label: "Rejected", value: stats.rejected, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border p-3 text-center">
              <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Controls ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="partially_confirmed">Partially Confirmed</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="recheck_required">Recheck Required</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={fetchBranches}>
          <RefreshCw className="size-3.5 mr-1.5" />
          Refresh
        </Button>

        <Button variant="default" size="sm" onClick={handleAutoBuild} disabled={autoBuilding}>
          {autoBuilding ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Zap className="size-3.5 mr-1.5" />}
          Auto-Build Branches
        </Button>
      </div>

      {/* ── Review Queue ── */}
      {reviewQueue.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-4">
          <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-amber-600" />
            Contributor Review Queue ({reviewQueue.length} pending)
          </h3>
          <div className="space-y-2">
            {reviewQueue.slice(0, 5).map((correction) => (
              <div key={correction.id} className="flex items-start justify-between gap-3 text-sm border rounded-md p-3 bg-background">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-muted-foreground">
                    {correction.document_id} / {correction.section_number}
                  </div>
                  {correction.correction_note && (
                    <div className="text-xs mt-1 text-muted-foreground truncate">
                      {correction.correction_note}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    by {correction.submitted_by_email || "unknown"} · {timeAgo(correction.submitted_at)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-green-600 hover:bg-green-50"
                    onClick={() => handleReviewCorrection(correction.id, "approved")}
                  >
                    <Check className="size-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-red-600 hover:bg-red-50"
                    onClick={() => handleReviewCorrection(correction.id, "rejected")}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Branch List ── */}
      {branches.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <GitBranch className="size-8 mx-auto mb-2 opacity-50" />
          <p>No branches yet. Click &ldquo;Auto-Build&rdquo; to generate from routing data.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              expanded={expandedBranch === branch.id}
              onToggle={() => setExpandedBranch(expandedBranch === branch.id ? null : branch.id)}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDeleteBranch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Branch Card Component ──

function BranchCard({
  branch,
  expanded,
  onToggle,
  onUpdateStatus,
  onDelete,
}: {
  branch: DecisionTreeBranch;
  expanded: boolean;
  onToggle: () => void;
  onUpdateStatus: (branchId: number, newStatus: BranchStatus, notes?: string) => void;
  onDelete: (branchId: number) => void;
}) {
  const sections = branch.sections || [];
  const confirmedCount = sections.filter((s) => s.node_status === "confirmed").length;

  return (
    <div className="rounded-lg border">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        {expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{branch.label}</span>
            <Badge variant="outline" className={cn("text-xs", branchStatusColor(branch.status as BranchStatus))}>
              {branchStatusLabel(branch.status as BranchStatus)}
            </Badge>
            <Badge variant="outline" className="text-xs">{branch.domain}</Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {confirmedCount}/{sections.length} sections confirmed · matched {branch.times_matched}x · avg confidence {Math.round(branch.avg_confidence * 100)}%
          </div>
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t p-4 space-y-4">
          {/* Description */}
          {branch.description && (
            <p className="text-sm text-muted-foreground">{branch.description}</p>
          )}

          {/* Section Nodes */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Sections</h4>
            <div className="space-y-1">
              {sections.map((sec, idx) => {
                const statusInfo = nodeStatusIcon(sec.node_status);
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50">
                    <span title={sec.node_status}>{statusInfo.emoji}</span>
                    <span className="font-mono text-xs">{sec.document_id}</span>
                    <span>{sec.section || `Section ${sec.section_number}`}</span>
                    {sec.confirmed_at && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        confirmed {timeAgo(sec.confirmed_at)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cross-Domains */}
          {branch.cross_domains && branch.cross_domains.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Cross-domains:</span>
              {branch.cross_domains.map((d) => (
                <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
              ))}
            </div>
          )}

          {/* Recheck Reason */}
          {branch.recheck_reason && (
            <div className="text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/10 p-2 rounded">
              Recheck reason: {branch.recheck_reason}
            </div>
          )}

          {/* Status Actions */}
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
            {branch.status === "draft" && (
              <Button size="sm" variant="outline" onClick={() => onUpdateStatus(branch.id, "under_review")}>
                <Eye className="size-3 mr-1.5" />
                Send for Review
              </Button>
            )}
            {branch.status === "under_review" && (
              <>
                <Button size="sm" variant="outline" className="text-amber-600" onClick={() => onUpdateStatus(branch.id, "partially_confirmed")}>
                  Partially Confirm
                </Button>
                <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => onUpdateStatus(branch.id, "confirmed")}>
                  <Check className="size-3 mr-1.5" />
                  Confirm Branch
                </Button>
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => onUpdateStatus(branch.id, "rejected", "Rejected by admin")}>
                  <X className="size-3 mr-1.5" />
                  Reject
                </Button>
              </>
            )}
            {branch.status === "partially_confirmed" && (
              <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => onUpdateStatus(branch.id, "confirmed")}>
                <Check className="size-3 mr-1.5" />
                Fully Confirm
              </Button>
            )}
            {branch.status === "recheck_required" && (
              <Button size="sm" variant="outline" onClick={() => onUpdateStatus(branch.id, "under_review")}>
                Re-open Review
              </Button>
            )}
            {branch.status === "confirmed" && (
              <Button size="sm" variant="outline" className="text-orange-600" onClick={() => onUpdateStatus(branch.id, "recheck_required", "Manual recheck requested")}>
                Request Recheck
              </Button>
            )}

            {/* Delete — always available */}
            <Button
              size="sm"
              variant="outline"
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto"
              onClick={() => onDelete(branch.id)}
            >
              <Trash2 className="size-3 mr-1.5" />
              Delete
            </Button>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground pt-2 border-t space-y-0.5">
            <div>Created: {new Date(branch.created_at).toLocaleDateString()}</div>
            {branch.reviewed_by && <div>Reviewed by: {branch.reviewed_by} · {timeAgo(branch.reviewed_at)}</div>}
            {branch.approved_by && <div>Approved by: {branch.approved_by} · {timeAgo(branch.approved_at)}</div>}
            {branch.auto_generated && <div className="italic">Auto-generated from routing data</div>}
          </div>
        </div>
      )}
    </div>
  );
}
