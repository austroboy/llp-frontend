"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Newspaper,
  UserCheck,
  Search as SearchIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { fireNotification } from "@/lib/notify";
import { ApplicationReview } from "@/components/admin/experts/application-review";
import { motion, MotionConfig, type Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};
const inViewOnce = { once: true, margin: "-72px 0px" } as const;

// --- Types ---

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type TypeFilter = "all" | "blog_post" | "expert_application";

type UnifiedApprovalItem = {
  id: string;
  type: "blog_post" | "expert_application";
  title: string;
  requesterName: string;
  status: "pending" | "under_review" | "approved" | "rejected";
  createdAt: number;
  sourceData: any;
};

// --- Constants ---

const statusColors: Record<string, string> = {
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  under_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const typeIcons: Record<string, typeof Newspaper> = {
  blog_post: Newspaper,
  expert_application: UserCheck,
};

// --- Component ---

export default function AdminApprovalsPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // Blog post approval dialog state
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [processing, setProcessing] = useState(false);

  // Expert application review dialog state
  const [reviewApplicationId, setReviewApplicationId] = useState<Id<"expertApplications"> | null>(null);

  // --- Queries ---
  const approvalRequests = useQuery(
    api.approvalRequests.list,
    statusFilter === "all" ? {} : { status: statusFilter }
  );

  const expertApplications = useQuery(
    api.expertApplications.listForApprovals,
    statusFilter === "all" ? {} : { status: statusFilter }
  );

  // Blog post approval mutations
  const approveMutation = useMutation(api.approvalRequests.approve);
  const rejectMutation = useMutation(api.approvalRequests.reject);
  const removeApprovalMutation = useMutation(api.approvalRequests.remove);
  const removeApplicationMutation = useMutation(api.expertApplications.remove);

  // --- Loading state: wait for both queries ---
  const isLoading = approvalRequests === undefined || expertApplications === undefined;

  // --- Normalize and merge ---
  const unifiedItems: UnifiedApprovalItem[] = [];

  if (approvalRequests) {
    for (const req of approvalRequests) {
      unifiedItems.push({
        id: req._id,
        type: "blog_post",
        title: req.title,
        requesterName: req.requesterName,
        status: req.status as "pending" | "approved" | "rejected",
        createdAt: req.createdAt,
        sourceData: req,
      });
    }
  }

  if (expertApplications) {
    for (const app of expertApplications) {
      unifiedItems.push({
        id: app._id,
        type: "expert_application",
        title: `${t("admin.approvals.expertApplication")}: ${app.name}`,
        requesterName: app.name,
        status: app.status === "submitted" ? "pending" : (app.status as "under_review" | "approved" | "rejected"),
        createdAt: app._creationTime,
        sourceData: app,
      });
    }
  }

  // Apply type filter
  const filteredItems = typeFilter === "all"
    ? unifiedItems
    : unifiedItems.filter((item) => item.type === typeFilter);

  // Sort by date descending
  filteredItems.sort((a, b) => b.createdAt - a.createdAt);

  // --- Blog post actions ---
  const handleApprove = async (id: Id<"approvalRequests">) => {
    if (!user) return;
    setProcessing(true);
    try {
      await approveMutation({
        id,
        reviewedBy: user.id,
        reviewerName: user.fullName ?? "Admin",
        reviewNote: reviewNote || undefined,
      });
      // Notify requester about approval
      if (selectedRequest) {
        fireNotification("blog_post_published", {
          authorName: selectedRequest.requesterName,
          authorEmail: "",
          postTitle: selectedRequest.title,
          slug: "",
        });
      }
      setSelectedRequest(null);
      setReviewNote("");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: Id<"approvalRequests">) => {
    if (!user) return;
    setProcessing(true);
    try {
      await rejectMutation({
        id,
        reviewedBy: user.id,
        reviewerName: user.fullName ?? "Admin",
        reviewNote: reviewNote || undefined,
      });
      // Notify requester about rejection
      if (selectedRequest) {
        fireNotification("consultation_status_updated", {
          requesterName: selectedRequest.requesterName,
          requesterEmail: "",
          expertArea: selectedRequest.title,
          newStatus: "rejected",
          adminNotes: reviewNote || undefined,
        });
      }
      setSelectedRequest(null);
      setReviewNote("");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (item: UnifiedApprovalItem) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      if (item.type === "blog_post") {
        await removeApprovalMutation({ id: item.sourceData._id });
      } else {
        await removeApplicationMutation({ id: item.sourceData._id });
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // --- Empty state message ---
  const getEmptyMessage = () => {
    if (typeFilter === "blog_post") return t("admin.approvals.empty.blogPost");
    if (typeFilter === "expert_application") return t("admin.approvals.empty.expertApplication");
    return t("admin.approvals.empty");
  };

  // --- Status label ---
  const getStatusLabel = (status: string) => {
    if (status === "under_review") return t("admin.approvals.status.underReview");
    return t(`admin.approvals.${status}`);
  };

  const pendingCount = unifiedItems.filter((i) => i.status === "pending").length;

  return (
    <MotionConfig reducedMotion="user">
      {/* -- Hero ------------------------------------------------ */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-5)" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "var(--s-4)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <motion.div variants={fadeUp} className="lf-kicker">
              <span className="lf-kicker-mark">§ 1.2</span>
              Admin · Approvals
            </motion.div>
            <motion.h1
              variants={fadeUp}
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: "clamp(32px, 4.4vw, 48px)",
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                margin: "var(--s-3) 0 var(--s-3)",
              }}
            >
              Filings <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>awaiting seal.</em>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="lf-section-deck"
              style={{ maxWidth: "60ch" }}
            >
              Blog posts and expert applications routed for sign-off. Approve to countersign, reject to return to drafter.
            </motion.p>
          </div>
          {pendingCount > 0 && (
            <motion.span
              variants={fadeUp}
              className="lf-status lf-status--busy"
              style={{ alignSelf: "center" }}
            >
              <span className="lf-status-dot" />
              Pending Review · {pendingCount}
            </motion.span>
          )}
        </div>
      </motion.section>

      {/* Filters row */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="flex flex-col sm:flex-row sm:items-center gap-3"
        style={{ marginBottom: "var(--s-4)" }}
      >
        {/* Status filter tabs */}
        <div className="-mx-4 px-4 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible flex-1">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="pending">{t("admin.approvals.pending")}</TabsTrigger>
              <TabsTrigger value="approved">{t("admin.approvals.approved")}</TabsTrigger>
              <TabsTrigger value="rejected">{t("admin.approvals.rejected")}</TabsTrigger>
              <TabsTrigger value="all">{t("admin.filter.all")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Type filter dropdown */}
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-full sm:w-[200px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.approvals.typeFilter.all")}</SelectItem>
            <SelectItem value="blog_post">{t("admin.approvals.typeFilter.blogPost")}</SelectItem>
            <SelectItem value="expert_application">{t("admin.approvals.typeFilter.expertApplication")}</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Content */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="lf-card"
        style={{ padding: 0, overflow: "hidden", marginBottom: "var(--s-5)" }}
      >
        {isLoading ? (
          <div className="p-3.5 sm:p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <Skeleton className="size-4 rounded shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {getEmptyMessage()}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-border/50 sm:hidden p-3.5">
              {filteredItems.map((item) => {
                const TypeIcon = typeIcons[item.type] ?? Newspaper;
                return (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-2.5">
                      <TypeIcon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => {
                            if (item.type === "expert_application") {
                              setReviewApplicationId(item.sourceData._id);
                            } else {
                              setSelectedRequest(item.sourceData);
                              setReviewNote("");
                            }
                          }}
                          className="text-left min-w-0"
                        >
                          <p className="text-[13px] font-medium leading-snug">{item.title}</p>
                        </button>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.requesterName} &middot; {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px] px-1.5 py-0", statusColors[item.status])}
                          >
                            {item.status === "pending" && <Clock className="size-2.5 mr-0.5" />}
                            {item.status === "under_review" && <SearchIcon className="size-2.5 mr-0.5" />}
                            {item.status === "approved" && <CheckCircle2 className="size-2.5 mr-0.5" />}
                            {item.status === "rejected" && <XCircle className="size-2.5 mr-0.5" />}
                            {getStatusLabel(item.status)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {item.type.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            if (item.type === "expert_application") {
                              setReviewApplicationId(item.sourceData._id);
                            } else {
                              setSelectedRequest(item.sourceData);
                              setReviewNote("");
                            }
                          }}
                        >
                          <Eye className="size-3" />
                        </Button>
                        {/* Blog posts get inline approve/reject; expert apps do not */}
                        {item.type === "blog_post" && item.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-green-600"
                              onClick={() => handleApprove(item.sourceData._id)}
                            >
                              <CheckCircle2 className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive"
                              onClick={() => handleReject(item.sourceData._id)}
                            >
                              <XCircle className="size-3" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.approvals.type")}</TableHead>
                  <TableHead>{t("admin.table.title")}</TableHead>
                  <TableHead>{t("admin.approvals.requestedBy")}</TableHead>
                  <TableHead>{t("admin.table.status")}</TableHead>
                  <TableHead>{t("admin.table.date")}</TableHead>
                  <TableHead className="text-right">{t("admin.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const TypeIcon = typeIcons[item.type] ?? Newspaper;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="size-4 text-muted-foreground" />
                          <span className="text-sm capitalize">{item.type.replace(/_/g, " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {item.title}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.requesterName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("text-[11px]", statusColors[item.status])}
                        >
                          {item.status === "pending" && <Clock className="size-3 mr-1" />}
                          {item.status === "under_review" && <SearchIcon className="size-3 mr-1" />}
                          {item.status === "approved" && <CheckCircle2 className="size-3 mr-1" />}
                          {item.status === "rejected" && <XCircle className="size-3 mr-1" />}
                          {getStatusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              if (item.type === "expert_application") {
                                setReviewApplicationId(item.sourceData._id);
                              } else {
                                setSelectedRequest(item.sourceData);
                                setReviewNote("");
                              }
                            }}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          {/* Blog posts get inline approve/reject; expert apps do not */}
                          {item.type === "blog_post" && item.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-green-600 hover:text-green-700"
                                onClick={() => handleApprove(item.sourceData._id)}
                              >
                                <CheckCircle2 className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive"
                                onClick={() => handleReject(item.sourceData._id)}
                              >
                                <XCircle className="size-3.5" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </motion.div>

      {/* Blog post detail / review dialog (existing) */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("admin.approvals.reviewRequest")}</DialogTitle>
              <DialogDescription>
                {selectedRequest.type.replace("_", " ")} — {selectedRequest.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.approvals.requestedBy")}</span>
                  <span className="font-medium">{selectedRequest.requesterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.table.date")}</span>
                  <span>{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.table.status")}</span>
                  <Badge variant="secondary" className={cn("text-[11px]", statusColors[selectedRequest.status])}>
                    {t(`admin.approvals.${selectedRequest.status}`)}
                  </Badge>
                </div>
                {selectedRequest.reviewerName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("admin.approvals.reviewedBy")}</span>
                    <span>{selectedRequest.reviewerName}</span>
                  </div>
                )}
                {selectedRequest.reviewNote && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground text-xs">{t("admin.approvals.note")}</span>
                    <p className="mt-1">{selectedRequest.reviewNote}</p>
                  </div>
                )}
              </div>

              {selectedRequest.type === "blog_post" && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href="/admin/blog" target="_blank" rel="noopener noreferrer">
                    <Eye className="size-4 mr-1.5" />
                    {t("admin.approvals.viewContent")}
                  </a>
                </Button>
              )}

              {selectedRequest.status === "pending" && (
                <>
                  <div>
                    <Label>{t("admin.approvals.note")}</Label>
                    <Textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder={t("admin.approvals.notePlaceholder")}
                      rows={3}
                      className="mt-1.5"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleApprove(selectedRequest._id)}
                      disabled={processing}
                    >
                      <CheckCircle2 className="size-4 mr-1.5" />
                      {t("admin.approvals.approve")}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleReject(selectedRequest._id)}
                      disabled={processing}
                    >
                      <XCircle className="size-4 mr-1.5" />
                      {t("admin.approvals.reject")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Expert application review dialog (reused from admin/experts) */}
      {reviewApplicationId && (
        <ApplicationReview
          applicationId={reviewApplicationId}
          open={!!reviewApplicationId}
          onOpenChange={(open) => {
            if (!open) setReviewApplicationId(null);
          }}
        />
      )}
    </MotionConfig>
  );
}
