"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import {
  Newspaper,
  Briefcase,
  MessageSquare,
  Users,
  Plus,
  ArrowRight,
  UserCheck,
  FileText,
  HelpCircle,
  ClipboardList,
  Radar,
  Inbox,
  UserPlus,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { HeroBoard } from "@/components/admin/home/hero-board";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useCallback, useState, type CSSProperties } from "react";
import {
  motion,
  MotionConfig,
  AnimatePresence,
  type Variants,
} from "framer-motion";

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

const hairlineGrid = (cols: number): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  gap: "1px",
  background: "var(--glass-border)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--r-lg)",
  overflow: "hidden",
});

const hairlineCell: CSSProperties = {
  background: "var(--glass-bg)",
  padding: "var(--s-4)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--s-2)",
  textDecoration: "none",
};

const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  draft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  reviewed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  connected: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  urgent: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  normal: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-1.5">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ── Unified incoming requests feed ──────────────────────────────
interface FeedItem {
  id: string;
  type: "consultation" | "service" | "expert_app" | "scout_app" | "hiring" | "question";
  label: string;
  title: string;
  subtitle?: string;
  status: string;
  date: number;
  href: string;
  icon: typeof Inbox;
  urgency?: string;
}

function IncomingRequestsFeed({
  consultations,
  serviceRequests,
  expertApplications,
  scoutApplications,
  hiringAssignments,
  pendingQuestions,
}: {
  consultations?: { _id: string; requesterName: string; expertArea: string; status: string; _creationTime: number }[];
  serviceRequests?: { _id: string; serviceTitle: string; requesterName: string; requesterCompany?: string; status: string; urgency: string; _creationTime: number }[];
  expertApplications?: { _id: string; name: string; status: string; _creationTime: number }[];
  scoutApplications?: { _id: string; fullName?: string; email: string; currentTitle?: string; status: string; submittedAt?: number; createdAt: number }[];
  hiringAssignments?: { _id: string; assignmentName: string; hiringEntity?: string; status: string; urgencyLevel?: string; clerkId?: string; createdAt: number }[];
  pendingQuestions?: { _id: string; question: string; askerName: string; expertName: string; _creationTime: number }[];
}) {
  const loading = !consultations || !serviceRequests || !expertApplications || !scoutApplications || !hiringAssignments;

  if (loading) {
    return (
      <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Inbox className="size-4 text-primary" />
          <h2 className="text-sm sm:text-base font-semibold">Incoming Requests</h2>
        </div>
        <ListSkeleton rows={5} />
      </div>
    );
  }

  const items: FeedItem[] = [];

  // Consultations — pending/reviewed
  consultations
    .filter((r) => ["pending", "reviewed"].includes(r.status))
    .forEach((r) => items.push({
      id: r._id, type: "consultation", label: "Consultation", title: r.requesterName,
      subtitle: r.expertArea, status: r.status, date: r._creationTime,
      href: "/admin/consultations", icon: MessageSquare,
    }));

  // Service requests — pending/in_progress
  serviceRequests
    .filter((r) => ["pending", "in_progress", "submitted"].includes(r.status))
    .forEach((r) => items.push({
      id: r._id, type: "service", label: "Service Request", title: r.serviceTitle,
      subtitle: r.requesterName + (r.requesterCompany ? ` — ${r.requesterCompany}` : ""),
      status: r.status, date: r._creationTime, href: "/admin/services?tab=requests",
      icon: ClipboardList, urgency: r.urgency,
    }));

  // Expert applications — submitted/under_review
  expertApplications
    .filter((a) => ["submitted", "under_review"].includes(a.status))
    .forEach((a) => items.push({
      id: a._id, type: "expert_app", label: "Expert Application", title: a.name,
      status: a.status === "submitted" ? "pending" : a.status.replace("_", " "),
      date: a._creationTime, href: "/admin/experts?tab=applications", icon: FileText,
    }));

  // Scout applications — submitted/under_review
  scoutApplications
    .filter((a) => ["submitted", "under_review"].includes(a.status))
    .forEach((a) => items.push({
      id: a._id, type: "scout_app", label: "Scout Application",
      title: a.fullName || a.email, subtitle: a.currentTitle,
      status: a.status === "submitted" ? "pending" : a.status.replace(/_/g, " "),
      date: a.submittedAt || a.createdAt, href: "/admin/headhunting?tab=scouts", icon: Radar,
    }));

  // Hiring assignments — submitted/in_review/draft
  hiringAssignments
    .filter((a) => ["submitted", "in_review", "draft"].includes(a.status))
    .forEach((a) => items.push({
      id: a._id, type: "hiring", label: "Hiring Request", title: a.assignmentName,
      subtitle: a.hiringEntity, status: a.status.replace("_", " "),
      date: a.createdAt, href: "/admin/headhunting?tab=assignments", icon: UserPlus,
      urgency: a.urgencyLevel,
    }));

  // Pending questions
  pendingQuestions?.forEach((q) => items.push({
    id: q._id, type: "question", label: "Expert Question", title: q.question,
    subtitle: `${q.askerName} → ${q.expertName}`, status: "pending",
    date: q._creationTime, href: "/admin/experts?tab=questions", icon: HelpCircle,
  }));

  // Sort by date descending
  items.sort((a, b) => b.date - a.date);

  const urgencyColors: Record<string, string> = {
    critical: "bg-red-100 text-red-700",
    urgent: "bg-orange-100 text-orange-700",
  };

  const typeColors: Record<string, string> = {
    consultation: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    service: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    expert_app: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    scout_app: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400",
    hiring: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    question: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  };

  return (
    <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2">
          <Inbox className="size-3.5 sm:size-4 text-primary shrink-0" />
          Incoming Requests
          {items.length > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] sm:text-[11px] px-1.5 py-0">
              {items.length}
            </Badge>
          )}
        </h2>
      </div>
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          All clear — no pending requests.
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {items.slice(0, 15).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", typeColors[item.type] || "bg-muted")}>
                <item.icon className="size-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-snug truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="secondary" className={cn("text-[9px] px-1.5 py-0", typeColors[item.type])}>
                      {item.label}
                    </Badge>
                    {item.urgency && urgencyColors[item.urgency] && (
                      <Badge variant="secondary" className={cn("text-[9px] px-1.5 py-0", urgencyColors[item.urgency])}>
                        {item.urgency}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", statusColors[item.status] ?? statusColors.pending)}>
                    {item.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(item.date).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const stats = useQuery(api.dashboard.getStats);
  const recentPosts = useQuery(api.dashboard.getRecentPosts);
  const recentRequests = useQuery(api.dashboard.getRecentRequests);
  const recentExperts = useQuery(api.dashboard.getRecentExperts);
  const recentApplications = useQuery(api.dashboard.getRecentApplications);
  const pendingQuestions = useQuery(api.dashboard.getPendingQuestions);
  const recentServiceRequests = useQuery(api.serviceRequests.getRecent, { limit: 5 });
  const recentScoutApps = useQuery(api.dashboard.getRecentScoutApplications);
  const hiringAssignments = useQuery(api.headhunting.hiringAssignments.listAll, {});

  // Fetch user count from Clerk via our API
  const [userCount, setUserCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/admin/users?limit=1")
      .then((r) => r.json())
      .then((d) => { if (typeof d.totalCount === "number") setUserCount(d.totalCount); })
      .catch(() => {});
  }, []);

  // Notify dropdown (mirrors member home pattern)
  const [notifyOpen, setNotifyOpen] = useState(false);
  const notifyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!notifyOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!notifyRef.current?.contains(e.target as Node)) setNotifyOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [notifyOpen]);

  const firstName =
    user?.firstName ||
    (user?.fullName ? user.fullName.split(" ")[0] : null) ||
    "Admin";

  const cards = [
    {
      label: t("admin.stats.users"),
      value: userCount ?? "—",
      sub: t("admin.stats.managedByClerk"),
      icon: Users,
      href: "/admin/users",
    },
    {
      label: t("admin.stats.blogPosts"),
      value: stats?.blogPosts.total ?? 0,
      sub: `${stats?.blogPosts.published ?? 0} ${t("admin.stats.published")} / ${stats?.blogPosts.draft ?? 0} ${t("admin.stats.draft")}`,
      icon: Newspaper,
      href: "/admin/blog",
    },
    {
      label: t("admin.stats.services"),
      value: stats?.services.total ?? 0,
      sub: `${stats?.services.active ?? 0} ${t("admin.stats.active")}`,
      icon: Briefcase,
      href: "/admin/services",
    },
    {
      label: t("admin.stats.consultations"),
      value: stats?.consultations.total ?? 0,
      sub: `${stats?.consultations.pending ?? 0} ${t("admin.stats.pending")}`,
      icon: MessageSquare,
      href: "/admin/consultations",
    },
    {
      label: t("admin.stats.experts"),
      value: stats?.experts.total ?? 0,
      sub: `${stats?.experts.published ?? 0} ${t("admin.stats.published")} / ${stats?.experts.draft ?? 0} ${t("admin.stats.draft")}`,
      icon: UserCheck,
      href: "/admin/experts",
    },
    {
      label: t("admin.stats.applications"),
      value: stats?.applications.total ?? 0,
      sub: `${stats?.applications.pending ?? 0} ${t("admin.stats.pending")}`,
      icon: FileText,
      href: "/admin/experts?tab=applications",
    },
    {
      label: "Service Requests",
      value: stats?.serviceRequests.total ?? 0,
      sub: `${stats?.serviceRequests.pending ?? 0} ${t("admin.stats.pending")}`,
      icon: ClipboardList,
      href: "/admin/services?tab=requests",
    },
    {
      label: "Scout Applications",
      value: stats?.scoutApplications?.total ?? 0,
      sub: `${stats?.scoutApplications?.pending ?? 0} ${t("admin.stats.pending")}`,
      icon: Radar,
      href: "/admin/headhunting?tab=scouts",
    },
  ];

  /* ---------- Drag-scroll logic for stats cards ---------- */
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragMoved, setDragMoved] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setDragMoved(false);
    setStartX(e.clientX);
    setScrollLeft(el.scrollLeft);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) {
      setDragMoved(true);
      scrollRef.current?.setPointerCapture(e.pointerId);
    }
    scrollRef.current!.scrollLeft = scrollLeft - dx;
  }, [isDragging, startX, scrollLeft]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      scrollRef.current?.releasePointerCapture(e.pointerId);
    }
  }, [isDragging]);

  const pendingTotal =
    (stats?.consultations.pending ?? 0) +
    (stats?.serviceRequests.pending ?? 0) +
    (stats?.applications.pending ?? 0) +
    (stats?.scoutApplications?.pending ?? 0);

  return (
    <MotionConfig reducedMotion="user">
      {/* -- Hero board (overview cards) ------------------------- */}
      <HeroBoard />

      {/* -- Hero ------------------------------------------------ */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-6)" }}
      >
        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: "clamp(32px, 4.6vw, 48px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "var(--s-3) 0 var(--s-3)",
          }}
        >
          Welcome back,{" "}
          <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
            {firstName}.
          </em>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          {pendingTotal > 0
            ? `${pendingTotal} item${pendingTotal === 1 ? "" : "s"} awaiting review across the cabinet.`
            : "Running totals, requests in flight, and the latest filings across the cabinet."}
        </motion.p>
        <motion.div
          variants={fadeUp}
          style={{
            display: "flex",
            gap: "var(--s-2)",
            marginTop: "var(--s-4)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href="/admin/blog" className="lf-cta lf-cta--primary">
            <Plus size={14} style={{ marginRight: 6 }} />
            {t("admin.actions.newPost")}
          </Link>
          <Link href="/admin/services" className="lf-cta lf-cta--ghost">
            <Plus size={14} style={{ marginRight: 6 }} />
            {t("admin.actions.addService")}
          </Link>
          <Link href="/admin/consultations" className="lf-cta lf-cta--ghost">
            <MessageSquare size={14} style={{ marginRight: 6 }} />
            {t("admin.actions.viewRequests")}
          </Link>
          <Link href="/admin/experts" className="lf-cta lf-cta--ghost">
            <Plus size={14} style={{ marginRight: 6 }} />
            {t("admin.actions.addExpert")}
          </Link>
          <div ref={notifyRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="lf-icon-btn"
              aria-label="Pending review notifications"
              aria-expanded={notifyOpen}
              onClick={() => setNotifyOpen((v) => !v)}
              style={{ position: "relative" }}
            >
              <Bell size={14} />
              {pendingTotal > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: "var(--rust)",
                  }}
                />
              )}
            </button>
            <AnimatePresence>
              {notifyOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className="lf-dropdown"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: 320,
                    zIndex: 50,
                    padding: "var(--s-2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--s-2) var(--s-3)",
                      borderBottom: "1px solid var(--line-1)",
                    }}
                  >
                    <span className="lf-meta" style={{ textTransform: "uppercase" }}>
                      Pending review
                    </span>
                    <button
                      type="button"
                      className="lf-clear-btn"
                      onClick={() => setNotifyOpen(false)}
                    >
                      × Close
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {[
                      {
                        href: "/admin/consultations",
                        label: "Consultations",
                        n: stats?.consultations.pending ?? 0,
                      },
                      {
                        href: "/admin/services?tab=requests",
                        label: "Service requests",
                        n: stats?.serviceRequests.pending ?? 0,
                      },
                      {
                        href: "/admin/experts?tab=applications",
                        label: "Expert applications",
                        n: stats?.applications.pending ?? 0,
                      },
                      {
                        href: "/admin/headhunting?tab=scouts",
                        label: "Scout applications",
                        n: stats?.scoutApplications?.pending ?? 0,
                      },
                    ].map((row) => (
                      <Link
                        key={row.href}
                        href={row.href}
                        onClick={() => setNotifyOpen(false)}
                        className="lf-dropdown-item"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "var(--s-3)",
                          textDecoration: "none",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontFamily: "var(--lf-display)", color: "var(--ink)" }}>
                          {row.label}
                        </span>
                        <span className="lf-meta">
                          <strong>{row.n}</strong>
                        </span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.section>

      {/* -- Stat carousel (preserved drag scroll, restyled hairline tiles) -- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-7)" }}
      >
        <motion.div variants={fadeUp} className="lf-section-header" style={{ marginBottom: "var(--s-4)" }}>
          <h2 className="lf-h2">
            Running <em>totals.</em>
          </h2>
        </motion.div>
        <div
          ref={scrollRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className={cn(
            "-mx-4 px-4 sm:-mx-2 sm:px-2 flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 select-none",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{ scrollbarWidth: "none" }}
        >
          {!stats
            ? Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    minWidth: 200,
                    flexShrink: 0,
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--r-lg)",
                    padding: "var(--s-4)",
                  }}
                >
                  <Skeleton className="size-9 rounded-[10px] mb-3" />
                  <Skeleton className="h-3.5 w-20 mb-1" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              ))
            : cards.map(({ label, value, sub, icon: Icon, href }, i) => (
                <Link
                  key={`${href}-${i}`}
                  href={href}
                  onClick={(e) => {
                    if (dragMoved) e.preventDefault();
                  }}
                  draggable={false}
                  style={{
                    minWidth: 200,
                    flexShrink: 0,
                    textDecoration: "none",
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--r-lg)",
                    padding: "var(--s-4)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--s-2)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "var(--r-sm)",
                        background: "var(--accent-blue-ghost)",
                        color: "var(--accent-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon className="size-4" />
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--lf-display)",
                        fontSize: 28,
                        fontWeight: 400,
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
                        color: "var(--ink)",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                  <span className="lf-meta" style={{ textTransform: "uppercase" }}>
                    {label}
                  </span>
                  <span className="lf-body" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    {sub}
                  </span>
                </Link>
              ))}
        </div>
      </motion.section>

      {/* ── Incoming Requests — unified inbox ── */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp}>
          <IncomingRequestsFeed
            consultations={recentRequests}
            serviceRequests={recentServiceRequests}
            expertApplications={recentApplications}
            scoutApplications={recentScoutApps}
            hiringAssignments={hiringAssignments}
            pendingQuestions={pendingQuestions}
          />
        </motion.div>
      </motion.section>

      {/* Recent tables — stacked on mobile, side by side on desktop */}
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-2">
        {/* Recent blog posts */}
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-semibold">{t("admin.recent.posts")}</h2>
            <Link href="/admin/blog" className="text-[11px] sm:text-xs text-primary hover:underline flex items-center gap-1">
              {t("admin.recent.viewAll")}
              <ArrowRight className="size-3" />
            </Link>
          </div>
          {!recentPosts ? (
            <ListSkeleton />
          ) : recentPosts.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("admin.empty.posts")}
            </div>
          ) : (
            <>
              {/* Mobile: list items — text wraps, not truncated */}
              <div className="divide-y divide-border/50 sm:hidden">
                {recentPosts.map((post) => (
                  <div key={post._id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium leading-snug">{post.title}</p>
                      <Badge variant="secondary" className={cn("text-[10px] shrink-0 mt-0.5", statusColors[post.status])}>
                        {post.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <Table className="hidden sm:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.table.title")}</TableHead>
                    <TableHead>{t("admin.table.status")}</TableHead>
                    <TableHead className="text-right">{t("admin.table.date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPosts.map((post) => (
                    <TableRow key={post._id}>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">
                        {post.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[11px]", statusColors[post.status])}>
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(post.updatedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>

        {/* Recent consultation requests */}
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2">
              <MessageSquare className="size-3.5 sm:size-4 text-primary shrink-0" />
              Consultation Requests
            </h2>
            <Link href="/admin/consultations" className="text-[11px] sm:text-xs text-primary hover:underline flex items-center gap-1">
              {t("admin.recent.viewAll")}
              <ArrowRight className="size-3" />
            </Link>
          </div>
          {!recentRequests ? (
            <ListSkeleton />
          ) : recentRequests.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("admin.empty.requests")}
            </div>
          ) : (
            <>
              {/* Mobile: list items */}
              <div className="divide-y divide-border/50 sm:hidden">
                {recentRequests.map((req) => (
                  <div key={req._id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium leading-snug">{req.requesterName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{req.expertArea}</p>
                      </div>
                      <Badge variant="secondary" className={cn("text-[10px] shrink-0 mt-0.5", statusColors[req.status])}>
                        {req.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <Table className="hidden sm:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.table.name")}</TableHead>
                    <TableHead>{t("admin.table.area")}</TableHead>
                    <TableHead>{t("admin.table.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRequests.map((req) => (
                    <TableRow key={req._id}>
                      <TableCell className="font-medium text-sm">
                        {req.requesterName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {req.expertArea}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[11px]", statusColors[req.status])}>
                          {req.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </div>

      {/* Recent Service Requests */}
      <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2">
            <ClipboardList className="size-3.5 sm:size-4 text-primary shrink-0" />
            Service Requests
            {(stats?.serviceRequests.pending ?? 0) > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] sm:text-[11px] px-1.5 py-0">
                {stats?.serviceRequests.pending} {t("admin.stats.pending")}
              </Badge>
            )}
          </h2>
          <Link href="/admin/services?tab=requests" className="text-[11px] sm:text-xs text-primary hover:underline flex items-center gap-1 shrink-0 ml-2">
            {t("admin.recent.viewAll")}
            <ArrowRight className="size-3" />
          </Link>
        </div>
        {!recentServiceRequests ? (
          <ListSkeleton />
        ) : recentServiceRequests.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No service requests yet.
          </div>
        ) : (
          <>
            {/* Mobile: list items */}
            <div className="divide-y divide-border/50 sm:hidden">
              {recentServiceRequests.map((req) => (
                <div key={req._id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium leading-snug">{req.serviceTitle}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {req.requesterName}{req.requesterCompany ? ` — ${req.requesterCompany}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="secondary" className={cn("text-[10px]", statusColors[req.status] ?? statusColors.pending)}>
                        {req.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="secondary" className={cn("text-[10px]", statusColors[req.urgency])}>
                        {req.urgency}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>{t("admin.table.urgency")}</TableHead>
                  <TableHead>{t("admin.table.status")}</TableHead>
                  <TableHead className="text-right">{t("admin.table.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentServiceRequests.map((req) => (
                  <TableRow key={req._id}>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">
                      {req.serviceTitle}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {req.requesterName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {req.requesterCompany || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[11px]", statusColors[req.urgency])}>
                        {req.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[11px]", statusColors[req.status] ?? statusColors.pending)}>
                        {req.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(req._creationTime).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {/* Pending Quick Questions */}
      {pendingQuestions && pendingQuestions.length > 0 && (
        <div className="rounded-xl sm:rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2">
              <HelpCircle className="size-3.5 sm:size-4 text-orange-500 shrink-0" />
              <span>{t("admin.recent.pendingQuestions")}</span>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] sm:text-[11px] px-1.5 py-0">
                {pendingQuestions.length}
              </Badge>
            </h2>
            <Link href="/admin/experts?tab=questions" className="text-[11px] sm:text-xs text-primary hover:underline flex items-center gap-1 shrink-0 ml-2">
              {t("admin.recent.viewAll")}
              <ArrowRight className="size-3" />
            </Link>
          </div>
          {/* Mobile: list items — full text visible */}
          <div className="divide-y divide-orange-200/50 dark:divide-orange-800/50 sm:hidden">
            {pendingQuestions.map((q) => (
              <div key={q._id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="text-[13px] font-medium leading-snug">{q.question}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-muted-foreground">
                    {q.askerName} &rarr; {q.expertName}
                  </p>
                  <p className="text-[11px] text-muted-foreground shrink-0 ml-2">
                    {new Date(q._creationTime).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop: table */}
          <Table className="hidden sm:table">
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.table.question")}</TableHead>
                <TableHead>{t("admin.table.from")}</TableHead>
                <TableHead>{t("admin.table.expert")}</TableHead>
                <TableHead className="text-right">{t("admin.table.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingQuestions.map((q) => (
                <TableRow key={q._id}>
                  <TableCell className="font-medium text-sm max-w-[250px] truncate">
                    {q.question}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {q.askerName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {q.expertName}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(q._creationTime).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Recent experts + Recent applications */}
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-2">
        {/* Recent experts */}
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-semibold">{t("admin.recent.experts")}</h2>
            <Link href="/admin/experts?tab=experts" className="text-[11px] sm:text-xs text-primary hover:underline flex items-center gap-1">
              {t("admin.recent.viewAll")}
              <ArrowRight className="size-3" />
            </Link>
          </div>
          {!recentExperts ? (
            <ListSkeleton />
          ) : recentExperts.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("admin.empty.experts")}
            </div>
          ) : (
            <>
              {/* Mobile: list items */}
              <div className="divide-y divide-border/50 sm:hidden">
                {recentExperts.map((expert) => (
                  <div key={expert._id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium leading-snug">{expert.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(expert._creationTime).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className={cn("text-[10px] shrink-0 mt-0.5", statusColors[expert.status])}>
                        {expert.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <Table className="hidden sm:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.table.name")}</TableHead>
                    <TableHead>{t("admin.table.status")}</TableHead>
                    <TableHead className="text-right">{t("admin.table.date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentExperts.map((expert) => (
                    <TableRow key={expert._id}>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">
                        {expert.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[11px]", statusColors[expert.status])}>
                          {expert.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(expert._creationTime).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>

        {/* Recent applications */}
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2">
              <FileText className="size-3.5 sm:size-4 text-primary shrink-0" />
              Expert Applications
              {(stats?.applications.pending ?? 0) > 0 && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] sm:text-[11px] px-1.5 py-0">
                  {stats?.applications.pending} {t("admin.stats.pending")}
                </Badge>
              )}
            </h2>
            <Link href="/admin/experts?tab=applications" className="text-[11px] sm:text-xs text-primary hover:underline flex items-center gap-1 shrink-0 ml-2">
              {t("admin.recent.viewAll")}
              <ArrowRight className="size-3" />
            </Link>
          </div>
          {!recentApplications ? (
            <ListSkeleton />
          ) : recentApplications.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("admin.empty.applications")}
            </div>
          ) : (
            <>
              {/* Mobile: list items */}
              <div className="divide-y divide-border/50 sm:hidden">
                {recentApplications.map((app) => (
                  <div key={app._id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium leading-snug">{app.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(app._creationTime).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className={cn("text-[10px] shrink-0 mt-0.5", statusColors[app.status === "submitted" ? "pending" : app.status === "under_review" ? "reviewed" : app.status])}>
                        {app.status === "submitted" ? "pending" : app.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <Table className="hidden sm:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.table.name")}</TableHead>
                    <TableHead>{t("admin.table.status")}</TableHead>
                    <TableHead className="text-right">{t("admin.table.date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentApplications.map((app) => (
                    <TableRow key={app._id}>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">
                        {app.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[11px]", statusColors[app.status === "submitted" ? "pending" : app.status === "under_review" ? "reviewed" : app.status])}>
                          {app.status === "submitted" ? "pending" : app.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(app._creationTime).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </div>

      {/* Recent Scout Applications */}
      <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2">
            <Radar className="size-3.5 sm:size-4 text-primary shrink-0" />
            Scout Applications
            {(stats?.scoutApplications?.pending ?? 0) > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] sm:text-[11px] px-1.5 py-0">
                {stats?.scoutApplications?.pending} {t("admin.stats.pending")}
              </Badge>
            )}
          </h2>
          <Link href="/admin/headhunting?tab=scouts" className="text-[11px] sm:text-xs text-primary hover:underline flex items-center gap-1 shrink-0 ml-2">
            {t("admin.recent.viewAll")}
            <ArrowRight className="size-3" />
          </Link>
        </div>
        {!recentScoutApps ? (
          <ListSkeleton />
        ) : recentScoutApps.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No scout applications yet.
          </div>
        ) : (
          <>
            {/* Mobile: list items */}
            <div className="divide-y divide-border/50 sm:hidden">
              {recentScoutApps.map((app) => (
                <div key={app._id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium leading-snug">{app.fullName || "Unnamed"}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {app.currentTitle ? `${app.currentTitle}${app.currentCompany ? ` @ ${app.currentCompany}` : ""}` : app.email}
                      </p>
                    </div>
                    <Badge variant="secondary" className={cn("text-[10px] shrink-0 mt-0.5", statusColors[app.status === "submitted" ? "pending" : app.status === "under_review" ? "reviewed" : app.status])}>
                      {app.status === "submitted" ? "pending" : app.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.table.name")}</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>{t("admin.table.status")}</TableHead>
                  <TableHead className="text-right">{t("admin.table.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentScoutApps.map((app) => (
                  <TableRow key={app._id}>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">
                      {app.fullName || "Unnamed"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {app.currentTitle || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[11px]", statusColors[app.status === "submitted" ? "pending" : app.status === "under_review" ? "reviewed" : app.status])}>
                        {app.status === "submitted" ? "pending" : app.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(app.submittedAt || app.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
