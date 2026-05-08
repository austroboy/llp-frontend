import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/admin-guard";
import { runHogQL } from "@/lib/posthog/server";
import { topSearchSnippets } from "@/lib/posthog/queries";
import { clusterQueries } from "@/lib/analytics/topic-cluster";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 120;

interface RequestBody {
  windowDays?: number;
}

const DEFAULT_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 30;
const MAX_QUERY_LEN = 60;

/**
 * POST /api/admin/analytics/topic-cluster
 *
 * Refresh handler for the W7 panel. Reads the last `windowDays`
 * (default 7) of `chat_query_sent` `query_snippet` rows from PostHog,
 * pipes them through Gemini, writes the result to
 * `search_topic_cache`.
 *
 * Privacy:
 *   - Snippets are already trimmed to 60 chars at capture time.
 *   - We re-trim defensively before sending to Gemini.
 *   - Nothing else (no user ids, no metadata) is sent to Gemini.
 *   - Logs include only the count of input queries / output topics.
 *
 * Mutation gate: super_admin / growth_admin only. read_only and
 * tech_admin can read the cached cluster but not trigger a refresh
 * (Gemini API has cost — restrict who can spend it).
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(["super_admin", "growth_admin"]);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "auth_failed" }, { status: 500 });
  }

  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    body = {};
  }
  const requestedDays =
    typeof body.windowDays === "number" && Number.isFinite(body.windowDays)
      ? Math.max(1, Math.min(MAX_WINDOW_DAYS, Math.trunc(body.windowDays)))
      : DEFAULT_WINDOW_DAYS;

  const to = new Date();
  const from = new Date(to.getTime() - requestedDays * 86_400_000);
  const sql = topSearchSnippets({ from: from.toISOString(), to: to.toISOString() });

  let rows: Array<{ query_snippet?: unknown }> = [];
  try {
    const result = await runHogQL(sql);
    rows = result.results.map((row) => {
      const obj: Record<string, unknown> = {};
      result.columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj as { query_snippet?: unknown };
    });
  } catch (err) {
    const msg = (err as Error).message.replace(/phx_[A-Za-z0-9]+/g, "phx_***");
    console.error("[admin/analytics/topic-cluster] PostHog read failed:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const trimmed: string[] = [];
  for (const r of rows) {
    if (typeof r.query_snippet !== "string") continue;
    const cleaned = r.query_snippet.trim();
    if (cleaned.length === 0) continue;
    trimmed.push(
      cleaned.length > MAX_QUERY_LEN
        ? cleaned.slice(0, MAX_QUERY_LEN)
        : cleaned,
    );
  }

  console.info(
    `[admin/analytics/topic-cluster] clustering ${trimmed.length} snippets (windowDays=${requestedDays})`,
  );

  if (trimmed.length === 0) {
    // Insert an empty row so the panel has *something* to read; the
    // caller still sees an empty topic cloud but with a fresh
    // computed_at so the stale warning quiets down.
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from("search_topic_cache")
        .insert({ window_days: requestedDays, topics: [] })
        .select("computed_at")
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({
        topics: [],
        computed_at: data?.computed_at ?? new Date().toISOString(),
        window_days: requestedDays,
        stale: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown_error";
      console.error("[admin/analytics/topic-cluster] empty cache insert failed:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  let topics: Array<{ topic: string; count: number; examples: string[] }> = [];
  try {
    topics = await clusterQueries(trimmed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "gemini_error";
    console.error("[admin/analytics/topic-cluster] Gemini failed:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  console.info(
    `[admin/analytics/topic-cluster] Gemini returned ${topics.length} topics`,
  );

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("search_topic_cache")
      .insert({ window_days: requestedDays, topics })
      .select("computed_at")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({
      topics,
      computed_at: data?.computed_at ?? new Date().toISOString(),
      window_days: requestedDays,
      stale: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    console.error("[admin/analytics/topic-cluster] cache insert failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
