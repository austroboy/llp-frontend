/**
 * GET /api/admin/cost-calc/live?days=N
 *
 * Aggregates the last N days (default 7, min 1, max 30) of Convex `tokenUsage`
 * rows and returns a per-tier / per-agent summary that the cost-calculator's
 * "Today (prod)" preset overlays on its static macros.
 *
 * Auth: Clerk admin only — same gate as /api/admin/chat-usage.
 *
 * Token counts are chars/4 placeholder until P4 wires real `usage_tokens`
 * events from upstream. The UI labels these "Estimated".
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import type {
  LiveDataResponse,
  LiveTierStats,
  LiveAgentStats,
  TierKey,
} from "@/app/admin/cost-calculator/calc-types";
import { TIER_KEYS } from "@/app/admin/cost-calculator/calc-types";

interface PublicMetadata {
  role?: string;
  [key: string]: unknown;
}

interface TokenUsageRow {
  userId: string;
  date: string;
  inputUsed: number;
  outputUsed: number;
  requestCount: number;
  tier: string;
  model?: string;
  agentSlug: string;
  turn: number;
  stream: number;
}

const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;
const MIN_DAYS = 1;

const VALID_TIERS = new Set<TierKey>(TIER_KEYS);

function emptyTierStats(): LiveTierStats {
  return {
    users: 0,
    requests: 0,
    requestsPerUserDay: 0,
    avgInputT1: 0,
    avgOutputT1: 0,
    avgInputT2: 0,
    avgOutputT2: 0,
  };
}

/** YYYY-MM-DD in UTC. */
function ymd(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  // 1. Auth — admin only.
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((user.publicMetadata as PublicMetadata)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse + clamp days param.
  const daysRaw = Number(request.nextUrl.searchParams.get("days") ?? DEFAULT_DAYS);
  const windowDays = Number.isFinite(daysRaw)
    ? Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.floor(daysRaw)))
    : DEFAULT_DAYS;

  // 3. Build date strings (windowEnd = today UTC, windowStart = today − (N-1)).
  const today = new Date();
  const windowEnd = ymd(today);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (windowDays - 1));
  const windowStart = ymd(start);

  // 4. Init Convex client. If env missing → graceful 503.
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "Convex unavailable", live: false },
      { status: 503 },
    );
  }

  let rows: TokenUsageRow[] = [];
  try {
    const { ConvexHttpClient } = await import("convex/browser");
    const client = new ConvexHttpClient(convexUrl);
    const { api: convexApi } = await import("../../../../../../convex/_generated/api");

    // 5. Fan-out one listByDate query per date in window.
    const dates: string[] = [];
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      dates.push(ymd(d));
    }
    const perDay = await Promise.all(
      dates.map((date) =>
        client.query(convexApi.tokenUsage.listByDate, { date }) as Promise<TokenUsageRow[]>,
      ),
    );
    rows = perDay.flat();
  } catch (err) {
    console.error("[cost-calc/live] convex query failed:", err);
    return NextResponse.json(
      { error: "Convex unavailable", live: false },
      { status: 503 },
    );
  }

  // 6. Aggregate per-tier (avg input/output split by turn).
  const perTier: Record<TierKey, LiveTierStats> = {
    free_guest: emptyTierStats(),
    free_subscribed: emptyTierStats(),
    mini: emptyTierStats(),
    max: emptyTierStats(),
  };

  // For per-tier averages we need running sums + counts split by turn.
  type TierAccum = {
    users: Set<string>;
    requests: number;
    inputT1: number;
    outputT1: number;
    countT1: number;
    inputT2: number;
    outputT2: number;
    countT2: number;
  };
  const tierAccum: Record<TierKey, TierAccum> = {
    free_guest: { users: new Set(), requests: 0, inputT1: 0, outputT1: 0, countT1: 0, inputT2: 0, outputT2: 0, countT2: 0 },
    free_subscribed: { users: new Set(), requests: 0, inputT1: 0, outputT1: 0, countT1: 0, inputT2: 0, outputT2: 0, countT2: 0 },
    mini: { users: new Set(), requests: 0, inputT1: 0, outputT1: 0, countT1: 0, inputT2: 0, outputT2: 0, countT2: 0 },
    max: { users: new Set(), requests: 0, inputT1: 0, outputT1: 0, countT1: 0, inputT2: 0, outputT2: 0, countT2: 0 },
  };

  // Per-agent aggregate.
  const perAgent: Record<string, LiveAgentStats> = {};

  // For ratios.
  const distinctUsers = new Set<string>();
  let totalRequests = 0;
  let bnRequests = 0;
  let deepRequests = 0;
  let t2RowCount = 0;
  let totalRows = 0;
  let verifyTotal = 0;
  let verifyDirty = 0;

  for (const row of rows) {
    totalRows += 1;
    totalRequests += row.requestCount;
    distinctUsers.add(row.userId);

    // Tier bucket — guard against unexpected tier strings.
    if (VALID_TIERS.has(row.tier as TierKey)) {
      const tk = row.tier as TierKey;
      const acc = tierAccum[tk];
      acc.users.add(row.userId);
      acc.requests += row.requestCount;
      // Treat missing turn as 1 (matches DEFAULT_TURN in convex/tokenUsage.ts).
      const turn = row.turn ?? 1;
      if (turn === 2) {
        acc.inputT2 += row.inputUsed;
        acc.outputT2 += row.outputUsed;
        acc.countT2 += 1;
      } else {
        acc.inputT1 += row.inputUsed;
        acc.outputT1 += row.outputUsed;
        acc.countT1 += 1;
      }
    }

    // Per-agent bucket.
    const slug = row.agentSlug;
    if (!perAgent[slug]) {
      perAgent[slug] = {
        requests: 0,
        totalInput: 0,
        totalOutput: 0,
        stream: row.stream ?? 1,
        model: row.model,
      };
    }
    perAgent[slug].requests += row.requestCount;
    perAgent[slug].totalInput += row.inputUsed;
    perAgent[slug].totalOutput += row.outputUsed;
    if (row.model && !perAgent[slug].model) perAgent[slug].model = row.model;

    // Ratio counters — match by agentSlug.
    if (slug === "gemini-bn-bridge") bnRequests += row.requestCount;
    if (slug === "chat-proxy-deep") deepRequests += row.requestCount;
    if ((row.turn ?? 1) === 2) t2RowCount += 1;

    // pDirty: requires `verdict` field on tokenUsage row, which P1 didn't ship.
    // Best effort — count llp-chat-verify rows; pDirty stays null until we
    // have verdict telemetry.
    if (slug === "llp-chat-verify") {
      verifyTotal += row.requestCount;
      // verdict not available — leave verifyDirty at 0; pDirty returns null.
    }
  }

  // 7. Finalize per-tier stats.
  for (const tk of TIER_KEYS) {
    const acc = tierAccum[tk];
    const userCount = acc.users.size;
    const requestsPerUserDay = userCount > 0
      ? Math.round(((acc.requests / (userCount * windowDays)) * 10)) / 10
      : 0;
    perTier[tk] = {
      users: userCount,
      requests: acc.requests,
      requestsPerUserDay,
      avgInputT1: acc.countT1 > 0 ? Math.round(acc.inputT1 / acc.countT1) : 0,
      avgOutputT1: acc.countT1 > 0 ? Math.round(acc.outputT1 / acc.countT1) : 0,
      avgInputT2: acc.countT2 > 0 ? Math.round(acc.inputT2 / acc.countT2) : 0,
      avgOutputT2: acc.countT2 > 0 ? Math.round(acc.outputT2 / acc.countT2) : 0,
    };
  }

  // 8. Ratios.
  const denom = totalRequests > 0 ? totalRequests : 1;
  const ratios = {
    bnPct: Math.round((bnRequests / denom) * 1000) / 10,
    deepSearchPct: Math.round((deepRequests / denom) * 1000) / 10,
    cacheHitPct: 0,
    cacheHitNote: "Verify cache hit rate not yet tracked in convex tokenUsage — placeholder 0.",
    t2Pct: totalRows > 0 ? Math.round((t2RowCount / totalRows) * 1000) / 10 : 0,
  };

  const pDirty = verifyTotal > 0
    ? Math.round((verifyDirty / verifyTotal) * 1000) / 10
    : null;

  const payload: LiveDataResponse = {
    windowDays,
    windowStart,
    windowEnd,
    totalRequests,
    totalUsers: distinctUsers.size,
    perTier,
    perAgent,
    ratios,
    pDirty,
    estNote: "Token counts are chars/4 placeholder until P4 ships real usage_tokens.",
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: {
      // Soft cache so re-renders within a minute don't re-aggregate.
      "Cache-Control": "private, max-age=60",
    },
  });
}
