"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Bot,
  Globe,
  FileImage,
  ClipboardCheck,
  Info,
} from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import Link from "next/link";

import { HumanApprovalModal } from "@/components/admin/rag/human-approval-modal";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const RagPdfPanel = dynamic(() => import("./rag-pdf-panel"), { ssr: false });

interface DocumentMeta {
  id: string;
  title: string;
  instrument_type: string;
  language: string;
  pages: number;
  status: string;
}

type ViewLang = "en" | "bn";

export default function AdminRagEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  // Document data (read-only)
  const [doc, setDoc] = useState<DocumentMeta | null>(null);
  const [enText, setEnText] = useState<string | null>(null);
  const [bnText, setBnText] = useState<string | null>(null);
  const [enFile, setEnFile] = useState<string | null>(null);
  const [bnFile, setBnFile] = useState<string | null>(null);
  const [enTranslated, setEnTranslated] = useState(false);
  const [bnTranslated, setBnTranslated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [activeLang, setActiveLang] = useState<ViewLang>("en");

  // PDF state
  const [showPdf, setShowPdf] = useState(true);
  const [pdfLang, setPdfLang] = useState<ViewLang>("en");

  // Whether the current pdfLang has a real PDF (vs text fallback)
  const [pdfAvailable, setPdfAvailable] = useState(true);

  // Human Audit Approval modal (read-only display of past approvals in Phase 3)
  const [showApproval, setShowApproval] = useState(false);

  // Fetch document data (read-only)
  const fetchDoc = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/rag/${id}`);
      if (!res.ok) throw new Error("Failed to load document");
      const data = await res.json();
      setDoc(data.document);
      setEnText(data.en);
      setBnText(data.bn);
      setEnFile(data.enFile);
      setBnFile(data.bnFile);
      setEnTranslated(!!data.enTranslated);
      setBnTranslated(!!data.bnTranslated);
      if (!data.en && data.bn) setActiveLang("bn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  const activeText = activeLang === "en" ? enText : bnText;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex items-center justify-center py-20 text-destructive">
        <AlertCircle className="size-5 mr-2" />
        {error || "Document not found"}
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="flex flex-col h-[calc(100vh-3.5rem)]"
    >
      {/* Read-only banner */}
      <div
        className="px-4 py-2 flex items-center gap-2 text-xs shrink-0"
        style={{
          background: "var(--accent-blue-ghost)",
          borderBottom: "1px solid var(--glass-border)",
          color: "var(--ink-3)",
        }}
      >
        <Info className="size-3.5 shrink-0" style={{ color: "var(--accent-blue)" }} />
        <span>
          Read-only inspector. Corpus ingestion is CLI-only — see
          {" "}
          <code
            className="px-1 py-0.5 rounded text-[10px]"
            style={{
              background: "var(--paper-inner)",
              border: "1px solid var(--line-2)",
              fontFamily: "var(--lf-mono)",
            }}
          >
            docs/data-accuracy-plan/INGEST-*.md
          </code>
          .
        </span>
      </div>

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{
          background: "var(--glass-bg)",
          borderBottom: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 16,
                fontWeight: 500,
                color: "var(--ink)",
              }}
              className="truncate"
            >
              {doc.title}
            </h1>
            <p className="lf-meta lf-meta--header" style={{ marginTop: 2 }}>
              {doc.id} &middot; {doc.instrument_type} &middot; {doc.pages}{" "}
              {t("docs.pages", { count: doc.pages })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" variant="outline" aria-label="Back to RAG inspector">
            <Link href="/admin/rag">
              <ArrowLeft className="size-3.5" />
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowApproval(true)}
            className="gap-1.5"
          >
            <ClipboardCheck className="size-3.5" />
            Approval
          </Button>
          <Button
            size="sm"
            variant={showPdf ? "default" : "outline"}
            onClick={() => setShowPdf(!showPdf)}
            className="gap-1.5"
          >
            {showPdf ? (
              <PanelLeftClose className="size-3.5" />
            ) : (
              <PanelLeftOpen className="size-3.5" />
            )}
            {showPdf && !pdfAvailable ? (
              <>
                <Bot className="size-3" />
                AI Text
              </>
            ) : (
              <>
                <FileImage className="size-3" />
                PDF
              </>
            )}
            {showPdf && !pdfAvailable && (
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 ml-0.5 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
              >
                No PDF
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Language tabs for viewer */}
      <div
        className="flex items-center px-4 shrink-0"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <div className="flex">
          <button
            onClick={() => setActiveLang("en")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
              activeLang === "en"
                ? "border-[color:var(--accent-blue)] text-[color:var(--accent-blue)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            style={{ fontFamily: "var(--lf-display)" }}
          >
            English
            {enFile && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  enTranslated
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                )}
              >
                {enTranslated ? (
                  <Bot className="size-2.5 mr-0.5" />
                ) : (
                  <Globe className="size-2.5 mr-0.5" />
                )}
                {enTranslated ? "AI" : "Original"}
              </Badge>
            )}
            {!enFile && (
              <span className="text-xs text-muted-foreground">
                ({t("admin.rag.editor.noFile")})
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveLang("bn")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
              activeLang === "bn"
                ? "border-[color:var(--accent-blue)] text-[color:var(--accent-blue)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            style={{ fontFamily: "var(--lf-display)" }}
          >
            বাংলা
            {bnFile && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  bnTranslated
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                )}
              >
                {bnTranslated ? (
                  <Bot className="size-2.5 mr-0.5" />
                ) : (
                  <Globe className="size-2.5 mr-0.5" />
                )}
                {bnTranslated ? "AI" : "Original"}
              </Badge>
            )}
            {!bnFile && (
              <span className="text-xs text-muted-foreground">
                ({t("admin.rag.editor.noFile")})
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main content: read-only text viewer + PDF side-by-side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Text viewer (read-only) */}
        <div className={cn("flex flex-col", showPdf ? "w-1/2" : "w-full")}>
          {activeText !== null ? (
            <pre className="flex-1 w-full p-4 bg-background text-sm font-mono leading-relaxed overflow-auto whitespace-pre-wrap break-words">
              {activeText}
            </pre>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <AlertCircle className="size-4 mr-2" />
              No text available for this language
            </div>
          )}
        </div>

        {/* PDF viewer panel (dynamically loaded, no SSR) */}
        {showPdf && (
          <RagPdfPanel
            docId={id}
            pdfLang={pdfLang}
            onPdfLangChange={setPdfLang}
            fallbackText={pdfLang === "en" ? enText : bnText}
            fallbackIsTranslated={
              (pdfLang === "en" && enTranslated) ||
              (pdfLang === "bn" && bnTranslated)
            }
            onPdfStatus={setPdfAvailable}
          />
        )}
      </div>

      {/* Human Audit Approval Modal (refactored in Phase 3 to read-only) */}
      <HumanApprovalModal
        open={showApproval}
        onOpenChange={setShowApproval}
        docId={id}
        docTitle={doc?.title || ""}
      />
    </motion.div>
    </MotionConfig>
  );
}
