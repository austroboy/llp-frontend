"use client";

import { useState, useCallback } from "react";
import { LanguagesIcon, Loader2, ArrowLeftRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MarkdownRenderer } from "./markdown-renderer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "bn", label: "বাংলা (Bangla)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "zh", label: "中文 (Chinese)" },
  { code: "ko", label: "한국어 (Korean)" },
  { code: "ja", label: "日本語 (Japanese)" },
  { code: "ar", label: "العربية (Arabic)" },
  { code: "ur", label: "اردو (Urdu)" },
  { code: "ms", label: "Bahasa Melayu (Malay)" },
] as const;

/* ------------------------------------------------------------------ */
/*  Hook – manages translation state for a single message             */
/* ------------------------------------------------------------------ */

export function useTranslation(messageId: string, content: string) {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [cache, setCache] = useState<Record<string, string>>({});

  const selectedLangLabel = selectedLang
    ? LANGUAGES.find((l) => l.code === selectedLang)?.label ?? null
    : null;

  const handleTranslate = useCallback(
    async (langCode: string) => {
      // Same language already visible → toggle
      if (langCode === selectedLang && translatedText) {
        setShowTranslation((prev) => !prev);
        return;
      }

      // Local cache hit
      if (cache[langCode]) {
        setTranslatedText(cache[langCode]);
        setSelectedLang(langCode);
        setShowTranslation(true);
        return;
      }

      setIsTranslating(true);
      setSelectedLang(langCode);

      try {
        const res = await fetch("/api/translate/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message_id: messageId,
            text: content,
            language: langCode,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Translation failed");
        }

        const data = await res.json();
        setTranslatedText(data.translated);
        setCache((prev) => ({ ...prev, [langCode]: data.translated }));
        setShowTranslation(true);
      } catch (err: any) {
        toast.error(err.message || "Translation failed. Please try again.");
      } finally {
        setIsTranslating(false);
      }
    },
    [messageId, content, selectedLang, translatedText, cache]
  );

  const hideTranslation = useCallback(() => setShowTranslation(false), []);

  return {
    translatedText,
    selectedLang,
    selectedLangLabel,
    isTranslating,
    showTranslation,
    cache,
    handleTranslate,
    hideTranslation,
  };
}

/* ------------------------------------------------------------------ */
/*  TranslateContent – rendered between message body and actions bar   */
/* ------------------------------------------------------------------ */

interface TranslateContentProps {
  translatedText: string | null;
  selectedLangLabel: string | null;
  isTranslating: boolean;
  showTranslation: boolean;
  hideTranslation: () => void;
}

export function TranslateContent({
  translatedText,
  selectedLangLabel,
  isTranslating,
  showTranslation,
  hideTranslation,
}: TranslateContentProps) {
  return (
    <>
      {/* Translated content block */}
      {showTranslation && translatedText && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.03] px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-primary/70 uppercase tracking-wide flex items-center gap-1.5">
              <LanguagesIcon className="size-3" />
              {selectedLangLabel}
            </span>
            <button
              type="button"
              onClick={hideTranslation}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeftRight className="size-3" />
              Show original
            </button>
          </div>
          <div className="text-sm leading-relaxed">
            <MarkdownRenderer content={translatedText} className="prose-sm" />
          </div>
        </div>
      )}

      {/* Loading state */}
      {isTranslating && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 py-1">
          <Loader2 className="size-3 animate-spin" />
          <span>Translating to {selectedLangLabel}...</span>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  TranslateDropdown – sits in the actions bar with vote/copy/etc.   */
/* ------------------------------------------------------------------ */

interface TranslateDropdownProps {
  showTranslation: boolean;
  selectedLang: string | null;
  cache: Record<string, string>;
  onTranslate: (langCode: string) => void;
  onHide: () => void;
}

export function TranslateDropdown({
  showTranslation,
  selectedLang,
  cache,
  onTranslate,
  onHide,
}: TranslateDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
            showTranslation && "text-primary"
          )}
          title="Translate"
        >
          <LanguagesIcon className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => onTranslate(lang.code)}
            className={cn(
              "cursor-pointer",
              selectedLang === lang.code && showTranslation && "bg-accent"
            )}
          >
            <span className="flex-1">{lang.label}</span>
            {cache[lang.code] && (
              <span className="text-[10px] text-muted-foreground ml-2">
                cached
              </span>
            )}
          </DropdownMenuItem>
        ))}
        {showTranslation && (
          <>
            <div className="bg-border -mx-1 my-1 h-px" />
            <DropdownMenuItem
              onClick={onHide}
              className="cursor-pointer text-muted-foreground"
            >
              <ArrowLeftRight className="size-4 mr-2" />
              Show original only
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
