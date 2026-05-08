"use client";

import { useRef, useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./markdown-renderer";

interface MessageSourceToggleProps {
  /** The English source text preserved from the generator. */
  sourceText: string;
  /** Accessible label for the toggle button. Defaults to "View original English". */
  label?: string;
  className?: string;
}

/**
 * Collapsible "View original English" block.
 *
 * Renders below a translated assistant message when `content_en` exists
 * and differs from the rendered `content`. The English source-of-truth is
 * the generator's actual output, kept for audit and reader verification.
 * Defaults to collapsed; user clicks to expand.
 *
 * Animation uses `max-height` on the inner content so the reveal is smooth
 * without measuring layout. Max height is generous (4000px) to accommodate
 * long legal answers; content shorter than that clamps naturally.
 */
export function MessageSourceToggle({
  sourceText,
  label = "View original English",
  className,
}: MessageSourceToggleProps) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  if (!sourceText.trim()) return null;

  return (
    <div
      className={cn(
        "msg-source-toggle mt-2",
        open && "msg-source-toggle--open",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="msg-source-body"
        className="msg-source-toggle__btn inline-flex items-center gap-1.5 rounded-full border pl-2.5 pr-3 py-1"
      >
        <ChevronRightIcon
          className={cn(
            "msg-source-toggle__chev size-3 shrink-0 transition-transform",
            open && "rotate-90",
          )}
          aria-hidden
        />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </button>

      <div
        id="msg-source-body"
        ref={bodyRef}
        className="msg-source-toggle__body"
        aria-hidden={!open}
      >
        <div className="msg-source-toggle__inner">
          <div className="msg-source-toggle__marker text-[9.5px] uppercase tracking-[0.28em]">
            <span className="text-[color:var(--codex-rust)]">§</span>{" "}
            <span className="text-[color:var(--codex-paper-muted)]">SOURCE · ENGLISH</span>
          </div>
          <div className="msg-source-toggle__content">
            <MarkdownRenderer content={sourceText} className="prose-sm" />
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .msg-source-toggle__btn {
    color: var(--codex-paper-muted);
    background: transparent;
    border-color: var(--codex-rule);
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    cursor: pointer;
    transition: color 140ms ease, border-color 140ms ease, background 140ms ease;
  }
  .msg-source-toggle__btn:hover {
    color: var(--codex-paper);
    border-color: var(--codex-rule-strong);
    background: color-mix(in oklab, var(--codex-paper) 4%, transparent);
  }
  .msg-source-toggle--open .msg-source-toggle__btn {
    color: var(--codex-paper);
    border-color: var(--codex-rust);
    background: color-mix(in oklab, var(--codex-rust) 6%, transparent);
  }
  .msg-source-toggle__chev {
    color: inherit;
  }

  /* Max-height transition — collapses to 0, expands generously. Content
     shorter than the cap sets its natural height. */
  .msg-source-toggle__body {
    max-height: 0;
    overflow: hidden;
    transition: max-height 320ms cubic-bezier(0.4, 0, 0.2, 1),
                opacity 220ms ease;
    opacity: 0;
    will-change: max-height, opacity;
  }
  .msg-source-toggle--open .msg-source-toggle__body {
    max-height: 4000px;
    opacity: 1;
  }

  /* Match the assistant bubble (.codex-ai-bubble) so the source block reads
     as "a nested chat turn". Kept the rust border-left as the sole cue that
     this is source material. */
  .msg-source-toggle__inner {
    margin-top: 8px;
    padding: 16px 20px;
    background: #edeadf;
    border: 1px solid rgba(29, 20, 16, 0.10);
    border-left: 2px solid var(--codex-rust);
    border-radius: 18px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
    color: hsl(var(--foreground));
    font-family: var(--font-sans), sans-serif;
    font-size: 14px;
    line-height: 1.55;
  }
  .dark .msg-source-toggle__inner {
    background: #121112;
    border-color: rgba(237, 230, 216, 0.13);
    border-left-color: var(--codex-rust);
    box-shadow: inset 0 1px 0 rgba(237, 230, 216, 0.06);
  }
  .msg-source-toggle__marker {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    margin-bottom: 10px;
  }
  .msg-source-toggle__content {
    color: inherit;
  }
`;
