/**
 * Convex tokenUsage aggregator for the admin dashboard overview.
 *
 * Mirrors the fan-out pattern used by /api/admin/cost-calc/live: one
 * `tokenUsage.listByDate` query per Dhaka-local date in the window, then
 * fold the rows into a SpendBucket.
 *
 * Pricing: copy of `costFor` from src/app/admin/chat-usage/page.tsx
 * (kept inline because that file is "use client" and we can't import it
 * from a server route).
 */

import type { ConvexHttpClient } from "convex/browser";
import { MODELS } from "@/app/admin/cost-calculator/models";
import type {
  Period,
  SpendBucket,
} from "@/app/admin/dashboard-overview/types";
import { EMPTY_SPEND } from "@/app/admin/dashboard-overview/types";
import type { PeriodWindow } from "./period-math";

type TierKey = keyof SpendBucket["tierMix"];
const TIER_KEYS: readonly TierKey[] = [
  "free_guest",
  "free_subscribed",
  "mini",
  "max",
] as const;

/** Same shape as the convex listByDate response (after default-tag patch). */
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

/**
 * Cost lookup mirroring chat-usage page costFor.
 * Token counts in convex are still chars/4 placeholder until P4 ships
 * real Grok/Gemini token counts.
 */
function costFor(
  model: string | undefined,
  input: number,
  output: number,
): number {
  const m = model && MODELS[model];
  if (!m) return 0;
  return (input * m.inputPer1M + output * m.outputPer1M) / 1_000_000;
}

function isTierKey(t: string): t is TierKey {
  return (TIER_KEYS as readonly string[]).includes(t);
}

/** Aggregate raw rows into a SpendBucket. */
function foldRows(rows: TokenUsageRow[]): SpendBucket {
  const userIds = new Set<string>();
  let chats = 0;
  let llpUsd = 0;
  let subsidyUsd = 0;
  // Track latest tier per user (latest = last row encountered, since
  // rows are unordered we use a map keyed by userId).
  const userTier = new Map<string, TierKey>();

  for (const row of rows) {
    userIds.add(row.userId);
    chats += row.requestCount;
    const cost = costFor(row.model, row.inputUsed, row.outputUsed);
    if (row.stream === 2) {
      subsidyUsd += cost;
    } else {
      llpUsd += cost;
    }
    if (isTierKey(row.tier)) {
      userTier.set(row.userId, row.tier);
    }
  }

  const tierMix: SpendBucket["tierMix"] = {
    free_guest: 0,
    free_subscribed: 0,
    mini: 0,
    max: 0,
  };
  Array.from(userTier.values()).forEach((tier) => {
    tierMix[tier] += 1;
  });

  const total = llpUsd + subsidyUsd;
  return {
    users: userIds.size,
    chats,
    llpUsd,
    subsidyUsd,
    avgPerChatUsd: chats > 0 ? total / chats : 0,
    tierMix,
  };
}

/**
 * Fetch tokenUsage rows for one period and return a SpendBucket.
 * Returns EMPTY_SPEND on any failure (caller logs to errors[]).
 */
async function fetchSpendForDates(
  client: ConvexHttpClient,
  // Convex generated `api` is loosely typed as `unknown` in app routes
  // because of the dynamic import path; we narrow at the call site.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convexApi: any,
  dates: string[],
): Promise<SpendBucket> {
  if (dates.length === 0) return EMPTY_SPEND;
  const perDay = await Promise.all(
    dates.map(
      (date) =>
        client.query(convexApi.tokenUsage.listByDate, {
          date,
        }) as Promise<TokenUsageRow[]>,
    ),
  );
  return foldRows(perDay.flat());
}

export interface SpendResult {
  spend: Record<Period, SpendBucket>;
  /** Prior-period spend buckets — used only by the margin layer for delta math. */
  spendPrior: Record<Period, SpendBucket>;
  error?: string;
}

/**
 * Pull spend for all three periods (current + prior). Single Convex client
 * is reused across queries.
 */
export async function fetchAllSpend(
  windows: Record<Period, PeriodWindow>,
): Promise<SpendResult> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return {
      spend: { today: EMPTY_SPEND, week: EMPTY_SPEND, month: EMPTY_SPEND },
      spendPrior: {
        today: EMPTY_SPEND,
        week: EMPTY_SPEND,
        month: EMPTY_SPEND,
      },
      error: "NEXT_PUBLIC_CONVEX_URL missing",
    };
  }

  try {
    const { ConvexHttpClient } = await import("convex/browser");
    const client = new ConvexHttpClient(convexUrl);
    const { api: convexApi } = await import(
      "../../../../../../convex/_generated/api"
    );

    const [todayCur, weekCur, monthCur, todayPrior, weekPrior, monthPrior] =
      await Promise.all([
        fetchSpendForDates(client, convexApi, windows.today.currentDates),
        fetchSpendForDates(client, convexApi, windows.week.currentDates),
        fetchSpendForDates(client, convexApi, windows.month.currentDates),
        fetchSpendForDates(client, convexApi, windows.today.priorDates),
        fetchSpendForDates(client, convexApi, windows.week.priorDates),
        fetchSpendForDates(client, convexApi, windows.month.priorDates),
      ]);

    return {
      spend: { today: todayCur, week: weekCur, month: monthCur },
      spendPrior: {
        today: todayPrior,
        week: weekPrior,
        month: monthPrior,
      },
    };
  } catch (err) {
    return {
      spend: { today: EMPTY_SPEND, week: EMPTY_SPEND, month: EMPTY_SPEND },
      spendPrior: {
        today: EMPTY_SPEND,
        week: EMPTY_SPEND,
        month: EMPTY_SPEND,
      },
      error: (err as Error).message,
    };
  }
}
