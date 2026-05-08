/**
 * Unit tests for the AJV-compiled delegation-contract validators.
 *
 * Run with:
 *   npx tsx --test src/lib/validators/__tests__/delegation-event.test.ts
 */

import { test } from "node:test";
import * as assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  validateDelegationRequest,
  validateDelegationStatusEvent,
} from "../delegation-event";

const req = createRequire(import.meta.url);
const statusSchema = req("../../../../chat-proxy/data/delegation-status-event-schema.json");
const requestSchema = req("../../../../chat-proxy/data/delegation-request-schema.json");

const validPending = {
  event: "delegation_status",
  trace_id: "trc_2026-04-22T07-15-32Z_abc123",
  agent: "llp-chat-verify",
  intent: "verify_section_citation",
  state: "pending",
  started_at: "2026-04-22T07:15:32.104Z",
};

const validComplete = {
  event: "delegation_status",
  trace_id: "trc_2026-04-22T07-15-32Z_abc123",
  agent: "llp-chat-verify",
  intent: "verify_section_citation",
  state: "complete",
  started_at: "2026-04-22T07:15:32.104Z",
  finished_at: "2026-04-22T07:15:38.612Z",
  verdict: "agree",
  result_summary: "Cited DOC-011 \u00a727 confirmed.",
};

test("valid pending event passes", () => {
  const r = validateDelegationStatusEvent(validPending);
  assert.equal(r.ok, true);
});

test("valid complete event with verdict passes", () => {
  const r = validateDelegationStatusEvent(validComplete);
  assert.equal(r.ok, true);
});

test("missing trace_id fails with path-pointing error", () => {
  const { trace_id: _omit, ...bad } = validPending;
  const r = validateDelegationStatusEvent(bad);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(
      r.errors.some((e) => e.includes("trace_id")),
      `expected trace_id in errors, got: ${r.errors.join(" | ")}`,
    );
  }
});

test("invalid trace_id pattern fails", () => {
  const r = validateDelegationStatusEvent({ ...validPending, trace_id: "not-a-trace" });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(
      r.errors.some((e) => /pattern|trace/i.test(e)),
      r.errors.join(" | "),
    );
  }
});

test("unknown state enum value fails", () => {
  const r = validateDelegationStatusEvent({ ...validPending, state: "halfway" });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(
      r.errors.some((e) => /enum|state/i.test(e)),
      r.errors.join(" | "),
    );
  }
});

test("verdict on non-verify agent still validates (schema does not forbid)", () => {
  // Schema describes verdict for llp-chat-verify but does not bar it on
  // other agents. Pin current behavior; tighten in a later phase if the
  // UI wants filegen completions to be verdict-free.
  const r = validateDelegationStatusEvent({ ...validComplete, agent: "llp-chat-filegen" });
  assert.equal(r.ok, true);
});

test("valid verify delegation request passes", () => {
  const r = validateDelegationRequest({
    target_agent: "llp-chat-verify",
    intent: "verify_section_citation",
    claim: "Notice period is 120 days.",
    conversation_context: ["User: question?"],
    requested_by: "llp-chat-followup",
    trace_id: "trc_2026-04-22T07-15-32Z_abc123",
  });
  assert.equal(r.ok, true);
});

for (const [i, ex] of ((statusSchema.examples ?? []) as unknown[]).entries()) {
  test(`schema status example[${i}] validates`, () => {
    const r = validateDelegationStatusEvent(ex);
    assert.equal(r.ok, true, (r as { errors?: string[] }).errors?.join(" | "));
  });
}

for (const [i, ex] of ((requestSchema.examples ?? []) as unknown[]).entries()) {
  test(`schema request example[${i}] validates`, () => {
    const r = validateDelegationRequest(ex);
    assert.equal(r.ok, true, (r as { errors?: string[] }).errors?.join(" | "));
  });
}
