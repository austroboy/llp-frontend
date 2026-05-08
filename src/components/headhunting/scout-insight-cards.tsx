"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InsightCard {
  label: string;
  labelStyle?: "signal" | "insight" | "why" | "trust" | "know";
  headline: string;
  body: string;
  source?: string;
}

// ─── Card data per step ───────────────────────────────────────────────────────

export const STEP_INSIGHTS: Record<number, InsightCard[]> = {

  // Step 0: Basic Identity
  0: [
    {
      label: "Market Signal",
      labelStyle: "signal",
      headline: "Executive search is one of the fastest-growing professional services sectors.",
      body: "Asia-Pacific has emerged as the highest-growth region — driven by leadership demand, corporate expansion, and digital transformation.",
      source: "Mordor Intelligence, 2026",
    },
    {
      label: "Search Insight",
      labelStyle: "insight",
      headline: "Your identity stays private throughout the process.",
      body: "Scouts are never introduced to clients by name. Confidentiality is built into how LLP operates — not an afterthought.",
      source: "LLP Platform",
    },
  ],

  // Step 1: Specialization
  1: [
    {
      label: "Why This Matters",
      labelStyle: "why",
      headline: "The strongest demand is not spread evenly across functions.",
      body: "Technology and digital leadership held the largest executive search share in 2025. Life sciences and AI leadership are projected to grow at double-digit pace.",
      source: "Mordor Intelligence, 2026",
    },
    {
      label: "Search Insight",
      labelStyle: "insight",
      headline: "Precise specialization means better-fit mandates.",
      body: "LLP only releases mandates matched to your declared functions and industries. Narrow and deep outperforms broad and shallow.",
      source: "LLP Platform",
    },
  ],

  // Step 2: Talent Access
  2: [
    {
      label: "Search Reality",
      labelStyle: "signal",
      headline: "High-stakes mandates still favour structured search — not passive sourcing.",
      body: "Retained search assignments held 62.88% of the executive search market in 2025. Organisations pay for a disciplined process, not a LinkedIn post.",
      source: "Mordor Intelligence, 2026",
    },
    {
      label: "Why This Matters",
      labelStyle: "why",
      headline: "Access depth matters more than reach breadth.",
      body: "The scouts who perform best are those who can reach the right person — not just any person. Defining your real access honestly leads to better mandate matches.",
      source: "LLP Platform",
    },
  ],

  // Step 3: Hiring Experience
  3: [
    {
      label: "Leadership Insight",
      labelStyle: "insight",
      headline: "C-suite appointments represent over half the executive search market.",
      body: "Research estimates C-suite mandates accounted for 50.64% of executive search volume in 2025. Senior-hire experience commands a premium — both in mandates and in earnings.",
      source: "Mordor Intelligence, 2026",
    },
    {
      label: "Why This Matters",
      labelStyle: "why",
      headline: "Recruitment experience is not the same as general HR experience.",
      body: "A specialist recruiter with seven focused years often brings more sourcing depth than a generalist with fifteen. This section captures that distinction accurately.",
      source: "LLP Platform",
    },
  ],

  // Step 4: Geography & Hiring Reach
  4: [
    {
      label: "Regional Signal",
      labelStyle: "signal",
      headline: "Southeast Asia is being reshaped by digitalisation and cross-border talent movement.",
      body: "Three forces are at work: internal demand resilience, talent-market revitalisation through e-commerce growth, and the rise of more mobile work patterns across the region.",
      source: "Atomic Group, SE Asia Talent Trend Report 2024",
    },
    {
      label: "Search Insight",
      labelStyle: "insight",
      headline: "Singapore functions as a talent anchor for the wider region.",
      body: "Its role as a global talent hub creates cluster effects that influence search activity well beyond its borders — reinforcing Southeast Asia's cross-border relevance.",
      source: "Atomic Group, 2024",
    },
  ],

  // Step 5: Mandate & Network
  5: [
    {
      label: "Market Shift",
      labelStyle: "signal",
      headline: "AI is already changing how recruiting professionals work.",
      body: "8 in 10 recruiting professionals in Southeast Asia are optimistic about AI's impact on their work. AI skills on recruiter profiles rose 14% in a single year.",
      source: "LinkedIn, Future of Recruiting 2024 — SE Asia Edition",
    },
    {
      label: "Why This Matters",
      labelStyle: "why",
      headline: "LLP uses AI to assess — not to replace judgment.",
      body: "The system surfaces evidence and flags gaps. Every final decision stays with the scout and LLP. Structure improves quality; AI reduces noise.",
      source: "LLP Platform",
    },
  ],

  // Step 6: Preferences
  6: [
    {
      label: "Fee Benchmark",
      labelStyle: "signal",
      headline: "Search fees across Asian markets reflect the seriousness of the work.",
      body: "Permanent-hire fee benchmarks in Asia commonly fall between 11% and 27% of annual salary — varying by country, seniority, and role complexity. Scouts share in that value.",
      source: "Second Talent, Staffing Agency Fees in Asia, 2026",
    },
    {
      label: "Trust Note",
      labelStyle: "trust",
      headline: "Your involvement level is yours to set.",
      body: "You decide how active to be. Pause briefs any time. Adjust your preferences. LLP works around your capacity — not the other way around.",
      source: "LLP Platform",
    },
  ],

  // Step 7: Confirm & Submit
  7: [
    {
      label: "Did You Know?",
      labelStyle: "know",
      headline: "Every placement earns a fee share — based on outcome, not activity.",
      body: "Scouts are rewarded when candidates are successfully placed. There are no retainer fees, no subscriptions, and no cost to join. Performance drives everything.",
      source: "LLP Platform",
    },
    {
      label: "Trust Note",
      labelStyle: "trust",
      headline: "LLP reviews every profile before approval.",
      body: "This keeps the quality of the scout network high. It also means every brief you receive has been assessed as a real match to your declared specialization.",
      source: "LLP Platform",
    },
  ],
};

// ─── Label styles ─────────────────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  signal:  "text-sky-700 bg-sky-50 border-sky-200",
  insight: "text-violet-700 bg-violet-50 border-violet-200",
  why:     "text-amber-700 bg-amber-50 border-amber-200",
  trust:   "text-emerald-700 bg-emerald-50 border-emerald-200",
  know:    "text-rose-700 bg-rose-50 border-rose-200",
};

const CARD_BG: Record<string, string> = {
  signal:  "bg-sky-50/60 border-sky-200",
  insight: "bg-violet-50/60 border-violet-200",
  why:     "bg-amber-50/60 border-amber-200",
  trust:   "bg-emerald-50/60 border-emerald-200",
  know:    "bg-rose-50/60 border-rose-200",
};

// ─── Single card ──────────────────────────────────────────────────────────────

function InsightCardItem({ card }: { card: InsightCard }) {
  const style = card.labelStyle ?? "insight";
  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-2 shadow-sm",
      CARD_BG[style]
    )}>
      <span className={cn(
        "inline-block text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full border",
        LABEL_COLORS[style]
      )}>
        {card.label}
      </span>
      <p className="text-sm font-semibold leading-snug text-foreground">
        {card.headline}
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {card.body}
      </p>
      {card.source && (
        <p className="text-[10px] text-muted-foreground/70 italic pt-0.5">
          Source: {card.source}
        </p>
      )}
    </div>
  );
}

// ─── Desktop sidebar panel ────────────────────────────────────────────────────

export function ScoutInsightSidebar({ step }: { step: number }) {
  const cards = STEP_INSIGHTS[step] ?? [];
  if (cards.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest pl-1">
        While you fill in
      </p>
      {cards.map((card, i) => (
        <InsightCardItem key={i} card={card} />
      ))}
    </div>
  );
}

// ─── Mobile collapsible strip ─────────────────────────────────────────────────

export function ScoutInsightMobileStrip({ step }: { step: number }) {
  const [open, setOpen] = useState(false);
  const cards = STEP_INSIGHTS[step] ?? [];
  if (cards.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium">ℹ️ Research & Insights</span>
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {cards.map((card, i) => (
            <InsightCardItem key={i} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
