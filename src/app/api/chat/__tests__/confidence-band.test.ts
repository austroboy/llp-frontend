/**
 * Unit tests for computeConfidenceBand — G1 Honesty Guard.
 *
 * NOTE: Spec called for vitest, but the project's existing test files
 * (e.g. should-auto-verify.test.ts, url.test.ts, delegation-event.test.ts)
 * use node:test exclusively, and vitest is not in package.json. Matching
 * project convention to avoid bringing in a new test runner just for this
 * one suite.
 *
 * Run with:
 *   npx tsx --test src/app/api/chat/__tests__/confidence-band.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeConfidenceBand, type Verdict } from "../confidence-band";

describe("computeConfidenceBand", () => {
  it("returns null when all verdicts verify", () => {
    const verdicts: Verdict[] = [
      { verdict: "verifies", section: "26", document_id: "DOC-010" },
      { verdict: "verifies", section: "27", document_id: "DOC-010" },
    ];
    assert.equal(computeConfidenceBand(verdicts), null);
  });

  it("returns band with not_verifiable claims listed", () => {
    const verdicts: Verdict[] = [
      { verdict: "verifies", section: "26", document_id: "DOC-010" },
      { verdict: "not_verifiable", section: "999", document_id: "DOC-010" },
    ];
    const band = computeConfidenceBand(verdicts);
    assert.deepEqual(band, {
      severity: "partial",
      verified_sections: [{ section: "26", document_id: "DOC-010" }],
      unverified_sections: [{ section: "999", document_id: "DOC-010" }],
      message:
        "Partial verification: 1 section confirmed, 1 not found in current Universe corpus.",
    });
  });

  it("returns disagree band when any verdict disagrees", () => {
    const verdicts: Verdict[] = [
      {
        verdict: "disagree",
        section: "26",
        document_id: "DOC-010",
        correction: "27",
      },
    ];
    const band = computeConfidenceBand(verdicts);
    assert.equal(band?.severity, "disagree");
  });

  it("returns null on empty array", () => {
    assert.equal(computeConfidenceBand([]), null);
  });

  it("severity is disagree when both disagree and not_verifiable present", () => {
    const verdicts: Verdict[] = [
      { verdict: "disagree", section: "26", document_id: "DOC-010" },
      { verdict: "not_verifiable", section: "27", document_id: "DOC-010" },
    ];
    const band = computeConfidenceBand(verdicts);
    assert.equal(band?.severity, "disagree");
  });
});
