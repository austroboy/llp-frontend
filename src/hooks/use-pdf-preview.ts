"use client";

import { useState, useEffect, useRef } from "react";
import { pdf } from "@react-pdf/renderer";
import { renderTemplate } from "@/components/dashboard/profile/cv-templates/render";
import type { CvTemplateName } from "@/components/dashboard/profile/cv-templates/types";
import type { CvTemplateProps } from "@/components/dashboard/profile/cv-templates/types";

interface UsePdfPreviewOptions {
  template: CvTemplateName;
  accentColor: string;
  templateProps: CvTemplateProps;
  enabled: boolean;
  debounceMs?: number;
}

interface UsePdfPreviewResult {
  previewUrl: string | null;
  generating: boolean;
}

export function usePdfPreview({
  template,
  accentColor,
  templateProps,
  enabled,
  debounceMs = 800,
}: UsePdfPreviewOptions): UsePdfPreviewResult {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      abortRef.current = false;
      setGenerating(true);
      try {
        const doc = renderTemplate(template, templateProps);
        const blob = await pdf(doc).toBlob();
        if (abortRef.current) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setPreviewUrl(url);
      } catch {
        // silent — preview pane shows previous or empty state
      } finally {
        if (!abortRef.current) setGenerating(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current = true;
    };
  }, [template, accentColor, templateProps, enabled, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  return { previewUrl, generating };
}
