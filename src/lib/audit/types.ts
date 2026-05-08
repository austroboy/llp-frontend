// ── Quality mode ────────────────────────────────────────────────────

export type QualityMode = "standard" | "premium";

export const QUALITY_MODE_META: Record<QualityMode, {
  label: string;
  sublabel: string;
  auditModel: string;
  translateModel: string;
}> = {
  standard: {
    label: "Standard",
    sublabel: "Moderate accuracy · Lower cost",
    auditModel: "Gemini 2.5 Flash",
    translateModel: "Mistral Large",
  },
  premium: {
    label: "Premium",
    sublabel: "High accuracy · Higher cost",
    auditModel: "Gemini 2.5 Pro",
    translateModel: "Claude Opus 4",
  },
};

// ── Audit finding types ──────────────────────────────────────────────

export type AuditSeverity = "info" | "warning" | "error";

export type AuditActionType =
  | "re-ocr"
  | "re-translate"
  | "re-rag"
  | "manual-review"
  | "clean-preamble"
  | "ai-fix";

export interface AuditAction {
  type: AuditActionType;
  label: string;
  description: string;
  command?: string;
}

export interface AuditFindingLocation {
  /** Known position hint */
  position?: "start" | "end";
  /** Text snippet to search for in the document — scrolls to its location */
  snippet?: string;
}

export interface AuditFinding {
  id: string;
  category: string;
  severity: AuditSeverity;
  title: string;
  description: string;
  language?: "en" | "bn";
  action?: AuditAction;
  details?: string;
  /** Where in the document this issue occurs — used for scroll-to-location */
  location?: AuditFindingLocation;
}

export type AuditHealth = "good" | "fair" | "poor";

export interface AuditSummary {
  documentId: string;
  totalFindings: number;
  errors: number;
  warnings: number;
  infos: number;
  healthScore: number; // 0-100
  health: AuditHealth;
  auditedAt: string;
  duration: number; // ms
}

export type AuditEvent =
  | { type: "progress"; tier: string; message: string }
  | { type: "finding"; finding: AuditFinding }
  | { type: "done"; summary: AuditSummary };
