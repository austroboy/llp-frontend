"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckIcon, ChevronDownIcon, PencilIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CHAT_LANGUAGES,
  DEFAULT_CHAT_LANGUAGE,
  getLanguage,
  isSupportedLanguage,
  type ChatLanguage,
} from "@/lib/languages";

const SESSION_LS_KEY = "llp-chat-session-language";
const DEFAULT_LS_KEY = "llp-chat-default-language";

interface LanguageSelectorProps {
  selected: string;
  onSelect: (code: string) => void;
  className?: string;
}

export function LanguageSelector({
  selected,
  onSelect,
  className,
}: LanguageSelectorProps) {
  const [defaultLang, setDefaultLang] = useState<string>(DEFAULT_CHAT_LANGUAGE);
  const [pendingDefault, setPendingDefault] = useState<string | null>(null);
  const [savingDefault, setSavingDefault] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside / Escape collapses the picker. Disabled while the
  // "set as default" modal is open so it doesn't double-dismiss.
  useEffect(() => {
    if (!expanded || pendingDefault) return;
    const onPointer = (e: PointerEvent) => {
      const node = containerRef.current;
      if (!node) return;
      if (e.target instanceof Node && node.contains(e.target)) return;
      setExpanded(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded, pendingDefault]);

  // On mount: hydrate default from localStorage instantly, then verify with
  // server. If the server-side default differs and the user has not made an
  // explicit session pick yet, also nudge the active selection so cross-device
  // defaults take effect on first load.
  useEffect(() => {
    const cached = localStorage.getItem(DEFAULT_LS_KEY);
    if (cached && isSupportedLanguage(cached)) setDefaultLang(cached);

    let cancelled = false;
    fetch("/api/user/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.preferred_chat_language) return;
        const code = data.preferred_chat_language as string;
        if (!isSupportedLanguage(code)) return;
        setDefaultLang(code);
        localStorage.setItem(DEFAULT_LS_KEY, code);
        const sessionPick = localStorage.getItem(SESSION_LS_KEY);
        if (!isSupportedLanguage(sessionPick) && code !== selected) {
          onSelect(code);
        }
      })
      .catch(() => {
        // Offline / unauthenticated — silent fall-through to localStorage value.
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (code: string) => {
    if (!isSupportedLanguage(code)) return;
    if (code !== selected) {
      localStorage.setItem(SESSION_LS_KEY, code);
      onSelect(code);
    }
    // Always collapse after a pick, even if the same flag was reclicked.
    setExpanded(false);
  };

  const askSetDefault = (code: string) => {
    if (code === defaultLang) return;
    setPendingDefault(code);
  };

  const confirmSetDefault = async () => {
    if (!pendingDefault) return;
    setSavingDefault(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferred_chat_language: pendingDefault }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDefaultLang(pendingDefault);
      localStorage.setItem(DEFAULT_LS_KEY, pendingDefault);
      toast.success(`Default language set to ${getLanguage(pendingDefault).label}`);
      setPendingDefault(null);
    } catch (err) {
      toast.error("Could not save default. Try again.");
    } finally {
      setSavingDefault(false);
    }
  };

  const currentLang = getLanguage(selected);
  // Expanded row: current selection sits last so the layout doesn't jump
  // between collapsed (single trigger) and expanded (row + trigger) states.
  const otherLanguages = CHAT_LANGUAGES.filter((l) => l.code !== selected);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "lang-selector relative flex min-w-0 items-center gap-1.5",
          className,
        )}
        role="group"
        aria-label="Response language"
      >
        <div
          className={cn(
            "lang-selector__row flex items-center gap-1.5 overflow-hidden",
            expanded ? "lang-selector__row--open" : "lang-selector__row--closed",
          )}
          role="radiogroup"
          aria-label="Available languages"
          aria-hidden={!expanded}
        >
          {otherLanguages.map((lang, i) => (
            <span
              key={lang.code}
              className="lang-selector__opt"
              style={
                {
                  "--lang-i": String(otherLanguages.length - i - 1),
                } as React.CSSProperties
              }
            >
              <FlagButton
                lang={lang}
                isSelected={false}
                isDefault={lang.code === defaultLang}
                onSelect={() => handleSelect(lang.code)}
                onAskDefault={() => askSetDefault(lang.code)}
              />
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-haspopup="listbox"
          aria-label={`Response language: ${currentLang.label}. Click to ${expanded ? "close" : "open"} picker.`}
          data-lang-tip={`${currentLang.label === currentLang.nativeName ? currentLang.label : `${currentLang.label} · ${currentLang.nativeName}`}${currentLang.code === defaultLang ? " — default" : ""}`}
          className={cn(
            "lang-trigger lang-flag-wrap inline-flex items-center gap-1 rounded-full pl-0.5 pr-1.5",
            expanded && "lang-trigger--open",
          )}
        >
          <span
            className={cn(
              "lang-flag relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full",
              currentLang.code === defaultLang && "lang-flag--default",
            )}
            aria-hidden
          >
            <Image
              src={currentLang.flag}
              alt=""
              width={28}
              height={28}
              className="h-full w-full object-cover"
              aria-hidden
            />
            {currentLang.code === defaultLang && (
              <span className="lang-flag__dot" aria-hidden />
            )}
          </span>
          <ChevronDownIcon
            className={cn(
              "lang-trigger__chev size-3 shrink-0 transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </div>

      {pendingDefault && (
        <DefaultConfirmModal
          target={getLanguage(pendingDefault)}
          current={getLanguage(defaultLang)}
          saving={savingDefault}
          onConfirm={confirmSetDefault}
          onCancel={() => setPendingDefault(null)}
        />
      )}

      <style>{styles}</style>
    </>
  );
}

interface FlagButtonProps {
  lang: ChatLanguage;
  isSelected: boolean;
  isDefault: boolean;
  onSelect: () => void;
  onAskDefault: () => void;
}

function FlagButton({
  lang,
  isSelected,
  isDefault,
  onSelect,
  onAskDefault,
}: FlagButtonProps) {
  const labelText = lang.label === lang.nativeName
    ? lang.label
    : `${lang.label} · ${lang.nativeName}`;
  const tooltipLabel = `${labelText}${isDefault ? " — default" : ""}`;
  return (
    <div className="lang-flag-wrap relative" data-lang-tip={tooltipLabel}>
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={`${lang.label}${isDefault ? " (default)" : ""}`}
        onClick={onSelect}
        className={cn(
          "lang-flag relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full transition-all",
          isSelected && "lang-flag--selected",
          isDefault && "lang-flag--default",
        )}
      >
        <Image
          src={lang.flag}
          alt=""
          width={28}
          height={28}
          className="h-full w-full object-cover"
          aria-hidden
        />
        {isDefault && !isSelected && (
          <span className="lang-flag__dot" aria-hidden />
        )}
      </button>

      {isSelected && !isDefault && (
        <button
          type="button"
          onClick={onAskDefault}
          aria-label={`Set ${lang.label} as default`}
          title="Set as default"
          className="lang-flag__edit absolute -right-1 -top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full"
        >
          <PencilIcon className="h-2 w-2" />
        </button>
      )}

      {isDefault && (
        <span
          className="lang-flag__badge pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7.5px] font-semibold uppercase tracking-[0.18em]"
          aria-hidden
        >
          DEF
        </span>
      )}
    </div>
  );
}

interface DefaultConfirmModalProps {
  target: ChatLanguage;
  current: ChatLanguage;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DefaultConfirmModal({
  target,
  current,
  saving,
  onConfirm,
  onCancel,
}: DefaultConfirmModalProps) {
  return (
    <div
      className="lang-modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-modal-title"
    >
      <div
        className="lang-modal relative w-full max-w-[380px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="lang-modal__close absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>

        <div className="lang-modal__marker text-[10.5px] uppercase tracking-[0.28em]">
          <span className="text-[color:var(--codex-rust)]">§</span>{" "}
          <span className="text-[color:var(--codex-paper-muted)]">DEFAULT LANGUAGE</span>
        </div>

        <h2
          id="lang-modal-title"
          className="lang-modal__title mt-3 text-[22px] leading-tight"
        >
          Set <span className="text-[color:var(--codex-rust)]">{target.label}</span> as your default?
        </h2>

        <p className="lang-modal__body mt-3 text-[13.5px] leading-relaxed">
          New chats will start in {target.nativeName}. Currently {current.nativeName}.
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="lang-modal__btn lang-modal__btn--ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="lang-modal__btn lang-modal__btn--confirm inline-flex items-center gap-1.5"
          >
            <CheckIcon className="h-3.5 w-3.5" />
            {saving ? "Saving" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = `
  /* Collapsible row — flags fan out left of the trigger on click */
  .lang-selector__row {
    transition: max-width 280ms cubic-bezier(0.4, 0, 0.2, 1);
    will-change: max-width;
  }
  .lang-selector__row--closed {
    max-width: 0;
    pointer-events: none;
  }
  .lang-selector__row--open {
    /* Sized for 8 fanned flags + gaps; bumps if you add more languages. */
    max-width: 340px;
  }
  /* Mobile: constrain to viewport so row can't overflow past the trigger.
     Allow horizontal scroll when the fanned flags exceed the cap. */
  @media (max-width: 640px) {
    .lang-selector__row {
      overflow-x: auto;
      scrollbar-width: none;
    }
    .lang-selector__row::-webkit-scrollbar { display: none; }
    .lang-selector__row--open {
      /* Labels hidden <lg — only trigger + page padding to reserve. */
      max-width: min(340px, calc(100vw - 100px));
    }
  }
  .lang-selector__opt {
    display: inline-flex;
    opacity: 0;
    transform: translateX(8px);
    transition:
      opacity 180ms ease,
      transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: calc(var(--lang-i, 0) * 22ms);
  }
  .lang-selector__row--open .lang-selector__opt {
    opacity: 1;
    transform: translateX(0);
  }

  /* Trigger — compact pill with chevron, hosts the active flag. */
  .lang-trigger {
    color: var(--codex-paper);
    background: color-mix(in oklab, var(--codex-paper) 4%, transparent);
    border: 1px solid var(--codex-rule);
    cursor: pointer;
    transition: background 140ms ease, border-color 140ms ease;
  }
  .lang-trigger:hover {
    border-color: var(--codex-rule-strong);
    background: color-mix(in oklab, var(--codex-paper) 7%, transparent);
  }
  .lang-trigger--open {
    border-color: var(--codex-rust);
    background: color-mix(in oklab, var(--codex-rust) 8%, transparent);
  }
  .lang-trigger__chev {
    color: var(--codex-paper-muted);
  }
  .lang-trigger:hover .lang-trigger__chev,
  .lang-trigger--open .lang-trigger__chev {
    color: var(--codex-paper);
  }

  /* CSS-only hover tooltip — instant, no portal, matches Codex aesthetic */
  .lang-flag-wrap[data-lang-tip]::before,
  .lang-flag-wrap[data-lang-tip]::after {
    pointer-events: none;
    opacity: 0;
    transition: opacity 120ms ease, transform 160ms cubic-bezier(0.4, 0, 0.2, 1);
    position: absolute;
    left: 50%;
    z-index: 30;
  }
  .lang-flag-wrap[data-lang-tip]::before {
    content: attr(data-lang-tip);
    bottom: calc(100% + 10px);
    transform: translate(-50%, 4px);
    white-space: nowrap;
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--codex-paper);
    background: var(--codex-bg);
    border: 1px solid var(--codex-rule-strong);
    padding: 5px 9px;
    box-shadow: 0 6px 18px -8px rgba(0, 0, 0, 0.45);
  }
  .lang-flag-wrap[data-lang-tip]::after {
    content: "";
    bottom: calc(100% + 6px);
    transform: translate(-50%, 4px) rotate(45deg);
    width: 6px;
    height: 6px;
    background: var(--codex-bg);
    border-right: 1px solid var(--codex-rule-strong);
    border-bottom: 1px solid var(--codex-rule-strong);
  }
  .lang-flag-wrap:hover[data-lang-tip]::before,
  .lang-flag-wrap:focus-within[data-lang-tip]::before {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  .lang-flag-wrap:hover[data-lang-tip]::after,
  .lang-flag-wrap:focus-within[data-lang-tip]::after {
    opacity: 1;
    transform: translate(-50%, 0) rotate(45deg);
  }

  .lang-flag {
    background: color-mix(in oklab, var(--codex-paper) 5%, transparent);
    border: 1px solid var(--codex-rule);
    cursor: pointer;
    box-sizing: border-box;
  }
  .lang-flag:hover {
    border-color: var(--codex-rule-strong);
    transform: translateY(-1px);
  }
  .lang-flag--selected {
    border-color: var(--codex-rust);
    box-shadow:
      0 0 0 2px color-mix(in oklab, var(--codex-rust) 30%, transparent),
      inset 0 0 0 1px color-mix(in oklab, white 20%, transparent);
    transform: translateY(-1px);
  }
  .lang-flag--default:not(.lang-flag--selected) {
    border-color: color-mix(in oklab, var(--codex-rust) 60%, var(--codex-rule-strong));
  }
  .lang-flag__dot {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 6px;
    height: 6px;
    border-radius: 9999px;
    background: var(--codex-rust);
    box-shadow: 0 0 0 1.5px var(--codex-bg);
  }
  .lang-flag__edit {
    color: var(--codex-bg);
    background: var(--codex-rust);
    border: 1px solid var(--codex-bg);
    cursor: pointer;
    transition: transform 140ms ease;
  }
  .lang-flag__edit:hover { transform: scale(1.1); }
  .lang-flag__badge {
    color: var(--codex-rust);
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    text-shadow: 0 1px 0 var(--codex-bg);
  }

  .lang-modal-backdrop {
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(2px);
    animation: langFade 160ms ease-out both;
  }
  .lang-modal {
    background: linear-gradient(180deg, var(--codex-frame-bg) 0%, var(--codex-frame-bg-end) 100%);
    border: 1px solid var(--codex-rule-strong);
    box-shadow: 0 24px 64px -24px rgba(0, 0, 0, 0.55);
    color: var(--codex-paper);
    animation: langSlide 200ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  .lang-modal__marker {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
  }
  .lang-modal__title {
    font-family: var(--font-baskerville), Georgia, serif;
    color: var(--codex-paper);
  }
  .lang-modal__body {
    font-family: var(--font-fraunces), var(--font-lora), serif;
    font-style: italic;
    color: var(--codex-paper-muted);
  }
  .lang-modal__close {
    color: var(--codex-paper-muted);
    background: transparent;
    border: 1px solid var(--codex-rule);
    cursor: pointer;
    transition: color 140ms ease, border-color 140ms ease;
  }
  .lang-modal__close:hover {
    color: var(--codex-paper);
    border-color: var(--codex-rule-strong);
  }
  .lang-modal__btn {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    padding: 8px 14px;
    border: 1px solid var(--codex-rule-strong);
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
  }
  .lang-modal__btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .lang-modal__btn--ghost {
    color: var(--codex-paper-muted);
    background: transparent;
  }
  .lang-modal__btn--ghost:hover:not(:disabled) {
    color: var(--codex-paper);
    border-color: var(--codex-paper);
  }
  .lang-modal__btn--confirm {
    color: var(--codex-send-icon-color);
    background: linear-gradient(180deg,
      color-mix(in oklab, var(--codex-rust) 88%, white) 0%,
      var(--codex-rust-deep) 100%);
    border-color: var(--codex-rust-deep);
    box-shadow: inset 0 1px 0 color-mix(in oklab, white 28%, transparent);
  }
  .lang-modal__btn--confirm:hover:not(:disabled) { filter: brightness(1.05); }

  @keyframes langFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes langSlide {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`;
