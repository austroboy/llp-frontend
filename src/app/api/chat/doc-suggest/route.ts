import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { DOC_CATALOG } from "@/lib/documents/catalog";
import type { DocType } from "@/lib/documents/types";

// POST /api/chat/doc-suggest
// {
//   messageId?: string,
//   conversationId?: string,
//   userQuestion: string,
//   assistantAnswer: string,
//   citations?: Array<{ section: string, document?: string }>,
// }
//
// →
// {
//   topTemplates: DocType[],       // 3 ranked ids from DOC_CATALOG (or fewer)
//   customPrompts: string[],       // 2-3 click-ready userInstruction seeds
//   source: "ai" | "fallback"
// }
//
// Races free OpenRouter models to stay within a few hundred ms. Cached
// by messageId (or a hash of the input when missing) for 30 min in
// process. Mirrors /api/sidebar/greeting's pattern.

export const runtime = "nodejs";
export const maxDuration = 15;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FREE_MODELS = [
  "stepfun/step-3.5-flash:free",
  "arcee-ai/trinity-large-preview:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
];
const CACHE_TTL_MS = 30 * 60 * 1000;
const VALID_DOC_TYPES: DocType[] = Object.keys(DOC_CATALOG) as DocType[];

interface DocSuggestPayload {
  topTemplates: DocType[];
  customPrompts: string[];
  source: "ai" | "fallback";
}

type Cached = { data: DocSuggestPayload; expires: number };
const cache = new Map<string, Cached>();

function fallback(): DocSuggestPayload {
  return { topTemplates: [], customPrompts: [], source: "fallback" };
}

async function callOpenRouter(
  model: string,
  prompt: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
    signal,
  });
  if (!res.ok) throw new Error(`${model} http ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim())
    throw new Error(`${model} empty`);
  return text;
}

async function raceFreeModels(prompt: string): Promise<string | null> {
  if (!OPENROUTER_API_KEY) return null;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 9000);
  try {
    return await Promise.any(
      FREE_MODELS.map((m) => callOpenRouter(m, prompt, ctrl.signal)),
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    ctrl.abort();
  }
}

function extractJson(raw: string): unknown | null {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    /* fall through */
  }
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      /* give up */
    }
  }
  return null;
}

function catalogSummary(): string {
  return VALID_DOC_TYPES.map((id) => {
    const m = DOC_CATALOG[id];
    return `- ${id}: ${m.label} — ${m.description ?? ""}`;
  }).join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const userQuestion =
      typeof body.userQuestion === "string" ? body.userQuestion.slice(0, 2000) : "";
    const assistantAnswer =
      typeof body.assistantAnswer === "string"
        ? body.assistantAnswer.slice(0, 4000)
        : "";
    const citations = Array.isArray(body.citations) ? body.citations : [];
    const messageId =
      typeof body.messageId === "string" ? body.messageId : null;

    if (!userQuestion && !assistantAnswer) {
      return NextResponse.json(fallback());
    }

    const cacheKey = messageId ?? `${userId}:${userQuestion.slice(0, 120)}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data);
    }

    const citationLines = citations
      .slice(0, 12)
      .map((c) => {
        const cc = c as Record<string, unknown>;
        const section = typeof cc.section === "string" ? cc.section : "";
        const doc = typeof cc.document === "string" ? cc.document : "";
        return section ? `  - ${section}${doc ? ` (${doc})` : ""}` : "";
      })
      .filter(Boolean)
      .join("\n");

    const prompt = `You are a document-builder advisor for a Bangladesh labour-law Q&A app. A user just asked a question and received a cited answer. Now they are opening "Build Document" — help rank which prebuilt template best fits, and suggest 2-3 click-ready CUSTOM prompts they can use instead if none of the prebuilts fit.

USER QUESTION:
${userQuestion || "(none)"}

ASSISTANT ANSWER (summary):
${assistantAnswer || "(none)"}

CITED SECTIONS:
${citationLines || "(none)"}

PREBUILT TEMPLATE CATALOG (id: label — description):
${catalogSummary()}

Return STRICT JSON with this exact shape (no prose, no fences):
{
  "topTemplates": ["<doc_id>", "<doc_id>", "<doc_id>"],   // 1-3 ids from the catalog, most relevant first. Empty array if nothing fits.
  "customPrompts": [
    "<one-sentence custom document instruction, <= 140 chars, ready to submit to the filegen agent. Include section numbers + role context.>",
    "<another angle, different document type>"
  ]
}

Rules:
- "topTemplates" ids MUST exist in the catalog — do not invent.
- "customPrompts" are for the CUSTOM path: each should name the doc type (letter, notice, application, SOP, etc.) and reference the relevant sections. Write in the same language as the user question (English or Bangla).
- If the cited sections clearly match a prebuilt (e.g. Section 26 → termination-notice), rank that id first.
- Do NOT return more than 3 topTemplates or more than 3 customPrompts.`;

    const raw = await raceFreeModels(prompt);
    if (!raw) {
      const fb = fallback();
      cache.set(cacheKey, { data: fb, expires: Date.now() + CACHE_TTL_MS });
      return NextResponse.json(fb);
    }

    const parsed = extractJson(raw) as
      | { topTemplates?: unknown; customPrompts?: unknown }
      | null;
    if (!parsed) {
      const fb = fallback();
      cache.set(cacheKey, { data: fb, expires: Date.now() + CACHE_TTL_MS });
      return NextResponse.json(fb);
    }

    const topTemplatesRaw = Array.isArray(parsed.topTemplates)
      ? parsed.topTemplates
      : [];
    const customPromptsRaw = Array.isArray(parsed.customPrompts)
      ? parsed.customPrompts
      : [];

    const topTemplates = topTemplatesRaw
      .filter((x): x is string => typeof x === "string")
      .filter((id): id is DocType =>
        (VALID_DOC_TYPES as string[]).includes(id),
      )
      .slice(0, 3);

    const customPrompts = customPromptsRaw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 240)
      .slice(0, 3);

    const payload: DocSuggestPayload = {
      topTemplates,
      customPrompts,
      source: "ai",
    };
    cache.set(cacheKey, { data: payload, expires: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(payload);
  } catch (err) {
    console.warn("[doc-suggest] error:", err);
    return NextResponse.json(fallback());
  }
}
