"use client";

import { CheckCircle2, AlertCircle, Pencil, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

export interface FieldState {
  state: "extracted" | "inferred" | "missing" | "confirmed" | "overridden";
  confidence?: number;
  sourceQuote?: string | null;
  reasoning?: string | null;
}

export type AiFieldStates = Record<string, FieldState>;

// ─── Component ──────────────────────────────────────────────────

interface FieldStateIndicatorProps {
  fieldState?: FieldState;
  onConfirm?: () => void;
}

const STATE_CONFIG = {
  extracted: {
    icon: CheckCircle2,
    label: "Extracted",
    prefix: "\u2713",
    className:
      "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800",
  },
  inferred: {
    icon: HelpCircle,
    label: "Inferred",
    prefix: "~",
    className:
      "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800",
  },
  missing: {
    icon: AlertCircle,
    label: "Missing",
    prefix: "!",
    className:
      "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800",
  },
  confirmed: {
    icon: CheckCircle2,
    label: "Confirmed",
    prefix: "\u2713\u2713",
    className:
      "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
  },
  overridden: {
    icon: Pencil,
    label: "Overridden",
    prefix: "\u270E",
    className:
      "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
  },
} as const;

export function FieldStateIndicator({
  fieldState,
  onConfirm,
}: FieldStateIndicatorProps) {
  if (!fieldState) return null;

  const config = STATE_CONFIG[fieldState.state];
  if (!config) return null;

  const showConfidence =
    fieldState.confidence !== undefined && fieldState.state !== "missing";
  const showConfirmButton =
    onConfirm &&
    (fieldState.state === "extracted" || fieldState.state === "inferred");

  const tooltipLines: string[] = [];
  if (fieldState.sourceQuote) {
    tooltipLines.push(`Source: "${fieldState.sourceQuote}"`);
  }
  if (fieldState.reasoning) {
    tooltipLines.push(`Reasoning: ${fieldState.reasoning}`);
  }
  if (showConfidence) {
    tooltipLines.push(`Confidence: ${fieldState.confidence}%`);
  }

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        config.className
      )}
    >
      <span>{config.prefix}</span>
      <span>{config.label}</span>
      {showConfidence && (
        <span className="opacity-70">({fieldState.confidence}%)</span>
      )}
    </span>
  );

  if (tooltipLines.length === 0 && !showConfirmButton) {
    return badge;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs text-left whitespace-pre-wrap"
        >
          {tooltipLines.map((line, i) => (
            <p key={i} className="text-xs">
              {line}
            </p>
          ))}
        </TooltipContent>
      </Tooltip>
      {showConfirmButton && (
        <button
          type="button"
          onClick={onConfirm}
          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Confirm
        </button>
      )}
    </span>
  );
}

// ─── Helper: get confidence-based input class ───────────────────

export function getConfidenceInputClass(fieldState?: FieldState): string {
  if (!fieldState) return "";
  if (
    fieldState.state === "confirmed" ||
    fieldState.state === "overridden" ||
    fieldState.state === "missing"
  )
    return "";

  if (fieldState.confidence !== undefined && fieldState.confidence < 50) {
    return "bg-yellow-50/60 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-800";
  }
  return "";
}

// ─── Helper: Admin Clue component ───────────────────────────────

export function AdminClue({ text }: { text: string }) {
  return (
    <p className="mt-1 text-xs text-muted-foreground italic">
      {"\uD83D\uDCA1"} Admin clue: {text}
    </p>
  );
}
