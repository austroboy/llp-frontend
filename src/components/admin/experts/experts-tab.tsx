"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Plus, Pencil, Star, Search, Trash2, ChevronDown } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fireNotification } from "@/lib/notify";
import { ExpertEditor } from "./expert-editor";

const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  draft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const availabilityColors: Record<string, string> = {
  available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  busy: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  on_leave: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

type StatusFilter = "all" | "draft" | "published" | "archived";

export function ExpertsTab() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"experts"> | undefined>(undefined);

  const experts = useQuery(
    api.experts.list,
    statusFilter === "all" ? {} : { status: statusFilter }
  );
  const updateExpert = useMutation(api.experts.update);
  const removeExpert = useMutation(api.experts.remove);

  const filtered = experts?.filter((e) =>
    search
      ? e.name.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const handleEdit = (id: Id<"experts">) => {
    setEditId(id);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setEditId(undefined);
    setEditorOpen(true);
  };

  const handleStatusChange = async (id: Id<"experts">, status: "draft" | "published" | "archived") => {
    try {
      const expert = experts?.find((e) => e._id === id);
      await updateExpert({ id, status });
      if (status === "published" && expert?.email) {
        fireNotification("expert_profile_published", {
          expertName: expert.name,
          expertEmail: expert.email,
        });
      }
      toast.success(`Status changed to ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleToggleFeatured = async (id: Id<"experts">, current: boolean) => {
    try {
      await updateExpert({ id, isFeatured: !current });
      toast.success(!current ? "Expert featured" : "Expert unfeatured");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: Id<"experts">, name: string) => {
    if (!confirm(`Delete expert "${name}"? This cannot be undone.`)) return;
    try {
      await removeExpert({ id });
      toast.success("Expert deleted");
    } catch {
      toast.error("Failed to delete expert");
    }
  };

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
        <Button onClick={handleNew} className="rounded-full shrink-0 text-xs sm:text-sm h-8 sm:h-9">
          <Plus className="size-3.5 sm:size-4 mr-1 sm:mr-1.5" />
          <span className="hidden sm:inline">{t("admin.experts.addExpert")}</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">{t("admin.filter.all")}</TabsTrigger>
            <TabsTrigger value="draft">{t("admin.filter.draft")}</TabsTrigger>
            <TabsTrigger value="published">{t("admin.filter.published")}</TabsTrigger>
            <TabsTrigger value="archived">{t("admin.filter.archived")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-xl sm:rounded-2xl border border-border bg-card">
        {!filtered ? (
          <div className="p-3.5 sm:p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-2.5 w-2/3" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t("admin.experts.noExperts")}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-border/50 sm:hidden p-3.5">
              {filtered.map((expert) => (
                <div key={expert._id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-2.5">
                    {/* Avatar */}
                    {expert.profilePhotoUrl ? (
                      <img
                        src={expert.profilePhotoUrl}
                        alt={expert.name}
                        className="size-9 rounded-full object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {expert.initials}
                      </div>
                    )}
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEdit(expert._id)}
                          className="text-left min-w-0"
                        >
                          <p className="text-[13px] font-medium leading-snug">{expert.name}</p>
                        </button>
                        <button
                          onClick={() => handleToggleFeatured(expert._id, expert.isFeatured)}
                          className="shrink-0"
                        >
                          <Star
                            className={cn(
                              "size-3.5",
                              expert.isFeatured
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                            )}
                          />
                        </button>
                      </div>
                      {expert.designation && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{expert.designation}</p>
                      )}
                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-0.5 cursor-pointer">
                              <Badge
                                variant="secondary"
                                className={cn("text-[10px] px-1.5 py-0", statusColors[expert.status])}
                              >
                                {t(`admin.experts.status.${expert.status}`)}
                                <ChevronDown className="size-2.5 ml-0.5" />
                              </Badge>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["draft", "published", "archived"] as const).map((s) => (
                              <DropdownMenuItem
                                key={s}
                                disabled={s === expert.status}
                                onClick={() => handleStatusChange(expert._id, s)}
                              >
                                <Badge
                                  variant="secondary"
                                  className={cn("text-[11px] mr-2", statusColors[s])}
                                >
                                  {t(`admin.experts.status.${s}`)}
                                </Badge>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] px-1.5 py-0", availabilityColors[expert.availabilityStatus])}
                        >
                          {t(`admin.experts.availability.${expert.availabilityStatus}`)}
                        </Badge>
                        {expert.skills.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {expert.skills.length} skills
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleEdit(expert._id)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => handleDelete(expert._id, expert.name)}
                      >
                        <Trash2 className="size-3" />
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
                  <TableHead>{t("admin.experts.table.name")}</TableHead>
                  <TableHead>{t("admin.experts.table.designation")}</TableHead>
                  <TableHead>{t("admin.experts.table.skills")}</TableHead>
                  <TableHead>{t("admin.experts.table.status")}</TableHead>
                  <TableHead>{t("admin.experts.table.availability")}</TableHead>
                  <TableHead>{t("admin.experts.table.featured")}</TableHead>
                  <TableHead className="text-right">{t("admin.experts.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((expert) => (
                  <TableRow key={expert._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {expert.profilePhotoUrl ? (
                          <img
                            src={expert.profilePhotoUrl}
                            alt={expert.name}
                            className="size-8 rounded-full object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {expert.initials}
                          </div>
                        )}
                        <span className="font-medium truncate max-w-[180px]">
                          {expert.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                      {expert.designation}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        {expert.skills.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1 cursor-pointer">
                            <Badge
                              variant="secondary"
                              className={cn("text-[11px]", statusColors[expert.status])}
                            >
                              {t(`admin.experts.status.${expert.status}`)}
                              <ChevronDown className="size-3 ml-0.5" />
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {(["draft", "published", "archived"] as const).map((s) => (
                            <DropdownMenuItem
                              key={s}
                              disabled={s === expert.status}
                              onClick={() => handleStatusChange(expert._id, s)}
                            >
                              <Badge
                                variant="secondary"
                                className={cn("text-[11px] mr-2", statusColors[s])}
                              >
                                {t(`admin.experts.status.${s}`)}
                              </Badge>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("text-[11px]", availabilityColors[expert.availabilityStatus])}
                      >
                        {t(`admin.experts.availability.${expert.availabilityStatus}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleFeatured(expert._id, expert.isFeatured)}
                        className="cursor-pointer hover:scale-110 transition-transform"
                      >
                        <Star
                          className={cn(
                            "size-4",
                            expert.isFeatured
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30 hover:text-yellow-400/50"
                          )}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleEdit(expert._id)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(expert._id, expert.name)}
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

      <ExpertEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editId={editId}
      />
    </div>
  );
}
