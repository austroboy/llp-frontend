"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckIcon, LoaderIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CHAT_LANGUAGES, getLanguage, type ChatLanguage } from "@/lib/languages";
import { useChatStore } from "@/store/chat-store";

interface ChatLanguagePillProps {
  disabled?: boolean;
}

/**
 * Mid-session language pill for the chat conversation header.
 *
 * Displays the current language as a flag + 2-letter code. Click to open a
 * modal that lets the user pick a different language; confirming costs 1
 * chat usage and retranslates the entire thread (handled server-side).
 */
export function ChatLanguagePill({ disabled }: ChatLanguagePillProps) {
  const chatLanguage = useChatStore((s) => s.chatLanguage);
  const isLoading = useChatStore((s) => s.isLoading);
  const isSwitching = useChatStore((s) => s.isSwitchingLanguage);
  const switchChatLanguage = useChatStore((s) => s.switchChatLanguage);
  const [open, setOpen] = useState(false);
  const [pendingLang, setPendingLang] = useState<string | null>(null);

  const currentLang = getLanguage(chatLanguage);
  const blocked = disabled || isLoading || isSwitching;

  const handleConfirm = async () => {
    if (!pendingLang) return;
    const result = await switchChatLanguage(pendingLang);
    if (result.ok) {
      toast.success(`Conversation translated to ${getLanguage(pendingLang).label}`);
      setOpen(false);
      setPendingLang(null);
    } else {
      toast.error(result.error);
    }
  };

  const handleClose = () => {
    if (isSwitching) return;
    setOpen(false);
    setPendingLang(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => !blocked && setOpen(true)}
        disabled={blocked}
        title={`Response language: ${currentLang.nativeName} — click to change`}
        aria-label={`Change response language (current: ${currentLang.label})`}
        className={cn(
          "chat-lang-pill inline-flex h-8 items-center gap-1.5 rounded-full border pl-1 pr-2.5 transition-colors",
          blocked && "opacity-60 cursor-not-allowed",
        )}
      >
        <span className="relative inline-block size-6 overflow-hidden rounded-full">
          <Image
            src={currentLang.flag}
            alt=""
            width={24}
            height={24}
            className="h-full w-full object-cover"
            aria-hidden
          />
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em]">
          {currentLang.code}
        </span>
      </button>

      {open && (
        <SwitchModal
          currentLang={currentLang}
          pendingLang={pendingLang}
          onPickPending={setPendingLang}
          onConfirm={handleConfirm}
          onClose={handleClose}
          saving={isSwitching}
        />
      )}

      <style>{styles}</style>
    </>
  );
}

interface SwitchModalProps {
  currentLang: ChatLanguage;
  pendingLang: string | null;
  onPickPending: (code: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  saving: boolean;
}

function SwitchModal({
  currentLang,
  pendingLang,
  onPickPending,
  onConfirm,
  onClose,
  saving,
}: SwitchModalProps) {
  const target = pendingLang ? getLanguage(pendingLang) : null;

  return (
    <div
      className="chat-lang-backdrop fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-lang-modal-title"
    >
      <div
        className="chat-lang-modal relative w-full max-w-[460px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Close"
          className="chat-lang-modal__close absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>

        <div className="chat-lang-modal__marker text-[10.5px] uppercase tracking-[0.28em]">
          <span className="text-[color:var(--codex-rust)]">§</span>{" "}
          <span className="text-[color:var(--codex-paper-muted)]">SWITCH RESPONSE LANGUAGE</span>
        </div>

        <h2
          id="chat-lang-modal-title"
          className="chat-lang-modal__title mt-3 text-[22px] leading-tight"
        >
          Translate this conversation
        </h2>

        <p className="chat-lang-modal__body mt-3 text-[13.5px] leading-relaxed">
          Currently in <span className="text-[color:var(--codex-paper)]">{currentLang.nativeName}</span>.
          Switching retranslates every prior message and counts as <span className="text-[color:var(--codex-rust)]">1 chat usage</span> from your daily limit.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {CHAT_LANGUAGES.map((lang) => {
            const isCurrent = lang.code === currentLang.code;
            const isPending = lang.code === pendingLang;
            return (
              <button
                key={lang.code}
                type="button"
                disabled={isCurrent || saving}
                onClick={() => onPickPending(lang.code)}
                aria-label={`${lang.label}${isCurrent ? " (current)" : ""}`}
                className={cn(
                  "chat-lang-modal__opt relative flex items-center gap-2 px-3 py-2",
                  isPending && "chat-lang-modal__opt--pending",
                  isCurrent && "chat-lang-modal__opt--current",
                )}
              >
                <span className="relative inline-block size-5 overflow-hidden rounded-full">
                  <Image
                    src={lang.flag}
                    alt=""
                    width={20}
                    height={20}
                    className="h-full w-full object-cover"
                    aria-hidden
                  />
                </span>
                <span className="truncate text-[12px] font-medium">{lang.label}</span>
                {isCurrent && (
                  <span className="ml-auto text-[9px] uppercase tracking-[0.18em] text-[color:var(--codex-paper-muted)]">
                    NOW
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="chat-lang-modal__btn chat-lang-modal__btn--ghost"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {target && (
              <span className="text-[11px] text-[color:var(--codex-paper-muted)]">
                Translate to {target.nativeName}
              </span>
            )}
            <button
              type="button"
              onClick={onConfirm}
              disabled={!target || saving}
              className="chat-lang-modal__btn chat-lang-modal__btn--confirm inline-flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
                  Translating
                </>
              ) : (
                <>
                  <CheckIcon className="h-3.5 w-3.5" />
                  Switch &amp; charge 1
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = `
  .chat-lang-pill {
    color: var(--codex-paper);
    background: color-mix(in oklab, var(--codex-paper) 4%, transparent);
    border-color: var(--codex-rule-strong);
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    cursor: pointer;
  }
  .chat-lang-pill:hover:not(:disabled) {
    border-color: var(--codex-rust);
    background: color-mix(in oklab, var(--codex-rust) 8%, transparent);
  }

  .chat-lang-backdrop {
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(2px);
    animation: chatLangFade 160ms ease-out both;
  }
  .chat-lang-modal {
    background: linear-gradient(180deg, rgba(255, 251, 238, 0.96) 0%, rgba(246, 239, 222, 0.92) 100%);
    backdrop-filter: blur(14px) saturate(108%);
    -webkit-backdrop-filter: blur(14px) saturate(108%);
    border: 1px solid var(--codex-rule-strong);
    box-shadow: 0 24px 64px -24px rgba(0, 0, 0, 0.55);
    color: var(--codex-paper);
    animation: chatLangSlide 200ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  .dark .chat-lang-modal {
    background: linear-gradient(180deg, rgba(20, 17, 16, 0.96) 0%, rgba(13, 11, 11, 0.96) 100%);
  }
  .chat-lang-modal__marker {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
  }
  .chat-lang-modal__title {
    font-family: var(--font-baskerville), Georgia, serif;
    color: var(--codex-paper);
  }
  .chat-lang-modal__body {
    font-family: var(--font-fraunces), var(--font-lora), serif;
    font-style: italic;
    color: var(--codex-paper-muted);
  }

  .chat-lang-modal__close {
    color: var(--codex-paper-muted);
    background: transparent;
    border: 1px solid var(--codex-rule);
    cursor: pointer;
    transition: color 140ms ease, border-color 140ms ease;
  }
  .chat-lang-modal__close:hover {
    color: var(--codex-paper);
    border-color: var(--codex-rule-strong);
  }

  .chat-lang-modal__opt {
    color: var(--codex-paper-muted);
    background: color-mix(in oklab, var(--codex-paper) 3%, transparent);
    border: 1px solid var(--codex-rule);
    cursor: pointer;
    transition: all 140ms ease;
    text-align: left;
  }
  .chat-lang-modal__opt:hover:not(:disabled) {
    color: var(--codex-paper);
    border-color: var(--codex-rule-strong);
    transform: translateY(-1px);
  }
  .chat-lang-modal__opt--pending {
    color: var(--codex-paper);
    border-color: var(--codex-rust);
    background: color-mix(in oklab, var(--codex-rust) 10%, transparent);
    box-shadow: inset 0 0 0 1px var(--codex-rust);
  }
  .chat-lang-modal__opt--current {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .chat-lang-modal__opt:disabled {
    cursor: not-allowed;
  }

  .chat-lang-modal__btn {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    padding: 8px 14px;
    border: 1px solid var(--codex-rule-strong);
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
  }
  .chat-lang-modal__btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .chat-lang-modal__btn--ghost {
    color: var(--codex-paper-muted);
    background: transparent;
  }
  .chat-lang-modal__btn--ghost:hover:not(:disabled) {
    color: var(--codex-paper);
    border-color: var(--codex-paper);
  }
  .chat-lang-modal__btn--confirm {
    color: var(--codex-send-icon-color);
    background: linear-gradient(180deg,
      color-mix(in oklab, var(--codex-rust) 88%, white) 0%,
      var(--codex-rust-deep) 100%);
    border-color: var(--codex-rust-deep);
    box-shadow: inset 0 1px 0 color-mix(in oklab, white 28%, transparent);
  }
  .chat-lang-modal__btn--confirm:hover:not(:disabled) { filter: brightness(1.05); }

  @keyframes chatLangFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes chatLangSlide {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`;
