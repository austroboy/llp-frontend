/**
 * Pure engagement-score computation. No HogQL, no Supabase, no Clerk.
 * Takes the raw signal counts (which the cron pulls from PostHog) and
 * returns the score + per-signal breakdown.
 *
 * Signal rules (positive = at-risk of disengaging, negative = power user):
 *   +2  no chat_query_sent in last 7d
 *   +3  zero chat_query_sent total since signup
 *   +2  no login in last 14d
 *   -3  hit search_limit_reached >=3 times in last 7d
 *   -2  >=10 chat_query_sent per week (using last 7d count as proxy)
 *   -1  chat_summarize_clicked >=1 in last 14d
 *
 * Score thresholds:
 *   score >= 4   → at-risk
 *   score <= -2  → power user (upsell candidate)
 */

export interface EngagementSignals {
  /** chat_query_sent count in last 7 days */
  chat_count_7d: number;
  /** chat_query_sent count total since signup */
  chat_count_total: number;
  /** Days since the most recent login event (Inf if never logged in) */
  last_login_age_days: number;
  /** search_limit_reached count in last 7 days */
  search_limit_reached_7d: number;
  /** chat_summarize_clicked count in last 14 days */
  summarize_clicked_14d: number;
}

export interface SignalEntry {
  /** Stable identifier for the rule */
  id: string;
  /** Signed point contribution (+disengagement, -engagement) */
  points: number;
  /** Whether the rule actually contributed to the final score */
  fired: boolean;
  /** Underlying value the rule looked at (for surfacing in the UI) */
  value: number;
  /** Short human label for the dashboard panels */
  label: string;
}

export interface EngagementScoreResult {
  score: number;
  /** Map of signal id → entry (every rule appears, fired or not) */
  breakdown: Record<string, SignalEntry>;
  /** The single rule that contributed the most magnitude (for panel headlines) */
  primary_signal: SignalEntry | null;
}

const RULES: ReadonlyArray<{
  id: string;
  points: number;
  label: string;
  test: (s: EngagementSignals) => boolean;
  value: (s: EngagementSignals) => number;
}> = [
  {
    id: "no_chat_7d",
    points: 2,
    label: "No chat queries in last 7 days",
    test: (s) => s.chat_count_7d === 0,
    value: (s) => s.chat_count_7d,
  },
  {
    id: "no_chat_total",
    points: 3,
    label: "Zero chat queries since signup",
    test: (s) => s.chat_count_total === 0,
    value: (s) => s.chat_count_total,
  },
  {
    id: "no_login_14d",
    points: 2,
    label: "No login in last 14 days",
    test: (s) => s.last_login_age_days >= 14,
    value: (s) => s.last_login_age_days,
  },
  {
    id: "limit_reached_3plus_7d",
    points: -3,
    label: "Hit search limit 3+ times in 7 days",
    test: (s) => s.search_limit_reached_7d >= 3,
    value: (s) => s.search_limit_reached_7d,
  },
  {
    id: "power_chat_10plus_7d",
    points: -2,
    label: "10+ chat queries per week",
    test: (s) => s.chat_count_7d >= 10,
    value: (s) => s.chat_count_7d,
  },
  {
    id: "summarize_used_14d",
    points: -1,
    label: "Used Summarize in last 14 days",
    test: (s) => s.summarize_clicked_14d >= 1,
    value: (s) => s.summarize_clicked_14d,
  },
];

export function computeEngagementScore(
  signals: EngagementSignals,
): EngagementScoreResult {
  const breakdown: Record<string, SignalEntry> = {};
  let score = 0;
  let primary: SignalEntry | null = null;

  for (const rule of RULES) {
    const fired = rule.test(signals);
    const entry: SignalEntry = {
      id: rule.id,
      points: rule.points,
      fired,
      value: rule.value(signals),
      label: rule.label,
    };
    breakdown[rule.id] = entry;
    if (fired) {
      score += rule.points;
      if (!primary || Math.abs(entry.points) > Math.abs(primary.points)) {
        primary = entry;
      }
    }
  }

  return { score, breakdown, primary_signal: primary };
}

export const ENGAGEMENT_THRESHOLDS = {
  AT_RISK: 4,
  POWER: -2,
} as const;

export function classifyEngagement(
  score: number,
): "at_risk" | "power" | "neutral" {
  if (score >= ENGAGEMENT_THRESHOLDS.AT_RISK) return "at_risk";
  if (score <= ENGAGEMENT_THRESHOLDS.POWER) return "power";
  return "neutral";
}
