import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrchestratorUrl } from "@/lib/orchestrator/url";
import {
  type Tier,
  type ClerkTierMetadata,
  resolveTier,
} from "@/lib/ai/framework-types";
import {
  uploadGeneratedFile,
  getSignedUrl,
  rowToClientFile,
  MIME_BY_FORMAT as FILES_MIME_BY_FORMAT,
  type GeneratedFileFormat,
} from "@/lib/generated-files";
import { createServerClient } from "@/lib/supabase";
import {
  isResponseSchemaLike,
  type ResponseSchema,
} from "@/lib/documents/response-schema";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// File generation through the agent-orchestrator's `llp-chat-filegen`
// agent (Claude Opus via claude-cli provider). Unlike the Gemini-based
// generator, this pipeline produces ACTUAL BINARY FILES
// (docx/pdf/pptx/xlsx) via Claude Code skills installed on the
// orchestrator container.
//
// Phase 2 change: instead of streaming bytes back to the client directly,
// we persist the binary to Supabase Storage + insert a generated_files
// row, then return JSON metadata (including a 1-hour signed URL). The
// browser fetches the binary later through the signed URL when the canvas
// renderer actually needs it.
//
// Pipeline:
//   1. Client POSTs {docType, outputFormat, citedSections, userInputs, ...}
//   2. We forward a single user message (JSON-encoded payload) to the agent.
//   3. Agent reads AGENTS.md, runs the appropriate skill, writes the file
//      to its session workspace, and returns a strict JSON envelope.
//   4. We extract the filename + session id, sign the workspace file path
//      via /v1/files/sign, fetch the file bytes into an ArrayBuffer.
//   5. Upload bytes to Supabase Storage (chat-generated-files bucket), insert
//      a row in generated_files, and return JSON metadata with a signed URL.
//
// Infra: when the orchestrator is degraded we surface 503 filegen_infra_unavailable so
// the UI can show a graceful fallback. Followup chips are unaffected by this
// file — they live in src/app/api/chat/followup/route.ts.

export const maxDuration = 300; // up to 5 min — file gen can take a while
export const dynamic = "force-dynamic";

const ORCHESTRATOR_TOKEN = process.env.GOCLAW_TOKEN || "";
const ORCHESTRATOR_USER_ID = process.env.GOCLAW_USER_ID || "admin";
const FILEGEN_AGENT = "llp-chat-filegen";
// DB-06: custom free-form path routes to a sibling agent (FG-01) that
// emits llp-response-schema draft JSON instead of files. The main agent
// keeps the legacy envelope path so non-custom flows are unchanged.
const FILEGEN_DRAFT_AGENT = "llp-chat-filegen-draft";
const ORCHESTRATOR_CHAT_TIMEOUT_MS = 270_000; // 4m30s for the whole agent run
const ORCHESTRATOR_FILE_TIMEOUT_MS = 30_000;
const SESSION_WORKSPACE_PREFIX = "/app/workspace/agent-";

// ── Input shapes ────────────────────────────────────────────────────

interface CitedSectionInput {
  section: string;
  document: string;
  verbatim: string;
}

type OutputFormat = "docx" | "pdf" | "pptx" | "xlsx";

interface RequestBody {
  docType?: unknown;
  outputFormat?: unknown;
  citedSections?: unknown;
  userInputs?: unknown;
  perspective?: unknown;
  language?: unknown;
  chatContext?: unknown;
  /** DB-02: free-form user instruction. Only populated when
   *  docType === "custom" — routed to llp-chat-filegen-draft in DB-06. */
  userInstruction?: unknown;
  /** Client-generated UUID used as the chat_jobs row id so the sidebar
   *  badge survives a reload. Optional. */
  job_id?: unknown;
  /** Optional routing so the badge can jump back to the originating
   *  message / conversation on click. */
  conversation_id?: unknown;
  message_id?: unknown;
}

const ALLOWED_PERSPECTIVES = ["employer", "worker", "hr", "neutral"] as const;
type Perspective = (typeof ALLOWED_PERSPECTIVES)[number];
const ALLOWED_FORMATS: readonly OutputFormat[] = [
  "docx",
  "pdf",
  "pptx",
  "xlsx",
] as const;

const MIME_BY_FORMAT: Record<OutputFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function isPerspective(v: unknown): v is Perspective {
  return (
    typeof v === "string" &&
    (ALLOWED_PERSPECTIVES as readonly string[]).includes(v)
  );
}

function isOutputFormat(v: unknown): v is OutputFormat {
  return typeof v === "string" && (ALLOWED_FORMATS as readonly string[]).includes(v);
}

function isCitedSection(v: unknown): v is CitedSectionInput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.section === "string" &&
    typeof o.document === "string" &&
    typeof o.verbatim === "string"
  );
}

// ── JSON envelope extractor ─────────────────────────────────────────

interface AgentEnvelope {
  filename?: string;
  /** Some skills (e.g. llp-chat-filegen's docx skill) emit `file_path`
   *  instead of `filename`. Accept both — we basename() it anyway. */
  file_path?: string;
  /** Newer skills wrap metadata in a nested `file` object:
   *  `{file:{path, filename, format, size_bytes}}`. Accept that too. */
  file?: {
    path?: string;
    filename?: string;
    format?: string;
    size_bytes?: number;
  };
  format?: string;
  summary?: string;
  cited_sections?: unknown[];
  error?: string;
}

function extractEnvelope(raw: string): AgentEnvelope | null {
  const unfenced = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();

  const tryParse = (s: string): AgentEnvelope | null => {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as AgentEnvelope;
      }
    } catch {
      /* fall through */
    }
    return null;
  };

  return (
    tryParse(unfenced) ??
    (() => {
      const nonGreedy = unfenced.match(/\{[\s\S]*?\}/);
      if (nonGreedy) return tryParse(nonGreedy[0]);
      return null;
    })() ??
    (() => {
      const greedy = unfenced.match(/\{[\s\S]*\}/);
      if (greedy) return tryParse(greedy[0]);
      return null;
    })()
  );
}

// ── Session id extraction ───────────────────────────────────────────
// Orchestrator chat completion responses use `id: "chatcmpl-<hex>"`. The session
// workspace path is `/app/workspace/agent-<agent_key>-<channel>-<user>-<hex>/`
// so we strip the prefix to recover the hex.
function extractSessionId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const m = id.match(/^chatcmpl-([a-f0-9]+)$/i);
  return m ? m[1] : null;
}

// ── Orchestrator callers ────────────────────────────────────────────

interface OrchestratorOk {
  ok: true;
  content: string;
  sessionId: string;
  usage?: Record<string, number>;
}
interface OrchestratorErr {
  ok: false;
  status: number;
  error: string;
}
type OrchestratorResult = OrchestratorOk | OrchestratorErr;

const MAIN_PREAMBLE = `IMPORTANT — FILE LOCATION:
Save the file in your CURRENT WORKING DIRECTORY using a RELATIVE path (e.g. \`service_certificate_2026-04-24.docx\`). Do NOT write to /tmp/ or any other absolute path — the caller only signs files under your workspace. Python packages python-docx, reportlab, fpdf2, openpyxl, python-pptx are preinstalled — do not run pip.

IMPORTANT — BANGLA PDF FONTS:
If the output contains Bangla characters AND format is pdf, you MUST register Noto Sans Bengali before rendering, otherwise Bangla glyphs appear as tofu (black boxes) in the PDF.
Fonts are available at:
  /usr/share/fonts/noto/NotoSansBengali-Regular.ttf
  /usr/share/fonts/noto/NotoSansBengali-Bold.ttf
fpdf2 example:
  pdf.add_font("Noto", "", "/usr/share/fonts/noto/NotoSansBengali-Regular.ttf")
  pdf.add_font("Noto", "B", "/usr/share/fonts/noto/NotoSansBengali-Bold.ttf")
  pdf.set_font("Noto", size=11)
reportlab example:
  from reportlab.pdfbase import pdfmetrics
  from reportlab.pdfbase.ttfonts import TTFont
  pdfmetrics.registerFont(TTFont("Noto", "/usr/share/fonts/noto/NotoSansBengali-Regular.ttf"))
  pdfmetrics.registerFont(TTFont("Noto-Bold", "/usr/share/fonts/noto/NotoSansBengali-Bold.ttf"))
  # then use "Noto" / "Noto-Bold" font names in styles
Section numbers in brackets may remain Latin (Section 2, 149) but Bangla body text and labels must use Noto.

IMPORTANT — RESPONSE SHAPE:
Respond with EXACTLY ONE JSON object, no prose, no code fences, no preamble like "DOCX file created.".
Schema (use THESE flat keys — no nested "file" object, no "status" field):
{"filename":"<basename.ext>","format":"<docx|pdf|pptx|xlsx>","summary":"<1 short sentence>","cited_sections":[<strings>]}

INPUT PAYLOAD:
`;

const DRAFT_PREAMBLE = `You are LLP FileGen Draft. Emit EXACTLY ONE JSON object conforming to llp-response-schema. First char \`{\` last char \`}\`. NO markdown, NO prose, NO code fences, NO commentary.

REQUIRED top-level keys (use THESE exact names):
- tier: 1 | 2 | 3
- document_type: string (snake_case)
- language: "en" | "bn" | "mixed"
- role_context: "worker" | "employer" | "hr" | "general" (map from input.perspective; "neutral" → "general")
- format: "docx" | "pdf" | "pptx" | "xlsx" (from input.output_format)
- title: string
- body_sections: [{ heading: string, paragraphs?: string[], bullets?: string[] }]
- citations: [] (tier 2/3) OR [{ doc_id: "DOC-###", section: "§N", quote: string }] (tier 1, non-empty)
- disclaimer: null (tier 1) OR "This is an AI-drafted template, not LLP-verified. For Bangladesh labour law documents, use the guided flow." (tier 2/3)
- metadata: { jurisdiction: "BD", generated_at: ISO8601, filegen_version: "0.1" }

Tier routing: Bangladesh labour-law canon (termination/grievance/show_cause/defense/resignation/leave/salary/maternity/appointment/service_certificate) = tier 1. HR/business generic = tier 2. Arbitrary = tier 3. If unsure → tier 3.

Use {{placeholder}} tokens for missing values. Do NOT invent names/dates. Do NOT emit \`status\`, \`missing_fields\`, \`document\`, \`template_text\` — those are WRONG keys.

INPUT PAYLOAD:
`;

async function callFilegenAgent(
  payload: unknown,
  agentKey: string = FILEGEN_AGENT,
): Promise<OrchestratorResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ORCHESTRATOR_CHAT_TIMEOUT_MS);
  const isDraft = agentKey === FILEGEN_DRAFT_AGENT;
  const userContent = isDraft
    ? DRAFT_PREAMBLE + JSON.stringify(payload)
    : MAIN_PREAMBLE + JSON.stringify(payload);
  try {
    const res = await fetch(`${getOrchestratorUrl(agentKey)}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ORCHESTRATOR_TOKEN}`,
        "X-GoClaw-User-Id": ORCHESTRATOR_USER_ID,
        "X-GoClaw-Agent-Id": agentKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: userContent }],
      }),
      signal: controller.signal,
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
      id?: unknown;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: Record<string, number>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const sessionId = extractSessionId(data.id);
    if (!content) return { ok: false, status: 502, error: "empty_agent_response" };
    if (!sessionId)
      return { ok: false, status: 502, error: "missing_session_id" };
    return { ok: true, content, sessionId, usage: data.usage };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 504, error: `fetch_error: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

interface SignedUrl {
  ok: true;
  url: string; // relative, starts with /v1/files/...
}
interface SignErr {
  ok: false;
  status: number;
  error: string;
}

async function signWorkspacePath(
  absolutePath: string
): Promise<SignedUrl | SignErr> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ORCHESTRATOR_FILE_TIMEOUT_MS);
  try {
    const res = await fetch(`${getOrchestratorUrl(FILEGEN_AGENT)}/v1/files/sign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ORCHESTRATOR_TOKEN}`,
        "X-GoClaw-User-Id": ORCHESTRATOR_USER_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: absolutePath }),
      signal: controller.signal,
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
        error: bodyText.slice(0, 200) || `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as { url?: unknown };
    if (typeof data.url !== "string" || !data.url.startsWith("/v1/files/")) {
      return {
        ok: false,
        status: 502,
        error: "sign_response_malformed",
      };
    }
    return { ok: true, url: data.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 504, error: `sign_fetch_error: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

// Fetch the file body via the signed URL and buffer it into memory so we
// can both push to Supabase Storage *and* emit size metadata. The files
// are small (<< 10 MB for any sane doc) so buffering is fine.
async function fetchSignedFileBytes(signedRelativeUrl: string): Promise<
  | {
      ok: true;
      bytes: ArrayBuffer;
      contentType: string | null;
    }
  | { ok: false; status: number; error: string }
> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ORCHESTRATOR_FILE_TIMEOUT_MS);
  try {
    const res = await fetch(`${getOrchestratorUrl(FILEGEN_AGENT)}${signedRelativeUrl}`, {
      headers: {
        "X-GoClaw-User-Id": ORCHESTRATOR_USER_ID,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status || 502,
        error: txt.slice(0, 200) || `HTTP ${res.status}`,
      };
    }
    const bytes = await res.arrayBuffer();
    return {
      ok: true,
      bytes,
      contentType: res.headers.get("Content-Type"),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 504, error: `file_fetch_error: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

// ── Handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // 2. Tier gating — Mini+ only
  let tier: Tier = "free_subscribed";
  try {
    const user = await currentUser();
    const metadata = user?.publicMetadata as ClerkTierMetadata | undefined;
    if (metadata?.tier) tier = resolveTier(metadata);
  } catch {
    // keep default
  }
  if (tier === "free_guest" || tier === "free_subscribed") {
    return NextResponse.json(
      {
        error: "upgrade_required",
        message: "Document generation requires Mini subscription or higher",
        upgradeUrl: "/pricing",
      },
      { status: 403 }
    );
  }

  // 3. Parse + validate body
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const {
    docType,
    outputFormat,
    citedSections,
    userInputs,
    perspective,
    language,
    chatContext,
  } = body;

  if (typeof docType !== "string" || docType.trim().length === 0) {
    return NextResponse.json(
      { error: "docType must be a non-empty string" },
      { status: 400 }
    );
  }
  const isCustom = docType === "custom";
  if (!isOutputFormat(outputFormat)) {
    return NextResponse.json(
      { error: "outputFormat must be one of docx|pdf|pptx|xlsx" },
      { status: 400 }
    );
  }
  if (!isPerspective(perspective)) {
    return NextResponse.json(
      { error: "perspective must be employer|worker|hr|neutral" },
      { status: 400 }
    );
  }
  if (language !== "en" && language !== "bn") {
    return NextResponse.json(
      { error: "language must be 'en' or 'bn'" },
      { status: 400 }
    );
  }
  // Custom path may legitimately start with zero citations (user
  // kicks off the builder from a cold conversation). Non-custom paths
  // still require cited sections so tier-1 letters stay grounded.
  if (!Array.isArray(citedSections)) {
    return NextResponse.json(
      { error: "citedSections must be an array" },
      { status: 400 }
    );
  }
  if (!isCustom && citedSections.length === 0) {
    return NextResponse.json(
      { error: "citedSections must be a non-empty array" },
      { status: 400 }
    );
  }
  if (!citedSections.every(isCitedSection)) {
    return NextResponse.json(
      {
        error:
          "each citedSection must have {section, document, verbatim} (all strings)",
      },
      { status: 400 }
    );
  }
  const typedCited: CitedSectionInput[] = citedSections;
  const typedInputs: Record<string, unknown> =
    userInputs && typeof userInputs === "object" && !Array.isArray(userInputs)
      ? (userInputs as Record<string, unknown>)
      : {};
  const typedContext: string =
    typeof chatContext === "string" ? chatContext : "";
  const typedInstruction: string =
    typeof body.userInstruction === "string" ? body.userInstruction.trim() : "";
  if (isCustom && typedInstruction.length === 0) {
    return NextResponse.json(
      { error: "userInstruction required for custom docType" },
      { status: 400 }
    );
  }

  // Tie the work to a chat_jobs row so reloads rehydrate the sidebar.
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
      kind: "filegen",
      state: "running",
      label: `${docType} (${outputFormat})`,
      conversation_id: conversationId,
      message_id: messageId,
      payload: { docType, outputFormat, perspective, language },
    };
    if (clientJobId) insertPayload.id = clientJobId;
    const { data: jobRow, error: jobErr } = await supabase
      .from("chat_jobs")
      .insert(insertPayload)
      .select("id")
      .single();
    if (jobErr) {
      console.warn("[filegen] chat_jobs insert failed:", jobErr.message);
    } else if (jobRow?.id) {
      jobId = jobRow.id as string;
    }
  } catch (persistErr) {
    console.warn("[filegen] chat_jobs insert threw:", persistErr);
  }

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
      console.warn("[filegen] chat_jobs finalize failed:", err);
    }
  };

  // 4. Call the filegen agent
  const startedAt = Date.now();
  const agentKey = isCustom ? FILEGEN_DRAFT_AGENT : FILEGEN_AGENT;
  const agentPayload: Record<string, unknown> = {
    doc_type: docType,
    output_format: outputFormat,
    cited_sections: typedCited,
    user_inputs: typedInputs,
    perspective,
    language,
    chat_context: typedContext,
  };
  if (isCustom) {
    agentPayload.user_instruction = typedInstruction;
  }
  const result = await callFilegenAgent(agentPayload, agentKey);

  if (!result.ok) {
    const isInfra = result.status >= 500 || result.status === 504;
    console.warn(
      `[filegen] orchestrator call failed status=${result.status} err=${result.error.slice(
        0,
        200
      )}`
    );
    await finalizeJob("error", { error: result.error });
    if (isInfra) {
      return NextResponse.json(
        {
          job_id: jobId,
          error: "filegen_infra_unavailable",
          message:
            "File generation is temporarily offline. Please try again later.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        job_id: jobId,
        error: "filegen_upstream_error",
      },
      { status: 502 }
    );
  }

  // 5. Parse JSON envelope
  const envelope = extractEnvelope(result.content);
  if (!envelope) {
    console.error(
      `[filegen] envelope parse failed. session=${result.sessionId} preview=${result.content.slice(0, 200)}`
    );
    await finalizeJob("error", { error: "filegen_parse_error" });
    return NextResponse.json(
      {
        job_id: jobId,
        error: "filegen_parse_error",
        message: "Agent response could not be parsed.",
      },
      { status: 502 }
    );
  }

  // 5a. Custom path (DB-06): draft agent emits a llp-response-schema
  // object directly. No file sign, no Supabase upload — the canvas
  // (DB-07) consumes the JSON. Envelope-style {filename,...} replies
  // from the draft agent are rejected because they mean the agent
  // ignored its Phase-1 constraint.
  if (isCustom) {
    if (envelope.error) {
      await finalizeJob("error", { error: envelope.error });
      return NextResponse.json(
        { job_id: jobId, error: "filegen_agent_error", message: envelope.error.slice(0, 200) },
        { status: 400 }
      );
    }
    if (!isResponseSchemaLike(envelope)) {
      console.error(
        `[filegen] draft schema invalid. session=${result.sessionId} preview=${result.content.slice(0, 200)}`
      );
      await finalizeJob("error", { error: "filegen_draft_schema_invalid" });
      return NextResponse.json(
        {
          job_id: jobId,
          error: "filegen_draft_schema_invalid",
          message: "Draft agent returned JSON that did not match llp-response-schema.",
        },
        { status: 502 }
      );
    }
    const draft: ResponseSchema = envelope;
    const durationMs = Date.now() - startedAt;
    await finalizeJob("done", {
      result: {
        draft_ready: true,
        tier: draft.tier,
        format: draft.format,
        document_type: draft.document_type,
        title: draft.title,
      },
    });
    return NextResponse.json(
      {
        job_id: jobId,
        draft,
        durationMs,
      },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }

  if (envelope.error) {
    await finalizeJob("error", { error: envelope.error });
    return NextResponse.json(
      { job_id: jobId, error: "filegen_agent_error", message: envelope.error.slice(0, 200) },
      { status: 400 }
    );
  }
  // Accept flat `{filename}`, flat `{file_path}`, or nested
  // `{file:{path, filename}}`. If the agent gave us an absolute path,
  // sign that directly — don't reconstruct from the session workspace
  // prefix (some skills write outside the session workspace, e.g.
  // /app/http/admin/...).
  const nestedFile = envelope.file;
  const absolutePathCandidate =
    (typeof envelope.file_path === "string" && envelope.file_path) ||
    (nestedFile && typeof nestedFile.path === "string" && nestedFile.path) ||
    "";
  const rawFilename =
    (typeof envelope.filename === "string" && envelope.filename) ||
    (nestedFile && typeof nestedFile.filename === "string" && nestedFile.filename) ||
    absolutePathCandidate ||
    "";
  if (!rawFilename) {
    await finalizeJob("error", { error: "missing_filename" });
    return NextResponse.json(
      { job_id: jobId, error: "filegen_parse_error", message: "Missing filename in agent reply" },
      { status: 502 }
    );
  }

  // Basic sanitation — agent controls the filename, but it must not escape
  // the session workspace. Strip any path prefix, null bytes, and leading
  // dots; keep only a simple basename.
  const lastSep = Math.max(rawFilename.lastIndexOf("/"), rawFilename.lastIndexOf("\\"));
  const base = lastSep >= 0 ? rawFilename.slice(lastSep + 1) : rawFilename;
  const filename = base.replace(/\x00/g, "").trim();
  if (!filename || filename.startsWith(".") || filename.length > 200) {
    await finalizeJob("error", { error: "filegen_invalid_filename" });
    return NextResponse.json(
      { job_id: jobId, error: "filegen_invalid_filename" },
      { status: 502 }
    );
  }

  // 6. Sign the workspace file.
  // The orchestrator's /v1/files/sign endpoint only serves paths under /app/workspace/.
  // The main filegen agent's cwd is /app/http/<user>/ (channel routing, not
  // /app/workspace/agent-<session>/), so we've symlinked
  // /app/workspace/http -> /app/http at infra level and use the channel
  // path as the default fallback when the agent returns just a basename.
  const rewriteForSigner = (p: string): string =>
    p.startsWith("/app/http/") ? p.replace(/^\/app\/http\//, "/app/workspace/http/") : p;
  const workspacePath = absolutePathCandidate.startsWith("/")
    ? rewriteForSigner(absolutePathCandidate)
    : `/app/workspace/http/${ORCHESTRATOR_USER_ID}/${filename}`;
  const signed = await signWorkspacePath(workspacePath);
  if (!signed.ok) {
    console.error(
      `[filegen] sign failed status=${signed.status} err=${signed.error} path=${workspacePath}`
    );
    await finalizeJob("error", { error: `filegen_sign_failed: ${signed.error}` });
    return NextResponse.json(
      {
        job_id: jobId,
        error: "filegen_sign_failed",
        message:
          signed.status === 403
            ? "Generated file is outside the allowed workspace."
            : "Could not sign file URL.",
        details: signed.error,
      },
      { status: 502 }
    );
  }

  // 7. Fetch the file bytes via signed URL (buffered for storage upload)
  const fetched = await fetchSignedFileBytes(signed.url);
  if (!fetched.ok) {
    console.error(
      `[filegen] file fetch failed status=${fetched.status} err=${fetched.error} path=${workspacePath}`
    );
    await finalizeJob("error", { error: `filegen_file_not_found: ${fetched.error}` });
    return NextResponse.json(
      {
        job_id: jobId,
        error: "filegen_file_not_found",
        message:
          "The file was reported by the agent but could not be retrieved.",
        details: fetched.error,
      },
      { status: 502 }
    );
  }

  const nestedFormat = nestedFile?.format;
  const finalFormat =
    (typeof envelope.format === "string" &&
      isOutputFormat(envelope.format) &&
      envelope.format) ||
    (typeof nestedFormat === "string" &&
      isOutputFormat(nestedFormat) &&
      nestedFormat) ||
    outputFormat;
  const mime = FILES_MIME_BY_FORMAT[finalFormat as GeneratedFileFormat]
    || MIME_BY_FORMAT[finalFormat]
    || fetched.contentType
    || "application/octet-stream";

  // 8. Persist to Supabase Storage + generated_files catalog
  try {
    const row = await uploadGeneratedFile({
      userId,
      conversationId: null,
      fileName: filename,
      format: finalFormat as GeneratedFileFormat,
      kind: "generated",
      docType,
      bytes: fetched.bytes,
      contentType: mime,
    });

    // 9. Mint a signed URL so the client can preview without another round-trip.
    const signedResult = await getSignedUrl(row.id, userId, 3600);
    if (!signedResult) {
      // Highly unlikely — the row we just wrote should pass ownership.
      console.error(
        `[filegen] signed-url follow-up returned null for row=${row.id}`
      );
    }

    const durationMs = Date.now() - startedAt;
    const clientFile = rowToClientFile(row);
    const responseBody = {
      job_id: jobId,
      file: clientFile,
      signedUrl: signedResult?.url ?? null,
      expiresAt: signedResult?.expiresAt ?? null,
      summary: (envelope.summary || "").slice(0, 500),
      durationMs,
    };
    // Persist the file id + format on the job so reload hydration can
    // jump straight to the file without re-calling the API.
    await finalizeJob("done", {
      result: {
        file_id: clientFile.id,
        format: clientFile.format,
        fileName: clientFile.fileName,
        summary: responseBody.summary,
      },
    });
    return NextResponse.json(responseBody, {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const tableMissing =
      /does not exist/i.test(msg) || /Bucket not found/i.test(msg);
    console.error(`[filegen] persist failed: ${msg}`);
    await finalizeJob("error", { error: msg });
    if (tableMissing) {
      return NextResponse.json(
        {
          job_id: jobId,
          error: "files_infra_missing",
          message:
            "Supabase Storage bucket or generated_files table not provisioned. Apply docs/migrations/2026-04-18-*.",
          details: msg.slice(0, 200),
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        job_id: jobId,
        error: "filegen_persist_failed",
        message: msg.slice(0, 200),
      },
      { status: 500 }
    );
  }
}
