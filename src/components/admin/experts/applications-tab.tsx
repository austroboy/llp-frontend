"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Search, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { ApplicationReview } from "./application-review";

const statusColors: Record<string, string> = {
  submitted:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  under_review:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  draft:
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

type StatusFilter = "all" | "submitted" | "under_review" | "approved" | "rejected";

export function ApplicationsTab() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewId, setReviewId] = useState<Id<"expertApplications"> | null>(
    null
  );
  const [selected, setSelected] = useState<Set<Id<"expertApplications">>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const removeApplication = useMutation(api.expertApplications.remove);

  const applications = useQuery(
    api.expertApplications.list,
    statusFilter === "all" ? {} : { status: statusFilter }
  );

  const filtered = applications?.filter((a) =>
    search
      ? a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.organization?.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const toggleSelect = (id: Id<"expertApplications">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filtered) return;
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a._id)));
    }
  };

  const handleDelete = async (id: Id<"expertApplications">, name: string) => {
    if (!confirm(`Delete application from "${name}"? This cannot be undone.`)) return;
    try {
      await removeApplication({ id });
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("Application deleted");
    } catch {
      toast.error("Failed to delete application");
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} application(s)? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) => removeApplication({ id }))
      );
      toast.success(`${selected.size} application(s) deleted`);
      setSelected(new Set());
    } catch {
      toast.error("Failed to delete some applications");
    } finally {
      setDeleting(false);
    }
  };

  const handleReview = (id: Id<"expertApplications">) => {
    setReviewId(id);
    setReviewOpen(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const allSelected = filtered && filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.experts.table.name") + "..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={deleting}
            className="gap-1.5 shrink-0"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">Delete</span> ({selected.size})
          </Button>
        )}
      </div>

      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as StatusFilter);
            setSelected(new Set());
          }}
        >
          <TabsList>
            <TabsTrigger value="all">{t("admin.filter.all")}</TabsTrigger>
            <TabsTrigger value="submitted">
              {t("admin.applications.status.submitted")}
            </TabsTrigger>
            <TabsTrigger value="under_review">
              {t("admin.applications.status.under_review")}
            </TabsTrigger>
            <TabsTrigger value="approved">
              {t("admin.applications.status.approved")}
            </TabsTrigger>
            <TabsTrigger value="rejected">
              {t("admin.applications.status.rejected")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-xl sm:rounded-2xl border border-border bg-card">
        {!filtered ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t("admin.loading")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t("admin.experts.noApplications")}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-border/50 sm:hidden p-3.5">
              {filtered.map((app) => (
                <div key={app._id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(app._id)}
                      onChange={() => toggleSelect(app._id)}
                      className="mt-1.5 size-4 shrink-0 rounded border-border accent-primary cursor-pointer"
                    />
                    {app.profilePhotoUrl ? (
                      <Image
                        src={app.profilePhotoUrl}
                        alt={app.name}
                        width={36}
                        height={36}
                        className="size-9 rounded-full object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {app.name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug">{app.name}</p>
                      {app.organization && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{app.organization}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] px-1.5 py-0", statusColors[app.status])}
                        >
                          {t(`admin.applications.status.${app.status}`)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {app.skills.length} skills
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(app._creationTime)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => handleReview(app._id)}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(app._id, app.name)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={!!allSelected}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-border accent-primary cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>{t("admin.experts.table.name")}</TableHead>
                  <TableHead>
                    {t("admin.experts.table.organization")}
                  </TableHead>
                  <TableHead>{t("admin.experts.table.skills")}</TableHead>
                  <TableHead>{t("admin.experts.table.status")}</TableHead>
                  <TableHead>{t("admin.experts.table.submitted")}</TableHead>
                  <TableHead className="text-right">
                    {t("admin.experts.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((app) => (
                  <TableRow
                    key={app._id}
                    className={cn(selected.has(app._id) && "bg-muted/50")}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(app._id)}
                        onChange={() => toggleSelect(app._id)}
                        className="size-4 rounded border-border accent-primary cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {app.profilePhotoUrl ? (
                          <Image
                            src={app.profilePhotoUrl}
                            alt={app.name}
                            width={32}
                            height={32}
                            className="size-8 rounded-full object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {app.name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[200px]">
                            {app.name}
                          </span>
                          {app.email && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {app.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                      {app.organization || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        {app.skills.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[11px]",
                          statusColors[app.status]
                        )}
                      >
                        {t(`admin.applications.status.${app.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(app._creationTime)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleReview(app._id)}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(app._id, app.name)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {reviewId && (
        <ApplicationReview
          applicationId={reviewId}
          open={reviewOpen}
          onOpenChange={(open) => {
            setReviewOpen(open);
            if (!open) setReviewId(null);
          }}
        />
      )}
    </div>
  );
}
