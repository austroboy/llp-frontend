// PB Task 6 (F1) — llp-chat-recover Vercel orchestrator client.
//
// Calls the inference-orchestrator `llp-chat-recover` agent (Sonnet 4.6)
// with the original query + draft + verdicts + recovered chunks, parses
// the agent's JSON envelope, and returns a typed RecoverOutput.
//
// Fires from src/app/api/chat/route.ts AFTER E3 re-fire when D1 verdicts
// are still dirty (E3 may have improved retrieval but not synthesis).
// On success the route sanity-verifies F1's citations once (separate
// budget from E3 max_iter) and overrides the streaming answer.
//
// Flag: ENABLE_F1_CORRECTOR=1 (default OFF). Mutex with Deep Search
// via the same !deepSearchRequested guard used by D1 + E3.

import { getOrchestratorUrl } from "@/lib/orchestrator/url";

export type RecoverInputCitation = {
  section: string;
  document_id: string;
  text?: string;
};

export type RecoverInputVerdict = {
  section: string;
  document_id: string;
  verdict: "verifies" | "agree" | "partial" | "not_verifiable" | "disagree";
  section_corrected?: string;
  notes?: string;
};

export type RecoverInput = {
  original_query: string;
  draft_answer: string;
  draft_citations: RecoverInputCitation[];
  verdicts: RecoverInputVerdict[];
  recovered_chunks?: RecoverInputCitation[];
};

export type RecoverOutputCitation = {
  section: string;
  document_id: string;
  text: string;
  verdict_source: "verifies" | "partial";
};

export type RecoverOutput = {
  answer: string;
  citations: RecoverOutputCitation[];
  confidence: "high" | "medium" | "low";
  rewrite_notes: string;
};

/**
 * Pure parser for the llp-chat-recover JSON envelope. Strips optional
 * markdown code fences (```json ... ``` or ``` ... ```) before JSON.parse.
 * Validates required fields + confidence enum; returns null on any
 * structural problem so the route can fall through to G1 honesty band.
 */
export function parseRecoverOutput(raw: string): RecoverOutput | null {
  let body = raw.trim();
  // Strip markdown code fences (```json\n...\n``` or ```\n...\n```)
  body = body.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const obj = JSON.parse(body);
    if (typeof obj?.answer !== "string") return null;
    if (!Array.isArray(obj?.citations)) return null;
    if (!["high", "medium", "low"].includes(obj?.confidence)) return null;
    return obj as RecoverOutput;
  } catch {
    return null;
  }
}

/**
 * Calls the llp-chat-recover orchestrator agent. Best-effort — any network /
 * HTTP / parse failure returns null so the route falls through to G1.
 *
 * Default 90s timeout: F1 is a single Sonnet 4.6 round-trip with a
 * structured input payload; 30-60s typical. The 90s cap keeps the
 * combined D1 + E3 + F1 wall under the Vercel 300s ceiling.
 */
export async function runRecover(
  input: RecoverInput,
  opts?: { timeoutMs?: number },
): Promise<RecoverOutput | null> {
  const url = getOrchestratorUrl("llp-chat-recover");
  const token = process.env.GOCLAW_TOKEN;
  if (!url || !token) {
    console.error("[recover] missing orchestrator URL or token");
    return null;
  }

  const userMessage = JSON.stringify(
    {
      original_query: input.original_query,
      draft_answer: input.draft_answer,
      draft_citations: input.draft_citations,
      verdicts: input.verdicts,
      recovered_chunks: input.recovered_chunks ?? [],
    },
    null,
    2,
  );

  let res: Response;
  try {
    res = await fetch(`${url}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-GoClaw-User-Id": "vercel-recover",
        "X-GoClaw-Agent-Id": "llp-chat-recover",
      },
      body: JSON.stringify({ messages: [{ role: "user", content: userMessage }] }),
      signal: AbortSignal.timeout(opts?.timeoutMs ?? 90_000),
    });
  } catch (err) {
    console.error("[recover] fetch failed", err);
    return null;
  }

  if (!res.ok) {
    console.error("[recover] HTTP error", { status: res.status });
    return null;
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    console.error("[recover] json parse failed", err);
    return null;
  }

  // Defensive shape access — orchestrator normally returns OpenAI-style
  // {choices:[{message:{content}}]} but some agent paths emit
  // {content} directly.
  const d = data as { choices?: Array<{ message?: { content?: unknown } }>; content?: unknown };
  const content = d?.choices?.[0]?.message?.content ?? d?.content ?? "";
  return parseRecoverOutput(typeof content === "string" ? content : JSON.stringify(content));
}
