"use client";

import { useEffect, useState } from "react";
import {
  Loader2Icon,
  CheckIcon,
  XCircleIcon,
  XIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratingJob } from "@/store/workspace-store";

interface GeneratingJobBadgeProps {
  job: GeneratingJob;
  compact: boolean;
  onClick: () => void;
  onDismiss: () => void;
  language?: "en" | "bn";
}

/**
 * A single background-filegen badge. Renders two ways:
 *   compact  → 40px circle (sidebar collapsed to 64px strip)
 *   expanded → row with icon + label + elapsed + dismiss X (320px strip)
 *
 * States:
 *   running → amber pulse ring + spinning loader
 *   done    → green check, one-off scale-in
 *   error   → red X, tooltip shows error
 */
export function GeneratingJobBadge({
  job,
  compact,
  onClick,
  onDismiss,
  language = "en",
}: GeneratingJobBadgeProps) {
  // Tick every second while running so the elapsed counter updates.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (job.state !== "running") return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [job.state]);

  const elapsedSec = Math.max(
    0,
    Math.floor(((job.completedAt ?? Date.now()) - job.startedAt) / 1000),
  );

  const isVerify = job.kind === "verify";

  const stateLabel =
    job.state === "running"
      ? isVerify
        ? language === "bn"
          ? "যাচাই হচ্ছে"
          : "Verifying"
        : language === "bn"
          ? "তৈরি হচ্ছে"
          : "Generating"
      : job.state === "done"
        ? isVerify
          ? verifyVerdictLabel(job.verdict, language)
          : language === "bn"
            ? "সম্পন্ন"
            : "Ready"
        : language === "bn"
          ? "ব্যর্থ"
          : "Error";

  const titleText =
    job.state === "error" && job.error
      ? `${job.docTypeLabel} · ${job.error}`
      : `${job.docTypeLabel} · ${stateLabel}${
          job.state === "running" ? ` · ${elapsedSec}s` : ""
        }`;

  // -------------------- COMPACT (64px strip) --------------------
  if (compact) {
    return (
      <div className="relative group my-0.5">
        <button
          type="button"
          onClick={onClick}
          aria-label={titleText}
          title={titleText}
          className={cn(
            "relative flex size-10 items-center justify-center rounded-lg mx-auto",
            "transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
            job.state === "running" && "bg-amber-500/10",
            job.state === "done" && "bg-emerald-500/10",
            job.state === "error" && "bg-destructive/10",
          )}
        >
          {job.state === "running" && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-lg ring-2 ring-amber-500/60 animate-job-pulse-ring"
            />
          )}
          <span
            className={cn(
              "relative inline-flex size-7 items-center justify-center rounded-md ring-1",
              job.state === "running" &&
                "bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-amber-500/30",
              job.state === "done" &&
                "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30 animate-in zoom-in-95 duration-300",
              job.state === "error" &&
                "bg-destructive/15 text-destructive ring-destructive/30",
            )}
          >
            {job.state === "running" && (
              <Loader2Icon className="size-3.5 animate-spin" />
            )}
            {job.state === "done" &&
              (isVerify ? (
                <ShieldCheckIcon className="size-3.5" />
              ) : (
                <CheckIcon className="size-3.5" />
              ))}
            {job.state === "error" && <XCircleIcon className="size-3.5" />}
          </span>
        </button>

        {/* Dismiss affordance — visible on hover for done/error only. We
            do not let users dismiss a running badge (they should click
            it to re-open the modal or just let it finish). */}
        {job.state !== "running" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            aria-label={language === "bn" ? "বাতিল" : "Dismiss"}
            title={language === "bn" ? "বাতিল" : "Dismiss"}
            className={cn(
              "absolute -top-1 -right-1 inline-flex items-center justify-center size-4 rounded-full",
              "bg-card ring-1 ring-border text-muted-foreground",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "hover:text-foreground hover:ring-foreground/40",
              "focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <XIcon className="size-2.5" />
          </button>
        )}
      </div>
    );
  }

  // -------------------- EXPANDED (320px strip row) --------------------
  return (
    <div
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 mx-1.5 cursor-pointer transition-colors",
        job.state === "running" && "hover:bg-amber-500/5",
        job.state === "done" && "hover:bg-emerald-500/5",
        job.state === "error" && "hover:bg-destructive/5",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      title={titleText}
    >
      {/* Left status icon tile + pulse ring when running */}
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center size-8 rounded-md ring-1",
          job.state === "running" &&
            "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30",
          job.state === "done" &&
            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30 animate-in zoom-in-95 duration-300",
          job.state === "error" &&
            "bg-destructive/15 text-destructive ring-destructive/30",
        )}
      >
        {job.state === "running" && (
          <span
            aria-hidden="true"
            className="absolute inset-[-3px] rounded-lg ring-2 ring-amber-500/50 animate-job-pulse-ring"
          />
        )}
        {job.state === "running" && (
          <Loader2Icon className="size-4 animate-spin relative" />
        )}
        {job.state === "done" &&
          (isVerify ? (
            <ShieldCheckIcon className="size-4" />
          ) : (
            <CheckIcon className="size-4" />
          ))}
        {job.state === "error" && <XCircleIcon className="size-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-xs font-medium text-foreground">
            {job.docTypeLabel}
          </span>
          {job.format && !isVerify && (
            <span className="text-[10px] font-mono uppercase text-muted-foreground/70">
              {job.format}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <span
            className={cn(
              job.state === "running" && "text-amber-600 dark:text-amber-400",
              job.state === "done" && "text-emerald-600 dark:text-emerald-400",
              job.state === "error" && "text-destructive",
            )}
          >
            {stateLabel}
          </span>
          {job.state === "running" && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{elapsedSec}s</span>
            </>
          )}
        </div>
      </div>

      {/* Dismiss X — only offered once the job is no longer running. */}
      {job.state !== "running" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label={language === "bn" ? "বাতিল" : "Dismiss"}
          title={language === "bn" ? "বাতিল" : "Dismiss"}
          className={cn(
            "shrink-0 inline-flex items-center justify-center size-6 rounded-md",
            "text-muted-foreground/60 hover:text-foreground hover:bg-muted",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function verifyVerdictLabel(
  verdict: string | undefined,
  language: "en" | "bn",
): string {
  const bn = language === "bn";
  switch (verdict) {
    case "verified":
      return bn ? "যাচাই হয়েছে" : "Verified";
    case "mostly_verified":
      return bn ? "মোটামুটি যাচাই" : "Mostly verified";
    case "mixed":
      return bn ? "মিশ্র" : "Mixed";
    case "unverified":
      return bn ? "যাচাই হয়নি" : "Unverified";
    default:
      return bn ? "পরীক্ষিত" : "Checked";
  }
}
