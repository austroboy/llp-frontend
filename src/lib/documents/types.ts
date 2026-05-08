// Document generation subsystem — types
// Post-chat action documents: detects which doc-gen buttons to show
// based on citations + user perspective.

import type { Tier } from "../ai/framework-types";

export type { Tier };

// Perspective for doc-gen. Note: this extends the chat-side
// Perspective (worker | employer | neutral) with "hr" to allow
// HR-flavoured templates (e.g. leave policies) to surface distinctly.
export type Perspective = "employer" | "worker" | "hr" | "neutral";

// Language for doc output. Separate from the chat-side Language
// union (which also has "mixed") — docs are rendered in one language.
export type Language = "en" | "bn";

// Union of supported doc type ids. Additions require a matching
// entry in DOC_CATALOG.
export type DocType =
  | "termination-notice"
  | "grievance-letter"
  | "show-cause-notice"
  | "defense-reply"
  | "resignation-letter"
  | "leave-application"
  | "salary-complaint"
  | "maternity-leave-application"
  | "appointment-letter"
  | "service-certificate"
  | "domestic-worker-contract"
  | "forced-labour-self-audit"
  | "harassment-committee-sop"
  | "equal-pay-audit"
  | "pragati-opt-in-notice";

export interface DocMetadata {
  id: DocType;
  label: string;
  labelBn: string;
  description: string;
  perspective: Perspective[];
  // Normalized section keys e.g. "26", "332A". Match against
  // normalised citation section numbers (strip "Section " prefix
  // and any sub-clause parens).
  sections: string[];
  newIn2026?: boolean;
  icon?: string;
  tierRequired: Tier;
}

export interface AvailableDocAction {
  docType: DocType;
  metadata: DocMetadata;
  // Which citation triggered this match, e.g. "Section 26".
  reason: string;
  // True if user's tier meets metadata.tierRequired.
  tierAllowed: boolean;
}

export interface Citation {
  section: string;
  document_id: string;
}
