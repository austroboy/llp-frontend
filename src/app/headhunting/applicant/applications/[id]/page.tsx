"use client";

import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  getSubmissionApplicantLabel,
  getStatusBadgeClasses,
} from "@/lib/headhunting/status-labels";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Award,
  MessageSquare,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";

// Timeline step definitions
const TIMELINE_STEPS = [
  {
    label: "Applied",
    statuses: [
      "pending_scout_review",
      "pending_verification",
      "submitted_to_llp",
    ],
  },
  { label: "Under Review", statuses: ["under_review", "verified"] },
  { label: "Shortlisted", statuses: ["shortlist_shared"] },
  { label: "Interview", statuses: ["interview"] },
  {
    label: "Offer",
    statuses: ["offer_stage", "offer_extended", "offer_accepted"],
  },
  { label: "Joined", statuses: ["joined"] },
];

const TERMINAL_STATUSES = [
  "joined",
  "rejected",
  "withdrawn",
  "verification_expired",
];

function getTimelineStepIndex(status: string): number {
  for (let i = 0; i < TIMELINE_STEPS.length; i++) {
    if (TIMELINE_STEPS[i].statuses.includes(status)) return i;
  }
  return -1;
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const { user } = useUser();
  const clerkId = user?.id || "";
  const submissionId = params.id as string;

  const detail = useQuery(
    api.headhunting.applicant.getApplicationDetail,
    clerkId && submissionId
      ? {
          submissionId: submissionId as Id<"htSubmissions">,
          clerkId,
        }
      : "skip"
  );

  const withdraw = useMutation(api.headhunting.applicant.withdrawApplication);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <Briefcase className="size-10 mx-auto text-muted-foreground/50" />
        <h1 className="text-xl font-bold">Application Detail</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to view your application.
        </p>
        <Link href="/sign-in">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  if (detail === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (detail === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <AlertTriangle className="size-10 mx-auto text-muted-foreground/50" />
        <h1 className="text-xl font-bold">Application Not Found</h1>
        <p className="text-sm text-muted-foreground">
          This application does not exist or you don't have access.
        </p>
        <Link href="/headhunting/applicant/applications">
          <Button variant="outline" size="sm">
            Back to Applications
          </Button>
        </Link>
      </div>
    );
  }

  const currentStepIdx = getTimelineStepIndex(detail.status);
  const isTerminal = TERMINAL_STATUSES.includes(detail.status);
  const isNegativeTerminal = ["rejected", "withdrawn", "verification_expired"].includes(detail.status);
  const canWithdraw = !isTerminal;

  async function handleWithdraw() {
    setWithdrawing(true);
    try {
      await withdraw({
        submissionId: submissionId as Id<"htSubmissions">,
        clerkId,
      });
    } catch {
      // Error handled by Convex
    } finally {
      setWithdrawing(false);
      setShowWithdrawConfirm(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Back link */}
      <Link
        href="/headhunting/applicant/applications"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3" /> Back to Applications
      </Link>

      {/* Role info header */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">{detail.roleTitle}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              {detail.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {detail.location}
                </span>
              )}
              {detail.seniority && (
                <span className="flex items-center gap-1">
                  <Award className="size-3" /> {detail.seniority}
                </span>
              )}
            </div>
          </div>
          <span className={getStatusBadgeClasses(detail.status)}>
            {getSubmissionApplicantLabel(detail.status)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
          <span>
            Applicant: {detail.candidateName} ({detail.candidateEmail})
          </span>
          <span>
            Applied{" "}
            {new Date(detail.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Status timeline */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Application Progress</h2>

        {isNegativeTerminal && (
          <div
            className={cn(
              "rounded-md border p-3 mb-4 text-xs flex items-center gap-2",
              detail.status === "rejected"
                ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
                : "bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            )}
          >
            <X className="size-4 shrink-0" />
            {detail.status === "rejected"
              ? "This application was not selected to proceed further."
              : detail.status === "withdrawn"
                ? "You withdrew this application."
                : "Verification expired for this application."}
          </div>
        )}

        <div className="flex items-center gap-0">
          {TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = !isNegativeTerminal && currentStepIdx > idx;
            const isCurrent = currentStepIdx === idx && !isNegativeTerminal;
            const isFuture = !isCompleted && !isCurrent;

            return (
              <div key={step.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                      isCompleted
                        ? "bg-primary border-primary text-primary-foreground"
                        : isCurrent
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-muted border-border text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-3.5" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] mt-1.5 text-center whitespace-nowrap",
                      isCurrent
                        ? "text-primary font-semibold"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-1 mt-[-18px]",
                      isCompleted
                        ? "bg-primary"
                        : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Applicant-visible comments */}
      {detail.comments && detail.comments.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="size-4" /> Messages
          </h2>
          <div className="space-y-3">
            {detail.comments.map((comment: any, idx: number) => (
              <div
                key={idx}
                className="rounded-md border border-border bg-muted/30 p-3"
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{comment.author}</span>
                  <span>
                    {new Date(comment.timestamp).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-xs">{comment.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw action */}
      {canWithdraw && (
        <div className="rounded-lg border border-border bg-card p-5">
          {!showWithdrawConfirm ? (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Withdraw Application</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This action cannot be undone.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                onClick={() => setShowWithdrawConfirm(true)}
              >
                Withdraw
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-xs">
                <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                <p>
                  Are you sure you want to withdraw this application? You will
                  not be able to reapply for this position.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWithdrawConfirm(false)}
                  disabled={withdrawing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                >
                  {withdrawing ? "Withdrawing..." : "Confirm Withdraw"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
