import { createServerClient } from "@/lib/supabase";
import crypto from "crypto";

// ── Data Version ──
// Bump this after any data rebuild (tree/embedding/chunk changes).
// Cached responses created before this date are treated as stale.
const DATA_VERSION_DATE = "2026-04-14";

// ── Query Hash ──
function normalizeQuery(q: string): string {
  return q.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

export function queryHash(q: string): string {
  return crypto.createHash("sha256").update(normalizeQuery(q)).digest("hex");
}

// ── Cache Read ──
export async function checkCacheHit(hash: string): Promise<{
  response: string;
  citations: any[];
} | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("query_cache")
    .select("response, citations, created_at")
    .eq("query_hash", hash)
    .in("status", ["approved", "auto_approved"])
    .limit(1);

  if (data && data.length > 0) {
    // Skip stale cache entries from before last data rebuild
    const entryDate = data[0].created_at?.split("T")[0];
    if (entryDate && entryDate < DATA_VERSION_DATE) {
      return null; // Stale — force fresh response
    }
    // Increment hit count — ignore failure
    try {
      await supabase.rpc("increment_cache_hits", { hash_val: hash });
    } catch {}
    return { response: data[0].response, citations: data[0].citations || [] };
  }
  return null;
}

// ── Cache Write (pending) ──
export async function savePendingCache(
  hash: string,
  question: string,
  response: string,
  citations: any[],
  messageId?: string,
  conversationId?: string
): Promise<void> {
  const supabase = createServerClient();
  await supabase.from("query_cache").upsert(
    {
      query_hash: hash,
      question,
      response,
      citations,
      status: "pending",
      upvote_count: 0,
      downvote_count: 0,
      source_message_id: messageId || null,
      source_conversation_id: conversationId || null,
      created_at: new Date().toISOString(),
    },
    { onConflict: "query_hash" }
  );
}

// ── Vote-based Cache Promotion ──
const UPVOTE_THRESHOLD = 10;
const DOWNVOTE_THRESHOLD = 5;

export async function promoteToCacheIfReady(messageId: string): Promise<boolean> {
  const supabase = createServerClient();

  // Count upvotes for this message
  const { count } = await supabase
    .from("message_votes")
    .select("*", { count: "exact", head: true })
    .eq("message_id", messageId)
    .eq("vote", "up");

  if (!count || count < UPVOTE_THRESHOLD) return false;

  // Find the cache entry linked to this message
  const { data: cacheEntry } = await supabase
    .from("query_cache")
    .select("id, status")
    .eq("source_message_id", messageId)
    .limit(1);

  if (!cacheEntry || cacheEntry.length === 0) return false;
  if (cacheEntry[0].status === "auto_approved" || cacheEntry[0].status === "approved") return false;

  // Promote
  await supabase
    .from("query_cache")
    .update({
      status: "auto_approved",
      upvote_count: count,
      approved_at: new Date().toISOString(),
    })
    .eq("id", cacheEntry[0].id);

  console.log(`[cache] Auto-approved cache entry for message ${messageId} (${count} upvotes)`);
  return true;
}

export async function invalidateCacheIfNeeded(messageId: string): Promise<boolean> {
  const supabase = createServerClient();

  // Count downvotes
  const { count } = await supabase
    .from("message_votes")
    .select("*", { count: "exact", head: true })
    .eq("message_id", messageId)
    .eq("vote", "down");

  if (!count || count < DOWNVOTE_THRESHOLD) return false;

  // Find and invalidate
  const { data: cacheEntry } = await supabase
    .from("query_cache")
    .select("id, status")
    .eq("source_message_id", messageId)
    .in("status", ["approved", "auto_approved"])
    .limit(1);

  if (!cacheEntry || cacheEntry.length === 0) return false;

  await supabase
    .from("query_cache")
    .update({
      status: "rejected",
      downvote_count: count,
    })
    .eq("id", cacheEntry[0].id);

  console.log(`[cache] Invalidated cache entry for message ${messageId} (${count} downvotes)`);
  return true;
}

// ── Admin Functions ──
export async function adminApproveCache(cacheId: string, adminUserId: string): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("query_cache")
    .update({
      status: "approved",
      approved_by: adminUserId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", cacheId);
}

export async function adminRejectCache(cacheId: string, adminUserId: string): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("query_cache")
    .update({ status: "rejected", approved_by: adminUserId })
    .eq("id", cacheId);
}
