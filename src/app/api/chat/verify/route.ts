import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import {
  buildVerifyUserMessage,
  type VerifyBatchPayload,
} from "@/lib/verify/build-user-message";
import { getOrchestratorUrl } from "@/lib/orchestrator/url";

// Citation verification through the orchestrator's `llp-chat-verify`
// agent (Claude Opus via claude-cli provider). The agent reads the
// local chat-docs mirror (mounted read-only inside the container) and
// returns a strict JSON verdict report.
//
// Pipeline:
//   1. Client POSTs {question, answer, citations, language}.
//   2. We forward a single user message (JSON-encoded payload) to the agent.
//   3. Agent reads the tree JSONs, checks supersession, and responds with
//      JSON matching the VerifyReport shape below.
//   4. We parse defensively and return the object directly.
//
// Infra: when the orchestrator is degraded we surface 503
// verify_infra_unavailable so the UI can show a graceful fallback
// (silent, non-blocking).

export const maxDuration = 270; // up to 4m30s — Opus verify can take a while
export const dynamic = "force-dynamic";

const ORCHESTRATOR_TOKEN = process.env.GOCLAW_TOKEN || "";
const ORCHESTRATOR_USER_ID = process.env.GOCLAW_USER_ID || "admin";
const VERIFY_AGENT = "llp-chat-verify";
const ORCHESTRATOR_CHAT_TIMEOUT_MS = 250_000; // 4m10s for the whole agent run

// ── Input shapes ────────────────────────────────────────────────────

interface CitationInput {
  section: string;
  document_id: string;
  verbatim?: string;
}

interface RequestBody {
  question?: unknown;
  answer?: unknown;
  citations?: unknown;
  language?: unknown;
  /** Client-generated UUID used as the chat_jobs row id so the sidebar
   *  badge and the persisted row share a single identity. Optional —
   *  when missing the server allocates one and returns it in the
   *  response body for the client to splice. */
  job_id?: unknown;
  /** Optional routing so the hydrated badge can jump back to the
   *  originating assistant bubble on click. */
  conversation_id?: unknown;
  message_id?: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCitation(v: unknown): v is CitationInput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.section === "string" &&
    typeof o.document_id === "string" &&
    (o.verbatim === undefined || typeof o.verbatim === "string")
  );
}

// ── JSON envelope extractor ─────────────────────────────────────────

interface ClaimVerdict {
  claim?: string;
  cited_section?: string;
  verdict?: string;
  evidence?: string;
  evidence_path?: string;
  confidence?: number;
  note?: string;
}

interface VerifyReport {
  overall_verdict?: string;
  confidence?: number;
  claims?: ClaimVerdict[];
  superseded_sections?: string[];
  missing_citations?: string[];
  /** Narrative summary written by the verify agent — rendered above
   *  the per-claim list in VerifyResultCard. */
  summary?: string;
  error?: string;
}

/** The `llp-chat-verify` agent returns the batch schema under the new
 *  directive — `{verdicts:[{id, verdict, section, section_corrected,
 *  result_summary}]}` — and historically also emitted the looser
 *  `{verdict, summary, citations_checked}` shape. Map either into the
 *  canonical VerifyReport the UI already consumes. Canonical keys win
 *  when a response mixes shapes. */
function normalizeReport(raw: Record<string, unknown>): VerifyReport {
  const out: VerifyReport = {};

  // overall_verdict — prefer canonical, fall back to agent's `verdict`.
  const topVerdictRaw =
    (typeof raw.overall_verdict === "string" && raw.overall_verdict) ||
    (typeof raw.verdict === "string" && raw.verdict) ||
    undefined;
  if (topVerdictRaw) out.overall_verdict = mapTopVerdict(topVerdictRaw);

  if (typeof raw.confidence === "number") out.confidence = raw.confidence;
  if (typeof raw.summary === "string") out.summary = raw.summary;

  // Claims — canonical `claims` first; else the batch `verdicts[]`
  // shape (new); else the legacy `citations_checked` shape.
  const canonicalClaims = Array.isArray(raw.claims) ? raw.claims : null;
  const batchVerdicts = Array.isArray(raw.verdicts)
    ? (raw.verdicts as unknown[]).map((v) => {
        if (!v || typeof v !== "object") return {};
        const r = v as Record<string, unknown>;
        return {
          claim: typeof r.id === "string" ? r.id : undefined,
          cited_section:
            typeof r.section_corrected === "string" && r.section_corrected
              ? r.section_corrected
              : typeof r.section === "string"
                ? r.section
                : undefined,
          verdict: typeof r.verdict === "string" ? r.verdict : undefined,
          evidence:
            typeof r.result_summary === "string" ? r.result_summary : undefined,
        };
      })
    : null;
  const agentClaims = Array.isArray(raw.citations_checked)
    ? raw.citations_checked
    : null;
  const src = canonicalClaims ?? batchVerdicts ?? agentClaims;
  if (src) {
    out.claims = src
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((c): ClaimVerdict => {
        const verdictRaw =
          (typeof c.verdict === "string" && c.verdict) ||
          (typeof c.status === "string" && c.status) ||
          undefined;
        return {
          claim: typeof c.claim === "string" ? c.claim : undefined,
          cited_section:
            typeof c.cited_section === "string"
              ? c.cited_section
              : typeof c.cited_as === "string"
                ? c.cited_as
                : undefined,
          verdict: verdictRaw ? mapClaimVerdict(verdictRaw) : undefined,
          evidence:
            typeof c.evidence === "string"
              ? c.evidence
              : typeof c.source_quote === "string"
                ? c.source_quote
                : undefined,
          evidence_path:
            typeof c.evidence_path === "string"
              ? c.evidence_path
              : typeof c.source_verified === "string"
                ? c.source_verified
                : undefined,
          confidence:
            typeof c.confidence === "number" ? c.confidence : undefined,
          note: typeof c.note === "string" ? c.note : undefined,
        };
      });
  }

  if (Array.isArray(raw.superseded_sections)) {
    out.superseded_sections = raw.superseded_sections.filter(
      (x): x is string => typeof x === "string",
    );
  }
  if (Array.isArray(raw.missing_citations)) {
    out.missing_citations = raw.missing_citations.filter(
      (x): x is string => typeof x === "string",
    );
  }
  if (typeof raw.error === "string") out.error = raw.error;

  // Derive overall_verdict from the per-claim verdicts when the agent
  // only emitted the batch shape (no top-level `verdict`/`overall_verdict`
  // field). Keeps VerifyResultCard's header badge populated.
  if (!out.overall_verdict && out.claims && out.claims.length > 0) {
    let verified = 0;
    let partial = 0;
    let bad = 0;
    for (const c of out.claims) {
      switch (c.verdict) {
        case "verified":
          verified++;
          break;
        case "partially_correct":
          partial++;
          break;
        case "misquoted":
        case "fabricated":
        case "superseded":
          bad++;
          break;
      }
    }
    const total = out.claims.length;
    if (bad === total) out.overall_verdict = "unverified";
    else if (verified === total) out.overall_verdict = "verified";
    else if (bad > 0) out.overall_verdict = "mixed";
    else if (partial > 0) out.overall_verdict = "mostly_verified";
    else out.overall_verdict = "mixed";
  }

  return out;
}

/** Collapse synonyms into the UI's four-way enum. */
function mapTopVerdict(v: string): string {
  const s = v.toLowerCase();
  if (s === "verified" || s === "fully_verified") return "verified";
  if (s === "mostly_verified" || s === "mostly_correct") return "mostly_verified";
  if (
    s === "mixed" ||
    s === "partially_verified" ||
    s === "partial" ||
    s === "partially_correct"
  ) {
    return "mixed";
  }
  if (s === "unverified" || s === "failed" || s === "fabricated") {
    return "unverified";
  }
  return v;
}

/** Per-claim verdict enum expected by VerifyResultCard.
 *  Accepts the legacy `verified/correct/misquoted/fabricated/…` vocab
 *  AND the batch schema's `agree/disagree/partial/not_verifiable`. */
function mapClaimVerdict(v: string): string {
  const s = v.toLowerCase();
  if (s === "verified" || s === "correct" || s === "agree") return "verified";
  if (
    s === "partially_correct" ||
    s === "partial" ||
    s === "partially_verified"
  ) {
    return "partially_correct";
  }
  if (s === "misquoted") return "misquoted";
  // disagree = model contradicted by corpus → "fabricated" (model is wrong).
  // not_verifiable = corpus couldn't confirm or contradict (file unreachable,
  // section absent from manifest, etc.) → "inconclusive" (different bug).
  // Conflating the two would mislabel an infra failure as a hallucination
  // and erode client trust unfairly.
  if (s === "fabricated" || s === "disagree") {
    return "fabricated";
  }
  if (s === "not_verifiable" || s === "unverified") {
    return "inconclusive";
  }
  if (s === "superseded") return "superseded";
  return v;
}

function extractReport(raw: string): VerifyReport | null {
  const unfenced = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();

  const tryParse = (s: string): VerifyReport | null => {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as VerifyReport;
      }
    } catch {
      /* fall through */
    }
    return null;
  };

  return (
    tryParse(unfenced) ??
    (() => {
      // greedy match — verify report can contain nested objects, so prefer
      // the full {...} span.
      const greedy = unfenced.match(/\{[\s\S]*\}/);
      if (greedy) return tryParse(greedy[0]);
      return null;
    })()
  );
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

async function callVerifyAgent(
  payload: VerifyBatchPayload,
): Promise<OrchestratorResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ORCHESTRATOR_CHAT_TIMEOUT_MS);
  try {
    const res = await fetch(`${getOrchestratorUrl(VERIFY_AGENT)}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ORCHESTRATOR_TOKEN}`,
        "X-GoClaw-User-Id": ORCHESTRATOR_USER_ID,
        "X-GoClaw-Agent-Id": VERIFY_AGENT,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: buildVerifyUserMessage(payload),
          },
        ],
      }),
      signal: AbortSignal.timeout
        ? AbortSignal.timeout(ORCHESTRATOR_CHAT_TIMEOUT_MS)
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

// ── Cite-pre-filter helpers ─────────────────────────────────────────

/**
 * Markers that introduce a tail block of bare cross-references in the
 * answer body. Anything appearing for the first time AFTER one of these
 * markers is a list-item, not a specific assertion the model is making.
 */
const REFERENCE_BLOCK_PATTERNS: RegExp[] = [
  /(?:📚\s*)?References?\s*:?\s*$/im,
  /Related\s+provisions?\s*:?\s*$/im,
  /Sources?\s*:?\s*$/im,
];

/**
 * Returns the earliest character index of any reference-block marker
 * in `answer`, or `Infinity` if no marker is present.
 */
function earliestReferenceBlockIndex(answer: string): number {
  let earliest = Infinity;
  for (const re of REFERENCE_BLOCK_PATTERNS) {
    const m = re.exec(answer);
    if (m && m.index < earliest) earliest = m.index;
  }
  return earliest;
}

/**
 * True when `section` (e.g. "26", "26(1)", "263A") appears in `answer`
 * BEFORE any References/Related-provisions tail block. False when the
 * cite only shows up in the tail list (no specific assertion to audit
 * against).
 */
function isSpecificallyCitedInAnswer(answer: string, section: string): boolean {
  // Take just the leading numeric/alphanumeric prefix so "26(1)(ক)" reduces
  // to "26" — that prefix should appear in body prose if the section is
  // genuinely asserted, even when the same line continues with a subsection.
  const prefix = section.replace(/[^0-9A-Za-z].*$/, "").trim();
  if (!prefix) return true; // unparseable cite — be lenient, let verify decide
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match "Section X", "§X", or bare "X" only after a strong cue. Bare
  // matches are too noisy ("see 26 of the report") so require Section/§.
  const cueRe = new RegExp(`(?:Section|§|ধারা)\\s*${escaped}\\b`, "i");
  const firstMatch = answer.search(cueRe);
  if (firstMatch === -1) return false;
  return firstMatch < earliestReferenceBlockIndex(answer);
}

// ── Handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth — any signed-in user can verify their own citations.
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
  if (typeof answer !== "string" || answer.trim().length === 0) {
    return NextResponse.json(
      { error: "answer must be a non-empty string" },
      { status: 400 }
    );
  }
  if (language !== "en" && language !== "bn") {
    return NextResponse.json(
      { error: "language must be 'en' or 'bn'" },
      { status: 400 }
    );
  }
  if (!Array.isArray(citations) || citations.length === 0) {
    return NextResponse.json(
      { error: "citations must be a non-empty array" },
      { status: 400 }
    );
  }
  if (!citations.every(isCitation)) {
    return NextResponse.json(
      {
        error:
          "each citation must have {section, document_id} strings (verbatim optional)",
      },
      { status: 400 }
    );
  }
  const typedCitations: CitationInput[] = citations;

  // Tie the work to a chat_jobs row so reloads rehydrate the badge.
  // Client may supply its own uuid so the sidebar entry shares identity
  // with the row — otherwise we allocate and return it.
  const clientJobId =
    typeof body.job_id === "string" && UUID_RE.test(body.job_id)
      ? body.job_id
      : null;
  const conversationId =
    typeof body.conversation_id === "string" && UUID_RE.test(body.conversation_id)
      ? body.conversation_id
      : null;
  const messageId =
    typeof body.message_id === "string" && UUID_RE.test(body.message_id)
      ? body.message_id
      : null;

  const supabase = createServerClient();
  let jobId: string | null = null;
  try {
    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      kind: "verify",
      state: "running",
      label: language === "bn" ? "উদ্ধৃতি যাচাই" : "Verify citations",
      conversation_id: conversationId,
      message_id: messageId,
      payload: { question, citations: typedCitations },
    };
    if (clientJobId) insertPayload.id = clientJobId;
    const { data: jobRow, error: jobErr } = await supabase
      .from("chat_jobs")
      .insert(insertPayload)
      .select("id")
      .single();
    if (jobErr) {
      console.warn("[verify] chat_jobs insert failed:", jobErr.message);
    } else if (jobRow?.id) {
      jobId = jobRow.id as string;
    }
  } catch (persistErr) {
    console.warn("[verify] chat_jobs insert threw:", persistErr);
  }

  // 3. Pre-filter citations before calling verify.
  //
  // (a) Dedup by {document_id, section} — chat-proxy occasionally emits
  //     the same section twice (e.g. body ref + References block); we
  //     only need one verdict per unique cite.
  // (b) Drop cross-reference-only cites — sections that appear ONLY in
  //     a "References:" / "📚 References" / "Related provisions:" tail
  //     block, never asserted in the answer body. Verify can't audit a
  //     bare list entry; it returns Inconclusive every time, cluttering
  //     the verdict UI for no signal.
  //
  // If filter (b) strips everything, fall back to (a) — better to verify
  // something than nothing.
  const dedupedCitations = (() => {
    const seen = new Set<string>();
    return typedCitations.filter((c) => {
      const key = `${c.document_id ?? ""}::${c.section}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const verifiableCitations = (() => {
    const filtered = dedupedCitations.filter((c) =>
      isSpecificallyCitedInAnswer(answer, c.section),
    );
    return filtered.length > 0 ? filtered : dedupedCitations;
  })();

  // 4. Call the verify agent.
  //
  // Translate the VerifyButton's {question, answer, citations} request
  // into the batch-claims schema verify now expects. One claim per
  // citation, with the user question + assistant answer as the
  // conversation context so verify can read the full turn.
  const startedAt = Date.now();
  const agentPayload: VerifyBatchPayload = {
    claims: verifiableCitations.map((c, i) => ({
      id: `c${i}`,
      claim: `${answer.slice(0, 400)} — specifically the claim about ${c.section}${c.document_id ? ` (${c.document_id})` : ""}${c.verbatim ? ` quoting "${c.verbatim.slice(0, 300)}"` : ""}`,
      expected_section: c.document_id
        ? `${c.document_id} §${c.section}`
        : c.section,
    })),
    conversation_context: [
      `User: ${question.slice(0, 600)}`,
      `Assistant: ${answer.slice(0, 600)}`,
    ],
  };
  const result = await callVerifyAgent(agentPayload);

  const finalizeJob = async (
    state: "done" | "error",
    patch: { result?: unknown; error?: string },
  ) => {
    if (!jobId) return;
    try {
      await supabase
        .from("chat_jobs")
        .update({
          state,
          completed_at: new Date().toISOString(),
          ...(patch.result !== undefined ? { result: patch.result } : {}),
          ...(patch.error !== undefined ? { error: patch.error.slice(0, 500) } : {}),
        })
        .eq("id", jobId)
        .eq("user_id", userId);
    } catch (err) {
      console.warn("[verify] chat_jobs finalize failed:", err);
    }
  };

  if (!result.ok) {
    const isInfra = result.status >= 500 || result.status === 504;
    console.warn(
      `[verify] orchestrator call failed status=${result.status} err=${result.error.slice(
        0,
        200
      )}`
    );
    await finalizeJob("error", { error: result.error });
    if (isInfra) {
      return NextResponse.json(
        {
          job_id: jobId,
          error: "verify_infra_unavailable",
          message:
            "Citation verification is temporarily offline. Please try again later.",
          details: result.error.slice(0, 200),
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        job_id: jobId,
        error: "verify_upstream_error",
        message: result.error.slice(0, 200),
      },
      { status: 502 }
    );
  }

  // 4. Parse JSON report
  const rawReport = extractReport(result.content);
  if (!rawReport) {
    console.error(
      `[verify] report parse failed. preview=${result.content.slice(0, 200)}`
    );
    await finalizeJob("error", { error: "verify_parse_error" });
    return NextResponse.json(
      {
        job_id: jobId,
        error: "verify_parse_error",
        message: "Agent response could not be parsed.",
      },
      { status: 502 }
    );
  }
  // The agent occasionally returns its own shape ({verdict, summary,
  // citations_checked}) instead of the canonical {overall_verdict,
  // claims}. Normalize before the UI sees it.
  const report = normalizeReport(rawReport as Record<string, unknown>);
  if (report.error) {
    await finalizeJob("error", { error: report.error });
    return NextResponse.json(
      { job_id: jobId, error: "verify_agent_error", message: report.error.slice(0, 200) },
      { status: 400 }
    );
  }

  const durationMs = Date.now() - startedAt;
  // Attach diagnostics — safe to include even if the agent returned them.
  const responseBody = {
    ...report,
    _duration_ms: durationMs,
    job_id: jobId,
  };

  await finalizeJob("done", { result: responseBody });

  // Persist the audit onto the message row so a page refresh or share
  // snapshot can reproduce the card without rerunning the agent.
  // Tag the source so the PDF export + analytics can distinguish
  // Verify-button audits from the Deep-Search pipeline output.
  if (messageId) {
    try {
      await supabase
        .from("messages")
        .update({ verify_report: { ...report, source: "verify_button" } })
        .eq("id", messageId);
    } catch (err) {
      console.warn("[verify] persist to messages.verify_report failed", err);
    }
  }

  return NextResponse.json(responseBody, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
