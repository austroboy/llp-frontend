"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  PaperclipIcon,
  SendIcon,
  XIcon,
  FileTextIcon,
  LoaderIcon,
  ArrowUpRightIcon,
} from "lucide-react";
import {
  MotionConfig,
  motion,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { WorkspaceLayout } from "./workspace-layout";
import { FilesSidebar } from "./files-sidebar";
import { LanguageSelector } from "./language-selector";
import { useLanguage } from "@/hooks/use-language";
import {
  useChatStore,
  readPersistedChatLanguage,
  readPersistedDeepSearch,
} from "@/store/chat-store";
import type { AttachedDocument } from "./chat-input-box";

interface ChatWelcomeScreenProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  onSuggestionClick: (text: string) => void;
  models?: readonly { id: string; label: string; description: string; disabled?: boolean }[];
  attachedDoc: AttachedDocument | null;
  isUploading: boolean;
  onFileSelect: (file: File) => void;
  onRemoveAttachment: () => void;
}

const ACCEPTED_FILE_TYPES =
  ".pdf,.png,.jpg,.jpeg,.docx,.txt,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const CHAPTERS: Array<{
  numeral: string;
  title: string;
  blurb: string;
  query: string;
}> = [
  {
    numeral: "I",
    title: "Termination & Disputes",
    blurb: "Notice, cause, severance, and the arithmetic of lawful dismissal.",
    query: "What are the rules for termination of employment?",
  },
  {
    numeral: "II",
    title: "Wages & Benefits",
    blurb: "Wage timing, overtime, bonus festivals, and lawful deductions.",
    query: "What are the wage payment rules under labour law?",
  },
  {
    numeral: "III",
    title: "Leave & Working Hours",
    blurb: "Annual, sick, casual, maternity — the calendar of rest.",
    query: "What types of leave are workers entitled to?",
  },
  {
    numeral: "IV",
    title: "Compliance & Licensing",
    blurb: "Factory registration, filings, and inspector-facing paperwork.",
    query: "What are the key compliance requirements for employers?",
  },
];

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

export function ChatWelcomeScreen({
  message,
  onMessageChange,
  onSend,
  onSuggestionClick,
  attachedDoc,
  isUploading,
  onFileSelect,
  onRemoveAttachment,
}: ChatWelcomeScreenProps) {
  const { language, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatLang = useChatStore((s) => s.chatLanguage);
  const setChatLanguage = useChatStore((s) => s.setChatLanguage);
  const deepSearchEnabled = useChatStore((s) => s.deepSearchEnabled);
  const toggleDeepSearch = useChatStore((s) => s.toggleDeepSearch);

  // Post-mount hydration: store boots with "en" deterministically across SSR +
  // CSR; sync from localStorage once the client is mounted. Runs once.
  useEffect(() => {
    const persisted = readPersistedChatLanguage();
    if (persisted && persisted !== chatLang) setChatLanguage(persisted);
    const persistedDeep = readPersistedDeepSearch();
    if (persistedDeep !== deepSearchEnabled) toggleDeepSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large (max 10 MB)");
      return;
    }
    onFileSelect(file);
  };

  const [focused, setFocused] = useState(false);
  const canSend = message.trim().length > 0;

  return (
    <WorkspaceLayout
      language={language}
      filesSidebar={<FilesSidebar language={language} />}
    >
      <MotionConfig reducedMotion="user">
        <div className="lf-chat-canvas relative h-full w-full overflow-y-auto overflow-x-hidden">
          <motion.div
            className="lf-chat-section mx-auto flex w-full max-w-[1080px] flex-col gap-12 px-6 py-12 md:px-10 md:py-16 lg:py-20"
            initial="hidden"
            animate="show"
            variants={heroStagger}
          >
            {/* Hero */}
            <header className="flex flex-col gap-4">
              <motion.h1 className="lf-chat-display" variants={fadeUp}>
                Labour &amp; <em>Compliance</em>
              </motion.h1>
            </header>

            {/* Inquiry composer */}
            <motion.section
              className="flex flex-col gap-4"
              variants={fadeUp}
              aria-label="Inquiry"
            >
              <div className="flex items-center justify-end gap-3">
                <LanguageSelector
                  selected={chatLang}
                  onSelect={setChatLanguage}
                />
              </div>

              <div
                className={cn(
                  "lf-chat-composer",
                  focused && "lf-chat-composer--focused",
                )}
              >
                {(attachedDoc || isUploading) && (
                  <div className="lf-chat-composer-attachment">
                    {isUploading ? (
                      <span className="lf-meta lf-meta--accent">
                        <LoaderIcon className="size-3 animate-spin motion-reduce:animate-none" />
                        Reading document
                      </span>
                    ) : attachedDoc ? (
                      <span className="lf-chat-attachment-pill">
                        <FileTextIcon className="size-3.5" />
                        <span className="max-w-[40ch] truncate">
                          {attachedDoc.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={onRemoveAttachment}
                          className="lf-chat-attachment-remove"
                          aria-label="Remove attachment"
                        >
                          <XIcon className="size-3" />
                        </button>
                      </span>
                    ) : null}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => onMessageChange(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (canSend) onSend();
                    }
                  }}
                  rows={4}
                  placeholder={
                    t("input.placeholder") ||
                    "Pose a question, describe a matter, paste a clause…"
                  }
                  className="lf-chat-textarea"
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="lf-chat-composer-toolbar">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      title="Attach a document"
                      className="lf-cta lf-cta--ghost lf-chat-toolbar-btn"
                    >
                      <PaperclipIcon className="size-3.5" />
                      <span>Attach</span>
                    </button>

                    <span className="lf-chat-kbd-hint">
                      <kbd className="lf-chat-kbd">↵</kbd>
                      <span>send</span>
                      <span className="lf-chat-kbd-sep">/</span>
                      <kbd className="lf-chat-kbd">⇧↵</kbd>
                      <span>newline</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => canSend && onSend()}
                    disabled={!canSend}
                    aria-label="Send inquiry"
                    className={cn(
                      "lf-cta lf-cta--primary lf-chat-send",
                      !canSend && "lf-chat-send--idle",
                    )}
                  >
                    <span>Send</span>
                    <SendIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            </motion.section>

            {/* Index */}
            <motion.section
              className="flex flex-col gap-4"
              variants={fadeUp}
              aria-label="Index"
            >
              <motion.div className="lf-chapter-grid" variants={heroStagger}>
                {CHAPTERS.map((ch) => (
                  <motion.button
                    key={ch.numeral}
                    type="button"
                    onClick={() => onSuggestionClick(ch.query)}
                    className="lf-card lf-card--hover lf-chapter-card"
                    variants={fadeUp}
                  >
                    <div className="flex items-center justify-between">
                      <span className="lf-meta lf-meta--accent">
                        CH. {ch.numeral}
                      </span>
                      <ArrowUpRightIcon className="lf-chapter-arrow size-4" />
                    </div>
                    <h3 className="lf-h3 lf-chapter-title">{ch.title}</h3>
                    <p className="lf-body lf-chapter-blurb">{ch.blurb}</p>
                  </motion.button>
                ))}
              </motion.div>
            </motion.section>

            {/* Footnote */}
            <motion.div className="lf-chat-footnote" variants={fadeUp}>
              <span aria-hidden>†</span>
              <p>
                Answers are AI-assisted and cite source provisions. Treat as
                research, not counsel. Verify with a qualified professional
                for matters of consequence.
              </p>
            </motion.div>
          </motion.div>

          <style>{styles}</style>
        </div>
      </MotionConfig>
    </WorkspaceLayout>
  );
}

const styles = `
  /* ---------- Canvas ---------- */
  .lf-chat-canvas {
    color: var(--ink);
    font-family: var(--lf-body);
    /* Firefox */
    scrollbar-width: thin;
    scrollbar-color: color-mix(in oklab, var(--ink) 18%, transparent) transparent;
  }
  /* WebKit / Chromium / Safari */
  .lf-chat-canvas::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  .lf-chat-canvas::-webkit-scrollbar-track {
    background: transparent;
  }
  .lf-chat-canvas::-webkit-scrollbar-thumb {
    background: color-mix(in oklab, var(--ink) 18%, transparent);
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
    transition: background 200ms ease;
  }
  .lf-chat-canvas::-webkit-scrollbar-thumb:hover {
    background: color-mix(in oklab, var(--ink) 32%, transparent);
    background-clip: padding-box;
  }
  .lf-chat-canvas::-webkit-scrollbar-button {
    display: none;
    width: 0;
    height: 0;
  }
  .lf-chat-canvas::-webkit-scrollbar-corner {
    background: transparent;
  }

  /* Dark mode — thumb tinted in the warm coffee family so it blends
     with the chat-frame bg rather than reading as cream contrast. */
  .lf-page[data-theme="dark"] .lf-chat-canvas {
    scrollbar-color: #3a2f22 transparent;
  }
  .lf-page[data-theme="dark"] .lf-chat-canvas::-webkit-scrollbar-thumb {
    background: #3a2f22;
    background-clip: padding-box;
  }
  .lf-page[data-theme="dark"] .lf-chat-canvas::-webkit-scrollbar-thumb:hover {
    background: #4d3e2c;
    background-clip: padding-box;
  }

  /* ---------- Display headline ---------- */
  .lf-chat-display {
    font-family: var(--lf-display);
    font-weight: 500;
    font-size: clamp(40px, 5.4vw, 72px);
    line-height: 1.02;
    letter-spacing: -0.022em;
    color: var(--ink);
    margin: 0;
    font-variation-settings: "opsz" 96, "SOFT" 60;
  }
  .lf-chat-display em {
    font-style: italic;
    font-weight: 400;
    color: var(--ink-2);
    font-variation-settings: "opsz" 144, "SOFT" 100;
  }

  /* ---------- Composer ---------- */
  .lf-chat-composer {
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: var(--r-lg);
    border: 1px solid var(--glass-border);
    background: var(--glass-bg-strong);
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    box-shadow: var(--glass-shadow);
    overflow: hidden;
    transition: border-color 200ms ease, box-shadow 200ms ease;
  }
  .lf-chat-composer--focused {
    border-color: var(--accent-blue);
    box-shadow:
      var(--glass-shadow),
      0 0 0 3px var(--accent-blue-ghost);
  }

  .lf-chat-composer-attachment {
    display: flex;
    align-items: center;
    gap: var(--s-1);
    padding: 10px var(--s-3);
    border-bottom: 1px solid var(--line-1);
    background: color-mix(in oklab, var(--ink) 2%, transparent);
  }
  .lf-chat-attachment-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--line-2);
    background: var(--paper);
    font-size: 12px;
    color: var(--ink-2);
  }
  .lf-chat-attachment-pill svg:first-child { color: var(--accent-blue); }
  .lf-chat-attachment-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    color: var(--ink-3);
    transition: background 160ms ease, color 160ms ease;
  }
  .lf-chat-attachment-remove:hover {
    background: var(--line-2);
    color: var(--ink);
  }

  .lf-chat-textarea {
    width: 100%;
    resize: none;
    background: transparent;
    border: 0;
    outline: 0;
    color: var(--ink);
    font-family: var(--lf-display);
    font-size: 17px;
    line-height: 1.55;
    padding: var(--s-3) var(--s-3) 8px;
    font-variation-settings: "opsz" 28;
  }
  .lf-chat-textarea::placeholder {
    color: var(--ink-4);
    font-style: italic;
  }
  .lf-chat-textarea::-webkit-scrollbar { width: 8px; }
  .lf-chat-textarea::-webkit-scrollbar-thumb {
    background: color-mix(in oklab, var(--ink) 10%, transparent);
    border-radius: 999px;
  }

  .lf-chat-composer-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-2);
    padding: 10px var(--s-2) 10px var(--s-2);
    border-top: 1px solid var(--line-1);
    background: color-mix(in oklab, var(--ink) 1.5%, transparent);
  }

  .lf-chat-toolbar-btn {
    height: 32px;
    padding: 0 12px;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    gap: 6px;
  }

  .lf-chat-kbd-hint {
    display: none;
    align-items: center;
    gap: 6px;
    margin-left: 8px;
    font-family: var(--lf-mono);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  @media (min-width: 640px) {
    .lf-chat-kbd-hint { display: inline-flex; }
  }
  .lf-chat-kbd {
    font-family: var(--lf-mono);
    font-size: 9.5px;
    padding: 2px 5px;
    border: 1px solid var(--line-2);
    border-radius: 4px;
    background: var(--paper);
    color: var(--ink-3);
  }
  .lf-chat-kbd-sep { color: var(--ink-5); }

  .lf-chat-send {
    height: 32px;
    padding: 0 14px;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    gap: 6px;
  }
  .lf-chat-send--idle {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* ---------- Chapter grid ---------- */
  .lf-chapter-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--s-3);
  }
  @media (min-width: 720px) {
    .lf-chapter-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .lf-chapter-card {
    text-align: left;
    padding: var(--s-3) var(--s-3) var(--s-3);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--glass-bg);
    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
                border-color 220ms ease,
                background 220ms ease;
  }
  .lf-chapter-arrow {
    color: var(--accent-blue);
    opacity: 0;
    transform: translate(-4px, 4px);
    transition: opacity 200ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .lf-chapter-card:hover .lf-chapter-arrow {
    opacity: 1;
    transform: translate(0, 0);
  }
  .lf-chapter-card:hover { transform: translateY(-2px); }
  .lf-chapter-title {
    margin: 4px 0 0;
    color: var(--ink);
    transition: color 180ms ease;
  }
  .lf-chapter-card:hover .lf-chapter-title { color: var(--accent-blue); }
  .lf-chapter-blurb {
    margin: 0;
    color: var(--ink-3);
    font-size: 13.5px;
    line-height: 1.5;
  }

  /* ---------- Footnote ---------- */
  .lf-chat-footnote {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding-top: var(--s-3);
    border-top: 1px solid var(--line-1);
    color: var(--ink-3);
    font-family: var(--lf-display);
    font-style: italic;
    font-size: 13px;
    line-height: 1.55;
  }
  .lf-chat-footnote > span {
    color: var(--rust);
    font-style: normal;
    margin-top: 1px;
  }
  .lf-chat-footnote > p { margin: 0; }

  /* ---------- Reduced motion ---------- */
  @media (prefers-reduced-motion: reduce) {
    .lf-chapter-card,
    .lf-chapter-arrow,
    .lf-chapter-title,
    .lf-chat-composer { transition: none; }
    .lf-chapter-card:hover { transform: none; }
  }
`;
