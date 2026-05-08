"use client";

import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/posthog/events";

interface LimitReachedModalProps {
  open: boolean;
  /** Resolved tier from chat-store; defaults to free_subscribed at the call site. */
  tierId: string;
  /** Live daily cap from /api/chat/quota/increment (admin-editable via tier-config). */
  dailyLimit: number;
  /** Number of attempts after the cap was hit (counter result minus limit). */
  attemptsAfterLimit?: number;
  onClose: () => void;
}

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/**
 * Tier 5 — daily-cap modal. Shown when /api/chat/quota/increment returns
 * count > limit for a free-tier user. Fires `search_limit_reached` once
 * per `open` transition (deduped via a ref) so analytics gets a row per
 * cap-hit, not per re-render.
 *
 * Copy is deliberately neutral — paid tiers do not exist yet, so there
 * is no upsell CTA. Just acknowledge the limit and dismiss.
 */
export function LimitReachedModal({
  open,
  tierId,
  dailyLimit,
  attemptsAfterLimit = 1,
  onClose,
}: LimitReachedModalProps) {
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Dedup per open: build a stable key from the inputs so an unrelated
    // re-render does not double-fire.
    const key = `${tierId}:${attemptsAfterLimit}`;
    if (firedFor.current === key) return;
    firedFor.current = key;
    void track("search_limit_reached", {
      tier_id: tierId || "free_subscribed",
      time_of_day: timeOfDay(),
      searches_attempted_after_limit: Math.max(1, attemptsAfterLimit),
    });
  }, [open, tierId, attemptsAfterLimit]);

  // Reset the dedup key when the modal closes so a future cap-hit fires.
  useEffect(() => {
    if (!open) firedFor.current = null;
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>You&rsquo;ve reached today&rsquo;s free limit</DialogTitle>
          <DialogDescription>
            Your tier allows {dailyLimit} searches per day. Try again
            tomorrow, or upgrade for a higher daily limit.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
