"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Copy,
  Check,
  RotateCcw,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Scale,
  User,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from "lucide-react";

// Map document titles to DOC IDs for citation linking
const DOC_TITLE_MAP: Record<string, string> = {
  "bangladesh labour act, 2006": "DOC-001",
  "bangladesh labour (amendment) act, 2009": "DOC-002",
  "bangladesh labour (amendment) act, 2010": "DOC-003",
  "bangladesh labour (amendment) act, 2013": "DOC-004",
  "bangladesh labour (amendment) act, 2018": "DOC-005",
  "bangladesh labour (amendment) ordinance, 2025": "DOC-006",
  "bangladesh labour rules, 2015": "DOC-007",
  "bangladesh labour rules (amendment), 2022": "DOC-008",
};

function buildCitationUrl(document: string, section?: string): string | null {
  const lower = document.toLowerCase();
  const docId = DOC_TITLE_MAP[lower] ||
    Object.entries(DOC_TITLE_MAP).find(([key]) => lower.includes(key) || key.includes(lower))?.[1];

  if (!docId) return null;

  let hash = "";
  if (section) {
    // Normalize section to anchor: "Section 28" -> "section-28"
    hash = "#" + section
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return `/documents/${docId}${hash}`;
}

interface Citation {
  document: string;
  section: string;
  text: string;
}

export interface MessageBranch {
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

export interface CitationsAudit {
  total: number;
  verified: number;
  flagged: number;
  corrected: number;
  confidence_avg: number | null;
  invalid: Array<{ section: string; reason: string }>;
  llmVerdicts?: Array<{
    section: string;
    document_id: string;
    verdict: "correct" | "misquoted" | "fabricated" | "partially_correct";
    confidence: number;
    explanation: string;
  }> | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  citationsAudit?: CitationsAudit;
  timestamp: Date;
  branches?: MessageBranch[];
  activeBranch?: number;
}

interface ChatMessageProps {
  message: Message;
  onBranchChange?: (messageId: string, branchIndex: number) => void;
  onRegenerate?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
}

export function ChatMessage({
  message,
  onBranchChange,
  onRegenerate,
  onEdit,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const shouldReduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const branches = message.branches || [];
  const activeBranch = message.activeBranch ?? 0;
  const totalBranches = branches.length > 0 ? branches.length : 1;
  const hasBranches = totalBranches > 1;

  const currentContent =
    branches.length > 0
      ? branches[activeBranch]?.content ?? message.content
      : message.content;
  const currentCitations =
    branches.length > 0
      ? branches[activeBranch]?.citations ?? message.citations
      : message.citations;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    if (isEditing) {
      const trimmed = editText.trim();
      if (trimmed && trimmed !== message.content) {
        onEdit?.(message.id, trimmed);
      }
      setIsEditing(false);
    } else {
      setEditText(message.content);
      setIsEditing(true);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      className="group relative"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar */}
        <div
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
            isUser
              ? "bg-brand/20 text-brand"
              : "bg-surface border border-border text-foreground-secondary"
          }`}
        >
          {isUser ? <User size={14} /> : <Scale size={14} />}
        </div>

        {/* Content */}
        <div className={`flex-1 min-w-0 ${isUser ? "flex flex-col items-end" : ""}`}>
          {/* Role label */}
          <p className="text-xs font-medium text-muted mb-1.5">
            {isUser ? "You" : "Labor Law Partner"}
          </p>

          {/* Message body */}
          <div
            className={`relative rounded-2xl px-4 py-3 ${
              isUser
                ? "bg-brand text-white max-w-[85%] rounded-tr-md"
                : "bg-surface border border-border max-w-full rounded-tl-md"
            }`}
          >
            {isEditing && isUser ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="w-full bg-transparent text-sm resize-none focus:outline-none text-white placeholder:text-white/50 min-h-[2.5rem]"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-xs px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEdit}
                    className="text-xs px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 font-medium transition-colors"
                  >
                    Save & Send
                  </button>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${message.id}-${activeBranch}`}
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, x: hasBranches ? 16 : 0 }
                  }
                  animate={{ opacity: 1, x: 0 }}
                  exit={
                    shouldReduceMotion
                      ? undefined
                      : { opacity: 0, x: hasBranches ? -16 : 0 }
                  }
                  transition={{ duration: 0.15 }}
                >
                  {isUser ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {currentContent}
                    </p>
                  ) : (
                    <div className="prose-chat text-foreground-secondary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentContent}
                      </ReactMarkdown>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Citations */}
            {!isUser && currentCitations && currentCitations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-medium text-muted">
                    Sources
                  </p>
                  {message.citationsAudit && message.citationsAudit.flagged > 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full"
                      title={`${message.citationsAudit.flagged} citation(s) flagged as potentially invalid`}
                    >
                      <AlertTriangle size={10} />
                      {message.citationsAudit.flagged} flagged
                    </span>
                  )}
                  {message.citationsAudit && message.citationsAudit.confidence_avg !== null && (
                    <span
                      className="text-[10px] text-muted"
                      title="Average confidence score from LLM verification"
                    >
                      {Math.round(message.citationsAudit.confidence_avg * 100)}% confidence
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentCitations.map((c, i) => {
                    const url = buildCitationUrl(c.document, c.section);
                    const verdict = message.citationsAudit?.llmVerdicts?.find(
                      (v) => v.section === c.section
                    );
                    const VerdictIcon = verdict
                      ? verdict.verdict === "correct"
                        ? ShieldCheck
                        : verdict.verdict === "partially_correct"
                          ? ShieldAlert
                          : verdict.verdict === "misquoted" || verdict.verdict === "fabricated"
                            ? ShieldX
                            : null
                      : null;
                    const verdictColor = verdict
                      ? verdict.verdict === "correct"
                        ? "text-green-600 dark:text-green-400"
                        : verdict.verdict === "partially_correct"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-500 dark:text-red-400"
                      : "";

                    if (url) {
                      return (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-brand-muted text-brand border border-brand-border px-2 py-0.5 rounded-full hover:bg-brand/10 transition-colors cursor-pointer"
                          title={verdict?.explanation || undefined}
                        >
                          {VerdictIcon && <VerdictIcon size={10} className={verdictColor} />}
                          {c.document}
                          {c.section && ` · ${c.section}`}
                          <ExternalLink size={10} className="opacity-50" />
                        </a>
                      );
                    }
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs bg-brand-muted text-brand border border-brand-border px-2 py-0.5 rounded-full"
                        title={verdict?.explanation || undefined}
                      >
                        {VerdictIcon && <VerdictIcon size={10} className={verdictColor} />}
                        {c.document}
                        {c.section && ` · ${c.section}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action bar — revealed on hover */}
          <AnimatePresence>
            {hovered && !isEditing && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className={`flex items-center gap-0.5 mt-1 ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {/* Branch nav */}
                {!isUser && hasBranches && (
                  <div className="flex items-center gap-0.5 mr-1">
                    <ActionButton
                      label="Previous branch"
                      onClick={() =>
                        onBranchChange?.(message.id, activeBranch - 1)
                      }
                      disabled={activeBranch === 0}
                    >
                      <ChevronLeft size={13} />
                    </ActionButton>
                    <span className="text-[11px] tabular-nums text-muted min-w-[2.5ch] text-center">
                      {activeBranch + 1}/{totalBranches}
                    </span>
                    <ActionButton
                      label="Next branch"
                      onClick={() =>
                        onBranchChange?.(message.id, activeBranch + 1)
                      }
                      disabled={activeBranch === totalBranches - 1}
                    >
                      <ChevronRight size={13} />
                    </ActionButton>
                  </div>
                )}

                <ActionButton label="Copy message" onClick={handleCopy}>
                  {copied ? (
                    <Check size={13} className="text-brand" />
                  ) : (
                    <Copy size={13} />
                  )}
                </ActionButton>

                {isUser && onEdit && (
                  <ActionButton label="Edit message" onClick={() => setIsEditing(true)}>
                    <Pencil size={13} />
                  </ActionButton>
                )}

                {!isUser && onRegenerate && (
                  <ActionButton
                    label="Regenerate"
                    onClick={() => onRegenerate(message.id)}
                  >
                    <RotateCcw size={13} />
                  </ActionButton>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* Tiny action button used in hover bar */
function ActionButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
