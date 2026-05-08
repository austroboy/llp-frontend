import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase";
import { getLanguage, isSupportedLanguage } from "@/lib/languages";

// Follow-up question chip generator.
// Uses Gemini 2.5 Flash directly (JSON mode) to produce 3-5 short suggested
// follow-up questions grounded in the prior Q/A and cited sections.
//
// Chips are an enhancement, not core — on any failure we return [] (never 500).

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Use the dedicated AI Studio billing key when available — keeps pill-chip
// generation on Gemini 3 Flash (same key as chat-proxy's turn-1 fallback #2)
// without colliding with the embedding pool.
const GEMINI_API_KEY =
  process.env.GEMINI_AI_STUDIO_KEY || process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_TIMEOUT_MS = 12_000;

// OpenRouter backup — if Gemini fails/times out, try a cheap fast model.
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_BACKUP_MODEL = "openai/gpt-oss-20b:free";

interface CitationInput {
  section: string;
  document?: string;
}

interface RequestBody {
  question?: unknown;
  answer?: unknown;
  citations?: unknown;
  language?: unknown;
  /** `followup` (default) — short pill-chip questions for turn-2+ drilldown.
   *  `usecase` — turn-1 use-case cards: {title, role, blurb, scenario_query}. */
  mode?: unknown;
  /** Optional. When provided with a matching `conversation_id` owned by
   *  the caller, the server caches the generated followups on the
   *  `messages.followups` column and short-circuits on subsequent calls
   *  so history-switching doesn't regenerate a different list. */
  message_id?: unknown;
  conversation_id?: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface UseCaseCard {
  title: string;
  role: string;
  blurb: string;
  scenario_query: string;
}

function isCitation(v: unknown): v is CitationInput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.section === "string";
}

/** Extract the first valid [...] array substring from a string. */
function extractJsonArray(raw: string): unknown[] | null {
  const unfenced = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*$/g, "");

  try {
    const parsed = JSON.parse(unfenced.trim());
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.followups)) return obj.followups;
      if (Array.isArray(obj.questions)) return obj.questions;
    }
  } catch {
    // fall through to substring extraction
  }

  const match = unfenced.match(/\[[\s\S]*?\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return null;
  }
  return null;
}

function buildPrompt(
  question: string,
  answer: string,
  citations: CitationInput[],
  language: string,
  mode: "followup" | "usecase" = "followup"
): string {
  const trimmedAnswer =
    answer.length > 1800 ? answer.slice(0, 1800) + "..." : answer;
  const citedLines =
    citations.length > 0
      ? citations
          .slice(0, 8)
          .map(
            (c) =>
              `- ${c.section}${c.document ? ` (${c.document})` : ""}`
          )
          .join("\n")
      : "(no explicit citations)";

  // Gemini needs a concrete language name, not a code. Look up via
  // CHAT_LANGUAGES registry so the same list as the chat picker drives
  // the followup-chip output. Unknown codes fall back to English.
  const geminiLangName = getLanguage(language).geminiName;
  const langDirective = `Write each follow-up question in ${geminiLangName}.`;

  if (mode === "usecase") {
    const langForCards = `Write title, role, blurb, and scenario_query in ${geminiLangName}.`;
    return `You classify turn-1 answers into 3-4 use-case cards for a Bangladesh labour-law app.

The user asked a broad question. The assistant answered with citations spanning multiple scenarios. Your job: propose 3-4 distinct USE-CASE framings a real user might want, each grounded in the cited sections.

User's question:
${question}

Assistant's answer:
${trimmedAnswer}

Cited sections:
${citedLines}

For EACH card return an object:
- title: 2-4 word label ("I was terminated", "Drafting SOP", etc.)
- role: who this applies to — worker / employer / HR / inspector / lawyer / general
- blurb: 8-14 words explaining what the card covers
- scenario_query: a refined natural-language question that re-asks the broader question narrowed to this scenario, naming 1-2 cited section numbers. 15-30 words. Phrased in first-person voice.

Cards must be MUTUALLY DISTINCT (different roles or sharply different goals). Do NOT repeat the original question. ${langForCards}

Return STRICT JSON: a raw array of objects like:
[{"title":"...", "role":"...", "blurb":"...", "scenario_query":"..."}]
No markdown. No text before or after the array.`;
  }

  return `You generate follow-up question chips for a Bangladesh labour-law Q&A app.

User's prior question:
${question}

Assistant's answer:
${trimmedAnswer}

Cited sections:
${citedLines}

Task: propose 3-5 short, specific follow-up questions a Bangladesh labour-law user would naturally ask next. Questions should dig into the cited sections, edge cases, procedure, or related amendments. Each question <= 90 chars. ${langDirective}

Return STRICT JSON: a raw array of strings.
Example: ["Question 1?", "Question 2?", "Question 3?"]`;
}

async function callGeminiFlash(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.warn("[followup] GEMINI_API_KEY missing");
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 400,
            responseMimeType: "application/json",
            // thinkingBudget:0 stops Gemini 3 Flash's default reasoning
            // phase — chips/cards are a labeling task, no inference needed.
            // Without this, the model burns the whole token budget thinking
            // and returns empty content.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      console.warn(`[followup] Gemini HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch (err) {
    console.warn("[followup] Gemini call failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** OpenRouter backup — used when Gemini fails or returns unparseable
 *  output twice in a row. Single cheap model, non-streaming, JSON-only. */
async function callOpenRouterBackup(prompt: string): Promise<string | null> {
  if (!OPENROUTER_KEY) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: OPENROUTER_BACKUP_MODEL,
        temperature: 0.4,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Return ONLY a raw JSON array of strings. No prose, no markdown.",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[followup] OpenRouter backup HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : null;
  } catch (err) {
    console.warn("[followup] OpenRouter backup failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  // ── 1. Auth (Clerk) ─────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // ── 2. Parse & validate body ────────────────────────────────────
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ followups: [] });
  }

  const {
    question,
    answer,
    citations,
    language,
    mode: rawMode,
    message_id: rawMessageId,
    conversation_id: rawConversationId,
  } = body;

  const messageId =
    typeof rawMessageId === "string" && UUID_RE.test(rawMessageId)
      ? rawMessageId
      : null;
  const conversationId =
    typeof rawConversationId === "string" && UUID_RE.test(rawConversationId)
      ? rawConversationId
      : null;

  if (typeof question !== "string" || typeof answer !== "string") {
    return NextResponse.json({ followups: [] });
  }
  if (question.trim().length === 0 || answer.trim().length < 50) {
    return NextResponse.json({ followups: [] });
  }
  // Accept any CHAT_LANGUAGES code (en|bn|hi|zh|ko|ja|ar|ur|ms). Unknown
  // values collapse to English via getLanguage()'s fallback.
  const lang: string =
    typeof language === "string" && isSupportedLanguage(language)
      ? language
      : "en";
  const mode: "followup" | "usecase" =
    rawMode === "usecase" ? "usecase" : "followup";
  const typedCitations: CitationInput[] = Array.isArray(citations)
    ? citations.filter(isCitation)
    : [];

  // ── 2b. Cache short-circuit — only for persisted followup chips. ─
  // Use-case cards (turn-1) are regenerated; they live in chat-store
  // state + on the `messages.clarify_*` columns already, not here.
  const supabase =
    mode === "followup" && messageId && conversationId
      ? createServerClient()
      : null;

  if (supabase && messageId && conversationId) {
    const { data: existing } = await supabase
      .from("messages")
      .select("id, followups, conversation_id, conversations!inner(user_id)")
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .eq("conversations.user_id", userId)
      .maybeSingle();

    if (existing?.followups && Array.isArray(existing.followups)) {
      const cached = (existing.followups as unknown[]).filter(
        (x): x is string => typeof x === "string"
      );
      if (cached.length > 0) {
        return NextResponse.json({ followups: cached });
      }
    }
  }

  // ── 3. Cache key (hash, for future DB-cache; skipped for MVP) ───
  const cacheKey = crypto
    .createHash("sha256")
    .update(
      question.trim().toLowerCase() +
        "::" +
        answer.slice(0, 1800) +
        "::" +
        lang +
        "::" +
        mode
    )
    .digest("hex")
    .slice(0, 24);

  // ── 4. First attempt ────────────────────────────────────────────
  const prompt = buildPrompt(question, answer, typedCitations, lang, mode);
  let raw = await callGeminiFlash(prompt);
  let parsed = raw ? extractJsonArray(raw) : null;

  // ── 5. Retry once with stricter wording on parse failure ───────
  if (!parsed && raw !== null) {
    console.warn(
      `[followup] parse failed (cacheKey=${cacheKey}); retrying. raw-preview=${raw.slice(0, 120)}`
    );
    const strictReminder =
      mode === "usecase"
        ? "\n\nREMINDER: Return ONLY a raw JSON array of objects like [{\"title\":\"...\",\"role\":\"...\",\"blurb\":\"...\",\"scenario_query\":\"...\"}]. No markdown. No text outside the array."
        : "\n\nREMINDER: Return ONLY a raw JSON array like [\"q1?\",\"q2?\"]. No object wrapper. No markdown. No text before or after.";
    const strictPrompt = prompt + strictReminder;
    raw = await callGeminiFlash(strictPrompt);
    parsed = raw ? extractJsonArray(raw) : null;
  }

  // ── 5b. OpenRouter backup on Gemini miss ───────────────────────
  if (!parsed) {
    console.warn(
      `[followup] Gemini exhausted (cacheKey=${cacheKey}); trying OpenRouter backup`
    );
    const backupRaw = await callOpenRouterBackup(prompt);
    if (backupRaw) {
      parsed = extractJsonArray(backupRaw);
      if (parsed) {
        console.log(`[followup] OpenRouter backup succeeded (cacheKey=${cacheKey})`);
      }
    }
  }

  if (!parsed) {
    if (raw !== null) {
      console.warn(
        `[followup] parse failed after retry + backup (cacheKey=${cacheKey}); returning empty. raw-preview=${raw.slice(0, 120)}`
      );
    }
    return NextResponse.json(
      mode === "usecase" ? { cards: [] } : { followups: [] }
    );
  }

  // ── 6. Sanitize and clip ────────────────────────────────────────
  if (mode === "usecase") {
    const cards: UseCaseCard[] = parsed
      .filter(
        (x): x is Record<string, unknown> =>
          !!x && typeof x === "object" && !Array.isArray(x)
      )
      .map((o) => {
        const title = typeof o.title === "string" ? o.title.trim() : "";
        const role = typeof o.role === "string" ? o.role.trim() : "";
        const blurb = typeof o.blurb === "string" ? o.blurb.trim() : "";
        const scenario_query =
          typeof o.scenario_query === "string" ? o.scenario_query.trim() : "";
        return { title, role, blurb, scenario_query };
      })
      .filter(
        (c) =>
          c.title.length > 0 &&
          c.title.length <= 60 &&
          c.scenario_query.length >= 10 &&
          c.scenario_query.length <= 400 &&
          c.blurb.length <= 180
      )
      .slice(0, 4);
    return NextResponse.json({ cards });
  }

  const followups = parsed
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 200)
    .slice(0, 5);

  // ── 7. Persist on the message row so history switches re-use the
  //       same list instead of regenerating a different one. Ownership
  //       was already verified by the earlier short-circuit query.
  if (supabase && messageId && conversationId && followups.length > 0) {
    const { error: updateError } = await supabase
      .from("messages")
      .update({ followups })
      .eq("id", messageId)
      .eq("conversation_id", conversationId);
    if (updateError) {
      console.warn("[followup] persist failed:", updateError.message);
    }
  }

  return NextResponse.json({ followups });
}
