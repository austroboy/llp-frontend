"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  FileText,
  Sparkles,
  Loader2,
  MessageSquare,
  Send,
  ChevronRight,
  X,
  ExternalLink,
  Shield,
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fireNotification } from "@/lib/notify";
import { ShortlistBuilder } from "@/components/admin/headhunting/shortlist-builder";

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
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  screening: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  shortlisted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  interview: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  selected: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  offer: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  joined: "bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  withdrawn: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

const ragColors: Record<string, string> = {
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  amber: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const SUBMISSION_STATUSES = [
  "submitted", "screening", "shortlisted", "interview",
  "selected", "offer", "joined", "rejected", "withdrawn",
];

export default function ScreeningWorkbenchPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const params = useParams();
  const mandateId = params.id as string;

  const mandate = useQuery(api.headhunting.mandates.getById, { id: mandateId as Id<"htMandates"> });
  const submissions = useQuery(api.headhunting.screening.getSubmissionsByMandate, { mandateId: mandateId as Id<"htMandates"> });
  const updateStatus = useMutation(api.headhunting.screening.updateSubmissionStatus);
  const bulkUpdate = useMutation(api.headhunting.screening.bulkUpdateStatus);
  const addComment = useMutation(api.headhunting.screening.addScreeningComment);
  const saveAiAnalysis = useMutation(api.headhunting.screening.saveAiAnalysis);
  const upsertScreening = useMutation(api.headhunting.screening.upsertScreeningRecord);
  const createPlacement = useMutation(api.headhunting.placements.create);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [placementDialog, setPlacementDialog] = useState<{ subId: string; name: string } | null>(null);
  const [placementForm, setPlacementForm] = useState({ salary: "", feeFormula: "percentage:20" });

  const detailSub = useQuery(
    api.headhunting.screening.getSubmissionDetail,
    detailId ? { id: detailId as Id<"htSubmissions"> } : "skip"
  );

  if (!mandate || !submissions) {
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

  const filtered = filterStatus === "all"
    ? submissions
    : submissions.filter((s) => s.status === filterStatus);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (status: "shortlisted" | "rejected" | "screening") => {
    if (selected.size === 0) return;
    try {
      await bulkUpdate({ ids: Array.from(selected) as Id<"htSubmissions">[], status });
      toast.success(`${selected.size} submissions updated`);
      setSelected(new Set());
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleSingleStatus = async (id: string, status: string) => {
    // If moving to "offer", open placement creation dialog first
    if (status === "offer") {
      const sub = submissions.find((s) => s._id === id);
      setPlacementDialog({ subId: id, name: sub?.candidateName ?? "Candidate" });
      return;
    }
    try {
      const sub = submissions.find((s) => s._id === id);
      await updateStatus({ id: id as Id<"htSubmissions">, status: status as "submitted" });
      // Notify scout about status change (non-blocking)
      if (sub?.scoutName) {
        fireNotification("submission_status_changed", {
          scoutName: sub.scoutName,
          scoutEmail: "",
          candidateName: sub.candidateName,
          mandateTitle: mandate.rawTitle,
          oldStatus: sub.status,
          newStatus: status,
        });
      }
      toast.success("Status updated");
    } catch {
      toast.error("Failed");
    }
  };

  const handleCreatePlacement = async () => {
    if (!placementDialog) return;
    try {
      await createPlacement({
        mandateId: mandateId as Id<"htMandates">,
        submissionId: placementDialog.subId as Id<"htSubmissions">,
        salary: placementForm.salary ? Number(placementForm.salary) : undefined,
        feeFormula: placementForm.feeFormula || undefined,
      });
      // Notify about placement
      fireNotification("placement_created", {
        scoutName: "Scout",
        scoutEmail: "",
        candidateName: placementDialog.name,
        mandateTitle: mandate.rawTitle,
        clientName: mandate.client?.companyName ?? "Client",
        salary: placementForm.salary ? Number(placementForm.salary) : undefined,
      });
      toast.success(`Placement created for ${placementDialog.name}`);
      setPlacementDialog(null);
      setPlacementForm({ salary: "", feeFormula: "percentage:20" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create placement");
    }
  };

  const shortlistedCount = submissions.filter((s) => s.status === "shortlisted").length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex gap-0 h-[calc(100vh-4rem)] relative">
      {/* Left: Candidate table */}
      <div className={cn(
        "flex-1 overflow-y-auto space-y-4 p-4 transition-all",
        detailId ? "max-w-[55%]" : "max-w-5xl mx-auto"
      )}>
        <motion.section
          variants={heroStagger}
          initial="hidden"
          animate="show"
        >
        <motion.div variants={fadeUp}>
          <Link
            href={`/admin/headhunting/mandates/${mandateId}`}
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
            {mandate.rawTitle}
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="lf-kicker">
              <span className="lf-kicker-mark">§ 2.2</span>
              Admin · Headhunting · Workbench
            </span>
            <h1
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: "clamp(28px, 3.6vw, 40px)",
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                margin: "var(--s-3) 0 var(--s-2)",
              }}
            >
              Screening{" "}
              <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
                Workbench.
              </em>
            </h1>
            <p
              className="lf-section-deck"
              style={{ margin: 0, fontSize: 14 }}
            >
              {submissions.length} candidates — {shortlistedCount} shortlisted
            </p>
          </div>
          {selected.size > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleBulkAction("screening")} className="text-xs gap-1">
                <AlertTriangle className="size-3" /> Screening ({selected.size})
              </Button>
              <Button size="sm" onClick={() => handleBulkAction("shortlisted")} className="text-xs gap-1">
                <CheckCircle2 className="size-3" /> Shortlist ({selected.size})
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkAction("rejected")} className="text-xs gap-1">
                <XCircle className="size-3" /> Reject ({selected.size})
              </Button>
            </div>
          )}
        </motion.div>
        </motion.section>

        {/* Filter badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant={filterStatus === "all" ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setFilterStatus("all")}>
            All ({submissions.length})
          </Badge>
          {SUBMISSION_STATUSES.map((s) => {
            const count = submissions.filter((sub) => sub.status === s).length;
            if (count === 0) return null;
            return (
              <Badge key={s} variant={filterStatus === s ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setFilterStatus(s)}>
                {s} ({count})
              </Badge>
            );
          })}
        </div>

        {/* Shortlist Builder */}
        {submissions.some((s) => s.status === "shortlisted") && (
          <ShortlistBuilder
            mandateId={mandateId}
            mandateTitle={mandate.rawTitle}
            submissions={submissions}
          />
        )}

        {/* Table */}
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={() => {
                      if (selected.size === filtered.length) setSelected(new Set());
                      else setSelected(new Set(filtered.map((s) => s._id)));
                    }}
                    className="size-4"
                  />
                </TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Fit</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Scout</TableHead>
                <TableHead>{t("admin.headhunting.status")}</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow
                  key={sub._id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selected.has(sub._id) && "bg-primary/5",
                    detailId === sub._id && "bg-primary/10 border-l-2 border-l-primary"
                  )}
                  onClick={() => setDetailId(sub._id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(sub._id)} onChange={() => toggleSelect(sub._id)} className="size-4" />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{sub.candidateName}</p>
                      <p className="text-xs text-muted-foreground">{sub.candidateEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {sub.aiFitScore != null ? (
                      <Badge variant="secondary" className={cn("text-[11px]",
                        sub.aiFitScore >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        sub.aiFitScore >= 50 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      )}>
                        {sub.aiFitScore}%
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{sub.sourceChannel}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sub.scoutName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[11px]", statusColors[sub.status])}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select value={sub.status} onValueChange={(v) => handleSingleStatus(sub._id, v)}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUBMISSION_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Right: Detail panel */}
      {detailId && detailSub && (
        <CandidateDetailPanel
          submission={detailSub}
          onClose={() => setDetailId(null)}
          onAddComment={async (text: string) => {
            if (!user) return;
            await addComment({
              submissionId: detailId as Id<"htSubmissions">,
              author: user.fullName || user.id,
              text,
            });
          }}
          onRunAiAnalysis={async () => {
            if (!detailSub.cvUrl || !detailSub.blueprint) return;
            toast.info("Running AI analysis on CV...");
            try {
              const res = await fetch("/api/headhunting/parse-cv", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: `Candidate: ${detailSub.candidateName}\nEmail: ${detailSub.candidateEmail}\nCV URL: ${detailSub.cvUrl}`,
                  blueprint: detailSub.blueprint,
                }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error);

              const { parsedCV, gaps, fitScore } = json.data;

              await saveAiAnalysis({
                submissionId: detailId as Id<"htSubmissions">,
                aiCvSummary: parsedCV?.summary,
                aiParsedData: parsedCV ? {
                  name: parsedCV.name ?? undefined,
                  currentTitle: parsedCV.currentTitle ?? undefined,
                  currentCompany: parsedCV.currentCompany ?? undefined,
                  yearsExperience: parsedCV.yearsExperience ?? undefined,
                  skills: parsedCV.skills || [],
                  education: parsedCV.education || [],
                  experience: parsedCV.experience || [],
                  salary: parsedCV.salary ?? undefined,
                  location: parsedCV.location ?? undefined,
                  noticePeriod: parsedCV.noticePeriod ?? undefined,
                } : undefined,
                aiFitScore: fitScore?.overallScore,
                aiFitDetails: {
                  criticalMatches: fitScore?.criticalMatches,
                  generalMatches: fitScore?.generalMatches,
                  gaps: gaps?.gaps,
                  strengths: gaps?.strengths,
                  risks: gaps?.risks,
                  complianceFlags: gaps?.complianceFlags,
                },
              });
              toast.success("AI analysis saved");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "AI analysis failed");
            }
          }}
          onSaveScreening={async (data: { fitScore?: number; ragFlag?: "red" | "amber" | "green"; roleMatchNotes?: string }) => {
            if (!user) return;
            await upsertScreening({
              submissionId: detailId as Id<"htSubmissions">,
              reviewedBy: user.fullName || user.id,
              ...data,
            });
            toast.success("Screening notes saved");
          }}
        />
      )}

      {/* Placement Creation Dialog */}
      <Dialog open={!!placementDialog} onOpenChange={(v) => !v && setPlacementDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Placement — {placementDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Moving to &quot;offer&quot; will create a placement record with fee calculation and protection window.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Monthly Salary (BDT)</Label>
              <Input
                type="number"
                placeholder="e.g. 150000"
                value={placementForm.salary}
                onChange={(e) => setPlacementForm((f) => ({ ...f, salary: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fee Formula</Label>
              <Select value={placementForm.feeFormula} onValueChange={(v) => setPlacementForm((f) => ({ ...f, feeFormula: v }))}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage:15" className="text-xs">15% of annual</SelectItem>
                  <SelectItem value="percentage:20" className="text-xs">20% of annual</SelectItem>
                  <SelectItem value="percentage:25" className="text-xs">25% of annual</SelectItem>
                  <SelectItem value="tiered:15:20:25" className="text-xs">Tiered (15/20/25%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setPlacementDialog(null)}>Cancel</Button>
              <Button size="sm" onClick={handleCreatePlacement}>Create Placement</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </MotionConfig>
  );
}

// ═══════════════════════════════════════════════════════════════
// Candidate Detail Panel
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CandidateDetailPanel({ submission: sub, onClose, onAddComment, onRunAiAnalysis, onSaveScreening }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submission: any;
  onClose: () => void;
  onAddComment: (text: string) => Promise<void>;
  onRunAiAnalysis: () => Promise<void>;
  onSaveScreening: (data: { fitScore?: number; ragFlag?: "red" | "amber" | "green"; roleMatchNotes?: string }) => Promise<void>;
}) {
  const [commentText, setCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [tab, setTab] = useState<"overview" | "fit" | "notes">("overview");
  const [manualNotes, setManualNotes] = useState(sub.screeningRecord?.roleMatchNotes || "");
  const [manualRag, setManualRag] = useState<string>(sub.screeningRecord?.ragFlag || "");
  const [manualFit, setManualFit] = useState(String(sub.screeningRecord?.fitScore || ""));

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setAddingComment(true);
    try {
      await onAddComment(commentText.trim());
      setCommentText("");
    } finally {
      setAddingComment(false);
    }
  };

  const handleAi = async () => {
    setAiRunning(true);
    try {
      await onRunAiAnalysis();
    } finally {
      setAiRunning(false);
    }
  };

  return (
    <div className="w-[45%] border-l border-border bg-card overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="size-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">{sub.candidateName}</h3>
            <p className="text-xs text-muted-foreground">{sub.candidateEmail}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-4">
        {(["overview", "fit", "notes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-2 text-xs font-medium border-b-2 transition-colors capitalize",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {tab === "overview" && (
          <>
            {/* Quick stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="secondary" className={cn("text-[11px] mt-1", statusColors[sub.status])}>
                  {sub.status}
                </Badge>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Fit Score</p>
                <p className="text-lg font-bold mt-0.5">
                  {sub.aiFitScore != null ? `${sub.aiFitScore}%` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Source</p>
                <Badge variant="outline" className="text-[10px] mt-1">{sub.sourceChannel}</Badge>
                {sub.scoutName && <p className="text-[10px] text-muted-foreground mt-0.5">{sub.scoutName}</p>}
              </div>
            </div>

            {/* CV Viewer */}
            {sub.cvUrl && (
              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-xs font-medium flex items-center gap-1">
                    <FileText className="size-3" /> CV
                  </span>
                  <a href={sub.cvUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1">
                      <ExternalLink className="size-3" /> Open
                    </Button>
                  </a>
                </div>
                <iframe
                  src={sub.cvUrl}
                  className="w-full h-[calc(100vh-200px)] min-h-[600px] rounded-b-lg"
                  title="CV Preview"
                />
              </div>
            )}

            {/* AI Summary */}
            {sub.aiCvSummary && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <h4 className="text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="size-3 text-primary" /> AI Summary
                </h4>
                <p className="text-xs leading-relaxed">{sub.aiCvSummary}</p>
              </div>
            )}

            {/* AI Parsed Data */}
            {sub.aiParsedData && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <h4 className="text-xs font-semibold">Extracted Profile</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {sub.aiParsedData.currentTitle && (
                    <div><span className="text-muted-foreground">Title:</span> {sub.aiParsedData.currentTitle}</div>
                  )}
                  {sub.aiParsedData.currentCompany && (
                    <div><span className="text-muted-foreground">Company:</span> {sub.aiParsedData.currentCompany}</div>
                  )}
                  {sub.aiParsedData.yearsExperience && (
                    <div><span className="text-muted-foreground">Experience:</span> {sub.aiParsedData.yearsExperience} years</div>
                  )}
                  {sub.aiParsedData.location && (
                    <div><span className="text-muted-foreground">Location:</span> {sub.aiParsedData.location}</div>
                  )}
                  {sub.aiParsedData.salary && (
                    <div><span className="text-muted-foreground">Salary:</span> {sub.aiParsedData.salary}</div>
                  )}
                  {sub.aiParsedData.noticePeriod && (
                    <div><span className="text-muted-foreground">Notice:</span> {sub.aiParsedData.noticePeriod}</div>
                  )}
                </div>
                {sub.aiParsedData.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sub.aiParsedData.skills.map((s: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Run AI button */}
            {sub.blueprint && (
              <Button
                onClick={handleAi}
                disabled={aiRunning}
                variant="outline"
                className="w-full gap-2 text-xs"
              >
                {aiRunning ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Running AI Analysis...</>
                ) : (
                  <><Sparkles className="size-3.5" /> {sub.aiFitScore != null ? "Re-run" : "Run"} AI Analysis</>
                )}
              </Button>
            )}
          </>
        )}

        {tab === "fit" && (
          <>
            {/* Compliance flags */}
            {sub.aiFitDetails?.complianceFlags?.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-3 space-y-1">
                <h4 className="text-xs font-semibold flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <Shield className="size-3" /> Compliance Flags
                </h4>
                {sub.aiFitDetails.complianceFlags.map((f: string, i: number) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400">• {f}</p>
                ))}
              </div>
            )}

            {/* Critical matches */}
            {sub.aiFitDetails?.criticalMatches?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold flex items-center gap-1">
                  <Target className="size-3 text-primary" /> Critical Match Points
                </h4>
                {sub.aiFitDetails.criticalMatches.map((m: { point: string; met: boolean; score: number; reason: string }, i: number) => (
                  <div key={i} className="rounded border border-border p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium flex items-center gap-1">
                        {m.met ? <CheckCircle2 className="size-3 text-green-600" /> : <XCircle className="size-3 text-red-500" />}
                        {m.point}
                      </span>
                      <Badge variant="secondary" className={cn("text-[10px]",
                        m.score >= 70 ? "bg-green-100 text-green-700" :
                        m.score >= 50 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-600"
                      )}>
                        {m.score}%
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{m.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {/* General matches */}
            {sub.aiFitDetails?.generalMatches?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold">General Match Points</h4>
                {sub.aiFitDetails.generalMatches.map((m: { point: string; score: number; reason: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs rounded border border-border p-2">
                    <div className="flex-1">
                      <p className="font-medium">{m.point}</p>
                      <p className="text-[11px] text-muted-foreground">{m.reason}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] ml-2">{m.score}%</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Strengths & Gaps & Risks */}
            {sub.aiFitDetails?.strengths?.length > 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 p-3 space-y-1">
                <h4 className="text-xs font-semibold flex items-center gap-1 text-green-700 dark:text-green-400">
                  <TrendingUp className="size-3" /> Strengths
                </h4>
                {sub.aiFitDetails.strengths.map((s: string, i: number) => (
                  <p key={i} className="text-xs text-green-700 dark:text-green-400">• {s}</p>
                ))}
              </div>
            )}

            {sub.aiFitDetails?.gaps?.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-3 space-y-1">
                <h4 className="text-xs font-semibold flex items-center gap-1 text-red-700 dark:text-red-400">
                  <TrendingDown className="size-3" /> Gaps
                </h4>
                {sub.aiFitDetails.gaps.map((g: string, i: number) => (
                  <p key={i} className="text-xs text-red-700 dark:text-red-400">• {g}</p>
                ))}
              </div>
            )}

            {sub.aiFitDetails?.risks?.length > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800 p-3 space-y-1">
                <h4 className="text-xs font-semibold flex items-center gap-1 text-orange-700 dark:text-orange-400">
                  <AlertCircle className="size-3" /> Risks
                </h4>
                {sub.aiFitDetails.risks.map((r: string, i: number) => (
                  <p key={i} className="text-xs text-orange-700 dark:text-orange-400">• {r}</p>
                ))}
              </div>
            )}

            {!sub.aiFitDetails && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Sparkles className="size-6 mx-auto mb-2 text-muted-foreground/50" />
                <p>No AI fit analysis yet.</p>
                <p className="text-xs mt-1">Run AI Analysis from the Overview tab.</p>
              </div>
            )}
          </>
        )}

        {tab === "notes" && (
          <>
            {/* Manual screening form */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <h4 className="text-xs font-semibold">Screening Assessment</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Manual Fit Score (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={manualFit}
                    onChange={(e) => setManualFit(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">RAG Flag</label>
                  <Select value={manualRag} onValueChange={setManualRag}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="green" className="text-xs">Green — Strong</SelectItem>
                      <SelectItem value="amber" className="text-xs">Amber — Needs Review</SelectItem>
                      <SelectItem value="red" className="text-xs">Red — Concerns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Role Match Notes</label>
                <Textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  rows={3}
                  className="text-xs"
                  placeholder="Assessment notes..."
                />
              </div>
              <Button
                size="sm"
                className="text-xs"
                onClick={() => onSaveScreening({
                  fitScore: manualFit ? Number(manualFit) : undefined,
                  ragFlag: (manualRag as "red" | "amber" | "green") || undefined,
                  roleMatchNotes: manualNotes || undefined,
                })}
              >
                Save Assessment
              </Button>
            </div>

            {/* RAG flag display */}
            {sub.screeningRecord?.ragFlag && (
              <Badge variant="secondary" className={cn("text-xs", ragColors[sub.screeningRecord.ragFlag])}>
                RAG: {sub.screeningRecord.ragFlag.toUpperCase()}
              </Badge>
            )}

            {/* Comments */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold flex items-center gap-1">
                <MessageSquare className="size-3" /> Comments
              </h4>

              {sub.screeningRecord?.comments?.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sub.screeningRecord.comments.map((c: { author: string; text: string; timestamp: number }, i: number) => (
                    <div key={i} className="text-xs border-l-2 border-primary/30 pl-2 py-1">
                      <p className="text-muted-foreground">
                        <span className="font-medium">{c.author}</span> — {new Date(c.timestamp).toLocaleString()}
                      </p>
                      <p className="mt-0.5">{c.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No comments yet.</p>
              )}

              <div className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="text-xs flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleComment}
                  disabled={addingComment || !commentText.trim()}
                  className="self-end"
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
