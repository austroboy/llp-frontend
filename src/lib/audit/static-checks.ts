/**
 * Static audit checks — fast, local text analysis.
 * Extracted from scripts/validate-knowledge-base.ts.
 */
import type { AuditFinding } from "./types";

// ── Garbled text detection ───────────────────────────────────────────

const GARBLED_PATTERNS = [
  /†[a-zA-Z]{2,}/g,
  /‡[a-zA-Z]/g,
  /[Ïÿ÷ƒ©]{2,}/g,
  /[Ø×Ù]{2,}/g,
  /wbgœ|cÖKv|Kvh©|†nvK/g,
  /[†‡ˆ‰Š‹Œ]{2,}/g,
];

function detectGarbledRatio(content: string): number {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return 0;

  let garbledLines = 0;
  for (const line of lines) {
    let garbledChars = 0;
    for (const pattern of GARBLED_PATTERNS) {
      const matches = line.match(pattern);
      if (matches) garbledChars += matches.join("").length;
    }
    const nonWhitespace = line.replace(/\s/g, "").length;
    if (nonWhitespace > 0 && garbledChars / nonWhitespace > 0.3) {
      garbledLines++;
    }
  }
  return garbledLines / lines.length;
}

// ── AI preamble detection ────────────────────────────────────────────

const AI_PREAMBLE_PATTERNS = [
  /^Here(?:'s| is) the (?:translated|extracted|English)/i,
  /^This document is a legal (?:notification|document|text)/i,
  /formatted as requested/i,
  /^Below is the/i,
  /^I(?:'ve| have) translated/i,
  /^The following is/i,
  /preserving all section/i,
];

function detectAIPreambles(content: string): string[] {
  const lines = content.split("\n");
  const found: string[] = [];
  const checkLines = [...lines.slice(0, 10), ...lines.slice(-5)];

  for (const line of checkLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const pattern of AI_PREAMBLE_PATTERNS) {
      if (pattern.test(trimmed)) {
        found.push(trimmed.slice(0, 100));
        break;
      }
    }
  }
  return found;
}

// ── Section counting ─────────────────────────────────────────────────

function countSections(content: string): { sections: string[]; total: number } {
  const sectionPatterns = [
    // "Section 1" or "section 27A"
    /^Section\s+(\d+[A-Za-z]?)/gim,
    // "Rule 7" or "Rule 12A"
    /^Rule\s+(\d+[A-Za-z]?)/gim,
    // "1. Short title..." or "27A. Maternity benefit..."  (numbered clause at start of line)
    /^(\d+[A-Za-z]?)\.\s+[A-Z\u0980-\u09FF]/gm,
    // Markdown bold: "**1.** ..."
    /^\*\*(\d+[A-Za-z]?)[\.\s]+/gm,
    // Markdown heading: "# 1. ..." or "## 27A. ..."
    /^#{1,4}\s*(\d+[A-Za-z]?)[\.\s]+/gm,
    // Bangla section: "ধারা ১" (using Bangla numerals)
    /ধারা\s+([০-৯]+[ক-হ]?)/g,
    // Bangla rule: "বিধি ৭"
    /বিধি\s+([০-৯]+[ক-হ]?)/g,
  ];

  const found = new Set<string>();
  for (const pattern of sectionPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      found.add(match[1]);
    }
  }

  const sorted = Array.from(found).sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  return { sections: sorted, total: sorted.length };
}

// ── Section continuity ──────────────────────────────────────────────

interface SectionGap {
  description: string;
  /** The section number just before the gap — used to scroll to that area */
  beforeSection: number;
}

function checkSectionGaps(sections: string[]): SectionGap[] {
  const numericSections = sections
    .map((s) => parseInt(s))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);

  const gaps: SectionGap[] = [];
  for (let i = 1; i < numericSections.length; i++) {
    const diff = numericSections[i] - numericSections[i - 1];
    if (diff > 1) {
      const missing = [];
      for (let j = numericSections[i - 1] + 1; j < numericSections[i]; j++) {
        missing.push(j);
      }
      const description = missing.length <= 10
        ? `Missing: ${missing.join(", ")} (between ${numericSections[i - 1]} and ${numericSections[i]})`
        : `Gap of ${diff - 1} sections between ${numericSections[i - 1]} and ${numericSections[i]}`;
      gaps.push({ description, beforeSection: numericSections[i - 1] });
    }
  }
  return gaps;
}

/**
 * Find the best snippet in the text to scroll to for a given section number.
 * Tries "Section N.", "N. ", "ধারা N" patterns.
 */
function findSectionSnippet(text: string, sectionNum: number): string | undefined {
  // Try common patterns, return the first 40 chars from the match position
  const patterns = [
    new RegExp(`Section\\s+${sectionNum}[A-Za-z]?\\.`),
    new RegExp(`^${sectionNum}\\.\\s+`, "m"),
    new RegExp(`ধারা\\s+[০-৯]+`), // Bangla — less precise but usable
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m && m.index !== undefined) {
      return text.slice(m.index, m.index + 60).trim();
    }
  }
  return undefined;
}

// ── Expected section counts ─────────────────────────────────────────

const EXPECTED_SECTIONS: Record<string, { min: number; max: number }> = {
  "DOC-001": { min: 300, max: 360 },
  "DOC-002": { min: 5, max: 10 },
  "DOC-003": { min: 2, max: 5 },
  "DOC-004": { min: 20, max: 50 },
  "DOC-005": { min: 10, max: 30 },
  "DOC-006": { min: 30, max: 80 },
  "DOC-007": { min: 100, max: 350 },
  "DOC-008": { min: 20, max: 80 },
};

// ── Types ───────────────────────────────────────────────────────────

interface DocMeta {
  id: string;
  pages: number;
  language: string;
  is_parent: boolean;
  amends?: string | null;
}

// ── Main runner ─────────────────────────────────────────────────────

export function runStaticChecks(
  docId: string,
  docMeta: DocMeta,
  enText: string | null,
  bnText: string | null,
  enFileSize: number | null,
  bnFileSize: number | null,
  translatedMode: boolean = false
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  let findingIdx = 0;
  const fid = () => `static-${findingIdx++}`;

  const checkText = (
    text: string,
    lang: "en" | "bn",
    fileSize: number | null
  ) => {
    // Empty check
    if (text.trim().length === 0) {
      findings.push({
        id: fid(),
        category: "content",
        severity: "error",
        title: "Empty file",
        description: `The ${lang === "en" ? "English" : "Bangla"} text file is empty.`,
        language: lang,
        action: {
          type: "re-ocr",
          label: "Re-OCR",
          description: "Re-extract text from PDF using Mistral OCR",
        },
      });
      return;
    }

    // Garbled text
    const garbledRatio = detectGarbledRatio(text);
    if (garbledRatio > 0.5) {
      findings.push({
        id: fid(),
        category: "encoding",
        severity: "error",
        title: "Severely garbled text",
        description: `${Math.round(garbledRatio * 100)}% of lines appear garbled (mojibake). Text extraction failed.`,
        language: lang,
        action: {
          type: "re-ocr",
          label: "Re-OCR",
          description: "Re-extract from PDF using Mistral OCR",
        },
      });
    } else if (garbledRatio > 0.1) {
      findings.push({
        id: fid(),
        category: "encoding",
        severity: "warning",
        title: "Partial encoding issues",
        description: `${Math.round(garbledRatio * 100)}% of lines have encoding problems.`,
        language: lang,
        action: {
          type: "manual-review",
          label: "Review",
          description: "Manually inspect the problem areas",
        },
      });
    } else {
      findings.push({
        id: fid(),
        category: "encoding",
        severity: "info",
        title: "Clean encoding",
        description: `Text encoding is clean (${Math.round(garbledRatio * 100)}% garbled).`,
        language: lang,
      });
    }

    // AI preambles
    const preambles = detectAIPreambles(text);
    if (preambles.length > 0) {
      findings.push({
        id: fid(),
        category: "preamble",
        severity: "warning",
        title: "AI preamble detected",
        description: `Found ${preambles.length} AI-generated preamble(s) in legal text.`,
        language: lang,
        action: {
          type: "clean-preamble",
          label: "Clean",
          description: "Remove AI commentary from beginning/end of file",
        },
        details: preambles.map((p) => `"${p}"`).join("\n"),
        location: { position: "start", snippet: preambles[0] },
      });
    } else {
      findings.push({
        id: fid(),
        category: "preamble",
        severity: "info",
        title: "No AI preambles",
        description: "No AI-generated commentary detected.",
        language: lang,
      });
    }

    // Section count + gaps + file size — skip for translated docs
    if (!translatedMode) {
      const { sections, total } = countSections(text);
      const expected = EXPECTED_SECTIONS[docId];
      if (expected) {
        if (total < expected.min) {
          findings.push({
            id: fid(),
            category: "sections",
            severity: "warning",
            title: "Low section count",
            description: `Found ${total} sections (expected ${expected.min}-${expected.max}). Content may be missing.`,
            language: lang,
            action: {
              type: "manual-review",
              label: "Verify",
              description: "Compare against original PDF",
            },
            details: `Found: ${sections.slice(0, 20).join(", ")}${sections.length > 20 ? "..." : ""}`,
          });
        } else if (total > expected.max) {
          findings.push({
            id: fid(),
            category: "sections",
            severity: "warning",
            title: "High section count",
            description: `Found ${total} sections (expected ${expected.min}-${expected.max}). May include false positives.`,
            language: lang,
          });
        } else {
          findings.push({
            id: fid(),
            category: "sections",
            severity: "info",
            title: "Section count OK",
            description: `Found ${total} sections (expected ${expected.min}-${expected.max}).`,
            language: lang,
          });
        }
      }

      // Section continuity (parent acts only)
      if (docMeta.is_parent) {
        const gaps = checkSectionGaps(sections);
        if (gaps.length > 0) {
          // Find a text snippet near the first gap so we can scroll to it
          const firstGap = gaps[0];
          const snippet = findSectionSnippet(text, firstGap.beforeSection);

          findings.push({
            id: fid(),
            category: "sections",
            severity: "warning",
            title: "Section numbering gaps",
            description: `Found ${gaps.length} gap(s) in section numbering.`,
            language: lang,
            action: {
              type: "manual-review",
              label: "Check gaps",
              description: "Verify missing sections against PDF",
            },
            details: gaps.map((g) => g.description).join("\n"),
            location: snippet ? { snippet } : undefined,
          });
        }
      }

      // File size ratio
      if (fileSize !== null && docMeta.pages > 0) {
        const bytesPerPage = fileSize / docMeta.pages;
        const isSmallDoc = docMeta.pages < 15;
        const minExpected = isSmallDoc ? 100 : (lang === "en" ? 150 : 100);
        const maxExpected = lang === "en" ? 15000 : 12000;

        if (bytesPerPage < minExpected) {
          findings.push({
            id: fid(),
            category: "filesize",
            severity: "warning",
            title: "Suspiciously small file",
            description: `${Math.round(bytesPerPage)} bytes/page (expected >${minExpected}). Content may be missing.`,
            language: lang,
            action: {
              type: "re-ocr",
              label: "Re-OCR",
              description: "Re-extract text from PDF",
            },
          });
        } else if (bytesPerPage > maxExpected) {
          findings.push({
            id: fid(),
            category: "filesize",
            severity: "warning",
            title: "Unusually large file",
            description: `${Math.round(bytesPerPage)} bytes/page (expected <${maxExpected}). May contain duplicates.`,
            language: lang,
          });
        }
      }
    }

    // Amendment cross-reference
    if (docMeta.amends) {
      const refPatterns = [
        /Act.*(?:No\.?|of)\s*42.*2006/i,
        /Bangladesh Labour Act/i,
        /said Act/i,
        /Bangladesh Labour Rules/i,
      ];
      const hasRef = refPatterns.some((p) => p.test(text));
      if (!hasRef) {
        findings.push({
          id: fid(),
          category: "cross-reference",
          severity: "warning",
          title: "No parent act reference",
          description: `No reference to parent document (${docMeta.amends}) found in text.`,
          language: lang,
          action: {
            type: "manual-review",
            label: "Review",
            description:
              "Verify extraction captured amendment references",
          },
        });
      }
    }
  };

  if (enText) checkText(enText, "en", enFileSize);
  if (bnText) checkText(bnText, "bn", bnFileSize);

  return findings;
}
