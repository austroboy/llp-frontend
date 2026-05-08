"use client";

import {
  CheckCircle2Icon,
  AlertCircleIcon,
  XCircleIcon,
  HistoryIcon,
  HelpCircleIcon,
  InfoIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerifyReport } from "./verify-button";

interface Props {
  report: VerifyReport;
  language: "en" | "bn";
}

/**
 * Renders the verdict card below the Verify button. Color-coded verdict
 * badges: verified=green, partial=yellow, misquoted=orange, fabricated=red,
 * inconclusive=slate-gray (corpus unreachable, NOT a model error),
 * superseded=purple.
 */
export function VerifyResultCard({ report, language }: Props) {
  const claims = Array.isArray(report.claims) ? report.claims : [];
  const superseded = Array.isArray(report.superseded_sections)
    ? report.superseded_sections
    : [];
  const missing = Array.isArray(report.missing_citations)
    ? report.missing_citations
    : [];

  const overall = report.overall_verdict || "unknown";
  const overallStyle = overallStyleFor(overall);
  const confidencePct =
    typeof report.confidence === "number"
      ? Math.round(Math.max(0, Math.min(1, report.confidence)) * 100)
      : null;

  return (
    <div className="rounded-xl border border-border bg-card/80 p-3 text-sm space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
            overallStyle.cls
          )}
        >
          {overallStyle.icon}
          <span>
            {language === "bn" ? overallLabelBn(overall) : overallLabelEn(overall)}
          </span>
        </span>
        {confidencePct !== null && (
          <span className="text-[11px] text-muted-foreground">
            {language === "bn" ? "আত্মবিশ্বাস" : "Confidence"}: {confidencePct}%
          </span>
        )}
        {typeof report._duration_ms === "number" && (
          <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">
            {Math.round(report._duration_ms / 1000)}s
          </span>
        )}
      </div>

      {/* Agent narrative (if present) — one-paragraph summary written
          by the verify agent. Rendered above the per-claim list so the
          user sees the overall read before diving into rows. */}
      {report.summary && (
        <p className="text-[12px] leading-relaxed text-foreground/90 border-l-2 border-border/60 pl-2.5">
          {report.summary}
        </p>
      )}

      {/* Claims list */}
      {claims.length > 0 ? (
        <ul className="space-y-2.5">
          {claims.map((claim, i) => {
            const v = claim.verdict || "unknown";
            const style = claimStyleFor(v);
            const confPct =
              typeof claim.confidence === "number"
                ? Math.round(Math.max(0, Math.min(1, claim.confidence)) * 100)
                : null;
            return (
              <li
                key={`${i}-${(claim.cited_section || "").slice(0, 12)}`}
                className="rounded-lg border border-border/60 bg-background/60 p-2.5 space-y-1.5"
              >
                <div className="flex items-start gap-2 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
                      style.cls
                    )}
                  >
                    {style.icon}
                    <span>
                      {language === "bn" ? claimVerdictBn(v) : claimVerdictEn(v)}
                    </span>
                  </span>
                  {claim.cited_section && (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {claim.cited_section}
                    </span>
                  )}
                  {confPct !== null && (
                    <span className="ml-auto text-[10px] text-muted-foreground/70">
                      {confPct}%
                    </span>
                  )}
                </div>
                {claim.claim && (
                  <p className="text-xs text-foreground/90">{claim.claim}</p>
                )}
                {claim.evidence && (
                  <p className="text-[11px] text-muted-foreground italic border-l-2 border-border/50 pl-2">
                    &ldquo;{claim.evidence}&rdquo;
                  </p>
                )}
                {claim.note && (
                  <p className="text-[10.5px] text-muted-foreground/80">
                    {claim.note}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          {language === "bn"
            ? "কোনো স্বতন্ত্র দাবি যাচাই করা হয়নি।"
            : "No individual claims were verified."}
        </p>
      )}

      {/* Superseded sections */}
      {superseded.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-purple-500/30 bg-purple-500/5 p-2">
          <HistoryIcon className="size-3.5 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div className="text-[11px] text-foreground/90 space-y-0.5">
            <p className="font-medium">
              {language === "bn"
                ? "এই ধারাগুলি পরবর্তী সংশোধনীতে প্রতিস্থাপিত:"
                : "Sections superseded by a later amendment:"}
            </p>
            <p className="text-muted-foreground font-mono">
              {superseded.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Missing citations */}
      {missing.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
          <HelpCircleIcon className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="text-[11px] text-foreground/90 space-y-0.5">
            <p className="font-medium">
              {language === "bn"
                ? "উৎসহীন দাবি:"
                : "Claims without citations:"}
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
              {missing.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ── style helpers ─────────────────────────────────────────────────

function overallStyleFor(v: string): {
  cls: string;
  icon: React.ReactNode;
} {
  switch (v) {
    case "verified":
      return {
        cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        icon: <CheckCircle2Icon className="size-3" />,
      };
    case "mostly_verified":
      return {
        cls: "border-lime-500/40 bg-lime-500/10 text-lime-700 dark:text-lime-300",
        icon: <CheckCircle2Icon className="size-3" />,
      };
    case "mixed":
      return {
        cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        icon: <AlertCircleIcon className="size-3" />,
      };
    case "unverified":
      return {
        cls: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        icon: <XCircleIcon className="size-3" />,
      };
    default:
      return {
        cls: "border-border bg-muted text-muted-foreground",
        icon: <InfoIcon className="size-3" />,
      };
  }
}

function claimStyleFor(v: string): {
  cls: string;
  icon: React.ReactNode;
} {
  switch (v) {
    case "verified":
      return {
        cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        icon: <CheckCircle2Icon className="size-2.5" />,
      };
    case "partially_correct":
      return {
        cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        icon: <AlertCircleIcon className="size-2.5" />,
      };
    case "misquoted":
      return {
        cls: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
        icon: <AlertCircleIcon className="size-2.5" />,
      };
    case "fabricated":
      return {
        cls: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        icon: <XCircleIcon className="size-2.5" />,
      };
    case "inconclusive":
      return {
        cls: "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
        icon: <InfoIcon className="size-2.5" />,
      };
    case "superseded":
      return {
        cls: "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300",
        icon: <HistoryIcon className="size-2.5" />,
      };
    default:
      return {
        cls: "border-border bg-muted text-muted-foreground",
        icon: <InfoIcon className="size-2.5" />,
      };
  }
}

function overallLabelEn(v: string): string {
  switch (v) {
    case "verified":
      return "Verified";
    case "mostly_verified":
      return "Mostly verified";
    case "mixed":
      return "Mixed results";
    case "unverified":
      return "Unverified";
    default:
      return "Checked";
  }
}

function overallLabelBn(v: string): string {
  switch (v) {
    case "verified":
      return "যাচাই হয়েছে";
    case "mostly_verified":
      return "মোটামুটি যাচাই হয়েছে";
    case "mixed":
      return "মিশ্র ফলাফল";
    case "unverified":
      return "যাচাই হয়নি";
    default:
      return "পরীক্ষিত";
  }
}

function claimVerdictEn(v: string): string {
  switch (v) {
    case "verified":
      return "Verified";
    case "partially_correct":
      return "Partial";
    case "misquoted":
      return "Misquoted";
    case "fabricated":
      return "Fabricated";
    case "inconclusive":
      return "Inconclusive";
    case "superseded":
      return "Superseded";
    default:
      return "Unknown";
  }
}

function claimVerdictBn(v: string): string {
  switch (v) {
    case "verified":
      return "যাচাই";
    case "partially_correct":
      return "আংশিক";
    case "misquoted":
      return "ভুল উদ্ধৃতি";
    case "fabricated":
      return "বানোয়াট";
    case "inconclusive":
      return "অমীমাংসিত";
    case "superseded":
      return "প্রতিস্থাপিত";
    default:
      return "অজানা";
  }
}
