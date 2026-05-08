/**
 * Unit tests for getOrchestratorUrl — per-agent URL routing during migration window.
 *
 * Run with:
 *   npx tsx --test src/lib/orchestrator/__tests__/url.test.ts
 */

import { test } from "node:test";
import * as assert from "node:assert/strict";
import { getOrchestratorUrl } from "../url";

const FALLBACK = "http://default.example.com";
const HELPERS = "http://helpers.example.com";
const FOLLOWUP = "http://followup.example.com";
const VERIFY = "http://verify.example.com";
const RECOVER = "http://recover.example.com";

function setEnv(env: Record<string, string | undefined>) {
  // Always reset all override vars first so tests don't pollute each other.
  // GOCLAW_URL itself is preserved unless explicitly passed (test 5 needs to unset it).
  delete process.env.GOCLAW_URL_HELPERS;
  delete process.env.GOCLAW_URL_FOLLOWUP;
  delete process.env.GOCLAW_URL_VERIFY;
  delete process.env.GOCLAW_URL_RECOVER;
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

test("falls back to GOCLAW_URL when no overrides set", () => {
  setEnv({
    GOCLAW_URL: FALLBACK,
    GOCLAW_URL_HELPERS: undefined,
    GOCLAW_URL_FOLLOWUP: undefined,
    GOCLAW_URL_VERIFY: undefined,
    GOCLAW_URL_RECOVER: undefined,
  });
  assert.equal(getOrchestratorUrl("llp-chat-summarize"), FALLBACK);
  assert.equal(getOrchestratorUrl("llp-chat-filegen"), FALLBACK);
  assert.equal(getOrchestratorUrl("llp-chat-followup"), FALLBACK);
  assert.equal(getOrchestratorUrl("llp-chat-verify"), FALLBACK);
  assert.equal(getOrchestratorUrl("llp-chat-recover"), FALLBACK);
  // H-11 — unknown agent keys are rejected by the RECOGNIZED_AGENTS allowlist.
  assert.throws(() => getOrchestratorUrl("any-other-agent"), /unknown_orchestrator_agent/);
});

test("routes summarize and filegen via GOCLAW_URL_HELPERS when set", () => {
  setEnv({ GOCLAW_URL: FALLBACK, GOCLAW_URL_HELPERS: HELPERS });
  assert.equal(getOrchestratorUrl("llp-chat-summarize"), HELPERS);
  assert.equal(getOrchestratorUrl("llp-chat-filegen"), HELPERS);
  // followup and verify still fall back
  assert.equal(getOrchestratorUrl("llp-chat-followup"), FALLBACK);
  assert.equal(getOrchestratorUrl("llp-chat-verify"), FALLBACK);
});

test("routes followup via GOCLAW_URL_FOLLOWUP when set", () => {
  setEnv({ GOCLAW_URL: FALLBACK, GOCLAW_URL_FOLLOWUP: FOLLOWUP });
  assert.equal(getOrchestratorUrl("llp-chat-followup"), FOLLOWUP);
  assert.equal(getOrchestratorUrl("llp-chat-summarize"), FALLBACK);
});

test("routes verify via GOCLAW_URL_VERIFY when set", () => {
  setEnv({ GOCLAW_URL: FALLBACK, GOCLAW_URL_VERIFY: VERIFY });
  assert.equal(getOrchestratorUrl("llp-chat-verify"), VERIFY);
  assert.equal(getOrchestratorUrl("llp-chat-followup"), FALLBACK);
});

test("routes recover via GOCLAW_URL_RECOVER when set", () => {
  setEnv({ GOCLAW_URL: FALLBACK, GOCLAW_URL_RECOVER: RECOVER });
  assert.equal(getOrchestratorUrl("llp-chat-recover"), RECOVER);
  // Other agents still fall back
  assert.equal(getOrchestratorUrl("llp-chat-followup"), FALLBACK);
  assert.equal(getOrchestratorUrl("llp-chat-verify"), FALLBACK);
});

test("recover falls back to GOCLAW_URL when override unset", () => {
  setEnv({ GOCLAW_URL: FALLBACK, GOCLAW_URL_RECOVER: undefined });
  assert.equal(getOrchestratorUrl("llp-chat-recover"), FALLBACK);
});

test("throws on unset GOCLAW_URL with no overrides", () => {
  setEnv({
    GOCLAW_URL: undefined,
    GOCLAW_URL_HELPERS: undefined,
    GOCLAW_URL_FOLLOWUP: undefined,
    GOCLAW_URL_VERIFY: undefined,
    GOCLAW_URL_RECOVER: undefined,
  });
  assert.throws(() => getOrchestratorUrl("llp-chat-summarize"), /GOCLAW_URL/);
});
