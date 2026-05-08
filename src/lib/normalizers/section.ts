// Canonical section normalizer shared between chat continuation and verify
// prose normalizer. Schema pattern: ^DOC-\d{3} §\d+[A-Z]?$ (e.g. "DOC-010
// §20", "DOC-007 §27A"). Verbatim citations carry prose ("Section 20",
// "§4(4)") + document_id — synthesize schema form where possible, else null.
export const SCHEMA_SECTION_RX = /^DOC-\d{3} §\d+[A-Z]?$/;
const BARE_SECTION_RX = /^\d+[A-Z]?$/;

export function normalizeSchemaSection(
  raw: string | null | undefined,
  docId?: string | null,
): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (SCHEMA_SECTION_RX.test(t)) return t;
  const docMatch = typeof docId === "string" ? docId.match(/^DOC-\d{3}/) : null;
  const bare = t.replace(/^(section|sec\.?|§|rule)\s*/i, "").trim();
  if (docMatch && BARE_SECTION_RX.test(bare)) return `${docMatch[0]} §${bare}`;
  return null;
}
