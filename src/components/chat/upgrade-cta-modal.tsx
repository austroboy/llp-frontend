"use client";

import Link from "next/link";
import { SparklesIcon, CheckIcon, ArrowRightIcon, FileTextIcon, LockIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface UpgradeCtaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: "en" | "bn";
  currentTier: string | null;
}

/**
 * Shown when a free-tier user clicks the premium Generate-Document
 * button. Explains the benefit, lists Mini/Max highlights, and
 * routes to the pricing page.
 */
export function UpgradeCtaModal({
  open,
  onOpenChange,
  language,
  currentTier,
}: UpgradeCtaModalProps) {
  const isGuest = !currentTier || currentTier === "free_guest";

  const t = {
    title: language === "bn" ? "ডকুমেন্ট জেনারেশন — প্রিমিয়াম বৈশিষ্ট্য" : "Document generation is a premium feature",
    subtitle:
      language === "bn"
        ? "আপনার চ্যাটের উদ্ধৃত ধারাগুলো থেকে সরাসরি নোটিশ, চিঠি ও ফর্ম তৈরি করুন।"
        : "Turn cited sections from your chat into ready-to-send notices, letters, and forms.",
    mini: language === "bn" ? "Mini প্ল্যানে" : "With Mini",
    max: language === "bn" ? "Max প্ল্যানে" : "With Max",
    miniPerks: [
      language === "bn" ? "DOCX + PDF ফরম্যাট" : "DOCX + PDF formats",
      language === "bn" ? "দৈনিক ৫টি ডকুমেন্ট" : "5 documents per day",
      language === "bn" ? "সকল ১৫+ ডকুমেন্ট টাইপ" : "All 15+ document types",
    ],
    maxPerks: [
      language === "bn" ? "DOCX, PDF, PPTX, XLSX" : "DOCX, PDF, PPTX, XLSX",
      language === "bn" ? "আনলিমিটেড জেনারেশন" : "Unlimited generations",
      language === "bn" ? "অগ্রাধিকার সাপোর্ট" : "Priority support",
    ],
    signUp: isGuest
      ? language === "bn"
        ? "ফ্রি সাইন আপ করুন"
        : "Sign up free"
      : language === "bn"
        ? "প্ল্যান দেখুন"
        : "View plans",
    dismiss: language === "bn" ? "বাতিল করুন" : "Maybe later",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
        {/* Header with premium gradient strip */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-900/20 border-b border-amber-500/20">
          {/* Decorative shimmer accent */}
          <div aria-hidden="true" className="absolute inset-0 opacity-40 pointer-events-none shimmer-premium mix-blend-overlay" />

          <DialogHeader className="relative space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
                <SparklesIcon className="size-4" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">
                {language === "bn" ? "প্রিমিয়াম" : "Premium"}
              </span>
            </div>
            <DialogTitle className="text-xl font-semibold leading-tight">
              {t.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {t.subtitle}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Plans */}
        <div className="px-6 py-5 space-y-4">
          {/* Mini */}
          <PlanCard
            tier="mini"
            title={t.mini}
            perks={t.miniPerks}
            price={language === "bn" ? "৳৪৯৯/মাস" : "৳499/mo"}
            accent="muted"
            icon={<FileTextIcon className="size-4" />}
          />

          {/* Max — highlighted */}
          <PlanCard
            tier="max"
            title={t.max}
            perks={t.maxPerks}
            price={language === "bn" ? "৳১৪৯৯/মাস" : "৳1,499/mo"}
            accent="primary"
            recommended
            icon={<SparklesIcon className="size-4" />}
            recommendedLabel={language === "bn" ? "জনপ্রিয়" : "Most popular"}
          />
        </div>

        {/* Footer actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 px-6 pb-6 pt-2 border-t border-border/60 bg-muted/30">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 transition-colors"
          >
            {t.dismiss}
          </button>
          <Link
            href={isGuest ? "/sign-up" : "/pricing"}
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-xs px-4 py-2 shadow-sm hover:shadow-md hover:from-amber-500 hover:to-orange-600 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            {t.signUp}
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlanCard({
  title,
  perks,
  price,
  accent,
  recommended,
  icon,
  recommendedLabel,
}: {
  tier: string;
  title: string;
  perks: string[];
  price: string;
  accent: "muted" | "primary";
  recommended?: boolean;
  icon: React.ReactNode;
  recommendedLabel?: string;
}) {
  return (
    <div
      className={
        "relative rounded-xl border p-4 transition-colors " +
        (accent === "primary"
          ? "border-primary/50 bg-primary/5 hover:border-primary/70"
          : "border-border hover:border-foreground/20")
      }
    >
      {recommended && recommendedLabel && (
        <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 tracking-wide">
          {recommendedLabel}
        </span>
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={
              "inline-flex items-center justify-center size-7 rounded-lg " +
              (accent === "primary"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground")
            }
          >
            {icon}
          </span>
          <span>{title}</span>
        </div>
        <div className="text-sm font-semibold tabular-nums">{price}</div>
      </div>
      <ul className="space-y-1.5">
        {perks.map((p, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
            <CheckIcon className="size-3.5 mt-0.5 shrink-0 text-primary" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Keeping the unused icon import tree-shakeable — re-exporting for
// callers who want the lock glyph for their own buttons.
export { LockIcon };
