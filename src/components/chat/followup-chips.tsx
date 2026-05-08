"use client";

import { useEffect, useRef, useState } from "react";
import { SparklesIcon, Loader2Icon } from "lucide-react";
import { OthersButton } from "./others-button";

interface Citation {
  section: string;
  document?: string;
}

interface FollowupChipsProps {
  question: string;
  answer: string;
  citations: Citation[];
  /** Chat-output language code — any entry in CHAT_LANGUAGE_CODES
   *  (en|bn|hi|zh|ko|ja|ar|ur|ms). The /api/chat/followup prompt builder
   *  maps this to the generation directive via getLanguage(code). */
  language: string;
  onChipClick: (text: string) => void;
  /** Shifts focus into the chat textarea when the user clicks
   *  "Others" — threaded from ChatConversationView.handleFocusInput. */
  onFocusInput?: () => void;
  /** Assistant message id + conversation id. When both are present and
   *  are persisted UUIDs, the /api/chat/followup call caches the
   *  generated list on the message row so subsequent mounts (e.g. after
   *  switching conversations) re-use it instead of burning a fresh
   *  Gemini call with a different result. */
  messageId?: string;
  conversationId?: string;
  /** Cached chip list already stored with the message. When non-empty,
   *  we skip the /api/chat/followup fetch entirely and render these. */
  persistedFollowups?: string[] | null;
}

type Status = "loading" | "ready" | "empty";

/**
 * Renders 3-5 clickable follow-up question chips under an assistant
 * message. Calls /api/chat/followup once on mount. Silent fail —
 * followup chips are enhancement, not core. If the API returns an
 * empty array (or fails), we render nothing.
 */
export function FollowupChips({
  question,
  answer,
  citations,
  language,
  onChipClick,
  onFocusInput,
  messageId,
  conversationId,
  persistedFollowups,
}: FollowupChipsProps) {
  // Seed from the persisted list when the message already carries one —
  // switching back to a historic conversation skips the network entirely.
  const persistedSeed =
    Array.isArray(persistedFollowups) && persistedFollowups.length > 0
      ? persistedFollowups
      : null;

  const [followups, setFollowups] = useState<string[]>(persistedSeed ?? []);
  const [status, setStatus] = useState<Status>(persistedSeed ? "ready" : "loading");

  // Guard against the useEffect being triggered again if props happen to
  // change identity mid-render. We only want one fetch per mount.
  const hasFetchedRef = useRef(persistedSeed !== null);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/chat/followup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            answer,
            citations,
            language,
            message_id: messageId,
            conversation_id: conversationId,
          }),
        });
        if (!res.ok) {
          setStatus("empty");
          return;
        }
        const data = (await res.json()) as { followups?: unknown };
        const list = Array.isArray(data.followups)
          ? (data.followups.filter((x) => typeof x === "string") as string[])
          : [];
        if (list.length === 0) {
          setStatus("empty");
        } else {
          setFollowups(list);
          setStatus("ready");
        }
      } catch {
        setStatus("empty");
      }
    })();
    // We intentionally omit dependencies — fetch once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Empty branch — chip API returned nothing / failed. We still owe the
  // user a forward path, so surface the "Others" button on its own so
  // they can type a free-text question. Per doc 03 spec.
  if (status === "empty") {
    return (
      <div className="pt-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <SparklesIcon className="size-3.5" />
          <span>
            {language === "bn"
              ? "আপনার পরবর্তী প্রশ্ন লিখুন"
              : "Ask your next question"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <OthersButton language={language === "bn" ? "bn" : "en"} onFocusInput={onFocusInput} variant="solo" />
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="pt-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <SparklesIcon className="size-3.5" />
          <span>{language === "bn" ? "পরবর্তী প্রশ্ন..." : "Suggested follow-ups..."}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex h-9 w-44 items-center justify-center gap-2 rounded-full border border-border bg-muted/60 px-3 text-xs text-muted-foreground animate-pulse"
            >
              <Loader2Icon className="size-3.5 animate-spin shrink-0" />
              <span>{language === "bn" ? "লোড হচ্ছে..." : "Loading..."}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-1 codex-chips">
      <div className="flex items-center gap-2 mb-2.5 text-[11px] uppercase tracking-[0.22em] codex-chips-label">
        <SparklesIcon className="size-3 codex-chips-spark" />
        <span>
          {language === "bn" ? "আপনি আরও জিজ্ঞাসা করতে পারেন" : "You might also ask"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {followups.map((text, i) => (
          <button
            key={`${i}-${text.slice(0, 12)}`}
            type="button"
            onClick={() => onChipClick(text)}
            className="codex-chip group/chip flex items-center gap-2.5 rounded-full px-4 py-1.5 text-[12.5px] whitespace-normal text-left w-full sm:w-auto sm:shrink-0 sm:max-w-[26rem]"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="codex-chip-num" aria-hidden>{romanLower(i + 1)}.</span>
            <span className="codex-chip-text">{text}</span>
          </button>
        ))}
        <div className="basis-full">
          <OthersButton
            language={language === "bn" ? "bn" : "en"}
            onFocusInput={onFocusInput}
            variant="list-item"
            index={followups.length + 1}
          />
        </div>
      </div>
      <style>{`
        .codex-chips-label {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          color: color-mix(in oklab, hsl(var(--foreground)) 60%, transparent);
        }
        .codex-chips-spark { color: #b25c22; }
        .dark .codex-chips-spark { color: #d38044; }

        .codex-chip {
          --chip-rust: #b25c22;
          background: color-mix(in oklab, hsl(var(--foreground)) 4%, transparent);
          border: 1px solid color-mix(in oklab, hsl(var(--foreground)) 10%, transparent);
          color: hsl(var(--foreground));
          cursor: pointer;
          animation: codexChipIn 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
          transition: background 180ms ease, border-color 180ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease;
        }
        .dark .codex-chip { --chip-rust: #d38044; }
        .codex-chip:hover {
          background: color-mix(in oklab, var(--chip-rust) 6%, transparent);
          border-color: color-mix(in oklab, var(--chip-rust) 45%, transparent);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px -10px color-mix(in oklab, var(--chip-rust) 55%, transparent);
        }
        .codex-chip:active { transform: translateY(0) scale(0.97); }
        .codex-chip-num {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--chip-rust);
          min-width: 1.6em;
          display: inline-block;
        }
        .codex-chip-text {
          font-family: var(--font-sans), sans-serif;
          font-weight: 400;
        }
        .codex-chip:hover .codex-chip-text { color: hsl(var(--foreground)); }

        @keyframes codexChipIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .codex-chip { animation: none; transition: none; }
        }
      `}</style>
    </div>
  );
}

function romanLower(n: number): string {
  const m = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
  return m[n - 1] || String(n);
}
