/**
 * Upstash Redis cache layer for RAG pipeline.
 *
 * Caches:
 * - Query embeddings (avoid re-embedding identical queries)
 * - Search results (avoid re-running hybrid search for same embedding)
 * - Full AI responses (avoid re-generating for identical queries)
 */

import { Redis } from "@upstash/redis";

// ── Redis client (lazy singleton) ────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    console.warn("[Cache] UPSTASH_REDIS_REST_URL/TOKEN not set — caching disabled");
    return null;
  }
  try {
    _redis = new Redis({ url, token });
    return _redis;
  } catch (err) {
    console.error("[Cache] Failed to initialize Redis:", err);
    return null;
  }
}

// ── Key helpers ──────────────────────────────────────────────────────

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function embeddingKey(query: string): string {
  return `emb:${normalizeQuery(query)}`;
}

function searchKey(query: string): string {
  return `search:${normalizeQuery(query)}`;
}

function responseKey(query: string, model: string): string {
  return `resp:${model}:${normalizeQuery(query)}`;
}

// ── TTLs (seconds) ───────────────────────────────────────────────────

const EMBEDDING_TTL = 3600;    // 1 hour
const SEARCH_TTL = 1800;       // 30 minutes
const RESPONSE_TTL = 3600;     // 1 hour

// ── Embedding cache ──────────────────────────────────────────────────

export async function getCachedEmbedding(query: string): Promise<number[] | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const cached = await redis.get<number[]>(embeddingKey(query));
    return cached ?? null;
  } catch {
    return null;
  }
}

export async function setCachedEmbedding(query: string, embedding: number[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(embeddingKey(query), embedding, { ex: EMBEDDING_TTL });
  } catch (err) {
    console.error("[Cache] Failed to cache embedding:", err);
  }
}

// ── Search results cache ─────────────────────────────────────────────

interface CachedSearchResult {
  chunk_id: number;
  document_id: string;
  document_title: string;
  section: string;
  chapter: string;
  content: string;
  similarity: number;
}

export async function getCachedSearch(query: string): Promise<CachedSearchResult[] | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const cached = await redis.get<CachedSearchResult[]>(searchKey(query));
    return cached ?? null;
  } catch {
    return null;
  }
}

export async function setCachedSearch(query: string, results: CachedSearchResult[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(searchKey(query), results, { ex: SEARCH_TTL });
  } catch (err) {
    console.error("[Cache] Failed to cache search results:", err);
  }
}

// ── Response cache ───────────────────────────────────────────────────

interface CachedResponse {
  answer: string;
  citations: { document_id: string; document: string; section: string; text: string }[];
  chunks_found: number;
}

export async function getCachedResponse(query: string, model: string): Promise<CachedResponse | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const cached = await redis.get<CachedResponse>(responseKey(query, model));
    return cached ?? null;
  } catch {
    return null;
  }
}

export async function setCachedResponse(
  query: string,
  model: string,
  response: CachedResponse
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(responseKey(query, model), response, { ex: RESPONSE_TTL });
  } catch (err) {
    console.error("[Cache] Failed to cache response:", err);
  }
}
