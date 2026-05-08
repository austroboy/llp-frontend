"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_REASON_LEN = 500;

interface FeedbackFormProps {
  /** Chat message id (UUID or temp aiMsgId). Echoed to /api/feedback. */
  messageId: string;
  /** Called after a successful submit OR when the user dismisses. */
  onClose: () => void;
}

/**
 * Tier 5 — inline feedback form for thumbs-down ratings. Renders below
 * the rated message (NOT a modal — keeps the user in flow). Posts the
 * sanitised reason text to /api/feedback which writes a row to
 * `search_feedback` for legal review.
 *
 * Privacy: free-text reasons never enter PostHog event properties (Tier
 * 1 rule). The `search_result_rated` event is already fired by the
 * caller (vote-buttons.tsx) before this form mounts.
 */
export function FeedbackForm({ messageId, onClose }: FeedbackFormProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trimmed = reason.trim();
  const overLimit = trimmed.length > MAX_REASON_LEN;
  const canSubmit = trimmed.length > 0 && !overLimit && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query_id: messageId,
          // Server-side sanitiser is the source of truth; the client
          // trim+slice is only to keep the UX honest about the cap.
          reason_text: trimmed.slice(0, MAX_REASON_LEN),
        }),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success("Thanks — flagged for review");
      onClose();
    } catch {
      toast.error("Couldn't save feedback. Try again?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "mt-2 rounded-lg border border-border/70 bg-card/60 p-3",
        "dark:bg-card/40",
      )}
      role="region"
      aria-label="Feedback form"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-fraunces text-[13.5px] leading-snug">
            Thanks &mdash; what was wrong?
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Your note is sent for legal review. Up to {MAX_REASON_LEN} characters.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss feedback form"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>

      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Section number didn't match the cited Act, answer missed the 2026 amendment..."
        className="mt-2 min-h-[72px] resize-none border-border/60 bg-background/60 text-[12.5px]"
        maxLength={MAX_REASON_LEN + 32 /* let server enforce hard cap */}
        disabled={submitting}
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            "font-jetbrains text-[10.5px] uppercase tracking-[0.14em]",
            overLimit ? "text-destructive" : "text-muted-foreground/70",
          )}
        >
          {trimmed.length}/{MAX_REASON_LEN}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md px-2.5 py-1 font-jetbrains text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "rounded-md px-3 py-1 font-jetbrains text-[11px] uppercase tracking-[0.14em] transition-colors",
              canSubmit
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-70",
            )}
          >
            {submitting ? "Saving..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
