// Integration smoke — compose the exact delegation_status:complete event
// shape the route emits after running the prose through the normalizer,
// and assert it passes the AJV validator (Brief 3 contract). Catches drift
// between the normalizer's output and the schema without needing a real
// orchestrator call.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeVerifyProse } from "../verify-prose";
import { validateDelegationStatusEvent } from "../../validators/delegation-event";

function buildCompleteEvent(prose: string, hint: { expected_section?: string; claim?: string }) {
  const normalized = normalizeVerifyProse(prose, hint);
  return {
    event: "delegation_status" as const,
    trace_id: "trc_2026-04-22T10-00-00Z_abcdef",
    agent: "llp-chat-verify" as const,
    intent: "verify_section_citation",
    state: "complete" as const,
    started_at: "2026-04-22T10:00:00.000Z",
    finished_at: "2026-04-22T10:00:04.500Z",
    section: normalized.section,
    verdict: normalized.verdict,
    result_summary: normalized.result_summary,
  };
}

test("schema: agree event from prose validates", () => {
  const ev = buildCompleteEvent(
    "Confirmed: DOC-011 §27 sets the notice period at 120 days.",
    { expected_section: "DOC-011 §27" },
  );
  const r = validateDelegationStatusEvent(ev);
  assert.equal(r.ok, true, r.ok ? "" : r.errors.join("\n"));
});

test("schema: disagree event from prose validates", () => {
  const ev = buildCompleteEvent(
    "This is incorrect. DOC-007 r.118 sets the penalty at BDT 50,000, not BDT 25,000.",
    { claim: "penalty is BDT 25,000" },
  );
  const r = validateDelegationStatusEvent(ev);
  assert.equal(r.ok, true, r.ok ? "" : r.errors.join("\n"));
  assert.equal(ev.verdict, "disagree");
});

test("schema: partial event from prose validates", () => {
  const ev = buildCompleteEvent(
    "Mostly correct but DOC-010 §102 specifies a 48-hour weekly cap.",
    { expected_section: "DOC-010 §102" },
  );
  const r = validateDelegationStatusEvent(ev);
  assert.equal(r.ok, true, r.ok ? "" : r.errors.join("\n"));
  assert.equal(ev.verdict, "partial");
});

test("schema: not_verifiable (real) event from prose validates", () => {
  const ev = buildCompleteEvent(
    "This claim is outside the Universe dataset; cannot verify from the bundled documents.",
    {},
  );
  const r = validateDelegationStatusEvent(ev);
  assert.equal(r.ok, true, r.ok ? "" : r.errors.join("\n"));
  assert.equal(ev.verdict, "not_verifiable");
});

test("schema: not_verifiable (parse-fail) event from empty prose validates", () => {
  const ev = buildCompleteEvent("", {});
  const r = validateDelegationStatusEvent(ev);
  assert.equal(r.ok, true, r.ok ? "" : r.errors.join("\n"));
  assert.ok(ev.result_summary.endsWith("defaulting to unverifiable."));
});
