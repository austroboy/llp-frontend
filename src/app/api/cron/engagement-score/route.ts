import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

import { runHogQL } from "@/lib/posthog/server";
import {
  computeEngagementScore,
  type EngagementSignals,
} from "@/lib/engagement-score";
import { createServerClient } from "@/lib/supabase";
import { safeEqual } from "@/lib/timing-safe";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // up to 5 minutes for large user lists

/**
 * GET /api/cron/engagement-score
 *
 * Nightly Vercel cron (02:00 BST = 20:00 UTC).
 * For every registered Clerk user:
 *   1. Pull PostHog event counts via a single grouped HogQL query.
 *   2. Compute the engagement score with `computeEngagementScore`.
 *   3. Upsert into Supabase `user_engagement_scores`.
 *
 * Two dashboard panels read from this table:
 *   - score >= 4   → at-risk
 *   - score <= -2  → power user / upsell candidate
 *
 * Auth: matches the existing cron pattern — `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const provided = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!safeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userIds = await listAllClerkUserIds();
    if (userIds.length === 0) {
      return NextResponse.json({ scored: 0, total: 0, note: "no users" });
    }

    const signalsByUser = await fetchSignalsByUser(userIds);
    const supabase = createServerClient();
    const computed_at = new Date().toISOString();

    let scored = 0;
    const upsertRows: Array<{
      user_id: string;
      score: number;
      signal_breakdown: unknown;
      computed_at: string;
    }> = [];

    for (const uid of userIds) {
      const signals = signalsByUser.get(uid) ?? emptySignals();
      const { score, breakdown } = computeEngagementScore(signals);
      upsertRows.push({
        user_id: uid,
        score,
        signal_breakdown: breakdown,
        computed_at,
      });
      scored += 1;
    }

    // Chunk the upsert to keep payload size sane on huge user bases.
    const CHUNK = 500;
    for (let i = 0; i < upsertRows.length; i += CHUNK) {
      const slice = upsertRows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("user_engagement_scores")
        .upsert(slice, { onConflict: "user_id" });
      if (error) {
        throw new Error(`upsert failed at offset ${i}: ${error.message}`);
      }
    }

    return NextResponse.json({
      scored,
      total: userIds.length,
      computed_at,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    console.error("[cron/engagement-score] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────────────────────── */

async function listAllClerkUserIds(): Promise<string[]> {
  const client = await clerkClient();
  const ids: string[] = [];
  const PAGE = 500;
  let offset = 0;
  // Hard cap: 50k users per nightly run. If the platform grows past this,
  // shard by created_at month instead of bumping the cap.
  for (let i = 0; i < 100; i += 1) {
    const { data } = await client.users.getUserList({
      limit: PAGE,
      offset,
      orderBy: "+created_at",
    });
    if (data.length === 0) break;
    for (const u of data) ids.push(u.id);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return ids;
}

function emptySignals(): EngagementSignals {
  return {
    chat_count_7d: 0,
    chat_count_total: 0,
    last_login_age_days: Number.POSITIVE_INFINITY,
    search_limit_reached_7d: 0,
    summarize_clicked_14d: 0,
  };
}

/**
 * One grouped HogQL query that returns a row per distinct user with all
 * signal counts. We do NOT filter by Clerk user list inside HogQL — instead,
 * we pull every distinct_id that fired any of the relevant events in the
 * relevant windows, then map onto the Clerk user list locally. Users with
 * no PostHog activity get the empty-signals fallback.
 */
async function fetchSignalsByUser(
  userIds: string[],
): Promise<Map<string, EngagementSignals>> {
  if (userIds.length === 0) return new Map();

  // We use distinctIdSet only as a guardrail in case the PostHog project
  // has stale anonymous distinct_ids — final filter is the Clerk-side
  // union with userIds (handled by the caller's loop).
  const sql = /* hogql */ `
    SELECT
      person_id AS user_id,
      countIf(event = 'chat_query_sent' AND timestamp >= now() - INTERVAL 7 DAY) AS chat_count_7d,
      countIf(event = 'chat_query_sent') AS chat_count_total,
      maxIf(timestamp, event IN ('login', '$identify', 'signin_completed', 'signup_completed')) AS last_login_at,
      countIf(event = 'search_limit_reached' AND timestamp >= now() - INTERVAL 7 DAY) AS search_limit_reached_7d,
      countIf(event = 'chat_summarize_clicked' AND timestamp >= now() - INTERVAL 14 DAY) AS summarize_clicked_14d
    FROM events
    WHERE timestamp >= now() - INTERVAL 90 DAY
    GROUP BY person_id
  `;

  const result = await runHogQL(sql);
  const out = new Map<string, EngagementSignals>();
  if (!result?.columns || !result?.results) return out;

  const idx = (col: string) => result.columns.indexOf(col);
  const iUser = idx("user_id");
  const iChat7 = idx("chat_count_7d");
  const iChatTotal = idx("chat_count_total");
  const iLastLogin = idx("last_login_at");
  const iLimit = idx("search_limit_reached_7d");
  const iSummarize = idx("summarize_clicked_14d");

  const now = Date.now();
  for (const row of result.results) {
    const uid = String(row[iUser] ?? "");
    if (!uid) continue;
    const lastLoginIso = row[iLastLogin];
    const lastLoginMs =
      typeof lastLoginIso === "string" && lastLoginIso.length > 0
        ? Date.parse(lastLoginIso)
        : NaN;
    const last_login_age_days = Number.isFinite(lastLoginMs)
      ? Math.max(0, (now - lastLoginMs) / 86_400_000)
      : Number.POSITIVE_INFINITY;
    out.set(uid, {
      chat_count_7d: toInt(row[iChat7]),
      chat_count_total: toInt(row[iChatTotal]),
      last_login_age_days,
      search_limit_reached_7d: toInt(row[iLimit]),
      summarize_clicked_14d: toInt(row[iSummarize]),
    });
  }
  return out;
}

function toInt(v: unknown): number {
  if (typeof v === "number") return Math.trunc(v);
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
