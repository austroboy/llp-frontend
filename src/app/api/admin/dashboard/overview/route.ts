/**
 * GET /api/admin/dashboard/overview?tz=Asia/Dhaka
 *
 * Composite admin home overview — money / audience / quality at a glance.
 *
 * Spec: docs/superpowers/specs/2026-04-28-admin-home-hero-board-design.md
 * Contract: src/app/admin/dashboard-overview/types.ts
 *
 * NEVER 500s. Per-source failures get logged to `errors[]` and the
 * affected slice falls back to its EMPTY_* default so the admin UI
 * always renders something.
 *
 * Auth: Clerk admin only — same gate as /api/admin/cost-calc/live and
 * /api/admin/chat-usage.
 *
 * Caching: route-level revalidate=60 + private 60s s-maxage. The Clerk
 * gate is dynamic but the response body still benefits from a per-user
 * private cache between calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import type {
  DashboardOverviewError,
  DashboardOverviewResponse,
  Period,
  PeriodRange,
} from "@/app/admin/dashboard-overview/types";
import {
  EMPTY_AUDIENCE,
  EMPTY_MARGIN,
  EMPTY_QUALITY,
  EMPTY_SPEND,
} from "@/app/admin/dashboard-overview/types";
import { computeAllPeriods } from "./period-math";
import { fetchAllSpend } from "./spend";
import { computeAllMargins } from "./margin";
import { fetchAudienceBlock, fetchQualityBlock } from "./posthog-blocks";

interface PublicMetadata {
  role?: string;
  [key: string]: unknown;
}

export const dynamic = "force-dynamic";
export const revalidate = 60;

const FALLBACK_RESPONSE = (
  tz: string,
  generatedAt: string,
  periods: Record<Period, PeriodRange>,
  errors: DashboardOverviewError[],
): DashboardOverviewResponse => ({
  generatedAt,
  tz,
  periods,
  spend: { today: EMPTY_SPEND, week: EMPTY_SPEND, month: EMPTY_SPEND },
  margin: { today: EMPTY_MARGIN, week: EMPTY_MARGIN, month: EMPTY_MARGIN },
  audience: EMPTY_AUDIENCE,
  quality: EMPTY_QUALITY,
  errors: errors.length ? errors : undefined,
});

export async function GET(
  request: NextRequest,
): Promise<NextResponse<DashboardOverviewResponse | { error: string }>> {
  // 1. Auth — admin only.
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((user.publicMetadata as PublicMetadata)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. TZ + period math.
  const tz = request.nextUrl.searchParams.get("tz") ?? "Asia/Dhaka";
  const nowUtc = Date.now();
  const generatedAt = new Date(nowUtc).toISOString();
  const windows = computeAllPeriods(nowUtc);
  const periods: Record<Period, PeriodRange> = {
    today: windows.today.current,
    week: windows.week.current,
    month: windows.month.current,
  };

  const errors: DashboardOverviewError[] = [];

  // 3. Fan out to upstreams. Promise.allSettled so one bad source doesn't
  //    poison the others.
  const [spendRes, audienceRes, qualityRes] = await Promise.allSettled([
    fetchAllSpend(windows),
    fetchAudienceBlock(windows.today.current.start, windows.today.current.end),
    fetchQualityBlock(windows.today.current.start, windows.today.current.end),
  ]);

  // 4. Spend (and prior-spend for margin).
  let spend = { today: EMPTY_SPEND, week: EMPTY_SPEND, month: EMPTY_SPEND };
  let spendPrior = {
    today: EMPTY_SPEND,
    week: EMPTY_SPEND,
    month: EMPTY_SPEND,
  };
  if (spendRes.status === "fulfilled") {
    spend = spendRes.value.spend;
    spendPrior = spendRes.value.spendPrior;
    if (spendRes.value.error) {
      errors.push({ source: "convex", message: spendRes.value.error });
    }
  } else {
    errors.push({
      source: "convex",
      message: (spendRes.reason as Error).message,
    });
  }

  // 5. Margin — pure compute over the spend buckets.
  const marginRes = computeAllMargins(spend, spendPrior);
  if (marginRes.error) {
    errors.push({ source: "calc-engine", message: marginRes.error });
  }

  // 6. Audience.
  let audience = EMPTY_AUDIENCE;
  if (audienceRes.status === "fulfilled") {
    audience = audienceRes.value.block;
    if (audienceRes.value.error) {
      errors.push({
        source: "posthog",
        message: `audience: ${audienceRes.value.error}`,
      });
    }
  } else {
    errors.push({
      source: "posthog",
      message: `audience: ${(audienceRes.reason as Error).message}`,
    });
  }

  // 7. Quality.
  let quality = EMPTY_QUALITY;
  if (qualityRes.status === "fulfilled") {
    quality = qualityRes.value.block;
    if (qualityRes.value.error) {
      errors.push({
        source: "posthog",
        message: `quality: ${qualityRes.value.error}`,
      });
    }
  } else {
    errors.push({
      source: "posthog",
      message: `quality: ${(qualityRes.reason as Error).message}`,
    });
  }

  // 8. Compose response. Belt-and-braces: if anything bizarre happened
  //    above we fall back to a fully-empty payload + errors[] so the route
  //    never 500s.
  let body: DashboardOverviewResponse;
  try {
    body = {
      generatedAt,
      tz,
      periods,
      spend,
      margin: marginRes.margin,
      audience,
      quality,
      errors: errors.length ? errors : undefined,
    };
  } catch (err) {
    body = FALLBACK_RESPONSE(tz, generatedAt, periods, [
      ...errors,
      { source: "calc-engine", message: (err as Error).message },
    ]);
  }

  return NextResponse.json(body, {
    headers: {
      "Cache-Control":
        "private, max-age=60, stale-while-revalidate=120",
    },
  });
}
