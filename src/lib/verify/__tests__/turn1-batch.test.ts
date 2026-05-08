// PB Task 3 (D1) — turn-1 batch verify gating + grouping unit tests.
// Pure-function suite: trigger predicate + section root + grouping by
// {document_id, root_section}. The runVerifyBatch wrapper itself is
// covered by integration via the existing route.ts call path.

import test from "node:test";
import assert from "node:assert/strict";
import {
  shouldTriggerTurn1Verify,
  groupCitationsByRootSection,
  rootSection,
} from "../turn1-batch";

test("shouldTriggerTurn1Verify: false when fewer than 2 citations", () => {
  assert.equal(
    shouldTriggerTurn1Verify({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      citations: [{ section: "26" } as any],
      intent: { category: "FACTUAL" },
    }),
    false,
  );
});

test("shouldTriggerTurn1Verify: false when zero citations", () => {
  assert.equal(
    shouldTriggerTurn1Verify({
      citations: [],
      intent: { category: "FACTUAL" },
    }),
    false,
  );
});

test("shouldTriggerTurn1Verify: false when intent is NOT_A_QUESTION", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const citations = [{ section: "26" } as any, { section: "27" } as any];
  assert.equal(
    shouldTriggerTurn1Verify({
      citations,
      intent: { category: "NOT_A_QUESTION" },
    }),
    false,
  );
});

test("shouldTriggerTurn1Verify: false when intent is OUT_OF_SCOPE", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const citations = [{ section: "26" } as any, { section: "27" } as any];
  assert.equal(
    shouldTriggerTurn1Verify({
      citations,
      intent: { category: "OUT_OF_SCOPE" },
    }),
    false,
  );
});

test("shouldTriggerTurn1Verify: true when ≥2 citations + FACTUAL", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const citations = [{ section: "26" } as any, { section: "27" } as any];
  assert.equal(
    shouldTriggerTurn1Verify({
      citations,
      intent: { category: "FACTUAL" },
    }),
    true,
  );
});

test("shouldTriggerTurn1Verify: true when ≥2 citations + CROSS_DOMAIN", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const citations = [{ section: "26" } as any, { section: "27" } as any];
  assert.equal(
    shouldTriggerTurn1Verify({
      citations,
      intent: { category: "CROSS_DOMAIN" },
    }),
    true,
  );
});

test("rootSection: strips parenthesized subsections", () => {
  assert.equal(rootSection("26"), "26");
  assert.equal(rootSection("26(2)"), "26");
  assert.equal(rootSection("26(2)(a)"), "26");
  assert.equal(rootSection(" 27 "), "27");
});

test("rootSection: handles empty / whitespace-only", () => {
  assert.equal(rootSection(""), "");
  assert.equal(rootSection("   "), "");
});

test("groupCitationsByRootSection: groups by document_id + root section", () => {
  const cites = [
    { section: "26", document_id: "DOC-010", text: "x" },
    { section: "26(2)", document_id: "DOC-010", text: "y" },
    { section: "27", document_id: "DOC-010", text: "z" },
    { section: "26", document_id: "DOC-007", text: "w" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any[];
  const groups = groupCitationsByRootSection(cites);
  assert.equal(groups.length, 3);
  // DOC-010::26 group has 2 cites, DOC-010::27 has 1, DOC-007::26 has 1
  const doc10_26 = groups.find(
    (g) =>
      g[0].document_id === "DOC-010" && rootSection(g[0].section ?? "") === "26",
  );
  assert.ok(doc10_26, "expected DOC-010::26 group to exist");
  assert.equal(doc10_26.length, 2);
  const doc10_27 = groups.find(
    (g) =>
      g[0].document_id === "DOC-010" && rootSection(g[0].section ?? "") === "27",
  );
  assert.ok(doc10_27, "expected DOC-010::27 group to exist");
  assert.equal(doc10_27.length, 1);
  const doc07_26 = groups.find(
    (g) =>
      g[0].document_id === "DOC-007" && rootSection(g[0].section ?? "") === "26",
  );
  assert.ok(doc07_26, "expected DOC-007::26 group to exist");
  assert.equal(doc07_26.length, 1);
});

test("groupCitationsByRootSection: missing document_id falls into UNKNOWN bucket", () => {
  const cites = [
    { section: "26", text: "x" },
    { section: "26(2)", text: "y" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any[];
  const groups = groupCitationsByRootSection(cites);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].length, 2);
});
