// AI draft engine for post-chat legal document generation.
// Takes a doc type + user form inputs + cited sections + perspective,
// calls Gemini 2.5 Flash, and returns a drafted document body ready for
// PDF rendering.
//
// This module is pure (no Supabase / Clerk). It only depends on fetch +
// the GEMINI_API_KEY env var. Errors from the Gemini API are surfaced
// as warnings — never thrown.

import { DOC_CATALOG } from "./catalog";
import { getRequiredFields } from "./input-schema";
import type { DocType, Language, Perspective } from "./types";

// ── Types ────────────────────────────────────────────────────────

export interface CitedSection {
  section: string;
  content: string;
  document_id: string;
  document_title: string;
}

export interface GenerateDocumentParams {
  docType: DocType;
  userInputs: Record<string, string>;
  citedSections: CitedSection[];
  perspective: Perspective;
  language: Language;
  chatQuery?: string;
  chatAnswer?: string;
}

export interface GenerateDocumentResult {
  draftText: string;
  sectionCitations: string[];
  warnings: string[];
  tokensUsed: { in: number; out: number };
}

// ── Config ───────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = (model: string, key: string): string =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

// Section citation regex — matches "Section 26", "Section 332A",
// "Section 26(1)", "Section 2(9b)". Case-insensitive.
const SECTION_CITATION_RE = /Section\s+\d+[A-Za-z]?(?:\([^)]+\))?/gi;

// ── Perspective tone guidance ────────────────────────────────────

const PERSPECTIVE_TONE: Record<Perspective, string> = {
  employer:
    "Formal and procedural. Use authoritative third-person phrasing such as \"The Company hereby notifies...\" or \"You are hereby directed to...\". Maintain a neutral corporate register; do not threaten, but cite statutory consequences where relevant.",
  worker:
    "Respectful but assertive first-person phrasing such as \"I hereby submit...\" or \"I respectfully request...\". Preserve the worker's dignity and clearly assert statutory entitlements without hostility.",
  hr:
    "Neutral, procedural HR-administrator voice. Focus on documenting facts, policies, and statutory compliance steps. Avoid taking sides.",
  neutral:
    "Informational, neutral register. Describe obligations and rights impartially without advocating for either party.",
};

// ── Prompt builder ───────────────────────────────────────────────

export interface BuildPromptParams {
  docType: DocType;
  userInputs: Record<string, string>;
  citedSections: CitedSection[];
  perspective: Perspective;
  language: Language;
  chatQuery?: string;
  chatAnswer?: string;
}

/**
 * Assemble the Gemini prompt for a single document draft.
 * Exported so tests / devs can inspect prompts without calling the API.
 */
export function buildPrompt(params: BuildPromptParams): string {
  const {
    docType,
    userInputs,
    citedSections,
    perspective,
    language,
    chatQuery,
    chatAnswer,
  } = params;

  const meta = DOC_CATALOG[docType];
  const langLabel =
    language === "bn"
      ? "Bangla (keep technical legal terms in English inside parentheses, e.g. \"চাকরিচ্যুতি (termination)\")"
      : "English";

  const tone = PERSPECTIVE_TONE[perspective];

  const inputsBlock = Object.entries(userInputs)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const citationsBlock = citedSections.length
    ? citedSections
        .map(
          (c, i) =>
            `[${i + 1}] ${c.section} — ${c.document_title} (${c.document_id})\n"""\n${c.content.trim()}\n"""`
        )
        .join("\n\n")
    : "(no cited sections supplied — draft must request one before issuing)";

  const chatContextBlock =
    chatQuery || chatAnswer
      ? `\n## Chat context (for your awareness only, do NOT quote verbatim)\n${chatQuery ? `User question: ${chatQuery}` : ""}\n${chatAnswer ? `Chat answer shown to user: ${chatAnswer}` : ""}\n`
      : "";

  const disclaimerLine =
    language === "bn"
      ? "This is an AI-assisted draft. Verify with a qualified labour lawyer before signing or serving."
      : "This is an AI-assisted draft. Verify with a qualified labour lawyer before signing or serving.";

  return `You are drafting a ${meta.label} for a ${perspective} under Bangladesh labour law.

## Tone and voice
${tone}

## Output language
${langLabel}. Draft the entire document in this language.

## Document type description
${meta.description}

## User-provided facts
${inputsBlock || "(no user inputs provided)"}
${chatContextBlock}
## Cited statutory sections (use ONLY these — do not invent section numbers)
${citationsBlock}

## Drafting requirements
1. Produce a complete, ready-to-serve ${meta.label} that uses the user-provided facts exactly as given.
2. Every legal claim, obligation, or entitlement MUST be cited inline in the form "(Section X, [Act Name])" using ONLY sections from the list above. If a required point cannot be cited from the list, omit it rather than fabricate a citation.
3. Do NOT invent section numbers, clause letters, or sub-clauses that are not present in the cited statutory sections block.
4. Use the perspective tone described above consistently.
5. Open with an appropriate header (recipient, sender, subject line, date).
6. Close with a signature block suitable for the perspective.
7. After the signature block, include a clearly-labelled section titled "Statutory basis" that lists every section cited in the draft in bulleted form, each with its parent Act.
8. The final line of the document must be exactly: "${disclaimerLine}"
9. Output plain text only — no JSON, no markdown code fences. Headings may use simple Markdown (## Heading) for structure.

Begin the draft now.`;
}

// ── Gemini call ──────────────────────────────────────────────────

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
  error?: { message?: string };
}

async function callGemini(
  prompt: string,
  apiKey: string
): Promise<{ text: string; tokensIn: number; tokensOut: number; error?: string }> {
  try {
    const res = await fetch(GEMINI_URL(GEMINI_MODEL, apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "text/plain",
          temperature: 0.3,
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingBudget: 0 },
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        text: "",
        tokensIn: 0,
        tokensOut: 0,
        error: `Gemini API error ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as GeminiResponse;
    if (data.error?.message) {
      return {
        text: "",
        tokensIn: 0,
        tokensOut: 0,
        error: `Gemini API error: ${data.error.message}`,
      };
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("") ?? "";

    const usage = data.usageMetadata ?? {};
    return {
      text,
      tokensIn: usage.promptTokenCount ?? 0,
      tokensOut: usage.candidatesTokenCount ?? 0,
    };
  } catch (err) {
    return {
      text: "",
      tokensIn: 0,
      tokensOut: 0,
      error: err instanceof Error ? err.message : "Unknown Gemini call failure",
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function extractSectionCitations(draft: string): string[] {
  const matches = draft.match(SECTION_CITATION_RE) ?? [];
  const normalized = matches.map((m) =>
    m.replace(/\s+/g, " ").replace(/^section/i, "Section").trim()
  );
  return Array.from(new Set(normalized));
}

function missingRequiredFields(
  docType: DocType,
  userInputs: Record<string, string>
): string[] {
  return getRequiredFields(docType).filter((k) => {
    const v = userInputs[k];
    return v === undefined || v === null || String(v).trim() === "";
  });
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Generate a drafted legal document using Gemini 2.5 Flash.
 * Errors from the model are returned as warnings and produce an empty
 * draftText — callers should inspect `warnings` before rendering.
 */
export async function generateDocument(
  params: GenerateDocumentParams
): Promise<GenerateDocumentResult> {
  const warnings: string[] = [];

  // Validate doc type
  const meta = DOC_CATALOG[params.docType];
  if (!meta) {
    warnings.push(`Unknown docType: ${params.docType}`);
    return {
      draftText: "",
      sectionCitations: [],
      warnings,
      tokensUsed: { in: 0, out: 0 },
    };
  }

  // Validate required inputs
  const missing = missingRequiredFields(params.docType, params.userInputs);
  for (const key of missing) {
    warnings.push(`userInput missing field ${key}`);
  }

  // Soft-warn if no citations — draft still builds but flags it
  if (!params.citedSections.length) {
    warnings.push(
      "No cited sections supplied — draft will include a request for legal review before use."
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    warnings.push("GEMINI_API_KEY is not configured on the server.");
    return {
      draftText: "",
      sectionCitations: [],
      warnings,
      tokensUsed: { in: 0, out: 0 },
    };
  }

  const prompt = buildPrompt(params);
  const { text, tokensIn, tokensOut, error } = await callGemini(prompt, apiKey);

  if (error) {
    warnings.push(error);
    return {
      draftText: "",
      sectionCitations: [],
      warnings,
      tokensUsed: { in: tokensIn, out: tokensOut },
    };
  }

  if (!text.trim()) {
    warnings.push("Gemini returned an empty draft.");
    return {
      draftText: "",
      sectionCitations: [],
      warnings,
      tokensUsed: { in: tokensIn, out: tokensOut },
    };
  }

  const sectionCitations = extractSectionCitations(text);

  return {
    draftText: text.trim(),
    sectionCitations,
    warnings,
    tokensUsed: { in: tokensIn, out: tokensOut },
  };
}

export default generateDocument;
