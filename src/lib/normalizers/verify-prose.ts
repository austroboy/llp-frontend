// Normalize llp-chat-verify agent prose into the contracted
// delegation_status:complete shape. The agent (Opus via claude-cli) often
// emits narrative prose with bolded verdict banners instead of strict JSON,
// despite frontmatter + workspace CLAUDE.md demanding JSON-only. Until the
// orchestrator platform-level issues (session CLAUDE.md wrapping, workspace CWD
// mismatch) are fixed, orchestrator-side parsing is the reliable mitigation.
//
// Heuristic ladder for verdict (first match wins):
//   1. Out-of-scope / cannot find  → not_verifiable
//   2. Explicit contradiction      → disagree
//   3. Qualifier (partially, etc.) → partial
//   4. Explicit positive match     → agree
//   5. No signal                   → not_verifiable (parse-fail marker in summary)

import { normalizeSchemaSection } from "./section";

export type VerifyVerdict = "agree" | "disagree" | "partial" | "not_verifiable";

export interface VerifyCitation {
  document_id: string;
  section: string;
  pages?: number[];
}

export interface NormalizedVerifyReport {
  verdict: VerifyVerdict;
  section: string | null;
  result_summary: string;
  citations: VerifyCitation[];
  raw_prose: string;
}

export interface VerifyProseHint {
  expected_section?: string;
  claim?: string;
}

// Parse-fail marker — downstream (e.g. chat persistence, analytics) can
// detect this suffix to distinguish a synthesised unverifiable from a real
// agent-reported one.
export const PARSE_FAIL_SUFFIX = "defaulting to unverifiable.";
const PARSE_FAIL_SUMMARY = `verify returned non-contractual prose; ${PARSE_FAIL_SUFFIX}`;

// Ordered most-specific → least-specific. Amendments must match before the
// parent Act so "Bangladesh Labour Act, 2006" doesn't swallow
// "Bangladesh Labour (Amendment) Act, 2026" etc.
const DOC_TITLE_MAP: Array<{ pattern: RegExp; docId: string }> = [
  { pattern: /bangladesh\s+labour\s+\(?amendment\)?\s+act,?\s*2026/i, docId: "DOC-011" },
  { pattern: /bangladesh\s+labour\s+\(?amendment\)?\s+ordinance,?\s*2025/i, docId: "DOC-006" },
  { pattern: /bangladesh\s+labour\s+\(?amendment\)?\s+act,?\s*2018/i, docId: "DOC-005" },
  { pattern: /bangladesh\s+labour\s+\(?amendment\)?\s+act,?\s*2013/i, docId: "DOC-004" },
  { pattern: /bangladesh\s+labour\s+\(?amendment\)?\s+act,?\s*2010/i, docId: "DOC-003" },
  { pattern: /bangladesh\s+labour\s+\(?amendment\)?\s+act,?\s*2009/i, docId: "DOC-002" },
  { pattern: /bangladesh\s+labour\s+rules\s+\(?amendment\)?,?\s*2022/i, docId: "DOC-008" },
  { pattern: /bangladesh\s+labour\s+rules,?\s*2015/i, docId: "DOC-007" },
  { pattern: /bangladesh\s+labour\s+act,?\s*2006/i, docId: "DOC-010" },
];

const DOC_SECTION_RX = /DOC-(\d{3})\s*§\s*(\d+[A-Z]?)/gi;

function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*`_~]+/g, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyVerdict(prose: string): VerifyVerdict | null {
  const lower = prose.toLowerCase();

  // 1. Out-of-scope / cannot find — check BEFORE positive signals because
  //    phrases like "cannot verify" otherwise slip through agree.
  if (
    /\b(not\s+found\s+in|outside\s+(?:the\s+)?universe|outside\s+scope|cannot\s+verify|unable\s+to\s+verify|no\s+source\s+for|not[ -]verifiable|source\s+corpus\s+unavailable)\b/.test(
      lower,
    )
  ) {
    return "not_verifiable";
  }

  // 2. Explicit contradiction — "FAIL", "incorrect", "actually X", "instead
  //    of Y". `fail` is left unanchored so `FAIL — …` (observed in hand-run
  //    case 2) matches; `fabricated` is a verify rubric term.
  if (
    /\b(incorrect|wrong|false|fabricated|contradict(?:s|ed)?|does\s+not\s+match|disagree|mismatch|fail|actually|instead\s+of|rather\s+than)\b/.test(
      lower,
    )
  ) {
    return "disagree";
  }

  // 3. Qualifier — partial.
  if (
    /\b(partial(?:ly)?|mostly|close\s+but|almost|off\s+by|roughly)\b/.test(
      lower,
    )
  ) {
    return "partial";
  }

  // 4. Explicit positive. `verified` is a verify rubric term (case 4 in
  //    hand-run used "Likely Accurate" — handled separately below).
  if (
    /\b(confirmed|correct|agree|verified|matches|consistent\s+with|accurate)\b/.test(
      lower,
    )
  ) {
    return "agree";
  }

  return null;
}

function extractSection(
  prose: string,
  hint: VerifyProseHint,
): string | null {
  // Primary: DOC-### §N form (most reliable). Normalize whitespace around §.
  const direct = prose.match(/DOC-(\d{3})\s*§\s*(\d+[A-Z]?)/i);
  if (direct) return `DOC-${direct[1]} §${direct[2].toUpperCase()}`;

  // Fallback 1: "Section N of <doc title>" synthesis against DOC_TITLE_MAP.
  // Include comma in capture — doc titles contain ", YYYY" and splitting at
  // comma would lose the year (e.g. "Bangladesh Labour Act, 2006" → "Act").
  const titleSection = prose.match(
    /(?:section|sec\.?|§)\s*(\d+[A-Z]?)\s+of\s+(?:the\s+)?([^.\n]+)/i,
  );
  if (titleSection) {
    const sectionNum = titleSection[1];
    const title = titleSection[2];
    for (const { pattern, docId } of DOC_TITLE_MAP) {
      if (pattern.test(title)) return `${docId} §${sectionNum}`;
    }
  }

  // Fallback 2: hint.expected_section if parseable.
  if (hint.expected_section) {
    const normalized = normalizeSchemaSection(hint.expected_section);
    if (normalized) return normalized;
  }

  return null;
}

function extractCitations(prose: string): VerifyCitation[] {
  const seen = new Set<string>();
  const out: VerifyCitation[] = [];
  // Fresh regex instance because the module-level one has `g` flag and
  // shared state across calls is a footgun.
  const rx = new RegExp(DOC_SECTION_RX.source, DOC_SECTION_RX.flags);
  let m: RegExpExecArray | null;
  while ((m = rx.exec(prose)) !== null) {
    const docId = `DOC-${m[1]}`;
    const section = `§${m[2].toUpperCase()}`;
    const key = `${docId}|${section}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ document_id: docId, section });
  }
  return out;
}

function extractSummary(
  prose: string,
  verdict: VerifyVerdict,
): string {
  const clean = stripMarkdown(prose);
  if (!clean) {
    return verdict === "not_verifiable" ? PARSE_FAIL_SUMMARY : "Verification complete.";
  }
  const sentences = clean.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const anchored = sentences.find((s) =>
    /(DOC-\d{3}|section\s+\d+|§\s*\d+|\d[\d,]*\s*(?:%|bdt|tk|days?|weeks?|hours?|months?|years?))/i.test(
      s,
    ),
  );
  const pick = anchored ?? sentences[0] ?? clean;
  const trimmed = pick.slice(0, 200).trim();
  return trimmed || "Verification complete.";
}

export function normalizeVerifyProse(
  prose: string,
  hint: VerifyProseHint = {},
): NormalizedVerifyReport {
  const raw = typeof prose === "string" ? prose : "";
  const trimmed = raw.trim();

  if (!trimmed) {
    return {
      verdict: "not_verifiable",
      section: hint.expected_section ? normalizeSchemaSection(hint.expected_section) : null,
      result_summary: PARSE_FAIL_SUMMARY,
      citations: [],
      raw_prose: raw,
    };
  }

  const verdict = classifyVerdict(trimmed);
  if (verdict === null) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[normalizeVerifyProse] no verdict signal detected; defaulting to not_verifiable",
      );
    }
    return {
      verdict: "not_verifiable",
      section: extractSection(trimmed, hint),
      result_summary: PARSE_FAIL_SUMMARY,
      citations: [],
      raw_prose: raw,
    };
  }

  const section = extractSection(trimmed, hint);
  const summary = extractSummary(trimmed, verdict);
  const citations = verdict === "not_verifiable" ? [] : extractCitations(trimmed);

  return {
    verdict,
    section,
    result_summary: summary,
    citations,
    raw_prose: raw,
  };
}
