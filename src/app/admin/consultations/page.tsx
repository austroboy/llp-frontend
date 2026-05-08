"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { ConsultationDetailDialog } from "@/components/admin/consultations/consultation-detail-dialog";

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

const statusColors: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  reviewed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  connected: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  urgent: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  normal: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

type StatusFilter = "all" | "pending" | "reviewed" | "connected" | "completed";

export default function AdminConsultationsPage() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedRequest, setSelectedRequest] = useState<Doc<"consultationRequests"> | null>(null);

  const requests = useQuery(
    api.consultationRequests.list,
    statusFilter === "all" ? {} : { status: statusFilter }
  );

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
            <span className="lf-kicker-mark">§ 3</span>
            Admin · Consultation Queue
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
            Triage the{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
              expert intake.
            </em>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="lf-section-deck"
            style={{ maxWidth: 640, fontStyle: "italic" }}
          >
            Pending consultation requests from members and visitors — connect
            each to the right expert, mark progress, and close out completed
            cases.
          </motion.p>
        </motion.section>

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
                <TabsTrigger value="connected">{t("admin.filter.connected")}</TabsTrigger>
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
                {t("admin.empty.requests")}
              </div>
            ) : (
              <>
                {/* Mobile: card list */}
                <div
                  className="sm:hidden p-3.5"
                  style={{ borderColor: "var(--line-1)" }}
                >
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
                            onClick={() => setSelectedRequest(req)}
                            className="text-left min-w-0"
                          >
                            <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--ink)" }}>{req.requesterName}</p>
                          </button>
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-4)" }}>{req.requesterEmail}</p>
                          {req.expertArea && (
                            <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-4)" }}>{req.expertArea}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={cn("text-[10px] px-1.5 py-0", statusColors[req.status])}
                            >
                              {req.status}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={cn("text-[10px] px-1.5 py-0", statusColors[req.urgency])}
                            >
                              {req.urgency}
                            </Badge>
                            <span className="text-[10px]" style={{ color: "var(--ink-4)" }}>
                              {new Date(req.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          onClick={() => setSelectedRequest(req)}
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
                      <TableHead>{t("admin.table.name")}</TableHead>
                      <TableHead>{t("admin.table.email")}</TableHead>
                      <TableHead>{t("admin.table.area")}</TableHead>
                      <TableHead>{t("admin.table.urgency")}</TableHead>
                      <TableHead>{t("admin.table.status")}</TableHead>
                      <TableHead>{t("admin.table.date")}</TableHead>
                      <TableHead className="text-right">{t("admin.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req._id}>
                        <TableCell className="font-medium text-sm">
                          {req.requesterName}
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "var(--ink-4)" }}>
                          {req.requesterEmail}
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "var(--ink-4)" }}>
                          {req.expertArea}
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
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "var(--ink-4)" }}>
                          {new Date(req.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setSelectedRequest(req)}
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
        </motion.section>

        {selectedRequest && (
          <ConsultationDetailDialog
            open={!!selectedRequest}
            onOpenChange={(open) => !open && setSelectedRequest(null)}
            request={selectedRequest}
          />
        )}
      </div>
    </MotionConfig>
  );
}
