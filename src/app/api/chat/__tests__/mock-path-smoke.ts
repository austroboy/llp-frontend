// Mock-path NDJSON smoke — exercises the heuristic branch of
// `callOrchestratorContinuation`'s `mockMode` block (route.ts) without needing
// the Next.js + Clerk + Supabase stack. Replicates the event sequence
// that the real handler would emit when orchestrator creds are blanked and
// the heuristic auto-verify conditions are met.
//
// Run: ./node_modules/.bin/tsx src/app/api/chat/__tests__/mock-path-smoke.ts
import {
  shouldAutoVerify,
  sectionFromCitation,
  inferClaimFromUserMessage,
} from "../heuristic-verify";

function mintTraceId() {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `trc_${iso}_${rand}`;
}

const priorAssistantTurn = {
  role: "assistant",
  content:
    "Under DOC-011 §27, the notice period for permanent workers is 120 days.",
  citations: [
    { document_id: "DOC-011", section: "§27", document: "Bangladesh Labour (Amendment) Act, 2026" },
  ],
};

const resolvedHistory = [
  { role: "user", content: "What is the new notice period under the 2026 amendment?" },
  priorAssistantTurn,
  { role: "user", content: "are you sure about 120? HR says 60" },
];

const userMessage = "are you sure about 120? HR says 60";

const heuristicCtx = {
  turn_index: 2,
  user_message: userMessage,
  prior_assistant_turn: priorAssistantTurn,
  followup_delegation_signaled: false,
};

const heuristicFires = shouldAutoVerify(heuristicCtx);
if (!heuristicFires) {
  console.error("[smoke] heuristic did NOT fire — bug in helper wiring.");
  process.exit(1);
}

const traceId = mintTraceId();
const heuristicSection = sectionFromCitation(priorAssistantTurn.citations[0]);
const claim = inferClaimFromUserMessage(userMessage, priorAssistantTurn);

const startedAt = new Date().toISOString();

const pending = {
  event: "delegation_status",
  trace_id: traceId,
  agent: "llp-chat-verify",
  intent: "verify_section_citation",
  section: heuristicSection,
  started_at: startedAt,
  state: "pending",
};

// Simulate the 2s mock delay (compressed to 0 here; timing already verified
// in unit tests — this smoke only validates event shape).
const finishedAt = new Date(Date.parse(startedAt) + 2100).toISOString();

const complete = {
  ...pending,
  state: "complete",
  finished_at: finishedAt,
  verdict: "agree",
  result_summary:
    "(mock heuristic) verify auto-triggered by orchestrator — scripted agree.",
};

// Mock-path also emits a mock answer + title_update + done right after.
const mockAnswer = "(mock) orchestrator unavailable — scripted continuation response for dev.";
const titleUpdate = {
  type: "title_update",
  conversation_id: "conv_mock_0001",
  title: userMessage.slice(0, 57),
};

// Emit NDJSON tail in the same order the real handler would.
const lines = [
  JSON.stringify(pending),
  JSON.stringify(complete),
  JSON.stringify({ type: "text", content: mockAnswer }),
  JSON.stringify(titleUpdate),
  JSON.stringify({ type: "done" }),
];

console.log("--- mock-path NDJSON tail (heuristic-fired branch) ---");
for (const line of lines) console.log(line);
console.log("--- end ---");
console.log(`inferred claim: ${claim}`);
