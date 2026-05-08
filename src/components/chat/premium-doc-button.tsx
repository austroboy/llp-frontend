"use client";

import { useEffect, useState } from "react";
import { SparklesIcon, FileTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { DocType, Perspective } from "@/lib/documents/index";
import { DocumentBuilderSheet } from "./document-builder-sheet";
import { UpgradeCtaModal } from "./upgrade-cta-modal";

/**
 * Module-level flag so only ONE PremiumDocButton instance opens its
 * sheet in response to a reopen signal, even though many may be
 * mounted (one per AI message). The first useEffect to run claims
 * the signal; others see the claimed flag and bail.
 */
let claimedReopenId: string | null = null;

interface Citation {
  section: string;
  document_id?: string;
  document?: string;
  verbatim?: string;
}

interface PremiumDocButtonProps {
  question: string;
  answer: string;
  citations: Citation[];
  language: "en" | "bn";
  /**
   * Audience hint for the detector that ranks suggested doc types.
   * Callers without a strong signal should pass "neutral" (the default
   * applied inside the builder sheet).
   */
  perspective?: Perspective;
  /**
   * DB-03 — last-user-message intent pre-select hint. When set, the
   * builder sheet highlights the matching card on step 1 as "Best
   * match for your request" (ring + badge). Visual hint only; the
   * user still clicks to confirm.
   */
  preselectDocType?: DocType | null;
}

/**
 * Decides whether a tier has document-generation access. Anything at
 * or above "mini" unlocks the builder sheet; below that we show the
 * upgrade modal.
 */
function tierHasFileGen(tier: string | null): boolean {
  if (!tier) return false;
  if (tier === "free_guest" || tier === "free_subscribed") return false;
  // "mini", "max", "enterprise", etc.
  return true;
}

/**
 * Shimmering premium CTA that lives next to Verify + Summarize.
 * The button itself renders for all tiers (aspirational design — we
 * want free users to see premium affordances) but click-behaviour
 * branches:
 *   • mini+ users → opens the 3-step DocumentBuilderSheet
 *   • free users → opens UpgradeCtaModal
 *
 * Visual design:
 *   • Base: amber→orange gradient (visible at rest)
 *   • Shimmer: CSS-only sweep via `.shimmer-premium` utility in globals.css
 *   • Hover: slight lift + stronger shadow + sparkle icon spin
 *   • prefers-reduced-motion: shimmer becomes static solid amber
 */
export function PremiumDocButton({
  question,
  answer,
  citations,
  language,
  perspective = "neutral",
  preselectDocType = null,
}: PremiumDocButtonProps) {
  const userTier = useChatStore((s) => s.userTier);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [resumeJobId, setResumeJobId] = useState<string | null>(null);

  // When a FilesSidebar badge wants to re-open this builder, the store
  // flips `reopenBuilderForJob` to the job id. We observe it here so
  // the sheet springs back open in "generating" mode.
  const reopenSignal = useWorkspaceStore((s) => s.reopenBuilderForJob);
  const clearReopen = useWorkspaceStore((s) => s.requestReopenBuilder);

  useEffect(() => {
    if (!reopenSignal) return;
    // Only one instance wins — the module-level claim stops the other
    // mounted buttons from co-opening the sheet. After the first one
    // grabs it, we clear the signal so re-entries start clean.
    if (claimedReopenId === reopenSignal) return;
    claimedReopenId = reopenSignal;
    setResumeJobId(reopenSignal);
    setSheetOpen(true);
    clearReopen(null);
    // Release the claim on the next tick so a future re-open for the
    // SAME job id can still work.
    const t = setTimeout(() => {
      if (claimedReopenId === reopenSignal) claimedReopenId = null;
    }, 0);
    return () => clearTimeout(t);
  }, [reopenSignal, clearReopen]);

  const hasAccess = tierHasFileGen(userTier);

  const label =
    language === "bn" ? "ডকুমেন্ট তৈরি করুন" : "Generate Document";

  const onClick = () => {
    if (hasAccess) {
      // Fresh open from the button — drop any lingering resume id so
      // we start on step 1 with empty form state.
      setResumeJobId(null);
      setSheetOpen(true);
    } else {
      setUpgradeOpen(true);
    }
  };

  return (
    <>
      <div className="pt-1 relative inline-block">
        <button
          type="button"
          onClick={onClick}
          aria-label={
            language === "bn"
              ? "ডকুমেন্ট তৈরি করুন — প্রিমিয়াম বৈশিষ্ট্য"
              : "Generate Document — premium feature"
          }
          className={cn("codex-action-secondary codex-action-premium")}
          title={
            hasAccess
              ? language === "bn"
                ? "ডকুমেন্ট বিল্ডার খুলুন"
                : "Open document builder"
              : language === "bn"
                ? "প্রিমিয়াম বৈশিষ্ট্য — আপগ্রেড করুন"
                : "Premium feature — upgrade to unlock"
          }
        >
          <SparklesIcon aria-hidden="true" className="codex-action-icon size-3.5" />
          <span>{label}</span>
          <FileTextIcon aria-hidden="true" className="codex-action-icon size-3.5" />
        </button>
        <style>{premiumDocStyles}</style>
      </div>

      <DocumentBuilderSheet
        open={sheetOpen}
        onOpenChange={(next) => {
          setSheetOpen(next);
          if (!next) setResumeJobId(null);
        }}
        question={question}
        answer={answer}
        citations={citations}
        language={language}
        perspective={perspective}
        preselectDocType={preselectDocType}
        resumeJobId={resumeJobId}
      />

      <UpgradeCtaModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        language={language}
        currentTier={userTier}
      />
    </>
  );
}

/* Flat amber sibling of codex-action-secondary — keeps pill shape and
   padding identical to Verify / Summarize / Download PDF so the action
   row reads as one family. Subtle warm tint + slightly stronger border
   is the only premium signal; no shimmer, no gradient, no glow. */
const premiumDocStyles = `
  .codex-action-premium {
    --act-rust: #d97706;
    color: color-mix(in oklab, #3f2604 88%, transparent);
    background: color-mix(in oklab, var(--act-rust) 10%, transparent);
    border-color: color-mix(in oklab, var(--act-rust) 38%, transparent);
  }
  .dark .codex-action-premium {
    --act-rust: #f5a623;
    color: color-mix(in oklab, #ffe9c3 92%, transparent);
    background: color-mix(in oklab, var(--act-rust) 14%, transparent);
    border-color: color-mix(in oklab, var(--act-rust) 42%, transparent);
  }
  .codex-action-premium:hover:not(:disabled) {
    background: color-mix(in oklab, var(--act-rust) 18%, transparent);
    border-color: color-mix(in oklab, var(--act-rust) 58%, transparent);
  }
  .dark .codex-action-premium:hover:not(:disabled) {
    color: #fff5dc;
  }
`;
