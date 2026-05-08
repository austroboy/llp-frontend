"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  AlertTriangleIcon,
  CheckIcon,
  FileTextIcon,
  FileIcon,
  FileSpreadsheetIcon,
  SparklesIcon,
  Loader2Icon,
  MinusIcon,
  DownloadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, type FilegenPayload } from "@/store/workspace-store";
import {
  DOC_CATALOG,
  detectDocActions,
  type DocMetadata,
  type DocType,
  type Perspective,
} from "@/lib/documents/index";

interface Citation {
  section: string;
  document_id?: string;
  document?: string;
  verbatim?: string;
  /**
   * Some callers (chat message list) pass the clause body as `text`
   * instead of `verbatim`. Accept both — handleSubmit picks whichever
   * is populated.
   */
  text?: string;
}

type DocFormat = "docx" | "pdf" | "xlsx";

interface DocTypeOption {
  id: DocType | "custom";
  label: string;
  labelBn: string;
  description: string;
  descriptionBn: string;
  allowedFormats: DocFormat[];
}

// Derive a builder-facing option from a catalog entry. All curated
// templates support DOCX + PDF (rung 1 does not alter format scope).
// Catalog has no separate Bangla description yet; reuse the EN copy.
function metaToOption(meta: DocMetadata): DocTypeOption {
  return {
    id: meta.id,
    label: meta.label,
    labelBn: meta.labelBn,
    description: meta.description,
    descriptionBn: meta.description,
    allowedFormats: ["docx", "pdf"],
  };
}

const CUSTOM_DOC_TYPE: DocTypeOption = {
  id: "custom",
  label: "Custom document",
  labelBn: "কাস্টম ডকুমেন্ট",
  description: "Describe the document you need and we'll match it to a skill.",
  descriptionBn: "আপনার প্রয়োজনীয় ডকুমেন্টের বিবরণ দিন — আমরা মিলিয়ে নেব।",
  allowedFormats: ["docx", "pdf", "xlsx"],
};

const FORMAT_META: Record<DocFormat, {
  label: string;
  labelBn: string;
  useCase: string;
  useCaseBn: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  docx: {
    label: "DOCX",
    labelBn: "DOCX",
    useCase: "Editable Word document",
    useCaseBn: "সম্পাদনাযোগ্য ওয়ার্ড ডকুমেন্ট",
    icon: FileTextIcon,
  },
  pdf: {
    label: "PDF",
    labelBn: "PDF",
    useCase: "Polished, ready to print or email",
    useCaseBn: "প্রিন্ট বা ইমেইল করার জন্য প্রস্তুত",
    icon: FileIcon,
  },
  xlsx: {
    label: "XLSX",
    labelBn: "XLSX",
    useCase: "Spreadsheet / register / schedule",
    useCaseBn: "স্প্রেডশিট / রেজিস্টার",
    icon: FileSpreadsheetIcon,
  },
};

interface DocumentBuilderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The user's question that produced the cited answer. Forwarded as
   * `chatContext` so the filegen Opus agent has real grounding. */
  question?: string;
  /** The assistant's answer text. Forwarded alongside `question`. */
  answer?: string;
  citations: Citation[];
  language: "en" | "bn";
  /**
   * Caller's best guess at the user's perspective (worker/employer/hr).
   * Threaded into the detector so suggested doc types are filtered by
   * audience. Defaults to "neutral" — catalog entries with "neutral" in
   * their perspective array still surface.
   */
  perspective?: Perspective;
  /** When the PremiumDocButton re-opens us for an in-flight job, it
   *  passes the job id here. We then skip the 3-step form and jump
   *  straight to the "generating" state. */
  resumeJobId?: string | null;
  /**
   * DB-03 — intent-driven pre-select. When set, step 1 decorates the
   * matching card with an amber ring + "Best match for your request"
   * badge and — if the detector didn't rank it — prepends it to the
   * Suggested block. Visual hint only: no auto-advance, the user still
   * clicks to confirm (intent regex isn't reliable enough to skip
   * human confirmation).
   */
  preselectDocType?: DocType | null;
}

/**
 * Three-step builder shell:
 *   Step 1 — pick doc type (filtered grid of 10 types)
 *   Step 2 — pick format (cards per allowed format)
 *   Step 3 — fill a minimal set of inputs + submit
 */
export function DocumentBuilderSheet({
  open,
  onOpenChange,
  question = "",
  answer = "",
  citations,
  language,
  perspective = "neutral",
  resumeJobId = null,
  preselectDocType = null,
}: DocumentBuilderSheetProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [docType, setDocType] = useState<DocTypeOption | null>(null);
  const [format, setFormat] = useState<DocFormat | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{
    topTemplates: DocType[];
    customPrompts: string[];
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    recipientName: "",
    senderName: "",
    companyName: "",
    effectiveDate: "",
    details: "",
    userInstruction: "",
  });

  const launchFilegen = useWorkspaceStore((s) => s.launchFilegen);
  const dismissJob = useWorkspaceStore((s) => s.dismissJob);
  const openCanvas = useWorkspaceStore((s) => s.openCanvas);
  const job = useWorkspaceStore((s) =>
    activeJobId ? s.generatingJobs.find((j) => j.id === activeJobId) ?? null : null,
  );
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  // DB-07c: Phase-2 emitter pipeline (canvas → emit endpoint).
  // When the flag is ON, draft_ready custom path auto-transitions to
  // /chat/builder/canvas. When OFF, the legacy DB-06 placeholder card
  // + raw-JSON download stays visible — non-regressing fallback.
  const PHASE2_ENABLED =
    process.env.NEXT_PUBLIC_ENABLE_PHASE2_EMITTER === "1";

  useEffect(() => {
    if (!open || !resumeJobId) return;
    setActiveJobId(resumeJobId);
    setStep(3);
  }, [open, resumeJobId]);

  // Fire the AI doc-suggest race once per open. Falls silent on
  // network error — detector keeps step 1 usable.
  useEffect(() => {
    if (!open) return;
    if (aiSuggestions) return; // already have a result for this open
    if (resumeJobId) return; // resuming a running job — step 1 skipped
    if (!question && !answer) return;
    let aborted = false;
    setAiLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/chat/doc-suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userQuestion: question,
            assistantAnswer: answer,
            citations: (citations ?? []).map((c) => ({
              section: c.section,
              document: c.document,
            })),
          }),
        });
        if (!res.ok) throw new Error(`http ${res.status}`);
        const payload = (await res.json()) as {
          topTemplates?: DocType[];
          customPrompts?: string[];
        };
        if (aborted) return;
        setAiSuggestions({
          topTemplates: Array.isArray(payload.topTemplates)
            ? payload.topTemplates
            : [],
          customPrompts: Array.isArray(payload.customPrompts)
            ? payload.customPrompts
            : [],
        });
      } catch {
        /* silent — detector fallback is still in play */
      } finally {
        if (!aborted) setAiLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [open, resumeJobId, question, answer, citations, aiSuggestions]);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep(1);
        setDocType(null);
        setFormat(null);
        setActiveJobId(null);
        setAiSuggestions(null);
        setAiLoading(false);
        setForm({
          recipientName: "",
          senderName: "",
          companyName: "",
          effectiveDate: "",
          details: "",
          userInstruction: "",
        });
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (job?.state === "done") {
      onOpenChange(false);
    }
  }, [job?.state, open, onOpenChange]);

  // DB-07c: when Phase-2 is live, hand off draft_ready to the canvas
  // and close this sheet. Effect runs once per state-change so the
  // placeholder UI never flashes — the conditional render below
  // also guards against it.
  useEffect(() => {
    if (!open || !PHASE2_ENABLED) return;
    if (job?.state === "draft_ready" && job?.draft && activeJobId) {
      onOpenChange(false);
      openCanvas(activeJobId);
    }
  }, [
    PHASE2_ENABLED,
    activeJobId,
    job?.state,
    job?.draft,
    onOpenChange,
    open,
    openCanvas,
  ]);

  const draftReady = job?.state === "draft_ready" && !!job?.draft;
  // Placeholder only renders when the flag is OFF — keeps the
  // DB-06 fallback intact for environments that haven't flipped on
  // Phase-2 yet (e.g. Vercel prod until Abs ships the env var).
  const showLegacyPlaceholder = draftReady && !PHASE2_ENABLED;

  const handleDownloadDraft = () => {
    if (!job?.draft) return;
    const blob = new Blob([JSON.stringify(job.draft, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stem = job.draft.document_type || "draft";
    a.download = `${stem}-${job.id.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formats = useMemo<DocFormat[]>(
    () => docType?.allowedFormats ?? ["docx", "pdf"],
    [docType]
  );

  // Detector input: normalize citations into the shape the detector
  // expects (section + document_id). Missing document_id falls back
  // to the human `document` label, then an empty string.
  const suggestions = useMemo(() => {
    const detectorCitations = citations.map((c) => ({
      section: c.section,
      document_id: c.document_id ?? c.document ?? "",
    }));
    return detectDocActions({
      citations: detectorCitations,
      perspective,
      // Tier gating is not enforced in the UI yet (spec Rung 1 keeps
      // Premium badge cosmetic). Pass "max" so every catalog entry is
      // considered regardless of tierRequired.
      tier: "max",
    });
  }, [citations, perspective]);

  const catalogEntries = useMemo(() => Object.values(DOC_CATALOG), []);

  const submitting = job?.state === "running";
  const submitError = job?.state === "error" ? job?.error ?? null : null;

  const handleSubmit = () => {
    if (!docType || !format) return;
    if (activeJobId && job?.state === "error") {
      dismissJob(activeJobId);
    }

    const citedSections = citations.map((c) => ({
      section: c.section,
      document: c.document || c.document_id || "Bangladesh Labour Act, 2006",
      verbatim: c.verbatim || c.text || "",
    }));

    const trimmedQ = question.trim();
    const trimmedA = answer.trim();
    const chatContext =
      trimmedQ || trimmedA
        ? `User asked: ${trimmedQ}\n\nAssistant answered: ${trimmedA}`
        : "";

    const isCustom = docType.id === "custom";
    const payload: FilegenPayload = {
      docType: docType.id,
      outputFormat: format,
      citedSections,
      userInputs: isCustom
        ? {}
        : {
            recipient_name: form.recipientName,
            sender_name: form.senderName,
            company_name: form.companyName,
            effective_date: form.effectiveDate,
            details: form.details,
          },
      perspective: "neutral",
      language,
      chatContext,
      ...(isCustom ? { userInstruction: form.userInstruction } : {}),
    };

    const docTypeLabel = language === "bn" ? docType.labelBn : docType.label;
    const id = launchFilegen(payload, docTypeLabel);
    setActiveJobId(id);
  };

  const handleMinimize = () => {
    onOpenChange(false);
  };

  const t = {
    title: language === "bn" ? "ডকুমেন্ট তৈরি" : "Build document",
    subtitle:
      language === "bn"
        ? "উদ্ধৃত ধারাগুলো থেকে সরাসরি ডকুমেন্ট তৈরি করুন।"
        : "Generate a polished document from your cited sections.",
    stepPick: language === "bn" ? "ডকুমেন্টের ধরন" : "Document type",
    stepFormat: language === "bn" ? "ফরম্যাট" : "Format",
    stepFill: language === "bn" ? "বিবরণ" : "Details",
    next: language === "bn" ? "পরবর্তী" : "Continue",
    back: language === "bn" ? "পিছনে" : "Back",
    generate: language === "bn" ? "ডকুমেন্ট তৈরি করুন" : "Generate document",
    generating: language === "bn" ? "তৈরি হচ্ছে..." : "Generating...",
    minimize: language === "bn" ? "সংক্ষিপ্ত করুন" : "Minimize",
    minimizeHint:
      language === "bn"
        ? "পটভূমিতে চালিয়ে যান"
        : "Keep running in the background",
    recipient: language === "bn" ? "প্রাপকের নাম" : "Recipient name",
    sender: language === "bn" ? "প্রেরকের নাম" : "Your name",
    company: language === "bn" ? "প্রতিষ্ঠানের নাম" : "Company / workplace",
    date: language === "bn" ? "কার্যকর তারিখ" : "Effective date",
    details: language === "bn" ? "অতিরিক্ত বিবরণ" : "Additional details",
    detailsPh:
      language === "bn"
        ? "কোনো নির্দিষ্ট অনুচ্ছেদ বা প্রসঙ্গ জুড়তে চাইলে লিখুন…"
        : "Anything specific you'd like included — context, dates, section callouts…",
    resumedBanner:
      language === "bn"
        ? "আপনার ডকুমেন্ট তৈরি হচ্ছে। উইন্ডো বন্ধ করলেও এটি চলতে থাকবে।"
        : "Your document is generating. You can close this window and it will keep running.",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Palette + base surface styles (background / color / border +
          --codex-* vars) live in the <style> block at the end of
          this component. Declaring CSS vars inline here would pin
          the light palette and block the dark-mode flip. */}
      <DialogContent
        className={cn(
          "codex-doc-builder w-full !max-w-[640px] p-0 !flex flex-col max-h-[85vh] overflow-hidden rounded-2xl !gap-0 !grid-cols-none",
          "shadow-2xl",
          "[&>button]:text-[color:var(--codex-paper-muted)] [&>button]:hover:text-[color:var(--codex-paper)]",
        )}
      >
        {/* Top-right theme toggle — sits flush next to close when
            nothing else is there; slides left to make room for minimize
            while the doc is generating. */}
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          title="Toggle light/dark"
          className={cn(
            "absolute top-3 z-10 flex size-7 items-center justify-center rounded-full transition-colors",
            submitting ? "right-[5.25rem]" : "right-12",
          )}
          style={{
            background: "color-mix(in oklab, var(--codex-paper) 8%, transparent)",
            color: "var(--codex-paper-muted)",
          }}
        >
          <SunIcon className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </button>

        {/* Top-right minimize button while generating */}
        {submitting && (
          <button
            type="button"
            onClick={handleMinimize}
            aria-label={t.minimize}
            title={`${t.minimize} — ${t.minimizeHint}`}
            className="absolute right-12 top-3 z-10 flex size-7 items-center justify-center rounded-full transition-colors"
            style={{
              background: "color-mix(in oklab, var(--codex-paper) 8%, transparent)",
              color: "var(--codex-paper-muted)",
            }}
          >
            <MinusIcon className="size-3.5" />
            <span className="sr-only">{t.minimize}</span>
          </button>
        )}

        {/* ── Header ── */}
        <div
          className="relative overflow-hidden px-4 pt-4 pb-8 sm:px-6 sm:pt-5 sm:pb-7"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--codex-rust) 6%, var(--codex-bg)) 0%, var(--codex-bg) 100%)",
            borderBottom: "1px solid var(--codex-rule)",
          }}
        >
          {/* Ambient rust glow — top-left bloom, codex palette */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 55% 70% at 15% 30%, color-mix(in oklab, var(--codex-rust) 14%, transparent) 0%, transparent 65%)",
            }}
            aria-hidden
          />

          <div className="relative">
            {/* Premium badge + title on a single row on mobile to
                reclaim vertical space for the stepper. Desktop keeps
                the two-row layout with the § watermark pinned right. */}
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 pr-24 sm:block sm:pr-0">
                {/* Premium badge */}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] sm:mb-3.5"
                  style={{
                    border: "1px solid color-mix(in oklab, var(--codex-rust) 45%, transparent)",
                    background: "color-mix(in oklab, var(--codex-rust) 10%, transparent)",
                  }}
                >
                  <SparklesIcon className="size-3" style={{ color: "var(--codex-rust)" }} />
                  <span
                    className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: "var(--codex-rust)" }}
                  >
                    {language === "bn" ? "প্রিমিয়াম" : "Premium"}
                  </span>
                </span>
                <DialogHeader className="space-y-0.5 text-left sm:text-left">
                  <DialogTitle
                    className="text-[1rem] font-semibold leading-tight sm:text-[1.15rem]"
                    style={{ color: "var(--codex-paper)" }}
                  >
                    {t.title}
                  </DialogTitle>
                  {/* Subtitle intentionally hidden — the dialog title +
                      Premium badge already convey the intent. Kept as
                      sr-only for a11y + future re-use. */}
                  <DialogDescription className="sr-only">
                    {t.subtitle}
                  </DialogDescription>
                </DialogHeader>
              </div>
              {/* § editorial watermark — hidden on mobile. */}
              <span
                className="hidden shrink-0 select-none font-serif text-[2.2rem] leading-none sm:mt-0.5 sm:inline"
                style={{ color: "color-mix(in oklab, var(--codex-rust) 22%, transparent)" }}
                aria-hidden
              >
                §
              </span>
            </div>

            {/* Stepper */}
            <div
              className="mt-5 flex items-center"
              aria-label="Builder steps"
            >
              <StepDot index={1} active={step} label={t.stepPick} />
              <StepLine active={step > 1} />
              <StepDot index={2} active={step} label={t.stepFormat} />
              <StepLine active={step > 2} />
              <StepDot index={3} active={step} label={t.stepFill} />
            </div>
          </div>
        </div>

        {/* ── Body — scrollable ── */}
        <div
          className="codex-scroll flex-1 overflow-y-auto px-6 py-5"
          style={{ background: "var(--codex-bg)" }}
        >

          {/* Step 1 — Document type. Dynamic: top-3 detector matches up
              front, remaining catalog behind "Show all templates"
              disclosure. Fallback (no citation matches) renders the
              curated non-2026 slate with no disclosure. */}
          {step === 1 && (() => {
            // AI doc-suggest race wins when it returned any valid template ids.
            // Otherwise fall back to the deterministic section-number detector.
            const aiTopIds: DocType[] = aiSuggestions?.topTemplates ?? [];
            const aiReason =
              language === "bn" ? "এআই অনুসারে প্রাসঙ্গিক" : "AI-picked match";
            const aiSourcedTopHits =
              aiTopIds.length > 0
                ? aiTopIds
                    .filter((id) => !!DOC_CATALOG[id])
                    .map((id) => ({
                      docType: id,
                      metadata: DOC_CATALOG[id],
                      reason: aiReason,
                      tierAllowed: true,
                    }))
                : null;
            const topHits = aiSourcedTopHits ?? suggestions.slice(0, 3);
            const topHitIds = new Set(topHits.map((h) => h.docType));
            const fallbackEntries = catalogEntries.filter((m) => !m.newIn2026);
            const showAllLabel =
              language === "bn" ? "সব টেমপ্লেট দেখান" : "Show all templates";
            const bestMatchLabel =
              language === "bn" ? "সেরা মিল" : "Best match";
            const preselectBadgeLabel =
              language === "bn"
                ? "আপনার প্রশ্নের সাথে সবচেয়ে মিল"
                : "Best match for your request";

            // Intent pre-select (DB-03). Only honour if the provided
            // docType exists in the catalog; otherwise ignore.
            const preselect: DocType | null =
              preselectDocType && DOC_CATALOG[preselectDocType]
                ? preselectDocType
                : null;

            const renderCard = (
              meta: DocMetadata,
              idx: number,
              isTopMatch: boolean,
              isPreselectMatch: boolean = false,
            ) => {
              const opt = metaToOption(meta);
              const selected = docType?.id === meta.id;
              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => {
                    setDocType(opt);
                    setStep(2);
                  }}
                  className={cn(
                    "group relative text-left transition-all duration-150",
                    "rounded-xl border-l-[3px] border-y border-r",
                    "hover:-translate-y-px",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2",
                    isPreselectMatch &&
                      !selected &&
                      "ring-2 ring-amber-500/55 ring-offset-2 ring-offset-background dark:ring-offset-[oklch(0.155_0.010_164)]",
                    selected
                      ? [
                          "border-l-amber-500 border-y-amber-500/20 border-r-amber-500/20",
                          "bg-amber-50/80 dark:bg-[oklch(0.205_0.020_55/0.12)]",
                          "shadow-sm shadow-amber-500/10",
                        ]
                      : [
                          "border-l-transparent border-y-border/60 border-r-border/60",
                          "bg-card dark:bg-[oklch(0.188_0.012_164)]",
                          "hover:border-l-amber-500/50 hover:border-y-border hover:border-r-border",
                          "dark:hover:bg-[oklch(0.198_0.013_164)]",
                        ]
                  )}
                >
                  {/* § section watermark */}
                  <span
                    className="absolute right-3 top-2.5 select-none font-mono text-[11px] text-foreground/8 transition-colors group-hover:text-foreground/14 dark:text-white/8 dark:group-hover:text-white/18"
                    aria-hidden
                  >
                    §{idx + 1}
                  </span>

                  <div className="p-3.5 pr-8">
                    <div className="mb-1 flex items-start gap-1.5">
                      {(isTopMatch || isPreselectMatch) && (
                        <span
                          className="shrink-0 font-mono text-[11px] font-semibold leading-none text-amber-500 dark:text-amber-400"
                          title={
                            isPreselectMatch ? preselectBadgeLabel : bestMatchLabel
                          }
                          aria-label={
                            isPreselectMatch ? preselectBadgeLabel : bestMatchLabel
                          }
                        >
                          ★
                        </span>
                      )}
                      <span className="text-xs font-semibold leading-snug text-foreground/90 dark:text-white/90">
                        {language === "bn" ? opt.labelBn : opt.label}
                      </span>
                      {selected && (
                        <CheckIcon className="ml-auto mt-0.5 size-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
                      )}
                    </div>
                    {isPreselectMatch && (
                      <div className="mb-1.5">
                        <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-[1px] font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
                          {preselectBadgeLabel}
                        </span>
                      </div>
                    )}
                    <p className="text-[11px] leading-snug text-muted-foreground/80 transition-colors group-hover:text-muted-foreground dark:text-white/38 dark:group-hover:text-white/58">
                      {language === "bn" ? opt.descriptionBn : opt.description}
                    </p>
                  </div>
                </button>
              );
            };

            const customLabel =
              language === "bn" ? CUSTOM_DOC_TYPE.labelBn : CUSTOM_DOC_TYPE.label;
            const customDesc =
              language === "bn"
                ? CUSTOM_DOC_TYPE.descriptionBn
                : CUSTOM_DOC_TYPE.description;
            const customPlaceholder =
              language === "bn"
                ? "যেমন: ১১৬ ধারা উল্লেখ করে ডাক্তারি সনদসহ অসুস্থতার ছুটির আবেদন"
                : "e.g. \"Sick-leave note citing Section 116 with attached doctor certificate\"";
            const customSelected = docType?.id === "custom";

            const renderCustomCard = () => (
              <div
                key="custom"
                className={cn(
                  "group relative sm:col-span-2 transition-all duration-150",
                  "rounded-xl border-l-[3px] border-y border-r",
                  customSelected
                    ? [
                        "border-l-amber-500 border-y-amber-500/20 border-r-amber-500/20",
                        "bg-amber-50/80 dark:bg-[oklch(0.205_0.020_55/0.12)]",
                        "shadow-sm shadow-amber-500/10",
                      ]
                    : [
                        "border-l-transparent border-y-border/60 border-r-border/60",
                        "bg-card dark:bg-[oklch(0.188_0.012_164)]",
                        "hover:border-l-amber-500/50 hover:border-y-border hover:border-r-border",
                        "dark:hover:bg-[oklch(0.198_0.013_164)]",
                      ],
                )}
              >
                <button
                  type="button"
                  onClick={() => setDocType(CUSTOM_DOC_TYPE)}
                  className={cn(
                    "block w-full rounded-xl p-3.5 pr-8 text-left",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2",
                  )}
                >
                  <div className="mb-1 flex items-start gap-1.5">
                    <span className="text-xs font-semibold leading-snug text-foreground/90 dark:text-white/90">
                      {customLabel}
                    </span>
                    {customSelected && (
                      <CheckIcon className="ml-auto mt-0.5 size-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
                    )}
                  </div>
                  <p className="text-[11px] leading-snug text-muted-foreground/80 transition-colors group-hover:text-muted-foreground dark:text-white/38 dark:group-hover:text-white/58">
                    {customDesc}
                  </p>
                </button>
                <div
                  className={cn(
                    "px-3.5 pb-3.5",
                    customSelected ? "block" : "hidden group-hover:block",
                  )}
                >
                  <textarea
                    rows={3}
                    value={form.userInstruction}
                    onFocus={() => setDocType(CUSTOM_DOC_TYPE)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, userInstruction: e.target.value }))
                    }
                    placeholder={customPlaceholder}
                    className={cn(
                      "w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[12px] leading-relaxed",
                      "placeholder:text-muted-foreground/50",
                      "focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30",
                      "dark:border-white/8 dark:bg-[oklch(0.168_0.010_164)] dark:text-white/90 dark:placeholder:text-white/25",
                      "dark:focus:border-amber-500/35 dark:focus:ring-amber-500/20",
                    )}
                  />

                  {(aiLoading ||
                    (aiSuggestions?.customPrompts?.length ?? 0) > 0) && (
                    <div className="mt-2 space-y-1.5">
                      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">
                        {language === "bn"
                          ? "এআই প্রস্তাবিত প্রম্পট"
                          : aiLoading
                            ? "Fetching AI suggestions…"
                            : "AI-suggested prompts"}
                      </div>
                      {aiLoading && (
                        <div className="flex gap-1.5">
                          <div className="h-6 w-40 animate-pulse rounded-full bg-muted/40" />
                          <div className="h-6 w-32 animate-pulse rounded-full bg-muted/40" />
                        </div>
                      )}
                      {!aiLoading && (
                        <div className="flex flex-wrap gap-1.5">
                          {(aiSuggestions?.customPrompts ?? []).map((p, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setDocType(CUSTOM_DOC_TYPE);
                                setForm((f) => ({ ...f, userInstruction: p }));
                              }}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] leading-tight",
                                "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                                "hover:border-amber-500/60 hover:bg-amber-500/15",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
                                "text-left",
                              )}
                              title={p}
                            >
                              <SparklesIcon className="size-3 shrink-0" />
                              <span className="line-clamp-1">{p}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );

            // Template tiles gated off while the orchestrator's /tmp allowedPrefixes
            // blocks the docx/pdf/pptx/xlsx skills from writing files.
            // Main `llp-chat-filegen` agent falls back to markdown prose
            // which fails envelope parse at route.ts:648. Custom path
            // (-draft agent, JSON-only) is unaffected. Flip to "0" in
            // .env.local once the orchestrator fix lands.
            const templatesDisabled =
              process.env.NEXT_PUBLIC_TEMPLATES_DISABLED !== "0";

            if (templatesDisabled) {
              const bannerTitle =
                language === "bn"
                  ? "টেমপ্লেট সাময়িকভাবে অনুপলব্ধ"
                  : "Templates temporarily unavailable";
              const bannerBody =
                language === "bn"
                  ? 'নিচে "নিজে বর্ণনা দিন" ব্যবহার করে ডকুমেন্ট তৈরি করুন। ইঞ্জিনিয়াররা প্রি-বিল্ট টেমপ্লেটগুলো শীঘ্রই ফিরিয়ে আনছেন।'
                  : 'Use "Describe your own" below to generate your document. Engineers are restoring pre-built templates shortly.';
              return (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-500/30 bg-amber-50/40 p-3.5 dark:border-amber-500/25 dark:bg-[oklch(0.20_0.020_50/0.10)]">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="text-[11px] leading-relaxed">
                        <p className="font-semibold text-foreground dark:text-white/90">
                          {bannerTitle}
                        </p>
                        <p className="mt-0.5 text-muted-foreground dark:text-white/55">
                          {bannerBody}
                        </p>
                      </div>
                    </div>
                  </div>
                  {renderCustomCard()}
                </div>
              );
            }

            if (suggestions.length === 0) {
              // No detector matches: render the non-2026 fallback slate.
              // If preselect points to an entry outside that slate
              // (e.g. a newIn2026 type), prepend it so the user's
              // explicit intent still gets the visual hint.
              const inFallback = preselect
                ? fallbackEntries.some((m) => m.id === preselect)
                : false;
              const prepended: DocMetadata[] =
                preselect && !inFallback ? [DOC_CATALOG[preselect]] : [];
              const fallbackDisplay = [...prepended, ...fallbackEntries];
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {fallbackDisplay.map((m, i) =>
                      renderCard(m, i, false, m.id === preselect),
                    )}
                  </div>
                  {renderCustomCard()}
                </div>
              );
            }

            const preselectInTop = preselect ? topHitIds.has(preselect) : false;
            // When preselect isn't among the detector's top-3, prepend
            // it so the user's explicit intent outranks the
            // citation-driven ranking. Detector's top-3 remain visible.
            const injected: DocMetadata[] =
              preselect && !preselectInTop ? [DOC_CATALOG[preselect]] : [];
            const topEntries: Array<{
              meta: DocMetadata;
              isTopMatch: boolean;
              isPreselectMatch: boolean;
            }> = [
              ...injected.map((m) => ({
                meta: m,
                isTopMatch: false,
                isPreselectMatch: true,
              })),
              ...topHits.map((h, i) => ({
                meta: DOC_CATALOG[h.docType],
                isTopMatch: i === 0,
                isPreselectMatch: preselect === h.docType,
              })),
            ];
            const displayedIds = new Set(topEntries.map((e) => e.meta.id));
            const remaining = catalogEntries.filter(
              (m) => !displayedIds.has(m.id),
            );

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {topEntries.map((e, i) =>
                    renderCard(e.meta, i, e.isTopMatch, e.isPreselectMatch),
                  )}
                </div>
                {renderCustomCard()}
                {remaining.length > 0 && (
                  <details className="group/disclosure">
                    <summary
                      className={cn(
                        "cursor-pointer select-none list-none",
                        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1",
                        "font-mono text-[10px] font-semibold uppercase tracking-[0.18em]",
                        "text-muted-foreground/70 transition-colors",
                        "hover:text-foreground/80 dark:text-white/38 dark:hover:text-white/75",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2",
                      )}
                    >
                      <span aria-hidden className="inline-block transition-transform group-open/disclosure:rotate-180">
                        ▾
                      </span>
                      {showAllLabel}
                    </summary>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {remaining.map((m, i) =>
                        renderCard(m, topEntries.length + i, false, false),
                      )}
                    </div>
                  </details>
                )}
              </div>
            );
          })()}

          {/* Step 2 — Format */}
          {step === 2 && docType && (
            <div className="space-y-3">
              <p className="mb-3 text-[11px] text-muted-foreground dark:text-white/38">
                {language === "bn"
                  ? `${docType.labelBn} এর জন্য উপলব্ধ ফরম্যাট`
                  : `Available formats for ${docType.label}`}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(["docx", "pdf", "xlsx"] as DocFormat[]).map((f) => {
                  const meta = FORMAT_META[f];
                  const available = formats.includes(f);
                  const selected = format === f;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={f}
                      type="button"
                      disabled={!available}
                      onClick={() => {
                        if (!available) return;
                        setFormat(f);
                        setStep(3);
                      }}
                      className={cn(
                        "group text-left rounded-xl border p-4 transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2",
                        available
                          ? selected
                            ? [
                                "border-amber-500/30 bg-amber-50/80 shadow-sm shadow-amber-500/10",
                                "dark:border-amber-500/25 dark:bg-[oklch(0.205_0.020_55/0.12)]",
                              ]
                            : [
                                "border-border bg-card hover:-translate-y-px hover:border-amber-500/30 hover:shadow-md",
                                "dark:border-white/8 dark:bg-[oklch(0.188_0.012_164)]",
                                "dark:hover:border-amber-500/25 dark:hover:bg-[oklch(0.198_0.013_164)]",
                              ]
                          : "cursor-not-allowed border-border/40 bg-muted/30 opacity-40 dark:border-white/5 dark:bg-white/[0.03]"
                      )}
                    >
                      <div className="mb-2.5 flex items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                            available
                              ? selected
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-muted text-muted-foreground group-hover:bg-amber-500/10 group-hover:text-amber-600 dark:bg-white/6 dark:text-white/50 dark:group-hover:bg-amber-500/10 dark:group-hover:text-amber-400"
                              : "bg-muted/50 text-muted-foreground/50 dark:bg-white/4 dark:text-white/25"
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-foreground/90 dark:text-white/90">
                            {meta.label}
                          </span>
                          {selected && (
                            <CheckIcon className="ml-auto size-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
                          )}
                          {!available && (
                            <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70 dark:text-white/25">
                              {language === "bn" ? "অনুপলব্ধ" : "soon"}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] leading-snug text-muted-foreground transition-colors group-hover:text-foreground/70 dark:text-white/38 dark:group-hover:text-white/58">
                        {language === "bn" ? meta.useCaseBn : meta.useCase}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resume view — modal re-opened for a running job, no local form state */}
          {step === 3 && !docType && job && (
            <div className="space-y-4">
              <div
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-[11px] dark:border-white/8 dark:bg-[oklch(0.188_0.012_164)]"
              >
                <span className="font-semibold text-foreground/80 dark:text-white/80">{job.docTypeLabel}</span>
                <span className="text-muted-foreground dark:text-white/25">·</span>
                <span className="font-mono uppercase text-amber-600 dark:text-amber-400/80">
                  {job.format}
                </span>
              </div>
              {job.state === "running" && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-[oklch(0.20_0.020_50/0.10)]">
                  <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
                  <div className="text-[11px] leading-relaxed">
                    <p className="font-semibold text-foreground dark:text-white/90">
                      {language === "bn" ? "ডকুমেন্ট তৈরি হচ্ছে..." : "Generating your document..."}
                    </p>
                    <p className="mt-0.5 text-muted-foreground dark:text-white/42">{t.resumedBanner}</p>
                  </div>
                </div>
              )}
              {job.state === "error" && job.error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 dark:border-red-500/25 dark:bg-[oklch(0.20_0.025_15/0.12)]"
                >
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive dark:text-red-400" />
                  <div className="text-[11px] leading-relaxed">
                    <p className="font-semibold text-destructive dark:text-red-300">
                      {language === "bn" ? "তৈরি করা যায়নি" : "Couldn't generate"}
                    </p>
                    <p className="mt-0.5 text-muted-foreground dark:text-white/42">{job.error}</p>
                    <p className="mt-1 text-muted-foreground/70 dark:text-white/30">
                      {language === "bn"
                        ? "আবার চেষ্টা করতে উপরের X এ ক্লিক করুন এবং পুনরায় তৈরি করুন।"
                        : "Close this and open the builder again to retry."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Draft-ready interim (DB-06 fallback). Only renders
              when ENABLE_PHASE2_EMITTER is OFF. When ON, the useEffect
              above pushes to /chat/builder/canvas instead and this
              sheet closes before the placeholder can appear. */}
          {step === 3 && docType && showLegacyPlaceholder && job?.draft && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-[11px] dark:border-white/8 dark:bg-[oklch(0.188_0.012_164)]">
                <span className="font-semibold text-foreground/80 dark:text-white/80">
                  {language === "bn" ? docType.labelBn : docType.label}
                </span>
                <span className="text-muted-foreground dark:text-white/25">·</span>
                <span className="font-mono uppercase text-amber-600 dark:text-amber-400/80">
                  {job.draft.format}
                </span>
                <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60 dark:text-white/30">
                  tier {job.draft.tier}
                </span>
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-[oklch(0.20_0.020_50/0.10)]">
                <div className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="text-[12px] leading-relaxed">
                    <p className="font-semibold text-foreground dark:text-white/90">
                      {language === "bn"
                        ? "খসড়া প্রস্তুত"
                        : "Draft ready"}
                    </p>
                    <p className="mt-1 text-muted-foreground dark:text-white/42">
                      {language === "bn"
                        ? "ক্যানভাস প্রিভিউ শীঘ্রই আসছে (v1.1)। আপাতত JSON খসড়া ডাউনলোড করুন।"
                        : "Canvas preview coming soon (v1.1). For now, download the raw draft as JSON."}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground/70 dark:text-white/30">
                      {job.draft.title}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadDraft}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-medium",
                  "transition-colors hover:bg-accent hover:text-accent-foreground",
                  "dark:border-white/10 dark:bg-white/5 dark:text-white/75",
                  "dark:hover:bg-white/8 dark:hover:text-white/95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2",
                )}
              >
                <DownloadIcon className="size-3.5" />
                {language === "bn"
                  ? "কাঁচা খসড়া ডাউনলোড (JSON)"
                  : "Download raw draft (JSON)"}
              </button>
            </div>
          )}

          {/* Step 3 — Details form */}
          {step === 3 && docType && format && !draftReady && !showLegacyPlaceholder && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              {/* Selected type + format summary pill */}
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-[11px] dark:border-white/8 dark:bg-[oklch(0.188_0.012_164)]">
                <span className="font-semibold text-foreground/80 dark:text-white/80">
                  {language === "bn" ? docType.labelBn : docType.label}
                </span>
                <span className="text-muted-foreground dark:text-white/25">·</span>
                <span className="font-mono uppercase text-amber-600 dark:text-amber-400/80">{format}</span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="ml-auto text-[11px] text-amber-600/80 transition-colors hover:text-amber-600 dark:text-amber-400/60 dark:hover:text-amber-400"
                >
                  {language === "bn" ? "পরিবর্তন" : "Change"}
                </button>
              </div>

              {docType.id === "custom" ? (
                <FormField
                  label={language === "bn" ? "ডকুমেন্টের বিবরণ" : "Describe your document"}
                  htmlFor="user-instruction"
                >
                  <textarea
                    id="user-instruction"
                    rows={10}
                    value={form.userInstruction}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, userInstruction: e.target.value }))
                    }
                    placeholder={
                      language === "bn"
                        ? "যেমন: ১০ জন কর্মীর জন্য ফ্যাক্টরি অনুপস্থিতি রেজিস্টার, প্রতিদিনের কলামসহ..."
                        : "e.g. \"Draft a factory absence register for 10 workers with daily columns\""
                    }
                    className={cn(
                      "w-full resize-y rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed",
                      "placeholder:text-muted-foreground/50",
                      "transition-colors focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30",
                      "dark:border-white/8 dark:bg-[oklch(0.188_0.012_164)] dark:text-white/90 dark:placeholder:text-white/25",
                      "dark:focus:border-amber-500/35 dark:focus:ring-amber-500/20",
                    )}
                    style={{ minHeight: "220px" }}
                  />
                </FormField>
              ) : (
                <>
              <FormField label={t.recipient} htmlFor="recipient-name">
                <input
                  id="recipient-name"
                  type="text"
                  value={form.recipientName}
                  onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                  className={cn(
                    "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm",
                    "placeholder:text-muted-foreground/50",
                    "transition-colors focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30",
                    "dark:border-white/8 dark:bg-[oklch(0.188_0.012_164)] dark:text-white/90 dark:placeholder:text-white/25",
                    "dark:focus:border-amber-500/35 dark:focus:ring-amber-500/20",
                  )}
                  placeholder={language === "bn" ? "যেমন: মো. রফিক" : "e.g. Md. Rafiq"}
                />
              </FormField>
              <FormField label={t.sender} htmlFor="sender-name">
                <input
                  id="sender-name"
                  type="text"
                  value={form.senderName}
                  onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
                  className={cn(
                    "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm",
                    "placeholder:text-muted-foreground/50",
                    "transition-colors focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30",
                    "dark:border-white/8 dark:bg-[oklch(0.188_0.012_164)] dark:text-white/90 dark:placeholder:text-white/25",
                    "dark:focus:border-amber-500/35 dark:focus:ring-amber-500/20",
                  )}
                  placeholder={language === "bn" ? "আপনার নাম" : "Your full name"}
                />
              </FormField>
              <FormField label={t.company} htmlFor="company-name">
                <input
                  id="company-name"
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  className={cn(
                    "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm",
                    "placeholder:text-muted-foreground/50",
                    "transition-colors focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30",
                    "dark:border-white/8 dark:bg-[oklch(0.188_0.012_164)] dark:text-white/90 dark:placeholder:text-white/25",
                    "dark:focus:border-amber-500/35 dark:focus:ring-amber-500/20",
                  )}
                  placeholder={language === "bn" ? "প্রতিষ্ঠানের নাম" : "Acme Garments Ltd."}
                />
              </FormField>
              <FormField label={t.date} htmlFor="effective-date">
                <input
                  id="effective-date"
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                  className={cn(
                    "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm",
                    "transition-colors focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30",
                    "dark:border-white/8 dark:bg-[oklch(0.188_0.012_164)] dark:text-white/90",
                    "dark:focus:border-amber-500/35 dark:focus:ring-amber-500/20",
                  )}
                />
              </FormField>
              <FormField label={t.details} htmlFor="details">
                <textarea
                  id="details"
                  rows={3}
                  value={form.details}
                  onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                  className={cn(
                    "w-full resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm",
                    "placeholder:text-muted-foreground/50",
                    "transition-colors focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30",
                    "dark:border-white/8 dark:bg-[oklch(0.188_0.012_164)] dark:text-white/90 dark:placeholder:text-white/25",
                    "dark:focus:border-amber-500/35 dark:focus:ring-amber-500/20",
                  )}
                  placeholder={t.detailsPh}
                />
              </FormField>
                </>
              )}

              {/* Citations reference panel */}
              {citations.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 dark:border-white/7 dark:bg-[oklch(0.178_0.010_164)]">
                  <p className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 dark:text-white/28">
                    {language === "bn" ? "ব্যবহৃত ধারা" : "Sections referenced"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {citations.slice(0, 6).map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] text-foreground/70 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
                      >
                        {c.section}
                      </span>
                    ))}
                    {citations.length > 6 && (
                      <span className="text-[10px] text-muted-foreground dark:text-white/28">
                        +{citations.length - 6}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Generating banner */}
              {submitting && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-[oklch(0.20_0.020_50/0.10)]">
                  <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
                  <div className="text-[11px] leading-relaxed">
                    <p className="font-semibold text-foreground dark:text-white/90">
                      {language === "bn" ? "ডকুমেন্ট তৈরি হচ্ছে..." : "Generating your document..."}
                    </p>
                    <p className="mt-0.5 text-muted-foreground dark:text-white/42">
                      {language === "bn"
                        ? "তৈরি হতে ৬০–২১০ সেকেন্ড সময় লাগতে পারে। উইন্ডো বন্ধ করবেন না।"
                        : "This can take 60–210 seconds. Please keep this window open."}
                    </p>
                  </div>
                </div>
              )}

              {/* Inline error banner */}
              {submitError && !submitting && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 dark:border-red-500/25 dark:bg-[oklch(0.20_0.025_15/0.12)]"
                >
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive dark:text-red-400" />
                  <div className="text-[11px] leading-relaxed">
                    <p className="font-semibold text-destructive dark:text-red-300">
                      {language === "bn" ? "তৈরি করা যায়নি" : "Couldn't generate"}
                    </p>
                    <p className="mt-0.5 text-muted-foreground dark:text-white/42">{submitError}</p>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between gap-2 bg-muted/40 px-6 py-4 dark:bg-[oklch(0.162_0.011_164)]"
          style={{ borderTop: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (step === 1) onOpenChange(false);
              else setStep((s) => (s === 3 ? 2 : 1) as 1 | 2 | 3);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
              "text-muted-foreground transition-colors hover:text-foreground",
              "dark:text-white/35 dark:hover:text-white/75",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            {step > 1 ? (
              <>
                <ArrowLeftIcon className="size-3.5" /> {t.back}
              </>
            ) : (
              <>{language === "bn" ? "বাতিল" : "Cancel"}</>
            )}
          </button>

          <div className="flex items-center gap-2">
            {/* Footer minimize button while generating */}
            {submitting && (
              <button
                type="button"
                onClick={handleMinimize}
                title={t.minimizeHint}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                  "border border-border/60 bg-background text-foreground",
                  "hover:border-border hover:bg-accent",
                  "dark:border-white/10 dark:bg-white/5 dark:text-white/70",
                  "dark:hover:bg-white/8 dark:hover:text-white/90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                )}
              >
                <MinusIcon className="size-3.5" /> {t.minimize}
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                disabled={step === 1 ? !docType : !format}
                onClick={() => setStep((s) => (s === 1 ? 2 : 3) as 1 | 2 | 3)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold transition-all",
                  "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
                  "shadow-md shadow-amber-900/20",
                  "hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-900/30",
                  "active:scale-[0.97]",
                  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:from-amber-500 disabled:hover:to-orange-500",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
                )}
              >
                {t.next} <ArrowRightIcon className="size-3.5" />
              </button>
            ) : showLegacyPlaceholder ? (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold transition-all",
                  "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
                  "shadow-md shadow-amber-900/20",
                  "hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-900/30",
                  "active:scale-[0.97]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
                )}
              >
                <CheckIcon className="size-3.5" />
                {language === "bn" ? "সম্পন্ন" : "Done"}
              </button>
            ) : !docType || !format ? null : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold transition-all",
                  "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
                  "shadow-md shadow-amber-900/20",
                  "hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-900/30",
                  "active:scale-[0.97]",
                  "disabled:cursor-wait disabled:opacity-60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
                )}
              >
                {submitting ? (
                  <>
                    <Loader2Icon className="size-3.5 animate-spin" /> {t.generating}
                  </>
                ) : (
                  <>
                    <SparklesIcon className="size-3.5" /> {t.generate}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        {/* Scoped codex-palette overrides. Keeps the dialog on the
            same parchment + rust system as the chat welcome surface
            without rewriting every amber-* / white-* utility on the
            130+ call sites inside the form bodies. */}
        <style>{`
          .codex-doc-builder {
            --codex-bg: #f4ecda;
            --codex-bg-soft: rgba(32, 24, 18, 0.03);
            --codex-paper: #1d1410;
            --codex-paper-muted: rgba(29, 20, 16, 0.62);
            --codex-paper-faint: rgba(29, 20, 16, 0.32);
            --codex-rule: rgba(29, 20, 16, 0.11);
            --codex-rule-strong: rgba(29, 20, 16, 0.20);
            --codex-rust: #b25c22;
            --codex-rust-deep: #8a4116;
            background: var(--codex-bg);
            color: var(--codex-paper);
            border: 1px solid var(--codex-rule);
          }
          .dark .codex-doc-builder {
            --codex-bg: #111011;
            --codex-bg-soft: rgba(255, 250, 235, 0.02);
            --codex-paper: #ede6d8;
            --codex-paper-muted: rgba(237, 230, 216, 0.60);
            --codex-paper-faint: rgba(237, 230, 216, 0.26);
            --codex-rule: rgba(237, 230, 216, 0.09);
            --codex-rule-strong: rgba(237, 230, 216, 0.18);
            --codex-rust: #d38044;
            --codex-rust-deep: #b25c22;
          }
          /* Amber → Rust repaint (covers the majority of in-body accents) */
          .codex-doc-builder .text-amber-300,
          .codex-doc-builder .text-amber-400,
          .codex-doc-builder .text-amber-500 { color: var(--codex-rust); }
          .codex-doc-builder .bg-amber-500 { background-color: var(--codex-rust); }
          .codex-doc-builder .bg-amber-500\\/10 { background-color: color-mix(in oklab, var(--codex-rust) 10%, transparent); }
          .codex-doc-builder .bg-amber-500\\/12 { background-color: color-mix(in oklab, var(--codex-rust) 12%, transparent); }
          .codex-doc-builder .bg-amber-500\\/15 { background-color: color-mix(in oklab, var(--codex-rust) 15%, transparent); }
          .codex-doc-builder .bg-amber-500\\/18 { background-color: color-mix(in oklab, var(--codex-rust) 18%, transparent); }
          .codex-doc-builder .bg-amber-500\\/20 { background-color: color-mix(in oklab, var(--codex-rust) 20%, transparent); }
          .codex-doc-builder .bg-amber-500\\/25 { background-color: color-mix(in oklab, var(--codex-rust) 25%, transparent); }
          .codex-doc-builder .bg-amber-500\\/30 { background-color: color-mix(in oklab, var(--codex-rust) 30%, transparent); }
          .codex-doc-builder .border-amber-400,
          .codex-doc-builder .border-amber-500 { border-color: var(--codex-rust); }
          .codex-doc-builder .border-amber-500\\/20 { border-color: color-mix(in oklab, var(--codex-rust) 20%, transparent); }
          .codex-doc-builder .border-amber-500\\/30 { border-color: color-mix(in oklab, var(--codex-rust) 30%, transparent); }
          .codex-doc-builder .border-amber-500\\/40 { border-color: color-mix(in oklab, var(--codex-rust) 40%, transparent); }
          .codex-doc-builder .ring-amber-500\\/50 { --tw-ring-color: color-mix(in oklab, var(--codex-rust) 50%, transparent); }
          .codex-doc-builder .shadow-amber-500\\/50 { --tw-shadow-color: color-mix(in oklab, var(--codex-rust) 50%, transparent); }

          /* White-on-dark utilities → paper-on-parchment */
          .codex-doc-builder .text-white,
          .codex-doc-builder .text-white\\/95,
          .codex-doc-builder .text-white\\/92,
          .codex-doc-builder .text-white\\/90 { color: var(--codex-paper); }
          .codex-doc-builder .text-white\\/80,
          .codex-doc-builder .text-white\\/70,
          .codex-doc-builder .text-white\\/60,
          .codex-doc-builder .text-white\\/55,
          .codex-doc-builder .text-white\\/50,
          .codex-doc-builder .text-white\\/45,
          .codex-doc-builder .text-white\\/42,
          .codex-doc-builder .text-white\\/40 { color: var(--codex-paper-muted); }
          .codex-doc-builder .text-white\\/35,
          .codex-doc-builder .text-white\\/32,
          .codex-doc-builder .text-white\\/30,
          .codex-doc-builder .text-white\\/25,
          .codex-doc-builder .text-white\\/22,
          .codex-doc-builder .text-white\\/20 { color: var(--codex-paper-faint); }
          .codex-doc-builder .bg-white\\/5,
          .codex-doc-builder .bg-white\\/8,
          .codex-doc-builder .bg-white\\/10,
          .codex-doc-builder .bg-white\\/12,
          .codex-doc-builder .bg-white\\/15 { background-color: var(--codex-bg-soft); }
          .codex-doc-builder .border-white\\/\\[0\\.07\\],
          .codex-doc-builder .border-white\\/10,
          .codex-doc-builder .border-white\\/12,
          .codex-doc-builder .border-white\\/15,
          .codex-doc-builder .border-white\\/20 { border-color: var(--codex-rule); }

          /* Dark-surface oklch backgrounds used for cards + body → paper */
          .codex-doc-builder .bg-\\[oklch\\(0\\.155_0\\.010_164\\)\\],
          .codex-doc-builder .bg-\\[oklch\\(0\\.148_0\\.012_164\\)\\],
          .codex-doc-builder .bg-\\[oklch\\(0\\.168_0\\.018_164\\)\\],
          .codex-doc-builder .dark\\:bg-\\[oklch\\(0\\.155_0\\.010_164\\)\\],
          .codex-doc-builder .dark\\:bg-\\[oklch\\(0\\.148_0\\.012_164\\)\\] { background-color: var(--codex-bg); }

          /* Shadcn card / muted / border utilities → codex tokens so the
             inner doc-type cards, form field surrounds, and dividers
             track light/dark via the same --codex-* vars instead of the
             app-level shadcn palette (which was rendering dark cards on
             a light parchment body). */
          .codex-doc-builder .bg-card,
          .codex-doc-builder .dark\\:bg-\\[oklch\\(0\\.188_0\\.012_164\\)\\],
          .codex-doc-builder .dark\\:hover\\:bg-\\[oklch\\(0\\.198_0\\.013_164\\)\\],
          .codex-doc-builder .bg-\\[oklch\\(0\\.205_0\\.020_55\\/0\\.12\\)\\],
          .codex-doc-builder .dark\\:bg-\\[oklch\\(0\\.205_0\\.020_55\\/0\\.12\\)\\] {
            background-color: color-mix(in oklab, var(--codex-paper) 5%, var(--codex-bg));
          }
          .codex-doc-builder .bg-amber-50\\/80 {
            background-color: color-mix(in oklab, var(--codex-rust) 10%, var(--codex-bg));
          }
          .codex-doc-builder .bg-muted,
          .codex-doc-builder .bg-muted\\/30,
          .codex-doc-builder .bg-muted\\/40,
          .codex-doc-builder .bg-muted\\/50 { background-color: var(--codex-bg-soft); }
          .codex-doc-builder .text-foreground,
          .codex-doc-builder .text-foreground\\/95,
          .codex-doc-builder .text-foreground\\/90 { color: var(--codex-paper); }
          .codex-doc-builder .text-foreground\\/80,
          .codex-doc-builder .text-foreground\\/70,
          .codex-doc-builder .text-foreground\\/60,
          .codex-doc-builder .text-foreground\\/50 { color: var(--codex-paper-muted); }
          .codex-doc-builder .text-foreground\\/40,
          .codex-doc-builder .text-foreground\\/35,
          .codex-doc-builder .text-foreground\\/30,
          .codex-doc-builder .text-foreground\\/22,
          .codex-doc-builder .text-foreground\\/20,
          .codex-doc-builder .text-foreground\\/18,
          .codex-doc-builder .text-foreground\\/14,
          .codex-doc-builder .text-foreground\\/10,
          .codex-doc-builder .text-foreground\\/8 { color: var(--codex-paper-faint); }
          .codex-doc-builder .text-muted-foreground,
          .codex-doc-builder .text-muted-foreground\\/90,
          .codex-doc-builder .text-muted-foreground\\/80,
          .codex-doc-builder .text-muted-foreground\\/70,
          .codex-doc-builder .text-muted-foreground\\/60,
          .codex-doc-builder .text-muted-foreground\\/50 { color: var(--codex-paper-muted); }
          /* dark:text-white/XX fires when html.dark is on AND codex tokens
             are already flipped dark, so route these to the same paper
             tokens that already resolve light/dark via the parent scope. */
          .codex-doc-builder .dark\\:text-white\\/95,
          .codex-doc-builder .dark\\:text-white\\/92,
          .codex-doc-builder .dark\\:text-white\\/90 { color: var(--codex-paper); }
          .codex-doc-builder .dark\\:text-white\\/80,
          .codex-doc-builder .dark\\:text-white\\/70,
          .codex-doc-builder .dark\\:text-white\\/60,
          .codex-doc-builder .dark\\:text-white\\/58,
          .codex-doc-builder .dark\\:text-white\\/55,
          .codex-doc-builder .dark\\:text-white\\/50,
          .codex-doc-builder .dark\\:text-white\\/42,
          .codex-doc-builder .dark\\:text-white\\/40,
          .codex-doc-builder .dark\\:text-white\\/38,
          .codex-doc-builder .dark\\:text-white\\/35 { color: var(--codex-paper-muted); }
          .codex-doc-builder .dark\\:text-white\\/30,
          .codex-doc-builder .dark\\:text-white\\/25,
          .codex-doc-builder .dark\\:text-white\\/22,
          .codex-doc-builder .dark\\:text-white\\/20,
          .codex-doc-builder .dark\\:text-white\\/18,
          .codex-doc-builder .dark\\:text-white\\/14,
          .codex-doc-builder .dark\\:text-white\\/12,
          .codex-doc-builder .dark\\:text-white\\/10,
          .codex-doc-builder .dark\\:text-white\\/8 { color: var(--codex-paper-faint); }
          .codex-doc-builder .border-border,
          .codex-doc-builder .border-border\\/60,
          .codex-doc-builder .border-border\\/40 { border-color: var(--codex-rule); }
          .codex-doc-builder .bg-background { background-color: var(--codex-bg); }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

function StepDot({ index, active, label }: { index: number; active: number; label: string }) {
  const state: "past" | "current" | "future" =
    active > index ? "past" : active === index ? "current" : "future";
  const dotStyle: React.CSSProperties =
    state === "past"
      ? {
          background: "color-mix(in oklab, var(--codex-rust) 20%, transparent)",
          color: "var(--codex-rust)",
        }
      : state === "current"
        ? {
            background: "var(--codex-rust)",
            color: "var(--codex-bg)",
            boxShadow: "0 1px 8px color-mix(in oklab, var(--codex-rust) 50%, transparent)",
          }
        : {
            border: "1px solid var(--codex-rule-strong)",
            background: "transparent",
            color: "var(--codex-paper-faint)",
          };
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex size-[22px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200"
        style={dotStyle}
      >
        {state === "past" ? <CheckIcon className="size-3" /> : index}
      </div>
      {/* Labels collide on mobile — show only the current label below sm. */}
      <span
        className={cn(
          "text-[11px] font-medium transition-colors",
          state !== "current" && "hidden sm:inline",
        )}
        style={{
          color:
            state === "current"
              ? "var(--codex-paper)"
              : "var(--codex-paper-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function StepLine({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="mx-1.5 h-px flex-1 min-w-4 rounded-full transition-all duration-300 sm:mx-2.5 sm:w-8 sm:flex-none"
      style={{
        background: active
          ? "color-mix(in oklab, var(--codex-rust) 55%, transparent)"
          : "var(--codex-rule-strong)",
      }}
    />
  );
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 dark:text-white/38"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
