import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { translateChunk } from "@/lib/ai/translate-stream";
import { isSupportedLanguage } from "@/lib/languages";
import { createServerClient } from "@/lib/supabase";
import { getOrchestratorUrl } from "@/lib/orchestrator/url";

// Plain-language summary + realistic example scenario for an assistant answer.
// Calls orchestrator agent `llp-chat-followup` in dual-mode (mode=summarize).
// The agent is shared with follow-up-chips generation to keep cost low —
// gpt-5.4 via openai-codex provider.
//
// Orchestrator gotcha (same as /followup): a ~9.8KB system preamble gets
// injected ahead of our agent frontmatter, which dilutes the agent's "output
// JSON only" directive. We defensively:
//   1. Repeat the format directive in the user message body.
//   2. Try JSON.parse, fall back to a regex object-substring extractor.
//   3. On any failure return 503 summarize_unavailable — summary is an
//      enhancement, not core.

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const ORCHESTRATOR_TOKEN = process.env.GOCLAW_TOKEN || "";
const ORCHESTRATOR_USER_ID = process.env.GOCLAW_USER_ID || "admin";
const SUMMARIZE_AGENT = "llp-chat-followup";
const ORCHESTRATOR_TIMEOUT_MS = 25_000;

// ── Input shapes ────────────────────────────────────────────────────

interface CitationInput {
  section: string;
  document_id?: string;
  document?: string;
}

interface RequestBody {
  question?: unknown;
  answer?: unknown;
  citations?: unknown;
  language?: unknown;
  /** Optional — when present + UUID-shaped, the generated summary is
   *  written to messages.summary on that row so sidebar reload, share
   *  snapshot, and PDF export can all render the Summary card without
   *  regenerating. */
  message_id?: unknown;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCitation(v: unknown): v is CitationInput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.section === "string";
}

// ── Output shape ────────────────────────────────────────────────────

interface SummarizeReport {
  summary?: string;
  example_scenario?: string;
  cited_sections?: string[];
  error?: string;
}

function extractReport(raw: string): SummarizeReport | null {
  const unfenced = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();

  const tryParse = (s: string): SummarizeReport | null => {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as SummarizeReport;
      }
    } catch {
      /* fall through */
    }
    return null;
  };

  const direct = tryParse(unfenced);
  if (direct) return direct;

  // Regex fallback — greedy match of first {...} block.
  const greedy = unfenced.match(/\{[\s\S]*\}/);
  if (greedy) return tryParse(greedy[0]);
  return null;
}

// ── User message builder ────────────────────────────────────────────

function buildUserMessage(
  question: string,
  answer: string,
  citations: CitationInput[],
): string {
  const trimmedAnswer =
    answer.length > 2400 ? answer.slice(0, 2400) + "..." : answer;
  const citedLines =
    citations.length > 0
      ? citations
          .slice(0, 8)
          .map((c) => {
            const doc = c.document_id || c.document || "";
            return `- ${c.section}${doc ? ` (${doc})` : ""}`;
          })
          .join("\n")
      : "(no explicit citations)";

  // Always generate English. Output translation handled at the edge via
  // translateChunk so all 9 supported languages route through the same
  // Gemini pipeline (and section numbers stay auditable).
  const langBlock =
    "Language: English. Use Bangladeshi fictional names (e.g. Rahim Uddin, Nusrat Jahan, Karim Hossain).";

  return `MODE: summarize

User's prior question:
${question}

Assistant's answer:
${trimmedAnswer}

Cited sections:
${citedLines}

Task: produce a JSON object with exactly three fields:
1. "summary": a 2-3 sentence plain-language restatement of the answer's key points. No legal jargon. Retain factual accuracy — do not soften or invert.
2. "example_scenario": a 3-5 sentence realistic Bangladesh workplace scenario applying the rule. Use a real-sounding employer (RMG factory, tea garden, bank branch, software company, etc), concrete BDT wages, concrete days or months, and the actual section numbers cited. Show what the rule looks like in practice — do not add caveats or warnings.
3. "cited_sections": a string array of the section labels used, copied from the citations above.

Rules:
- Never invent section numbers, amendment years, or legal facts beyond the answer + citations.
- Keep the scenario plausible — no wildly inflated wages, no exotic edges.
- If the answer is too vague to ground a scenario, return "example_scenario": "" rather than inventing.

${langBlock}

OUTPUT RULES (strict):
- Respond with a raw JSON object ONLY.
- NO prose, NO code fence, NO preamble, NO commentary.
- Shape: {"summary":"...","example_scenario":"...","cited_sections":["..."]}`;
}

// ── Orchestrator caller ─────────────────────────────────────────────

interface OrchestratorOk {
  ok: true;
  content: string;
  usage?: Record<string, number>;
}
interface OrchestratorErr {
  ok: false;
  status: number;
  error: string;
}
type OrchestratorResult = OrchestratorOk | OrchestratorErr;

async function callSummarizeAgent(userMessage: string): Promise<OrchestratorResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ORCHESTRATOR_TIMEOUT_MS);
  try {
    const res = await fetch(`${getOrchestratorUrl(SUMMARIZE_AGENT)}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ORCHESTRATOR_TOKEN}`,
        "X-GoClaw-User-Id": ORCHESTRATOR_USER_ID,
        "X-GoClaw-Agent-Id": SUMMARIZE_AGENT,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout
        ? AbortSignal.timeout(ORCHESTRATOR_TIMEOUT_MS)
        : controller.signal,
    });
    if (!res.ok) {
      let bodyText = "";
      try {
        bodyText = await res.text();
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        status: res.status,
        error: bodyText.slice(0, 500) || `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: Record<string, number>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) return { ok: false, status: 502, error: "empty_agent_response" };
    return { ok: true, content, usage: data.usage };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 504, error: `fetch_error: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

// ── Handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth — any signed-in user can summarize an answer they received.
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // 2. Parse + validate body
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { question, answer, citations, language } = body;

  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json(
      { error: "question must be a non-empty string" },
      { status: 400 }
    );
  }
  if (typeof answer !== "string" || answer.trim().length < 50) {
    return NextResponse.json(
      { error: "answer must be a non-empty string (>=50 chars)" },
      { status: 400 }
    );
  }
  // Accept any supported chat-language code. Summary content is generated
  // in English by the orchestrator agent, then translated at the edge so the
  // output always matches the active chat language.
  const lang: string =
    typeof language === "string" && isSupportedLanguage(language) ? language : "en";
  const typedCitations: CitationInput[] = Array.isArray(citations)
    ? citations.filter(isCitation)
    : [];

  // 3. Call the agent in summarize mode (always English)
  const startedAt = Date.now();
  const userMessage = buildUserMessage(question, answer, typedCitations);
  const result = await callSummarizeAgent(userMessage);

  if (!result.ok) {
    console.warn(
      `[summarize] orchestrator call failed status=${result.status} err=${result.error.slice(0, 200)}`
    );
    return NextResponse.json(
      {
        error: "summarize_unavailable",
        message:
          "Summary is temporarily offline. Please try again later.",
      },
      { status: 503 }
    );
  }

  // 4. Parse JSON object
  const report = extractReport(result.content);
  if (!report) {
    console.error(
      `[summarize] parse failed. preview=${result.content.slice(0, 200)}`
    );
    return NextResponse.json(
      {
        error: "summarize_unavailable",
        message: "Summary response could not be parsed.",
      },
      { status: 503 }
    );
  }
  if (report.error) {
    return NextResponse.json(
      { error: "summarize_unavailable", message: report.error.slice(0, 200) },
      { status: 503 }
    );
  }

  const englishSummary =
    typeof report.summary === "string" ? report.summary.trim() : "";
  const englishExample =
    typeof report.example_scenario === "string"
      ? report.example_scenario.trim()
      : "";
  const citedSections = Array.isArray(report.cited_sections)
    ? report.cited_sections.filter((s): s is string => typeof s === "string")
    : [];

  if (!englishSummary) {
    return NextResponse.json(
      {
        error: "summarize_unavailable",
        message: "Agent returned an empty summary.",
      },
      { status: 503 }
    );
  }

  // Edge translation — parallelize summary + example to keep total latency
  // closer to a single Gemini call. cited_sections stay as section labels
  // (they're emitted by the agent as plain strings like "Section 26" and
  // section numbers must not be mutated by translation).
  let renderedSummary = englishSummary;
  let renderedExample = englishExample;
  if (lang !== "en") {
    const [s, e] = await Promise.all([
      translateChunk(englishSummary, { language: lang }),
      englishExample ? translateChunk(englishExample, { language: lang }) : Promise.resolve(""),
    ]);
    renderedSummary = s || englishSummary;
    renderedExample = e || englishExample;
  }

  const durationMs = Date.now() - startedAt;

  // Persist the rendered summary on the target message so reloading the
  // conversation or exporting a PDF reproduces the card without burning
  // another orchestrator call. Stored shape matches MessageSummary in
  // chat-store.ts and the `summary` field the print page reads.
  const messageId =
    typeof body.message_id === "string" && UUID_RE.test(body.message_id)
      ? body.message_id
      : null;
  if (messageId) {
    try {
      const supabase = createServerClient();
      await supabase
        .from("messages")
        .update({
          summary: {
            summary: renderedSummary,
            example_scenario: renderedExample || undefined,
            cited_sections: citedSections,
            language: lang,
          },
        })
        .eq("id", messageId);
    } catch (err) {
      console.warn("[summarize] persist to messages.summary failed", err);
    }
  }

  return NextResponse.json(
    {
      summary: renderedSummary,
      example_scenario: renderedExample,
      cited_sections: citedSections,
      language: lang,
      _duration_ms: durationMs,
    },
    {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
