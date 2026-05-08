export type Verdict = {
  verdict: "verifies" | "partial" | "not_verifiable" | "disagree";
  section: string;
  document_id: string;
  correction?: string;
};

export type ConfidenceBand = {
  severity: "partial" | "disagree";
  verified_sections: Array<{ section: string; document_id: string }>;
  unverified_sections: Array<{ section: string; document_id: string }>;
  message: string;
};

export function computeConfidenceBand(verdicts: Verdict[]): ConfidenceBand | null {
  const disagreed = verdicts.filter((v) => v.verdict === "disagree");
  const unverified = verdicts.filter(
    (v) => v.verdict === "not_verifiable" || v.verdict === "partial",
  );
  const verified = verdicts.filter((v) => v.verdict === "verifies");

  if (disagreed.length === 0 && unverified.length === 0) return null;

  const severity = disagreed.length > 0 ? "disagree" : "partial";
  const verifiedCount = verified.length;
  const unverifiedCount = unverified.length + disagreed.length;
  const message =
    severity === "disagree"
      ? `Verification flagged ${disagreed.length} citation(s) for review.`
      : `Partial verification: ${verifiedCount} section${verifiedCount === 1 ? "" : "s"} confirmed, ${unverifiedCount} not found in current Universe corpus.`;

  return {
    severity,
    verified_sections: verified.map((v) => ({ section: v.section, document_id: v.document_id })),
    unverified_sections: [...unverified, ...disagreed].map((v) => ({
      section: v.section,
      document_id: v.document_id,
    })),
    message,
  };
}
