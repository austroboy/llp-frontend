type Verdict = {
  verdict: "verifies" | "agree" | "partial" | "not_verifiable" | "disagree";
  section?: string;
  document_id?: string;
  section_corrected?: string;
};

type CoverageAddition = { section: string; document_id: string };

/**
 * True when any verdict in the batch is `not_verifiable`, `partial`, or `disagree`.
 *
 * `agree` (Deep Search enum) and `verifies` (post-adapter enum) both indicate
 * a passing citation and DO NOT count as dirty. Empty arrays return false.
 */
export function hasDirtyVerdicts(verdicts: Verdict[]): boolean {
  return verdicts.some(
    (v) =>
      v.verdict === "not_verifiable" ||
      v.verdict === "partial" ||
      v.verdict === "disagree",
  );
}

/**
 * Compose an augmented query for the E3 recovery re-fire.
 *
 * Strategy: keep the original user message intact, append a space-joined
 * "please cover §X (DOC-A), §Y (DOC-B)" hint built from the union of:
 *   - verdicts that supply both `section_corrected` AND `document_id`
 *   - coverage additions
 *
 * Dedupes by `${document_id}::${section}` so a verdict's correction and
 * a coverage addition pointing at the same section don't double-render.
 *
 * Returns the original query unchanged when no usable hints exist (preserves
 * intent for the chat-proxy retrieval embedding). Order: verdict corrections
 * first (signal-priority), coverage additions appended.
 */
export function buildAugmentedQuery({
  original,
  verdicts,
  coverageAdditions,
}: {
  original: string;
  verdicts: Verdict[];
  coverageAdditions: CoverageAddition[];
}): string {
  const corrections = verdicts
    .filter((v) => v.section_corrected && v.document_id)
    .map((v) => ({ section: v.section_corrected!, document_id: v.document_id! }));

  const all = [...corrections, ...coverageAdditions];
  const seen = new Set<string>();
  const deduped = all.filter((s) => {
    const key = `${s.document_id}::${s.section}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (deduped.length === 0) return original;

  const hint = deduped.map((s) => `§${s.section} (${s.document_id})`).join(", ");
  return `${original} + please cover ${hint}`;
}
