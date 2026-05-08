// Mirror of skills-src/llp-response-schema/schema.json v1.
// Emitted by `llp-chat-filegen-draft` (LLP canon + HR-biz + arbitrary
// tiers) for the DB-06 / DB-07 custom-doc path. Canvas consumers in
// DB-07 edit this structure and the Phase-2 emitter serializes it
// back to a binary file.

export type ResponseSchemaTier = 1 | 2 | 3;
export type ResponseSchemaLanguage = "en" | "bn" | "mixed";
export type ResponseSchemaRoleContext = "worker" | "employer" | "hr" | "general";
export type ResponseSchemaFormat = "docx" | "pdf" | "pptx" | "xlsx";

export interface ResponseSchemaTable {
  columns: string[];
  rows: Array<Array<string | number | null>>;
}

export interface ResponseSchemaBodySection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: ResponseSchemaTable;
  /** Indexes into the top-level `citations[]` array. When present,
   *  the canvas renders a chip row at the bottom of this section.
   *  When absent (legacy drafts), the canvas falls back to a single
   *  doc-footer chip list spanning all citations. */
  citation_refs?: number[];
}

export interface ResponseSchemaSignature {
  role: string;
  name?: string;
  designation?: string;
  date?: string;
}

export interface ResponseSchemaSheet {
  name: string;
  columns: string[];
  rows: Array<Array<string | number | null>>;
}

export interface ResponseSchemaCitation {
  /** DOC-### identifier (e.g. "DOC-010"). */
  doc_id: string;
  section: string;
  quote: string;
}

export interface ResponseSchemaMetadata {
  jurisdiction: string;
  generated_at: string;
  filegen_version: string;
}

export interface ResponseSchema {
  tier: ResponseSchemaTier;
  document_type: string;
  language: ResponseSchemaLanguage;
  role_context: ResponseSchemaRoleContext;
  format: ResponseSchemaFormat;
  title: string;
  body_sections: ResponseSchemaBodySection[];
  signatures?: ResponseSchemaSignature[];
  footer_notes?: string[];
  /** Required when format === "xlsx". */
  sheets?: ResponseSchemaSheet[];
  /** Tier 1: >= 1 citation. Tier 2/3: length must be 0. */
  citations: ResponseSchemaCitation[];
  /** Tier 1: must be null. Tier 2/3: non-empty string. */
  disclaimer: string | null;
  metadata: ResponseSchemaMetadata;
}

/**
 * Permissive runtime check — narrows `unknown` to `ResponseSchema`
 * when the mandatory top-level fields look right. Does NOT enforce
 * the tier/xlsx conditionals (the agent does that on the write side;
 * strict validation lives in the canvas layer in DB-07).
 */
export function isResponseSchemaLike(value: unknown): value is ResponseSchema {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.tier !== 1 && v.tier !== 2 && v.tier !== 3) return false;
  if (typeof v.document_type !== "string") return false;
  if (v.language !== "en" && v.language !== "bn" && v.language !== "mixed") return false;
  if (
    v.format !== "docx" &&
    v.format !== "pdf" &&
    v.format !== "pptx" &&
    v.format !== "xlsx"
  ) {
    return false;
  }
  if (typeof v.title !== "string") return false;
  if (!Array.isArray(v.body_sections)) return false;
  if (!Array.isArray(v.citations)) return false;
  if (!v.metadata || typeof v.metadata !== "object") return false;
  return true;
}
