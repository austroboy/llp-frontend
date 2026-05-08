/**
 * Shared contract for /api/admin/dashboard/overview and the home hero board.
 * Spec: docs/superpowers/specs/2026-04-28-admin-home-hero-board-design.md
 *
 * The endpoint NEVER 500s — failures are logged into `errors[]` and the
 * affected slice returns zero/null defaults so the UI always renders.
 */

export type Period = "today" | "week" | "month";

export interface PeriodRange {
  /** ISO with TZ offset (Asia/Dhaka) */
  start: string;
  end: string;
}

export interface SpendBucket {
  users: number;
  chats: number;
  llpUsd: number;
  subsidyUsd: number;
  avgPerChatUsd: number;
  /** counts per tier (not percentages — UI computes pct) */
  tierMix: {
    free_guest: number;
    free_subscribed: number;
    mini: number;
    max: number;
  };
}

export interface MarginBucket {
  netMarginUsd: number;
  /** % delta vs same-length prior period; null if no prior data */
  deltaPctVsPrior: number | null;
}

export interface AudienceBlock {
  /** last 30 days, oldest first; UI renders inline SVG sparkline */
  dauSparkline: number[];
  todayDau: number;
  topPage: { path: string; views: number } | null;
  topQuery: { text: string; count: number } | null;
  topCountry: { code: string; name: string; pct: number } | null;
}

export interface QualityBlock {
  /** 0-100; null if PostHog query empty or unconfigured */
  citationHealthPct: number | null;
  /** last 7 days % values, oldest first */
  citationTrend7d: number[];
  topException: { message: string; count: number } | null;
}

export interface DashboardOverviewError {
  source: "convex" | "calc-engine" | "posthog";
  message: string;
}

export interface DashboardOverviewResponse {
  generatedAt: string;
  tz: string;
  periods: Record<Period, PeriodRange>;
  spend: Record<Period, SpendBucket>;
  margin: Record<Period, MarginBucket>;
  audience: AudienceBlock;
  quality: QualityBlock;
  errors?: DashboardOverviewError[];
}

/** Default empty bucket — used when an upstream errors. */
export const EMPTY_SPEND: SpendBucket = {
  users: 0,
  chats: 0,
  llpUsd: 0,
  subsidyUsd: 0,
  avgPerChatUsd: 0,
  tierMix: { free_guest: 0, free_subscribed: 0, mini: 0, max: 0 },
};

export const EMPTY_MARGIN: MarginBucket = {
  netMarginUsd: 0,
  deltaPctVsPrior: null,
};

export const EMPTY_AUDIENCE: AudienceBlock = {
  dauSparkline: [],
  todayDau: 0,
  topPage: null,
  topQuery: null,
  topCountry: null,
};

export const EMPTY_QUALITY: QualityBlock = {
  citationHealthPct: null,
  citationTrend7d: [],
  topException: null,
};
