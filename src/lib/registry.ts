import { createServerClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────

export interface DocumentMeta {
  id: string;
  title: string;
  instrument_type: string;
  instrument_number?: string;
  date_enacted: string;
  language: string;
  pages: number;
  status: string;
  is_parent: boolean;
  amends?: string;
  superseded_by?: string;
  source_file?: string;
  en_translated: boolean;
  bn_translated: boolean;
  // Legacy fields — not stored in DB but kept for component compatibility
  extracted_file?: string;
  sections_amended?: string[];
  chapters?: string[];
  note?: string;
}

export interface SupersessionChain {
  parent: string;
  chain: string[];
  latest: string;
}

export interface BilingualFlags {
  hasEn: boolean;
  hasBn: boolean;
  enTranslated: boolean;
  bnTranslated: boolean;
}

// ── In-memory cache ────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000; // 30 seconds

let registryCache: DocumentMeta[] | null = null;
let registryCacheTime = 0;

function isCacheValid(): boolean {
  return registryCache !== null && Date.now() - registryCacheTime < CACHE_TTL_MS;
}

/**
 * Clear the in-memory registry cache so the next call re-fetches from DB.
 */
export function invalidateRegistryCache(): void {
  registryCache = null;
  registryCacheTime = 0;
}

// ── Registry queries ───────────────────────────────────────────────

/**
 * Fetch all documents from Supabase, cached for 30 seconds.
 */
export async function getRegistry(): Promise<DocumentMeta[]> {
  if (isCacheValid()) return registryCache!;

  const sb = createServerClient();
  const { data, error } = await sb
    .from("documents")
    .select(
      "id, title, instrument_type, instrument_number, date_enacted, language, pages, status, is_parent, amends, superseded_by, source_file, en_translated, bn_translated"
    )
    .order("id");

  if (error) {
    throw new Error(`Failed to fetch document registry: ${error.message}`);
  }

  const docs: DocumentMeta[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    instrument_type: row.instrument_type,
    instrument_number: row.instrument_number ?? undefined,
    date_enacted: row.date_enacted ?? "",
    language: row.language,
    pages: row.pages ?? 0,
    status: row.status ?? "active",
    is_parent: row.is_parent ?? false,
    amends: row.amends ?? undefined,
    superseded_by: row.superseded_by ?? undefined,
    source_file: row.source_file ?? undefined,
    en_translated: row.en_translated ?? false,
    bn_translated: row.bn_translated ?? false,
  }));

  registryCache = docs;
  registryCacheTime = Date.now();
  return docs;
}

/**
 * Find a single document by its ID (e.g. "DOC-001").
 */
export async function getDocumentById(
  id: string
): Promise<DocumentMeta | undefined> {
  const docs = await getRegistry();
  return docs.find((d) => d.id === id);
}

/**
 * Fuzzy title match: exact match, then title-includes-query,
 * then query-includes-title.
 */
export async function getDocumentByTitle(
  title: string
): Promise<DocumentMeta | undefined> {
  const docs = await getRegistry();
  const lower = title.toLowerCase();

  return docs.find(
    (d) =>
      d.title.toLowerCase() === lower ||
      d.title.toLowerCase().includes(lower) ||
      lower.includes(d.title.toLowerCase())
  );
}

// ── Bilingual / translation flags ──────────────────────────────────

/**
 * Check which languages exist for a document in the document_texts table,
 * and whether those texts are AI-translated (from the documents table).
 */
export async function getBilingualFlags(
  docId: string
): Promise<BilingualFlags> {
  const fallback: BilingualFlags = {
    hasEn: false,
    hasBn: false,
    enTranslated: false,
    bnTranslated: false,
  };

  const sb = createServerClient();

  // Run both queries in parallel
  const [textsResult, docResult] = await Promise.all([
    sb
      .from("document_texts")
      .select("language")
      .eq("document_id", docId),
    getDocumentById(docId),
  ]);

  if (textsResult.error) {
    console.error(
      `getBilingualFlags: failed to query document_texts for ${docId}:`,
      textsResult.error.message
    );
    return fallback;
  }

  if (!docResult) return fallback;

  const languages = (textsResult.data ?? []).map((r) => r.language);

  return {
    hasEn: languages.includes("en"),
    hasBn: languages.includes("bn"),
    enTranslated: docResult.en_translated,
    bnTranslated: docResult.bn_translated,
  };
}

/**
 * Convenience wrapper — same shape as getBilingualFlags.
 */
export async function getTranslationFlags(
  docId: string
): Promise<BilingualFlags> {
  return getBilingualFlags(docId);
}

// ── Supersession chains ────────────────────────────────────────────

/**
 * Query supersession_chains and group by parent document.
 * Returns one entry per parent with the ordered chain of amendment IDs
 * and the latest amendment ID.
 */
export async function getSupersessionChains(): Promise<SupersessionChain[]> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("supersession_chains")
    .select("parent_doc_id, amendment_doc_id, amendment_order, is_latest")
    .order("parent_doc_id")
    .order("amendment_order");

  if (error) {
    throw new Error(
      `Failed to fetch supersession chains: ${error.message}`
    );
  }

  if (!data || data.length === 0) return [];

  // Group rows by parent_doc_id
  const grouped = new Map<
    string,
    { chain: string[]; latest: string }
  >();

  for (const row of data) {
    const parent = row.parent_doc_id as string;
    const amendment = row.amendment_doc_id as string;

    if (!grouped.has(parent)) {
      grouped.set(parent, { chain: [], latest: parent });
    }

    const entry = grouped.get(parent)!;
    entry.chain.push(amendment);
    if (row.is_latest) {
      entry.latest = amendment;
    }
  }

  return Array.from(grouped.entries()).map(([parent, { chain, latest }]) => ({
    parent,
    chain,
    latest,
  }));
}

// ── Document ID generation ─────────────────────────────────────────

/**
 * Generate the next sequential document ID via Supabase RPC.
 * Falls back to a manual query if the RPC is unavailable.
 */
export async function generateNextDocId(): Promise<string> {
  const sb = createServerClient();

  // Try the RPC function first
  const { data, error } = await sb.rpc("generate_next_doc_id");

  if (!error && data) {
    return data as string;
  }

  console.warn(
    "generate_next_doc_id RPC failed, falling back to manual query:",
    error?.message
  );

  // Fallback: manually compute next ID
  const { data: rows, error: queryError } = await sb
    .from("documents")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);

  if (queryError) {
    throw new Error(
      `Failed to determine next doc ID: ${queryError.message}`
    );
  }

  if (!rows || rows.length === 0) {
    return "DOC-001";
  }

  const maxId = rows[0].id as string;
  const num = parseInt(maxId.replace(/[^0-9]/g, ""), 10);
  return `DOC-${String(num + 1).padStart(3, "0")}`;
}
