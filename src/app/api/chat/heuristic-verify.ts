// Orchestrator-side heuristic auto-trigger for llp-chat-verify on turn-2+.
//
// Background: llp-chat-followup has `delegate` in its tools_config.allow
// allow-list, but the agent never actually fires a delegate tool_call
// (see internal memory on delegate event shape — 0 sessions
// with spawn_depth>0). Phase A's delegation_status plumbing in
// `route.ts` therefore never sees a real pending→complete pair.
//
// Fix: an orchestrator-side rule that fires verify directly as an
// ordinary orchestrator agent whenever the user's turn-2+ message smells
// like a verification-relevant intent. Pure, testable, side-effect
// free — callers own the event emit + timeout handling.
//
// See Brief 8 for the full condition matrix.
import { normalizeSchemaSection } from "@/lib/normalizers/section";

export interface AutoVerifyCitation {
  section?: string | null;
  document?: string | null;
  document_id?: string | null;
  text?: string | null;
}

export interface AutoVerifyPriorTurn {
  role?: string;
  content?: string;
  citations?: AutoVerifyCitation[] | null;
}

export interface AutoVerifyContext {
  turn_index: number;
  user_message: string;
  prior_assistant_turn: AutoVerifyPriorTurn | null;
  /** True when the followup-signaled delegation path will fire for this
   *  request. Set by the caller after inspecting orchestrator response; used
   *  to avoid double-firing heuristic + followup delegation. */
  followup_delegation_signaled: boolean;
}

const DOUBT_PATTERNS: RegExp[] = [
  /\b(sure|certain|really|actually|correct)\b/i,
  /\b(but|however|HR said|instead|rather|wrong|right)\b/i,
  /(DOC-\d{3}|§\s*\d+|section\s*\d+)/i,
  /\b(verify|confirm|double[- ]check|cite|source)\b/i,
];

export function shouldAutoVerify(ctx: AutoVerifyContext): boolean {
  if (!ctx || ctx.turn_index < 2) return false;
  if (ctx.followup_delegation_signaled) return false;
  const prior = ctx.prior_assistant_turn;
  if (!prior) return false;
  const citations = Array.isArray(prior.citations) ? prior.citations : [];
  const hasCitation = citations.some((c) => {
    const docId = typeof c?.document_id === "string" ? c.document_id.trim() : "";
    const section = typeof c?.section === "string" ? c.section.trim() : "";
    const document = typeof c?.document === "string" ? c.document.trim() : "";
    return docId.length > 0 || section.length > 0 || document.length > 0;
  });
  if (!hasCitation) return false;
  const msg = typeof ctx.user_message === "string" ? ctx.user_message : "";
  if (!msg.trim()) return false;
  return DOUBT_PATTERNS.some((p) => p.test(msg));
}

export function sectionFromCitation(
  citation: AutoVerifyCitation | null | undefined,
): string | null {
  if (!citation) return null;
  // Prefer the schema form first (DOC-### §N). normalizeSchemaSection
  // handles "Section 27" / "§27" / bare "27" already.
  const normalized = normalizeSchemaSection(
    citation.section ?? undefined,
    citation.document_id ?? undefined,
  );
  if (normalized) return normalized;
  // Fallback: if section itself already looks like the schema form,
  // hand it back verbatim after whitespace collapse.
  if (typeof citation.section === "string") {
    const m = citation.section.match(/DOC-(\d{3})\s*§\s*(\d+[A-Z]?)/i);
    if (m) return `DOC-${m[1]} §${m[2].toUpperCase()}`;
  }
  return null;
}

/**
 * Best-effort claim synthesis for verify's input.
 *
 * Verify's prompt tolerates fuzzy input (its frontmatter says so), so this
 * is deliberately simple: strip boilerplate, fall back to whichever of
 * {user message, prior assistant preview} carries the challenged fact.
 */
/**
 * True when a turn-2+ user message reads as a challenge to the prior
 * assistant turn. Triggers Deep Search's challenge-mode branch — verify
 * targets the prior answer's citations rather than the new (often
 * empty) draft's. Exported so callOrchestratorDeepSearch can dispatch
 * directly without duplicating the heuristic.
 */
export function looksLikeChallenge(userMsg: string): boolean {
  const trimmed = (userMsg || "").trim();
  return (
    /^(are\s+you\s+sure|is\s+it\s+(?:really|actually|correct)|really\?|but\s+HR|HR\s+said|isn'?t\s+it)/i.test(
      trimmed,
    ) || trimmed.length <= 80
  );
}

export function inferClaimFromUserMessage(
  userMsg: string,
  priorTurn: AutoVerifyPriorTurn | null,
): string {
  const trimmed = (userMsg || "").trim();
  const priorContent =
    typeof priorTurn?.content === "string" ? priorTurn.content.trim() : "";

  // Short challenge (≤80 chars) or one that reads as a yes/no challenge →
  // anchor on prior assistant prose so verify has a factual claim to
  // audit rather than a bare question.
  if (looksLikeChallenge(trimmed) && priorContent) {
    // Strip markdown heading/bold so "**Statutory Provisions:**\n\n" doesn't
    // become the "first sentence" — verify wants one bare factual claim.
    const stripped = priorContent
      .replace(/^\s*\*{1,3}[^*\n]+\*{1,3}\s*:?\s*\n*/g, "")
      .replace(/[*_#`]/g, "")
      .trim();
    const firstSentence = stripped.split(/(?<=[.!?])\s+/)[0] ?? stripped;
    const challengePart = trimmed.slice(0, 160);
    return `${firstSentence.slice(0, 200)} (user challenge: ${challengePart})`;
  }

  return trimmed.slice(0, 300) || priorContent.slice(0, 200);
}
