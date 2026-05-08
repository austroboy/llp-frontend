"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { XIcon, ExternalLinkIcon, AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

interface ReferenceData {
  documentTitle: string;
  documentId: string;
  section: string;
  sectionTitle: string;
  content: string;
  chapter: string | null;
  language: string;
}

interface ReferencePanelProps {
  mobile?: boolean;
}

export function ReferencePanel({ mobile }: ReferencePanelProps) {
  const activeReference = useChatStore((s) => s.activeReference);
  const clearActiveReference = useChatStore((s) => s.clearActiveReference);
  const { language } = useLanguage();

  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, ReferenceData>>(new Map());
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchSection = useCallback(async (docId: string, sectionAnchor: string, lang: string) => {
    const cacheKey = `${docId}:${sectionAnchor}:${lang}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/chat/reference?docId=${encodeURIComponent(docId)}&sectionAnchor=${encodeURIComponent(sectionAnchor)}&lang=${lang}`,
        { signal: controller.signal }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load section (${res.status})`);
      }

      const result: ReferenceData = await res.json();
      cacheRef.current.set(cacheKey, result);
      setData(result);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load section");
      setData(null);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch when activeReference changes
  useEffect(() => {
    if (!activeReference) {
      setData(null);
      setError(null);
      return;
    }
    if (!activeReference.docId || !activeReference.sectionAnchor) {
      setError("Could not resolve section reference");
      setLoading(false);
      return;
    }
    fetchSection(activeReference.docId, activeReference.sectionAnchor, language);
  }, [activeReference, language, fetchSection]);

  // Escape key handler — only fires when no modal is open
  useEffect(() => {
    if (!activeReference) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Don't close if a dialog/modal is open (Radix portals use [data-state="open"])
      const openDialog = document.querySelector("[role='dialog'][data-state='open']");
      if (openDialog) return;
      clearActiveReference();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeReference, clearActiveReference]);

  // Focus panel on open
  useEffect(() => {
    if (activeReference && panelRef.current) {
      panelRef.current.focus();
    }
  }, [activeReference]);

  if (!activeReference) return null;

  const fullPageUrl = activeReference.sectionAnchor
    ? `/search/${activeReference.docId}/${activeReference.sectionAnchor}`
    : `/documents/${activeReference.docId}`;

  return (
    <div
      ref={panelRef}
      role="complementary"
      aria-label="Reference document"
      tabIndex={-1}
      className={cn(
        "flex flex-col bg-background overflow-hidden focus:outline-none h-full",
        mobile
          ? ""
          : "hidden md:flex w-[420px] shrink-0 border-l border-border lg:pr-14"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          {loading ? (
            <>
              <div className="h-4 w-48 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </>
          ) : data ? (
            <>
              <h3 className="text-sm font-semibold text-foreground truncate">
                {data.sectionTitle}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {data.documentTitle}
                {data.chapter && ` — ${data.chapter}`}
              </p>
            </>
          ) : error ? (
            <h3 className="text-sm font-semibold text-destructive">Error</h3>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={clearActiveReference}
          aria-label="Close reference panel"
          className="shrink-0 size-7 rounded-full"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
            <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <AlertCircleIcon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                activeReference &&
                fetchSection(activeReference.docId, activeReference.sectionAnchor, language)
              }
            >
              <RefreshCwIcon className="size-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        )}

        {data && !loading && (
          <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {data.content}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <a
          href={fullPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLinkIcon className="size-3" />
          Open full page
        </a>
      </div>
    </div>
  );
}
