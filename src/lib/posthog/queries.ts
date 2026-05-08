import { injectTimeRange } from "./server";

export interface TimeRange {
  from: string;
  to: string;
}

export interface DauTrendRow {
  day: string;
  dau: number;
}

export interface TopPagesRow {
  path: string;
  views: number;
  uniques: number;
}

export interface SignupFunnelRow {
  step1_landing: number;
  step2_signup_page: number;
  step3_completed: number;
}

export interface LangSplitRow {
  lang: string;
  sent: number;
}

export interface ClarifyRateRow {
  clarify_rate: number | null;
}

export interface CitationHealthRow {
  avg_citations: number | null;
  zero_citation_rate: number | null;
  avg_latency_ms: number | null;
}

export interface TopQueriesRow {
  query: string;
  hits: number;
  avg_len: number;
}

export interface CohortRetentionRow {
  cohort: string;
  active_week: string;
  active: number;
}

export interface TopExceptionsRow {
  message: string;
  hits: number;
  users: number;
}

export interface ChatNextStepRow {
  next_path: string;
  hits: number;
}

export interface LiveActivityRow {
  event: string;
  distinct_id: string;
  path: string;
  timestamp: string;
}

export interface EventVolumeRow {
  day: string;
  event: string;
  hits: number;
}

export interface KpiSnapshotRow {
  dau: number;
  sessions: number;
  chat_queries: number;
  signups: number;
}

export interface KpiBehaviorRow {
  avg_session_duration_s: number | null;
  avg_pages_per_session: number | null;
  bounce_rate: number | null;
  returning_rate: number | null;
}

export interface PageEngagementRow {
  path: string;
  views: number;
  uniques: number;
  avg_dwell_s: number | null;
  avg_max_scroll: number | null;
}

export interface TopClickedElementsRow {
  text: string;
  path: string;
  clicks: number;
}

export interface DropoffPagesRow {
  path: string;
  exits: number;
  exit_rate: number | null;
}

export interface SessionDurationHistogramRow {
  bucket: string;
  sessions: number;
}

export interface HourOfDayHeatmapRow {
  dow: number;
  hour: number;
  hits: number;
}

export interface GeoSplitRow {
  country: string;
  hits: number;
  uniques: number;
}

export interface DeviceSplitRow {
  device: string;
  hits: number;
}

export interface BrowserSplitRow {
  browser: string;
  hits: number;
}

export interface BounceRateRow {
  bounce_rate: number | null;
}

export interface ReturningRateRow {
  returning_rate: number | null;
  total_users: number;
}

export interface UtmSourceCampaignRow {
  utm_source: string;
  sessions: number;
  signups: number;
  activated: number;
}

// ── Tier 2 row types ─────────────────────────────────────────────

export interface TimeOfUseHeatmapRow {
  dow: number;
  hour: number;
  queries: number;
}

export interface LanguagePreferenceRow {
  lang: string;
  hits: number;
  uniques: number;
}

export interface ChannelROIRow {
  utm_source: string;
  sessions: number;
  signups: number;
  activated: number;
}

export interface TopSearchSnippetsRow {
  query_snippet: string;
  hits: number;
}

export interface ChatActivationRow {
  signups: number;
  activated_first_chat: number;
}

export interface DauMauStickinessRow {
  dau: number;
  mau: number;
  stickiness: number | null;
}

export interface SearchSatisfactionRow {
  positive: number;
  total: number;
  satisfaction_rate: number | null;
}

export function dauTrend({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  toStartOfDay(timestamp) AS day,
  count(distinct distinct_id) AS dau
FROM events
WHERE event = '$pageview'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY day
ORDER BY day`,
    from,
    to,
  );
}

export function topPages({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  properties.$pathname AS path,
  count() AS views,
  count(distinct distinct_id) AS uniques
FROM events
WHERE event = '$pageview'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY path
ORDER BY views DESC
LIMIT 10`,
    from,
    to,
  );
}

export function signupFunnel({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  countIf(event = '$pageview' AND properties.$pathname = '/') AS step1_landing,
  countIf(event = '$pageview' AND properties.$pathname LIKE '/sign-up%') AS step2_signup_page,
  countIf(event = 'signup_completed') AS step3_completed
FROM events
WHERE timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})`,
    from,
    to,
  );
}

export function langSplit({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  properties.lang AS lang,
  count() AS sent
FROM events
WHERE event = 'chat_query_sent'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY lang
ORDER BY sent DESC`,
    from,
    to,
  );
}

export function clarifyRate({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  countIf(event = 'chat_clarify_shown') / nullIf(countIf(event = 'chat_query_sent'), 0) AS clarify_rate
FROM events
WHERE timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})`,
    from,
    to,
  );
}

export function citationHealth({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  avg(toFloat(properties.citations)) AS avg_citations,
  countIf(toFloat(properties.citations) = 0) / nullIf(count(), 0) AS zero_citation_rate,
  avg(toFloat(properties.latency_ms)) AS avg_latency_ms
FROM events
WHERE event = 'chat_answer_received'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})`,
    from,
    to,
  );
}

export function topQueries({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  properties.query_snippet AS query,
  count() AS hits,
  avg(toFloat(properties.length)) AS avg_len
FROM events
WHERE event = 'chat_query_sent'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY query
ORDER BY hits DESC
LIMIT 25`,
    from,
    to,
  );
}

export function cohortRetention({ from, to }: TimeRange): string {
  return injectTimeRange(
    `WITH signups AS (
  SELECT
    distinct_id,
    toStartOfWeek(min(timestamp)) AS cohort_week
  FROM events
  WHERE event = 'signup_completed'
  GROUP BY distinct_id
)
SELECT
  s.cohort_week AS cohort,
  toStartOfWeek(e.timestamp) AS active_week,
  count(distinct e.distinct_id) AS active
FROM events e
JOIN signups s USING distinct_id
WHERE e.event = '$pageview'
  AND e.timestamp >= toDateTime({{from}})
  AND e.timestamp <  toDateTime({{to}})
  AND s.cohort_week >= now() - toIntervalDay(90)
GROUP BY cohort, active_week
ORDER BY cohort DESC, active_week ASC`,
    from,
    to,
  );
}

export function topExceptions({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  properties.$exception_message AS message,
  count() AS hits,
  count(distinct distinct_id) AS users
FROM events
WHERE event = '$exception'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY message
ORDER BY hits DESC
LIMIT 20`,
    from,
    to,
  );
}

export function chatNextStep({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  properties.$pathname AS next_path,
  count() AS hits
FROM events
WHERE event = '$pageview'
  AND distinct_id IN (
    SELECT distinct distinct_id FROM events
    WHERE event = '$pageview' AND properties.$pathname LIKE '/chat%'
      AND timestamp >= toDateTime({{from}})
      AND timestamp <  toDateTime({{to}})
  )
  AND properties.$pathname NOT LIKE '/chat%'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY next_path
ORDER BY hits DESC
LIMIT 12`,
    from,
    to,
  );
}

export function liveActivity(_range?: TimeRange): string {
  return `SELECT
  event,
  distinct_id,
  properties.$pathname AS path,
  timestamp
FROM events
WHERE timestamp >= now() - toIntervalSecond(60)
ORDER BY timestamp DESC
LIMIT 30`;
}

export function eventVolume({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  toStartOfDay(timestamp) AS day,
  event,
  count() AS hits
FROM events
WHERE timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY day, event
ORDER BY day ASC, hits DESC`,
    from,
    to,
  );
}

export function kpiSnapshot({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  uniqIf(distinct_id, event = '$pageview') AS dau,
  uniqIf(properties.$session_id, event = '$pageview') AS sessions,
  countIf(event = 'chat_query_sent') AS chat_queries,
  countIf(event = 'signup_completed') AS signups
FROM events
WHERE timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})`,
    from,
    to,
  );
}

export function kpiBehavior({ from, to }: TimeRange): string {
  return injectTimeRange(
    `WITH s AS (
  SELECT
    \`$session_id\` AS sid,
    dateDiff('second', min(timestamp), max(timestamp)) AS duration,
    countIf(event = '$pageview') AS pv
  FROM events
  WHERE timestamp >= toDateTime({{from}})
    AND timestamp <  toDateTime({{to}})
    AND \`$session_id\` IS NOT NULL
  GROUP BY sid
)
SELECT
  avg(duration) AS avg_session_duration_s,
  avg(pv) AS avg_pages_per_session,
  countIf(pv <= 1) / nullIf(count(), 0) AS bounce_rate,
  (
    SELECT count(distinct distinct_id)
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= toDateTime({{from}})
      AND timestamp <  toDateTime({{to}})
      AND distinct_id IN (
        SELECT distinct distinct_id
        FROM events
        WHERE event = '$pageview'
          AND timestamp < toDateTime({{from}})
      )
  ) / nullIf(
    (SELECT count(distinct distinct_id) FROM events
     WHERE event = '$pageview'
       AND timestamp >= toDateTime({{from}})
       AND timestamp <  toDateTime({{to}})), 0
  ) AS returning_rate
FROM s`,
    from,
    to,
  );
}

export function pageEngagement({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  properties.\`$prev_pageview_pathname\` AS path,
  count() AS views,
  count(distinct distinct_id) AS uniques,
  avg(toFloat(properties.\`$prev_pageview_duration\`)) AS avg_dwell_s,
  avg(toFloat(properties.\`$prev_pageview_max_scroll_percentage\`)) * 100 AS avg_max_scroll
FROM events
WHERE event = '$pageleave'
  AND properties.\`$prev_pageview_pathname\` IS NOT NULL
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY path
ORDER BY views DESC
LIMIT 25`,
    from,
    to,
  );
}

export function topClickedElements({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  substring(properties.\`$el_text\`, 1, 60) AS text,
  properties.\`$pathname\` AS path,
  count() AS clicks
FROM events
WHERE event = '$autocapture'
  AND properties.\`$el_text\` IS NOT NULL
  AND properties.\`$el_text\` != ''
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY text, path
ORDER BY clicks DESC
LIMIT 30`,
    from,
    to,
  );
}

export function dropoffPages({ from, to }: TimeRange): string {
  // Compute exit pages from events grouped by ($session_id, distinct_id) since
  // PostHog HogQL sessions table coverage of argMax patterns is uneven across
  // projects. Window-function style + CTE is the safe portable path.
  return injectTimeRange(
    `WITH page_views AS (
  SELECT
    distinct_id,
    \`$session_id\` AS sid,
    properties.\`$pathname\` AS path,
    timestamp
  FROM events
  WHERE event = '$pageview'
    AND \`$session_id\` IS NOT NULL
    AND timestamp >= toDateTime({{from}})
    AND timestamp <  toDateTime({{to}})
), exits AS (
  SELECT
    distinct_id,
    sid,
    argMax(path, timestamp) AS exit_path
  FROM page_views
  GROUP BY distinct_id, sid
), exit_counts AS (
  SELECT exit_path AS path, count() AS exits
  FROM exits
  GROUP BY path
), view_counts AS (
  SELECT path, count() AS views
  FROM page_views
  GROUP BY path
)
SELECT
  e.path AS path,
  e.exits AS exits,
  e.exits / nullIf(v.views, 0) AS exit_rate
FROM exit_counts e
LEFT JOIN view_counts v ON v.path = e.path
ORDER BY exits DESC
LIMIT 15`,
    from,
    to,
  );
}

export function sessionDurationHistogram({ from, to }: TimeRange): string {
  return injectTimeRange(
    `WITH s AS (
  SELECT
    \`$session_id\` AS sid,
    dateDiff('second', min(timestamp), max(timestamp)) AS duration
  FROM events
  WHERE timestamp >= toDateTime({{from}})
    AND timestamp <  toDateTime({{to}})
    AND \`$session_id\` IS NOT NULL
  GROUP BY sid
)
SELECT
  multiIf(
    duration < 30, '0-30s',
    duration < 120, '30s-2m',
    duration < 300, '2-5m',
    duration < 900, '5-15m',
    '15m+'
  ) AS bucket,
  count() AS sessions
FROM s
GROUP BY bucket
ORDER BY
  multiIf(bucket = '0-30s', 1, bucket = '30s-2m', 2, bucket = '2-5m', 3, bucket = '5-15m', 4, 5)`,
    from,
    to,
  );
}

export function hourOfDayHeatmap({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  toDayOfWeek(timestamp) AS dow,
  toHour(timestamp) AS hour,
  count() AS hits
FROM events
WHERE event = '$pageview'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY dow, hour
HAVING hits > 0
ORDER BY dow, hour`,
    from,
    to,
  );
}

export function geoSplit({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  coalesce(properties.\`$geoip_country_code\`, 'Unknown') AS country,
  count() AS hits,
  count(distinct distinct_id) AS uniques
FROM events
WHERE event = '$pageview'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY country
ORDER BY hits DESC
LIMIT 15`,
    from,
    to,
  );
}

export function deviceSplit({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  coalesce(properties.\`$device_type\`, 'unknown') AS device,
  count() AS hits
FROM events
WHERE event = '$pageview'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY device
ORDER BY hits DESC`,
    from,
    to,
  );
}

export function browserSplit({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  coalesce(properties.\`$browser\`, 'unknown') AS browser,
  count() AS hits
FROM events
WHERE event = '$pageview'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY browser
ORDER BY hits DESC
LIMIT 8`,
    from,
    to,
  );
}

export function bounceRate({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  countIf(\`$pageview_count\` <= 1) / nullIf(count(), 0) AS bounce_rate
FROM sessions
WHERE \`$start_timestamp\` >= toDateTime({{from}})
  AND \`$start_timestamp\` <  toDateTime({{to}})`,
    from,
    to,
  );
}

export function returningRate({ from, to }: TimeRange): string {
  return injectTimeRange(
    `WITH window_users AS (
  SELECT distinct distinct_id
  FROM events
  WHERE event = '$pageview'
    AND timestamp >= toDateTime({{from}})
    AND timestamp <  toDateTime({{to}})
), returning_users AS (
  SELECT distinct distinct_id
  FROM events
  WHERE event = '$pageview'
    AND timestamp < toDateTime({{from}})
    AND distinct_id IN (SELECT distinct_id FROM window_users)
)
SELECT
  (SELECT count() FROM returning_users) / nullIf((SELECT count() FROM window_users), 0) AS returning_rate,
  (SELECT count() FROM window_users) AS total_users`,
    from,
    to,
  );
}

export function utmSourceCampaign({ from, to }: TimeRange): string {
  // Aggregate UTM-tagged sessions, signups, and activated users (≥3 chats in
  // 7d post-signup) per `properties.$utm_source`. Activated count requires
  // the chat_query_sent event; before Tier 1 is shipped it returns 0.
  return injectTimeRange(
    `WITH source_sessions AS (
  SELECT
    coalesce(properties.\`$utm_source\`, '') AS utm_source,
    \`$session_id\` AS sid,
    distinct_id
  FROM events
  WHERE event = '$pageview'
    AND \`$session_id\` IS NOT NULL
    AND properties.\`$utm_source\` IS NOT NULL
    AND properties.\`$utm_source\` != ''
    AND timestamp >= toDateTime({{from}})
    AND timestamp <  toDateTime({{to}})
), source_signups AS (
  SELECT
    coalesce(properties.\`$utm_source\`, '') AS utm_source,
    distinct_id
  FROM events
  WHERE event = 'signup_completed'
    AND properties.\`$utm_source\` IS NOT NULL
    AND properties.\`$utm_source\` != ''
    AND timestamp >= toDateTime({{from}})
    AND timestamp <  toDateTime({{to}})
), source_activated AS (
  SELECT
    s.utm_source AS utm_source,
    s.distinct_id AS distinct_id
  FROM source_signups s
  WHERE (
    SELECT count()
    FROM events e
    WHERE e.event = 'chat_query_sent'
      AND e.distinct_id = s.distinct_id
      AND e.timestamp >= toDateTime({{from}})
      AND e.timestamp <  toDateTime({{to}})
  ) >= 3
)
SELECT
  utm_source,
  count(distinct sid) AS sessions,
  (SELECT count(distinct distinct_id) FROM source_signups WHERE source_signups.utm_source = source_sessions.utm_source) AS signups,
  (SELECT count(distinct distinct_id) FROM source_activated WHERE source_activated.utm_source = source_sessions.utm_source) AS activated
FROM source_sessions
GROUP BY utm_source
ORDER BY sessions DESC
LIMIT 50`,
    from,
    to,
  );
}

// ── Tier 2 builders ───────────────────────────────────────────────

/**
 * Tier 2 — SI8 Time-of-Use heatmap. Day-of-week x hour grid over
 * `chat_query_sent` only (NOT $pageview), so the heatmap reflects
 * actual chat usage rather than general site traffic.
 */
export function timeOfUseHeatmap({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  toDayOfWeek(timestamp) AS dow,
  toHour(timestamp) AS hour,
  count() AS queries
FROM events
WHERE event = 'chat_query_sent'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY dow, hour
HAVING queries > 0
ORDER BY dow, hour`,
    from,
    to,
  );
}

/**
 * Tier 2 — SI9 Language Preference split. Counts + uniques per
 * `properties.lang` over `chat_query_sent`.
 */
export function languagePreference({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  coalesce(properties.lang, 'unknown') AS lang,
  count() AS hits,
  count(distinct distinct_id) AS uniques
FROM events
WHERE event = 'chat_query_sent'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY lang
ORDER BY hits DESC
LIMIT 20`,
    from,
    to,
  );
}

/**
 * Tier 2 — W4 Channel ROI table. Pageviews grouped by
 * `properties.$utm_source`, joined with signups and activated users
 * (>=3 chats post-signup) per source. Mirrors `utmSourceCampaign`
 * but exposes a separate slot so the conversion-tab table can evolve
 * independently of the launch-campaigns surface.
 */
export function channelROI({ from, to }: TimeRange): string {
  return injectTimeRange(
    `WITH source_sessions AS (
  SELECT
    coalesce(properties.\`$utm_source\`, 'direct') AS utm_source,
    \`$session_id\` AS sid,
    distinct_id
  FROM events
  WHERE event = '$pageview'
    AND \`$session_id\` IS NOT NULL
    AND timestamp >= toDateTime({{from}})
    AND timestamp <  toDateTime({{to}})
), source_signups AS (
  SELECT
    coalesce(properties.\`$utm_source\`, 'direct') AS utm_source,
    distinct_id
  FROM events
  WHERE event = 'signup_completed'
    AND timestamp >= toDateTime({{from}})
    AND timestamp <  toDateTime({{to}})
), source_activated AS (
  SELECT
    s.utm_source AS utm_source,
    s.distinct_id AS distinct_id
  FROM source_signups s
  WHERE (
    SELECT count()
    FROM events e
    WHERE e.event = 'chat_query_sent'
      AND e.distinct_id = s.distinct_id
      AND e.timestamp >= toDateTime({{from}})
      AND e.timestamp <  toDateTime({{to}})
  ) >= 3
)
SELECT
  utm_source,
  count(distinct sid) AS sessions,
  (SELECT count(distinct distinct_id) FROM source_signups WHERE source_signups.utm_source = source_sessions.utm_source) AS signups,
  (SELECT count(distinct distinct_id) FROM source_activated WHERE source_activated.utm_source = source_sessions.utm_source) AS activated
FROM source_sessions
GROUP BY utm_source
ORDER BY sessions DESC
LIMIT 50`,
    from,
    to,
  );
}

/**
 * Tier 2 — W7 Top Search Snippets. Pulls last `chat_query_sent`
 * `query_snippet` rows for the topic-clustering job. Snippets are
 * already trimmed to 60 chars at capture time per the privacy
 * contract; we return them unchanged here for the server to feed
 * Gemini.
 */
export function topSearchSnippets({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  properties.query_snippet AS query_snippet,
  count() AS hits
FROM events
WHERE event = 'chat_query_sent'
  AND properties.query_snippet IS NOT NULL
  AND properties.query_snippet != ''
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})
GROUP BY query_snippet
ORDER BY hits DESC
LIMIT 500`,
    from,
    to,
  );
}

/**
 * Tier 2 — Signup -> first chat rate. Returns the count of users
 * who signed up in window and the count of those who fired at least
 * one `chat_query_sent` in the same window. Drives the
 * signup_to_first_chat_rate KPI.
 */
export function chatActivation({ from, to }: TimeRange): string {
  return injectTimeRange(
    `WITH signers AS (
  SELECT distinct distinct_id AS uid
  FROM events
  WHERE event = 'signup_completed'
    AND timestamp >= toDateTime({{from}})
    AND timestamp <  toDateTime({{to}})
), first_chats AS (
  SELECT distinct distinct_id AS uid
  FROM events
  WHERE event = 'chat_query_sent'
    AND distinct_id IN (SELECT uid FROM signers)
    AND timestamp >= toDateTime({{from}})
    AND timestamp <  toDateTime({{to}})
)
SELECT
  (SELECT count() FROM signers) AS signups,
  (SELECT count() FROM first_chats) AS activated_first_chat`,
    from,
    to,
  );
}

/**
 * Tier 2 — DAU / MAU stickiness. DAU = window pageview-uniques over
 * the most recent UTC day in the range; MAU = pageview-uniques over
 * the past 28 days. Drives the dau_mau_stickiness KPI.
 */
export function dauMauStickiness({ from: _from, to }: TimeRange): string {
  // Anchor MAU on the window-end so the metric is comparable across
  // ranges. DAU is the trailing 24h, MAU the trailing 28d, both from `to`.
  void _from;
  return `WITH d AS (
  SELECT count(distinct distinct_id) AS dau
  FROM events
  WHERE event = '$pageview'
    AND timestamp >= toDateTime('${to.replace(/'/g, "")}') - toIntervalDay(1)
    AND timestamp <  toDateTime('${to.replace(/'/g, "")}')
), m AS (
  SELECT count(distinct distinct_id) AS mau
  FROM events
  WHERE event = '$pageview'
    AND timestamp >= toDateTime('${to.replace(/'/g, "")}') - toIntervalDay(28)
    AND timestamp <  toDateTime('${to.replace(/'/g, "")}')
)
SELECT
  (SELECT dau FROM d) AS dau,
  (SELECT mau FROM m) AS mau,
  (SELECT dau FROM d) / nullIf((SELECT mau FROM m), 0) AS stickiness`;
}

/**
 * Tier 2 — Search satisfaction rate. Positive vs total ratings on
 * `search_result_rated`. Drives the search_satisfaction_rate KPI.
 */
export function searchSatisfaction({ from, to }: TimeRange): string {
  return injectTimeRange(
    `SELECT
  countIf(toFloat(properties.rating) > 0) AS positive,
  count() AS total,
  countIf(toFloat(properties.rating) > 0) / nullIf(count(), 0) AS satisfaction_rate
FROM events
WHERE event = 'search_result_rated'
  AND timestamp >= toDateTime({{from}})
  AND timestamp <  toDateTime({{to}})`,
    from,
    to,
  );
}

export const queries = {
  dauTrend,
  topPages,
  signupFunnel,
  langSplit,
  clarifyRate,
  citationHealth,
  topQueries,
  cohortRetention,
  topExceptions,
  chatNextStep,
  liveActivity,
  eventVolume,
  kpiSnapshot,
  kpiBehavior,
  pageEngagement,
  topClickedElements,
  dropoffPages,
  sessionDurationHistogram,
  hourOfDayHeatmap,
  geoSplit,
  deviceSplit,
  browserSplit,
  bounceRate,
  returningRate,
  utmSourceCampaign,
  timeOfUseHeatmap,
  languagePreference,
  channelROI,
  topSearchSnippets,
  chatActivation,
  dauMauStickiness,
  searchSatisfaction,
} as const;

export type QueryName = keyof typeof queries;
