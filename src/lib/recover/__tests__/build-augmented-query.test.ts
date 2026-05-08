import test from "node:test";
import assert from "node:assert/strict";
import { buildAugmentedQuery, hasDirtyVerdicts } from "../build-augmented-query";

test("buildAugmentedQuery: appends section_corrected list", () => {
  const q = buildAugmentedQuery({
    original: "What is gratuity?",
    verdicts: [{ verdict: "not_verifiable", section: "26", document_id: "DOC-010", section_corrected: "27" }] as any,
    coverageAdditions: [],
  });
  assert.equal(q, "What is gratuity? + please cover §27 (DOC-010)");
});

test("buildAugmentedQuery: merges verdict corrections + coverage additions deduped", () => {
  const q = buildAugmentedQuery({
    original: "Maternity rules",
    verdicts: [{ verdict: "partial", section: "45", document_id: "DOC-007", section_corrected: "46" }] as any,
    coverageAdditions: [{ section: "46", document_id: "DOC-007" }, { section: "47", document_id: "DOC-007" }],
  });
  assert.equal(q, "Maternity rules + please cover §46 (DOC-007), §47 (DOC-007)");
});

test("buildAugmentedQuery: returns original when no corrections or coverage", () => {
  const q = buildAugmentedQuery({
    original: "Hello",
    verdicts: [{ verdict: "verifies", section: "1", document_id: "DOC-010" }] as any,
    coverageAdditions: [],
  });
  assert.equal(q, "Hello");
});

test("buildAugmentedQuery: skips verdicts missing section_corrected or document_id", () => {
  const q = buildAugmentedQuery({
    original: "Test",
    verdicts: [
      { verdict: "not_verifiable", section: "26", document_id: "DOC-010" }, // no section_corrected
      { verdict: "partial", document_id: "DOC-010", section_corrected: "27" }, // no section
      { verdict: "disagree", section: "28", section_corrected: "29" }, // no document_id
    ] as any,
    coverageAdditions: [],
  });
  // Only the second verdict has both section_corrected ("27") and document_id ("DOC-010"),
  // so it survives. The "section" field is not required for the augmented hint.
  assert.equal(q, "Test + please cover §27 (DOC-010)");
});

test("hasDirtyVerdicts: true on any not_verifiable / partial / disagree", () => {
  assert.equal(hasDirtyVerdicts([{ verdict: "not_verifiable" }] as any), true);
  assert.equal(hasDirtyVerdicts([{ verdict: "partial" }] as any), true);
  assert.equal(hasDirtyVerdicts([{ verdict: "disagree" }] as any), true);
});

test("hasDirtyVerdicts: false when all verifies", () => {
  assert.equal(hasDirtyVerdicts([{ verdict: "verifies" }, { verdict: "verifies" }] as any), false);
});

test("hasDirtyVerdicts: false on empty array", () => {
  assert.equal(hasDirtyVerdicts([] as any), false);
});

test("hasDirtyVerdicts: handles 'agree' (Deep Search alias for verifies) as not dirty", () => {
  assert.equal(hasDirtyVerdicts([{ verdict: "agree" }] as any), false);
});
