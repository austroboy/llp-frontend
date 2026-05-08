/**
 * Decision Tree Framework v3.1 — Shared Types
 *
 * Types used by both backend (decision-tree.ts) and frontend (admin UI).
 * Import from here instead of circular cross-layer imports.
 */

// ── Status Enums ─────────────────────────────────────────────────────

export type BranchStatus =
  | "draft"
  | "under_review"
  | "partially_confirmed"
  | "confirmed"
  | "recheck_required"
  | "rejected";

export type NodeStatus = "confirmed" | "unconfirmed" | "flagged" | "superseded";

export type BlacklistType =
  | "superseded"
  | "low_confidence"
  | "corrupt_extraction"
  | "historical_only";

export type RelationshipType =
  | "supplements"
  | "conflicts"
  | "cross_reference"
  | "supersedes"
  | "depends_on";

export type CorrectionStatus = "pending" | "approved" | "rejected" | "merged";

// ── Branch & Node ────────────────────────────────────────────────────

export interface BranchSectionNode {
  document_id: string;
  section_number: string;
  section: string;
  node_status: NodeStatus;
  confirmed_at?: string;
  confirmed_by?: string;
}

export interface DecisionTreeBranch {
  id: number;
  query_type: string;
  label: string;
  description: string | null;
  domain: string;
  cross_domains: string[];
  sections: BranchSectionNode[];
  status: BranchStatus;
  assigned_reviewer: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  rejected_reason: string | null;
  times_matched: number;
  avg_confidence: number;
  section_count: number;
  auto_generated: boolean;
  recheck_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ── Section Relationships ────────────────────────────────────────────

export interface SectionRelationship {
  id: number;
  section_a_doc: string;
  section_a_number: string;
  section_b_doc: string;
  section_b_number: string;
  relationship_type: RelationshipType;
  description: string | null;
  created_by: string | null;
  is_active: boolean;
}

// ── Typed Blacklist ──────────────────────────────────────────────────

export interface SectionBlacklistEntry {
  id: number;
  document_id: string;
  section_number: string;
  section: string | null;
  blacklist_type: BlacklistType;
  replacement_doc_id: string | null;
  replacement_section_number: string | null;
  confidence_score: number | null;
  corruption_details: string | null;
  effective_date: string | null;
  created_by: string;
  notes: string | null;
  is_active: boolean;
}

// ── Contributor Corrections ──────────────────────────────────────────

export interface ContributorCorrection {
  id: number;
  document_id: string;
  section_number: string;
  section: string | null;
  chunk_id: number | null;
  original_citation: string | null;
  query_text: string | null;
  conversation_id: string | null;
  corrected_section_number: string | null;
  corrected_document_id: string | null;
  corrected_content: string | null;
  correction_note: string | null;
  submitted_by: string;
  submitted_by_email: string | null;
  submitted_at: string;
  status: CorrectionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  branch_id: number | null;
}

// ── Batch Reviews ────────────────────────────────────────────────────

export interface BatchReview {
  id: string;
  exported_by: string;
  exported_at: string;
  row_count: number;
  file_url: string | null;
  imported_by: string | null;
  imported_at: string | null;
  import_status: string;
  import_results: {
    confirmed: number;
    wrong: number;
    revised: number;
    skipped: number;
  } | null;
  confidence_impact: {
    sections_affected: number;
    avg_drop: number;
  } | null;
  rollback_triggered: boolean;
}

// ── Validation Pipeline ──────────────────────────────────────────────

export interface ValidationResult {
  passed: boolean;
  corrections: ValidationCorrection[];
  flaggedForReview: string[];
  newBranchProposals: string[];
}

export interface ValidationCorrection {
  type: "superseded_replacement" | "branch_conflict" | "legal_conflict";
  originalSection: string;
  correctedSection?: string;
  reason: string;
}

export interface TypedBlacklistResult {
  superseded: SectionBlacklistEntry[];
  low_confidence: SectionBlacklistEntry[];
  corrupt_extraction: SectionBlacklistEntry[];
  historical_only: SectionBlacklistEntry[];
}
