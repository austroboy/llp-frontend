"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

const STORAGE_KEY = "llp-announcement-dismissed";
const ANNOUNCEMENT_ID = "launch-may-2026";
const MSG =
  "Launching May 1st, 2026 — Bangladesh's first AI-powered labour law platform";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed !== ANNOUNCEMENT_ID) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, ANNOUNCEMENT_ID);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="codex-announce relative overflow-hidden"
        >
          <div className="relative flex items-center py-3 md:py-[14px]">
            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="codex-announce-dismiss absolute right-3 top-1/2 -translate-y-1/2 z-10 shrink-0 rounded-full p-1.5 focus-visible:outline-none"
              aria-label="Dismiss announcement"
            >
              <X className="size-3.5" />
            </button>

            {/* Soft edge fades so the ticker dissolves at the ends */}
            <span aria-hidden="true" className="codex-announce-fade-l pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-[1]" />
            <span aria-hidden="true" className="codex-announce-fade-r pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-[1]" />

            {/* Ticker */}
            <div className="flex animate-marquee-slow whitespace-nowrap pr-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className="codex-announce-item mx-8 inline-flex items-center gap-3"
                >
                  <span className="codex-announce-mark">&sect; &middot;</span>
                  <span className="codex-announce-text">{MSG}</span>
                </span>
              ))}
            </div>
          </div>

          <style>{`
            .codex-announce {
              --ledger-bg: #efe5cc;
              --ledger-bg-deep: #e8dbb9;
              --ledger-ink: #1d1410;
              --ledger-rust: #b25c22;
              --ledger-rule: rgba(29, 20, 16, 0.15);
              --fade-stop: var(--ledger-bg);
              background:
                linear-gradient(90deg,
                  color-mix(in oklab, var(--ledger-rust) 10%, var(--ledger-bg)) 0%,
                  var(--ledger-bg) 50%,
                  color-mix(in oklab, var(--ledger-rust) 10%, var(--ledger-bg-deep)) 100%);
              border-bottom: 1px solid color-mix(in oklab, var(--ledger-rust) 30%, var(--ledger-rule));
            }
            .dark .codex-announce {
              --ledger-bg: #0f0d0e;
              --ledger-bg-deep: #0b0a0b;
              --ledger-ink: #ede6d8;
              --ledger-rust: #d38044;
              --ledger-rule: rgba(237, 230, 216, 0.12);
              --fade-stop: var(--ledger-bg);
              background:
                linear-gradient(90deg,
                  color-mix(in oklab, var(--ledger-rust) 6%, var(--ledger-bg)) 0%,
                  var(--ledger-bg-deep) 50%,
                  color-mix(in oklab, var(--ledger-rust) 6%, var(--ledger-bg)) 100%);
            }

            .codex-announce-fade-l {
              background: linear-gradient(to right, var(--fade-stop) 10%, transparent 100%);
            }
            .codex-announce-fade-r {
              background: linear-gradient(to left, var(--fade-stop) 30%, transparent 100%);
            }

            .codex-announce-dismiss {
              color: color-mix(in oklab, var(--ledger-ink) 40%, transparent);
              background: color-mix(in oklab, var(--ledger-ink) 4%, transparent);
              border: 1px solid var(--ledger-rule);
              transition: color 160ms ease, background 160ms ease, border-color 160ms ease;
            }
            .codex-announce-dismiss:hover {
              color: var(--ledger-rust);
              background: color-mix(in oklab, var(--ledger-rust) 8%, transparent);
              border-color: color-mix(in oklab, var(--ledger-rust) 40%, transparent);
            }

            .codex-announce-item {
              font-size: 14px;
              line-height: 1.1;
            }
            .codex-announce-mark {
              font-family: var(--font-outfit), ui-sans-serif, sans-serif;
              font-size: 11px;
              letter-spacing: 0.22em;
              text-transform: uppercase;
              color: var(--ledger-rust);
            }
            .codex-announce-text {
              font-family: var(--font-fraunces), var(--font-lora), serif;
              font-style: italic;
              font-weight: 400;
              color: var(--ledger-ink);
              font-variation-settings: "opsz" 22;
            }

            @media (prefers-reduced-motion: reduce) {
              .animate-marquee-slow { animation-play-state: paused !important; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
