import "server-only";

/**
 * Gemini batch topic-clustering helper for the W7 panel.
 *
 * Privacy contract:
 *   - Caller MUST trim every query to <=60 chars before passing in.
 *   - We send only the trimmed snippets — no user ids, no metadata.
 *   - Failures are non-fatal: caller renders an empty state so the
 *     panel never breaks because Gemini hiccupped.
 */

export interface ClusteredTopic {
  topic: string;
  count: number;
  examples: string[];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_TOPICS = 12;
const MAX_INPUT_QUERIES = 500;
const MAX_EXAMPLE_LEN = 60;

const SYSTEM_INSTRUCTION = `You are an analytics topic clusterer.
Group the user's chat queries into AT MOST ${MAX_TOPICS} topical themes.
Reply with ONLY a JSON array. No prose, no markdown fences. Schema:
[{"topic": "<short topic label, <= 32 chars>", "count": <integer>, "examples": ["<query snippet>", "<query snippet>", "<query snippet>"]}]
Sort by count desc. "examples" must be 3 distinct representative snippets per topic, each <= ${MAX_EXAMPLE_LEN} chars. Do not invent or paraphrase — pick from the input.`;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export async function clusterQueries(
  trimmedQueries: string[],
): Promise<ClusteredTopic[]> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing");
  }
  if (trimmedQueries.length === 0) {
    return [];
  }

  // Defensive: enforce caller's privacy contract.
  const sanitized = trimmedQueries
    .filter((q): q is string => typeof q === "string" && q.length > 0)
    .map((q) => (q.length > MAX_EXAMPLE_LEN ? q.slice(0, MAX_EXAMPLE_LEN) : q))
    .slice(0, MAX_INPUT_QUERIES);

  if (sanitized.length === 0) return [];

  const promptBody = sanitized.map((q, i) => `${i + 1}. ${q}`).join("\n");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          // Cluster needs non-trivial reasoning; allow a small budget.
          // 2.5-flash supports thinkingConfig; cap output length to keep
          // the response bounded.
          thinkingConfig: { thinkingBudget: 1024 },
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: SYSTEM_INSTRUCTION },
              { text: `\nQUERIES (one per line):\n${promptBody}` },
            ],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`gemini_${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      ?.trim() ?? "";

  if (!text) {
    throw new Error("gemini_empty_response");
  }

  return parseTopics(text);
}

/**
 * Robust JSON extraction: Gemini sometimes wraps the response in
 * fences despite the responseMimeType hint. Strip fences then parse.
 */
function parseTopics(raw: string): ClusteredTopic[] {
  let trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Try to recover by extracting the first [...] block.
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("gemini_invalid_json");
    parsed = JSON.parse(match[0]);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("gemini_not_array");
  }

  const topics: ClusteredTopic[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const t = item as { topic?: unknown; count?: unknown; examples?: unknown };
    const topic =
      typeof t.topic === "string" ? t.topic.trim().slice(0, 64) : "";
    const count =
      typeof t.count === "number" && Number.isFinite(t.count)
        ? Math.max(0, Math.round(t.count))
        : 0;
    const examplesRaw = Array.isArray(t.examples) ? t.examples : [];
    const examples: string[] = [];
    for (const ex of examplesRaw) {
      if (typeof ex !== "string") continue;
      const cleaned = ex.trim();
      if (cleaned.length === 0) continue;
      examples.push(
        cleaned.length > MAX_EXAMPLE_LEN
          ? cleaned.slice(0, MAX_EXAMPLE_LEN)
          : cleaned,
      );
      if (examples.length === 3) break;
    }
    if (topic.length === 0) continue;
    topics.push({ topic, count, examples });
  }

  topics.sort((a, b) => b.count - a.count);
  return topics.slice(0, MAX_TOPICS);
}
