"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Filter,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoteComment {
  vote: string;
  comment: string;
  user_id: string;
  created_at: string;
}

interface ChatRecord {
  id: string;
  user_id: string;
  user_email: string;
  title: string;
  query_preview: string;
  response_preview: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  votes: {
    upvotes: number;
    downvotes: number;
    comments: VoteComment[];
  };
}

interface ApiResponse {
  records: ChatRecord[];
  total: number;
  page: number;
  pages: number;
}

export function ChatRecordsTab() {
  const [records, setRecords] = useState<ChatRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fullConversation, setFullConversation] = useState<Record<string, any[]>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map(r => r.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} conversation(s)? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/chat-records", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(`Deleted ${selectedIds.size} conversation(s)`);
      setSelectedIds(new Set());
      fetchRecords();
    } catch {
      toast.error("Failed to delete conversations");
    } finally {
      setIsDeleting(false);
    }
  };
  const [hasVotesOnly, setHasVotesOnly] = useState(false);
  const [hasCommentsOnly, setHasCommentsOnly] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (hasVotesOnly) params.set("hasVotes", "true");
      if (hasCommentsOnly) params.set("hasComments", "true");

      const res = await fetch(`/api/admin/chat-records?${params}`);
      const data: ApiResponse = await res.json();
      if (data.records) {
        setRecords(data.records);
        setTotalPages(data.pages);
        setTotal(data.total);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [page, hasVotesOnly, hasCommentsOnly]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    // Fetch full conversation if not cached
    if (!fullConversation[id]) {
      try {
        const res = await fetch(`/api/admin/chat-records?conversation_id=${encodeURIComponent(id)}`);
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { throw new Error("Response not JSON: " + text.slice(0, 100)); }
        if (data.messages && data.messages.length > 0) {
          setFullConversation(prev => ({ ...prev, [id]: data.messages }));
        } else {
          // No messages found — use preview as fallback
          const record = records.find(r => r.id === id);
          if (record) {
            const fallback: any[] = [];
            if (record.query_preview) fallback.push({ role: "user", content: record.query_preview, created_at: record.created_at });
            if (record.response_preview) fallback.push({ role: "assistant", content: record.response_preview, created_at: record.updated_at });
            setFullConversation(prev => ({ ...prev, [id]: fallback }));
          }
        }
      } catch (err) {
        console.error("[chat-records] Failed to load conversation:", err);
        // Use preview data as fallback
        const record = records.find(r => r.id === id);
        if (record) {
          const fallbackMessages: any[] = [];
          if (record.query_preview) fallbackMessages.push({ role: "user", content: record.query_preview, created_at: record.created_at });
          if (record.response_preview) fallbackMessages.push({ role: "assistant", content: record.response_preview, created_at: record.updated_at || record.created_at });
          setFullConversation(prev => ({ ...prev, [id]: fallbackMessages }));
        }
      }
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

  if (loading && records.length === 0) {
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
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="lf-card" style={{ padding: "var(--s-3)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <MessageSquare className="size-4 text-blue-600" />
            <span className="text-[11px] text-muted-foreground">Total Conversations</span>
          </div>
          <p className="text-xl font-semibold">{total.toLocaleString()}</p>
        </div>
        <div className="lf-card" style={{ padding: "var(--s-3)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <ThumbsUp className="size-4 text-green-600" />
            <span className="text-[11px] text-muted-foreground">Total Upvotes</span>
          </div>
          <p className="text-xl font-semibold">
            {records.reduce((sum, r) => sum + r.votes.upvotes, 0)}
          </p>
        </div>
        <div className="lf-card" style={{ padding: "var(--s-3)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <ThumbsDown className="size-4 text-red-600" />
            <span className="text-[11px] text-muted-foreground">Total Downvotes</span>
          </div>
          <p className="text-xl font-semibold">
            {records.reduce((sum, r) => sum + r.votes.downvotes, 0)}
          </p>
        </div>
        <div className="lf-card" style={{ padding: "var(--s-3)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <MessageSquare className="size-4 text-purple-600" />
            <span className="text-[11px] text-muted-foreground">With Comments</span>
          </div>
          <p className="text-xl font-semibold">
            {records.filter(r => r.votes.comments.length > 0).length}
          </p>
        </div>
      </div>

      {/* Filters + Actions */}
      <div className="flex items-center gap-2">
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            onClick={deleteSelected}
            disabled={isDeleting}
          >
            <Trash2 className="size-3 mr-1" />
            Delete {selectedIds.size}
          </Button>
        )}
        <Filter className="size-4 text-muted-foreground" />
        <Button
          variant={hasVotesOnly ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => { setHasVotesOnly(!hasVotesOnly); setPage(1); }}
        >
          Has Votes
        </Button>
        <Button
          variant={hasCommentsOnly ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => { setHasCommentsOnly(!hasCommentsOnly); setPage(1); }}
        >
          Has Comments
        </Button>
      </div>

      {/* Table */}
      <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
        {records.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No chat records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-8 px-1">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-border accent-primary cursor-pointer"
                    checked={records.length > 0 && selectedIds.size === records.length}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-6 px-1" />
                <TableHead className="w-16 px-1">Chat ID</TableHead>
                <TableHead className="w-36 px-1">User</TableHead>
                <TableHead className="w-44 px-1">Query</TableHead>
                <TableHead className="w-10 px-1 text-center">Msgs</TableHead>
                <TableHead className="w-10 px-1 text-center">Up</TableHead>
                <TableHead className="w-10 px-1 text-center">Down</TableHead>
                <TableHead className="w-10 px-1 text-center">Cmts</TableHead>
                <TableHead className="w-24 px-1">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const isExpanded = expandedId === record.id;
                const hasHighUpvotes = record.votes.upvotes >= 3;
                const hasHighDownvotes = record.votes.downvotes >= 3;

                return (
                  <React.Fragment key={record.id}>
                    <TableRow
                      className={cn(
                        "cursor-pointer",
                        selectedIds.has(record.id) && "bg-muted/50",
                        hasHighUpvotes && "border-l-2 border-l-green-500",
                        hasHighDownvotes && "border-l-2 border-l-red-500"
                      )}
                      onClick={() => toggleExpand(record.id)}
                    >
                      <TableCell className="w-8 px-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="size-3.5 rounded border-border accent-primary cursor-pointer"
                          checked={selectedIds.has(record.id)}
                          onChange={() => toggleSelect(record.id)}
                        />
                      </TableCell>
                      <TableCell className="w-8 p-2">
                        {isExpanded ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-mono truncate max-w-[80px]" title={record.id}>
                        {record.id?.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]" title={record.user_email || record.user_id}>
                        {record.user_email || record.user_id?.slice(0, 12) + "..."}
                      </TableCell>
                      <TableCell className="px-1">
                        <div className="truncate text-xs font-medium w-40" title={record.title || record.query_preview}>
                          {(record.title || "Untitled").slice(0, 30)}{(record.title || "").length > 30 ? "..." : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[10px]">
                          {record.message_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {record.votes.upvotes > 0 ? (
                          <Badge className="bg-green-500/10 text-green-600 text-[10px]">
                            {record.votes.upvotes}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {record.votes.downvotes > 0 ? (
                          <Badge className="bg-red-500/10 text-red-600 text-[10px]">
                            {record.votes.downvotes}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {record.votes.comments.length > 0 ? (
                          <Badge className="bg-purple-500/10 text-purple-600 text-[10px]">
                            {record.votes.comments.length}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(record.updated_at || record.created_at)}
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <TableRow key={`${record.id}-expanded`}>
                        <TableCell colSpan={10} className="bg-muted/30 p-4">
                          <div className="space-y-3">
                            {/* Full conversation */}
                            {fullConversation[record.id] ? (
                              <div className="space-y-2">
                                <p className="text-[11px] font-medium text-muted-foreground mb-1">
                                  Full Conversation ({fullConversation[record.id].length} messages)
                                </p>
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                  {fullConversation[record.id].map((msg: any, i: number) => (
                                    <div
                                      key={i}
                                      className={cn(
                                        "text-sm rounded-lg p-3 border",
                                        msg.role === "user"
                                          ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900"
                                          : "bg-background border-border"
                                      )}
                                    >
                                      <p className="text-[10px] font-medium text-muted-foreground mb-1">
                                        {msg.role === "user" ? "User" : "AI"} — {formatDate(msg.created_at)}
                                      </p>
                                      <div className="whitespace-pre-wrap break-words">
                                        {/* Detect uploaded file — clickable download */}
                                        {msg.content?.includes("[User uploaded:") && (() => {
                                          const fileName = msg.content.match(/\[User uploaded: ([^\]]+)\]/)?.[1] || "Attached file";
                                          return (
                                            <button
                                              className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors cursor-pointer"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                  const res = await fetch(`/api/admin/file-download?conversation_id=${record.id}&fileName=${encodeURIComponent(fileName)}`);
                                                  const data = await res.json();
                                                  if (data.url) window.open(data.url, "_blank");
                                                  else toast.error("File not found in storage");
                                                } catch { toast.error("Failed to get download link"); }
                                              }}
                                            >
                                              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                              {fileName}
                                              <svg className="size-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </button>
                                          );
                                        })()}
                                        {msg.content?.includes("[User uploaded:")
                                          ? msg.content.replace(/\[User uploaded: [^\]]+\]\n---\n[\s\S]*?\n---\n\n/, "").trim() || "(question about uploaded document)"
                                          : msg.content
                                        }
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {record.query_preview && (
                                  <div>
                                    <p className="text-[11px] font-medium text-muted-foreground mb-1">User Query</p>
                                    <p className="text-sm bg-background rounded-lg p-3 border border-border">{record.query_preview}</p>
                                  </div>
                                )}
                                {record.response_preview && (
                                  <div>
                                    <p className="text-[11px] font-medium text-muted-foreground mb-1">AI Response</p>
                                    <p className="text-sm bg-background rounded-lg p-3 border border-border text-muted-foreground">{record.response_preview}...</p>
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground animate-pulse">Loading full conversation...</p>
                              </div>
                            )}

                            {/* Feedback comments */}
                            {record.votes.comments.length > 0 && (
                              <div>
                                <p className="text-[11px] font-medium text-muted-foreground mb-1">
                                  Feedback Comments ({record.votes.comments.length})
                                </p>
                                <div className="space-y-2">
                                  {record.votes.comments.map((c, i) => (
                                    <div
                                      key={i}
                                      className={cn(
                                        "text-sm rounded-lg p-3 border",
                                        c.vote === "up"
                                          ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                                          : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                                      )}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        {c.vote === "up" ? (
                                          <ThumbsUp className="size-3 text-green-600" />
                                        ) : (
                                          <ThumbsDown className="size-3 text-red-600" />
                                        )}
                                        <span className="text-[10px] text-muted-foreground">
                                          {c.user_id?.slice(0, 12)}... - {formatDate(c.created_at)}
                                        </span>
                                      </div>
                                      <p>{c.comment}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
          </div>
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
