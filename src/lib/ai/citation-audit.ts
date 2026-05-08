// Labor Law Partner — Citation Audit
// Validates citations from AI responses against known sections in the chunks table

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CitationAuditResult {
  valid: Array<{ document_id: string; document_title: string; section: string }>;
  invalid: Array<{ document_id: string; document_title: string; section: string; reason: string }>;
  unverified: Array<{ document_id: string; document_title: string; section: string }>;
}

interface Citation {
  document_id: string;
  document_title: string;
  section: string;
}

// Cache known sections per document to avoid repeated queries
const sectionCache = new Map<string, Set<string>>();
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadKnownSections(
  supabase: SupabaseClient
): Promise<Map<string, Set<string>>> {
  const now = Date.now();
  if (sectionCache.size > 0 && now - cacheTimestamp < CACHE_TTL) {
    return sectionCache;
  }

  try {
    // Query distinct section references from chunks table
    // Column is "section" (stores values like "Section 7", "Rule 115")
    const { data, error } = await supabase
      .from("chunks")
      .select("document_id, section")
      .not("section", "is", null)
      .limit(5000);

    if (error || !data) {
      console.error("[citation-audit] Failed to load sections:", error);
      return sectionCache;
    }

    sectionCache.clear();
    for (const row of data) {
      const docId = row.document_id;
      if (!sectionCache.has(docId)) {
        sectionCache.set(docId, new Set());
      }
      // Store both the full string ("Section 7") and just the number ("7")
      // so we can match either format
      const full = String(row.section).trim();
      const numOnly = full.replace(/^(Section|Rule|ধারা|বিধি)\s*/i, "").trim();
      sectionCache.get(docId)!.add(full);
      sectionCache.get(docId)!.add(numOnly);
    }

    cacheTimestamp = now;
  } catch (err) {
    console.error("[citation-audit] Error loading sections:", err);
  }

  return sectionCache;
}

export async function auditCitations(
  citations: Citation[],
  supabase: SupabaseClient
): Promise<CitationAuditResult> {
  const result: CitationAuditResult = {
    valid: [],
    invalid: [],
    unverified: [],
  };

  if (!citations || citations.length === 0) return result;

  const knownSections = await loadKnownSections(supabase);

  // If cache is empty (DB query failed), mark all as unverified
  if (knownSections.size === 0) {
    result.unverified = [...citations];
    return result;
  }

  for (const citation of citations) {
    const docSections = knownSections.get(citation.document_id);

    if (!docSections) {
      // Document not in our database — unverified
      result.unverified.push(citation);
      continue;
    }

    // Try matching full string ("Section 26") and number only ("26")
    const full = citation.section.trim();
    const sectionNum = full.replace(/^(Section|Rule)\s*/i, "").trim();

    if (docSections.has(full) || docSections.has(sectionNum)) {
      result.valid.push(citation);
    } else {
      result.invalid.push({
        ...citation,
        reason: `Section ${sectionNum} not found in ${citation.document_id}`,
      });
    }
  }

  return result;
}
