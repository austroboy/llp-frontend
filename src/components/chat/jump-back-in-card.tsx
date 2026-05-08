"use client";

import { useEffect, useState } from "react";
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, LightbulbIcon } from "lucide-react";
import { useChatStore } from "@/store/chat-store";

const MINIMIZED_LS_KEY = "llp-jb-minimized";

interface Greeting {
  greeting: string;
  leftoff: string | null;
  primaryAction: { label: string; conversationId: string } | null;
  newIdea: string | null;
  source: "ai" | "fallback";
}

function clientTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export function JumpBackInCard() {
  const [data, setData] = useState<Greeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const startNewChat = useChatStore((s) => s.startNewChat);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MINIMIZED_LS_KEY);
      if (stored === "1") setMinimized(true);
    } catch { /* localStorage unavailable — keep default */ }
  }, []);

  const toggleMinimized = () => {
    setMinimized((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(MINIMIZED_LS_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  useEffect(() => {
    let alive = true;
    // Immediate client-side greeting shown while AI fetches
    setData({
      greeting: `Good ${clientTimeOfDay()}`,
      leftoff: null,
      primaryAction: null,
      newIdea: null,
      source: "fallback",
    });
    fetch("/api/sidebar/greeting")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Greeting | null) => {
        if (!alive || !j) return;
        setData(j);
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (!data) return null;

  const handlePrimary = () => {
    if (data.primaryAction) {
      selectConversation(data.primaryAction.conversationId);
    }
  };

  const handleNewIdea = () => {
    // Route to new chat and seed the input via URL ?q= so the welcome screen can auto-send
    if (data.newIdea) {
      startNewChat();
      const url = new URL(window.location.href);
      url.searchParams.set("q", data.newIdea.replace(/[?"]/g, "").trim());
      window.location.href = url.toString();
    }
  };

  return (
    <div className="jb-card relative overflow-hidden rounded-[14px]">
      {/* Decorative rust glow */}
      <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full jb-glow-aura blur-2xl jb-glow" />

      <button
        type="button"
        onClick={toggleMinimized}
        aria-label={minimized ? "Expand welcome card" : "Minimize welcome card"}
        aria-expanded={!minimized}
        className="jb-toggle absolute right-2 top-2 z-10 inline-flex size-6 items-center justify-center rounded-md"
      >
        {minimized ? (
          <ChevronDownIcon className="size-3.5" />
        ) : (
          <ChevronUpIcon className="size-3.5" />
        )}
      </button>

      <div className={`relative px-3.5 ${minimized ? "py-2.5" : "pb-3.5 pt-3"}`}>
        {/* Masthead */}
        <div className="flex items-center gap-2 pr-7 text-[9.5px] uppercase tracking-[0.3em]">
          <span className="jb-section">&sect;</span>
          <span className="jb-section-label">Jump back in</span>
          <span className="h-px flex-1 jb-rule" />
        </div>

        {!minimized && (
          <>
            {/* Greeting */}
            <p className="jb-greeting mt-2 text-[17px] leading-[1.1]">
              {data.greeting}
              <span className="jb-greeting-rule" aria-hidden />
            </p>

            {/* Leftoff */}
            {data.leftoff ? (
              <p
                className="jb-leftoff jb-leftoff-clamp mt-2 text-[12px] leading-snug jb-fade"
                title={data.leftoff}
              >
                {data.leftoff}
              </p>
            ) : loading && data.source === "fallback" ? (
              <div className="mt-2.5 space-y-1.5">
                <div className="h-2.5 w-4/5 rounded jb-shimmer" />
                <div className="h-2.5 w-2/3 rounded jb-shimmer" />
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-3 flex flex-col gap-1.5">
              {data.primaryAction && (
                <button
                  type="button"
                  onClick={handlePrimary}
                  className="jb-primary group/btn inline-flex items-center justify-between gap-2 rounded-[10px] px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em]"
                >
                  <span className="truncate">{data.primaryAction.label}</span>
                  <ArrowRightIcon className="size-3.5 shrink-0 transition-transform group-hover/btn:translate-x-0.5 motion-reduce:transition-none" />
                </button>
              )}
              {data.newIdea && (
                <button
                  type="button"
                  onClick={handleNewIdea}
                  title={data.newIdea}
                  className="jb-idea group/idea inline-flex items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left text-[12px] transition-colors"
                >
                  <LightbulbIcon className="size-3 shrink-0 jb-idea-icon" />
                  <span className="truncate jb-idea-text">{data.newIdea}</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .jb-card {
          background:
            linear-gradient(180deg,
              color-mix(in oklab, var(--sb-ink, #1d1410) 3%, transparent) 0%,
              color-mix(in oklab, var(--sb-rust, #b25c22) 5%, transparent) 100%);
          border: 1px solid var(--sb-rule, rgba(29, 20, 16, 0.13));
          box-shadow: inset 0 1px 0 color-mix(in oklab, white 12%, transparent);
        }
        .dark .jb-card {
          background:
            linear-gradient(180deg,
              color-mix(in oklab, var(--sb-ink, #ede6d8) 2%, transparent) 0%,
              color-mix(in oklab, var(--sb-rust, #d38044) 6%, transparent) 100%);
          box-shadow: inset 0 1px 0 color-mix(in oklab, white 4%, transparent);
        }

        .jb-glow-aura {
          background: radial-gradient(circle, color-mix(in oklab, var(--sb-rust, #b25c22) 32%, transparent), transparent 70%);
        }

        .jb-section {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          color: var(--sb-rust, #b25c22);
        }
        .jb-section-label {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          color: var(--sb-ink-muted, rgba(29, 20, 16, 0.62));
        }
        .jb-rule { background: var(--sb-rule, rgba(29, 20, 16, 0.13)); }

        .jb-greeting {
          font-family: var(--font-fraunces), var(--font-lora), serif;
          font-weight: 400;
          font-variation-settings: "opsz" 24, "SOFT" 80;
          color: var(--sb-ink, #1d1410);
          position: relative;
        }

        .jb-leftoff {
          font-family: var(--font-fraunces), var(--font-lora), serif;
          font-style: italic;
          font-weight: 300;
          color: var(--sb-ink-muted, rgba(29, 20, 16, 0.62));
        }
        .jb-leftoff-clamp {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .jb-primary {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          color: #ffffff;
          background: linear-gradient(180deg,
            color-mix(in oklab, var(--sb-rust, #b25c22) 92%, white) 0%,
            color-mix(in oklab, var(--sb-rust, #b25c22) 100%, black 14%) 100%);
          border: 1px solid var(--sb-rust, #b25c22);
          box-shadow:
            inset 0 1px 0 color-mix(in oklab, white 28%, transparent),
            0 6px 18px -8px color-mix(in oklab, var(--sb-rust, #b25c22) 50%, transparent);
          cursor: pointer;
          transition: filter 160ms ease, box-shadow 180ms ease,
                      transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .dark .jb-primary,
        .lf-page[data-theme="dark"] .jb-primary { color: #0a0806; }
        .jb-primary:hover {
          filter: brightness(1.05);
          box-shadow:
            inset 0 1px 0 color-mix(in oklab, white 50%, transparent),
            0 10px 22px -8px color-mix(in oklab, var(--sb-rust, #b25c22) 60%, transparent);
        }
        .jb-primary:active { transform: scale(0.97); }

        .jb-idea {
          background: color-mix(in oklab, var(--sb-ink, #1d1410) 2%, transparent);
          border: 1px solid var(--sb-rule, rgba(29, 20, 16, 0.13));
          color: var(--sb-ink-muted, rgba(29, 20, 16, 0.62));
          font-family: var(--font-fraunces), var(--font-lora), serif;
          font-style: italic;
          font-weight: 400;
          cursor: pointer;
          transition: color 180ms ease, background 180ms ease, border-color 180ms ease,
                      transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .jb-idea:hover {
          color: var(--sb-ink, #1d1410);
          background: color-mix(in oklab, var(--sb-rust, #b25c22) 5%, transparent);
          border-color: color-mix(in oklab, var(--sb-rust, #b25c22) 40%, var(--sb-rule, rgba(29,20,16,0.13)));
        }
        .jb-idea:active { transform: scale(0.98); }
        .jb-idea-icon { color: var(--sb-rust, #b25c22); }

        .jb-shimmer {
          background-image: linear-gradient(90deg,
            color-mix(in oklab, var(--sb-ink, #1d1410) 8%, transparent) 0%,
            color-mix(in oklab, var(--sb-ink, #1d1410) 18%, transparent) 50%,
            color-mix(in oklab, var(--sb-ink, #1d1410) 8%, transparent) 100%);
          background-size: 200% 100%;
          animation: jbShimmer 1.4s linear infinite;
        }

        @keyframes jbGlow { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.08); } }
        .jb-glow { animation: jbGlow 4s ease-in-out infinite; will-change: transform, opacity; }
        @keyframes jbFade { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
        .jb-fade { animation: jbFade 300ms ease-out both; }
        @keyframes jbShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        .jb-toggle {
          color: var(--sb-ink-muted, rgba(29, 20, 16, 0.62));
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: color 160ms ease, background 160ms ease, border-color 160ms ease, transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .jb-toggle:hover {
          color: var(--sb-ink, #1d1410);
          background: color-mix(in oklab, var(--sb-rust, #b25c22) 8%, transparent);
          border-color: color-mix(in oklab, var(--sb-rust, #b25c22) 30%, var(--sb-rule, rgba(29, 20, 16, 0.13)));
        }
        .jb-toggle:active { transform: scale(0.92); }
        .jb-toggle:focus-visible {
          outline: 1px solid var(--sb-rust, #b25c22);
          outline-offset: 1px;
        }

        @media (prefers-reduced-motion: reduce) {
          .jb-glow, .jb-fade, .jb-shimmer { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
