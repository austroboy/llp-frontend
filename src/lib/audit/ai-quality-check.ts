/**
 * AI quality check — uses Gemini to evaluate
 * translation quality and content coherence.
 *
 * Standard mode: Gemini 2.5 Flash (fast, cheaper)
 * Premium mode:  Gemini 2.5 Pro  (deeper reasoning, more accurate)
 */
import { getBilingualFlags } from "@/lib/registry";
import type { TokenTracker } from "./token-tracker";
import type { AuditFinding, QualityMode } from "./types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const MODELS: Record<QualityMode, string> = {
  standard: "gemini-2.5-flash",
  premium: "gemini-2.5-pro",
};

async function callGemini(
  prompt: string,
  mode: QualityMode,
  responseSchema?: Record<string, unknown>,
  tracker?: TokenTracker
): Promise<string> {
  const model = MODELS[mode];
  const generationConfig: Record<string, unknown> = {
    thinkingConfig: { thinkingBudget: mode === "premium" ? 4096 : 0 },
    maxOutputTokens: mode === "premium" ? 4096 : 2048,
    responseMimeType: "application/json",
  };
  if (responseSchema) {
    generationConfig.responseSchema = responseSchema;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status} (${model})`);
  }

  const data = await res.json();

  // Track token usage
  if (tracker && data.usageMetadata) {
    tracker.add(
      model,
      data.usageMetadata.promptTokenCount || 0,
      data.usageMetadata.candidatesTokenCount || 0
    );
  }

  return (
    data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text)
      .join("") || ""
  );
}

/**
 * Extract a sample at a given relative position (0-1) in the text.
 */
function sampleAt(text: string, position: number, size: number = 800): string {
  const start = Math.floor(text.length * position);
  return text.slice(start, start + size).trim();
}

/**
 * Extract 3 paired samples from original and translated text at the
 * same relative positions (start, middle, end). This ensures Gemini
 * compares corresponding passages, not unrelated content.
 */
function samplePaired(original: string, translated: string, size: number = 800) {
  const positions = [0.05, 0.45, 0.85]; // start, middle, near-end
  return positions.map((pos) => ({
    original: sampleAt(original, pos, size),
    translated: sampleAt(translated, pos, size),
  }));
}

// ── Translation quality check ────────────────────────────────────────

async function checkTranslationQuality(
  originalText: string,
  translatedText: string,
  direction: string,
  mode: QualityMode,
  tracker?: TokenTracker
): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const paired = samplePaired(originalText, translatedText);

  const prompt = `You are a legal translation quality evaluator for Bangladesh Labour Law documents.

Below are 3 paired samples from corresponding positions in the original and translated documents. Evaluate the translation quality:
1. accuracy (0-10): Does the translation convey the same legal meaning?
2. completeness (0-10): Are all clauses, subsections, and definitions translated?
3. legalPrecision (0-10): Are legal terms translated correctly (e.g., "ধারা" = "Section", "বিধি" = "Rule")?

${paired.map((p, i) => `--- Pair ${i + 1} ---\nORIGINAL:\n${p.original}\n\nTRANSLATED:\n${p.translated}`).join("\n\n")}

Respond in JSON format:
{
  "accuracy": <number>,
  "completeness": <number>,
  "legalPrecision": <number>,
  "overallScore": <number>,
  "issues": ["<issue description>", ...]
}`;

  const lang = direction.includes("EN") ? "en" as const : "bn" as const;

  const translationSchema = {
    type: "OBJECT",
    properties: {
      accuracy: { type: "NUMBER" },
      completeness: { type: "NUMBER" },
      legalPrecision: { type: "NUMBER" },
      overallScore: { type: "NUMBER" },
      issues: { type: "ARRAY", items: { type: "STRING" } },
    },
    required: ["accuracy", "completeness", "legalPrecision", "overallScore", "issues"],
  };

  try {
    const response = await callGemini(prompt, mode, translationSchema, tracker);
    const result = JSON.parse(response);

    // Robust extraction — handle snake_case or camelCase variants
    const accuracy = Number(result.accuracy ?? result.Accuracy ?? 0);
    const completeness = Number(result.completeness ?? result.Completeness ?? 0);
    const legalPrecision = Number(result.legalPrecision ?? result.legal_precision ?? result.LegalPrecision ?? 0);
    const overall = Number(result.overallScore ?? result.overall_score ?? result.OverallScore ?? 0)
      || Math.round((accuracy + completeness + legalPrecision) / 3);
    const issues: string[] = Array.isArray(result.issues) ? result.issues : [];

    const desc = `Score: ${overall}/10. Accuracy: ${accuracy}/10, Completeness: ${completeness}/10, Legal precision: ${legalPrecision}/10.`;

    if (overall >= 8) {
      findings.push({
        id: `ai-trans-${lang}`,
        category: "translation",
        severity: "info",
        title: `Good translation quality (${direction})`,
        description: desc,
        language: lang,
      });
    } else if (overall >= 5) {
      findings.push({
        id: `ai-trans-${lang}`,
        category: "translation",
        severity: "warning",
        title: `Moderate translation quality (${direction})`,
        description: desc,
        language: lang,
        action: {
          type: "re-translate",
          label: "Re-translate",
          description: "Re-run translation with improved prompts",
        },
        details: issues.length > 0 ? issues.join("\n") : undefined,
      });
    } else {
      findings.push({
        id: `ai-trans-${lang}`,
        category: "translation",
        severity: "error",
        title: `Poor translation quality (${direction})`,
        description: desc,
        language: lang,
        action: {
          type: "re-translate",
          label: "Re-translate",
          description: "Translation is unreliable — needs re-doing",
        },
        details: issues.length > 0 ? issues.join("\n") : undefined,
      });
    }
  } catch (err) {
    findings.push({
      id: `ai-trans-err-${lang}`,
      category: "translation",
      severity: "warning",
      title: "Translation check failed",
      description: `Could not evaluate translation: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
  }

  return findings;
}

// ── Content coherence check ──────────────────────────────────────────

async function checkContentCoherence(
  text: string,
  lang: "en" | "bn",
  mode: QualityMode,
  tracker?: TokenTracker
): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  const first2000 = text.slice(0, 2000);
  const last1000 = text.slice(-1000);

  const prompt = `You are a document quality evaluator for Bangladesh Labour Law legal texts.

Analyze this text for quality issues:

--- START OF DOCUMENT (first 2000 chars) ---
${first2000}

--- END OF DOCUMENT (last 1000 chars) ---
${last1000}

Check for:
1. aiPreamble: Does it start with AI-generated commentary instead of legal text? (true/false)
2. properEnding: Does it end with actual legal content (not mid-sentence or AI commentary)? (true/false)
3. garbledText: Is there garbled/mojibake text? (true/false)
4. ocrArtifacts: Are there OCR artifacts like misread characters? (true/false)
5. structuralIntegrity: Does it have proper legal document structure (sections, chapters)? (true/false)

Respond in JSON:
{
  "aiPreamble": <boolean>,
  "properEnding": <boolean>,
  "garbledText": <boolean>,
  "ocrArtifacts": <boolean>,
  "structuralIntegrity": <boolean>,
  "recommendations": ["<recommendation>", ...]
}`;

  const coherenceSchema = {
    type: "OBJECT",
    properties: {
      aiPreamble: { type: "BOOLEAN" },
      properEnding: { type: "BOOLEAN" },
      garbledText: { type: "BOOLEAN" },
      ocrArtifacts: { type: "BOOLEAN" },
      structuralIntegrity: { type: "BOOLEAN" },
      recommendations: { type: "ARRAY", items: { type: "STRING" } },
    },
    required: ["aiPreamble", "properEnding", "garbledText", "ocrArtifacts", "structuralIntegrity", "recommendations"],
  };

  try {
    const response = await callGemini(prompt, mode, coherenceSchema, tracker);
    const result = JSON.parse(response);

    if (result.aiPreamble) {
      findings.push({
        id: `ai-coh-preamble-${lang}`,
        category: "coherence",
        severity: "warning",
        title: "AI preamble detected (AI check)",
        description: "Gemini detected AI-generated commentary at the start of the document.",
        language: lang,
        action: {
          type: "clean-preamble",
          label: "Clean",
          description: "Remove AI commentary from the beginning",
        },
        location: { position: "start" },
      });
    }

    if (!result.properEnding) {
      // Grab last ~120 chars as a snippet for scroll-to
      const endSnippet = text.trim().slice(-120).trim();
      findings.push({
        id: `ai-coh-ending-${lang}`,
        category: "coherence",
        severity: "warning",
        title: "Improper document ending",
        description: "Document appears to end mid-sentence or with non-legal content.",
        language: lang,
        action: {
          type: "ai-fix",
          label: "Fix ending",
          description: "Use AI to clean up the document ending",
          command: "Fix the document ending: if it ends mid-sentence, remove the incomplete fragment. Remove any trailing AI commentary, page numbers, or non-legal content after the last substantive legal provision. The document should end cleanly after the final legal section or schedule.",
        },
        location: { position: "end", snippet: endSnippet },
      });
    }

    if (result.ocrArtifacts) {
      findings.push({
        id: `ai-coh-ocr-${lang}`,
        category: "coherence",
        severity: "warning",
        title: "OCR artifacts detected",
        description: "AI detected misread characters or OCR errors in the text.",
        language: lang,
        action: {
          type: "ai-fix",
          label: "Fix OCR",
          description: "Use AI to fix OCR artifacts in the text",
          command: "Fix OCR artifacts: merge words broken across lines (hyphenated line breaks), merge orphaned short lines that are clearly part of the previous paragraph, and fix common OCR typos.",
        },
      });
    }

    if (!result.structuralIntegrity) {
      findings.push({
        id: `ai-coh-structure-${lang}`,
        category: "coherence",
        severity: "warning",
        title: "Structural issues",
        description: "Document lacks expected legal structure (chapters/sections).",
        language: lang,
        action: {
          type: "manual-review",
          label: "Review structure",
          description: "Verify document structure against the PDF",
        },
        location: { position: "start" },
      });
    }

    if (result.recommendations?.length > 0) {
      findings.push({
        id: `ai-coh-recs-${lang}`,
        category: "coherence",
        severity: "info",
        title: "AI recommendations",
        description: "Additional observations from AI analysis.",
        language: lang,
        details: result.recommendations.join("\n"),
      });
    }
  } catch (err) {
    findings.push({
      id: `ai-coh-err-${lang}`,
      category: "coherence",
      severity: "warning",
      title: "Coherence check failed",
      description: `Could not evaluate coherence: ${err instanceof Error ? err.message : "Unknown error"}`,
      language: lang,
    });
  }

  return findings;
}

// ── Main runner ─────────────────────────────────────────────────────

export async function runAIQualityCheck(
  docId: string,
  enText: string | null,
  bnText: string | null,
  mode: QualityMode = "standard",
  tracker?: TokenTracker
): Promise<AuditFinding[]> {
  if (!GEMINI_API_KEY) {
    return [{
      id: "ai-no-key",
      category: "ai-quality",
      severity: "warning",
      title: "AI check skipped",
      description: "GEMINI_API_KEY not configured.",
    }];
  }

  const modelLabel = mode === "premium" ? "Gemini 2.5 Pro" : "Gemini 2.5 Flash";
  const findings: AuditFinding[] = [];
  const flags = await getBilingualFlags(docId);

  // Translation quality (only for AI-translated docs)
  if (flags.enTranslated && enText && bnText) {
    const translationFindings = await checkTranslationQuality(bnText, enText, "BN→EN", mode, tracker);
    findings.push(...translationFindings);
  }
  if (flags.bnTranslated && bnText && enText) {
    const translationFindings = await checkTranslationQuality(enText, bnText, "EN→BN", mode, tracker);
    findings.push(...translationFindings);
  }

  // Content coherence (always runs on available text)
  if (enText) {
    const enFindings = await checkContentCoherence(enText, "en", mode, tracker);
    findings.push(...enFindings);
  }
  if (bnText) {
    const bnFindings = await checkContentCoherence(bnText, "bn", mode, tracker);
    findings.push(...bnFindings);
  }

  // Tag all findings with the model used
  for (const f of findings) {
    f.description = `[${modelLabel}] ${f.description}`;
  }

  return findings;
}
