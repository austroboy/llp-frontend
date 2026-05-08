"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Handshake,
  MessageSquare,
  Send,
  User,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getSubmissionCollaboratorLabel, getStatusBadgeClasses } from "@/lib/headhunting/status-labels";

export default function ShortlistReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const packId = params.id as string;

  const [notes, setNotes] = useState("");
  const [releasing, setReleasing] = useState(false);

  const partner = useQuery(
    api.headhunting.collab.getPartnerByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const pendingShortlists = useQuery(
    api.headhunting.collab.getPendingShortlists,
    partner?._id ? { partnerId: partner._id } : "skip"
  );

  const releaseShortlist = useMutation(api.headhunting.collab.releaseShortlistToClient);

  // Find the specific pack from the pending list
  const pack = pendingShortlists?.find(
    (p) => p._id === packId
  );

  // Not signed in
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <Handshake className="size-10 mx-auto text-muted-foreground/50" />
        <h1 className="text-xl font-bold">Shortlist Review</h1>
        <p className="text-sm text-muted-foreground">Sign in to review this shortlist.</p>
        <Link href="/sign-in"><Button>Sign In</Button></Link>
      </div>
    );
  }

  // Loading
  if (partner === undefined || pendingShortlists === undefined) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // No partner
  if (partner === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
        <Handshake className="size-12 mx-auto text-muted-foreground/50" />
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-sm text-muted-foreground">Your account is not linked to a collaborator partner.</p>
      </div>
    );
  }

  // Pack not found or not pending
  if (!pack) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
        <FileText className="size-12 mx-auto text-muted-foreground/50" />
        <h1 className="text-xl font-bold">Shortlist Not Found</h1>
        <p className="text-sm text-muted-foreground">
          This shortlist may have already been reviewed or does not exist.
        </p>
        <Link href="/headhunting/collab/dashboard">
          <Button variant="outline" className="mt-2">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const handleRelease = async () => {
    setReleasing(true);
    try {
      await releaseShortlist({
        packId: packId as Id<"htShortlistPacks">,
        collaboratorNotes: notes.trim() || undefined,
        collaboratorClerkId: user.id,
      });
      toast.success("Shortlist released to client successfully");
      router.push("/headhunting/collab/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to release shortlist");
    } finally {
      setReleasing(false);
    }
  };

  const handleRequestChanges = () => {
    toast.info("Change request noted. Full implementation coming soon.");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Back nav */}
      <Link
        href="/headhunting/collab/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          Shortlist Review — v{pack.version}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pack.mandateTitle} — {pack.candidateCount} candidate{pack.candidateCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Candidates */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <User className="size-4 text-primary" /> Candidates
        </h2>
        <div className="space-y-2">
          {pack.submissions.map((sub, idx) => (
            <div
              key={sub._id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex items-center justify-center size-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {sub.candidateName}
                  </span>
                  <span className={getStatusBadgeClasses(sub.status)}>
                    {getSubmissionCollaboratorLabel(sub.status)}
                  </span>
                </div>
                {sub.aiFitScore != null && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    AI Fit Score: {sub.aiFitScore}%
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" /> Your Notes
        </h2>
        <p className="text-xs text-muted-foreground">
          Add any notes for the client or internal reference before releasing.
        </p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes about this shortlist..."
          className="text-sm min-h-[100px]"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleRelease}
          disabled={releasing}
          className="gap-1.5"
        >
          {releasing ? (
            "Releasing..."
          ) : (
            <>
              <Send className="size-3.5" /> Approve & Release to Client
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleRequestChanges}
          disabled={releasing}
          className="gap-1.5"
        >
          <MessageSquare className="size-3.5" /> Request Changes
        </Button>
      </div>

      {/* Info footer */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-start gap-3">
        <CheckCircle2 className="size-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Once released, the shortlist will be sent to the end client under the agreed branding.
          You can add notes that will be included with the shortlist presentation.
        </p>
      </div>
    </div>
  );
}
