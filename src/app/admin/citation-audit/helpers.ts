import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Ban,
} from "lucide-react";

// Re-export shared types so existing consumers don't break
export type {
  BranchStatus,
  NodeStatus,
  BlacklistType,
  RelationshipType,
  CorrectionStatus,
  BranchSectionNode,
  DecisionTreeBranch,
  SectionRelationship,
  SectionBlacklistEntry,
  ContributorCorrection,
  BatchReview,
} from "@/lib/ai/decision-tree-types";

import type {
  BranchStatus,
  NodeStatus,
  BlacklistType,
  CorrectionStatus,
} from "@/lib/ai/decision-tree-types";

// ── Types ────────────────────────────────────────────────────────────

// ── Citation Confidence Types ────────────────────────────────────────

export interface ConfidenceEntry {
  id: number;
  document_id: string;
  section: string;
  section_number: string;
  times_cited: number;
  times_verified_correct: number;
  times_verified_misquoted: number;
  times_verified_fabricated: number;
  times_verified_partial: number;
  times_regex_invalid: number;
  confidence_score: number;
  last_verified_at: string | null;
  last_cited_at: string | null;
}

export interface HallucinationPattern {
  id: number;
  pattern_type: string;
  document_id: string | null;
  section_number: string | null;
  occurrence_count: number;
  example_query: string | null;
  query_domain: string | null;
  status: string;
}

export interface VerificationLog {
  id: number;
  query_text: string | null;
  document_id: string;
  section: string;
  verdict: string;
  confidence: number | null;
  explanation: string | null;
  verifier_model: string;
  created_at: string;
}

export interface HealthStats {
  totalTracked: number;
  avgConfidence: number;
  lowConfidence: number;
  blacklisted: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

export function confidenceColor(score: number) {
  if (score >= 0.8) return "text-green-600 dark:text-green-400";
  if (score >= 0.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

export function confidenceBg(score: number) {
  if (score >= 0.8) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 0.5) return "bg-amber-100 dark:bg-amber-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

export function verdictBadge(verdict: string) {
  const map: Record<string, { color: string; icon: typeof ShieldCheck }> = {
    correct: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: ShieldCheck },
    misquoted: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: ShieldAlert },
    fabricated: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: ShieldX },
    partially_correct: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: ShieldAlert },
    regex_invalid: { color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: Ban },
  };
  return map[verdict] || map.regex_invalid;
}

export function timeAgo(dateStr: string | null) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Branch Status Helpers ────────────────────────────────────────────

export function branchStatusColor(status: BranchStatus) {
  const map: Record<BranchStatus, string> = {
    draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    under_review: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    partially_confirmed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    recheck_required: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[status];
}

export function branchStatusLabel(status: BranchStatus) {
  const map: Record<BranchStatus, string> = {
    draft: "Draft",
    under_review: "Under Review",
    partially_confirmed: "Partially Confirmed",
    confirmed: "Confirmed",
    recheck_required: "Recheck Required",
    rejected: "Rejected",
  };
  return map[status];
}

export function nodeStatusIcon(status: NodeStatus) {
  const map: Record<NodeStatus, { emoji: string; color: string }> = {
    confirmed: { emoji: "✅", color: "text-green-600" },
    unconfirmed: { emoji: "⚠️", color: "text-amber-600" },
    flagged: { emoji: "🔴", color: "text-red-600" },
    superseded: { emoji: "📜", color: "text-gray-500" },
  };
  return map[status];
}

export function blacklistTypeLabel(type: BlacklistType) {
  const map: Record<BlacklistType, { label: string; color: string; description: string }> = {
    superseded: {
      label: "Superseded",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      description: "Replaced by newer amendment — retrieve alongside replacement",
    },
    low_confidence: {
      label: "Low Confidence",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      description: "Include but deprioritize in ranking — suggest verified alternatives",
    },
    corrupt_extraction: {
      label: "Corrupt Extraction",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      description: "EXCLUDE from context entirely — flag for re-extraction",
    },
    historical_only: {
      label: "Historical Only",
      color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      description: "Include ONLY if temporal query detected",
    },
  };
  return map[type];
}

export function correctionStatusColor(status: CorrectionStatus) {
  const map: Record<CorrectionStatus, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    merged: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return map[status];
}
