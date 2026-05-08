// Action detector — citations + perspective + tier → available doc actions.
// Pure logic; no runtime deps.

import { DOC_CATALOG } from "./catalog";
import type {
  AvailableDocAction,
  Citation,
  DocType,
  Perspective,
  Tier,
} from "./types";

// Tier ordering for gating. Indexes define "at least" relation.
const TIER_RANK: Record<Tier, number> = {
  free_guest: 0,
  free_subscribed: 1,
  mini: 2,
  max: 3,
};

function tierAtLeast(userTier: Tier, required: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[required];
}

// Normalise a citation section string to a bare key.
// "Section 26(1)" → "26", "Section 332A" → "332A", "§ 2(9b)" → "2(9b)"? —
// we keep sub-clauses only when the raw matches a catalog key with parens
// (e.g. "2(9b)"). Strategy: try aggressive strip first; callers can match
// against both the bare and the parenthetic form.
export function normalizeSection(raw: string): string[] {
  if (!raw) return [];
  const cleaned = raw
    .replace(/^\s*(section|§|ধারা)\s*/i, "")
    .trim();
  const keys = new Set<string>();
  keys.add(cleaned);
  // Bare number (or number+letter) form: "26(1)" → "26", "332A" stays.
  const bare = cleaned.replace(/\([^)]*\)/g, "").trim();
  if (bare) keys.add(bare);
  return Array.from(keys);
}

export interface DetectParams {
  citations: Citation[];
  perspective: Perspective;
  tier: Tier;
}

export function detectDocActions(
  params: DetectParams
): AvailableDocAction[] {
  const { citations, perspective, tier } = params;

  // Pre-compute normalised citation keys with original labels for reasons.
  const normalized: Array<{ keys: string[]; original: string }> =
    citations.map((c) => ({
      keys: normalizeSection(c.section),
      original: c.section,
    }));

  type Hit = {
    docType: DocType;
    matchCount: number;
    reason: string;
  };
  const hits: Hit[] = [];

  for (const meta of Object.values(DOC_CATALOG)) {
    // Perspective filter — include if doc covers user's perspective
    // OR if doc is marked "neutral".
    const perspectiveMatch =
      meta.perspective.includes(perspective) ||
      meta.perspective.includes("neutral");
    if (!perspectiveMatch) continue;

    let matchCount = 0;
    let firstReason = "";
    for (const cite of normalized) {
      const matched = cite.keys.some((k) => meta.sections.includes(k));
      if (matched) {
        matchCount += 1;
        if (!firstReason) firstReason = cite.original;
      }
    }
    if (matchCount === 0) continue;

    hits.push({
      docType: meta.id,
      matchCount,
      reason: firstReason,
    });
  }

  // Sort: new-in-2026 last, then match count desc, then stable by id.
  hits.sort((a, b) => {
    const aNew = DOC_CATALOG[a.docType].newIn2026 ? 1 : 0;
    const bNew = DOC_CATALOG[b.docType].newIn2026 ? 1 : 0;
    if (aNew !== bNew) return aNew - bNew;
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.docType.localeCompare(b.docType);
  });

  return hits.map((h) => {
    const metadata = DOC_CATALOG[h.docType];
    return {
      docType: h.docType,
      metadata,
      reason: h.reason,
      tierAllowed: tierAtLeast(tier, metadata.tierRequired),
    };
  });
}

// ── Self-test ────────────────────────────────────────────────────
// Invoke with: `npx tsx src/lib/documents/action-detector.ts`

function selfTest(): void {
  const result = detectDocActions({
    citations: [
      { section: "Section 26", document_id: "DOC-010" },
      { section: "Section 20", document_id: "DOC-010" },
    ],
    perspective: "employer",
    tier: "mini",
  });

  const hasTermination = result.some(
    (a) => a.docType === "termination-notice"
  );
  if (!hasTermination) {
    throw new Error(
      "self-test failed: termination-notice missing from employer/§26+§20 result"
    );
  }
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        count: result.length,
        actions: result.map((a) => ({
          docType: a.docType,
          reason: a.reason,
          tierAllowed: a.tierAllowed,
          newIn2026: a.metadata.newIn2026 ?? false,
        })),
      },
      null,
      2
    )
  );
}

// Only run self-test when executed directly (not when imported).
// Works under tsx/ts-node; harmless when bundled by Next.
declare const require: NodeJS.Require | undefined;
if (
  typeof require !== "undefined" &&
  typeof module !== "undefined" &&
  require.main === module
) {
  selfTest();
}

export default detectDocActions;
