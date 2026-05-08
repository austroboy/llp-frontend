// PB Task 3 (D1) — turn-1 batch verify (sync stream-first).
//
// Pure helpers + a thin orchestrator that batches citations by
// {document_id, root_section} and fans out per-group verify calls in
// parallel. The orchestrator accepts the agent caller as
// dependency injection so the route can wire its own closure-scoped
// `callOrchestratorContinuationAgent` without exporting it.
//
// Triggered AFTER the chat-proxy answer text streams to the user but
// BEFORE the final controller close on the first-turn path. Because the
// answer is already on screen, the user reads while verify runs in the
// background — perceived latency is near zero.
//
// Flag: ENABLE_TURN1_VERIFY=1 (default OFF). Goes hand-in-hand with
// G1 honesty guard's ENABLE_HONESTY_GUARD on the first-turn path.

import { buildVerifyUserMessage, type VerifyClaim } from "./build-user-message";
import { parseVerifyBatch, type BatchVerdict } from "./parse-batch";
import { hashCacheKey, getModuleVerifyCache } from "./cache";
import { normalizeSchemaSection } from "@/lib/normalizers/section";

// Mirrors the shape used by `runVerifyBatch` in src/app/api/chat/route.ts.
// Defined here so the helper has zero coupling to route-internal types.
export interface Turn1Citation {
  section?: string;
  document?: string;
  document_id?: string;
  text?: string;
}

// Mirrors the route-local `IntentClassification.primary_intent` union we
// gate on. The classifier emits more values (FACTUAL, ADVISORY, DRAFTING,
// CALCULATION, PROCEDURAL, CROSS_DOMAIN, PRODUCT_INQUIRY, NOT_A_QUESTION,
// OUT_OF_SCOPE) — `shouldTriggerTurn1Verify` only needs to know the two
// dead-end labels and the two trigger labels. Everything else is "let
// the predicate decide" and the contract here keeps semantics tight.
type IntentCategory = string;

/** Per-citation verdict shape returned by the verify path. Matches the
 *  route-local `DeepVerifyVerdict` so the audit payload round-trips
 *  without a re-mapping at the call site. */
export interface Turn1Verdict {
  document_id: string;
  section: string;
  verdict: "agree" | "disagree" | "partial" | "not_verifiable";
  section_corrected?: string | null;
  result_summary: string;
}

/** Aggregate audit payload emitted as `turn1_audit` NDJSON event. */
export interface Turn1AuditPayload {
  checked_count: number;
  draft_citation_count: number;
  verdicts: Turn1Verdict[];
  duration_ms: number;
  model: string;
}

/** Trigger gate. The Deep Search path has its own gating via deepSearch
 *  toggle + challenge mode; turn-1 is bound by:
 *   - 2+ citations (one citation = no cross-check value)
 *   - intent in {FACTUAL, CROSS_DOMAIN, ADVISORY, DRAFTING, CALCULATION,
 *     PROCEDURAL, PRODUCT_INQUIRY} — i.e. NOT in
 *     {NOT_A_QUESTION, OUT_OF_SCOPE}.
 *
 *  Floor of 2 citations chosen for cost/signal balance — single-citation
 *  queries skip verify because cross-check between cites is the highest-yield
 *  signal; single-cite verify still catches wrong-section but doesn't justify
 *  the latency on average.
 *
 *  Plan-spec wording was {FACTUAL, CROSS_DOMAIN}; widening to "anything
 *  that's not a dead-end" keeps PROCEDURAL/CALCULATION queries (which
 *  also cite sections) protected. The Deep Search gate-OFF turns are
 *  unaffected; flag-OFF on this helper is also unaffected. */
export function shouldTriggerTurn1Verify({
  citations,
  intent,
}: {
  citations: Turn1Citation[];
  intent: { category: IntentCategory };
}): boolean {
  if (citations.length < 2) return false;
  if (intent.category === "NOT_A_QUESTION") return false;
  if (intent.category === "OUT_OF_SCOPE") return false;
  return true;
}

/** Strip parenthesized subsections so §26, §26(2), §26(2)(a) all hash
 *  to the same root key. This mirrors the route-local `rootSectionKey`
 *  in src/app/api/chat/route.ts so per-file batching here matches what
 *  the Deep Search verify path already does. */
export function rootSection(section: string): string {
  return section.replace(/\(.*$/, "").trim();
}

/** Group citations by `{document_id, root_section}` so citations that
 *  share a root section in the same document hit one verify call
 *  together. Distinct files still fan out in parallel via Promise.all
 *  at the call site. Citations without a `document_id` collapse into a
 *  single "UNKNOWN" bucket — this matches the existing route-local
 *  behavior and lets the verify call surface "not_verifiable" for
 *  citations the model emitted without doc binding. */
export function groupCitationsByRootSection(
  cites: Turn1Citation[],
): Turn1Citation[][] {
  const map = new Map<string, Turn1Citation[]>();
  for (const c of cites) {
    const key = `${c.document_id ?? "UNKNOWN"}::${rootSection(c.section ?? "")}`;
    const existing = map.get(key);
    if (existing) existing.push(c);
    else map.set(key, [c]);
  }
  // Avoid spreading Map.values() — tsconfig target=es5 without
  // downlevelIteration rejects MapIterator spread. forEach is es5-safe.
  const out: Turn1Citation[][] = [];
  map.forEach((group) => out.push(group));
  return out;
}

/** Agent caller signature — the route passes its closure-scoped
 *  `callOrchestratorContinuationAgent` here. Kept separate so this module
 *  has zero coupling to fetch headers / token plumbing. */
export type OrchestratorAgentCaller = (
  userMessage: string,
  options: { agent_override?: string; timeout_ms?: number },
) =>
  | Promise<
      | { ok: true; content: string; rawData: unknown }
      | { ok: false; status: number; error: string }
    >;

export interface RunTurn1VerifyOptions {
  citations: Turn1Citation[];
  conversationContext: string[];
  buildClaim: (c: Turn1Citation, expectedSection: string) => string;
  agentCaller: OrchestratorAgentCaller;
  verifyAgent: string;
  timeoutMs: number;
  /** Query language (en/bn). Used as part of the verify cache key when
   *  ENABLE_VERIFY_CACHE=1 so EN- and BN-language verdicts on the same
   *  citation set don't collide. Optional; defaults to "en" if omitted. */
  lang?: string;
}

/** Per-file batched verify on first-turn citations. Output is one
 *  Turn1Verdict per input citation, preserving input order via
 *  `c<index>` claim ids — same contract as the closure-scoped
 *  `runVerifyBatch` in route.ts so the audit payload + honesty-guard
 *  adapter use the same shape on both paths. */
export async function runTurn1VerifyBatch({
  citations,
  conversationContext,
  buildClaim,
  agentCaller,
  verifyAgent,
  timeoutMs,
  lang = "en",
}: RunTurn1VerifyOptions): Promise<Turn1Verdict[]> {
  if (citations.length === 0) return [];

  const claimByIndex: VerifyClaim[] = citations.map((c, i) => {
    const expectedSection =
      normalizeSchemaSection(c.section, c.document_id) ?? c.section ?? "";
    return {
      id: `c${i}`,
      claim: buildClaim(c, expectedSection),
      expected_section: expectedSection,
    };
  });

  // Bucket by {document_id, root_section} so citations on §264, §264(10),
  // §264(11) hit one verify call together — Opus reads
  // /app/projects/llp-corpus/DOC-010/section-264.txt once instead of three times.
  // Track the original citation indices per group so the per-group cache
  // lookup can build a key from the input citations (cache key uses the
  // citation `section` strings, not the normalized claim text).
  const groups = new Map<string, { claims: VerifyClaim[]; indices: number[] }>();
  citations.forEach((c, i) => {
    const docId = typeof c.document_id === "string" ? c.document_id : "";
    const rootKey = rootSection(typeof c.section === "string" ? c.section : "");
    const key = `${docId}::${rootKey}`;
    const existing = groups.get(key);
    if (existing) {
      existing.claims.push(claimByIndex[i]);
      existing.indices.push(i);
    } else {
      groups.set(key, { claims: [claimByIndex[i]], indices: [i] });
    }
  });

  // PB Task 8 (D1) — verify cache (Vercel-side, in-memory LRU).
  // Flag-OFF (default): `cache` stays null → zero new behavior.
  // Flag-ON: per-group cache lookup keyed by
  // hash({document_id, root_section, citation_set, lang}).
  const cache =
    process.env.ENABLE_VERIFY_CACHE === "1" ? getModuleVerifyCache() : null;

  const perGroupResults = await Promise.all(
    Array.from(groups.values()).map(
      async ({ claims: groupClaims, indices }): Promise<BatchVerdict[]> => {
        // Build cache key from the original citations in this group.
        let cacheKey: string | null = null;
        if (cache) {
          const groupCites = indices.map((i) => citations[i]);
          const docId = groupCites[0]?.document_id ?? "";
          const root = rootSection(groupCites[0]?.section ?? "");
          const sections = groupCites.map((c) => c.section ?? "");
          cacheKey = hashCacheKey({
            document_id: docId,
            root_section: root,
            citation_sections: sections,
            lang,
          });
          const cached = cache.get(cacheKey) as BatchVerdict[] | null;
          if (cached) return cached;
        }

        const verifyInput = buildVerifyUserMessage({
          claims: groupClaims,
          conversation_context: conversationContext,
        });
        const res = await agentCaller(verifyInput, {
          agent_override: verifyAgent,
          timeout_ms: timeoutMs,
        });
        if (!res.ok) {
          const reason = `Verify unavailable: ${res.error.slice(0, 80)}`;
          // Don't cache failures — next request gets a fresh attempt.
          return groupClaims.map((cl) => ({
            id: cl.id,
            verdict: "not_verifiable" as const,
            section: cl.expected_section || null,
            section_corrected: null,
            result_summary: reason,
          }));
        }
        const parsed = parseVerifyBatch(res.content, groupClaims);
        // Only cache non-empty success batches.
        if (cache && cacheKey && Array.isArray(parsed) && parsed.length > 0) {
          cache.set(cacheKey, parsed);
        }
        return parsed;
      },
    ),
  );

  const byId = new Map<string, BatchVerdict>();
  for (const group of perGroupResults) {
    for (const v of group) byId.set(v.id, v);
  }

  return citations.map((c, i): Turn1Verdict => {
    const v = byId.get(`c${i}`);
    return {
      document_id: c.document_id ?? "",
      section: c.section ?? "",
      verdict: v?.verdict ?? "not_verifiable",
      section_corrected: v?.section_corrected ?? null,
      result_summary:
        v?.result_summary ?? "Verify returned no verdict for this claim.",
    };
  });
}
