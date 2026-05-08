"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  RefreshCw,
  Trash2,
  Search,
  Upload,
  Download,
  Loader2,
  UserPlus,
  Users,
  UserMinus,
  AlertCircle,
  X,
  Check,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: string;
  source: string;
  tags: string[];
  created_at: string;
  updated_at: string | null;
  unsubscribed_at: string | null;
}

interface Stats {
  total: number;
  active: number;
  unsubscribed: number;
  bounced: number;
  bySource: Record<string, number>;
}

interface CsvRow {
  email: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Source badge colors
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<string, string> = {
  website_form: "bg-blue-500/10 text-blue-600",
  csv_import: "bg-purple-500/10 text-purple-600",
  email_request: "bg-emerald-500/10 text-emerald-600",
  admin_manual: "bg-gray-500/10 text-gray-600",
  manual: "bg-gray-500/10 text-gray-600",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600",
  unsubscribed: "bg-amber-500/10 text-amber-600",
  bounced: "bg-red-500/10 text-red-600",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SubscribersTab() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Add subscriber dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addTags, setAddTags] = useState("");
  const [adding, setAdding] = useState(false);

  // CSV upload dialog
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvUploading, setCsvUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk tag dialog
  const [tagOpen, setTagOpen] = useState(false);
  const [bulkTag, setBulkTag] = useState("");
  const [tagging, setTagging] = useState(false);

  // Bulk delete
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchSubscribers = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (searchQuery) params.set("search", searchQuery);
        if (statusFilter) params.set("status", statusFilter);
        if (sourceFilter) params.set("source", sourceFilter);

        const res = await fetch(`/api/admin/subscribers?${params}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setSubscribers(data.subscribers || []);
        setTotal(data.total || 0);
        setStats(data.stats || null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load subscribers";
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, searchQuery, statusFilter, sourceFilter]
  );

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  // Debounced search
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, sourceFilter]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleAdd = async () => {
    if (!addEmail) {
      toast.error("Email is required");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addEmail,
          name: addName || undefined,
          tags: addTags ? addTags.split(",").map((t) => t.trim()) : [],
          source: "admin_manual",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`Added ${data.created} subscriber(s)`);
      setAddOpen(false);
      setAddEmail("");
      setAddName("");
      setAddTags("");
      fetchSubscribers(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add subscriber";
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const downloadCsvExample = () => {
    const csv = [
      "email,name",
      "rahim.ahmed@example.com,Rahim Ahmed",
      "fatima.hassan@example.com,Fatima Hassan",
      "karim.hossain@example.com,Karim Hossain",
      "nusrat.jahan@example.com,Nusrat Jahan",
      "arif.rahman@example.com,Arif Rahman",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers-example.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvParse = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const emailIdx = headers.findIndex(
        (h) => h === "email" || h === "e-mail" || h === "email address"
      );
      const nameIdx = headers.findIndex(
        (h) => h === "name" || h === "full name" || h === "fullname"
      );

      if (emailIdx === -1) {
        toast.error("CSV must have an 'email' column");
        return;
      }

      const rows: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const email = cols[emailIdx];
        if (!email) continue;
        rows.push({
          email,
          name: nameIdx >= 0 ? cols[nameIdx] || "" : "",
        });
      }

      setCsvRows(rows);
      setCsvFileName(file.name);
      setCsvOpen(true);
    } catch {
      toast.error("Failed to parse CSV file");
    }
  };

  const handleCsvUpload = async () => {
    if (!csvRows.length) return;
    setCsvUploading(true);
    try {
      const res = await fetch("/api/admin/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscribers: csvRows.map((r) => ({
            email: r.email,
            name: r.name || undefined,
          })),
          source: "csv_import",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(
        `Imported ${data.created} subscribers (${data.skipped} skipped)`
      );
      setCsvOpen(false);
      setCsvRows([]);
      fetchSubscribers(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "CSV import failed";
      toast.error(msg);
    } finally {
      setCsvUploading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/subscribers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`Deleted ${data.deleted} subscriber(s)`);
      setSelected(new Set());
      fetchSubscribers(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete";
      toast.error(msg);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkTag = async () => {
    if (selected.size === 0 || !bulkTag.trim()) return;
    setTagging(true);
    const tag = bulkTag.trim();
    let success = 0;

    try {
      for (const id of Array.from(selected)) {
        const sub = subscribers.find((s) => s.id === id);
        if (!sub) continue;
        const newTags = Array.from(new Set([...sub.tags, tag]));
        const res = await fetch("/api/admin/subscribers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, tags: newTags }),
        });
        const data = await res.json();
        if (!data.error) success++;
      }
      toast.success(`Tag "${tag}" added to ${success} subscriber(s)`);
      setTagOpen(false);
      setBulkTag("");
      setSelected(new Set());
      fetchSubscribers(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add tag";
      toast.error(msg);
    } finally {
      setTagging(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/admin/subscribers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`Status changed to ${status}`);
      fetchSubscribers(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update status";
      toast.error(msg);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === subscribers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(subscribers.map((s) => s.id)));
    }
  };

  const totalPages = Math.ceil(total / limit);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard label="Total" value={stats.total} icon={Users} color="text-blue-600" />
          <StatCard label="Active" value={stats.active} icon={Check} color="text-emerald-600" />
          <StatCard label="Unsubscribed" value={stats.unsubscribed} icon={UserMinus} color="text-amber-600" />
          <StatCard label="Bounced" value={stats.bounced} icon={AlertCircle} color="text-red-600" />
          {Object.entries(stats.bySource)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([source, count]) => (
              <StatCard
                key={source}
                label={source.replace(/_/g, " ")}
                value={count}
                icon={Tag}
                color="text-purple-600"
              />
            ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="website_form">Website Form</SelectItem>
            <SelectItem value="csv_import">CSV Import</SelectItem>
            <SelectItem value="email_request">Email Request</SelectItem>
            <SelectItem value="admin_manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchSubscribers(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Add Subscriber
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1.5 size-4" />
          CSV Upload
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={downloadCsvExample}
          title="Download example CSV file"
        >
          <Download className="mr-1.5 size-4" />
          Example CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCsvParse(file);
            e.target.value = "";
          }}
        />

        {selected.size > 0 && (
          <>
            <div className="h-5 w-px bg-border mx-1" />
            <span className="text-xs text-muted-foreground">
              {selected.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTagOpen(true)}
            >
              <Tag className="mr-1.5 size-4" />
              Add Tag
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 size-4" />
              )}
              Delete
            </Button>
          </>
        )}
      </div>

      {/* Subscriber Table */}
      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : subscribers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <UserPlus className="mb-3 size-10 opacity-20" />
            <p className="text-sm">
              {searchQuery || statusFilter || sourceFilter
                ? "No subscribers match your filters"
                : "No subscribers yet"}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === subscribers.length && subscribers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(sub.id)}
                        onChange={() => toggleSelect(sub.id)}
                        className="rounded border-border"
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {sub.email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.name || "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={sub.status}
                        onValueChange={(v) => handleStatusChange(sub.id, v)}
                      >
                        <SelectTrigger className="h-6 w-auto border-0 bg-transparent p-0 pr-6 text-[10px] shadow-none focus:ring-0">
                          <Badge
                            variant="secondary"
                            className={`${STATUS_COLORS[sub.status] || "bg-gray-100 text-gray-500"} text-[10px] cursor-pointer`}
                          >
                            {sub.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                          <SelectItem value="bounced">Bounced</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`${SOURCE_COLORS[sub.source] || "bg-gray-100 text-gray-500"} text-[10px]`}
                      >
                        {sub.source.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sub.tags && sub.tags.length > 0 ? (
                          sub.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0"
                            >
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(sub.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="px-2 text-xs text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* === Add Subscriber Dialog === */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Add Subscriber
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input
                placeholder="user@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Name <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="Full name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Tags <span className="text-muted-foreground font-normal">(comma-separated)</span>
              </label>
              <Input
                placeholder="newsletter, beta"
                value={addTags}
                onChange={(e) => setAddTags(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={adding}>
                {adding && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                {adding ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* === CSV Upload Dialog === */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="size-5" />
              CSV Import Preview
            </DialogTitle>
            <DialogDescription>
              {csvFileName} - {csvRows.length} rows found
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="max-h-64 overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvRows.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell className="text-sm">{row.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.name || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {csvRows.length > 50 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                        ... and {csvRows.length - 50} more rows
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCsvOpen(false);
                  setCsvRows([]);
                }}
              >
                <X className="mr-1.5 size-4" />
                Cancel
              </Button>
              <Button onClick={handleCsvUpload} disabled={csvUploading}>
                {csvUploading ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 size-4" />
                )}
                {csvUploading
                  ? "Importing..."
                  : `Import ${csvRows.length} Subscribers`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Bulk Tag Dialog === */}
      <Dialog open={tagOpen} onOpenChange={setTagOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Tag to {selected.size} Subscribers</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Tag name"
              value={bulkTag}
              onChange={(e) => setBulkTag(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTagOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkTag} disabled={tagging || !bulkTag.trim()}>
                {tagging && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                {tagging ? "Adding..." : "Add Tag"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card helper
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`size-4 ${color}`} />
        <span className="text-[11px] text-muted-foreground capitalize">{label}</span>
      </div>
      <p className="text-xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
