"use client";

import { BookOpenIcon, LightbulbIcon } from "lucide-react";
import { getLabels } from "@/lib/languages";

interface Props {
  summary: string;
  exampleScenario: string;
  citedSections: string[];
  /** Chat language code — drives heading labels. */
  language: string;
  durationMs?: number;
}

/**
 * Renders the plain-language summary + realistic workplace example scenario
 * under the Summarize button. Amber accent to distinguish from Verify (emerald)
 * and other message actions.
 */
export function SummaryCard({
  summary,
  exampleScenario,
  citedSections,
  language,
  durationMs,
}: Props) {
  const labels = getLabels(language);
  const summaryHeading = labels.summaryHeading;
  const exampleHeading = labels.exampleHeading;
  const basedOnLabel = labels.basedOnLabel;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-3 text-sm space-y-3">
      {/* Summary section */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-1 rounded-sm bg-amber-500" />
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <BookOpenIcon className="size-3.5" />
            {summaryHeading}
          </h4>
          {typeof durationMs === "number" && (
            <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">
              {Math.round(durationMs / 1000)}s
            </span>
          )}
        </div>
        <p className="text-[13px] leading-relaxed text-foreground/90">
          {summary}
        </p>
      </div>

      {/* Divider + example scenario */}
      {exampleScenario && (
        <>
          <div className="h-px bg-amber-500/20" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-block h-4 w-1 rounded-sm bg-amber-500" />
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <LightbulbIcon className="size-3.5" />
                {exampleHeading}
              </h4>
            </div>
            <p className="text-[13px] leading-relaxed text-foreground/85 bg-background/60 dark:bg-background/40 rounded-lg border border-amber-500/10 p-2.5">
              {exampleScenario}
            </p>
          </div>
        </>
      )}

      {/* Footer — cited sections */}
      {citedSections.length > 0 && (
        <div className="pt-1 flex items-center gap-1.5 text-[10.5px] text-muted-foreground/80">
          <span>{basedOnLabel}</span>
          <span className="font-mono">{citedSections.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
