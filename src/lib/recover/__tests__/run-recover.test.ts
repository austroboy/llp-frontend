// PB Task 6 (F1) — llp-chat-recover output parser unit tests.
//
// Pure-function suite for `parseRecoverOutput`: well-formed JSON, parse
// errors, missing/invalid fields, markdown fence stripping. The
// `runRecover` orchestrator itself is integration-tested via the route.
//
// Run with:
//   npx tsx --test src/lib/recover/__tests__/run-recover.test.ts

import test from "node:test";
import assert from "node:assert/strict";
import { parseRecoverOutput } from "../run-recover";

test("parseRecoverOutput: parses well-formed JSON", () => {
  const raw = JSON.stringify({
    answer: "Gratuity is calculated per §27.",
    citations: [{ section: "27", document_id: "DOC-010", text: "...", verdict_source: "verifies" }],
    confidence: "high",
    rewrite_notes: "Replaced §26 (not_verifiable) with §27 (verifies).",
  });
  const out = parseRecoverOutput(raw);
  assert.equal(out?.confidence, "high");
  assert.equal(out?.citations.length, 1);
});

test("parseRecoverOutput: returns null on parse error", () => {
  assert.equal(parseRecoverOutput("not json"), null);
});

test("parseRecoverOutput: returns null when answer field missing", () => {
  assert.equal(parseRecoverOutput(JSON.stringify({ citations: [] })), null);
});

test("parseRecoverOutput: returns null when citations not an array", () => {
  assert.equal(
    parseRecoverOutput(
      JSON.stringify({ answer: "x", citations: "nope", confidence: "high", rewrite_notes: "y" }),
    ),
    null,
  );
});

test("parseRecoverOutput: returns null when confidence is invalid enum", () => {
  assert.equal(
    parseRecoverOutput(
      JSON.stringify({ answer: "x", citations: [], confidence: "supreme", rewrite_notes: "y" }),
    ),
    null,
  );
});

test("parseRecoverOutput: strips markdown fences if present", () => {
  const raw =
    "```json\n" +
    JSON.stringify({
      answer: "Test",
      citations: [],
      confidence: "low",
      rewrite_notes: "n/a",
    }) +
    "\n```";
  assert.equal(parseRecoverOutput(raw)?.answer, "Test");
});

test("parseRecoverOutput: strips bare ``` fences", () => {
  const raw =
    "```\n" +
    JSON.stringify({
      answer: "Bare",
      citations: [],
      confidence: "medium",
      rewrite_notes: "n/a",
    }) +
    "\n```";
  assert.equal(parseRecoverOutput(raw)?.answer, "Bare");
});
