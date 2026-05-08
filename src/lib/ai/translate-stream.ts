import { getLanguage, isSupportedLanguage } from "@/lib/languages";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const TRANSLATE_TIMEOUT_MS = 15_000;

interface TranslateOpts {
  /** Target language code — must be in CHAT_LANGUAGES. */
  language: string;
  /** Signal used to cancel the translation request. */
  signal?: AbortSignal;
}

/**
 * Translate a text block to the target language via Gemini 2.5 Flash.
 *
 * For multi-paragraph input (contains `\n\n`) without fenced code blocks,
 * splits on paragraph boundaries and translates each in parallel, then
 * rejoins with `\n\n`. This immunizes the result against Gemini's tendency
 * to collapse blank lines in long outputs — without that, translated chat
 * responses came back as a single wall of text with literal `**` markers
 * visible because the markdown parser had no paragraph breaks to anchor on.
 *
 * Returns the translated string, or the original if target === 'en' or
 * translation fails (so legal accuracy is never silently lost — English
 * source is always visible to the user as a last resort).
 *
 * Caller is responsible for caching — this fn performs no DB lookup. The
 * prompt preserves section numbers (Section 26, ধারা ২৬), English legal
 * terms without standard translation, and markdown formatting.
 */
export async function translateChunk(
  text: string,
  { language, signal }: TranslateOpts,
): Promise<string> {
  if (!text.trim()) return text;
  if (language === "en") return text;
  if (!isSupportedLanguage(language)) return text;

  // Paragraph-by-paragraph translation when safe (no fenced code blocks).
  // A fence spans paragraph boundaries, so naive splitting would corrupt it.
  const hasFences = text.includes("```");
  if (!hasFences && /\n\s*\n/.test(text)) {
    const paragraphs = text.split(/\n\s*\n/);
    const translated = await Promise.all(
      paragraphs.map((p) => translateSingleBlock(p, { language, signal })),
    );
    return translated.join("\n\n");
  }

  return translateSingleBlock(text, { language, signal });
}

async function translateSingleBlock(
  text: string,
  { language, signal }: TranslateOpts,
): Promise<string> {
  if (!text.trim()) return text;

  const lang = getLanguage(language);

  const prompt = `Translate the following Bangladesh labour law response to ${lang.geminiName}.
Preserve all section numbers (e.g., Section 26, ধারা ২৬) in both English and target language.
Preserve legal terms in English where no standard translation exists.
Preserve markdown formatting (bold, headers, lists, tables, code blocks).
Preserve ALL line breaks exactly — every newline in the input must remain a newline in the output. Do not merge lines or paragraphs.
Do NOT add or remove any legal content — translate exactly.
Output only the translated text — no preamble, no explanation.

Text to translate:
${text}`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: signal ?? AbortSignal.timeout(TRANSLATE_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`[translate] Gemini error ${res.status} — falling back to English`);
      return text;
    }

    const data = await res.json();
    const parts = (data.candidates?.[0]?.content?.parts ?? []) as Array<{ text?: string }>;
    const translated = parts.map((p) => p.text || "").join("");
    return translated.trim() || text;
  } catch (err) {
    console.warn(
      "[translate] failed — falling back to English:",
      err instanceof Error ? err.message : err,
    );
    return text;
  }
}
