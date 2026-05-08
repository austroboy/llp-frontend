import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 15;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FREE_MODELS = [
  "stepfun/step-3.5-flash:free",
  "arcee-ai/trinity-large-preview:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
];
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

type Cached = { data: GreetingPayload; expires: number };
const cache = new Map<string, Cached>();

interface GreetingPayload {
  greeting: string;
  leftoff: string | null;
  primaryAction: { label: string; conversationId: string } | null;
  newIdea: string | null;
  source: "ai" | "fallback";
}

function timeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function fallback(firstName: string | null): GreetingPayload {
  const tod = timeOfDay();
  const greet = `Good ${tod}${firstName ? ", " + firstName : ""}`;
  return {
    greeting: greet,
    leftoff: null,
    primaryAction: null,
    newIdea: "Ask about a labour law provision, amendment, or rule.",
    source: "fallback",
  };
}

async function callOpenRouter(
  model: string,
  prompt: string,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 220,
      messages: [{ role: "user", content: prompt }],
    }),
    signal,
  });
  if (!res.ok) throw new Error(`${model} http ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error(`${model} empty`);
  return text;
}

// Race the free OpenRouter models — first non-empty response wins.
// Mirrors the race pattern used by the inference chat proxy for /chat.
async function raceFreeModels(prompt: string): Promise<string | null> {
  if (!OPENROUTER_API_KEY) return null;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 9000);
  try {
    const winner = await Promise.any(
      FREE_MODELS.map((m) => callOpenRouter(m, prompt, ctrl.signal))
    );
    return winner;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    ctrl.abort();
  }
}

function sanitizeSnippet(s: string | undefined | null, maxChars: number): string | null {
  if (!s) return null;
  const stripped = String(s)
    .replace(/[*_`~]+/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return null;
  if (stripped.length <= maxChars) return stripped;
  return stripped.slice(0, maxChars - 1).trimEnd() + "…";
}

function extractJson(raw: string): { greeting?: string; leftoff?: string; primaryLabel?: string; newIdea?: string } | null {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch { /* fall through */ }
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch { /* give up */ }
  }
  return null;
}

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const cached = cache.get(userId);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data);
    }

    let firstName: string | null = null;
    try {
      const u = await currentUser();
      firstName = u?.firstName || null;
    } catch { /* ignore */ }

    const sb = createServerClient();
    const { data: convs } = await sb
      .from("conversations")
      .select("id, title, updated_at")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .neq("title", "New Conversation")
      .order("updated_at", { ascending: false })
      .limit(3);

    if (!convs || convs.length === 0) {
      const fb = fallback(firstName);
      cache.set(userId, { data: fb, expires: Date.now() + CACHE_TTL_MS });
      return NextResponse.json(fb);
    }

    // Pull first user message from each convo for richer context
    const convIds = convs.map((c) => c.id);
    const { data: firstMsgs } = await sb
      .from("messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", convIds)
      .eq("role", "user")
      .order("created_at", { ascending: true });

    const firstByConv = new Map<string, string>();
    if (firstMsgs) {
      for (const m of firstMsgs) {
        if (!firstByConv.has(m.conversation_id)) {
          firstByConv.set(m.conversation_id, String(m.content).slice(0, 200));
        }
      }
    }

    const convoSummaries = convs
      .map((c, i) => {
        const q = firstByConv.get(c.id) || c.title;
        return `${i + 1}. title="${c.title}" | first_question="${q}"`;
      })
      .join("\n");

    const tod = timeOfDay();
    const prompt = `You are a friendly sidebar assistant for a Bangladesh labour-law Q&A app.
Produce ONE short, warm, lively nudge for a returning user, in ENGLISH.
Do NOT greet like "Hello" — the app already shows a time-of-day greeting.

User's recent conversations (most recent first):
${convoSummaries}

Return STRICT JSON with this shape (no prose, no markdown fences):
{
  "greeting": "Good ${tod}${firstName ? ", " + firstName : ""}",
  "leftoff": "one warm sentence (<=14 words) that names what they were exploring in convo #1 and invites them back. Write it conversationally.",
  "primaryLabel": "short button text <=4 words, e.g. 'Continue', 'Pick up where you left off'",
  "newIdea": "ONE fresh related angle to explore, phrased as an invitation, <=12 words. Should be a topic neighbor, not a repeat."
}`;

    const safeTitle = convs[0] ? sanitizeSnippet(convs[0].title, 80) : null;

    const raw = await raceFreeModels(prompt);
    if (!raw) {
      const fb = fallback(firstName);
      fb.leftoff = safeTitle ? `You were exploring: ${safeTitle}` : null;
      fb.primaryAction = convs[0] ? { label: "Continue", conversationId: convs[0].id } : null;
      cache.set(userId, { data: fb, expires: Date.now() + CACHE_TTL_MS });
      return NextResponse.json(fb);
    }

    const parsed = extractJson(raw);

    if (!parsed) {
      const fb = fallback(firstName);
      fb.leftoff = safeTitle ? `You were exploring: ${safeTitle}` : null;
      fb.primaryAction = convs[0] ? { label: "Continue", conversationId: convs[0].id } : null;
      cache.set(userId, { data: fb, expires: Date.now() + CACHE_TTL_MS });
      return NextResponse.json(fb);
    }

    const payload: GreetingPayload = {
      greeting: sanitizeSnippet(parsed.greeting, 80) || `Good ${tod}${firstName ? ", " + firstName : ""}`,
      leftoff: sanitizeSnippet(parsed.leftoff, 140),
      primaryAction: convs[0] && parsed.primaryLabel
        ? { label: sanitizeSnippet(parsed.primaryLabel, 40) || "Continue", conversationId: convs[0].id }
        : null,
      newIdea: sanitizeSnippet(parsed.newIdea, 120),
      source: "ai",
    };
    cache.set(userId, { data: payload, expires: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json(fallback(null));
  }
}
