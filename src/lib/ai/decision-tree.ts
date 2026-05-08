/**
 * Decision Tree Framework v3.1 — Core Module
 *
 * Manages branches, typed blacklist enforcement, section relationships,
 * and the post-generation validation pipeline.
 *
 * Key principle: "LLP can be self-improving, but not self-authorizing."
 * - System may: propose drafts, recommend modifications, update confidence statistically
 * - System may NOT: auto-confirm branches, auto-update confirmed knowledge
 */

import { createClient } from "@supabase/supabase-js";
import type {
  BranchSectionNode,
  DecisionTreeBranch,
  BlacklistType,
  SectionBlacklistEntry,
  SectionRelationship,
  NodeStatus,
  TypedBlacklistResult,
  ValidationResult,
  ValidationCorrection,
} from "./decision-tree-types";

export type { TypedBlacklistResult, ValidationResult, ValidationCorrection };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Types ────────────────────────────────────────────────────────────

export interface RetrievalChunk {
  id: number;
  document_id: string;
  section: string;
  content: string;
  similarity: number;
  chapter?: string;
  document_title?: string;
}

// ── Typed Blacklist ──────────────────────────────────────────────────

/**
 * Fetch all active blacklist entries, grouped by type.
 * Used during retrieval (Step 6) to enforce per-type rules.
 */
export async function getTypedBlacklist(): Promise<TypedBlacklistResult> {
  const { data, error } = await supabase
    .from("section_blacklist")
    .select("*")
    .eq("is_active", true);

  if (error || !data) {
    console.error("[decision-tree] Failed to fetch blacklist:", error);
    return {
      superseded: [],
      low_confidence: [],
      corrupt_extraction: [],
      historical_only: [],
    };
  }

  const result: TypedBlacklistResult = {
    superseded: [],
    low_confidence: [],
    corrupt_extraction: [],
    historical_only: [],
  };

  for (const entry of data as SectionBlacklistEntry[]) {
    const type = entry.blacklist_type as BlacklistType;
    if (type in result) {
      result[type].push(entry);
    }
  }

  return result;
}

/**
 * Apply typed blacklist enforcement to search results.
 * Per the v3.1 plan:
 *   - Superseded: retrieve alongside replacement, label as superseded
 *   - Low-confidence: include but deprioritize (reduce similarity score)
 *   - Corrupt: EXCLUDE entirely
 *   - Historical: include ONLY if temporal query detected
 */
export function applyTypedBlacklist(
  chunks: RetrievalChunk[],
  blacklist: TypedBlacklistResult,
  isTemporalQuery: boolean
): RetrievalChunk[] {
  // Build lookup sets for fast matching
  const corruptSet = new Set(
    blacklist.corrupt_extraction.map((e) => `${e.document_id}:${e.section_number}`)
  );
  const supersededSet = new Set(
    blacklist.superseded.map((e) => `${e.document_id}:${e.section_number}`)
  );
  const lowConfidenceSet = new Set(
    blacklist.low_confidence.map((e) => `${e.document_id}:${e.section_number}`)
  );
  const historicalSet = new Set(
    blacklist.historical_only.map((e) => `${e.document_id}:${e.section_number}`)
  );

  // Extract section number from section label (e.g. "Section 264" → "264")
  const getSectionKey = (chunk: RetrievalChunk) => {
    const num = chunk.section?.match(/(?:Section|Rule|Article)\s+(\d+[\w()]*)/i)?.[1] || chunk.section;
    return `${chunk.document_id}:${num}`;
  };

  return chunks
    .filter((chunk) => {
      const key = getSectionKey(chunk);

      // Corrupt: EXCLUDE entirely
      if (corruptSet.has(key)) return false;

      // Historical: include ONLY if temporal query
      if (historicalSet.has(key) && !isTemporalQuery) return false;

      return true;
    })
    .map((chunk) => {
      const key = getSectionKey(chunk);

      // Low-confidence: deprioritize (reduce similarity by 30%)
      if (lowConfidenceSet.has(key)) {
        return { ...chunk, similarity: chunk.similarity * 0.7 };
      }

      // Superseded: reduce priority but keep (will be labeled in prompt)
      if (supersededSet.has(key)) {
        return { ...chunk, similarity: chunk.similarity * 0.8 };
      }

      return chunk;
    });
}

// ── Branch Management ────────────────────────────────────────────────

/**
 * Find matching branches for a query domain.
 * Returns confirmed branches first, then high-confidence unconfirmed.
 */
export async function findMatchingBranches(
  domain: string,
  crossDomains?: string[]
): Promise<DecisionTreeBranch[]> {
  const domains = [domain, ...(crossDomains || [])];

  const { data, error } = await supabase
    .from("decision_tree_branches")
    .select("*")
    .in("domain", domains)
    .not("status", "eq", "rejected")
    .order("status", { ascending: true }) // confirmed first
    .order("times_matched", { ascending: false });

  if (error || !data) {
    console.error("[decision-tree] Failed to fetch branches:", error);
    return [];
  }

  return data as DecisionTreeBranch[];
}

/**
 * Get a single branch by ID.
 */
export async function getBranch(branchId: number): Promise<DecisionTreeBranch | null> {
  const { data, error } = await supabase
    .from("decision_tree_branches")
    .select("*")
    .eq("id", branchId)
    .single();

  if (error || !data) return null;
  return data as DecisionTreeBranch;
}

/**
 * Propose a new draft branch from observed query-section patterns.
 * System proposes → contributor reviews → admin approves → CONFIRMED.
 */
export async function proposeDraftBranch(params: {
  queryType: string;
  label: string;
  domain: string;
  crossDomains?: string[];
  sections: Array<{ document_id: string; section_number: string; section: string }>;
  description?: string;
}): Promise<number | null> {
  const sectionNodes: BranchSectionNode[] = params.sections.map((s) => ({
    document_id: s.document_id,
    section_number: s.section_number,
    section: s.section,
    node_status: "unconfirmed" as NodeStatus,
  }));

  const { data, error } = await supabase
    .from("decision_tree_branches")
    .insert({
      query_type: params.queryType,
      label: params.label,
      description: params.description || null,
      domain: params.domain,
      cross_domains: params.crossDomains || [],
      sections: sectionNodes,
      status: "draft",
      section_count: sectionNodes.length,
      auto_generated: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[decision-tree] Failed to propose branch:", error);
    return null;
  }

  return data?.id ?? null;
}

// ── Section Relationships ────────────────────────────────────────────

/**
 * Get all related sections for a given section (bidirectional).
 */
export async function getRelatedSections(
  documentId: string,
  sectionNumber: string
): Promise<SectionRelationship[]> {
  const { data, error } = await supabase.rpc("get_related_sections", {
    p_document_id: documentId,
    p_section_number: sectionNumber,
  });

  if (error || !data) return [];
  return data as SectionRelationship[];
}

/**
 * Expand retrieval results with related sections from the relationship map.
 * Called when cross-domain expansion is needed.
 */
export async function expandWithRelatedSections(
  chunks: RetrievalChunk[],
  maxExpansion: number = 5
): Promise<string[]> {
  // Collect all sections currently in results
  const existingKeys = new Set(chunks.map((c) => `${c.document_id}:${c.section}`));
  const expansionSections: string[] = [];

  // For top chunks, find related sections
  const topChunks = chunks.slice(0, 5);
  for (const chunk of topChunks) {
    const sectionNum = chunk.section?.match(/(?:Section|Rule|Article)\s+(\d+[\w()]*)/i)?.[1];
    if (!sectionNum) continue;

    const related = await getRelatedSections(chunk.document_id, sectionNum);
    for (const rel of related) {
      const relDoc = "related_doc" in rel ? (rel as any).related_doc : rel.section_b_doc;
      const relSec = "related_section" in rel ? (rel as any).related_section : rel.section_b_number;
      const key = `${relDoc}:Section ${relSec}`;

      if (!existingKeys.has(key) && expansionSections.length < maxExpansion) {
        expansionSections.push(key);
        existingKeys.add(key);
      }
    }
  }

  return expansionSections;
}

// ── Supersession Chain ───────────────────────────────────────────────

/**
 * Check if a cited section has been superseded by a newer amendment.
 * Returns the latest version if superseded, null otherwise.
 */
export async function checkSupersession(
  documentId: string,
  sectionNumber: string
): Promise<{ latestDocId: string; latestSection: string } | null> {
  // Check section_blacklist for superseded entries
  const { data } = await supabase
    .from("section_blacklist")
    .select("replacement_doc_id, replacement_section_number")
    .eq("document_id", documentId)
    .eq("section_number", sectionNumber)
    .eq("blacklist_type", "superseded")
    .eq("is_active", true)
    .single();

  if (data?.replacement_doc_id && data?.replacement_section_number) {
    return {
      latestDocId: data.replacement_doc_id,
      latestSection: data.replacement_section_number,
    };
  }

  // Also check supersession_chains table
  const { data: chainData } = await supabase
    .from("supersession_chains")
    .select("amendment_doc_id, sections_affected")
    .eq("parent_doc_id", documentId)
    .eq("is_latest", true);

  if (chainData && chainData.length > 0) {
    for (const chain of chainData) {
      const affected = chain.sections_affected as string[] | null;
      if (affected?.includes(sectionNumber)) {
        return {
          latestDocId: chain.amendment_doc_id,
          latestSection: sectionNumber,
        };
      }
    }
  }

  return null;
}

// ── Post-Generation Validation (Step 9) ──────────────────────────────

/**
 * Validate a buffered answer against the decision tree.
 * This is the core Step 9 from the v3.1 plan.
 *
 * Two checks:
 * 1. LEGAL PRECEDENCE: Are cited sections the latest effective version?
 * 2. SYSTEM GOVERNANCE: Do citations match confirmed branches?
 */
export async function validateBufferedAnswer(
  answer: string,
  domain: string,
  crossDomains?: string[],
  citedSections?: Array<{ document_id: string; section_number: string; section: string }>
): Promise<ValidationResult> {
  const corrections: ValidationCorrection[] = [];
  const flaggedForReview: string[] = [];
  const newBranchProposals: string[] = [];

  if (!citedSections || citedSections.length === 0) {
    return { passed: true, corrections, flaggedForReview, newBranchProposals };
  }

  // ── 1. LEGAL PRECEDENCE CHECK ──
  for (const cited of citedSections) {
    const supersession = await checkSupersession(cited.document_id, cited.section_number);
    if (supersession) {
      corrections.push({
        type: "superseded_replacement",
        originalSection: `${cited.document_id}:${cited.section_number}`,
        correctedSection: `${supersession.latestDocId}:${supersession.latestSection}`,
        reason: `Section ${cited.section_number} from ${cited.document_id} has been superseded by ${supersession.latestDocId}`,
      });
    }
  }

  // ── 2. SYSTEM GOVERNANCE CHECK ──
  const branches = await findMatchingBranches(domain, crossDomains);
  const confirmedBranches = branches.filter((b) => b.status === "confirmed");

  if (confirmedBranches.length > 0) {
    for (const branch of confirmedBranches) {
      const branchSectionKeys = new Set(
        branch.sections.map((s) => `${s.document_id}:${s.section_number}`)
      );
      const citedKeys = new Set(
        citedSections.map((s) => `${s.document_id}:${s.section_number}`)
      );

      // Check for conflicts: AI uses different sections than confirmed branch
      for (const cited of citedSections) {
        const citedKey = `${cited.document_id}:${cited.section_number}`;
        if (!branchSectionKeys.has(citedKey)) {
          // AI found a section not in the confirmed branch
          // Check if it's a newer source (AI wins) or an error (branch wins)
          const supersession = await checkSupersession(cited.document_id, cited.section_number);
          if (!supersession) {
            // AI found something new — flag branch for recheck
            flaggedForReview.push(
              `Branch "${branch.label}" may need update: AI cited ${citedKey} which is not in the branch`
            );
          }
        }
      }

      // Record the branch match
      await supabase.rpc("record_branch_match", { p_branch_id: branch.id });
    }
  } else {
    // No confirmed branches exist for this domain — propose a draft
    if (citedSections.length >= 2) {
      newBranchProposals.push(domain);
    }
  }

  // ── 3. ADMIN CORRECTION CHECK ──
  const { data: corrections_data } = await supabase
    .from("admin_corrections")
    .select("*")
    .eq("is_active", true)
    .eq("legal_conflict_flag", false)
    .in(
      "document_id",
      citedSections.map((s) => s.document_id)
    );

  if (corrections_data && corrections_data.length > 0) {
    for (const correction of corrections_data) {
      const matchesCited = citedSections.some(
        (s) =>
          s.document_id === correction.document_id &&
          s.section_number === correction.section_number
      );
      if (matchesCited) {
        // Correction exists — will be applied as overlay during prompt assembly
        // Check if it's in "pending_legal_review" status
        if (correction.review_status === "pending_legal_review") {
          flaggedForReview.push(
            `Admin correction for ${correction.document_id}:${correction.section_number} is pending legal review — not applied`
          );
        }
      }
    }
  }

  return {
    passed: corrections.length === 0,
    corrections,
    flaggedForReview,
    newBranchProposals,
  };
}

// ── Temporal Query Detection ─────────────────────────────────────────

/**
 * Detect if a query is asking about historical/past law.
 * Used to decide whether to include historical-only blacklisted sections.
 */
export function isTemporalQuery(query: string): boolean {
  const temporalPatterns = [
    /\b(?:before|prior\s+to|previously|used\s+to|was\s+the\s+(?:law|rule|provision))\b/i,
    /\b(?:what\s+(?:was|were)|how\s+(?:was|were))\b.*\b(?:before|prior|previous|old|former)\b/i,
    /\b(?:change[ds]?\s+(?:from|since|over\s+time|between))\b/i,
    /\b(?:history|historical|evolution|amendment\s+history)\b/i,
    /\b(?:in\s+\d{4}|before\s+\d{4}|since\s+\d{4}|until\s+\d{4})\b/i,
    /\b(?:what\s+changed|what\s+was\s+amended|original\s+(?:version|text|provision))\b/i,
  ];

  return temporalPatterns.some((p) => p.test(query));
}

// ── Document Staging Pipeline ────────────────────────────────────────

/**
 * Get documents filtered by stage.
 * Regular users only see "live" documents.
 * Admin/contributors can see "staged" documents.
 */
export async function getDocumentsByStage(
  includeStaged: boolean = false
): Promise<string[]> {
  const stages = ["live"];
  if (includeStaged) stages.push("staged");

  const { data, error } = await supabase
    .from("documents")
    .select("id")
    .in("stage", stages);

  if (error || !data) return [];
  return data.map((d) => d.id);
}

/**
 * Amendment trigger: when a new document is uploaded or moves to "live",
 * check overlap with confirmed branches and mark affected as "recheck_required".
 */
export async function triggerAmendmentRecheck(
  newDocumentId: string,
  sectionsAffected?: string[]
): Promise<{ recheckCount: number; branchIds: number[] }> {
  // Fetch all confirmed branches
  const { data: confirmedBranches, error } = await supabase
    .from("decision_tree_branches")
    .select("id, sections, domain, label")
    .eq("status", "confirmed");

  if (error || !confirmedBranches) {
    return { recheckCount: 0, branchIds: [] };
  }

  const recheckBranchIds: number[] = [];

  for (const branch of confirmedBranches) {
    const branchSections = (branch.sections || []) as Array<{
      document_id: string;
      section_number: string;
    }>;

    // Check if this branch has any sections from the new document's parent
    // or if the new document's affected sections overlap
    const hasOverlap = branchSections.some((s) => {
      if (s.document_id === newDocumentId) return true;
      if (sectionsAffected && sectionsAffected.includes(s.section_number)) return true;
      return false;
    });

    if (hasOverlap) {
      await supabase.rpc("update_branch_status", {
        p_branch_id: branch.id,
        p_new_status: "recheck_required",
        p_user_id: "system",
        p_notes: `New document ${newDocumentId} uploaded — sections may be affected`,
      });
      recheckBranchIds.push(branch.id);
    }
  }

  return { recheckCount: recheckBranchIds.length, branchIds: recheckBranchIds };
}

// ── Branch Auto-Build ────────────────────────────────────────────────

interface RoutingCluster {
  domain: string;
  sections: Array<{ document_id: string; section_number: string; relevance: number }>;
}

/**
 * Auto-build branches from query_section_routes data.
 * Groups sections by domain that consistently appear together.
 * >70% section overlap = same branch (per v3.1 plan).
 *
 * Call this periodically (e.g., every 30 min or on-demand from admin).
 */
export async function autoBuildBranches(): Promise<{
  proposed: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let proposed = 0;
  let skipped = 0;

  // Fetch all routing data with sufficient evidence (routed at least 3 times)
  const { data: routes, error } = await supabase
    .from("query_section_routes")
    .select("*")
    .gte("times_routed", 3)
    .gte("relevance_score", 0.4)
    .order("domain")
    .order("relevance_score", { ascending: false });

  if (error || !routes || routes.length === 0) {
    return { proposed: 0, skipped: 0, errors: error ? [error.message] : [] };
  }

  // Group by domain
  const domainMap = new Map<string, RoutingCluster>();
  for (const route of routes) {
    if (!domainMap.has(route.domain)) {
      domainMap.set(route.domain, { domain: route.domain, sections: [] });
    }
    domainMap.get(route.domain)!.sections.push({
      document_id: route.document_id,
      section_number: route.section_number,
      relevance: route.relevance_score,
    });
  }

  // Fetch existing branches to check for overlap
  const { data: existingBranches } = await supabase
    .from("decision_tree_branches")
    .select("id, domain, sections, status")
    .not("status", "eq", "rejected");

  const existingBranchSections = (existingBranches || []).map((b) => {
    const sections = (b.sections || []) as Array<{ document_id: string; section_number: string }>;
    return {
      id: b.id,
      domain: b.domain,
      keys: new Set(sections.map((s) => `${s.document_id}:${s.section_number}`)),
    };
  });

  // For each domain cluster, check if a branch already covers it
  const domainEntries = Array.from(domainMap.entries());
  for (const [domain, cluster] of domainEntries) {
    if (cluster.sections.length < 2) continue; // Need at least 2 sections for a branch

    const clusterKeys = new Set<string>(
      cluster.sections.map((s: RoutingCluster["sections"][number]) => `${s.document_id}:${s.section_number}`)
    );

    // Check overlap with existing branches
    let hasOverlap = false;
    for (const existing of existingBranchSections) {
      if (existing.domain !== domain) continue;

      // Calculate section overlap
      let overlap = 0;
      clusterKeys.forEach((key: string) => {
        if (existing.keys.has(key)) overlap++;
      });

      const overlapRatio = overlap / Math.max(clusterKeys.size, existing.keys.size);
      if (overlapRatio >= 0.7) {
        hasOverlap = true;
        break;
      }
    }

    if (hasOverlap) {
      skipped++;
      continue;
    }

    // Propose a new branch
    const topSections = cluster.sections.slice(0, 10); // Max 10 sections per branch
    const branchId = await proposeDraftBranch({
      queryType: `${domain}_auto_${Date.now()}`,
      label: `Auto: ${domain} (${topSections.length} sections)`,
      domain,
      sections: topSections.map((s: RoutingCluster["sections"][number]) => ({
        document_id: s.document_id,
        section_number: s.section_number,
        section: `Section ${s.section_number}`,
      })),
      description: `Auto-proposed from routing data — ${topSections.length} sections with avg relevance ${
        Math.round((topSections.reduce((a: number, s: RoutingCluster["sections"][number]) => a + s.relevance, 0) / topSections.length) * 100) / 100
      }`,
    });

    if (branchId) {
      proposed++;
    } else {
      errors.push(`Failed to propose branch for domain: ${domain}`);
    }
  }

  return { proposed, skipped, errors };
}
