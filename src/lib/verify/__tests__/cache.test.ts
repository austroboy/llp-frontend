// PB Task 8 (D1) — verify cache unit tests.
// node:test suite over the in-memory LRU cache + key-hashing helpers.

import test from "node:test";
import assert from "node:assert/strict";
import { createVerifyCache, hashCacheKey } from "../cache";

test("hashCacheKey: deterministic across same inputs (citation order normalized)", () => {
  const k1 = hashCacheKey({
    document_id: "DOC-010",
    root_section: "26",
    citation_sections: ["26", "26(2)"],
    lang: "en",
  });
  const k2 = hashCacheKey({
    document_id: "DOC-010",
    root_section: "26",
    citation_sections: ["26(2)", "26"],
    lang: "en",
  });
  assert.equal(k1, k2);
});

test("hashCacheKey: distinct keys for distinct inputs", () => {
  const a = hashCacheKey({
    document_id: "DOC-010",
    root_section: "26",
    citation_sections: ["26"],
    lang: "en",
  });
  const b = hashCacheKey({
    document_id: "DOC-010",
    root_section: "26",
    citation_sections: ["27"],
    lang: "en",
  });
  const c = hashCacheKey({
    document_id: "DOC-010",
    root_section: "26",
    citation_sections: ["26"],
    lang: "bn",
  });
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

test("createVerifyCache: get returns null on miss", () => {
  const cache = createVerifyCache({ maxEntries: 10, ttlMs: 60_000 });
  assert.equal(cache.get("missing"), null);
});

test("createVerifyCache: set + get round-trips a verdict batch", () => {
  const cache = createVerifyCache({ maxEntries: 10, ttlMs: 60_000 });
  const batch = [
    { id: "c0", verdict: "verifies", section: "26", document_id: "DOC-010" },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache.set("k1", batch as any);
  assert.deepEqual(cache.get("k1"), batch);
});

test("createVerifyCache: returns null on expired entry", async () => {
  const cache = createVerifyCache({ maxEntries: 10, ttlMs: 1 });
  const batch = [
    { id: "c0", verdict: "verifies", section: "26", document_id: "DOC-010" },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache.set("k1", batch as any);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(cache.get("k1"), null);
});

test("createVerifyCache: evicts least-recently-used when over capacity", () => {
  const cache = createVerifyCache({ maxEntries: 2, ttlMs: 60_000 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache.set("a", [{ verdict: "verifies" }] as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache.set("b", [{ verdict: "verifies" }] as any);
  cache.get("a"); // touch a; b becomes LRU
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache.set("c", [{ verdict: "verifies" }] as any); // should evict b
  assert.notEqual(cache.get("a"), null);
  assert.equal(cache.get("b"), null);
  assert.notEqual(cache.get("c"), null);
});

test("createVerifyCache: stats() reports hits + misses + size", () => {
  const cache = createVerifyCache({ maxEntries: 10, ttlMs: 60_000 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache.set("k1", [{ verdict: "verifies" }] as any);
  cache.get("k1"); // hit
  cache.get("k2"); // miss
  const stats = cache.stats();
  assert.equal(stats.size, 1);
  assert.equal(stats.hits, 1);
  assert.equal(stats.misses, 1);
});

test("createVerifyCache: clear() resets entries + counters", () => {
  const cache = createVerifyCache({ maxEntries: 10, ttlMs: 60_000 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache.set("k1", [{ verdict: "verifies" }] as any);
  cache.get("k1");
  cache.get("missing");
  cache.clear();
  const stats = cache.stats();
  assert.equal(stats.size, 0);
  assert.equal(stats.hits, 0);
  assert.equal(stats.misses, 0);
  assert.equal(cache.get("k1"), null);
});

test("createVerifyCache: updating existing key does not evict on capacity", () => {
  const cache = createVerifyCache({ maxEntries: 2, ttlMs: 60_000 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache.set("a", [{ verdict: "verifies" }] as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache.set("b", [{ verdict: "verifies" }] as any);
  // Update existing 'a' — should not evict 'b'.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache.set("a", [{ verdict: "disagrees" }] as any);
  assert.notEqual(cache.get("a"), null);
  assert.notEqual(cache.get("b"), null);
});
