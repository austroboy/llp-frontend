/**
 * Shared translation module for document text translation.
 *
 * Supports two quality modes:
 *  - standard: Mistral Large (lower cost)
 *  - premium:  Claude Opus 4  (higher accuracy)
 *
 * Used by the fix endpoint's re-translate action and available for
 * any future translation needs (e.g. batch pipelines, CLI scripts).
 */

import type { QualityMode } from "./types";
import type { TokenTracker } from "./token-tracker";

// ── Progress callback type ──────────────────────────────────────────

export interface TranslateProgress {
  type: "progress" | "result" | "error";
  message?: string;
  step?: number;
  total?: number;
  text?: string;
}

// ── Text splitting ──────────────────────────────────────────────────

/**
 * Split text into chunks on paragraph boundaries so each chunk stays
 * below `maxSize` characters.
 */
export function splitIntoChunks(text: string, maxSize: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxSize && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += para + "\n\n";
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ── Helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getMistralApiKey(): string {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) {
    throw new Error("MISTRAL_API_KEY not configured");
  }
  return key;
}

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY not configured — required for premium translation");
  }
  return key;
}

// ── Mistral Large translation ───────────────────────────────────────

async function translateChunkBnToEn(
  text: string,
  docTitle: string,
  tracker?: TokenTracker
): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getMistralApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      temperature: 0,
      max_tokens: 16384,
      messages: [
        {
          role: "system",
          content: `You are a legal translator specializing in Bangladesh labour law. Translate the following Bangla (Bengali) legal text into English accurately.

RULES:
- Translate ACCURATELY — preserve all legal meaning, section numbers, clause references, and dates.
- Keep section numbering format (e.g., "ধারা ১" → "Section 1", "বিধি ৭" → "Rule 7").
- Preserve the structure: paragraphs, sub-clauses (ক), (খ), (গ) → (a), (b), (c).
- Use standard Bangladesh legal English terminology.
- Keep proper nouns and names as-is (transliterate if needed).
- Do NOT add commentary, notes, or explanations.
- Do NOT include the original Bangla text.
- Skip gazette headers, page numbers, footers, and price markings.
- Output ONLY the translated English text.`,
        },
        {
          role: "user",
          content: `Translate this section of "${docTitle}" from Bangla to English:\n\n${text}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Mistral API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  if (tracker && data.usage) {
    tracker.add("mistral-large-latest", data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0);
  }
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function translateChunkEnToBn(
  text: string,
  docTitle: string,
  tracker?: TokenTracker
): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getMistralApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      temperature: 0,
      max_tokens: 16384,
      messages: [
        {
          role: "system",
          content: `You are a legal translator specializing in Bangladesh labour law. Translate the following English legal text into Bangla (Bengali) accurately.

RULES:
- Translate ACCURATELY — preserve all legal meaning, section numbers, clause references, and dates.
- Keep section numbering in Bangla numerals (e.g., "Section 1" → "ধারা ১", "Section 28" → "ধারা ২৮").
- Convert clause letters: (a), (b), (c) → (ক), (খ), (গ), (ঘ), (ঙ), (চ), (ছ), (জ), (ঝ), etc.
- Convert chapter numbering: "CHAPTER I" → "প্রথম অধ্যায়", "CHAPTER II" → "দ্বিতীয় অধ্যায়", etc.
- Use standard Bangladesh legal Bangla terminology and official gazette style.
- Keep proper nouns, organization names, and English legal terms that are commonly used as-is in Bangla legal texts.
- Preserve paragraph structure with blank lines between sections.
- Do NOT add commentary, notes, or explanations.
- Do NOT include the original English text.
- Output ONLY the translated Bangla text.`,
        },
        {
          role: "user",
          content: `Translate this section of "${docTitle}" from English to Bangla:\n\n${text}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Mistral API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  if (tracker && data.usage) {
    tracker.add("mistral-large-latest", data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0);
  }
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ── Claude Opus 4 (premium) translation ─────────────────────────────

const LEGAL_BN_TO_EN_SYSTEM = `You are an expert legal translator specializing in Bangladesh labour law. Translate the following Bangla (Bengali) legal text into English with maximum accuracy.

RULES:
- Translate with ABSOLUTE PRECISION — every legal term, section number, clause reference, date, and defined term must be exact.
- Keep section numbering format (e.g., "ধারা ১" → "Section 1", "বিধি ৭" → "Rule 7").
- Preserve the structure: paragraphs, sub-clauses (ক), (খ), (গ) → (a), (b), (c).
- Use standard Bangladesh legal English terminology consistent with the official gazette.
- Keep proper nouns and names as-is (transliterate if needed).
- Do NOT add commentary, notes, or explanations.
- Do NOT include the original Bangla text.
- Skip gazette headers, page numbers, footers, and price markings.
- Output ONLY the translated English text.`;

const LEGAL_EN_TO_BN_SYSTEM = `You are an expert legal translator specializing in Bangladesh labour law. Translate the following English legal text into Bangla (Bengali) with maximum accuracy.

RULES:
- Translate with ABSOLUTE PRECISION — every legal term, section number, clause reference, date, and defined term must be exact.
- Keep section numbering in Bangla numerals (e.g., "Section 1" → "ধারা ১", "Section 28" → "ধারা ২৮").
- Convert clause letters: (a), (b), (c) → (ক), (খ), (গ), (ঘ), (ঙ), (চ), (ছ), (জ), (ঝ), etc.
- Convert chapter numbering: "CHAPTER I" → "প্রথম অধ্যায়", "CHAPTER II" → "দ্বিতীয় অধ্যায়", etc.
- Use standard Bangladesh legal Bangla terminology and official gazette style.
- Keep proper nouns, organization names, and English legal terms commonly used in Bangla legal texts.
- Preserve paragraph structure with blank lines between sections.
- Do NOT add commentary, notes, or explanations.
- Do NOT include the original English text.
- Output ONLY the translated Bangla text.`;

async function translateChunkClaude(
  text: string,
  docTitle: string,
  direction: "bn-to-en" | "en-to-bn",
  tracker?: TokenTracker
): Promise<string> {
  const apiKey = getAnthropicApiKey();

  const systemPrompt = direction === "bn-to-en" ? LEGAL_BN_TO_EN_SYSTEM : LEGAL_EN_TO_BN_SYSTEM;
  const fromLang = direction === "bn-to-en" ? "Bangla" : "English";
  const toLang = direction === "bn-to-en" ? "English" : "Bangla";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 16384,
      temperature: 0,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Translate this section of "${docTitle}" from ${fromLang} to ${toLang}:\n\n${text}`,
      }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  if (tracker && data.usage) {
    tracker.add("claude-opus-4-6", data.usage.input_tokens || 0, data.usage.output_tokens || 0);
  }
  return data.content?.[0]?.text?.trim() || "";
}

// ── Main entry point ────────────────────────────────────────────────

/**
 * Translate `text` from one language to another using the specified
 * quality mode. Reports progress via `onProgress` callback.
 *
 * @returns The full translated text.
 */
export async function runTranslation(
  text: string,
  fromLang: "en" | "bn",
  qualityMode: QualityMode,
  onProgress: (event: TranslateProgress) => void,
  options?: {
    docTitle?: string;
    tracker?: TokenTracker;
  }
): Promise<string> {
  const isPremium = qualityMode === "premium";
  const modelLabel = isPremium ? "Claude Opus 4" : "Mistral Large";
  const chunkSize = isPremium ? 6000 : 8000;
  const direction: "bn-to-en" | "en-to-bn" = fromLang === "bn" ? "bn-to-en" : "en-to-bn";
  const docTitle = options?.docTitle || "Document";
  const tracker = options?.tracker;

  const chunks = splitIntoChunks(text, chunkSize);

  onProgress({
    type: "progress",
    message: `Translating ${chunks.length} chunks via ${modelLabel}...`,
    total: chunks.length,
  });

  const translatedParts: string[] = [];
  let failed = 0;

  for (let i = 0; i < chunks.length; i++) {
    onProgress({
      type: "progress",
      message: `[${modelLabel}] Translating chunk ${i + 1}/${chunks.length}...`,
      step: i + 1,
      total: chunks.length,
    });

    try {
      let translated: string;
      if (isPremium) {
        translated = await translateChunkClaude(chunks[i], docTitle, direction, tracker);
      } else {
        translated =
          direction === "bn-to-en"
            ? await translateChunkBnToEn(chunks[i], docTitle, tracker)
            : await translateChunkEnToBn(chunks[i], docTitle, tracker);
      }
      translatedParts.push(translated);
    } catch {
      failed++;
      const marker =
        direction === "bn-to-en"
          ? `[TRANSLATION FAILED FOR CHUNK ${i + 1}]`
          : `[অনুবাদ ব্যর্থ — CHUNK ${i + 1}]`;
      translatedParts.push(`\n${marker}\n`);

      onProgress({
        type: "error",
        message: `Chunk ${i + 1} failed, inserted placeholder.`,
      });
    }

    // Rate limiting delay between chunks
    if (i < chunks.length - 1) await sleep(isPremium ? 500 : 1000);
  }

  const fullTranslation = translatedParts.join("\n\n");

  onProgress({
    type: "result",
    message: `Translation complete via ${modelLabel} (${direction}): ${fullTranslation.length} chars, ${chunks.length - failed}/${chunks.length} chunks succeeded.`,
    text: fullTranslation,
  });

  return fullTranslation;
}
