/**
 * Margin computation for the admin dashboard overview.
 *
 * Formula (per spec):
 *   revenue   = Σ tierMix[tier] × tierCfg[tier].priceBdt / USD_TO_BDT
 *   netMargin = revenue − llpUsd          (subsidy is $0 to LLP per
 *                                          project_cost_calculator.md lock)
 *   delta%    = (cur − prior) / prior × 100, null if prior == 0 or undefined.
 *
 * Pricing defaults: copied verbatim from
 * src/app/admin/cost-calculator/page.tsx INITIAL_STATE.tierCfg.
 * That file is "use client" so a literal copy here keeps the route
 * pure-server. If those numbers move, update both spots.
 */

import { USD_TO_BDT } from "@/app/admin/cost-calculator/models";
import type {
  MarginBucket,
  Period,
  SpendBucket,
} from "@/app/admin/dashboard-overview/types";
import { EMPTY_MARGIN } from "@/app/admin/dashboard-overview/types";

type TierKey = keyof SpendBucket["tierMix"];

/**
 * Static copy of INITIAL_STATE.tierCfg priceBdt values from
 * src/app/admin/cost-calculator/page.tsx (2026-04-28).
 */
const TIER_PRICE_BDT: Record<TierKey, number> = {
  free_guest: 0,
  free_subscribed: 0,
  mini: 149,
  max: 299,
};

const TIER_KEYS: readonly TierKey[] = [
  "free_guest",
  "free_subscribed",
  "mini",
  "max",
] as const;

function revenueUsd(tierMix: SpendBucket["tierMix"]): number {
  let bdt = 0;
  for (const tier of TIER_KEYS) {
    bdt += tierMix[tier] * TIER_PRICE_BDT[tier];
  }
  return bdt / USD_TO_BDT;
}

function netMarginUsd(spend: SpendBucket): number {
  return revenueUsd(spend.tierMix) - spend.llpUsd;
}

function deltaPct(current: number, prior: number): number | null {
  if (!Number.isFinite(prior) || prior === 0) return null;
  const pct = ((current - prior) / prior) * 100;
  // Round to 1dp.
  return Math.round(pct * 10) / 10;
}

/**
 * Compute MarginBucket per period from the (already-fetched) spend buckets.
 * Throws nothing — pure math.
 */
export function computeAllMargins(
  spend: Record<Period, SpendBucket>,
  spendPrior: Record<Period, SpendBucket>,
): { margin: Record<Period, MarginBucket>; error?: string } {
  try {
    const periods: Period[] = ["today", "week", "month"];
    const margin = {} as Record<Period, MarginBucket>;
    for (const p of periods) {
      const cur = netMarginUsd(spend[p]);
      const prior = netMarginUsd(spendPrior[p]);
      margin[p] = {
        netMarginUsd: cur,
        deltaPctVsPrior: deltaPct(cur, prior),
      };
    }
    return { margin };
  } catch (err) {
    return {
      margin: {
        today: EMPTY_MARGIN,
        week: EMPTY_MARGIN,
        month: EMPTY_MARGIN,
      },
      error: (err as Error).message,
    };
  }
}
