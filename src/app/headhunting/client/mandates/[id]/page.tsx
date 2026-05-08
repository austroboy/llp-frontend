"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  User,
  Shield,
  Send,
  Calendar,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type CandidateDecision = "interview" | "pass" | "more_info";

interface PerCandidateFeedback {
  decision: CandidateDecision;
  comment: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ragColor(flag?: string | null): string {
  switch (flag) {
    case "green": return "bg-green-500";
    case "amber": return "bg-amber-400";
    case "red":   return "bg-red-500";
    default:      return "bg-muted-foreground/40";
  }
}

function ragLabel(flag?: string | null): string {
  switch (flag) {
    case "green": return "Strong fit";
    case "amber": return "Potential fit";
    case "red":   return "Concerns noted";
    default:      return "Under review";
  }
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function statusBadgeClass(status: string): string {
  if (["released", "client_approved", "approved"].includes(status))
    return "bg-green-100 text-green-700 border-green-200";
  if (["internal_review", "client_review", "internal_approved"].includes(status))
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (["received", "diagnostic", "architecture"].includes(status))
    return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-muted text-muted-foreground border-border";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClientMandateDetailPage() {
  const params = useParams();
  const mandateId = params.id as string;

  const mandate = useQuery(api.headhunting.mandates.getById, {
    id: mandateId as Id<"htMandates">,
  });
  const blueprint = useQuery(api.headhunting.blueprints.getLatestByMandate, {
    mandateId: mandateId as Id<"htMandates">,
  });
  const shortlistPack = useQuery(api.headhunting.screening.getShortlistByMandate, {
    mandateId: mandateId as Id<"htMandates">,
  });
  const submissions = useQuery(api.headhunting.screening.getSubmissionsByMandate, {
    mandateId: mandateId as Id<"htMandates">,
  });

  const clientApproveBp = useMutation(api.headhunting.blueprints.clientApprove);
  const saveClientFeedback = useMutation(api.headhunting.screening.saveClientFeedback);
  const updateStatus = useMutation(api.headhunting.screening.updateSubmissionStatus);

  // Blueprint approval state
  const [approving, setApproving] = useState(false);
  const [changeRequest, setChangeRequest] = useState("");
  const [showChangeForm, setShowChangeForm] = useState(false);

  // Shortlist feedback state
  const [overallFeedback, setOverallFeedback] = useState("");
  const [submittingOverall, setSubmittingOverall] = useState(false);
  const [perCandidate, setPerCandidate] = useState<Record<string, PerCandidateFeedback>>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  if (!mandate) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  const shortlisted = (submissions ?? []).filter(
    (s) => s.status === "shortlisted" || s.status === "interview"
  );

  // ── Blueprint approval ────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!blueprint?._id) return;
    setApproving(true);
    try {
      await clientApproveBp({
        id: blueprint._id as Id<"htRoleBlueprints">,
        clientApprovedBy: "client",
      });
      toast.success("Blueprint approved — LLP will begin sourcing.");
    } catch {
      toast.error("Failed to approve. Please try again.");
    } finally {
      setApproving(false);
    }
  };

  // ── Per-candidate decision ────────────────────────────────────────────────

  const handleCandidateDecision = async (
    submissionId: string,
    decision: CandidateDecision
  ) => {
    setUpdatingStatus(submissionId);
    try {
      const newStatus =
        decision === "interview" ? "interview" :
        decision === "pass" ? "rejected" :
        "shortlisted"; // "more_info" keeps it in shortlisted

      await updateStatus({
        id: submissionId as Id<"htSubmissions">,
        status: newStatus as "interview" | "rejected" | "shortlisted",
        rejectionReason: perCandidate[submissionId]?.comment || undefined,
      });

      setPerCandidate((prev) => ({
        ...prev,
        [submissionId]: {
          ...prev[submissionId],
          decision,
          comment: prev[submissionId]?.comment ?? "",
        },
      }));

      toast.success(
        decision === "interview" ? "Marked for interview" :
        decision === "pass" ? "Passed" :
        "Flagged for more information"
      );
    } catch {
      toast.error("Failed to update. Please try again.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ── Overall feedback submit ───────────────────────────────────────────────

  const handleOverallFeedback = async () => {
    if (!shortlistPack || !overallFeedback.trim()) return;
    setSubmittingOverall(true);
    try {
      await saveClientFeedback({
        id: shortlistPack._id,
        feedback: overallFeedback.trim(),
        status: "reviewed",
      });
      toast.success("Feedback submitted.");
      setOverallFeedback("");
    } catch {
      toast.error("Failed to submit feedback.");
    } finally {
      setSubmittingOverall(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const bpAwaitingApproval = blueprint?.status === "internal_approved";
  const shortlistSent = shortlistPack?.status === "sent";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Back */}
      <Link
        href="/headhunting/client"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Mandates
      </Link>

      {/* ── Mandate Header ── */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold mb-1">{mandate.rawTitle}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap mt-1">
              {mandate.client?.companyName && (
                <span className="flex items-center gap-1">
                  <Building2 className="size-3.5" />
                  {mandate.client.companyName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {new Date(mandate.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric"
                })}
              </span>
            </div>
          </div>
          <Badge className={cn("text-xs border shrink-0", statusBadgeClass(mandate.status))}>
            {statusLabel(mandate.status)}
          </Badge>
        </div>

        {/* Pipeline numbers */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-xl font-bold">{mandate.submissionCount ?? 0}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Candidates reviewed</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-xl font-bold">{mandate.submissionsByStatus?.shortlisted ?? 0}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Shortlisted</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-xl font-bold">{mandate.submissionsByStatus?.interview ?? 0}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Interviewing</p>
          </div>
        </div>
      </div>

      {/* ── Blueprint Approval ── */}
      {blueprint && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Role Blueprint</h2>
            <Badge className={cn("text-xs border",
              ["client_approved", "released"].includes(blueprint.status)
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-amber-100 text-amber-700 border-amber-200"
            )}>
              {blueprint.status === "client_approved" ? "Approved by you" :
               blueprint.status === "released" ? "Active — sourcing in progress" :
               "Awaiting your approval"}
            </Badge>
          </div>

          {/* Key requirements — clean, no scoring language */}
          <div className="space-y-3">
            {(blueprint.mustHaves ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">KEY REQUIREMENTS</p>
                <ul className="space-y-1.5">
                  {(blueprint.mustHaves ?? []).map((mh: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="size-3.5 mt-0.5 shrink-0 text-primary" />
                      {mh}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(blueprint.dealBreakers ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">DISQUALIFYING FACTORS</p>
                <ul className="space-y-1.5">
                  {(blueprint.dealBreakers ?? []).map((db: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-destructive" />
                      {db}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm pt-1">
              {blueprint.function && (
                <div className="text-muted-foreground">Function: <span className="text-foreground">{blueprint.function}</span></div>
              )}
              {blueprint.seniority && (
                <div className="text-muted-foreground">Seniority: <span className="text-foreground">{blueprint.seniority}</span></div>
              )}
              {blueprint.location && (
                <div className="text-muted-foreground">Location: <span className="text-foreground">{blueprint.location}</span></div>
              )}
            </div>
          </div>

          {/* Awaiting approval CTA */}
          {bpAwaitingApproval && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Shield className="size-4 text-primary" />
                This blueprint is awaiting your approval
              </p>
              <p className="text-xs text-muted-foreground">
                Please review the requirements above. Once approved, LLP will begin sourcing candidates through our scout network.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleApprove}
                  disabled={approving}
                  className="gap-1.5 text-sm"
                >
                  <CheckCircle2 className="size-3.5" />
                  {approving ? "Approving..." : "Approve — Begin Sourcing"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm"
                  onClick={() => setShowChangeForm(!showChangeForm)}
                >
                  <MessageSquare className="size-3.5 mr-1.5" />
                  Request a Change
                </Button>
              </div>

              {showChangeForm && (
                <div className="space-y-2 pt-1">
                  <Textarea
                    value={changeRequest}
                    onChange={(e) => setChangeRequest(e.target.value)}
                    placeholder="Describe what you'd like to change or clarify..."
                    rows={3}
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!changeRequest.trim()}
                    onClick={() => {
                      toast.success("Change request sent to LLP team.");
                      setChangeRequest("");
                      setShowChangeForm(false);
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <Send className="size-3.5" />
                    Send Request
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Already approved */}
          {["client_approved", "released"].includes(blueprint.status) && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="size-4" />
              {blueprint.status === "released"
                ? "Sourcing is active — LLP scouts are reviewing the brief."
                : "Blueprint approved. LLP is preparing to source."}
            </div>
          )}
        </div>
      )}

      {/* ── Shortlist Review ── */}
      {shortlistPack && shortlistPack.status !== "draft" && shortlisted.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              Shortlisted Candidates
              <Badge variant="secondary" className="text-[10px] ml-1">{shortlisted.length}</Badge>
            </h2>
            {shortlistSent && (
              <p className="text-xs text-muted-foreground">
                Please review each candidate and share your decision.
              </p>
            )}
          </div>

          {/* Candidate cards — RAG-led, no scores */}
          <div className="grid gap-4">
            {shortlisted.map((sub, idx) => {
              const screeningRec = sub.screeningRecord;
              const ragFlag = screeningRec?.ragFlag;
              const localDecision = perCandidate[sub._id]?.decision;
              const isExpanded = expandedCard === sub._id;

              return (
                <div
                  key={sub._id}
                  className={cn(
                    "rounded-lg border bg-card transition-all",
                    localDecision === "interview" ? "border-green-300 bg-green-50/30" :
                    localDecision === "pass" ? "border-muted opacity-60" :
                    "border-border"
                  )}
                >
                  {/* Card header */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => setExpandedCard(isExpanded ? null : sub._id)}
                  >
                    {/* RAG dot + number */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <div className={cn("size-3 rounded-full", ragColor(ragFlag))} />
                      <span className="text-[10px] text-muted-foreground font-medium">#{idx + 1}</span>
                    </div>

                    {/* Candidate info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Candidate {idx + 1}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {sub.aiParsedData?.currentTitle || "—"}
                            {sub.aiParsedData?.currentCompany ? ` · ${sub.aiParsedData.currentCompany}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* RAG label + expand */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={cn(
                        "text-[11px] font-medium hidden sm:block",
                        ragFlag === "green" ? "text-green-700" :
                        ragFlag === "amber" ? "text-amber-700" :
                        ragFlag === "red" ? "text-red-600" :
                        "text-muted-foreground"
                      )}>
                        {ragLabel(ragFlag)}
                      </span>
                      {localDecision && (
                        <Badge className={cn("text-[10px] border",
                          localDecision === "interview" ? "bg-green-100 text-green-700 border-green-200" :
                          localDecision === "pass" ? "bg-muted text-muted-foreground border-border" :
                          "bg-amber-100 text-amber-700 border-amber-200"
                        )}>
                          {localDecision === "interview" ? "Interview" :
                           localDecision === "pass" ? "Pass" : "Need more info"}
                        </Badge>
                      )}
                      {isExpanded
                        ? <ChevronUp className="size-4 text-muted-foreground" />
                        : <ChevronDown className="size-4 text-muted-foreground" />
                      }
                    </div>
                  </div>

                  {/* Expanded: topsheet + decisions */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      {/* LLP Assessment — topsheet-led */}
                      {sub.aiCvSummary && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">LLP ASSESSMENT</p>
                          <p className="text-sm leading-relaxed">{sub.aiCvSummary}</p>
                        </div>
                      )}

                      {(sub.aiFitDetails?.strengths?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">STRENGTHS</p>
                          <ul className="space-y-1">
                            {(sub.aiFitDetails?.strengths ?? []).map((s: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5 text-sm">
                                <CheckCircle2 className="size-3.5 mt-0.5 shrink-0 text-green-600" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(sub.aiFitDetails?.gaps?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">NOTED GAPS</p>
                          <ul className="space-y-1">
                            {(sub.aiFitDetails?.gaps ?? []).map((g: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                                <AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-amber-500" />
                                {g}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {screeningRec?.roleMatchNotes && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground mb-1">LLP NOTE</p>
                          <p className="text-sm text-muted-foreground">{screeningRec.roleMatchNotes}</p>
                        </div>
                      )}

                      {/* Per-candidate comment */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-muted-foreground">YOUR COMMENTS (optional)</p>
                        <Textarea
                          value={perCandidate[sub._id]?.comment ?? ""}
                          onChange={(e) =>
                            setPerCandidate(prev => ({
                              ...prev,
                              [sub._id]: { ...prev[sub._id], decision: prev[sub._id]?.decision ?? "more_info", comment: e.target.value }
                            }))
                          }
                          placeholder="Any specific notes for this candidate..."
                          rows={2}
                          className="text-xs"
                        />
                      </div>

                      {/* Decision buttons — no scores, just verdict */}
                      {shortlistSent && (
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            disabled={updatingStatus === sub._id}
                            onClick={() => handleCandidateDecision(sub._id, "interview")}
                            className={cn(
                              "gap-1.5 text-xs",
                              localDecision === "interview" ? "bg-green-600 hover:bg-green-700" : ""
                            )}
                          >
                            <Calendar className="size-3.5" />
                            Interview
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingStatus === sub._id}
                            onClick={() => handleCandidateDecision(sub._id, "more_info")}
                            className="gap-1.5 text-xs"
                          >
                            <HelpCircle className="size-3.5" />
                            Need more info
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingStatus === sub._id}
                            onClick={() => handleCandidateDecision(sub._id, "pass")}
                            className="gap-1.5 text-xs text-muted-foreground"
                          >
                            <XCircle className="size-3.5" />
                            Pass
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overall feedback */}
          {shortlistSent && (
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <MessageSquare className="size-4" />
                Overall Feedback
              </h3>
              <p className="text-xs text-muted-foreground">
                Share any overall thoughts on the shortlist — additional requirements, timeline, or next steps.
              </p>
              <Textarea
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                placeholder="Your thoughts on the shortlist..."
                rows={3}
                className="text-xs"
              />
              <Button
                size="sm"
                onClick={handleOverallFeedback}
                disabled={submittingOverall || !overallFeedback.trim()}
                className="gap-1.5 text-xs"
              >
                <Send className="size-3.5" />
                {submittingOverall ? "Sending..." : "Send Feedback"}
              </Button>
            </div>
          )}

          {/* Existing feedback */}
          {shortlistPack.clientFeedback && (
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs font-semibold text-green-700 mb-1">Your feedback on file</p>
              <p className="text-sm text-green-800">{shortlistPack.clientFeedback}</p>
            </div>
          )}
        </div>
      )}

      {/* No shortlist yet */}
      {(!shortlistPack || shortlistPack.status === "draft" || shortlisted.length === 0) &&
        ["released", "approved", "client_approved"].includes(mandate.status) && (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center space-y-2">
          <User className="size-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Sourcing in progress</p>
          <p className="text-xs text-muted-foreground">
            LLP scouts are reviewing the brief and building your shortlist. You'll be notified when candidates are ready for your review.
          </p>
        </div>
      )}
    </div>
  );
}
