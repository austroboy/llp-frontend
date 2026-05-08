"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { fireNotification } from "@/lib/notify";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  Building2,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Shield,
  CheckCircle2,
  Send,
  AlertTriangle,
  Sparkles,
  Loader2,
  LayoutGrid,
  Play,
  ShieldCheck,
  ListChecks,
  UserCheck,
  Briefcase,
  HandCoins,
  ThumbsUp,
  LogIn,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getStatusBadgeClasses } from "@/lib/headhunting/status-labels";

const ADMIN_EMAIL = "support@laborlawpartner.com";

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

const bpStatusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  internal_approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  client_approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  released: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const MANDATE_STATUSES = [
  "received", "clarification", "architecture", "internal_review",
  "client_review", "approved", "released", "paused", "filled", "closed",
];

export default function MandateDetailPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const params = useParams();
  const mandateId = params.id as string;

  const mandate = useQuery(
    api.headhunting.mandates.getById,
    { id: mandateId as Id<"htMandates"> }
  );
  const blueprint = useQuery(
    api.headhunting.blueprints.getLatestByMandate,
    { mandateId: mandateId as Id<"htMandates"> }
  );
  const submissions = useQuery(
    api.headhunting.screening.getSubmissionsByMandate,
    { mandateId: mandateId as Id<"htMandates"> }
  );

  if (mandate === undefined) {
    return (
      <div
        style={{
          padding: "var(--s-7) var(--s-4)",
          textAlign: "center",
          fontFamily: "var(--lf-mono)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-4)",
        }}
      >
        {t("admin.loading")}
      </div>
    );
  }
  if (!mandate) {
    return (
      <div
        style={{
          padding: "var(--s-7) var(--s-4)",
          textAlign: "center",
          fontFamily: "var(--lf-mono)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-4)",
        }}
      >
        Mandate not found.
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      {/* -- Hero ---------------------------------------------- */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-5)" }}
      >
        <motion.div variants={fadeUp}>
          <Link
            href="/admin/headhunting"
            className="lf-meta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-4)",
              textDecoration: "none",
              marginBottom: "var(--s-3)",
            }}
          >
            <ArrowLeft className="size-3.5" />
            {t("admin.headhunting.title")}
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ 2.2</span>
          Admin · Headhunting · Mandate
        </motion.div>

        <motion.div
          variants={fadeUp}
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--r-lg)",
            padding: "var(--s-5)",
            marginTop: "var(--s-3)",
          }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div style={{ flex: 1, minWidth: 280 }}>
              <h1
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: "clamp(28px, 3.6vw, 40px)",
                  fontWeight: 400,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                  margin: "0 0 var(--s-2)",
                }}
              >
                <em
                  style={{
                    fontStyle: "italic",
                    color: "var(--accent-blue)",
                  }}
                >
                  {mandate.rawTitle}
                </em>
              </h1>
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <span
                  className="lf-meta"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: "var(--ink-4)",
                  }}
                >
                  <Building2 className="size-3.5" />
                  {mandate.client?.companyName ?? "—"}
                </span>
                <Badge variant="secondary" className={cn("text-xs", mandateStatusColors[mandate.status])}>
                  {t(`admin.headhunting.status.${mandate.status}`)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t(`admin.headhunting.mandateType.${mandate.mandateType}`)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t(`admin.headhunting.urgency.${mandate.urgency}`)}
                </Badge>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p
                className="lf-meta"
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ink-4)",
                }}
              >
                {new Date(mandate.createdAt).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-2">
                <Link href={`/admin/headhunting/mandates/${mandateId}/matrix`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1">
                    <LayoutGrid className="size-3" />
                    Requirement Matrix
                  </Button>
                </Link>
                <Link href={`/admin/headhunting/workbench/${mandateId}`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1">
                    <FileText className="size-3" />
                    Workbench ({mandate.submissionCount})
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {mandate.rawDescription && (
            <p
              style={{
                fontSize: 14,
                color: "var(--ink-3)",
                marginTop: "var(--s-3)",
                whiteSpace: "pre-wrap",
                margin: "var(--s-3) 0 0",
              }}
            >
              {mandate.rawDescription}
            </p>
          )}
        </motion.div>
      </motion.section>

      {/* -- Body ---------------------------------------------- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-5)",
        }}
      >
        {/* Two column: Status + Log | Blueprint */}
        <motion.div variants={fadeUp} className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <StatusTransition
              mandateId={mandate._id}
              currentStatus={mandate.status}
              mandateTitle={mandate.rawTitle}
              clientName={mandate.client?.companyName ?? "Unknown"}
            />
            <CommunicationLog mandateId={mandate._id} log={mandate.communicationLog ?? []} />
          </div>
          <div className="lg:col-span-2">
            <BlueprintBuilder
              mandateId={mandate._id as Id<"htMandates">}
              mandateTitle={mandate.rawTitle}
              blueprint={blueprint}
            />
          </div>
        </motion.div>

        {/* Pipeline: Submission Cards with Quick Actions */}
        <motion.div variants={fadeUp}>
          <SubmissionPipeline
            submissions={submissions ?? []}
            mandateTitle={mandate.rawTitle}
            mandateId={mandate._id}
          />
        </motion.div>
      </motion.section>
    </MotionConfig>
  );
}

// ═══════════════════════════════════════════════════════════════
// Submission Pipeline — Quick-action buttons per submission
// ═══════════════════════════════════════════════════════════════

type PipelineAction = {
  label: string;
  targetStatus: string;
  icon: React.ReactNode;
  variant?: "default" | "outline" | "destructive";
  needsReason?: boolean;
};

const PIPELINE_ACTIONS: Record<string, PipelineAction[]> = {
  submitted_to_llp: [
    { label: "Start Review", targetStatus: "under_review", icon: <Play className="size-3" /> },
  ],
  under_review: [
    { label: "Mark Verified", targetStatus: "verified", icon: <ShieldCheck className="size-3" /> },
    { label: "Reject", targetStatus: "rejected", icon: <X className="size-3" />, variant: "destructive", needsReason: true },
  ],
  verified: [
    { label: "Add to Shortlist", targetStatus: "shortlist_shared", icon: <ListChecks className="size-3" /> },
  ],
  shortlist_shared: [
    { label: "Move to Interview", targetStatus: "interview", icon: <UserCheck className="size-3" /> },
  ],
  interview: [
    { label: "Offer Stage", targetStatus: "offer_stage", icon: <Briefcase className="size-3" /> },
    { label: "Reject", targetStatus: "rejected", icon: <X className="size-3" />, variant: "destructive", needsReason: true },
  ],
  offer_stage: [
    { label: "Extend Offer", targetStatus: "offer_extended", icon: <HandCoins className="size-3" /> },
  ],
  offer_extended: [
    { label: "Record Acceptance", targetStatus: "offer_accepted", icon: <ThumbsUp className="size-3" /> },
  ],
  offer_accepted: [
    { label: "Record Joining", targetStatus: "joined", icon: <LogIn className="size-3" /> },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SubmissionPipeline({ submissions, mandateTitle, mandateId }: { submissions: any[]; mandateTitle: string; mandateId: string }) {
  const { t } = useLanguage();
  const updateStatus = useMutation(api.headhunting.screening.updateSubmissionStatus);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleAction = async (submissionId: string, targetStatus: string, candidateName: string) => {
    setActionLoading(`${submissionId}-${targetStatus}`);
    try {
      await updateStatus({
        id: submissionId as Id<"htSubmissions">,
        status: targetStatus as "submitted",
      });
      toast.success(`${candidateName} moved to ${targetStatus.replace(/_/g, " ")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActionLoading(`${rejectTarget.id}-rejected`);
    try {
      await updateStatus({
        id: rejectTarget.id as Id<"htSubmissions">,
        status: "rejected",
        rejectionReason: rejectReason.trim(),
      });
      toast.success(`${rejectTarget.name} rejected`);
      setRejectTarget(null);
      setRejectReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
          <ListChecks className="size-4 text-primary" />
          Pipeline
        </h2>
        <p className="text-sm text-muted-foreground">No submissions yet for this mandate.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <ListChecks className="size-4 text-primary" />
        Pipeline
        <Badge variant="outline" className="text-[10px] ml-1">{submissions.length}</Badge>
      </h2>

      <div className="space-y-3">
        {submissions.map((sub) => {
          const actions = PIPELINE_ACTIONS[sub.status] ?? [];
          const candidateName = sub.candidateName || "Unknown";
          return (
            <div
              key={sub._id}
              className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3"
            >
              {/* Candidate info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <a
                    href={`/admin/headhunting/workbench/${mandateId}`}
                    className="text-sm font-medium truncate hover:underline text-primary"
                  >
                    {candidateName}
                  </a>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {sub.scoutName && <span>via {sub.scoutName}</span>}
                    {sub.candidateEmail && <span>{sub.candidateEmail}</span>}
                    {sub.cvUrl && <span className="text-emerald-600 font-medium">CV attached</span>}
                  </div>
                </div>
              </div>

              {/* Status badge + actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn(getStatusBadgeClasses(sub.status), "whitespace-nowrap")}>
                  {sub.status.replace(/_/g, " ")}
                </span>
                {actions.map((action) => {
                  const loadKey = `${sub._id}-${action.targetStatus}`;
                  const isLoading = actionLoading === loadKey;
                  if (action.needsReason) {
                    return (
                      <Button
                        key={action.targetStatus}
                        variant={action.variant ?? "outline"}
                        size="sm"
                        className="text-xs gap-1 h-7"
                        disabled={isLoading}
                        onClick={() => setRejectTarget({ id: sub._id, name: candidateName })}
                      >
                        {action.icon}
                        {action.label}
                      </Button>
                    );
                  }
                  return (
                    <Button
                      key={action.targetStatus}
                      variant={action.variant ?? "outline"}
                      size="sm"
                      className="text-xs gap-1 h-7"
                      disabled={isLoading}
                      onClick={() => handleAction(sub._id, action.targetStatus, candidateName)}
                    >
                      {isLoading ? <Loader2 className="size-3 animate-spin" /> : action.icon}
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reject reason modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg space-y-4">
            <h3 className="text-sm font-semibold">Reject {rejectTarget.name}</h3>
            <p className="text-xs text-muted-foreground">
              Please provide a reason for rejecting this candidate.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason..."
              rows={3}
              className="text-xs"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs gap-1"
                disabled={!rejectReason.trim() || actionLoading === `${rejectTarget.id}-rejected`}
                onClick={handleReject}
              >
                {actionLoading === `${rejectTarget.id}-rejected` ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <X className="size-3" />
                )}
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Status Transition
// ═══════════════════════════════════════════════════════════════

function StatusTransition({ mandateId, currentStatus, mandateTitle, clientName }: {
  mandateId: string; currentStatus: string; mandateTitle: string; clientName: string;
}) {
  const { t } = useLanguage();
  const updateStatus = useMutation(api.headhunting.mandates.updateStatus);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    if (newStatus === currentStatus) return;
    setSaving(true);
    try {
      await updateStatus({
        id: mandateId as Id<"htMandates">,
        status: newStatus as "received",
        note: note.trim() || undefined,
      });
      // Fire email notification for status change
      fireNotification("mandate_status_changed", {
        mandateTitle,
        clientName,
        oldStatus: currentStatus,
        newStatus,
        note: note.trim() || undefined,
        recipientEmail: ADMIN_EMAIL,
        recipientName: "Team",
        mandateId,
      });
      // Special notification for clarification status
      if (newStatus === "clarification") {
        fireNotification("mandate_clarification", {
          mandateTitle,
          clientName,
          recipientEmail: ADMIN_EMAIL,
          recipientName: clientName,
          questions: note.trim() || undefined,
          mandateId,
        });
      }
      // Notify scouts when mandate is filled/paused/closed
      if (["filled", "paused", "closed"].includes(newStatus)) {
        fireNotification("mandate_closed", {
          scoutName: "Scout",
          scoutEmail: ADMIN_EMAIL,
          mandateTitle,
          newStatus,
          note: note.trim() || undefined,
        });
      }
      toast.success("Status updated");
      setNote("");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">{t("admin.headhunting.statusTransition")}</h3>
      <Select value={newStatus} onValueChange={setNewStatus}>
        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MANDATE_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {t(`admin.headhunting.status.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder={t("admin.headhunting.addNote")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="text-xs"
      />
      <Button
        size="sm"
        onClick={handleUpdate}
        disabled={saving || newStatus === currentStatus}
        className="w-full text-xs"
      >
        {t("admin.headhunting.statusTransition")}
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Communication Log
// ═══════════════════════════════════════════════════════════════

function CommunicationLog({
  mandateId,
  log,
}: {
  mandateId: string;
  log: { timestamp: number; channel: string; note: string }[];
}) {
  const { t } = useLanguage();
  const addLog = useMutation(api.headhunting.mandates.addCommunicationLog);
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!note.trim()) return;
    setAdding(true);
    try {
      await addLog({ id: mandateId as Id<"htMandates">, channel: "internal", note: note.trim() });
      setNote("");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <MessageSquare className="size-3.5" />
        {t("admin.headhunting.commLog")}
      </h3>
      {log.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("admin.headhunting.noLog")}</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {[...log].reverse().map((entry, i) => (
            <div key={i} className="text-xs border-l-2 border-primary/30 pl-2 py-1">
              <p className="text-muted-foreground">
                {new Date(entry.timestamp).toLocaleString()} — <span className="font-medium">{entry.channel}</span>
              </p>
              <p>{entry.note}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder={t("admin.headhunting.addNote")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="text-xs flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={adding || !note.trim()}>
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Blueprint Builder
// ═══════════════════════════════════════════════════════════════

interface BlueprintData {
  _id?: string;
  title: string;
  function: string;
  seniority: string;
  department: string;
  reportingLine: string;
  location: string;
  travelRequired: boolean;
  businessStage: string;
  stakeholderComplexity: string;
  environmentDescription: string;
  mustHaves: string;
  dealBreakers: string;
  criticalMatchPoints: string;
  generalMatchPoints: string;
  targetSectors: string;
  searchNotes: string;
  confidentialityLevel: "full_mask" | "partial_clue" | "disclosed";
  shortlistMin: string;
  shortlistMax: string;
  compensationMode: "revenue_share" | "fixed_bounty";
  status?: string;
  version?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blueprintToForm(bp: any): BlueprintData {
  return {
    _id: bp._id,
    title: bp.title ?? "",
    function: bp.function ?? "",
    seniority: bp.seniority ?? "",
    department: bp.department ?? "",
    reportingLine: bp.reportingLine ?? "",
    location: bp.location ?? "",
    travelRequired: bp.travelRequired ?? false,
    businessStage: bp.businessStage ?? "",
    stakeholderComplexity: bp.stakeholderComplexity ?? "",
    environmentDescription: bp.environmentDescription ?? "",
    mustHaves: (bp.mustHaves ?? []).join("\n"),
    dealBreakers: (bp.dealBreakers ?? []).join("\n"),
    criticalMatchPoints: (bp.criticalMatchPoints ?? []).join("\n"),
    generalMatchPoints: (bp.generalMatchPoints ?? []).join("\n"),
    targetSectors: (bp.targetSectors ?? []).join(", "),
    searchNotes: bp.searchNotes ?? "",
    confidentialityLevel: bp.confidentialityLevel ?? "full_mask",
    shortlistMin: String(bp.shortlistMin ?? 6),
    shortlistMax: String(bp.shortlistMax ?? 10),
    compensationMode: bp.compensationMode ?? "revenue_share",
    status: bp.status,
    version: bp.version,
  };
}

const emptyBlueprint = (title: string): BlueprintData => ({
  title,
  function: "",
  seniority: "",
  department: "",
  reportingLine: "",
  location: "",
  travelRequired: false,
  businessStage: "",
  stakeholderComplexity: "",
  environmentDescription: "",
  mustHaves: "",
  dealBreakers: "",
  criticalMatchPoints: "",
  generalMatchPoints: "",
  targetSectors: "",
  searchNotes: "",
  confidentialityLevel: "full_mask",
  shortlistMin: "6",
  shortlistMax: "10",
  compensationMode: "revenue_share",
});

function BlueprintBuilder({
  mandateId,
  mandateTitle,
  blueprint: existingBp,
}: {
  mandateId: Id<"htMandates">;
  mandateTitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blueprint: any;
}) {
  const { t } = useLanguage();
  const { user } = useUser();
  const createBp = useMutation(api.headhunting.blueprints.create);
  const updateBp = useMutation(api.headhunting.blueprints.update);
  const approveBp = useMutation(api.headhunting.blueprints.approve);
  const clientApproveBp = useMutation(api.headhunting.blueprints.clientApprove);
  const releaseBp = useMutation(api.headhunting.blueprints.release);

  const [form, setForm] = useState<BlueprintData>(
    existingBp ? blueprintToForm(existingBp) : emptyBlueprint(mandateTitle)
  );
  const [saving, setSaving] = useState(false);
  const [aiExtracting, setAiExtracting] = useState(false);
  const [jdText, setJdText] = useState("");
  const [showJdInput, setShowJdInput] = useState(false);
  const [complianceBrief, setComplianceBrief] = useState<{
    applicableSections: Array<{ section: string; document: string; summary: string; relevance: string }>;
    keyObligations: string[];
    riskAreas: string[];
    contractClauses: string[];
  } | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);

  const isNew = !form._id;
  const isDraft = form.status === "draft" || isNew;

  const handleAiExtract = async () => {
    if (!jdText.trim() || jdText.trim().length < 20) {
      toast.error("Please paste a job description with at least 20 characters.");
      return;
    }
    setAiExtracting(true);
    try {
      const res = await fetch("/api/headhunting/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: jdText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");

      const d = json.data;
      setForm((f) => ({
        ...f,
        title: d.title || f.title,
        function: d.function || f.function,
        seniority: d.seniority || f.seniority,
        department: d.department || f.department,
        reportingLine: d.reportingLine || f.reportingLine,
        location: d.location || f.location,
        businessStage: d.businessStage || f.businessStage,
        environmentDescription: d.environmentDescription || f.environmentDescription,
        mustHaves: (d.mustHaves || []).join("\n") || f.mustHaves,
        dealBreakers: (d.dealBreakers || []).join("\n") || f.dealBreakers,
        criticalMatchPoints: (d.criticalMatchPoints || []).join("\n") || f.criticalMatchPoints,
        generalMatchPoints: (d.generalMatchPoints || []).join("\n") || f.generalMatchPoints,
        targetSectors: (d.targetSectors || []).join(", ") || f.targetSectors,
      }));
      setShowJdInput(false);
      setJdText("");
      toast.success("Blueprint fields populated from JD");
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : "AI extraction failed"));
    } finally {
      setAiExtracting(false);
    }
  };

  const handleComplianceCheck = async () => {
    if (!form.title.trim()) { toast.error("Save blueprint first"); return; }
    setComplianceLoading(true);
    try {
      const res = await fetch("/api/headhunting/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          function: form.function || undefined,
          seniority: form.seniority || undefined,
          location: form.location || undefined,
          mustHaves: form.mustHaves.split("\n").filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setComplianceBrief(json.data);
      toast.success("Compliance brief generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Compliance check failed");
    } finally {
      setComplianceLoading(false);
    }
  };

  const linesToArray = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
  const commaToArray = (s: string) => s.split(",").map((l) => l.trim()).filter(Boolean);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        await createBp({
          mandateId,
          title: form.title,
          function: form.function || undefined,
          seniority: form.seniority || undefined,
          department: form.department || undefined,
          reportingLine: form.reportingLine || undefined,
          location: form.location || undefined,
          travelRequired: form.travelRequired || undefined,
          businessStage: form.businessStage || undefined,
          stakeholderComplexity: form.stakeholderComplexity || undefined,
          environmentDescription: form.environmentDescription || undefined,
          mustHaves: linesToArray(form.mustHaves),
          dealBreakers: linesToArray(form.dealBreakers).length > 0 ? linesToArray(form.dealBreakers) : undefined,
          criticalMatchPoints: linesToArray(form.criticalMatchPoints),
          generalMatchPoints: linesToArray(form.generalMatchPoints).length > 0 ? linesToArray(form.generalMatchPoints) : undefined,
          targetSectors: commaToArray(form.targetSectors).length > 0 ? commaToArray(form.targetSectors) : undefined,
          searchNotes: form.searchNotes || undefined,
          confidentialityLevel: form.confidentialityLevel,
          shortlistMin: Number(form.shortlistMin) || 6,
          shortlistMax: Number(form.shortlistMax) || 10,
          compensationMode: form.compensationMode,
        });
      } else {
        await updateBp({
          id: form._id as Id<"htRoleBlueprints">,
          title: form.title,
          function: form.function || undefined,
          seniority: form.seniority || undefined,
          department: form.department || undefined,
          reportingLine: form.reportingLine || undefined,
          location: form.location || undefined,
          travelRequired: form.travelRequired || undefined,
          businessStage: form.businessStage || undefined,
          stakeholderComplexity: form.stakeholderComplexity || undefined,
          environmentDescription: form.environmentDescription || undefined,
          mustHaves: linesToArray(form.mustHaves),
          dealBreakers: linesToArray(form.dealBreakers).length > 0 ? linesToArray(form.dealBreakers) : undefined,
          criticalMatchPoints: linesToArray(form.criticalMatchPoints),
          generalMatchPoints: linesToArray(form.generalMatchPoints).length > 0 ? linesToArray(form.generalMatchPoints) : undefined,
          targetSectors: commaToArray(form.targetSectors).length > 0 ? commaToArray(form.targetSectors) : undefined,
          searchNotes: form.searchNotes || undefined,
          confidentialityLevel: form.confidentialityLevel,
          shortlistMin: Number(form.shortlistMin) || 6,
          shortlistMax: Number(form.shortlistMax) || 10,
          compensationMode: form.compensationMode,
        });
      }
      toast.success(t("admin.headhunting.blueprint.saved"));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!form._id || !user) return;
    try {
      await approveBp({ id: form._id as Id<"htRoleBlueprints">, approvedBy: user.id });
      toast.success(t("admin.headhunting.blueprint.approved"));
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleClientApprove = async () => {
    if (!form._id || !user) return;
    try {
      await clientApproveBp({ id: form._id as Id<"htRoleBlueprints">, clientApprovedBy: user.id });
      toast.success(t("admin.headhunting.blueprint.approved"));
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleRelease = async () => {
    if (!form._id) return;
    try {
      await releaseBp({ id: form._id as Id<"htRoleBlueprints"> });
      // Notify admin that blueprint is released and scouts can now be matched
      fireNotification("mandate_released", {
        scoutName: "Team",
        scoutEmail: ADMIN_EMAIL,
        mandateTitle,
        roleTitle: form.title || undefined,
        location: form.location || undefined,
        seniority: form.seniority || undefined,
        disclosureLevel: "disclosed",
      });
      toast.success(t("admin.headhunting.blueprint.approved"));
    } catch (e) {
      toast.error(String(e));
    }
  };

  const u = (key: keyof BlueprintData, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          {t("admin.headhunting.blueprint")}
          {form.version && (
            <Badge variant="outline" className="text-[10px]">
              v{form.version}
            </Badge>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJdInput(!showJdInput)}
              className="gap-1.5 text-xs"
            >
              <Sparkles className="size-3.5" />
              AI Extract from JD
            </Button>
          )}
          {form.status && (
            <Badge variant="secondary" className={cn("text-xs", bpStatusColors[form.status])}>
              {t(`admin.headhunting.blueprint.status.${form.status}`)}
            </Badge>
          )}
        </div>
      </div>

      {/* AI JD Input */}
      {showJdInput && isDraft && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="size-3 text-primary" />
            Paste Job Description
          </Label>
          <Textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the full job description here. AI will extract structured requirements into the blueprint fields below..."
            rows={6}
            className="text-xs"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAiExtract}
              disabled={aiExtracting || jdText.trim().length < 20}
              className="gap-1.5 text-xs"
            >
              {aiExtracting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Extract Requirements
                </>
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowJdInput(false); setJdText(""); }} className="text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">{t("admin.headhunting.blueprint.title")} *</Label>
          <Input value={form.title} onChange={(e) => u("title", e.target.value)} disabled={!isDraft} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("admin.headhunting.blueprint.function")}</Label>
          <Input value={form.function} onChange={(e) => u("function", e.target.value)} disabled={!isDraft} placeholder="e.g. Human Resources" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("admin.headhunting.blueprint.seniority")}</Label>
          <Input value={form.seniority} onChange={(e) => u("seniority", e.target.value)} disabled={!isDraft} placeholder="e.g. Director" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("admin.headhunting.blueprint.department")}</Label>
          <Input value={form.department} onChange={(e) => u("department", e.target.value)} disabled={!isDraft} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("admin.headhunting.blueprint.reportingLine")}</Label>
          <Input value={form.reportingLine} onChange={(e) => u("reportingLine", e.target.value)} disabled={!isDraft} placeholder="e.g. Reports to CEO" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("admin.headhunting.blueprint.location")}</Label>
          <Input value={form.location} onChange={(e) => u("location", e.target.value)} disabled={!isDraft} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("admin.headhunting.blueprint.businessStage")}</Label>
          <Input value={form.businessStage} onChange={(e) => u("businessStage", e.target.value)} disabled={!isDraft} placeholder="e.g. Growth, Turnaround" />
        </div>
      </div>

      <Separator />

      {/* Must-Haves + Deal Breakers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-primary">{t("admin.headhunting.blueprint.mustHaves")} *</Label>
          <p className="text-[11px] text-muted-foreground">{t("admin.headhunting.blueprint.mustHavesHint")}</p>
          <Textarea value={form.mustHaves} onChange={(e) => u("mustHaves", e.target.value)} rows={4} disabled={!isDraft} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-destructive">{t("admin.headhunting.blueprint.dealBreakers")}</Label>
          <p className="text-[11px] text-muted-foreground">{t("admin.headhunting.blueprint.dealBreakersHint")}</p>
          <Textarea value={form.dealBreakers} onChange={(e) => u("dealBreakers", e.target.value)} rows={4} disabled={!isDraft} />
        </div>
      </div>

      {/* Match Points */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">{t("admin.headhunting.blueprint.criticalMatch")} *</Label>
          <p className="text-[11px] text-muted-foreground">{t("admin.headhunting.blueprint.criticalMatchHint")}</p>
          <Textarea value={form.criticalMatchPoints} onChange={(e) => u("criticalMatchPoints", e.target.value)} rows={4} disabled={!isDraft} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("admin.headhunting.blueprint.generalMatch")}</Label>
          <p className="text-[11px] text-muted-foreground">{t("admin.headhunting.blueprint.generalMatchHint")}</p>
          <Textarea value={form.generalMatchPoints} onChange={(e) => u("generalMatchPoints", e.target.value)} rows={4} disabled={!isDraft} />
        </div>
      </div>

      {/* Sectors + Search Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t("admin.headhunting.blueprint.targetSectors")}</Label>
        <p className="text-[11px] text-muted-foreground">{t("admin.headhunting.blueprint.targetSectorsHint")}</p>
        <Input value={form.targetSectors} onChange={(e) => u("targetSectors", e.target.value)} disabled={!isDraft} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1">
          <Shield className="size-3 text-muted-foreground" />
          {t("admin.headhunting.blueprint.searchNotes")}
        </Label>
        <p className="text-[11px] text-muted-foreground">{t("admin.headhunting.blueprint.searchNotesHint")}</p>
        <Textarea value={form.searchNotes} onChange={(e) => u("searchNotes", e.target.value)} rows={3} disabled={!isDraft} />
      </div>

      <Separator />

      {/* Confidentiality + Shortlist + Compensation */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("admin.headhunting.blueprint.confidentiality")}</Label>
          <Select value={form.confidentialityLevel} onValueChange={(v) => u("confidentialityLevel", v)} disabled={!isDraft}>
            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full_mask">{t("admin.headhunting.confidentiality.full_mask")}</SelectItem>
              <SelectItem value="partial_clue">{t("admin.headhunting.confidentiality.partial_clue")}</SelectItem>
              <SelectItem value="disclosed">{t("admin.headhunting.confidentiality.disclosed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("admin.headhunting.blueprint.shortlistRange")}</Label>
          <div className="flex gap-2">
            <Input type="number" value={form.shortlistMin} onChange={(e) => u("shortlistMin", e.target.value)} disabled={!isDraft} className="text-xs" placeholder={t("admin.headhunting.blueprint.shortlistMin")} />
            <Input type="number" value={form.shortlistMax} onChange={(e) => u("shortlistMax", e.target.value)} disabled={!isDraft} className="text-xs" placeholder={t("admin.headhunting.blueprint.shortlistMax")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("admin.headhunting.blueprint.compensationMode")}</Label>
          <Select value={form.compensationMode} onValueChange={(v) => u("compensationMode", v)} disabled={!isDraft}>
            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue_share">{t("admin.headhunting.blueprint.compensationMode.revenue_share")}</SelectItem>
              <SelectItem value="fixed_bounty">{t("admin.headhunting.blueprint.compensationMode.fixed_bounty")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Compliance Brief */}
      {form._id && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold flex items-center gap-1">
              <Shield className="size-3 text-amber-600" />
              Compliance Brief
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleComplianceCheck}
              disabled={complianceLoading || !form.title.trim()}
              className="text-[10px] gap-1 h-7"
            >
              {complianceLoading ? (
                <><Loader2 className="size-3 animate-spin" /> Checking...</>
              ) : (
                <><Shield className="size-3" /> {complianceBrief ? "Refresh" : "Generate"} Compliance Brief</>
              )}
            </Button>
          </div>

          {complianceBrief && (
            <div className="space-y-3">
              {complianceBrief.applicableSections.length > 0 && (
                <div className="space-y-1">
                  {complianceBrief.applicableSections.map((s, i) => (
                    <div key={i} className={cn("text-xs rounded border p-2",
                      s.relevance === "high" ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800" :
                      s.relevance === "medium" ? "border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800" :
                      "border-border"
                    )}>
                      <p className="font-medium">{s.section} <span className="text-muted-foreground">({s.document})</span></p>
                      <p className="text-muted-foreground mt-0.5">{s.summary}</p>
                    </div>
                  ))}
                </div>
              )}
              {complianceBrief.keyObligations.length > 0 && (
                <div className="text-xs">
                  <p className="font-semibold text-primary mb-1">Key Obligations</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    {complianceBrief.keyObligations.map((o, i) => <li key={i}>• {o}</li>)}
                  </ul>
                </div>
              )}
              {complianceBrief.riskAreas.length > 0 && (
                <div className="text-xs">
                  <p className="font-semibold text-destructive mb-1">Risk Areas</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    {complianceBrief.riskAreas.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
              )}
              {complianceBrief.contractClauses.length > 0 && (
                <div className="text-xs">
                  <p className="font-semibold mb-1">Suggested Contract Clauses</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    {complianceBrief.contractClauses.map((c, i) => <li key={i}>• {c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <Separator />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {isDraft && (
            <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="gap-1.5 text-xs">
              <CheckCircle2 className="size-3.5" />
              {saving ? "Saving..." : isNew ? t("admin.headhunting.blueprint.create") : t("admin.headhunting.blueprint.save")}
            </Button>
          )}
          {form.status === "draft" && form._id && (
            <Button variant="outline" onClick={handleApprove} className="gap-1.5 text-xs">
              <CheckCircle2 className="size-3.5" />
              {t("admin.headhunting.blueprint.approve")}
            </Button>
          )}
          {form.status === "internal_approved" && (
            <Button variant="outline" onClick={handleClientApprove} className="gap-1.5 text-xs">
              <CheckCircle2 className="size-3.5" />
              {t("admin.headhunting.blueprint.clientApprove")}
            </Button>
          )}
          {form.status === "client_approved" && (
            <Button onClick={handleRelease} className="gap-1.5 text-xs">
              <Send className="size-3.5" />
              {t("admin.headhunting.blueprint.release")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
