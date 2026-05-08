"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Send,
  Upload,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
  Target,
  Ban,
  Lightbulb,
  Briefcase,
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

import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fireNotification } from "@/lib/notify";
import type { MatchLevel, Confidence, RequirementEvaluation, AggregateScores } from "@/lib/headhunting/ai/matching-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AssessmentResult {
  assessmentId: string;
  submissionId: string;
  evaluations: RequirementEvaluation[];
  aggregate: AggregateScores;
}

interface ScoutOverride {
  matchLevel: MatchLevel;
  justification: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MATCH_LEVEL_OPTIONS: MatchLevel[] = [
  "Matched",
  "Partially Matched",
  "Not Clearly Evident",
  "Not Matched",
  "Potential Red Flag",
];

function matchLevelColor(level: MatchLevel): string {
  switch (level) {
    case "Matched":             return "text-green-600";
    case "Partially Matched":   return "text-amber-600";
    case "Not Clearly Evident": return "text-amber-500";
    case "Not Matched":         return "text-red-500";
    case "Potential Red Flag":  return "text-red-700 font-semibold";
  }
}

function matchLevelBadge(level: MatchLevel) {
  const colors: Record<MatchLevel, string> = {
    "Matched":             "bg-green-100 text-green-800 border-green-200",
    "Partially Matched":   "bg-amber-100 text-amber-800 border-amber-200",
    "Not Clearly Evident": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Not Matched":         "bg-red-100 text-red-700 border-red-200",
    "Potential Red Flag":  "bg-red-200 text-red-900 border-red-400",
  };
  return colors[level] ?? "bg-muted text-muted-foreground border-border";
}

function recommendationColor(rec: AggregateScores["recommendation"]): string {
  switch (rec) {
    case "Strong":           return "text-green-700";
    case "Moderate":         return "text-amber-700";
    case "Weak":             return "text-orange-600";
    case "Not Recommended":  return "text-red-600";
  }
}

function recommendationBg(rec: AggregateScores["recommendation"]): string {
  switch (rec) {
    case "Strong":           return "bg-green-50 border-green-200";
    case "Moderate":         return "bg-amber-50 border-amber-200";
    case "Weak":             return "bg-orange-50 border-orange-200";
    case "Not Recommended":  return "bg-red-50 border-red-200";
  }
}

function isAmber(ev: RequirementEvaluation, override?: ScoutOverride): boolean {
  const level = override?.matchLevel ?? ev.matchLevel;
  return (
    level === "Partially Matched" ||
    level === "Not Clearly Evident" ||
    level === "Potential Red Flag" ||
    ev.confidence === "Low"
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewBriefDetailPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const params = useParams();
  const briefId = params.id as string;
  const userId = user?.id;

  const data = useQuery(
    api.headhunting.scouts.getNewBriefDetail,
    userId ? { briefId: briefId as Id<"htScoutBriefs">, scoutId: userId } : "skip"
  );
  const submitCandidate = useMutation(api.headhunting.scouts.submitCandidate);
  const saveScoutReview = useMutation(api.headhunting.candidateAssessment.saveScoutReview);

  // ── Form state (Stage 1: candidate info) ────────────────────────────────
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [form, setForm] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    confidence: "3",
    notes: "",
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvFileId, setCvFileId] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseSource, setParseSource] = useState<"ai" | "manual">("manual");

  // ── Assessment state (Stage 2: AI review) ───────────────────────────────
  const [stage, setStage] = useState<"form" | "assessing" | "review" | "confirm">("form");
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [pendingSubmissionId, setPendingSubmissionId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, ScoutOverride>>({});
  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  // ── Stage 3: confirmation ────────────────────────────────────────────────
  const [matrixConfirmed, setMatrixConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFullMatrix, setShowFullMatrix] = useState(false);

  // ── Upload & parse CV ────────────────────────────────────────────────────
  const generateUploadUrl = useMutation(api.headhunting.mandates.generateUploadUrl);

  const handleCvUpload = async (file: File) => {
    setCvFile(file);
    setParsing(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { storageId } = await uploadRes.json();
      setCvFileId(storageId);

      const formData = new FormData();
      formData.append("file", file);
      const parseRes = await fetch("/api/headhunting/parse-cv", {
        method: "POST",
        body: formData,
      });
      if (parseRes.ok) {
        const { data: parsed } = await parseRes.json();
        const cv = parsed?.parsedCV;
        if (cv) {
          setForm((f) => ({
            ...f,
            candidateName: cv.name || f.candidateName,
            candidateEmail: cv.email || f.candidateEmail,
            candidatePhone: cv.phone || f.candidatePhone,
          }));
          setParseSource("ai");
          toast.success("CV parsed — please review prefilled fields");
        }
      }
    } catch (err) {
      console.error("CV upload error:", err);
      toast.error("CV uploaded but auto-parse failed. Please fill manually.");
    } finally {
      setParsing(false);
    }
  };

  // ── Stage 1 -> 2: Submit candidate + trigger AI assessment ───────────────
  const handleSubmitAndAssess = async () => {
    if (!userId || !data?.mandateId || !form.candidateName.trim() || !form.candidateEmail.trim()) return;
    setStage("assessing");
    try {
      const submissionId = await submitCandidate({
        mandateId: data.mandateId,
        scoutId: userId,
        candidateName: form.candidateName,
        candidateEmail: form.candidateEmail,
        candidatePhone: form.candidatePhone || undefined,
        scoutConfidence: Number(form.confidence) || undefined,
        notes: form.notes || undefined,
        cvFileId: (cvFileId || undefined) as Id<"_storage"> | undefined,
      });

      setPendingSubmissionId(submissionId as string);

      // Notify admin about new submission (non-blocking)
      fireNotification("submission_received", {
        scoutName: user?.fullName || "Scout",
        scoutEmail: user?.primaryEmailAddress?.emailAddress || "",
        candidateName: form.candidateName,
        mandateTitle: data.mandateTitle || "Mandate",
        mandateId: data.mandateId,
      });

      // Trigger AI per-requirement matching
      const assessRes = await fetch("/api/headhunting/submissions/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          mandateId: data.mandateId,
        }),
      });

      if (!assessRes.ok) {
        toast.warning("AI assessment unavailable — submission saved. You can still confirm.");
        setStage("confirm");
        return;
      }

      const result = await assessRes.json();
      setAssessment({ ...result, submissionId });
      setOverrides({});
      setStage("review");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      toast.error(msg);
      setStage("form");
    }
  };

  // ── Scout overrides a requirement rating ─────────────────────────────────
  const handleOverride = (reqId: string, field: "matchLevel" | "justification", value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [reqId]: {
        matchLevel: field === "matchLevel"
          ? (value as MatchLevel)
          : (prev[reqId]?.matchLevel ?? assessment!.evaluations.find(e => e.requirementId === reqId)!.matchLevel),
        justification: field === "justification"
          ? value
          : (prev[reqId]?.justification ?? ""),
      },
    }));
  };

  // ── Stage 2 -> 3: Done reviewing, move to confirmation ───────────────
  const handleProceedToConfirm = () => {
    const missing = Object.entries(overrides).filter(
      ([, ov]) => ov.matchLevel && !ov.justification.trim()
    );
    if (missing.length > 0) {
      toast.error("Please add justification for all adjusted ratings before proceeding.");
      return;
    }
    setShowFullMatrix(false);
    setMatrixConfirmed(false);
    setStage("confirm");
  };

  // ── Stage 3: Final submit with overrides ────────────────────────────────
  const handleFinalSubmit = async () => {
    if (!matrixConfirmed || !pendingSubmissionId || !assessment) return;
    setSubmitting(true);
    try {
      const overrideList = Object.entries(overrides).map(([reqId, ov]) => ({
        requirementId: reqId,
        scoutMatchLevel: ov.matchLevel,
        scoutJustification: ov.justification,
      }));

      if (overrideList.length > 0) {
        await saveScoutReview({
          submissionId: pendingSubmissionId as Id<"htSubmissions">,
          overrides: overrideList,
        });
      }

      toast.success("Candidate submitted successfully.");
      setForm({ candidateName: "", candidateEmail: "", candidatePhone: "", confidence: "3", notes: "" });
      setCvFile(null);
      setCvFileId(null);
      setParseSource("manual");
      setAssessment(null);
      setOverrides({});
      setMatrixConfirmed(false);
      setStage("form");
      setShowSubmitForm(false);
    } catch (err) {
      toast.error("Failed to finalize submission");
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (data === undefined) {
    return <div className="mx-auto max-w-4xl py-12 text-center text-sm text-muted-foreground">{t("admin.loading")}</div>;
  }
  if (!data) {
    return <div className="mx-auto max-w-4xl py-12 text-center text-sm text-muted-foreground">Brief not found or access denied.</div>;
  }

  const { brief, clientHint, mySubmissions } = data;
  const flaggedEvals = assessment?.evaluations.filter(ev => isAmber(ev, overrides[ev.requirementId])) ?? [];
  const clearEvals = assessment?.evaluations.filter(ev => !isAmber(ev, overrides[ev.requirementId])) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Back */}
      <Link
        href="/headhunting/scout/briefs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        {t("scout.briefs.backToBriefs")}
      </Link>

      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold mb-2">{brief.roleTitle}</h1>
            <div className="flex items-center gap-3 flex-wrap text-sm">
              {brief.employerDisplay === "named" && brief.employerName ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Building2 className="size-3.5" />
                  {brief.employerName}
                </span>
              ) : clientHint ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Shield className="size-3.5" />
                  {clientHint}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Shield className="size-3.5" />
                  {t("scout.company.masked")}
                </span>
              )}
              {brief.location && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {brief.location}
                </span>
              )}
              {brief.functionAndLevel && (
                <Badge variant="outline" className="text-xs">
                  {brief.functionAndLevel}
                </Badge>
              )}
            </div>
          </div>
          {!showSubmitForm && data.mandateId && (
            <Button
              onClick={() => setShowSubmitForm(true)}
              className="shrink-0 gap-1.5"
            >
              <Send className="size-3.5" />
              {t("scout.briefs.submitCandidate")}
            </Button>
          )}
        </div>

        {/* Brief details */}
        <div className="mt-5 space-y-4">
          {/* Must Haves */}
          {brief.mustHaves.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                MUST HAVE
              </p>
              <ul className="space-y-1">
                {brief.mustHaves.map((m, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm">
                    <CheckCircle2 className="size-3.5 mt-0.5 shrink-0 text-green-600" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Critical Match Logic */}
          {brief.criticalMatchLogic && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Target className="size-3" />
                CRITICAL MATCH CRITERIA
              </p>
              <p className="text-sm text-foreground/80">{brief.criticalMatchLogic}</p>
            </div>
          )}

          {/* Deal Breakers */}
          {brief.dealBreakerLogic && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Ban className="size-3" />
                DEAL BREAKERS
              </p>
              <div className="space-y-1">
                {brief.dealBreakerLogic.split(";").map((d, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-sm">
                    <AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-red-500" />
                    {d.trim()}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Target Sectors */}
          {brief.targetSectorGuidance && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Briefcase className="size-3" />
                TARGET SECTORS
              </p>
              <p className="text-sm text-foreground/80">{brief.targetSectorGuidance}</p>
            </div>
          )}

          {/* Challenge Summary */}
          {brief.challengeSummary && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Lightbulb className="size-3" />
                CHALLENGE CONTEXT
              </p>
              <p className="text-sm text-foreground/80">{brief.challengeSummary}</p>
            </div>
          )}

          {/* Role Summary */}
          {brief.roleSummaryNarrative && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">ROLE OVERVIEW</p>
              <p className="text-sm text-foreground/80">{brief.roleSummaryNarrative}</p>
            </div>
          )}

          {/* Submission Guidance */}
          {brief.submissionGuidance && (
            <div className="rounded-md border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 p-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">SUBMISSION GUIDANCE</p>
              <p className="text-sm text-blue-800 dark:text-blue-300">{brief.submissionGuidance}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── STAGE 1: Candidate Info Form ── */}
      {showSubmitForm && stage === "form" && data.mandateId && (
        <div className="rounded-lg border border-primary/30 bg-card p-6 space-y-4">
          <h2 className="text-base font-semibold">{t("scout.briefs.submitCandidate")}</h2>

          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
            <label className="flex flex-col items-center gap-2 cursor-pointer">
              <Upload className="size-5 text-primary" />
              <span className="text-sm font-medium text-primary">
                {cvFile ? cvFile.name : "Upload CV (PDF/DOCX) — auto-fills candidate details"}
              </span>
              {parsing && <span className="text-xs text-muted-foreground animate-pulse">Parsing CV with AI...</span>}
              {parseSource === "ai" && !parsing && <span className="text-xs text-green-600">Fields prefilled from CV — please review</span>}
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCvUpload(file);
                }}
              />
            </label>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("scout.briefs.candidateName")} *</Label>
              <Input value={form.candidateName} onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("scout.briefs.candidateEmail")} *</Label>
              <Input type="email" value={form.candidateEmail} onChange={(e) => setForm((f) => ({ ...f, candidateEmail: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("scout.briefs.candidatePhone")}</Label>
              <Input value={form.candidatePhone} onChange={(e) => setForm((f) => ({ ...f, candidatePhone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("scout.briefs.confidence")}</Label>
              <Input type="number" min="1" max="5" value={form.confidence} onChange={(e) => setForm((f) => ({ ...f, confidence: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("scout.briefs.submitNotes")}</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSubmitForm(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitAndAssess}
              disabled={!form.candidateName.trim() || !form.candidateEmail.trim()}
              className="gap-1.5"
            >
              <Send className="size-3.5" />
              Submit & Assess
            </Button>
          </div>
        </div>
      )}

      {/* ── STAGE: AI Assessing ── */}
      {stage === "assessing" && (
        <div className="rounded-lg border border-primary/20 bg-card p-8 flex flex-col items-center gap-3">
          <Loader2 className="size-6 text-primary animate-spin" />
          <p className="text-sm font-medium">Evaluating candidate against requirement matrix...</p>
          <p className="text-xs text-muted-foreground">AI is assessing each requirement individually. This takes ~15 seconds.</p>
        </div>
      )}

      {/* ── STAGE 2: Scout Review UI ── */}
      {stage === "review" && assessment && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className={cn("rounded-lg border p-5", recommendationBg(assessment.aggregate.recommendation))}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">AI Assessment Summary</h2>
              <Badge className={cn("text-xs font-semibold", recommendationColor(assessment.aggregate.recommendation))}>
                {assessment.aggregate.recommendation}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{assessment.aggregate.overallMatchPct}%</p>
                <p className="text-xs text-muted-foreground">Overall Match</p>
              </div>
              <div>
                <p className={cn("text-2xl font-bold", assessment.aggregate.mandatoryMatchPct < 60 ? "text-red-600" : "text-foreground")}>
                  {assessment.aggregate.mandatoryMatchPct}%
                </p>
                <p className="text-xs text-muted-foreground">Mandatory Match</p>
              </div>
              <div>
                <p className={cn("text-2xl font-bold", assessment.aggregate.riskFlagCount > 0 ? "text-red-600" : "text-green-600")}>
                  {assessment.aggregate.riskFlagCount}
                </p>
                <p className="text-xs text-muted-foreground">Risk Flags</p>
              </div>
            </div>
          </div>

          {/* Flagged items */}
          {flaggedEvals.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="size-4" />
                {flaggedEvals.length} item{flaggedEvals.length > 1 ? "s" : ""} need your review
              </h3>

              {flaggedEvals.map((ev) => {
                const override = overrides[ev.requirementId];
                const currentLevel = override?.matchLevel ?? ev.matchLevel;
                const isExpanded = expandedReq === ev.requirementId;

                return (
                  <div key={ev.requirementId} className="rounded-md border border-amber-200 bg-white p-3 space-y-2">
                    <div
                      className="flex items-start justify-between cursor-pointer gap-2"
                      onClick={() => setExpandedReq(isExpanded ? null : ev.requirementId)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{ev.requirementId}</p>
                        <span className={cn("text-xs mt-1 inline-block", matchLevelColor(currentLevel))}>
                          {override ? `Adjusted: ${currentLevel}` : currentLevel}
                          {ev.confidence === "Low" && !override && " (Low confidence)"}
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp className="size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
                    </div>

                    {isExpanded && (
                      <div className="space-y-2 pt-1 border-t border-amber-100">
                        {ev.evidence && (
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium">EVIDENCE FOUND</p>
                            <p className="text-xs mt-0.5">{ev.evidence}</p>
                          </div>
                        )}
                        {ev.missingEvidence && (
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium">NOT FOUND</p>
                            <p className="text-xs mt-0.5 text-amber-700">{ev.missingEvidence}</p>
                          </div>
                        )}
                        {ev.concern && (
                          <div>
                            <p className="text-[11px] text-red-600 font-medium">CONCERN</p>
                            <p className="text-xs mt-0.5 text-red-700">{ev.concern}</p>
                          </div>
                        )}

                        {/* Scout override */}
                        <div className="pt-1 space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">ADJUST RATING (optional)</Label>
                          <Select
                            value={override?.matchLevel ?? ev.matchLevel}
                            onValueChange={(v) => handleOverride(ev.requirementId, "matchLevel", v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MATCH_LEVEL_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {override?.matchLevel && (
                            <Textarea
                              placeholder="Justification required — why are you adjusting this rating?"
                              value={override.justification}
                              onChange={(e) => handleOverride(ev.requirementId, "justification", e.target.value)}
                              rows={2}
                              className="text-xs"
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Clear matches summary */}
          {clearEvals.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-800 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" />
                  {clearEvals.length} requirement{clearEvals.length > 1 ? "s" : ""} clearly assessed
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-green-700 h-7 gap-1"
                  onClick={() => setShowFullMatrix(!showFullMatrix)}
                >
                  <Eye className="size-3" />
                  {showFullMatrix ? "Hide" : "View all"}
                </Button>
              </div>
              {showFullMatrix && (
                <div className="mt-3 space-y-1.5">
                  {clearEvals.map(ev => (
                    <div key={ev.requirementId} className="flex items-center justify-between text-xs py-1 border-b border-green-100 last:border-0">
                      <span className="text-foreground">{ev.requirementId}</span>
                      <span className={cn("font-medium", matchLevelColor(overrides[ev.requirementId]?.matchLevel ?? ev.matchLevel))}>
                        {overrides[ev.requirementId]?.matchLevel ?? ev.matchLevel}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setStage("form"); setAssessment(null); }}>
              Back
            </Button>
            <Button onClick={handleProceedToConfirm} className="gap-1.5">
              Proceed to Confirm
            </Button>
          </div>
        </div>
      )}

      {/* ── STAGE 3: Full Matrix Confirmation ── */}
      {stage === "confirm" && assessment && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-base font-semibold">Confirm Submission</h2>
          <p className="text-sm text-muted-foreground">
            Review the full requirement matrix below. You must acknowledge this before submitting.
          </p>

          <div className="rounded-lg border border-border divide-y divide-border">
            {assessment.evaluations.map((ev) => {
              const override = overrides[ev.requirementId];
              const level = override?.matchLevel ?? ev.matchLevel;
              return (
                <div key={ev.requirementId} className="flex items-center justify-between px-3 py-2 gap-3">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{ev.requirementId}</span>
                  <span className="text-xs flex-1 min-w-0 truncate">{ev.evidence || ev.missingEvidence || "—"}</span>
                  <span className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0",
                    matchLevelBadge(level)
                  )}>
                    {override ? "adj. " : ""}{level}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <input
              id="matrix-confirm"
              type="checkbox"
              checked={matrixConfirmed}
              onChange={(e) => setMatrixConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-primary cursor-pointer"
            />
            <label htmlFor="matrix-confirm" className="text-sm cursor-pointer">
              I have reviewed the full requirement matrix and confirm this candidate is a genuine match
              for this mandate based on my own assessment.
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setStage("review")}>Back to Review</Button>
            <Button
              onClick={handleFinalSubmit}
              disabled={!matrixConfirmed || submitting}
              className="gap-1.5"
            >
              <Send className="size-3.5" />
              {submitting ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </div>
        </div>
      )}

      {/* My submissions */}
      {mySubmissions && mySubmissions.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <FileText className="size-4" />
            {t("scout.briefs.mySubmissions")} ({mySubmissions.length})
          </h3>
          <div className="space-y-2">
            {mySubmissions.map((sub) => (
              <div key={sub._id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                <span>{sub.candidateName}</span>
                <Badge variant="outline" className="text-[10px]">{sub.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
