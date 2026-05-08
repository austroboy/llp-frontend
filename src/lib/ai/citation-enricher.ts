// Citation Enricher — Post-LLM Citation Recovery (v5 — dual strategy)
// Strategy 1: Section number appears in answer + content overlap
// Strategy 2: Strong phrase/term overlap alone

import type { SearchChunk } from "./citation-confidence";

interface Citation {
  document_id: string;
  document_title: string;
  section: string;
  match_type?: string;
}

interface EnrichedCitation extends Citation {
  match_type: "context_enriched";
  enrichment_score: number;
}

const DOCUMENT_MAP: Record<string, string> = {
  "DOC-010": "Bangladesh Labour Act, 2006",
  "DOC-001": "Bangladesh Labour Act, 2006",
  "DOC-002": "Bangladesh Labour (Amendment) Act, 2009",
  "DOC-003": "Bangladesh Labour (Amendment) Act, 2010",
  "DOC-004": "Bangladesh Labour (Amendment) Act, 2013",
  "DOC-005": "Bangladesh Labour (Amendment) Act, 2018",
  "DOC-006": "Bangladesh Labour (Amendment) Ordinance, 2025",
  "DOC-007": "Bangladesh Labour Rules, 2015",
  "DOC-008": "Bangladesh Labour Rules (Amendment), 2022",
};

const AMENDMENT_DOCS = new Set(["DOC-002", "DOC-003", "DOC-004", "DOC-005", "DOC-006", "DOC-008"]);

const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "have", "been", "were",
  "they", "their", "about", "which", "when", "would", "there", "will", "each",
  "make", "like", "does", "many", "some", "than", "other", "into", "only",
  "over", "such", "also", "more", "after", "should", "most", "before", "must",
  "through", "just", "where", "very", "between", "being", "during", "without",
  "under", "within", "upon", "could", "shall", "what", "your", "them", "then",
  "these", "those", "here", "there", "because", "while", "until", "both",
  "section", "rule", "chapter", "part", "schedule", "form", "paragraph",
  "sub-section", "clause", "proviso", "explanation", "provided", "notwithstanding",
  "hereinafter", "thereof", "herein", "aforesaid", "forthwith", "therein",
  "subject", "provision", "provisions", "purpose", "purposes", "respect",
  "prescribed", "applicable", "referred", "mentioned", "specified", "defined",
  "bangladesh", "labour", "workers", "worker", "employer", "employers",
  "employee", "employees", "employment", "employed", "person", "persons",
  "establishment", "establishments", "factory", "factories", "industrial",
  "government", "inspector", "director", "authority", "tribunal", "court",
  "order", "notice", "period", "service", "services", "working", "work",
  "wages", "wage", "payment", "paid", "payable", "amount", "rate",
  "according", "rules", "regarding", "case", "cases", "manner", "conditions",
  "rights", "right", "duty", "duties", "power", "powers", "function",
  "act", "may", "any", "every", "said", "such", "been", "being",
  "shall", "may", "years", "days", "months", "time", "date",
  "written", "writing", "application", "register", "record", "report",
  "penalty", "fine", "offence", "contravention", "violation", "imprisonment",
  "complaint", "proceedings", "appeal", "opinion", "satisfaction",
  "termination", "dismissal", "discharge", "resignation", "retrenchment",
  "leave", "absence", "holiday", "compensation", "benefit", "benefits",
  "union", "trade", "member", "members", "committee", "board", "meeting",
  "health", "safety", "welfare", "injury", "accident", "disease",
  "woman", "women", "child", "children", "young", "adolescent",
  "contract", "agreement", "appointment", "condition", "terms",
]);

function normalizeSectionKey(section: string): string {
  return section.replace(/^(Section|Rule|ধারা|বিধি)\s*/i, "").replace(/\s+/g, "").replace(/\(Part\s*\d+\)/i, "").toLowerCase();
}

export function enrichCitations(
  existingCitations: Citation[],
  ragChunks: SearchChunk[],
  answerText: string,
): EnrichedCitation[] {
  if (!ragChunks || ragChunks.length === 0 || !answerText) return [];

  const answerNormalized = answerText.replace(/[০-৯]/g, ch =>
    String("০১২৩৪৫৬৭৮৯".indexOf(ch))
  );
  const answerLower = answerNormalized.toLowerCase();

  const citedKeys = new Set<string>();
  for (const c of existingCitations) {
    citedKeys.add(normalizeSectionKey(c.section));
  }

  const candidates: EnrichedCitation[] = [];

  for (const chunk of ragChunks) {
    if (!chunk.content || !chunk.section) continue;
    if (chunk.content.length < 100) continue;

    const sectionKey = normalizeSectionKey(chunk.section);
    if (citedKeys.has(sectionKey)) continue;

    const bareNum = sectionKey.replace(/[^0-9a-z]/gi, "");
    if (!bareNum) continue;

    const numRegex = new RegExp(`\\b${bareNum}\\b`, "i");
    const hasNumberMention = numRegex.test(answerNormalized);

    const lower = chunk.content.toLowerCase().replace(/[^\w\s]/g, " ");
    const words = lower.split(/\s+/).filter(w => w.length > 2);

    const phrases: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) {
        phrases.push(words[i] + " " + words[i + 1]);
      }
    }
    const numCtx = chunk.content.match(/\b\d+(?:\.\d+)?\s*(?:days?|months?|years?|percent|%|taka|tk|hours?|weeks?)\b/gi) || [];
    for (const p of numCtx) { const c = p.trim().toLowerCase(); if (!phrases.includes(c)) phrases.push(c); }

    const freq: Record<string, number> = {};
    for (const w of words) { if (w.length >= 6 && !STOP_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1; }
    const dTerms = Object.entries(freq).filter(([,c]) => c >= 2).sort((a,b) => b[1]-a[1]).slice(0,8).map(([w]) => w);

    const phraseMatches = phrases.filter(p => answerLower.includes(p)).length;
    const termMatches = dTerms.filter(t => answerLower.includes(t)).length;

    const hasContentOverlap = phraseMatches >= 1 || termMatches >= 2;
    const hasStrongOverlap = phraseMatches >= 2 || (phraseMatches >= 1 && termMatches >= 2) || termMatches >= 4;

    if (!hasStrongOverlap && !(hasNumberMention && hasContentOverlap)) continue;

    const total = phrases.length * 3 + dTerms.length;
    if (total === 0) continue;
    const score = (phraseMatches * 3 + termMatches + (hasNumberMention ? 5 : 0)) / (total + 5);
    const adjustedScore = AMENDMENT_DOCS.has(chunk.document_id) ? score * 1.1 : score;

    candidates.push({
      document_id: chunk.document_id,
      document_title: chunk.document_title || DOCUMENT_MAP[chunk.document_id] || "Unknown Document",
      section: chunk.section,
      match_type: "context_enriched",
      enrichment_score: adjustedScore,
    });
  }

  candidates.sort((a, b) => b.enrichment_score - a.enrichment_score);

  const seenSections = new Set<string>();
  const enriched: EnrichedCitation[] = [];
  for (const c of candidates) {
    const key = normalizeSectionKey(c.section);
    if (seenSections.has(key)) continue;
    seenSections.add(key);
    enriched.push(c);
    if (enriched.length >= 6) break;
  }

  if (enriched.length > 0) {
    console.log(`[citation-enricher] Added ${enriched.length} enriched citations:`,
      enriched.map(c => `${c.section} (${c.document_id}, score=${c.enrichment_score.toFixed(2)})`).join(", "));
  }

  return enriched;
}
