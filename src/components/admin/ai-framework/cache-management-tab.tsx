"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ThumbsUp,
  ThumbsDown,
  Check,
  X as XIcon,
  Trash2,
  Database,
  Clock,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { toast } from "sonner";

interface CacheEntry {
  id: string;
  query_hash: string;
  question: string;
  response: string;
  citations: unknown[];
  status: string;
  upvote_count: number;
  downvote_count: number;
  hit_count?: number;
  source_message_id: string | null;
  source_conversation_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

interface CacheStats {
  total: number;
  pending: number;
  approved: number;
  auto_approved: number;
  rejected: number;
}

interface ApiResponse {
  entries: CacheEntry[];
  total: number;
  page: number;
  pages: number;
  stats: CacheStats;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  approved: "bg-green-500/10 text-green-600",
  auto_approved: "bg-blue-500/10 text-blue-600",
  rejected: "bg-red-500/10 text-red-600",
};

export function CacheManagementTab() {
  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/cache?${params}`);
      const data: ApiResponse = await res.json();
      if (data.entries) {
        setEntries(data.entries);
        setTotalPages(data.pages);
        setStats(data.stats);
      }
    } catch {
      toast.error("Failed to load cache entries");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/cache/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Cache entry approved");
      fetchEntries();
    } catch {
      toast.error("Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/cache/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Cache entry rejected");
      fetchEntries();
    } catch {
      toast.error("Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/cache?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Cache entry deleted");
      fetchEntries();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && entries.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="lf-card" style={{ padding: "var(--s-3)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Database className="size-4 text-blue-600" />
              <span className="text-[11px] text-muted-foreground">Total Cached</span>
            </div>
            <p className="text-xl font-semibold">{stats.total}</p>
          </div>
          <div className="lf-card" style={{ padding: "var(--s-3)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="size-4 text-yellow-600" />
              <span className="text-[11px] text-muted-foreground">Pending</span>
            </div>
            <p className="text-xl font-semibold">{stats.pending}</p>
          </div>
          <div className="lf-card" style={{ padding: "var(--s-3)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="size-4 text-green-600" />
              <span className="text-[11px] text-muted-foreground">Approved</span>
            </div>
            <p className="text-xl font-semibold">{stats.approved}</p>
          </div>
          <div className="lf-card" style={{ padding: "var(--s-3)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldX className="size-4 text-red-600" />
              <span className="text-[11px] text-muted-foreground">Rejected</span>
            </div>
            <p className="text-xl font-semibold">{stats.rejected}</p>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: null, label: "All" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "auto_approved", label: "Auto-approved" },
          { value: "rejected", label: "Rejected" },
        ].map((f) => (
          <Button
            key={f.label}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
        {entries.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No cache entries found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="max-w-[300px]">Query</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Upvotes</TableHead>
                <TableHead className="text-center">Downvotes</TableHead>
                <TableHead className="text-center">Hits</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm truncate" title={entry.question}>
                      {entry.question?.slice(0, 80) || entry.query_hash?.slice(0, 16)}
                      {(entry.question?.length || 0) > 80 ? "..." : ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-[10px] ${STATUS_COLORS[entry.status] || ""}`}>
                      {entry.status?.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <ThumbsUp className="size-3 text-green-600" />
                      {entry.upvote_count || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <ThumbsDown className="size-3 text-red-600" />
                      {entry.downvote_count || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {entry.hit_count || 0}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(entry.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {entry.status !== "approved" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Approve"
                          disabled={actionLoading === entry.id}
                          onClick={() => handleApprove(entry.id)}
                        >
                          <Check className="size-3.5" />
                        </Button>
                      )}
                      {entry.status !== "rejected" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          title="Reject"
                          disabled={actionLoading === entry.id}
                          onClick={() => handleReject(entry.id)}
                        >
                          <XIcon className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:bg-red-50"
                        title="Delete"
                        disabled={actionLoading === entry.id}
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
