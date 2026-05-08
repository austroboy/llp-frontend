/**
 * PDF-Text alignment check — uses Mistral OCR to spot-check
 * whether extracted text matches the source PDF.
 */
import fs from "fs";
import path from "path";
import { getBilingualFlags } from "@/lib/registry";
import { getDocumentText } from "@/lib/document-storage";
import { PDF_FILES } from "@/lib/pdf-files";
import type { TokenTracker } from "./token-tracker";
import type { AuditFinding } from "./types";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
if (!MISTRAL_API_KEY) {
  // Fail fast at module load — this audit module is opt-in.
  // eslint-disable-next-line no-console
  console.warn("[pdf-alignment-check] MISTRAL_API_KEY not set; audit calls will fail.");
}

/**
 * OCR specific pages of a PDF via Mistral OCR API using base64.
 */
async function ocrPages(
  pdfPath: string,
  pages: number[],
  tracker?: TokenTracker
): Promise<string[]> {
  const fileBuffer = fs.readFileSync(pdfPath);
  const base64 = fileBuffer.toString("base64");

  const res = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        document_url: `data:application/pdf;base64,${base64}`,
      },
      pages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Mistral OCR error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const resultPages = (data.pages || [])
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index);

  // Track OCR page count
  if (tracker && resultPages.length > 0) {
    tracker.add("mistral-ocr-latest", 0, 0, resultPages.length);
  }

  return resultPages.map((p: { markdown?: string }) => p.markdown || "");
}

/**
 * Normalize text for comparison — strip markdown formatting,
 * collapse whitespace, remove special characters.
 */
function normalizeForComparison(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")          // markdown headings
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1") // bold/italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links
    .replace(/[|_~`>]/g, " ")           // table/formatting chars
    .replace(/\s+/g, " ")               // collapse whitespace
    .trim()
    .toLowerCase();
}

/**
 * Extract key phrases (3-word sequences) from text for comparison.
 * Uses shorter phrases for better tolerance of OCR differences.
 */
function extractKeyPhrases(text: string, maxPhrases: number = 30): string[] {
  const normalized = normalizeForComparison(text);
  const words = normalized.split(/\s+/).filter((w) => w.length > 2);
  const phrases: string[] = [];

  for (let i = 0; i <= words.length - 3 && phrases.length < maxPhrases * 3; i += 3) {
    const phrase = words.slice(i, i + 3).join(" ");
    if (phrase.length > 8) phrases.push(phrase);
  }

  // Return evenly spaced subset
  if (phrases.length <= maxPhrases) return phrases;
  const step = Math.floor(phrases.length / maxPhrases);
  return phrases.filter((_, i) => i % step === 0).slice(0, maxPhrases);
}

/**
 * Calculate what fraction of OCR'd phrases appear in the extracted text.
 * Uses fuzzy matching — a phrase matches if at least 2 of its 3 words
 * appear near each other in the extracted text.
 */
function calculateMatchRate(ocrText: string, extractedText: string): number {
  const phrases = extractKeyPhrases(ocrText);
  if (phrases.length === 0) return 1; // nothing to compare

  const normalizedExtracted = normalizeForComparison(extractedText);
  let matches = 0;

  for (const phrase of phrases) {
    // Exact match first
    if (normalizedExtracted.includes(phrase)) {
      matches++;
      continue;
    }
    // Fuzzy: check if individual words appear within a ~200 char window
    const words = phrase.split(" ");
    const firstWordIdx = normalizedExtracted.indexOf(words[0]);
    if (firstWordIdx >= 0) {
      const window = normalizedExtracted.slice(firstWordIdx, firstWordIdx + 200);
      const wordsFound = words.filter((w) => window.includes(w)).length;
      if (wordsFound >= 2) matches++;
    }
  }
  return matches / phrases.length;
}

export async function runPdfAlignmentCheck(
  docId: string,
  targetLang: "en" | "bn" = "en",
  tracker?: TokenTracker
): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  let idx = 0;
  const fid = () => `pdf-${idx++}`;

  const pdfMapping = PDF_FILES[docId];
  if (!pdfMapping) {
    findings.push({
      id: fid(),
      category: "pdf-alignment",
      severity: "info",
      title: "No PDF mapping",
      description: "No PDF files mapped for this document.",
    });
    return findings;
  }

  const pdfDir = path.join(process.cwd(), "docs", "pdf");
  const flags = await getBilingualFlags(docId);

  // Only check the targeted language. SKIP when the text is an AI translation.
  const checks: { lang: "en" | "bn"; pdfPath: string; hasText: boolean }[] = [];

  if (targetLang === "en" && pdfMapping.en && !flags.enTranslated) {
    checks.push({
      lang: "en",
      pdfPath: path.join(pdfDir, pdfMapping.en),
      hasText: flags.hasEn,
    });
  } else if (targetLang === "en" && pdfMapping.en && flags.enTranslated) {
    findings.push({
      id: fid(),
      category: "pdf-alignment",
      severity: "info",
      title: "PDF check skipped (EN)",
      description: "EN text is an AI translation, not extracted from this PDF — comparison not applicable.",
      language: "en",
    });
  }

  if (targetLang === "bn" && pdfMapping.bn && !flags.bnTranslated) {
    checks.push({
      lang: "bn",
      pdfPath: path.join(pdfDir, pdfMapping.bn),
      hasText: flags.hasBn,
    });
  } else if (targetLang === "bn" && pdfMapping.bn && flags.bnTranslated) {
    findings.push({
      id: fid(),
      category: "pdf-alignment",
      severity: "info",
      title: "PDF check skipped (BN)",
      description: "BN text is an AI translation, not extracted from this PDF — comparison not applicable.",
      language: "bn",
    });
  }

  for (const { lang, pdfPath, hasText } of checks) {
    if (!fs.existsSync(pdfPath)) {
      findings.push({
        id: fid(),
        category: "pdf-alignment",
        severity: "warning",
        title: `PDF not found (${lang.toUpperCase()})`,
        description: `PDF file missing: ${path.basename(pdfPath)}`,
        language: lang,
      });
      continue;
    }

    if (!hasText) {
      findings.push({
        id: fid(),
        category: "pdf-alignment",
        severity: "info",
        title: `No text file for ${lang.toUpperCase()} PDF`,
        description: "Cannot compare — no extracted text for this language.",
        language: lang,
      });
      continue;
    }

    const extractedText = await getDocumentText(docId, lang);
    if (!extractedText || extractedText.trim().length === 0) continue;

    // Determine sample pages: page 1, middle, near-end
    // We don't know total pages from here, so use a reasonable spread
    const stat = fs.statSync(pdfPath);
    // Rough estimate: 1 page ≈ 50KB for scanned, 5KB for text
    const estimatedPages = Math.max(3, Math.ceil(stat.size / 30000));
    const midPage = Math.floor(estimatedPages / 2);
    const nearEnd = Math.max(2, estimatedPages - 2);
    const samplePages = [0, Math.min(midPage, 50), Math.min(nearEnd, 100)];

    try {
      const ocrResults = await ocrPages(pdfPath, samplePages, tracker);
      const combinedOcr = ocrResults.join("\n");

      if (combinedOcr.trim().length === 0) {
        findings.push({
          id: fid(),
          category: "pdf-alignment",
          severity: "warning",
          title: `OCR returned empty (${lang.toUpperCase()})`,
          description: "Mistral OCR returned no text for sampled pages. PDF may be image-only.",
          language: lang,
        });
        continue;
      }

      const matchRate = calculateMatchRate(combinedOcr, extractedText);

      if (matchRate >= 0.8) {
        findings.push({
          id: fid(),
          category: "pdf-alignment",
          severity: "info",
          title: `PDF matches text (${lang.toUpperCase()})`,
          description: `${Math.round(matchRate * 100)}% phrase match rate across ${samplePages.length} sampled pages.`,
          language: lang,
        });
      } else if (matchRate >= 0.4) {
        findings.push({
          id: fid(),
          category: "pdf-alignment",
          severity: "warning",
          title: `PDF partially matches (${lang.toUpperCase()})`,
          description: `${Math.round(matchRate * 100)}% phrase match rate. Some content may differ from the source PDF.`,
          language: lang,
          action: {
            type: "re-ocr",
            label: "Re-OCR",
            description: "Re-extract text from this PDF to improve accuracy",
          },
        });
      } else {
        findings.push({
          id: fid(),
          category: "pdf-alignment",
          severity: "error",
          title: `PDF mismatch (${lang.toUpperCase()})`,
          description: `Only ${Math.round(matchRate * 100)}% phrase match rate. Extracted text significantly differs from the PDF.`,
          language: lang,
          action: {
            type: "re-ocr",
            label: "Re-OCR",
            description: "Re-extract text from PDF — current extraction is unreliable",
          },
        });
      }
    } catch (err) {
      findings.push({
        id: fid(),
        category: "pdf-alignment",
        severity: "warning",
        title: `OCR check failed (${lang.toUpperCase()})`,
        description: `Could not run PDF alignment check: ${err instanceof Error ? err.message : "Unknown error"}`,
        language: lang,
      });
    }
  }

  return findings;
}
