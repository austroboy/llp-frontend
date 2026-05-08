"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ClipboardList,
  Crosshair,
  Send,
  XCircle,
  User,
  Mail,
  Building2,
  Star,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const rejectionReasons = [
  { value: "unauthorized_referral", label: "Unauthorized use of referral code" },
  { value: "not_suitable", label: "Not suitable for role" },
  { value: "incomplete_profile", label: "Incomplete profile" },
  { value: "other", label: "Other" },
];

function FitScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80
      ? "text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400"
      : pct >= 60
        ? "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
        : "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", color)}>
      <Star className="size-3" />
      {pct}% fit
    </span>
  );
}

export default function ScoutQueuePage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const clerkId = user?.id || "";

  const queue = useQuery(
    api.headhunting.scoutQueue.getMyPendingQueue,
    clerkId ? { scoutId: clerkId } : "skip"
  );
  const queueCount = useQuery(
    api.headhunting.scoutQueue.getPendingQueueCount,
    clerkId ? { scoutId: clerkId } : "skip"
  );

  const submitToLLP = useMutation(api.headhunting.scoutQueue.submitToLLP);
  const rejectFromQueue = useMutation(api.headhunting.scoutQueue.rejectFromQueue);

  // Review modal state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [recScore, setRecScore] = useState(7);
  const [recNote, setRecNote] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ slotsUsed: number; slotsTotal: number } | null>(null);

  // Reject modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectCustom, setRejectCustom] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const reviewingCandidate = queue?.find((c) => c._id === reviewingId);
  const rejectingCandidate = queue?.find((c) => c._id === rejectingId);

  const handleSubmitToLLP = async () => {
    if (!reviewingId) return;
    setReviewSubmitting(true);
    try {
      await submitToLLP({
        submissionId: reviewingId as any,
        scoutRecommendationScore: recScore,
        scoutRecommendationNote: recNote.trim() || undefined,
      });
      toast.success("Submitted to LLP successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason) {
      toast.error("Please select a rejection reason");
      return;
    }
    setRejectSubmitting(true);
    try {
      await rejectFromQueue({
        submissionId: rejectingId as any,
        reason: rejectReason === "other" ? rejectCustom.trim() || "Other" : rejectReason,
      });
      toast.success("Candidate removed from queue");
      setRejectingId(null);
      setRejectReason("");
      setRejectCustom("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setRejectSubmitting(false);
    }
  };

  const closeReviewModal = () => {
    setReviewingId(null);
    setRecScore(7);
    setRecNote("");
    setSubmitResult(null);
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <ClipboardList className="size-10 mx-auto text-muted-foreground/50" />
        <h1 className="text-xl font-bold">Pending Queue</h1>
        <p className="text-sm text-muted-foreground">Sign in to access your pending queue.</p>
        <Link href="/sign-in"><Button>Sign In</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="size-6 text-primary" />
          Pending Queue
          {typeof queueCount === "number" && queueCount > 0 && (
            <Badge variant="default" className="text-xs ml-1">{queueCount}</Badge>
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Candidates awaiting your review before submission to LLP
        </p>
      </div>

      {/* Nav */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/headhunting/scout">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">{t("scout.nav.dashboard")}</Badge>
        </Link>
        <Link href="/headhunting/scout/briefs">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">{t("scout.nav.briefs")}</Badge>
        </Link>
        <Link href="/headhunting/scout/submissions">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">{t("scout.nav.submissions")}</Badge>
        </Link>
        <Badge variant="default" className="px-3 py-1">Queue</Badge>
        <Link href="/headhunting/scout/earnings">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">Earnings</Badge>
        </Link>
      </div>

      {/* Queue content */}
      {!queue ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading queue...</div>
      ) : queue.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center space-y-3">
          <CheckCircle2 className="size-8 mx-auto text-muted-foreground/50" />
          <h3 className="text-sm font-semibold">No candidates pending your review</h3>
          <p className="text-xs text-muted-foreground">
            When candidates apply through your referral links, they will appear here for review.
          </p>
          <Link href="/headhunting/scout/briefs">
            <Button variant="outline" size="sm" className="mt-2">View Active Briefs</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((candidate) => (
            <div
              key={candidate._id}
              className="rounded-lg border border-border bg-card p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">{candidate.candidateName}</h3>
                    {candidate.entryMethod === "scout_code_apply" && (
                      <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Applied via referral
                      </Badge>
                    )}
                    {candidate.entryMethod === "scout_assisted" && (
                      <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        Direct entry
                      </Badge>
                    )}
                    {typeof candidate.aiFitScore === "number" && (
                      <FitScoreBadge score={candidate.aiFitScore} />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    {candidate.candidateEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3" />
                        {candidate.candidateEmail}
                      </span>
                    )}
                    {candidate.candidateCurrentOrg && (
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" />
                        {candidate.candidateCurrentOrg}
                      </span>
                    )}
                  </div>
                  {candidate.mandateTitle && (
                    <p className="text-xs text-muted-foreground mt-1">
                      For: <span className="font-medium text-foreground">{candidate.mandateTitle}</span>
                    </p>
                  )}
                  {candidate.aiFitDetails?.strengths && (
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      {candidate.aiFitDetails.strengths.slice(0, 2).map((s: string, i: number) => (
                        <span key={i} className="block">+ {s}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => {
                      setReviewingId(candidate._id);
                      setRecScore(7);
                      setRecNote("");
                      setSubmitResult(null);
                    }}
                  >
                    <Send className="size-3" />
                    Review & Submit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                      setRejectingId(candidate._id);
                      setRejectReason("");
                      setRejectCustom("");
                    }}
                  >
                    <XCircle className="size-3" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review & Submit Modal */}
      <Dialog open={!!reviewingId} onOpenChange={(open) => !open && closeReviewModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Review Candidate</DialogTitle>
            <DialogDescription>
              {reviewingCandidate?.candidateName} — {reviewingCandidate?.mandateTitle}
            </DialogDescription>
          </DialogHeader>

          {submitResult ? (
            <div className="space-y-4 py-2">
              <div className="text-center space-y-2">
                <CheckCircle2 className="size-10 mx-auto text-green-600" />
                <h3 className="text-sm font-semibold">Submitted to LLP</h3>
                <p className="text-xs text-muted-foreground">
                  Candidate has been forwarded for LLP review.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  The candidate is now in the LLP review pipeline.
                </p>
              </div>
              <Button onClick={closeReviewModal} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* AI Fit Breakdown */}
              {typeof reviewingCandidate?.aiFitScore === "number" && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">AI Fit Score</p>
                    <FitScoreBadge score={reviewingCandidate.aiFitScore} />
                  </div>
                  {reviewingCandidate.aiFitDetails?.strengths && (
                    <div className="text-xs text-muted-foreground">
                      {reviewingCandidate.aiFitDetails.strengths.slice(0, 3).map((s: string, i: number) => (
                        <span key={i} className="block">+ {s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Parsed CV summary */}
              {reviewingCandidate?.aiCvSummary && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <FileText className="size-3" /> CV Summary
                  </p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                    {reviewingCandidate.aiCvSummary}
                  </p>
                </div>
              )}

              {/* Recommendation score */}
              <div className="space-y-1.5">
                <Label className="text-xs">Your Recommendation (1-10) *</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={recScore}
                    onChange={(e) =>
                      setRecScore(Math.min(10, Math.max(1, Number(e.target.value) || 1)))
                    }
                    className="w-20 text-sm text-center"
                  />
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        recScore >= 8
                          ? "bg-green-500"
                          : recScore >= 5
                            ? "bg-amber-500"
                            : "bg-red-500"
                      )}
                      style={{ width: `${recScore * 10}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Recommendation note */}
              <div className="space-y-1.5">
                <Label className="text-xs">Recommendation Note</Label>
                <Textarea
                  value={recNote}
                  onChange={(e) => setRecNote(e.target.value)}
                  placeholder="Why you recommend this candidate..."
                  rows={3}
                  className="text-sm"
                />
              </div>

              <Button
                onClick={handleSubmitToLLP}
                disabled={reviewSubmitting}
                className="w-full gap-1.5"
              >
                <Send className="size-3.5" />
                {reviewSubmitting ? "Submitting..." : "Submit to LLP"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-500" />
              Reject Candidate
            </DialogTitle>
            <DialogDescription>
              {rejectingCandidate?.candidateName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Reason *</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger className="text-sm h-9">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {rejectionReasons.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="text-sm">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {rejectReason === "other" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Custom Reason</Label>
                <Input
                  value={rejectCustom}
                  onChange={(e) => setRejectCustom(e.target.value)}
                  placeholder="Specify reason..."
                  className="text-sm"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectingId(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectSubmitting || !rejectReason}
                className="flex-1 gap-1"
              >
                <XCircle className="size-3.5" />
                {rejectSubmitting ? "Rejecting..." : "Confirm Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
