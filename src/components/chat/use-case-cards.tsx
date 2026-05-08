"use client";

import { ArrowUpRightIcon, SparklesIcon } from "lucide-react";
import { OthersButton } from "./others-button";

interface UseCaseCard {
  title: string;
  role: string;
  blurb: string;
  scenario_query: string;
}

interface UseCaseCardsProps {
  /** 3-4 cards emitted by the turn-1 model in clarify mode. */
  options: UseCaseCard[];
  /** Optional 1-sentence rationale ("Termination rules vary by role..."). */
  reason?: string;
  language: "en" | "bn";
  /** Sends the card's `scenario_query` as the next user message. */
  onCardClick: (text: string) => void;
  /** Passes focus into the chat textarea when user clicks Others. */
  onFocusInput?: () => void;
}

/**
 * Turn-1 disambiguation surface. The chat-proxy turn-1 model decides
 * (via system prompt) whether to answer short or — for broad queries
 * — emit a `clarify_options` event carrying 3-4 scenario cards. When
 * cards are present, THIS component replaces the text bubble entirely
 * as the body of the first assistant message.
 *
 * Visual language mirrors the `§ 03 · Index` CHAPTER grid on the
 * welcome screen (codex-chapter-like styling), so turn-1 disambiguation
 * feels like a continuation of the landing experience.
 *
 * Click path: card → `onCardClick(scenario_query)` → chat-message →
 * onSuggestionClick → chat-store.sendMessage → turn-2 routes to orchestrator
 * `llp-chat-followup` (GPT-5.4) for the first visible answer.
 */
/**
 * Defensive client-side sanitize — some historic DB rows (and any future
 * model regression) have raw markdown or leading section-number prefixes
 * baked into `title` / `blurb`. The server route now scrubs fresh
 * payloads, but rendering-side cleanup keeps old conversations readable
 * without a DB migration.
 */
function stripMarkdown(s: string): string {
  return s
    .replace(/[*_`~]+/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .replace(/[…]+\s*$/g, "")
    .replace(/\.{3,}\s*$/g, "")
    .trim();
}
function stripLeadingSection(s: string): string {
  return s
    .replace(/^(?:ধারা|উপ-?ধারা|অনুচ্ছেদ)\s*[০-৯0-9]+[.\):\-—]?\s*/u, "")
    .replace(/^section\s*[0-9]+[.\):\-—]?\s*/i, "")
    .replace(/^chapter\s*[ivxlcdm0-9]+[.\):\-—]?\s*/i, "")
    .trim();
}
function cleanField(raw: string | undefined | null, maxChars: number, isTitle = false): string {
  if (typeof raw !== "string") return "";
  let s = stripMarkdown(raw);
  if (isTitle) s = stripLeadingSection(s);
  if (!s) return "";
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars - 1).trimEnd() + "…";
}

export function UseCaseCards({
  options,
  reason,
  language,
  onCardClick,
  onFocusInput,
}: UseCaseCardsProps) {
  if (!options || options.length === 0) {
    // Shouldn't happen — chat-message.tsx only renders this when
    // clarifyOptions.length > 0 — but guard anyway so the solo Others
    // escape still shows.
    return (
      <div className="pt-2">
        <OthersButton language={language} onFocusInput={onFocusInput} variant="solo" />
      </div>
    );
  }

  return (
    <div className="pt-1">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] mb-2.5 codex-usecase-label">
        <SparklesIcon className="size-3 codex-usecase-spark" />
        <span>
          {language === "bn" ? "আপনার পরিস্থিতি বেছে নিন" : "Refine by scenario"}
        </span>
      </div>

      {reason && (
        <p className="codex-usecase-reason mb-3 text-[13px] leading-relaxed">
          {reason}
        </p>
      )}

      <div className="codex-usecase-panel grid grid-cols-1 gap-1 rounded-[18px] p-3 sm:grid-cols-2 sm:gap-1 sm:p-4">
        {options.map((card, i) => {
          const cleanTitle = cleanField(card.title, 60, true);
          const cleanBlurb = cleanField(card.blurb, 160);
          return (
            <button
              key={`${i}-${cleanTitle.slice(0, 14)}`}
              type="button"
              onClick={() => onCardClick(card.scenario_query)}
              className="codex-usecase-card group/uc relative flex flex-col gap-1 rounded-xl px-5 py-5 text-left"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="codex-usecase-numeral text-[11px] tracking-[0.3em]">
                  CH. {romanUpper(i + 1)}
                  {card.role ? ` · ${card.role.toUpperCase()}` : ""}
                </span>
                <ArrowUpRightIcon className="codex-usecase-arrow size-3.5 -translate-x-1 opacity-0 group-hover/uc:translate-x-0 group-hover/uc:opacity-100 motion-reduce:transition-none" />
              </div>
              <div className="codex-usecase-title mt-1.5 line-clamp-2 text-[17px] leading-tight">
                {cleanTitle}
              </div>
              {cleanBlurb && (
                <p className="mt-1 line-clamp-3 text-[12.5px] leading-relaxed text-[color:var(--usecase-muted)]">
                  {cleanBlurb}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-[10.5px] uppercase tracking-[0.28em] codex-usecase-label">
          {language === "bn" ? "বা" : "or"}
        </span>
        <OthersButton language={language} onFocusInput={onFocusInput} />
        <span
          aria-hidden
          className="h-px flex-1"
          style={{
            background:
              "linear-gradient(to right, color-mix(in oklab, hsl(var(--foreground)) 14%, transparent), transparent)",
          }}
        />
      </div>

      <style>{usecaseStyles}</style>
    </div>
  );
}

function romanUpper(n: number): string {
  const m = ["I", "II", "III", "IV", "V", "VI"];
  return m[n - 1] || String(n);
}

const usecaseStyles = `
  .codex-usecase-label {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    color: color-mix(in oklab, hsl(var(--foreground)) 58%, transparent);
  }
  .codex-usecase-spark { color: #b25c22; }
  .dark .codex-usecase-spark { color: #d38044; }

  .codex-usecase-reason {
    font-family: var(--font-fraunces), var(--font-lora), serif;
    font-style: italic;
    color: color-mix(in oklab, hsl(var(--foreground)) 70%, transparent);
    max-width: 60ch;
  }

  .codex-usecase-panel {
    --usecase-rust: #b25c22;
    --usecase-muted: color-mix(in oklab, hsl(var(--foreground)) 58%, transparent);
    background: #edeadf;
    border: 1px solid rgba(29, 20, 16, 0.10);
    color: hsl(var(--foreground));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
  }
  .dark .codex-usecase-panel {
    --usecase-rust: #d38044;
    background: #121112;
    border-color: rgba(237, 230, 216, 0.13);
    box-shadow: inset 0 1px 0 rgba(237, 230, 216, 0.06);
  }

  .codex-usecase-card {
    --usecase-sage: #2e7d5b;
    border-radius: 12px;
    background-color: color-mix(in oklab, var(--usecase-sage) 6%, transparent);
    border: 1px solid color-mix(in oklab, var(--usecase-sage) 18%, transparent);
    cursor: pointer;
    transition: background-color 180ms ease, border-color 180ms ease,
                transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
    animation: usecaseCardIn 380ms cubic-bezier(0.23, 1, 0.32, 1) both;
  }
  .dark .codex-usecase-card {
    --usecase-sage: #4ade80;
    background-color: color-mix(in oklab, var(--usecase-sage) 5%, transparent);
    border-color: color-mix(in oklab, var(--usecase-sage) 14%, transparent);
  }
  .codex-usecase-card:hover {
    background-color: color-mix(in oklab, var(--usecase-rust) 10%, transparent);
    border-color: color-mix(in oklab, var(--usecase-rust) 35%, transparent);
  }
  .codex-usecase-card:hover .codex-usecase-title {
    color: var(--usecase-rust);
  }
  .codex-usecase-card:active { transform: scale(0.98); }

  /* Arrow reveal — specific properties, not transition-all */
  .codex-usecase-arrow {
    transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1),
                opacity 180ms ease-out;
  }

  .codex-usecase-numeral {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    color: color-mix(in oklab, hsl(var(--foreground)) 50%, transparent);
  }
  .codex-usecase-title {
    font-family: var(--font-fraunces), var(--font-lora), serif;
    font-weight: 500;
    color: hsl(var(--foreground));
    transition: color 140ms ease;
  }

  @keyframes usecaseCardIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .codex-usecase-card { animation: none !important; transition: none !important; }
  }
`;
