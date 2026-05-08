"use client";

import { useChatStore } from "@/store/chat-store";

interface OthersButtonProps {
  language: "en" | "bn";
  onFocusInput?: () => void;
  /** `chip` and `solo` render the rust pill (use-case-cards, empty state).
   *  `list-item` renders the button as a followup-chip row with a Roman
   *  numeral prefix so it reads as the last entry in the chip list. */
  variant?: "chip" | "solo" | "list-item";
  /** 1-based index used by `list-item` to render the Roman numeral
   *  (e.g. `vi.` after five chips). Ignored by other variants. */
  index?: number;
}

function romanLower(n: number): string {
  const m = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
  return m[n - 1] || String(n);
}

/**
 * "Others" escape hatch — calls `enableFreeTextInput()` which flips
 * the chat-store `inputGatedByChips` flag to `false`, re-enabling the
 * textarea, and moves focus into the input.
 *
 * `variant="list-item"` renders as the last numbered row in the follow-up
 * chip list (same shape as codex-chip, rust-filled so it reads as an
 * action, not a question). Other variants render the standalone pill.
 */
export function OthersButton({
  language,
  onFocusInput,
  variant = "chip",
  index,
}: OthersButtonProps) {
  const enableFreeTextInput = useChatStore((s) => s.enableFreeTextInput);

  const pillLabel =
    language === "bn"
      ? "কোনোটিই নয় — আমি নিজে লিখবো"
      : "I'll Type My Own";
  const listLabel =
    language === "bn" ? "আমার নিজের একটি প্রশ্ন আছে" : "I have a different question";
  const label = variant === "list-item" ? listLabel : pillLabel;

  const handleClick = () => {
    enableFreeTextInput();
    // Focus shift happens on next tick so the textarea's `disabled`
    // attribute has flushed to `false` before focus() is attempted.
    requestAnimationFrame(() => onFocusInput?.());
  };

  const ariaLabel =
    language === "bn"
      ? "অন্য প্রশ্ন লিখুন — ইনপুট আনলক করুন"
      : "Type another question — unlock input";

  if (variant === "list-item") {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          aria-label={ariaLabel}
          className="codex-others-row group/others flex items-center gap-2.5 rounded-full px-4 py-1.5 text-[12.5px] whitespace-normal text-left max-w-[26rem]"
          style={{ animationDelay: `${(index ?? 0) * 60}ms` }}
        >
          <span className="codex-others-row-num" aria-hidden>
            {romanLower(index ?? 1)}.
          </span>
          <span className="codex-others-row-label">{label}</span>
        </button>
        <style>{othersStyles}</style>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        className="codex-others-pill group/others inline-flex min-w-0 max-w-full items-center justify-between gap-2 rounded-[10px] px-3 py-1.5 sm:gap-3 sm:px-4"
      >
        <span className="codex-others-label">{label}</span>
        <span aria-hidden className="codex-others-arrow shrink-0">→</span>
      </button>
      <style>{othersStyles}</style>
    </>
  );
}

const othersStyles = `
  .codex-others-pill {
    --others-rust: #b25c22;
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: color-mix(in oklab, #2a1a12 86%, transparent);
    background: linear-gradient(180deg,
      color-mix(in oklab, var(--others-rust) 28%, #fff4e4) 0%,
      color-mix(in oklab, var(--others-rust) 45%, #fff4e4) 100%);
    border: 1px solid color-mix(in oklab, var(--others-rust) 42%, transparent);
    box-shadow:
      inset 0 1px 0 color-mix(in oklab, white 72%, transparent),
      0 4px 14px -8px color-mix(in oklab, var(--others-rust) 28%, transparent);
    cursor: pointer;
    transition: filter 180ms ease, box-shadow 180ms ease,
                transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .dark .codex-others-pill {
    --others-rust: #d38044;
    color: #ffffff;
    background: linear-gradient(180deg,
      color-mix(in oklab, var(--others-rust) 50%, #0a0a0a) 0%,
      color-mix(in oklab, var(--others-rust) 62%, #0a0a0a) 100%);
    border-color: color-mix(in oklab, var(--others-rust) 60%, transparent);
    box-shadow:
      inset 0 1px 0 color-mix(in oklab, white 14%, transparent),
      0 4px 14px -8px color-mix(in oklab, var(--others-rust) 40%, transparent);
  }
  .codex-others-pill:hover {
    filter: brightness(1.04) saturate(1.05);
    box-shadow:
      inset 0 1px 0 color-mix(in oklab, white 65%, transparent),
      0 8px 20px -8px color-mix(in oklab, var(--others-rust) 45%, transparent);
  }
  .codex-others-pill:active { transform: scale(0.97); }
  .codex-others-pill:focus-visible {
    outline: 2px solid var(--others-rust);
    outline-offset: 2px;
  }

  .codex-others-label {
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
    min-width: 0;
    line-height: 1.25;
  }
  @media (min-width: 640px) {
    .codex-others-label { white-space: nowrap; }
  }
  .codex-others-arrow {
    display: inline-block;
    font-size: 13px;
    line-height: 1;
    color: inherit;
    transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .codex-others-pill:hover .codex-others-arrow { transform: translateX(2px); }

  @media (prefers-reduced-motion: reduce) {
    .codex-others-pill,
    .codex-others-arrow { transition: none !important; }
  }

  /* ---- list-item variant: green accent outline so the "different question"
     escape hatch reads as distinct from the regular chip follow-ups ---- */
  .codex-others-row {
    --others-rust: #b25c22;
    --others-green: #16a34a;
    background: color-mix(in oklab, var(--others-green) 6%, transparent);
    border: 1px solid color-mix(in oklab, var(--others-green) 55%, transparent);
    color: hsl(var(--foreground));
    cursor: pointer;
    animation: codexChipIn 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
    transition: background 180ms ease, border-color 180ms ease,
                transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
                box-shadow 180ms ease;
  }
  .dark .codex-others-row {
    --others-rust: #d38044;
    --others-green: #22c55e;
  }
  .codex-others-row:hover {
    background: color-mix(in oklab, var(--others-green) 12%, transparent);
    border-color: color-mix(in oklab, var(--others-green) 80%, transparent);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px -10px color-mix(in oklab, var(--others-green) 60%, transparent);
  }
  .codex-others-row:active { transform: translateY(0) scale(0.98); }
  .codex-others-row:focus-visible {
    outline: 2px solid var(--others-green);
    outline-offset: 2px;
  }
  .codex-others-row-num {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    color: var(--others-rust);
    min-width: 1.6em;
    display: inline-block;
  }
  .codex-others-row-label {
    font-family: var(--font-fraunces), var(--font-lora), serif;
    font-style: italic;
    font-weight: 400;
    color: color-mix(in oklab, hsl(var(--foreground)) 82%, transparent);
  }
  .codex-others-row:hover .codex-others-row-label {
    color: hsl(var(--foreground));
  }

  @keyframes codexChipIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .codex-others-row { animation: none; transition: none; }
  }
`;
