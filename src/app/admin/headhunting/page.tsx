"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { fireNotification } from "@/lib/notify";
import { Plus, Building2, FileText, Search, Pencil, Radar, Eye, CheckCircle, XCircle, Loader2, User, MapPin, Mail, Briefcase, Globe, Linkedin, Layers, Package, ArrowRight, ChevronDown, ChevronUp, Clock, UserMinus, AlertTriangle, Trash2, LayoutDashboard, Users, Target, TrendingUp, ScrollText, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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

// --- Status colors ---

const mandateStatusColors: Record<string, string> = {
  received: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  clarification: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  architecture: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  internal_review: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  client_review: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  released: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  paused: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  filled: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  closed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

const urgencyColors: Record<string, string> = {
  standard: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  urgent: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// --- Component ---

const scoutStatusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  under_review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  removed: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function AdminHeadhuntingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>}>
        <AdminHeadhuntingContent />
      </Suspense>
    </MotionConfig>
  );
}

function AdminHeadhuntingContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "scouts" ? "scouts" : tabParam === "assignments" ? "assignments" : tabParam === "mandates" ? "mandates" : tabParam === "clients" ? "clients" : "overview";
  const [activeTab, setActiveTab] = useState<"overview" | "mandates" | "assignments" | "clients" | "scouts">(initialTab);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewMandate, setShowNewMandate] = useState(false);
  const pendingScoutCount = useQuery(api.headhunting.scoutProfiles.getPendingCount);

  return (
    <div className="mx-auto max-w-5xl">
      {/* -- Hero ------------------------------------------------ */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-5)" }}
      >
        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ V</span>
          Admin · Headhunting
        </motion.div>

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
            <motion.h1
              variants={fadeUp}
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: "clamp(36px, 5vw, 56px)",
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                margin: "var(--s-3) 0 var(--s-3)",
              }}
            >
              {t("admin.headhunting.title")
                .split(" ")
                .slice(0, -1)
                .join(" ")}{" "}
              <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
                {t("admin.headhunting.title").split(" ").slice(-1).join(" ")}
              </em>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="lf-section-deck"
              style={{ maxWidth: 640 }}
            >
              Mandates, scout pipeline, clients, and assignments — filed in one
              procedural record.
            </motion.p>
          </div>
          <motion.div
            variants={fadeUp}
            style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}
          >
            {activeTab === "clients" && (
              <Button onClick={() => setShowNewClient(true)} className="gap-1.5">
                <Plus className="size-4" />
                {t("admin.headhunting.newClient")}
              </Button>
            )}
            {activeTab === "mandates" && (
              <Button onClick={() => setShowNewMandate(true)} className="gap-1.5">
                <Plus className="size-4" />
                {t("admin.headhunting.newMandate")}
              </Button>
            )}
          </motion.div>
        </div>
      </motion.section>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        style={{ marginBottom: "var(--s-4)" }}
      >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "overview" | "mandates" | "assignments" | "clients" | "scouts")}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="mandates" className="gap-1.5">
            <FileText className="size-3.5" />
            {t("admin.headhunting.tab.mandates")}
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5">
            <Layers className="size-3.5" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5">
            <Building2 className="size-3.5" />
            {t("admin.headhunting.tab.clients")}
          </TabsTrigger>
          <TabsTrigger value="scouts" className="gap-1.5">
            <Radar className="size-3.5" />
            Scouts
            {(pendingScoutCount ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] px-1.5 py-0">
                {pendingScoutCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      </motion.div>

      {activeTab === "overview" && <OverviewTab onNavigate={setActiveTab} />}
      {activeTab === "mandates" && <MandatesTab />}
      {activeTab === "assignments" && <AssignmentsTab />}
      {activeTab === "clients" && <ClientsTab />}
      {activeTab === "scouts" && <ScoutsTab />}

      <NewClientDialog open={showNewClient} onClose={() => setShowNewClient(false)} />
      <NewMandateDialog open={showNewMandate} onClose={() => setShowNewMandate(false)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Overview Tab — Dashboard summary across all sections
// ═══════════════════════════════════════════════════════════════

function OverviewTab({ onNavigate }: { onNavigate: (tab: "mandates" | "assignments" | "clients" | "scouts") => void }) {
  const router = useRouter();
  const mandates = useQuery(api.headhunting.mandates.list, {});
  const clients = useQuery(api.headhunting.clients.list, {});
  const scoutProfiles = useQuery(api.headhunting.scoutProfiles.list, {});
  const pendingScouts = useQuery(api.headhunting.scoutProfiles.listPending);
  const assignments = useQuery(api.headhunting.hiringAssignments.listAll, {});

  // Compute mandate stats
  const mandateStats = useMemo(() => {
    if (!mandates) return null;
    const active = mandates.filter(m => ["released", "approved", "internal_review", "client_review", "architecture", "clarification"].includes(m.status)).length;
    const received = mandates.filter(m => m.status === "received").length;
    const filled = mandates.filter(m => m.status === "filled").length;
    const total = mandates.length;
    return { total, active, received, filled };
  }, [mandates]);

  // Compute scout stats
  const scoutStats = useMemo(() => {
    if (!scoutProfiles) return null;
    const approved = scoutProfiles.filter(s => s.status === "approved").length;
    const pending = pendingScouts?.length ?? 0;
    const total = scoutProfiles.length;
    return { total, approved, pending };
  }, [scoutProfiles, pendingScouts]);

  const clientCount = clients?.length ?? 0;
  const assignmentCount = assignments?.length ?? 0;

  // Recent mandates (last 5)
  const recentMandates = useMemo(() => {
    if (!mandates) return [];
    return [...mandates].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  }, [mandates]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => onNavigate("mandates")} className="rounded-lg border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Target className="size-4" />
            <span className="text-xs font-medium">Mandates</span>
          </div>
          <p className="text-2xl font-bold">{mandateStats?.total ?? "—"}</p>
          <div className="flex gap-2 mt-1 text-[11px] text-muted-foreground">
            <span className="text-green-600">{mandateStats?.active ?? 0} active</span>
            <span>·</span>
            <span className="text-blue-600">{mandateStats?.received ?? 0} new</span>
            <span>·</span>
            <span>{mandateStats?.filled ?? 0} filled</span>
          </div>
        </button>

        <button onClick={() => onNavigate("scouts")} className="rounded-lg border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Radar className="size-4" />
            <span className="text-xs font-medium">Scouts</span>
          </div>
          <p className="text-2xl font-bold">{scoutStats?.total ?? "—"}</p>
          <div className="flex gap-2 mt-1 text-[11px] text-muted-foreground">
            <span className="text-green-600">{scoutStats?.approved ?? 0} approved</span>
            {(scoutStats?.pending ?? 0) > 0 && (
              <>
                <span>·</span>
                <span className="text-orange-600 font-medium">{scoutStats?.pending} pending review</span>
              </>
            )}
          </div>
        </button>

        <button onClick={() => onNavigate("clients")} className="rounded-lg border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Building2 className="size-4" />
            <span className="text-xs font-medium">Clients</span>
          </div>
          <p className="text-2xl font-bold">{clientCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Registered companies</p>
        </button>

        <button onClick={() => onNavigate("assignments")} className="rounded-lg border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Layers className="size-4" />
            <span className="text-xs font-medium">Assignments</span>
          </div>
          <p className="text-2xl font-bold">{assignmentCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Client hiring requests</p>
        </button>
      </div>

      {/* Pending Actions */}
      {((scoutStats?.pending ?? 0) > 0 || (mandateStats?.received ?? 0) > 0) && (
        <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 p-4">
          <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Pending Actions
          </h3>
          <div className="space-y-1.5">
            {(scoutStats?.pending ?? 0) > 0 && (
              <button onClick={() => onNavigate("scouts")} className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400 hover:underline">
                <ArrowRight className="size-3" />
                {scoutStats!.pending} scout application{scoutStats!.pending > 1 ? "s" : ""} awaiting review
              </button>
            )}
            {(mandateStats?.received ?? 0) > 0 && (
              <button onClick={() => onNavigate("mandates")} className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400 hover:underline">
                <ArrowRight className="size-3" />
                {mandateStats!.received} new mandate{mandateStats!.received > 1 ? "s" : ""} to process
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recent Mandates */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="size-3.5 text-muted-foreground" />
            Recent Mandates
          </h3>
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => onNavigate("mandates")}>
            View all <ArrowRight className="size-3" />
          </Button>
        </div>
        {recentMandates.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No mandates yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {recentMandates.map((m) => (
              <button
                key={m._id}
                onClick={() => router.push(`/admin/headhunting/mandates/${m._id}`)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.rawTitle}</p>
                  <p className="text-xs text-muted-foreground">{m.clientName} · {new Date(m.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="secondary" className={cn("text-[10px]", mandateStatusColors[m.status])}>
                    {m.status.replace(/_/g, " ")}
                  </Badge>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <a href="/admin/headhunting/blueprints" className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/40 transition-colors text-center">
          <ScrollText className="size-4 mx-auto mb-1.5 text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Role Blueprints</p>
        </a>
        <a href="/admin/headhunting/scout-groups" className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 p-3 hover:bg-teal-100/50 dark:hover:bg-teal-950/40 transition-colors text-center">
          <UsersRound className="size-4 mx-auto mb-1.5 text-teal-600 dark:text-teal-400" />
          <p className="text-xs font-medium text-teal-700 dark:text-teal-300">Scout Groups</p>
        </a>
        <a href="/admin/headhunting/analytics" className="rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors text-center">
          <TrendingUp className="size-4 mx-auto mb-1.5 text-muted-foreground" />
          <p className="text-xs font-medium">Analytics</p>
        </a>
        <a href="/admin/headhunting/revenue" className="rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors text-center">
          <Briefcase className="size-4 mx-auto mb-1.5 text-muted-foreground" />
          <p className="text-xs font-medium">Revenue</p>
        </a>
        <a href="/admin/headhunting/collabs" className="rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors text-center">
          <Users className="size-4 mx-auto mb-1.5 text-muted-foreground" />
          <p className="text-xs font-medium">Collaborators</p>
        </a>
        <a href="/admin/headhunting/config" className="rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors text-center">
          <Package className="size-4 mx-auto mb-1.5 text-muted-foreground" />
          <p className="text-xs font-medium">Config</p>
        </a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Assignments Tab (Phase 3 — Client Hiring Flow)
// ═══════════════════════════════════════════════════════════════

const assignmentStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  filled: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  closed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

function AssignmentsTab() {
  const assignments = useQuery(api.headhunting.hiringAssignments.listAll, {});
  const updateAssignment = useMutation(api.headhunting.hiringAssignments.update);
  const convertToMandate = useMutation(api.headhunting.hiringAssignments.convertToMandate);
  const auditLog = useMutation(api.headhunting.auditLog.log);
  const { user } = useUser();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);

  if (!assignments) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (assignments.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">No hiring assignments yet. Clients can submit via the hiring wizard.</div>;
  }

  const handleStatusChange = async (id: Id<"htHiringAssignments">, newStatus: string) => {
    try {
      await updateAssignment({ id, status: newStatus as "draft" | "submitted" | "in_review" | "active" | "paused" | "filled" | "closed" });
      await auditLog({
        entityType: "assignment",
        entityId: id,
        action: "status_changed",
        changes: JSON.stringify({ status: newStatus }),
        performedBy: user?.id,
        performedByName: user?.fullName ?? undefined,
      });
      toast.success(`Status updated to "${newStatus.replace(/_/g, " ")}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleConvertToMandate = async (id: Id<"htHiringAssignments">) => {
    setConverting(id);
    try {
      const mandateId = await convertToMandate({ id });
      await auditLog({
        entityType: "assignment",
        entityId: id,
        action: "converted_to_mandate",
        changes: JSON.stringify({ mandateId }),
        performedBy: user?.id,
        performedByName: user?.fullName ?? undefined,
      });
      toast.success("Assignment converted to mandate. Redirecting...");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setConverting(null);
    }
  };

  return (
    <div className="space-y-3">
      {assignments.map((a) => {
        const expanded = expandedId === a._id;
        return (
          <div key={a._id} className="rounded-lg border border-border overflow-hidden">
            {/* Header row */}
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : a._id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Package className="size-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{a.assignmentName}</span>
                    <Badge variant="secondary" className={cn("text-[11px]", assignmentStatusColors[a.status])}>
                      {a.status.replace(/_/g, " ")}
                    </Badge>
                    {a.mandateId && (
                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                        linked to mandate
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.clientName} · {a.hiringSupportType} · {a.groupCount} group{a.groupCount !== 1 ? "s" : ""} · {a.roleCount} role{a.roleCount !== 1 ? "s" : ""} · {a.totalOpenings} opening{a.totalOpenings !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </div>
            </button>

            {/* Expanded detail */}
            {expanded && (
              <AssignmentDetail
                assignment={a}
                onStatusChange={(status) => handleStatusChange(a._id, status)}
                onConvert={() => handleConvertToMandate(a._id)}
                converting={converting === a._id}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AssignmentDetail({
  assignment,
  onStatusChange,
  onConvert,
  converting,
}: {
  assignment: {
    _id: Id<"htHiringAssignments">;
    assignmentName: string;
    hiringSupportType: string;
    hiringScopeSummary?: string;
    totalOpenings: number;
    hiringEntity?: string;
    confidentialityPreference?: string;
    geography?: string;
    urgencyLevel?: string;
    targetJoiningTimeline?: string;
    internalNotes?: string;
    status: string;
    mandateId?: Id<"htMandates">;
    clientName: string;
    groupCount: number;
    roleCount: number;
    createdAt: number;
    updatedAt: number;
  };
  onStatusChange: (status: string) => void;
  onConvert: () => void;
  converting: boolean;
}) {
  const detail = useQuery(api.headhunting.hiringAssignments.getById, { id: assignment._id });
  const auditEntries = useQuery(api.headhunting.auditLog.getByEntity, {
    entityType: "assignment",
    entityId: assignment._id,
  });
  const updateAssignment = useMutation(api.headhunting.hiringAssignments.update);
  const updateRoleGroup = useMutation(api.headhunting.roleGroups.update);
  const updateRole = useMutation(api.headhunting.roles.update);
  const removeAssignment = useMutation(api.headhunting.hiringAssignments.deleteAssignment);
  const auditLog = useMutation(api.headhunting.auditLog.log);
  const { user } = useUser();
  const [deleting, setDeleting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    assignmentName: assignment.assignmentName,
    hiringSupportType: assignment.hiringSupportType,
    totalOpenings: assignment.totalOpenings,
    geography: assignment.geography || "",
    urgencyLevel: assignment.urgencyLevel || "",
    targetJoiningTimeline: assignment.targetJoiningTimeline || "",
    hiringEntity: assignment.hiringEntity || "",
    hiringScopeSummary: assignment.hiringScopeSummary || "",
    internalNotes: assignment.internalNotes || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSaveAssignment = async () => {
    setSaving(true);
    try {
      await updateAssignment({
        id: assignment._id,
        assignmentName: editForm.assignmentName,
        hiringSupportType: editForm.hiringSupportType,
        totalOpenings: editForm.totalOpenings,
        geography: editForm.geography || undefined,
        urgencyLevel: editForm.urgencyLevel || undefined,
        targetJoiningTimeline: editForm.targetJoiningTimeline || undefined,
        hiringEntity: editForm.hiringEntity || undefined,
        hiringScopeSummary: editForm.hiringScopeSummary || undefined,
        internalNotes: editForm.internalNotes || undefined,
      });
      await auditLog({
        entityType: "assignment",
        entityId: assignment._id,
        action: "updated",
        changes: JSON.stringify({ fields: "assignment details edited by admin" }),
        performedBy: user?.id,
        performedByName: user?.fullName ?? undefined,
      });
      setEditing(false);
      toast.success("Assignment updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGroupField = async (groupId: Id<"htRoleGroups">, field: string, value: string) => {
    try {
      await updateRoleGroup({ id: groupId, [field]: value || undefined });
      await auditLog({
        entityType: "roleGroup",
        entityId: groupId,
        action: "updated",
        changes: JSON.stringify({ [field]: value }),
        performedBy: user?.id,
        performedByName: user?.fullName ?? undefined,
      });
      toast.success("Group updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleSaveRoleField = async (roleId: Id<"htRoles">, field: string, value: string | number) => {
    try {
      await updateRole({ id: roleId, [field]: value || undefined });
      await auditLog({
        entityType: "role",
        entityId: roleId,
        action: "updated",
        changes: JSON.stringify({ [field]: value }),
        performedBy: user?.id,
        performedByName: user?.fullName ?? undefined,
      });
      toast.success("Role updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/10">
      {/* Assignment details — view or edit mode */}
      {!editing ? (
        <>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignment Details</h4>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="gap-1 h-7 text-xs">
              <Pencil className="size-3" /> Edit
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <DetailItem label="Client" value={assignment.clientName} />
            <DetailItem label="Support Type" value={assignment.hiringSupportType} />
            <DetailItem label="Total Openings" value={String(assignment.totalOpenings)} />
            {assignment.urgencyLevel && <DetailItem label="Urgency" value={assignment.urgencyLevel} />}
            {assignment.geography && <DetailItem label="Geography" value={assignment.geography} />}
            {assignment.targetJoiningTimeline && <DetailItem label="Timeline" value={assignment.targetJoiningTimeline} />}
            {assignment.hiringEntity && <DetailItem label="Entity" value={assignment.hiringEntity} />}
            {assignment.confidentialityPreference && <DetailItem label="Confidentiality" value={assignment.confidentialityPreference} />}
          </div>
          {assignment.hiringScopeSummary && (
            <div className="text-sm">
              <span className="text-xs text-muted-foreground">Scope: </span>
              <span>{assignment.hiringScopeSummary}</span>
            </div>
          )}
          {assignment.internalNotes && (
            <div className="text-sm">
              <span className="text-xs text-muted-foreground">Internal Notes: </span>
              <span>{assignment.internalNotes}</span>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3 rounded border border-primary/20 bg-card p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit Assignment</h4>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-xs">Cancel</Button>
              <Button size="sm" onClick={handleSaveAssignment} disabled={saving} className="h-7 text-xs gap-1">
                {saving ? <Loader2 className="size-3 animate-spin" /> : null} Save
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Assignment Name</Label>
              <Input value={editForm.assignmentName} onChange={(e) => setEditForm((f) => ({ ...f, assignmentName: e.target.value }))} className="text-sm h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Support Type</Label>
              <Input value={editForm.hiringSupportType} onChange={(e) => setEditForm((f) => ({ ...f, hiringSupportType: e.target.value }))} className="text-sm h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total Openings</Label>
              <Input type="number" min={1} value={editForm.totalOpenings} onChange={(e) => setEditForm((f) => ({ ...f, totalOpenings: parseInt(e.target.value) || 1 }))} className="text-sm h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Geography</Label>
              <Input value={editForm.geography} onChange={(e) => setEditForm((f) => ({ ...f, geography: e.target.value }))} className="text-sm h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Urgency</Label>
              <Input value={editForm.urgencyLevel} onChange={(e) => setEditForm((f) => ({ ...f, urgencyLevel: e.target.value }))} className="text-sm h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Timeline</Label>
              <Input value={editForm.targetJoiningTimeline} onChange={(e) => setEditForm((f) => ({ ...f, targetJoiningTimeline: e.target.value }))} className="text-sm h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hiring Entity</Label>
              <Input value={editForm.hiringEntity} onChange={(e) => setEditForm((f) => ({ ...f, hiringEntity: e.target.value }))} className="text-sm h-8" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Scope Summary</Label>
              <Textarea value={editForm.hiringScopeSummary} onChange={(e) => setEditForm((f) => ({ ...f, hiringScopeSummary: e.target.value }))} rows={2} className="text-sm" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Internal Notes</Label>
              <Textarea value={editForm.internalNotes} onChange={(e) => setEditForm((f) => ({ ...f, internalNotes: e.target.value }))} rows={2} className="text-sm" />
            </div>
          </div>
        </div>
      )}

      {/* Role groups + roles (editable) */}
      {detail?.roleGroups && detail.roleGroups.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Groups & Roles</h4>
          {detail.roleGroups.map((group, gIdx) => {
            const groupRoles = (detail.roles || []).filter((r) => r.roleGroupId === group._id);
            return (
              <EditableGroupCard
                key={group._id}
                group={group}
                index={gIdx}
                roles={groupRoles}
                onSaveGroup={handleSaveGroupField}
                onSaveRole={handleSaveRoleField}
              />
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Select value={assignment.status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["draft", "submitted", "in_review", "active", "paused", "filled", "closed"].map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!assignment.mandateId && (
          <Button size="sm" variant="outline" onClick={onConvert} disabled={converting} className="gap-1 h-8 text-xs">
            {converting ? <Loader2 className="size-3 animate-spin" /> : <ArrowRight className="size-3" />}
            Convert to Mandate
          </Button>
        )}

        {assignment.mandateId && (
          <Button size="sm" variant="ghost" asChild className="gap-1 h-8 text-xs">
            <a href={`/admin/headhunting/mandates/${assignment.mandateId}`}>
              <Eye className="size-3" /> View Mandate
            </a>
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="gap-1 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
          disabled={deleting}
          onClick={async () => {
            if (!confirm(`Delete "${assignment.assignmentName}"? This cannot be undone.`)) return;
            setDeleting(true);
            try {
              await removeAssignment({ id: assignment._id });
            } catch {
              setDeleting(false);
            }
          }}
        >
          {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
          Delete
        </Button>
      </div>

      {/* Audit trail */}
      {auditEntries && auditEntries.length > 0 && (
        <div className="border-t border-border pt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <Clock className="size-3" /> Audit Trail
          </h4>
          <div className="space-y-1">
            {auditEntries.slice(0, 10).map((entry) => (
              <div key={entry._id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{entry.action.replace(/_/g, " ")}</span>
                  {entry.performedByName && <span className="text-muted-foreground">by {entry.performedByName}</span>}
                </div>
                <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function EditableGroupCard({
  group,
  index,
  roles,
  onSaveGroup,
  onSaveRole,
}: {
  group: { _id: Id<"htRoleGroups">; groupName: string; workMode?: string; monthlySalaryRange?: string; jobLocation?: string; weeklyWorkingDays?: string; shiftType?: string; annualCtcRange?: string };
  index: number;
  roles: { _id: Id<"htRoles">; roleTitle: string; department?: string; seniorityLevel?: string; openings: number; reportingTo?: string; overriddenFields?: string[] }[];
  onSaveGroup: (groupId: Id<"htRoleGroups">, field: string, value: string) => void;
  onSaveRole: (roleId: Id<"htRoles">, field: string, value: string | number) => void;
}) {
  const [editingGroup, setEditingGroup] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [gForm, setGForm] = useState({ groupName: group.groupName, workMode: group.workMode || "", jobLocation: group.jobLocation || "", monthlySalaryRange: group.monthlySalaryRange || "" });
  const [rForm, setRForm] = useState<Record<string, string | number>>({});

  return (
    <div className="rounded border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        {!editingGroup ? (
          <>
            <span className="text-sm font-medium">{group.groupName || `Group ${index + 1}`}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {group.workMode && `${group.workMode} · `}
                {group.monthlySalaryRange && `${group.monthlySalaryRange} · `}
                {roles.length} role{roles.length !== 1 ? "s" : ""}
              </span>
              <button type="button" onClick={() => setEditingGroup(true)} className="p-1 rounded hover:bg-muted">
                <Pencil className="size-3 text-muted-foreground" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">Group Name</Label><Input value={gForm.groupName} onChange={(e) => setGForm((f) => ({ ...f, groupName: e.target.value }))} className="text-xs h-7" /></div>
              <div><Label className="text-[10px]">Work Mode</Label><Input value={gForm.workMode} onChange={(e) => setGForm((f) => ({ ...f, workMode: e.target.value }))} className="text-xs h-7" /></div>
              <div><Label className="text-[10px]">Location</Label><Input value={gForm.jobLocation} onChange={(e) => setGForm((f) => ({ ...f, jobLocation: e.target.value }))} className="text-xs h-7" /></div>
              <div><Label className="text-[10px]">Monthly Salary</Label><Input value={gForm.monthlySalaryRange} onChange={(e) => setGForm((f) => ({ ...f, monthlySalaryRange: e.target.value }))} className="text-xs h-7" /></div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditingGroup(false)} className="h-6 text-[10px]">Cancel</Button>
              <Button size="sm" onClick={() => {
                for (const [k, v] of Object.entries(gForm)) onSaveGroup(group._id, k, v);
                setEditingGroup(false);
              }} className="h-6 text-[10px]">Save</Button>
            </div>
          </div>
        )}
      </div>
      {roles.length > 0 && (
        <div className="space-y-1">
          {roles.map((role) => (
            <div key={role._id} className="text-xs bg-muted/30 rounded px-2 py-1.5">
              {editingRoleId !== role._id ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{role.roleTitle}</span>
                    {role.department && <span className="text-muted-foreground">· {role.department}</span>}
                    {role.seniorityLevel && <span className="text-muted-foreground">· {role.seniorityLevel}</span>}
                    {(role.overriddenFields?.length ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-300">custom</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{role.openings} opening{role.openings !== 1 ? "s" : ""}</span>
                    <button type="button" onClick={() => { setEditingRoleId(role._id); setRForm({ roleTitle: role.roleTitle, department: role.department || "", seniorityLevel: role.seniorityLevel || "", openings: role.openings, reportingTo: role.reportingTo || "" }); }} className="p-0.5 rounded hover:bg-muted">
                      <Pencil className="size-2.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    <div><Label className="text-[10px]">Title</Label><Input value={rForm.roleTitle as string} onChange={(e) => setRForm((f) => ({ ...f, roleTitle: e.target.value }))} className="text-[11px] h-6" /></div>
                    <div><Label className="text-[10px]">Department</Label><Input value={rForm.department as string} onChange={(e) => setRForm((f) => ({ ...f, department: e.target.value }))} className="text-[11px] h-6" /></div>
                    <div><Label className="text-[10px]">Openings</Label><Input type="number" min={1} value={rForm.openings as number} onChange={(e) => setRForm((f) => ({ ...f, openings: parseInt(e.target.value) || 1 }))} className="text-[11px] h-6" /></div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditingRoleId(null)} className="h-5 text-[10px] px-1.5">Cancel</Button>
                    <Button size="sm" onClick={() => {
                      for (const [k, v] of Object.entries(rForm)) onSaveRole(role._id, k, v);
                      setEditingRoleId(null);
                    }} className="h-5 text-[10px] px-1.5">Save</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Mandates Tab
// ═══════════════════════════════════════════════════════════════

function MandatesTab() {
  const { t } = useLanguage();
  const router = useRouter();
  const mandates = useQuery(api.headhunting.mandates.list, {});
  const removeMandate = useMutation(api.headhunting.mandates.deleteMandate);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!mandates) {
    return <div className="py-12 text-center text-sm text-muted-foreground">{t("admin.loading")}</div>;
  }

  if (mandates.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t("admin.headhunting.noMandates")}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.headhunting.mandateTitle")}</TableHead>
            <TableHead>{t("admin.headhunting.clientName")}</TableHead>
            <TableHead>{t("admin.headhunting.urgency")}</TableHead>
            <TableHead>{t("admin.headhunting.mandateType")}</TableHead>
            <TableHead>{t("admin.headhunting.status")}</TableHead>
            <TableHead className="text-right">{t("admin.table.date")}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {mandates.map((m) => (
            <TableRow key={m._id} className="group cursor-pointer hover:bg-muted/50">
              <TableCell className="font-medium text-sm max-w-[250px]" onClick={() => router.push(`/admin/headhunting/mandates/${m._id}`)}>
                <span className="truncate hover:underline text-primary flex items-center gap-1.5">
                  {m.rawTitle}
                  <ArrowRight className="size-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </TableCell>
              <TableCell className="text-sm" onClick={() => router.push(`/admin/headhunting/mandates/${m._id}`)}>{m.clientName}</TableCell>
              <TableCell onClick={() => router.push(`/admin/headhunting/mandates/${m._id}`)}>
                <Badge variant="secondary" className={cn("text-[11px]", urgencyColors[m.urgency])}>
                  {t(`admin.headhunting.urgency.${m.urgency}`)}
                </Badge>
              </TableCell>
              <TableCell onClick={() => router.push(`/admin/headhunting/mandates/${m._id}`)}>
                <Badge variant="outline" className="text-[11px]">
                  {t(`admin.headhunting.mandateType.${m.mandateType}`)}
                </Badge>
              </TableCell>
              <TableCell onClick={() => router.push(`/admin/headhunting/mandates/${m._id}`)}>
                <Badge variant="secondary" className={cn("text-[11px]", mandateStatusColors[m.status])}>
                  {m.status.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground" onClick={() => router.push(`/admin/headhunting/mandates/${m._id}`)}>
                {new Date(m.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={deletingId === m._id}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Delete mandate "${m.rawTitle}"? This cannot be undone.`)) return;
                    setDeletingId(m._id);
                    try {
                      await removeMandate({ id: m._id });
                    } catch {
                      setDeletingId(null);
                    }
                  }}
                >
                  {deletingId === m._id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Clients Tab
// ═══════════════════════════════════════════════════════════════

function ClientsTab() {
  const { t } = useLanguage();
  const clients = useQuery(api.headhunting.clients.list, {});
  const [editingClient, setEditingClient] = useState<typeof clients extends (infer T)[] | undefined ? T | null : null>(null);

  if (!clients) {
    return <div className="py-12 text-center text-sm text-muted-foreground">{t("admin.loading")}</div>;
  }

  if (clients.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t("admin.headhunting.noClients")}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.headhunting.clientName")}</TableHead>
              <TableHead>{t("admin.headhunting.industry")}</TableHead>
              <TableHead>{t("admin.headhunting.confidentiality")}</TableHead>
              <TableHead>{t("admin.headhunting.status")}</TableHead>
              <TableHead className="text-right">{t("admin.table.date")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c._id} className="hover:bg-muted/50">
                <TableCell className="font-medium text-sm">{c.companyName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.industry ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[11px]">
                    {t(`admin.headhunting.confidentiality.${c.defaultConfidentiality}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[11px]",
                      c.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    )}
                  >
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditingClient(c)}>
                    <Pencil className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editingClient && (
        <EditClientDialog client={editingClient} onClose={() => setEditingClient(null)} />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// New Client Dialog
// ═══════════════════════════════════════════════════════════════

function NewClientDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const createClient = useMutation(api.headhunting.clients.create);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    sector: "",
    billingEntity: "",
    billingEmail: "",
    defaultConfidentiality: "full_mask" as "full_mask" | "partial_clue" | "disclosed",
    notes: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactDesignation: "",
  });

  const handleSave = async () => {
    if (!form.companyName.trim() || !form.contactName.trim() || !form.contactEmail.trim()) return;
    setSaving(true);
    try {
      await createClient({
        companyName: form.companyName,
        industry: form.industry || undefined,
        sector: form.sector || undefined,
        billingEntity: form.billingEntity || undefined,
        billingEmail: form.billingEmail || undefined,
        defaultConfidentiality: form.defaultConfidentiality,
        notes: form.notes || undefined,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined,
        contactDesignation: form.contactDesignation || undefined,
      });
      toast.success("Client created");
      setForm({
        companyName: "", industry: "", sector: "", billingEntity: "", billingEmail: "",
        defaultConfidentiality: "full_mask", notes: "", contactName: "", contactEmail: "",
        contactPhone: "", contactDesignation: "",
      });
      onClose();
    } catch {
      toast.error("Failed to create client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("admin.headhunting.newClient")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>{t("admin.headhunting.clientName")} *</Label>
            <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.industry")}</Label>
              <Input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.sector")}</Label>
              <Input value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.headhunting.confidentiality")}</Label>
            <Select value={form.defaultConfidentiality} onValueChange={(v) => setForm((f) => ({ ...f, defaultConfidentiality: v as typeof f.defaultConfidentiality }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_mask">{t("admin.headhunting.confidentiality.full_mask")}</SelectItem>
                <SelectItem value="partial_clue">{t("admin.headhunting.confidentiality.partial_clue")}</SelectItem>
                <SelectItem value="disclosed">{t("admin.headhunting.confidentiality.disclosed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.billingEntity")}</Label>
              <Input value={form.billingEntity} onChange={(e) => setForm((f) => ({ ...f, billingEntity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.billingEmail")}</Label>
              <Input type="email" value={form.billingEmail} onChange={(e) => setForm((f) => ({ ...f, billingEmail: e.target.value }))} />
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm font-medium mb-3">Primary Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("admin.headhunting.contactName")} *</Label>
                <Input value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("admin.headhunting.contactEmail")} *</Label>
                <Input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("admin.headhunting.contactPhone")}</Label>
                <Input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("admin.headhunting.contactDesignation")}</Label>
                <Input value={form.contactDesignation} onChange={(e) => setForm((f) => ({ ...f, contactDesignation: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("admin.headhunting.notes")}</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.companyName.trim() || !form.contactName.trim() || !form.contactEmail.trim()}>
              {saving ? "Saving..." : t("admin.headhunting.newClient")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// New Mandate Dialog
// ═══════════════════════════════════════════════════════════════

function NewMandateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const createMandate = useMutation(api.headhunting.mandates.create);
  const clients = useQuery(api.headhunting.clients.list, { status: "active" });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: "" as string,
    rawTitle: "",
    rawDescription: "",
    rawNotes: "",
    source: "web_form" as "web_form" | "email" | "jd_upload" | "internal" | "sample_cv",
    urgency: "standard" as "standard" | "urgent" | "critical",
    mandateType: "exclusive" as "exclusive" | "non_exclusive" | "retainer",
  });

  const handleSave = async () => {
    if (!form.clientId || !form.rawTitle.trim()) return;
    setSaving(true);
    try {
      await createMandate({
        clientId: form.clientId as Id<"htClients">,
        source: form.source,
        rawTitle: form.rawTitle,
        rawDescription: form.rawDescription || undefined,
        rawNotes: form.rawNotes || undefined,
        urgency: form.urgency,
        mandateType: form.mandateType,
      });
      const clientName = clients?.find((c) => c._id === form.clientId)?.companyName ?? "Unknown";
      fireNotification("mandate_created", {
        mandateTitle: form.rawTitle,
        clientName,
        source: form.source,
        urgency: form.urgency,
        mandateType: form.mandateType,
      });
      toast.success("Mandate created");
      setForm({
        clientId: "", rawTitle: "", rawDescription: "", rawNotes: "",
        source: "web_form", urgency: "standard", mandateType: "exclusive",
      });
      onClose();
    } catch {
      toast.error("Failed to create mandate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("admin.headhunting.newMandate")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>{t("admin.headhunting.selectClient")} *</Label>
            <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}>
              <SelectTrigger><SelectValue placeholder={t("admin.headhunting.selectClient")} /></SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("admin.headhunting.mandateTitle")} *</Label>
            <Input value={form.rawTitle} onChange={(e) => setForm((f) => ({ ...f, rawTitle: e.target.value }))} placeholder="e.g. Head of HR — Dhaka" />
          </div>

          <div className="space-y-1.5">
            <Label>{t("admin.headhunting.mandateDescription")}</Label>
            <Textarea value={form.rawDescription} onChange={(e) => setForm((f) => ({ ...f, rawDescription: e.target.value }))} rows={4} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.source")}</Label>
              <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v as typeof f.source }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="web_form">Web Form</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="jd_upload">JD Upload</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="sample_cv">Sample CV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.urgency")}</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm((f) => ({ ...f, urgency: v as typeof f.urgency }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{t("admin.headhunting.urgency.standard")}</SelectItem>
                  <SelectItem value="urgent">{t("admin.headhunting.urgency.urgent")}</SelectItem>
                  <SelectItem value="critical">{t("admin.headhunting.urgency.critical")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.mandateType")}</Label>
              <Select value={form.mandateType} onValueChange={(v) => setForm((f) => ({ ...f, mandateType: v as typeof f.mandateType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">{t("admin.headhunting.mandateType.exclusive")}</SelectItem>
                  <SelectItem value="non_exclusive">{t("admin.headhunting.mandateType.non_exclusive")}</SelectItem>
                  <SelectItem value="retainer">{t("admin.headhunting.mandateType.retainer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("admin.headhunting.mandateNotes")}</Label>
            <Textarea value={form.rawNotes} onChange={(e) => setForm((f) => ({ ...f, rawNotes: e.target.value }))} rows={2} placeholder="Internal notes (not visible to client or scouts)" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.clientId || !form.rawTitle.trim()}>
              {saving ? "Saving..." : t("admin.headhunting.newMandate")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// Edit Client Dialog
// ═══════════════════════════════════════════════════════════════

function EditClientDialog({
  client,
  onClose,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const updateClient = useMutation(api.headhunting.clients.update);
  const linkClerkId = useMutation(api.headhunting.clients.linkClerkId);
  const clientDetail = useQuery(api.headhunting.clients.getById, { id: client._id as Id<"htClients"> });
  const [saving, setSaving] = useState(false);
  const [linkingUser, setLinkingUser] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [form, setForm] = useState({
    companyName: client.companyName ?? "",
    industry: client.industry ?? "",
    sector: client.sector ?? "",
    billingEntity: client.billingEntity ?? "",
    billingEmail: client.billingEmail ?? "",
    defaultConfidentiality: client.defaultConfidentiality ?? "full_mask",
    notes: client.notes ?? "",
    status: client.status ?? "active",
  });

  const linkedClerkId = clientDetail?.contacts?.find((c: { clerkId?: string }) => c.clerkId)?.clerkId;
  const primaryContact = clientDetail?.contacts?.find((c: { isPrimary: boolean }) => c.isPrimary);

  const handleSave = async () => {
    if (!form.companyName.trim()) return;
    setSaving(true);
    try {
      await updateClient({
        id: client._id as Id<"htClients">,
        companyName: form.companyName,
        industry: form.industry || undefined,
        sector: form.sector || undefined,
        billingEntity: form.billingEntity || undefined,
        billingEmail: form.billingEmail || undefined,
        defaultConfidentiality: form.defaultConfidentiality as "full_mask" | "partial_clue" | "disclosed",
        notes: form.notes || undefined,
        status: form.status as "active" | "inactive",
      });
      toast.success("Client updated");
      onClose();
    } catch {
      toast.error("Failed to update client");
    } finally {
      setSaving(false);
    }
  };

  const handleLinkUser = async () => {
    if (!linkEmail.trim()) return;
    setLinkingUser(true);
    try {
      // Look up Clerk user by email
      const res = await fetch(`/api/admin/users?query=${encodeURIComponent(linkEmail.trim())}&limit=1`);
      if (!res.ok) throw new Error("Failed to search users");
      const data = await res.json();
      const matchedUser = data.users?.[0];
      if (!matchedUser) {
        toast.error("No user found with that email");
        return;
      }
      await linkClerkId({ clientId: client._id as Id<"htClients">, clerkId: matchedUser.id });
      toast.success(`Linked to ${matchedUser.firstName ?? ""} ${matchedUser.lastName ?? ""} (${matchedUser.email})`);
      setLinkEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link user");
    } finally {
      setLinkingUser(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>{t("admin.headhunting.clientName")} *</Label>
            <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.industry")}</Label>
              <Input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.sector")}</Label>
              <Input value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.headhunting.confidentiality")}</Label>
            <Select value={form.defaultConfidentiality} onValueChange={(v) => setForm((f) => ({ ...f, defaultConfidentiality: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_mask">{t("admin.headhunting.confidentiality.full_mask")}</SelectItem>
                <SelectItem value="partial_clue">{t("admin.headhunting.confidentiality.partial_clue")}</SelectItem>
                <SelectItem value="disclosed">{t("admin.headhunting.confidentiality.disclosed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.billingEntity")}</Label>
              <Input value={form.billingEntity} onChange={(e) => setForm((f) => ({ ...f, billingEntity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.headhunting.billingEmail")}</Label>
              <Input type="email" value={form.billingEmail} onChange={(e) => setForm((f) => ({ ...f, billingEmail: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.headhunting.status")}</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.headhunting.notes")}</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>

          {/* Linked User Account */}
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-medium">Linked User Account</p>
            {linkedClerkId ? (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Linked
                </Badge>
                <span className="text-muted-foreground">
                  {primaryContact?.name} ({primaryContact?.email})
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Link a platform user so they can access the Client Portal. Enter their email address.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLinkUser}
                    disabled={linkingUser || !linkEmail.trim()}
                  >
                    {linkingUser ? "Linking..." : "Link"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.companyName.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// Scouts Tab
// ═══════════════════════════════════════════════════════════════

function ScoutsTab() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewingId, setReviewingId] = useState<Id<"htScoutProfiles"> | null>(null);

  const allScouts = useQuery(api.headhunting.scoutProfiles.list, {});

  const filtered = useMemo(() => {
    if (!allScouts) return [];
    let list = allScouts.filter((s) => s.status !== "draft");
    if (statusFilter !== "all") {
      list = list.filter((s) => s.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.currentCompany?.toLowerCase().includes(q) ||
          s.profileId?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allScouts, statusFilter, searchQuery]);

  if (!allScouts) {
    return <div className="py-12 text-center text-sm text-muted-foreground">{t("admin.loading")}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { value: "all", label: "All" },
            { value: "submitted", label: "Pending" },
            { value: "under_review", label: "Under Review" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "removed", label: "Removed" },
          ].map(({ value, label }) => (
            <Button
              key={value}
              variant={statusFilter === value ? "default" : "outline"}
              size="sm"
              className="text-xs shrink-0"
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No scout applications found.
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="divide-y divide-border sm:hidden">
            {filtered.map((s) => (
              <div key={s._id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.fullName || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.currentTitle}{s.currentCompany ? ` @ ${s.currentCompany}` : ""}
                    </p>
                    {s.profileId && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{s.profileId}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.talentBankCvStorageId && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        title="CV shared via Talent Bank"
                      >
                        <FileText className="size-2.5" />
                        CV
                      </Badge>
                    )}
                    <Badge variant="secondary" className={cn("text-[10px]", scoutStatusColors[s.status])}>
                      {s.status === "submitted" ? "pending" : s.status.replace(/_/g, " ")}
                    </Badge>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => setReviewingId(s._id)}>
                      <Eye className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{t("admin.table.name")}</TableHead>
                  <TableHead>Role / Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center w-14">CV</TableHead>
                  <TableHead>{t("admin.table.status")}</TableHead>
                  <TableHead className="text-right">{t("admin.table.date")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s._id} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {s.profileId || "—"}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{s.fullName || "Unnamed"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {s.currentTitle}{s.currentCompany ? ` @ ${s.currentCompany}` : ""}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.location || "—"}</TableCell>
                    <TableCell className="text-center">
                      {s.talentBankCvStorageId ? (
                        <FileText
                          className="size-4 text-emerald-600 dark:text-emerald-400 inline"
                          aria-label="CV shared via Talent Bank"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[11px]", scoutStatusColors[s.status])}>
                        {s.status === "submitted" ? "pending" : s.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(s.submittedAt || s.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setReviewingId(s._id)}>
                        <Eye className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {reviewingId && (
        <ScoutReviewDialog
          scoutId={reviewingId}
          open
          onOpenChange={(v) => { if (!v) setReviewingId(null); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Scout Review Dialog
// ═══════════════════════════════════════════════════════════════

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 text-primary" />}
        {title}
      </h3>
      <div className="text-sm text-muted-foreground space-y-1">{children}</div>
    </div>
  );
}

function TagList({ items, label }: { items?: string[]; label: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <span className="text-xs font-medium text-foreground">{label}:</span>
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((item) => (
          <Badge key={item} variant="outline" className="text-[11px]">{item}</Badge>
        ))}
      </div>
    </div>
  );
}

function ScoutReviewDialog({
  scoutId,
  open,
  onOpenChange,
}: {
  scoutId: Id<"htScoutProfiles">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useUser();
  const profile = useQuery(api.headhunting.scoutProfiles.getById, { id: scoutId });
  const talentBankCvUrl = useQuery(
    api.files.getUrl,
    profile?.talentBankCvStorageId ? { storageId: profile.talentBankCvStorageId } : "skip"
  );
  const updateStatus = useMutation(api.headhunting.scoutProfiles.updateStatus);
  const removeScout = useMutation(api.headhunting.scoutProfiles.removeScout);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removalReason, setRemovalReason] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  const isReviewed = profile?.status === "approved" || profile?.status === "rejected";
  const isRemoved = profile?.status === "removed";

  const reviewerName = useMemo(() => {
    if (user?.fullName) return user.fullName;
    if (user?.firstName) return `${user.firstName} ${user.lastName || ""}`.trim();
    return "Admin";
  }, [user]);

  const handleAction = async (status: "under_review" | "approved" | "rejected") => {
    if (!profile) return;
    if (status === "rejected" && !reviewNotes.trim()) {
      setError("Review notes are required for rejection.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await updateStatus({
        id: scoutId,
        status,
        reviewedBy: reviewerName,
        reviewNotes: reviewNotes.trim() || undefined,
      });
      toast.success(
        status === "approved" ? "Scout approved" :
        status === "rejected" ? "Scout rejected" :
        "Marked as under review"
      );
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!profile) return;
    setIsRemoving(true);
    try {
      await removeScout({
        id: scoutId,
        removedBy: reviewerName,
        removalReason: removalReason.trim() || undefined,
      });
      toast.success("Scout removed. They can re-apply in the future.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove scout");
    } finally {
      setIsRemoving(false);
      setShowRemoveConfirm(false);
    }
  };

  if (!profile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scout Application</DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Scout Application
            {profile.profileId && (
              <Badge variant="outline" className="text-xs font-mono">{profile.profileId}</Badge>
            )}
            <Badge variant="secondary" className={cn("text-xs", scoutStatusColors[profile.status])}>
              {profile.status.replace(/_/g, " ")}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* S1: Personal Info */}
          <Section title="Personal Information" icon={User}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <p><span className="font-medium text-foreground">Name:</span> {profile.fullName}</p>
              <p><span className="font-medium text-foreground">Email:</span> {profile.email}</p>
              {profile.currentTitle && <p><span className="font-medium text-foreground">Title:</span> {profile.currentTitle}</p>}
              {profile.currentCompany && <p><span className="font-medium text-foreground">Company:</span> {profile.currentCompany}</p>}
              {profile.location && <p><span className="font-medium text-foreground">Location:</span> {profile.location}</p>}
              {profile.mobile && <p><span className="font-medium text-foreground">Mobile:</span> {profile.mobile}</p>}
            </div>
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                <Linkedin className="size-3" /> LinkedIn Profile
              </a>
            )}
            {profile.oneLiner && <p className="italic text-xs mt-1">&ldquo;{profile.oneLiner}&rdquo;</p>}
          </Section>

          {/* S2: Professional Base */}
          {profile.professionalBase && (
            <Section title="Professional Base" icon={Briefcase}>
              <p>{profile.professionalBase}{profile.professionalBaseOther ? ` — ${profile.professionalBaseOther}` : ""}</p>
            </Section>
          )}

          {/* S3-S4: Functions & Industries */}
          <Section title="Coverage Lanes" icon={Globe}>
            <TagList items={profile.functionPrimary} label="Primary Functions" />
            <TagList items={profile.functionSecondary} label="Secondary Functions" />
            {profile.functionBasis && <p className="text-xs"><span className="font-medium text-foreground">Basis:</span> {profile.functionBasis}</p>}
            <TagList items={profile.industryPrimary} label="Primary Industries" />
            <TagList items={profile.industrySecondary} label="Secondary Industries" />
            {profile.industryBasis && <p className="text-xs"><span className="font-medium text-foreground">Basis:</span> {profile.industryBasis}</p>}
          </Section>

          {/* S5-S6: Talent Access */}
          <Section title="Talent Access">
            <TagList items={profile.talentAccessSegments} label="Segments" />
            <TagList items={profile.talentAccessBasis} label="Access Basis" />
          </Section>

          {/* S7-S8: Hiring Experience */}
          <Section title="Hiring Experience">
            <TagList items={profile.hiringExperienceTypes} label="Experience Types" />
            <TagList items={profile.hiringScope} label="Hiring Scope" />
          </Section>

          {/* S10-S11: Geography */}
          <Section title="Geography" icon={MapPin}>
            <TagList items={profile.countriesSupported} label="Countries" />
            {profile.countriesOther && <p className="text-xs">Other: {profile.countriesOther}</p>}
            <TagList items={profile.hiringCorridors} label="Corridors" />
            {profile.corridorsOther && <p className="text-xs">Other: {profile.corridorsOther}</p>}
          </Section>

          {/* S12: Geography Exposure */}
          {profile.geographyExposure && profile.geographyExposure.length > 0 && (
            <Section title="Geography Exposure">
              {profile.geographyExposure.map((g, i) => (
                <div key={i} className="text-xs">
                  <span className="font-medium text-foreground">{g.geography}:</span>{" "}
                  {g.exposureTypes.join(", ")}
                </div>
              ))}
            </Section>
          )}

          {/* S13-S14: Mandate Strengths & Network */}
          <Section title="Mandate Strengths & Network">
            <TagList items={profile.mandateTypeStrengths} label="Strengths" />

          </Section>

          {/* S15: Communities */}
          {(profile.communitiesPrimary?.length || profile.communitiesAdditional?.length) && (
            <Section title="Communities">
              {profile.communitiesPrimary?.map((c, i) => (
                <p key={`p-${i}`} className="text-xs">{c.name}{c.role ? ` (${c.role})` : ""}</p>
              ))}
              {profile.communitiesAdditional?.map((c, i) => (
                <p key={`a-${i}`} className="text-xs text-muted-foreground">{c.name}{c.role ? ` (${c.role})` : ""}</p>
              ))}
            </Section>
          )}

          {/* S16: Involvement */}
          <Section title="Involvement Preferences">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <p><span className="font-medium text-foreground">Active Scouting:</span> {profile.activeScouting ? "Yes" : "No"}</p>
              <p><span className="font-medium text-foreground">Confidential Roles:</span> {profile.willingConfidential ? "Yes" : "No"}</p>
              <p><span className="font-medium text-foreground">Cross-border:</span> {profile.willingCrossBorder ? "Yes" : "No"}</p>
            </div>
            <TagList items={profile.involvementTypes} label="Involvement Types" />
            <TagList items={profile.preferredLevels} label="Preferred Levels" />
          </Section>

          {/* S17: Visibility */}
          {profile.visibility && (
            <Section title="Visibility Preference">
              <p className="text-xs">{profile.visibility.replace(/_/g, " ")}</p>
            </Section>
          )}

          {/* S18: Confirmations */}
          <Section title="Confirmations">
            <div className="space-y-0.5 text-xs">
              <p className="flex items-center gap-1">
                {profile.confirmMasterAcceptance ? <CheckCircle className="size-3 text-green-500" /> : <XCircle className="size-3 text-red-500" />}
                Master Service Acceptance
              </p>
              <p className="flex items-center gap-1">
                {profile.confirmEmployerTrust ? <CheckCircle className="size-3 text-green-500" /> : <XCircle className="size-3 text-red-500" />}
                Employer Trust Confirmation
              </p>
              <p className="flex items-center gap-1">
                {profile.confirmPlatformConduct ? <CheckCircle className="size-3 text-green-500" /> : <XCircle className="size-3 text-red-500" />}
                Platform Conduct Confirmation
              </p>
            </div>
          </Section>

          {/* Talent Bank — opt-in CV upload */}
          <Section title="Talent Bank" icon={FileText}>
            <div className="flex items-center gap-2">
              <Badge
                variant={profile.talentBankConsent ? "default" : "outline"}
                className="text-[11px]"
              >
                {profile.talentBankConsent ? "Opted in" : "Not opted in"}
              </Badge>
              {profile.talentBankCvStorageId ? (
                talentBankCvUrl ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                  >
                    <a
                      href={talentBankCvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText className="size-3" />
                      View CV
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" />
                    Loading CV link…
                  </span>
                )
              ) : (
                <span className="text-xs text-muted-foreground">No CV shared</span>
              )}
            </div>
          </Section>

          {/* Previous Review Info */}
          {isReviewed && profile.reviewedBy && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium">
                Reviewed by {profile.reviewedBy} on {profile.reviewedAt ? new Date(profile.reviewedAt).toLocaleDateString() : "—"}
              </p>
              {profile.reviewNotes && <p className="text-xs text-muted-foreground">{profile.reviewNotes}</p>}
            </div>
          )}

          {/* Removed Info */}
          {isRemoved && (
            <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 p-3 space-y-1">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-400 flex items-center gap-1">
                <UserMinus className="size-3.5" /> Removed from Scout Network
              </p>
              {(profile as { removedBy?: string }).removedBy && (
                <p className="text-xs text-muted-foreground">
                  By {(profile as { removedBy?: string }).removedBy}{(profile as { removedAt?: number }).removedAt ? ` on ${new Date((profile as { removedAt: number }).removedAt).toLocaleDateString()}` : ""}
                </p>
              )}
              {(profile as { removalReason?: string }).removalReason && (
                <p className="text-xs text-muted-foreground">Reason: {(profile as { removalReason?: string }).removalReason}</p>
              )}
              <p className="text-xs text-muted-foreground italic">This person can re-apply in the future.</p>
            </div>
          )}

          {/* Review Actions */}
          {!isReviewed && !isRemoved && (
            <div className="border-t border-border pt-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Review Notes</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => { setReviewNotes(e.target.value); setError(null); }}
                  placeholder="Optional notes (required for rejection)..."
                  rows={3}
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex items-center gap-2">
                {profile.status === "submitted" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction("under_review")}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                    Mark Under Review
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white gap-1"
                  onClick={() => handleAction("approved")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                  onClick={() => handleAction("rejected")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                  Reject
                </Button>
              </div>
            </div>
          )}

          {/* Remove from Scout Network (for approved scouts) */}
          {profile.status === "approved" && !isRemoved && (
            <div className="border-t border-border pt-4">
              {!showRemoveConfirm ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400"
                  onClick={() => setShowRemoveConfirm(true)}
                >
                  <UserMinus className="size-3.5" />
                  Remove from Scout Network
                </Button>
              ) : (
                <div className="rounded-lg border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-900/20 p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Remove from Scout Network?</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        This will deactivate their scout status. They can re-apply in the future.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Reason (optional — internal only)</Label>
                    <Textarea
                      value={removalReason}
                      onChange={(e) => setRemovalReason(e.target.value)}
                      placeholder="e.g. No longer active, terminated partnership..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowRemoveConfirm(false); setRemovalReason(""); }}
                      disabled={isRemoving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white gap-1"
                      onClick={handleRemove}
                      disabled={isRemoving}
                    >
                      {isRemoving ? <Loader2 className="size-3.5 animate-spin" /> : <UserMinus className="size-3.5" />}
                      Confirm Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
