"use client";

import { FileIcon, SparklesIcon } from "lucide-react";

interface CanvasEmptyStateProps {
  language?: "en" | "bn";
}

/**
 * Editorial Codex empty-state for the canvas pane. Appears when no
 * document is currently filed. Reads like a blank page waiting for a
 * clerk's entry — dashed folio, serif heading, ink footnote, three
 * §-marked capabilities.
 */
export function CanvasEmptyState({ language = "en" }: CanvasEmptyStateProps) {
  return (
    <div className="codex-canvas-empty relative flex h-full flex-col items-center justify-center px-6 py-12 text-center overflow-hidden">
      {/* Dot-grid backdrop, mask-faded at center */}
      <div
        aria-hidden="true"
        className="ce-grid pointer-events-none absolute inset-0"
      />
      {/* Law-sign watermark — SVG rendered via CSS mask so its color is
          driven by theme-aware background-color instead of the source fill.
          Anchored to a fixed px-offset so it stays put when the Files
          sidebar opens and the canvas pane resizes. */}
      <div aria-hidden="true" className="ce-watermark pointer-events-none absolute inset-0">
        <div className="ce-watermark-img" />
      </div>

      <div className="relative flex flex-col items-center max-w-[22rem]">
        {/* Folio frame */}
        <div className="ce-folio relative mb-6">
          <div className="ce-folio-paper relative flex h-28 w-24 items-end justify-center overflow-hidden rounded-[10px]">
            <FileIcon className="mb-3 size-10" strokeWidth={1.25} />
            {/* Top-corner fold */}
            <span aria-hidden="true" className="ce-fold absolute right-0 top-0 size-4" />
            {/* Section mark inside */}
            <span aria-hidden="true" className="ce-folio-mark absolute left-2.5 top-2 text-[9px]">&sect;</span>
          </div>
          {/* Ink sparkles */}
          <SparklesIcon aria-hidden="true" className="ce-spark ce-spark-tr absolute -top-1.5 -right-2 size-4" />
          <SparklesIcon aria-hidden="true" className="ce-spark ce-spark-bl absolute -bottom-2 -left-2.5 size-3" />
        </div>

        <h3 className="ce-heading text-[18px] leading-tight">
          {language === "bn" ? "ক্যানভাস খালি" : "The page is blank."}
        </h3>

        <p className="ce-body mt-2 text-[12.5px] leading-relaxed">
          {language === "bn"
            ? "তৈরি করা ডকুমেন্ট এবং ফাইল প্রিভিউ এখানে প্রদর্শিত হবে। উত্তরের নিচে "
            : "Generated briefs and file previews settle here. Use "}
          <span className="ce-pill inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] align-middle">
            <SparklesIcon className="size-3" />
            {language === "bn" ? "ডকুমেন্ট তৈরি" : "Generate Document"}
          </span>
          {language === "bn"
            ? " বোতামটি ব্যবহার করে শুরু করুন।"
            : " beneath any answer to begin a filing."}
        </p>

        {/* Rule with ink-dot centered */}
        <div className="relative w-full mt-7 mb-4">
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-[var(--ledger-rule)]" />
          <div className="ce-dot relative mx-auto" />
        </div>

        <ul className="ce-features space-y-1.5 text-[11.5px]">
          <li><span className="ce-sec">&sect;</span> {language === "bn" ? "DOCX, PDF, XLSX রেন্ডার" : "DOCX · PDF · XLSX rendering"}</li>
          <li><span className="ce-sec">&sect;</span> {language === "bn" ? "সরাসরি ডাউনলোড" : "One-click download"}</li>
          <li><span className="ce-sec">&sect;</span> {language === "bn" ? "ফাইল ইতিহাস সংরক্ষিত" : "Full filing history"}</li>
        </ul>
      </div>

      <style>{`
        .codex-canvas-empty { color: var(--ledger-ink); }

        .ce-grid {
          background-image:
            radial-gradient(circle at 1px 1px, var(--ledger-rule) 1px, transparent 0);
          background-size: 22px 22px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, black 0%, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, black 0%, transparent 80%);
          opacity: 0.7;
        }

        .ce-watermark-img {
          position: absolute;
          top: 50%;
          left: 280px;             /* fixed pixel offset — stays anchored when
                                      the Files sidebar opens or closes */
          width: 160px;
          height: 160px;
          transform: translate3d(-50%, -50%, 0);
          -webkit-mask: url('/law-sign.svg') center / contain no-repeat;
                  mask: url('/law-sign.svg') center / contain no-repeat;
          /* Barely-there imprint — just a breath deeper than the cream bg */
          background-color: #d4c3a0;
          opacity: 0.14;
        }
        .dark .ce-watermark-img {
          background-color: #0c0a09;
          opacity: 0.4;
        }

        .ce-folio-paper {
          background: var(--ledger-frame);
          border: 1px dashed var(--ledger-rule-strong);
          box-shadow:
            inset 0 1px 0 color-mix(in oklab, white 14%, transparent),
            0 16px 34px -18px rgba(0, 0, 0, 0.25);
          color: color-mix(in oklab, var(--ledger-ink) 55%, transparent);
        }
        .ce-fold {
          background:
            linear-gradient(225deg,
              var(--ledger-bg-deep, #e8dbb9) 50%,
              color-mix(in oklab, var(--ledger-ink) 10%, transparent) 50%);
        }
        .dark .ce-fold {
          background:
            linear-gradient(225deg,
              #1a1617 50%,
              color-mix(in oklab, var(--ledger-ink) 8%, transparent) 50%);
        }
        .ce-folio-mark {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          color: var(--ledger-rust);
        }

        .ce-spark { color: color-mix(in oklab, var(--ledger-rust) 80%, white); filter: drop-shadow(0 1px 0 rgba(0,0,0,0.1)); }
        @keyframes ceSparkle1 { 0%, 100% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(14deg) scale(1.08); } }
        @keyframes ceSparkle2 { 0%, 100% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(-18deg) scale(1.12); } }
        .ce-spark-tr { animation: ceSparkle1 3.6s ease-in-out infinite; }
        .ce-spark-bl { animation: ceSparkle2 3.6s ease-in-out 1.2s infinite; }

        .ce-heading {
          font-family: var(--font-fraunces), var(--font-lora), serif;
          font-weight: 500;
          font-variation-settings: "opsz" 28;
          color: var(--ledger-ink);
          letter-spacing: -0.01em;
        }

        .ce-body {
          font-family: var(--font-fraunces), var(--font-lora), serif;
          font-style: italic;
          font-weight: 300;
          color: var(--ledger-ink-muted);
        }

        .ce-pill {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          font-style: normal;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ledger-rust);
          background: color-mix(in oklab, var(--ledger-rust) 12%, transparent);
          border: 1px solid color-mix(in oklab, var(--ledger-rust) 28%, transparent);
        }

        .ce-dot {
          width: 6px; height: 6px; border-radius: 9999px;
          background: var(--ledger-rust);
          box-shadow: 0 0 0 4px color-mix(in oklab, var(--ledger-bg, #efe5cc) 90%, transparent);
        }

        .ce-features { color: var(--ledger-ink-muted); }
        .ce-features li { display: flex; align-items: center; gap: 8px; justify-content: center; }
        .ce-sec { font-family: var(--font-jetbrains), ui-monospace, monospace; color: var(--ledger-rust); font-size: 10px; }

        @media (prefers-reduced-motion: reduce) {
          .ce-spark-tr, .ce-spark-bl { animation: none; }
        }
      `}</style>
    </div>
  );
}
