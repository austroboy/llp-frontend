// Labor Law Partner — Citation Confidence Persistence
// Bridges Vercel-side audit results to Supabase citation_confidence tables

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditVerdict {
  section: string;
  document_id: string;
  verdict: "correct" | "misquoted" | "fabricated" | "partially_correct" | "regex_invalid";
  confidence?: number;
  explanation?: string;
  source_chunk_id?: number;
}

/**
 * Persist audit verdicts to Supabase.
 * Called after inference-side semantic verification or Vercel-side regex audit.
 * Updates citation_confidence via RPC, logs to verification trail,
 * and detects hallucination patterns.
 */
export async function persistAuditVerdicts(
  verdicts: AuditVerdict[],
  queryText: string,
  supabase: SupabaseClient,
  verifierModel: string = "gemini-2.5-flash",
  domain?: string,
): Promise<void> {
  for (const v of verdicts) {
    const sectionNumber = v.section.replace(/^(Section|Rule|ধারা|বিধি)\s*/i, "").trim();

    try {
      // 1. Update citation_confidence via RPC (upsert + score recalculation)
      await supabase.rpc("update_citation_confidence", {
        p_document_id: v.document_id,
        p_section: v.section,
        p_section_number: sectionNumber,
        p_verdict: v.verdict,
      });

      // 2. Log to citation_verification_log
      await supabase.from("citation_verification_log").insert({
        query_text: queryText.slice(0, 500),
        document_id: v.document_id,
        section: v.section,
        verdict: v.verdict,
        confidence: v.confidence ?? null,
        explanation: v.explanation ?? null,
        verifier_model: verifierModel,
        source_chunk_id: v.source_chunk_id ?? null,
      });

      // 3. Detect hallucination patterns for fabricated/misquoted
      if (v.verdict === "fabricated" || v.verdict === "misquoted") {
        await detectHallucinationPattern(v, queryText, supabase, domain);
      }
    } catch (err) {
      console.error(`[citation-confidence] Failed to persist verdict for ${v.section}:`, err);
    }
  }
}

/**
 * Persist regex audit results when inference-side semantic audit wasn't received.
 * Regex-valid sections get a moderate baseline confidence (0.5),
 * regex-invalid sections get flagged with low confidence (0.1).
 */
export async function persistRegexAuditResults(
  valid: Array<{ document_id: string; section: string }>,
  invalid: Array<{ document_id: string; section: string; reason?: string }>,
  queryText: string,
  supabase: SupabaseClient,
  domain?: string,
): Promise<void> {
  const verdicts: AuditVerdict[] = [
    ...valid.map((c) => ({
      section: c.section,
      document_id: c.document_id,
      verdict: "correct" as const,
      confidence: 0.5,
      explanation: "Regex validation: section exists in database",
    })),
    ...invalid.map((c) => ({
      section: c.section,
      document_id: c.document_id,
      verdict: "regex_invalid" as const,
      confidence: 0.1,
      explanation: c.reason || "Section not found in database",
    })),
  ];

  if (verdicts.length > 0) {
    await persistAuditVerdicts(verdicts, queryText, supabase, "regex-validator", domain);
  }
}

/**
 * Fetch blacklisted sections (confidence < 0.2, cited > 2 times).
 * Injected into system prompt to prevent re-hallucination.
 */
export async function getBlacklistedSections(
  supabase: SupabaseClient,
): Promise<Array<{ document_id: string; section: string; section_number: string; confidence_score: number }>> {
  try {
    const { data, error } = await supabase
      .from("citation_confidence")
      .select("document_id, section, section_number, confidence_score")
      .lt("confidence_score", 0.2)
      .gt("times_cited", 2)
      .order("confidence_score", { ascending: true })
      .limit(20);

    if (error) {
      console.error("[citation-confidence] Failed to fetch blacklist:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[citation-confidence] Blacklist fetch error:", err);
    return [];
  }
}

// ── Phase 3: Self-Learning Loop ──────────────────────────────────────

/** Chunk shape returned by search_chunks_hybrid RPC */
export interface SearchChunk {
  chunk_id: number;
  document_id: string;
  document_title: string;
  section: string;
  chapter: string;
  content: string;
  similarity: number;
  match_type: string;
}

/**
 * Apply confidence weighting to search results.
 * Boosts high-confidence sections, penalizes low-confidence ones.
 * Formula: weighted = similarity * (0.7 + 0.3 * confidence)
 * - confidence 1.0 → multiplier 1.0 (no change)
 * - confidence 0.5 → multiplier 0.85 (slight penalty)
 * - confidence 0.0 → multiplier 0.7 (30% penalty)
 * Sections with no confidence data default to 0.5 (neutral).
 */
export async function applyConfidenceWeighting(
  chunks: SearchChunk[],
  supabase: SupabaseClient,
): Promise<SearchChunk[]> {
  if (chunks.length === 0) return chunks;

  try {
    // Batch fetch confidence scores for all sections in results
    const sectionKeys = chunks.map((c) => c.section?.replace(/^(Section|Rule|ধারা|বিধি)\s*/i, "").trim() || "");
    const docIds = Array.from(new Set(chunks.map((c) => c.document_id)));

    const { data: confData } = await supabase
      .from("citation_confidence")
      .select("document_id, section_number, confidence_score")
      .in("document_id", docIds)
      .in("section_number", sectionKeys.filter(Boolean));

    // Build lookup map
    const confMap = new Map<string, number>();
    for (const c of confData || []) {
      confMap.set(`${c.document_id}::${c.section_number}`, c.confidence_score);
    }

    // Apply weighting and re-sort
    const weighted = chunks.map((chunk) => {
      const sectionNum = chunk.section?.replace(/^(Section|Rule|ধারা|বিধি)\s*/i, "").trim() || "";
      const confidence = confMap.get(`${chunk.document_id}::${sectionNum}`) ?? 0.5;
      const multiplier = 0.7 + 0.3 * confidence;
      return { ...chunk, similarity: chunk.similarity * multiplier };
    });

    return weighted.sort((a, b) => b.similarity - a.similarity);
  } catch (err) {
    console.error("[citation-confidence] Confidence weighting failed:", err);
    return chunks; // Return unweighted on error
  }
}

/**
 * Fetch learned routing hints for a query domain.
 * Returns sections historically cited correctly for this domain,
 * sorted by relevance. Used to boost retrieval results.
 */
export async function getLearnedRoutes(
  domain: string,
  supabase: SupabaseClient,
): Promise<Array<{ document_id: string; section_number: string; relevance_score: number }>> {
  try {
    const { data, error } = await supabase
      .from("query_section_routes")
      .select("document_id, section_number, relevance_score")
      .eq("domain", domain)
      .gt("times_routed", 1)
      .gt("relevance_score", 0.5)
      .order("relevance_score", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[citation-confidence] Failed to fetch learned routes:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[citation-confidence] Learned routes error:", err);
    return [];
  }
}

/**
 * Record routing success/failure after audit.
 * Updates query_section_routes to learn which sections
 * are correctly cited for each domain.
 */
export async function recordRoutingSuccess(
  domain: string,
  verdicts: AuditVerdict[],
  supabase: SupabaseClient,
): Promise<void> {
  for (const v of verdicts) {
    const sectionNumber = v.section.replace(/^(Section|Rule|ধারা|বিধি)\s*/i, "").trim();
    if (!sectionNumber || !v.document_id) continue;

    const wasCorrect = v.verdict === "correct" || v.verdict === "partially_correct";

    try {
      await supabase.rpc("update_section_route", {
        p_domain: domain,
        p_document_id: v.document_id,
        p_section_number: sectionNumber,
        p_was_correct: wasCorrect,
      });
    } catch (err) {
      console.error(`[citation-confidence] Failed to record route for ${v.section}:`, err);
    }
  }
}

/**
 * Fetch active admin corrections for sections present in the retrieved chunks.
 * Returns a map of "document_id::section" → corrected_content.
 */
export async function getActiveCorrections(
  chunks: SearchChunk[],
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const correctionMap = new Map<string, string>();
  if (chunks.length === 0) return correctionMap;

  try {
    const docIds = Array.from(new Set(chunks.map((c) => c.document_id)));
    const sectionNumbers = chunks
      .map((c) => c.section?.replace(/^(Section|Rule|ধারা|বিধি)\s*/i, "").trim() || "")
      .filter(Boolean);

    const { data, error } = await supabase
      .from("admin_corrections")
      .select("document_id, section_number, corrected_content")
      .eq("is_active", true)
      .in("document_id", docIds)
      .in("section_number", sectionNumbers);

    if (error) {
      console.error("[citation-confidence] Failed to fetch corrections:", error);
      return correctionMap;
    }

    for (const c of data || []) {
      correctionMap.set(`${c.document_id}::${c.section_number}`, c.corrected_content);
    }
  } catch (err) {
    console.error("[citation-confidence] Corrections fetch error:", err);
  }

  return correctionMap;
}

// ── Internal Helpers ─────────────────────────────────────────────────

/** Detect and track recurring hallucination patterns */
async function detectHallucinationPattern(
  verdict: AuditVerdict,
  queryText: string,
  supabase: SupabaseClient,
  domain?: string,
): Promise<void> {
  const sectionNumber = verdict.section.replace(/^(Section|Rule|ধারা|বিধি)\s*/i, "").trim();

  try {
    const { data: existing } = await supabase
      .from("hallucination_patterns")
      .select("id, occurrence_count")
      .eq("pattern_type", verdict.verdict)
      .eq("document_id", verdict.document_id)
      .eq("section_number", sectionNumber)
      .eq("status", "active")
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from("hallucination_patterns")
        .update({
          occurrence_count: existing[0].occurrence_count + 1,
          example_query: queryText.slice(0, 200),
          query_domain: domain || null,
        })
        .eq("id", existing[0].id);
    } else {
      await supabase.from("hallucination_patterns").insert({
        pattern_type: verdict.verdict,
        document_id: verdict.document_id,
        section_number: sectionNumber,
        occurrence_count: 1,
        example_query: queryText.slice(0, 200),
        query_domain: domain || null,
        status: "active",
      });
    }
  } catch (err) {
    console.error("[citation-confidence] Pattern detection error:", err);
  }
}
