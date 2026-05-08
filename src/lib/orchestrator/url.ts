/**
 * Per-agent inference-orchestrator URL resolver. Used during the
 * inference-host migration window so phase cutovers can flip one agent
 * class at a time without touching call-site code. Reverts to a single
 * GOCLAW_URL consumer at cleanup.
 *
 * H-11 hardening — `RECOGNIZED_AGENTS` allowlist enforced at the entry
 * point. Today every caller passes a server-controlled constant; the
 * allowlist guarantees one refactor away cannot become an agent-id
 * injection vector.
 */
const RECOGNIZED_AGENTS: ReadonlySet<string> = new Set([
  // Live keys (verified callers — chat/route.ts CONTINUATION_AGENT,
  // chat/verify/route.ts VERIFY_AGENT, chat/summarize/route.ts,
  // chat/filegen/route.ts FILEGEN_AGENT/FILEGEN_DRAFT_AGENT,
  // recover/run-recover.ts).
  "llp-chat-followup",
  "llp-chat-verify",
  "llp-chat-summarize",
  "llp-chat-filegen",
  "llp-chat-filegen-draft",
  "llp-chat-recover",
]);

export function getOrchestratorUrl(agentKey: string): string {
  if (!RECOGNIZED_AGENTS.has(agentKey)) {
    throw new Error(`unknown_orchestrator_agent: ${agentKey}`);
  }

  const fallback = process.env.GOCLAW_URL;

  if (agentKey.endsWith("-summarize") || agentKey.endsWith("-filegen") || agentKey.endsWith("-filegen-draft")) {
    const override = process.env.GOCLAW_URL_HELPERS ?? fallback;
    if (!override) throw new Error("GOCLAW_URL is not set");
    return override;
  }
  if (agentKey === "llp-chat-followup") {
    const override = process.env.GOCLAW_URL_FOLLOWUP ?? fallback;
    if (!override) throw new Error("GOCLAW_URL is not set");
    return override;
  }
  if (agentKey === "llp-chat-verify") {
    const override = process.env.GOCLAW_URL_VERIFY ?? fallback;
    if (!override) throw new Error("GOCLAW_URL is not set");
    return override;
  }
  if (agentKey === "llp-chat-recover") {
    const override = process.env.GOCLAW_URL_RECOVER ?? fallback;
    if (!override) throw new Error("GOCLAW_URL is not set");
    return override;
  }
  if (!fallback) throw new Error("GOCLAW_URL is not set");
  return fallback;
}
