"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileDownIcon, Loader2Icon, XIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useChatStore } from "@/store/chat-store";
import { useLanguage } from "@/hooks/use-language";
import { track } from "@/lib/posthog/events";

interface DownloadPdfButtonProps {
  conversationId: string;
  conversationTitle: string;
  hasEnglishSource: boolean;
  hasAnySummary: boolean;
  hasAnyVerify: boolean;
  className?: string;
  /** `pill` = full labeled CTA (sits beside Generate Document).
   *  `icon` = square icon-only button for the top action row. */
  variant?: "pill" | "icon";
}

interface ExportOptions {
  includeEnglish: boolean;
  includeSummary: boolean;
  includeVerify: boolean;
}

/**
 * Primary "Download PDF" CTA for an assistant conversation. Sits beside
 * Generate Document in the message action bar (not inside the Share menu).
 *
 * Click → options modal with three toggles:
 *   1. Include English source (pulled from content_en when present)
 *   2. Include Summarize result (if the user ran Summarize)
 *   3. Include Verify Citations result (if the user ran Verify)
 *
 * Confirm → creates / refreshes a shared_conversations snapshot, sends the
 * per-message overlay payload (summaries + verify reports) to the API, then
 * calls /api/chat/pdf which renders via the print page (Puppeteer → vector
 * PDF with selectable text and embedded fonts).
 */
export function DownloadPdfButton({
  conversationId,
  conversationTitle,
  hasEnglishSource,
  hasAnySummary,
  hasAnyVerify,
  className,
  variant = "pill",
}: DownloadPdfButtonProps) {
  const { t } = useLanguage();
  const messageSummaries = useChatStore((s) => s.messageSummaries);
  const messageVerifyReports = useChatStore((s) => s.messageVerifyReports);
  const userTier = useChatStore((s) => s.userTier);

  const [modalOpen, setModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    includeEnglish: false,
    includeSummary: hasAnySummary,
    includeVerify: hasAnyVerify,
  });

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const downloadBlob = useCallback(
    (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = conversationTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 50);
      a.href = url;
      a.download = `LLP-Universe-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [conversationTitle]
  );

  const handleConfirm = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      // Only pass overlays for persisted messages (UUID keys)
      const summaryOverlay: Record<string, typeof messageSummaries[string]> = {};
      if (options.includeSummary) {
        for (const [id, s] of Object.entries(messageSummaries)) {
          if (UUID_RE.test(id)) summaryOverlay[id] = s;
        }
      }
      const verifyOverlay: Record<string, typeof messageVerifyReports[string]> = {};
      if (options.includeVerify) {
        for (const [id, v] of Object.entries(messageVerifyReports)) {
          if (UUID_RE.test(id)) verifyOverlay[id] = v;
        }
      }

      const shareRes = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          scope: "conversation",
          message_summaries: summaryOverlay,
          message_verify_reports: verifyOverlay,
          include_english_source: options.includeEnglish,
        }),
      });
      if (!shareRes.ok) {
        const detail = await shareRes.text().catch(() => "");
        console.error("[download-pdf] share create failed", shareRes.status, detail);
        toast.error(t("share.pdfFailed") || "PDF failed — try again");
        return;
      }
      const shareData = await shareRes.json();
      const publicId: string | undefined = shareData.public_id;
      if (!publicId) {
        toast.error(t("share.pdfFailed") || "PDF failed — try again");
        return;
      }

      const pdfRes = await fetch("/api/chat/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_id: publicId,
          include_english: options.includeEnglish,
          include_summary: options.includeSummary,
          include_verify: options.includeVerify,
        }),
      });
      if (!pdfRes.ok) {
        const detail = await pdfRes.text().catch(() => "");
        console.error("[download-pdf] pdf render failed", pdfRes.status, detail);
        toast.error(t("share.pdfFailed") || "PDF failed — try again");
        return;
      }
      const blob = await pdfRes.blob();
      downloadBlob(blob);
      // Dual-fire: existing chat_export_clicked + new
      // compliance_report_exported. The latter accepts an optional
      // file_id; PDF export of an entire conversation is shareable
      // by public_id, so we pass that as the file_id surrogate.
      void track("chat_export_clicked", { format: "pdf" });
      void track("compliance_report_exported", {
        file_id: publicId,
        export_format: "pdf",
        user_tier_id: userTier ?? "free_subscribed",
      });
      setModalOpen(false);
    } catch (err) {
      console.error("[download-pdf] unexpected error", err);
      toast.error(t("share.pdfFailed") || "PDF failed — try again");
    } finally {
      setIsGenerating(false);
    }
  }, [
    isGenerating,
    options,
    conversationId,
    messageSummaries,
    messageVerifyReports,
    UUID_RE,
    downloadBlob,
    t,
    userTier,
  ]);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={cn(
            "inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
            className,
          )}
          aria-label="Download conversation as PDF"
          title="Download PDF"
        >
          <FileDownIcon className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={cn("codex-action-secondary", className)}
          aria-label="Download conversation as PDF"
        >
          <FileDownIcon className="codex-action-icon size-3.5" />
          <span>Download PDF</span>
        </button>
      )}

      {modalOpen && (
        <PdfOptionsModal
          options={options}
          onChange={setOptions}
          onConfirm={handleConfirm}
          onCancel={() => !isGenerating && setModalOpen(false)}
          busy={isGenerating}
          hasEnglishSource={hasEnglishSource}
          hasAnySummary={hasAnySummary}
          hasAnyVerify={hasAnyVerify}
        />
      )}
    </>
  );
}

interface PdfOptionsModalProps {
  options: ExportOptions;
  onChange: (next: ExportOptions) => void;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  hasEnglishSource: boolean;
  hasAnySummary: boolean;
  hasAnyVerify: boolean;
}

function PdfOptionsModal({
  options,
  onChange,
  onConfirm,
  onCancel,
  busy,
  hasEnglishSource,
  hasAnySummary,
  hasAnyVerify,
}: PdfOptionsModalProps) {
  // Escape key closes the modal (unless in the middle of a render)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [busy, onCancel]);

  if (typeof document === "undefined") return null;
  const rows: {
    key: keyof ExportOptions;
    label: string;
    sub: string;
    disabled: boolean;
    disabledReason?: string;
  }[] = [
    {
      key: "includeEnglish",
      label: "Include English source",
      sub: "Adds the original English answer beneath each translated answer.",
      disabled: !hasEnglishSource,
      disabledReason: "No translated messages in this conversation",
    },
    {
      key: "includeSummary",
      label: "Include plain-language summary",
      sub: "Adds the amber Summary + Example card after each summarized answer.",
      disabled: !hasAnySummary,
      disabledReason: "Click Summarize on an answer first",
    },
    {
      key: "includeVerify",
      label: "Include Verify Citations report",
      sub: "Adds the citation-audit result showing verdict + confidence per claim.",
      disabled: !hasAnyVerify,
      disabledReason: "Click Verify Citations on an answer first",
    },
  ];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-options-title"
      className="pdf-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="pdf-modal relative w-full max-w-[440px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label="Close"
          className="pdf-modal__close absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>

        <div className="pdf-modal__marker text-[10.5px] uppercase tracking-[0.28em]">
          <span className="text-[color:var(--codex-rust)]">§</span>{" "}
          <span className="text-[color:var(--codex-paper-muted)]">PDF EXPORT OPTIONS</span>
        </div>
        <h2
          id="pdf-options-title"
          className="pdf-modal__title mt-3 text-[22px] leading-tight"
        >
          Include <span className="text-[color:var(--codex-rust)]">extras</span> in this export?
        </h2>
        <p className="pdf-modal__body mt-2 text-[13px] leading-relaxed">
          Core conversation is always included. Pick the add-ons you want.
        </p>

        <div className="mt-5 space-y-2.5">
          {rows.map((row) => {
            const checked = options[row.key];
            return (
              <label
                key={row.key}
                className={cn(
                  "pdf-option group flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors",
                  row.disabled && "cursor-not-allowed opacity-45"
                )}
                title={row.disabled ? row.disabledReason : undefined}
              >
                <input
                  type="checkbox"
                  checked={!!checked}
                  disabled={row.disabled || busy}
                  onChange={(e) =>
                    onChange({ ...options, [row.key]: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <span
                  className={cn(
                    "pdf-option__check mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-transparent transition-colors",
                    checked && "pdf-option__check--on"
                  )}
                  aria-hidden
                >
                  <CheckIcon className="h-3 w-3" />
                </span>
                <span className="flex-1">
                  <span className="pdf-option__label block text-[13.5px] font-medium">
                    {row.label}
                  </span>
                  <span className="pdf-option__sub mt-0.5 block text-[11.5px] leading-snug">
                    {row.sub}
                    {row.disabled && row.disabledReason && (
                      <>
                        <br />
                        <span className="pdf-option__hint">
                          {row.disabledReason}
                        </span>
                      </>
                    )}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="pdf-modal__btn pdf-modal__btn--ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="pdf-modal__btn pdf-modal__btn--confirm inline-flex items-center gap-1.5"
          >
            {busy ? (
              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDownIcon className="h-3.5 w-3.5" />
            )}
            {busy ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>

      <style>{MODAL_STYLES}</style>
    </div>,
    document.body
  );
}

const MODAL_STYLES = `
  .pdf-modal-backdrop {
    background: rgba(8, 6, 4, 0.82);
    backdrop-filter: blur(6px) saturate(0.85);
    -webkit-backdrop-filter: blur(6px) saturate(0.85);
    animation: pdfFade 160ms ease-out both;
  }
  .pdf-modal {
    background: linear-gradient(180deg, rgba(255, 251, 238, 0.96) 0%, rgba(246, 239, 222, 0.92) 100%);
    backdrop-filter: blur(14px) saturate(108%);
    -webkit-backdrop-filter: blur(14px) saturate(108%);
    border: 1px solid var(--codex-rule-strong);
    box-shadow: 0 24px 64px -24px rgba(0, 0, 0, 0.55);
    color: var(--codex-paper);
    animation: pdfSlide 200ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  .dark .pdf-modal {
    background: linear-gradient(180deg, rgba(20, 17, 16, 0.96) 0%, rgba(13, 11, 11, 0.96) 100%);
  }
  .pdf-modal__marker {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
  }
  .pdf-modal__title {
    font-family: var(--font-baskerville), Georgia, serif;
    color: var(--codex-paper);
  }
  .pdf-modal__body {
    font-family: var(--font-fraunces), var(--font-lora), serif;
    font-style: italic;
    color: var(--codex-paper-muted);
  }
  .pdf-modal__close {
    color: var(--codex-paper-muted);
    background: transparent;
    border: 1px solid var(--codex-rule);
    cursor: pointer;
    transition: color 140ms ease, border-color 140ms ease;
  }
  .pdf-modal__close:hover:not(:disabled) {
    color: var(--codex-paper);
    border-color: var(--codex-rule-strong);
  }
  .pdf-option {
    border-color: var(--codex-rule);
    background: color-mix(in oklab, var(--codex-paper) 3%, transparent);
  }
  .pdf-option:hover:not(.cursor-not-allowed) {
    border-color: var(--codex-rule-strong);
    background: color-mix(in oklab, var(--codex-paper) 5%, transparent);
  }
  .pdf-option:has(input:checked):not(.cursor-not-allowed) {
    border-color: var(--codex-rust);
    background: color-mix(in oklab, var(--codex-rust) 8%, transparent);
  }
  .pdf-option__check {
    border-color: var(--codex-rule-strong);
    background: var(--codex-bg);
  }
  .pdf-option__check--on {
    background: var(--codex-rust);
    border-color: var(--codex-rust);
    color: var(--codex-send-icon-color);
  }
  .pdf-option__label {
    color: var(--codex-paper);
    font-family: var(--font-outfit), system-ui, sans-serif;
  }
  .pdf-option__sub {
    color: var(--codex-paper-muted);
    font-family: var(--font-outfit), system-ui, sans-serif;
  }
  .pdf-option__hint {
    color: color-mix(in oklab, var(--codex-rust) 65%, var(--codex-paper-muted));
    font-style: italic;
  }
  .pdf-modal__btn {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    padding: 8px 14px;
    border: 1px solid var(--codex-rule-strong);
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
  }
  .pdf-modal__btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .pdf-modal__btn--ghost {
    color: var(--codex-paper-muted);
    background: transparent;
  }
  .pdf-modal__btn--ghost:hover:not(:disabled) {
    color: var(--codex-paper);
    border-color: var(--codex-paper);
  }
  .pdf-modal__btn--confirm {
    color: var(--codex-send-icon-color);
    background: linear-gradient(180deg,
      color-mix(in oklab, var(--codex-rust) 88%, white) 0%,
      var(--codex-rust-deep) 100%);
    border-color: var(--codex-rust-deep);
    box-shadow: inset 0 1px 0 color-mix(in oklab, white 28%, transparent);
  }
  .pdf-modal__btn--confirm:hover:not(:disabled) { filter: brightness(1.05); }
  @keyframes pdfFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pdfSlide {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`;
