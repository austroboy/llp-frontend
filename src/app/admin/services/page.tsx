"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Doc } from "@convex/_generated/dataModel";
import { Plus, Pencil, Trash2, Eye, Check, X as XIcon, MoreHorizontal } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { ServiceDialog } from "@/components/admin/services/service-dialog";
import { ServiceRequestDetailDialog } from "@/components/admin/services/service-request-detail-dialog";

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

const categoryLabels: Record<string, string> = {
  expatriate: "Expatriate & Visa",
  hr: "HR Services",
  licensing: "Licensing & Regulatory",
};

const statusColors: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  reviewed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  urgent: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  normal: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

type StatusFilter = "all" | "pending" | "reviewed" | "in_progress" | "completed";

export default function AdminServicesPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "requests" ? "requests" : "services";

  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab from URL on navigation
  useEffect(() => {
    const tab = searchParams.get("tab") === "requests" ? "requests" : "services";
    setActiveTab(tab);
  }, [searchParams]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-5xl space-y-3 sm:space-y-6">
        {/* -- Hero ------------------------------------------------ */}
        <motion.section
          variants={heroStagger}
          initial="hidden"
          animate="show"
          style={{ paddingBottom: "var(--s-4)" }}
        >
          <motion.div variants={fadeUp} className="lf-kicker">
            <span className="lf-kicker-mark">§ 2</span>
            Admin · Service Catalogue
          </motion.div>
          <motion.h1
            variants={fadeUp}
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: "clamp(32px, 4.5vw, 48px)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              margin: "var(--s-3) 0 var(--s-3)",
            }}
          >
            Wire the{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
              service shelf.
            </em>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="lf-section-deck"
            style={{ maxWidth: 640, fontStyle: "italic" }}
          >
            Maintain the public service offering — pricing, visibility, and
            sort — and triage incoming service requests against the live
            catalogue.
          </motion.p>
        </motion.section>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="-mx-4 px-4 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="services">{t("admin.services.tabServices")}</TabsTrigger>
              <TabsTrigger value="requests">{t("admin.services.tabRequests")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {activeTab === "services" ? <ServicesTab /> : <RequestsTab />}
      </div>
    </MotionConfig>
  );
}

/* ================================================================== */
/*  Services Tab                                                       */
/* ================================================================== */
function ServicesTab() {
  const { t } = useLanguage();
  const services = useQuery(api.serviceProducts.list);
  const toggleActive = useMutation(api.serviceProducts.toggleActive);
  const removeService = useMutation(api.serviceProducts.remove);
  const updateService = useMutation(api.serviceProducts.update);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"serviceProducts"> | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<Id<"serviceProducts"> | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  // Delete-confirmation target — null when no dialog open
  const [deleteTarget, setDeleteTarget] = useState<Doc<"serviceProducts"> | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await removeService({ id: deleteTarget._id });
    setDeleteTarget(null);
  };

  const handlePriceEdit = (id: Id<"serviceProducts">, currentPrice: string) => {
    setEditingPriceId(id);
    setEditingPriceValue(currentPrice);
  };

  const handlePriceSave = async () => {
    if (editingPriceId) {
      await updateService({ id: editingPriceId, price: editingPriceValue || undefined });
      setEditingPriceId(null);
    }
  };

  const handlePriceCancel = () => {
    setEditingPriceId(null);
    setEditingPriceValue("");
  };

  const handleEdit = (id: Id<"serviceProducts">) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setDialogOpen(true);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        <motion.div variants={fadeUp} className="flex items-center justify-end" style={{ marginBottom: "var(--s-4)" }}>
          <Button onClick={handleNew} className="rounded-full shrink-0 text-xs sm:text-sm h-8 sm:h-9">
            <Plus className="size-3.5 sm:size-4 mr-1 sm:mr-1.5" />
            <span className="hidden sm:inline">{t("admin.services.addService")}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </motion.div>

        <motion.div variants={fadeUp} className="lf-card lf-card--hover" style={{ padding: 0, overflow: "hidden" }}>
          {!services ? (
            <div className="p-3.5 sm:p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: "var(--ink-4)" }}>
              {t("admin.empty.services")}
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="sm:hidden p-3.5">
                {services.map((service, idx) => (
                  <div
                    key={service._id}
                    className="py-3 first:pt-0 last:pb-0"
                    style={{
                      borderTop: idx === 0 ? "none" : "1px solid var(--line-1)",
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => handleEdit(service._id)}
                          className="text-left"
                        >
                          <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--ink)" }}>{service.title}</p>
                        </button>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {categoryLabels[service.category] ?? service.category}
                          </Badge>
                          {service.icon && (
                            <span className="text-[10px]" style={{ color: "var(--ink-4)" }}>{service.icon}</span>
                          )}
                          {service.price && (
                            <span className="text-[10px] font-medium" style={{ color: "var(--emerald)" }}>
                              {service.price}
                            </span>
                          )}
                          <span className="text-[10px]" style={{ color: "var(--ink-4)" }}>
                            #{service.sortOrder}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleActive({ id: service._id })}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                            service.isActive ? "bg-primary" : "bg-muted"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block size-3.5 rounded-full bg-white transition-transform",
                              service.isActive ? "translate-x-4.5" : "translate-x-1"
                            )}
                          />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7">
                              <MoreHorizontal className="size-3.5" />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(service._id)}>
                              <Pencil className="size-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTarget(service)}
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <Table className="hidden sm:table table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.table.title")}</TableHead>
                    <TableHead className="w-32">{t("admin.table.category")}</TableHead>
                    <TableHead className="w-28">{t("admin.table.icon")}</TableHead>
                    <TableHead className="w-28">Price</TableHead>
                    <TableHead className="w-16">{t("admin.table.sortOrder")}</TableHead>
                    <TableHead className="w-16">{t("admin.table.active")}</TableHead>
                    <TableHead className="w-20 text-right">{t("admin.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service._id}>
                      <TableCell className="font-medium">
                        {service.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px]">
                          {categoryLabels[service.category] ?? service.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "var(--ink-4)" }}>
                        {service.icon}
                      </TableCell>
                      <TableCell className="overflow-hidden">
                        {editingPriceId === service._id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingPriceValue}
                              onChange={(e) => setEditingPriceValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handlePriceSave();
                                if (e.key === "Escape") handlePriceCancel();
                              }}
                              className="h-7 w-24 text-xs"
                              placeholder="e.g. ৳5,000"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-green-600"
                              onClick={handlePriceSave}
                            >
                              <Check className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              onClick={handlePriceCancel}
                            >
                              <XIcon className="size-3" />
                            </Button>
                          </div>
                        ) : (
                          // truncate + tooltip — long values like
                          // "100% of candidate monthly salary" overflowed into
                          // the Active column on narrow widths.
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handlePriceEdit(service._id, service.price ?? "")}
                                className="block w-full max-w-[7rem] truncate text-left text-sm hover:underline underline-offset-2 cursor-pointer"
                                style={{ color: "var(--ink-4)" }}
                              >
                                {service.price || "Set price"}
                              </button>
                            </TooltipTrigger>
                            {service.price && (
                              <TooltipContent side="top" className="max-w-xs">
                                {service.price}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "var(--ink-4)" }}>
                        {service.sortOrder}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleActive({ id: service._id })}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                            service.isActive ? "bg-primary" : "bg-muted"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block size-3.5 rounded-full bg-white transition-transform",
                              service.isActive ? "translate-x-4.5" : "translate-x-1"
                            )}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(service._id)}>
                              <Pencil className="size-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTarget(service)}
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </motion.div>
      </motion.section>

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editId={editingId}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  <span className="font-medium text-foreground">
                    {deleteTarget.title}
                  </span>{" "}
                  will be permanently removed from the catalog. This action
                  cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

/* ================================================================== */
/*  Requests Tab                                                       */
/* ================================================================== */
function RequestsTab() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const requests = useQuery(
    api.serviceRequests.list,
    statusFilter === "all" ? {} : { status: statusFilter }
  );

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inViewOnce}
    >
      <motion.div
        variants={fadeUp}
        className="-mx-4 px-4 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible"
        style={{ marginBottom: "var(--s-4)" }}
      >
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">{t("admin.filter.all")}</TabsTrigger>
            <TabsTrigger value="pending">{t("admin.filter.pending")}</TabsTrigger>
            <TabsTrigger value="reviewed">{t("admin.filter.reviewed")}</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">{t("admin.filter.completed")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      <motion.div variants={fadeUp} className="lf-card lf-card--hover" style={{ padding: 0, overflow: "hidden" }}>
        {!requests ? (
          <div className="p-3.5 sm:p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--ink-4)" }}>
            No service requests found.
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden p-3.5">
              {requests.map((req, idx) => (
                <div
                  key={req._id}
                  className="py-3 first:pt-0 last:pb-0"
                  style={{
                    borderTop: idx === 0 ? "none" : "1px solid var(--line-1)",
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => setSelectedRequestId(req._id)}
                        className="text-left min-w-0"
                      >
                        {req.orderNumber && (
                          <span className="font-mono text-[11px] font-bold" style={{ color: "var(--ink-4)" }}>{req.orderNumber}</span>
                        )}
                        <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--ink)" }}>{req.serviceTitle}</p>
                      </button>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-4)" }}>
                        {req.requesterName}{req.requesterCompany ? ` — ${req.requesterCompany}` : ""}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] px-1.5 py-0", statusColors[req.status])}
                        >
                          {req.status.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] px-1.5 py-0", statusColors[req.urgency])}
                        >
                          {req.urgency}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {categoryLabels[req.serviceCategory] ?? req.serviceCategory}
                        </Badge>
                        <span className="text-[10px]" style={{ color: "var(--ink-4)" }}>
                          {new Date(req._creationTime).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => setSelectedRequestId(req._id)}
                    >
                      <Eye className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.services.orderNumber")}</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>{t("admin.table.urgency")}</TableHead>
                  <TableHead>{t("admin.table.status")}</TableHead>
                  <TableHead>{t("admin.table.date")}</TableHead>
                  <TableHead className="text-right">{t("admin.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req._id}>
                    <TableCell>
                      <span className="font-mono font-bold text-sm">{req.orderNumber || "—"}</span>
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">
                      {req.serviceTitle}
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: "var(--ink-4)" }}>
                      {req.requesterName}
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: "var(--ink-4)" }}>
                      {req.requesterCompany || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        {categoryLabels[req.serviceCategory] ?? req.serviceCategory}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("text-[11px]", statusColors[req.urgency])}
                      >
                        {req.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("text-[11px]", statusColors[req.status])}
                      >
                        {req.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: "var(--ink-4)" }}>
                      {new Date(req._creationTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setSelectedRequestId(req._id)}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </motion.div>

      {selectedRequestId && requests && (() => {
        const liveRequest = requests.find((r) => r._id === selectedRequestId);
        if (!liveRequest) return null;
        return (
          <ServiceRequestDetailDialog
            open
            onOpenChange={(open) => !open && setSelectedRequestId(null)}
            request={liveRequest}
          />
        );
      })()}
    </motion.section>
  );
}
