import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeVerifyProse, PARSE_FAIL_SUFFIX } from "../verify-prose";

test("agree: prose confirming expected_section", () => {
  const r = normalizeVerifyProse(
    "Confirmed: DOC-011 §27 sets the notice period at 120 days for permanent workers.",
    { expected_section: "DOC-011 §27" },
  );
  assert.equal(r.verdict, "agree");
  assert.equal(r.section, "DOC-011 §27");
  assert.deepEqual(r.citations, [{ document_id: "DOC-011", section: "§27" }]);
});

test("disagree: contradicting claim with corrected figure", () => {
  const r = normalizeVerifyProse(
    "This is incorrect. DOC-007 r.118 sets the penalty at BDT 50,000, not BDT 25,000 as claimed.",
    { claim: "penalty is BDT 25,000 under DOC-007" },
  );
  assert.equal(r.verdict, "disagree");
  assert.ok(r.result_summary.length > 0);
});

test("partial: mostly correct but section correction", () => {
  const r = normalizeVerifyProse(
    "Mostly correct but DOC-010 §102 specifies a 48-hour weekly cap, not the value given.",
    { expected_section: "DOC-010 §102" },
  );
  assert.equal(r.verdict, "partial");
  assert.equal(r.section, "DOC-010 §102");
});

test("not_verifiable (real): not found in Universe", () => {
  const r = normalizeVerifyProse(
    "This claim is not found in the Universe dataset; cannot verify from the 9 bundled documents.",
    {},
  );
  assert.equal(r.verdict, "not_verifiable");
  assert.deepEqual(r.citations, []);
});

test("not_verifiable (fallback): empty prose", () => {
  const r = normalizeVerifyProse("", {});
  assert.equal(r.verdict, "not_verifiable");
  assert.ok(
    r.result_summary.endsWith(PARSE_FAIL_SUFFIX),
    `result_summary should end with "${PARSE_FAIL_SUFFIX}" marker; got: ${r.result_summary}`,
  );
});

test("not_verifiable (fallback): garbage with no verdict signal", () => {
  const r = normalizeVerifyProse("the weather is nice today", {});
  assert.equal(r.verdict, "not_verifiable");
  assert.ok(r.result_summary.endsWith(PARSE_FAIL_SUFFIX));
});

test("section synthesis: title + section number → DOC-010 §27", () => {
  const r = normalizeVerifyProse(
    "Confirmed: Section 27 of the Bangladesh Labour Act, 2006 covers this.",
    {},
  );
  assert.equal(r.verdict, "agree");
  assert.equal(r.section, "DOC-010 §27");
});

test("section synthesis: amendment title → DOC-011 §46", () => {
  const r = normalizeVerifyProse(
    "Verified. Section 46 of the Bangladesh Labour (Amendment) Act, 2026 sets maternity at 16 weeks.",
    {},
  );
  assert.equal(r.verdict, "agree");
  assert.equal(r.section, "DOC-011 §46");
});

test("section regex hit: per DOC-011 §27", () => {
  const r = normalizeVerifyProse(
    "Verified: per DOC-011 §27, notice is 120 days.",
    {},
  );
  assert.equal(r.verdict, "agree");
  assert.equal(r.section, "DOC-011 §27");
});

test("section regex: DOC-011 §27A with suffix letter", () => {
  const r = normalizeVerifyProse("Confirmed DOC-011 §27A applies.", {});
  assert.equal(r.section, "DOC-011 §27A");
});

test("hint fallback: expected_section surfaces when prose lacks section", () => {
  const r = normalizeVerifyProse(
    "Confirmed — the claim matches.",
    { expected_section: "DOC-010 §20" },
  );
  assert.equal(r.verdict, "agree");
  assert.equal(r.section, "DOC-010 §20");
});

test("markdown-wrapped prose: bold verdict banner still parses", () => {
  const r = normalizeVerifyProse(
    "**VERIFIED** — DOC-011 §27 confirms the 120-day notice period.",
    { expected_section: "DOC-011 §27" },
  );
  assert.equal(r.verdict, "agree");
  assert.equal(r.section, "DOC-011 §27");
});

test("result_summary: prefers sentence with section/figure anchor", () => {
  const r = normalizeVerifyProse(
    "The claim looks reasonable. Verified against DOC-011 §27, which sets notice at 120 days.",
    {},
  );
  assert.equal(r.verdict, "agree");
  assert.match(r.result_summary, /DOC-011 §27|120/);
});

test("raw_prose preserved for debugging", () => {
  const original = "Confirmed: DOC-011 §27 applies.";
  const r = normalizeVerifyProse(original, {});
  assert.equal(r.raw_prose, original);
});

test("citations empty when verdict=not_verifiable even if prose mentions DOC ids", () => {
  const r = normalizeVerifyProse(
    "Cannot verify — this is outside the Universe dataset. Reference DOC-010 §20 was searched but not found.",
    {},
  );
  assert.equal(r.verdict, "not_verifiable");
  assert.deepEqual(r.citations, []);
});
