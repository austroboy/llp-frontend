"use client";

import { useState, useEffect, useCallback } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FeedbackModal } from "./feedback-modal";
import { FeedbackForm } from "./feedback-form";
import { track } from "@/lib/posthog/events";
import { useChatStore } from "@/store/chat-store";

interface VoteButtonsProps {
  messageId: string;
  conversationId: string;
}

interface VoteState {
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null;
}

export function VoteButtons({ messageId, conversationId }: VoteButtonsProps) {
  const { user, isLoaded } = useUser();
  const isSignedIn = !!user;
  const userTier = useChatStore((s) => s.userTier);

  const [voteState, setVoteState] = useState<VoteState>({
    upvotes: 0,
    downvotes: 0,
    userVote: null,
  });
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [pendingVoteType, setPendingVoteType] = useState<"up" | "down" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Tier 5 — inline feedback form opens AFTER a successful downvote.
  // Separate from `isFeedbackModalOpen` (Dialog modal for the existing
  // /api/votes comment flow) so the two paths don't fight over state.
  const [showInlineFeedback, setShowInlineFeedback] = useState(false);

  // Fetch current vote state on mount
  useEffect(() => {
    if (!messageId) return;

    fetch(`/api/votes?message_id=${encodeURIComponent(messageId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setVoteState({
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
            userVote: data.userVote || null,
          });
        }
      })
      .catch(() => {
        // Silently fail on initial fetch
      });
  }, [messageId]);

  const submitVote = useCallback(
    async (vote: "up" | "down", comment?: string) => {
      if (isLoading) return;

      const previousState = { ...voteState };

      // If user clicks their existing vote, remove it
      if (voteState.userVote === vote) {
        // Optimistic: remove vote
        setVoteState((prev) => ({
          ...prev,
          userVote: null,
          upvotes: vote === "up" ? prev.upvotes - 1 : prev.upvotes,
          downvotes: vote === "down" ? prev.downvotes - 1 : prev.downvotes,
        }));

        setIsLoading(true);
        try {
          const res = await fetch(
            `/api/votes?message_id=${encodeURIComponent(messageId)}`,
            { method: "DELETE" }
          );
          if (!res.ok) throw new Error("Failed to remove vote");
        } catch {
          setVoteState(previousState);
          toast.error("Failed to remove vote. Please try again.");
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Optimistic: apply new vote
      setVoteState((prev) => {
        const wasUp = prev.userVote === "up";
        const wasDown = prev.userVote === "down";
        return {
          userVote: vote,
          upvotes:
            vote === "up"
              ? prev.upvotes + 1
              : wasUp
                ? prev.upvotes - 1
                : prev.upvotes,
          downvotes:
            vote === "down"
              ? prev.downvotes + 1
              : wasDown
                ? prev.downvotes - 1
                : prev.downvotes,
        };
      });

      // Fire PostHog event before the network call so analytics doesn't
      // depend on /api/votes succeeding. Toggle-off is handled in the
      // DELETE branch above and intentionally does NOT fire a rating
      // event (it's a retraction, not a new rating).
      track("search_result_rated", {
        query_id: messageId,
        rating: vote === "up" ? 1 : -1,
        user_tier_id: userTier ?? "free_subscribed",
      });

      setIsLoading(true);
      try {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message_id: messageId,
            conversation_id: conversationId,
            vote,
            comment: comment || undefined,
          }),
        });
        if (!res.ok) throw new Error("Failed to save vote");

        const data = await res.json();
        setVoteState({
          userVote: vote,
          upvotes: data.upvotes || 0,
          downvotes: data.downvotes || 0,
        });
      } catch {
        setVoteState(previousState);
        toast.error("Failed to save vote. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [messageId, conversationId, voteState, isLoading, userTier]
  );

  const handleUpvoteClick = useCallback(() => {
    if (!isSignedIn) return;

    // If already upvoted, toggle off (no modal)
    if (voteState.userVote === "up") {
      submitVote("up");
      return;
    }

    // Open feedback modal for new upvote
    setPendingVoteType("up");
    setIsFeedbackModalOpen(true);
  }, [isSignedIn, voteState.userVote, submitVote]);

  const handleDownvoteClick = useCallback(() => {
    if (!isSignedIn) return;

    // If already downvoted, toggle it off (no form needed)
    if (voteState.userVote === "down") {
      submitVote("down");
      setShowInlineFeedback(false);
      return;
    }

    // Tier 5 — record the downvote first (fires `search_result_rated`),
    // then surface the inline FeedbackForm so the user stays in flow.
    // The form posts to /api/feedback (search_feedback table); free-text
    // never enters PostHog event properties.
    void submitVote("down");
    setShowInlineFeedback(true);
  }, [isSignedIn, voteState.userVote, submitVote]);

  const handleFeedbackSubmit = useCallback(
    (comment?: string) => {
      setIsFeedbackModalOpen(false);
      if (pendingVoteType) {
        submitVote(pendingVoteType, comment);
      }
      setPendingVoteType(null);
    },
    [pendingVoteType, submitVote]
  );

  const handleFeedbackClose = useCallback(() => {
    setIsFeedbackModalOpen(false);
    setPendingVoteType(null);
  }, []);

  // Don't render until Clerk has loaded
  if (!isLoaded) return null;

  const upvoteButton = (
    <button
      onClick={handleUpvoteClick}
      disabled={!isSignedIn || isLoading}
      className={cn(
        "inline-flex items-center gap-1 rounded-md p-1.5 text-muted-foreground transition-colors",
        isSignedIn
          ? "hover:text-foreground hover:bg-muted cursor-pointer"
          : "cursor-not-allowed opacity-60",
        voteState.userVote === "up" && "text-green-600 dark:text-green-400"
      )}
      aria-label={
        voteState.userVote === "up" ? "Remove upvote" : "Upvote this response"
      }
      title={
        !isSignedIn
          ? "Sign in to vote"
          : voteState.userVote === "up"
            ? "Remove upvote"
            : "Helpful"
      }
    >
      <ThumbsUp
        className={cn(
          "h-4 w-4",
          voteState.userVote === "up" && "fill-current"
        )}
      />
      {voteState.upvotes > 0 && (
        <span className="text-[11px] font-medium tabular-nums">
          {voteState.upvotes}
        </span>
      )}
    </button>
  );

  const downvoteButton = (
    <button
      onClick={handleDownvoteClick}
      disabled={!isSignedIn || isLoading}
      className={cn(
        "inline-flex items-center gap-1 rounded-md p-1.5 text-muted-foreground transition-colors",
        isSignedIn
          ? "hover:text-foreground hover:bg-muted cursor-pointer"
          : "cursor-not-allowed opacity-60",
        voteState.userVote === "down" && "text-red-600 dark:text-red-400"
      )}
      aria-label={
        voteState.userVote === "down"
          ? "Remove downvote"
          : "Downvote this response"
      }
      title={
        !isSignedIn
          ? "Sign in to vote"
          : voteState.userVote === "down"
            ? "Remove downvote"
            : "Not helpful"
      }
    >
      <ThumbsDown
        className={cn(
          "h-4 w-4",
          voteState.userVote === "down" && "fill-current"
        )}
      />
      {voteState.downvotes > 0 && (
        <span className="text-[11px] font-medium tabular-nums">
          {voteState.downvotes}
        </span>
      )}
    </button>
  );

  return (
    <>
      {isSignedIn ? (
        <>
          {upvoteButton}
          {downvoteButton}
        </>
      ) : (
        <>
          <Tooltip>
            <TooltipTrigger asChild>{upvoteButton}</TooltipTrigger>
            <TooltipContent>Sign in to vote</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>{downvoteButton}</TooltipTrigger>
            <TooltipContent>Sign in to vote</TooltipContent>
          </Tooltip>
        </>
      )}

      {/* Existing per-vote comment modal — kept for the upvote flow so the
          /api/votes record can still carry a positive comment. Tier 5
          downvotes route through the inline form below instead. */}
      <FeedbackModal
        open={isFeedbackModalOpen}
        voteType={pendingVoteType}
        onClose={handleFeedbackClose}
        onSubmit={handleFeedbackSubmit}
      />

      {/* Tier 5 — inline negative-rating feedback. Mounts only after a
          successful downvote click; closes on submit / skip / dismiss. */}
      {showInlineFeedback && voteState.userVote === "down" && (
        <div className="mt-1 w-full max-w-[520px]">
          <FeedbackForm
            messageId={messageId}
            onClose={() => setShowInlineFeedback(false)}
          />
        </div>
      )}
    </>
  );
}
