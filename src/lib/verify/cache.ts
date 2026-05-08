// PB Task 8 (D1) — verify cache (in-memory LRU, TTL 24h).
//
// Vercel-side per-instance cache for verify verdicts. Hash
// {document_id, root_section, citation_set, query_lang} → verdict batch.
// Module-level singleton reused across requests on warm Fluid Compute
// instances. Cross-instance / cold-start misses are accepted as a
// best-effort latency saver.
//
// Placement: Vercel side (chat-proxy/server.js does not dispatch verify
// locally — verify lives in src/app/api/chat/route.ts via
// runVerifyBatch + runTurn1VerifyBatch). See PB Task 8 plan for the
// confirming grep + decision.
//
// Flag: ENABLE_VERIFY_CACHE=1 (default OFF). Flag-OFF path keeps the
// singleton uninitialized — zero cost when disabled.

import crypto from "node:crypto";

export type CacheKeyInput = {
  document_id: string;
  root_section: string;
  citation_sections: string[];
  lang: string;
};

/** Deterministic SHA-256 over the cache key shape. citation_sections is
 *  sorted so the same set in different orders produces the same hash. */
export function hashCacheKey(input: CacheKeyInput): string {
  const sortedCites = [...input.citation_sections].sort();
  const raw = `${input.document_id}::${input.root_section}::${sortedCites.join(",")}::${input.lang}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

type Entry<V> = {
  value: V;
  expiresAt: number;
};

export type VerifyCache<V = unknown> = {
  get(key: string): V | null;
  set(key: string, value: V): void;
  stats(): { size: number; hits: number; misses: number };
  clear(): void;
};

/** Map-backed LRU. Map preserves insertion order; we re-insert on read
 *  to bump recency. Eviction = drop oldest (first key) when at capacity. */
export function createVerifyCache<V = unknown>(opts: {
  maxEntries?: number;
  ttlMs?: number;
}): VerifyCache<V> {
  const maxEntries = opts.maxEntries ?? 500;
  const ttlMs = opts.ttlMs ?? 24 * 60 * 60 * 1000; // 24h default

  const map = new Map<string, Entry<V>>();
  let hits = 0;
  let misses = 0;

  return {
    get(key: string): V | null {
      const entry = map.get(key);
      if (!entry) {
        misses += 1;
        return null;
      }
      if (Date.now() > entry.expiresAt) {
        map.delete(key);
        misses += 1;
        return null;
      }
      // LRU bump: re-insert so this key moves to most-recently-used end.
      map.delete(key);
      map.set(key, entry);
      hits += 1;
      return entry.value;
    },
    set(key: string, value: V): void {
      // Evict oldest (first inserted / least-recently-used) when at
      // capacity AND inserting a new key. Updating an existing key never
      // evicts.
      if (map.size >= maxEntries && !map.has(key)) {
        const firstKey = map.keys().next().value;
        if (firstKey !== undefined) map.delete(firstKey);
      }
      // Re-insert refreshes LRU position.
      map.delete(key);
      map.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    stats() {
      return { size: map.size, hits, misses };
    },
    clear() {
      map.clear();
      hits = 0;
      misses = 0;
    },
  };
}

// Module-level singleton — reused across requests on the same warm
// Fluid Compute instance. Lazy-init: cold-start cost is zero when the
// flag is OFF (singleton stays null until first getModuleVerifyCache call).
let _singleton: VerifyCache<unknown> | null = null;

export function getModuleVerifyCache(): VerifyCache<unknown> {
  if (_singleton === null) {
    _singleton = createVerifyCache({
      maxEntries: 500,
      ttlMs: 24 * 60 * 60 * 1000,
    });
  }
  return _singleton;
}

/** Test-only reset for the module singleton. Not used in production. */
export function __resetModuleVerifyCacheForTests(): void {
  _singleton = null;
}
