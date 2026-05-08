// Build the user message sent to llp-chat-verify.
//
// llp-chat-verify reads the corpus directly from its container
// filesystem at the path declared in `VERIFY_CORPUS_ROOT` env. The
// orchestrator ships a BATCH of claims grouped by unique
// section file; verify reads each file once and emits one verdict per
// claim keyed by id. This collapses the old 3-parallel-Opus-calls
// pattern into 1 call per unique file, cutting cost ~66% when
// citations share a root section.
//
// Brief 5 root-cause #3 documented that claude-cli/opus honors the
// last-user-message suffix far more reliably than the system prompt.
// CAPABILITIES.md was acknowledged but ignored when the directive lived
// only in the system context. Prepending the directive to the user
// message is what actually pressures Opus into tool-use mode.

export interface VerifyClaim {
  /** Opaque id the orchestrator uses to match verdict back to citation. */
  id: string;
  /** The assertion to audit (prior assistant prose + specific target). */
  claim: string;
  /** Canonical section reference (e.g. "DOC-010 §264(10)"). */
  expected_section: string;
}

export interface VerifyBatchPayload {
  claims: VerifyClaim[];
  conversation_context: string[];
}

export function buildVerifyUserMessage(payload: VerifyBatchPayload): string {
  const corpusRoot = process.env.VERIFY_CORPUS_ROOT;
  if (!corpusRoot) {
    throw new Error("VERIFY_CORPUS_ROOT env required for verify directive");
  }
  const root = corpusRoot.endsWith("/") ? corpusRoot : `${corpusRoot}/`;
  const directive = [
    `VERIFY TASK — audit each claim in \`claims[]\` against the corpus on your filesystem at ${root}.`,
    "",
    "REQUIRED STEPS (in order):",
    `1. \`read_file ${root}MANIFEST.md\` — confirms corpus layout + supersession chain.`,
    `2. For each distinct section referenced in \`claims[]\`, \`read_file ${root}<DOC-ID>/section-<N>.txt\` ONCE. Multiple claims on the same section share one file read.`,
    `3. If a section file is missing: \`read_file ${root}<DOC-ID>/index.json\` to find the closest match.`,
    "4. Check whether a later amendment doc (DOC-011, DOC-008) touches any cited section.",
    "5. Emit ONE JSON object: `{\"verdicts\":[ ... ]}` with exactly one entry per input claim, keyed by the claim's `id`.",
    "",
    "OUTPUT SCHEMA (strict):",
    '{"verdicts":[{"id":"<claim id>","verdict":"agree"|"disagree"|"partial"|"not_verifiable","section":"DOC-### §N","section_corrected":null|"DOC-### §N","result_summary":"<quote or paraphrase from the file that drove the verdict>"}, ...]}',
    "",
    "HARD RULES:",
    "- Corpus files are your ONLY source of truth. Never cite training knowledge.",
    "- Always `read_file` at least once before emitting any verdict.",
    "- Emit exactly one verdict per input claim, matching by `id`. Do not drop claims. Do not add claims.",
    "- `result_summary` must quote or paraphrase the file passage that drove the verdict.",
    "- If a claim's cited doc/section isn't in MANIFEST.md → that claim's verdict = not_verifiable.",
    "- No prose outside the JSON object. No markdown, no code fences.",
    "",
    "PAYLOAD (parse as JSON — first `{` starts the delegation-request):",
  ].join("\n");
  return `${directive}\n${JSON.stringify(payload)}`;
}
