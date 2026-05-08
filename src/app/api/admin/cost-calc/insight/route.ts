/**
 * Cost-calculator AI insight endpoint.
 *
 * POST /api/admin/cost-calc/insight
 * Body: live snapshot of cost-calc state (revenue, variable, subs, subsidy, etc.)
 * Returns: 2-3 sentence explanation of *why* the bottom line is profit/loss,
 *          synthesized by racing 3 free OpenRouter models (mirrors the
 *          /api/sidebar/greeting race pattern).
 *
 * Used by /admin/cost-calculator hero card "AI Insight" widget.
 * Free models — does not burn paid xAI/Anthropic credits.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 15;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FREE_MODELS = [
  "stepfun/step-3.5-flash:free",
  "arcee-ai/trinity-large-preview:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
];

interface InsightInput {
  totalRev: number;
  totalNetLLP: number;          // variable cost rolled up
  totalRedClaw: number;          // theoretical Stream-2 absorbed
  totalSubscriptions: number;
  marginAfterFixed: number;
  marginAfterFixedPct: number;
  totalUsers: number;
  totalChats: number;
  paidPercent: number;
  subsidyPct: number;
  scaleUsers: number;
  activePhaseBFlags: string[];
  enabledSubscriptions: Array<{ label: string; monthlyUsd: number }>;
}

function buildPrompt(d: InsightInput): string {
  const verdict = d.marginAfterFixed >= 0 ? "PROFIT" : "LOSS";
  const flagList = d.activePhaseBFlags.length === 0 ? "(none)" : d.activePhaseBFlags.join(", ");
  const subList = d.enabledSubscriptions.length === 0
    ? "(no fixed costs entered)"
    : d.enabledSubscriptions.map(s => `${s.label} $${s.monthlyUsd}`).join(", ");
  const redClawNarrative = d.subsidyPct === 100
    ? `redClaw is fully absorbing $${d.totalRedClaw.toFixed(2)}/mo of post-T1 (Stream-2) cost via Claude Pro / ChatGPT Pro subscriptions — that's how much LLP saves by routing through subs.`
    : `redClaw is absorbing only ${d.subsidyPct}% of Stream-2; LLP is paying the residual share theoretically at OpenRouter rates.`;

  return `You are a sharp cost analyst for an AI legal-chat business.

State a 2-3 sentence verdict explaining why this monthly P&L lands at a ${verdict} of $${Math.abs(d.marginAfterFixed).toFixed(2)} (${d.marginAfterFixedPct.toFixed(1)}% margin). Be punchy, specific, and mention the dominant lever.

Numbers:
- Revenue: $${d.totalRev.toFixed(2)} (${d.totalUsers} users, ${d.paidPercent}% paid, ${d.totalChats.toFixed(0)} chats/mo)
- Variable cost (T1 API: Grok + Gemini): $${d.totalNetLLP.toFixed(2)}
- Subscriptions (fixed): $${d.totalSubscriptions.toFixed(2)} → ${subList}
- redClaw subsidy: ${d.subsidyPct}% (${redClawNarrative})
- Phase B flags ON: ${flagList}

Style:
- No greetings, no markdown, plain prose.
- Lead with the verdict + dollar figure.
- Name the single biggest lever (revenue mix, variable burn, subscriptions, or subsidy state).
- End with one concrete suggestion to improve / sustain the bottom line.
- 50-80 words total. No filler like "Based on the data".

Begin:`;
}

async function callOpenRouter(model: string, prompt: string, signal: AbortSignal): Promise<{ text: string; model: string }> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: 220,
      messages: [{ role: "user", content: prompt }],
    }),
    signal,
  });
  if (!res.ok) throw new Error(`${model} http ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error(`${model} empty`);
  return { text: text.trim(), model };
}

async function raceFreeModels(prompt: string): Promise<{ text: string; model: string } | null> {
  if (!OPENROUTER_API_KEY) return null;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12000);
  try {
    return await Promise.any(FREE_MODELS.map(m => callOpenRouter(m, prompt, ctrl.signal)));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    ctrl.abort();
  }
}

function fallback(d: InsightInput): { text: string; model: string } {
  const verdict = d.marginAfterFixed >= 0 ? "Profit" : "Loss";
  const dominant = d.totalNetLLP > d.totalSubscriptions
    ? "T1 API spend is the dominant cost"
    : "fixed monthly subscriptions are the dominant cost";
  const subsNote = d.subsidyPct === 100
    ? `redClaw absorbing $${d.totalRedClaw.toFixed(2)}/mo of Stream-2 via Claude/Codex subs is keeping you afloat.`
    : `at ${d.subsidyPct}% subsidy LLP is exposed to the residual Stream-2 cost.`;
  const lever = d.marginAfterFixed >= 0
    ? "Lock in by raising the active% of paid tiers."
    : (d.totalUsers === 0 ? "Add at least one paid user to test revenue impact." : "Reduce variable cost by lowering Active % on free tiers, or add more paid users.");
  return {
    text: `${verdict} of $${Math.abs(d.marginAfterFixed).toFixed(2)} (${d.marginAfterFixedPct.toFixed(1)}%). ${dominant}. ${subsNote} ${lever}`,
    model: "fallback (deterministic)",
  };
}

function sanitize(text: string): string {
  return text
    .replace(/[*_`]+/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  // Admin-gate: any signed-in user with admin metadata. Mirror /admin/cost-calc/live
  // permissions (admin-only routes guard via Clerk in middleware/proxy.ts).
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: InsightInput;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  if (typeof body?.totalRev !== "number" || typeof body?.marginAfterFixed !== "number") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const prompt = buildPrompt(body);
  const ai = await raceFreeModels(prompt);
  const out = ai ? { text: sanitize(ai.text), model: ai.model } : fallback(body);
  return NextResponse.json({
    explanation: out.text,
    model: out.model,
    generatedAt: new Date().toISOString(),
    source: ai ? "ai" : "fallback",
  });
}
