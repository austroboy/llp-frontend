/**
 * PostHog audience + quality blocks for the admin dashboard overview.
 *
 * Wraps existing query funcs from src/lib/posthog/queries.ts behind an
 * 8s deadline. Any throw / timeout returns the EMPTY_* default and
 * surfaces the message via the `errors` aggregator in route.ts.
 */

import { runHogQL } from "@/lib/posthog/server";
import {
  citationHealth,
  dauTrend,
  geoSplit,
  topExceptions,
  topPages,
  topQueries,
} from "@/lib/posthog/queries";
import type {
  AudienceBlock,
  QualityBlock,
} from "@/app/admin/dashboard-overview/types";
import {
  EMPTY_AUDIENCE,
  EMPTY_QUALITY,
} from "@/app/admin/dashboard-overview/types";

const DEADLINE_MS = 8_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Country-code → display name. Tiny manual map for the top-N we expect. */
const COUNTRY_NAMES: Record<string, string> = {
  BD: "Bangladesh",
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  AE: "UAE",
  SA: "Saudi Arabia",
  MY: "Malaysia",
  SG: "Singapore",
  PK: "Pakistan",
  CA: "Canada",
  AU: "Australia",
  Unknown: "Unknown",
};

function rowsToObjects(result: {
  columns: string[];
  results: unknown[][];
}): Record<string, unknown>[] {
  return result.results.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

function withDeadline<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`PostHog query timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
    );
  });
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/**
 * Audience block: 30d DAU sparkline + today's top page / top query / top country.
 */
export async function fetchAudienceBlock(
  todayStartIso: string,
  nowIso: string,
): Promise<{ block: AudienceBlock; error?: string }> {
  if (!process.env.POSTHOG_PERSONAL_API_KEY || !process.env.POSTHOG_PROJECT_ID) {
    return { block: EMPTY_AUDIENCE, error: "PostHog not configured" };
  }

  const dauFrom = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const dauTo = new Date().toISOString();

  try {
    const [dauRes, pagesRes, queriesRes, geoRes] = await Promise.allSettled([
      withDeadline(
        runHogQL(dauTrend({ from: dauFrom, to: dauTo })),
        DEADLINE_MS,
      ),
      withDeadline(
        runHogQL(topPages({ from: todayStartIso, to: nowIso })),
        DEADLINE_MS,
      ),
      withDeadline(
        runHogQL(topQueries({ from: todayStartIso, to: nowIso })),
        DEADLINE_MS,
      ),
      withDeadline(
        runHogQL(geoSplit({ from: todayStartIso, to: nowIso })),
        DEADLINE_MS,
      ),
    ]);

    const errors: string[] = [];

    // DAU sparkline + today (last bucket).
    let dauSparkline: number[] = [];
    let todayDau = 0;
    if (dauRes.status === "fulfilled") {
      const rows = rowsToObjects(dauRes.value);
      dauSparkline = rows.map((r) => num(r.dau));
      todayDau = dauSparkline.length
        ? dauSparkline[dauSparkline.length - 1]
        : 0;
    } else {
      errors.push(`dauTrend: ${(dauRes.reason as Error).message}`);
    }

    // Top page (first row, sorted by views desc).
    let topPage: AudienceBlock["topPage"] = null;
    if (pagesRes.status === "fulfilled") {
      const rows = rowsToObjects(pagesRes.value);
      if (rows.length > 0 && str(rows[0].path)) {
        topPage = { path: str(rows[0].path), views: num(rows[0].views) };
      }
    } else {
      errors.push(`topPages: ${(pagesRes.reason as Error).message}`);
    }

    // Top chat query.
    let topQuery: AudienceBlock["topQuery"] = null;
    if (queriesRes.status === "fulfilled") {
      const rows = rowsToObjects(queriesRes.value);
      if (rows.length > 0 && str(rows[0].query)) {
        topQuery = { text: str(rows[0].query), count: num(rows[0].hits) };
      }
    } else {
      errors.push(`topQueries: ${(queriesRes.reason as Error).message}`);
    }

    // Top country (compute pct = top / sum).
    let topCountry: AudienceBlock["topCountry"] = null;
    if (geoRes.status === "fulfilled") {
      const rows = rowsToObjects(geoRes.value);
      const total = rows.reduce((a, r) => a + num(r.hits), 0);
      if (rows.length > 0 && total > 0) {
        const top = rows[0];
        const code = str(top.country) || "Unknown";
        topCountry = {
          code,
          name: COUNTRY_NAMES[code] ?? code,
          pct: Math.round((num(top.hits) / total) * 1000) / 10,
        };
      }
    } else {
      errors.push(`geoSplit: ${(geoRes.reason as Error).message}`);
    }

    return {
      block: {
        dauSparkline,
        todayDau,
        topPage,
        topQuery,
        topCountry,
      },
      error: errors.length ? errors.join("; ") : undefined,
    };
  } catch (err) {
    return { block: EMPTY_AUDIENCE, error: (err as Error).message };
  }
}

/**
 * Quality block: today's citation health % + 7-day trend + top exception.
 *
 * citationHealthPct = (1 - zero_citation_rate) * 100. The PostHog query
 * already returns zero_citation_rate; we invert it for the "answers
 * backed by law" framing in the spec.
 *
 * citationTrend7d: 7 sequential daily HogQL calls. Could become a single
 * GROUP BY day query later — kept as 7 calls for now to reuse the
 * existing tested query func.
 */
export async function fetchQualityBlock(
  todayStartIso: string,
  nowIso: string,
): Promise<{ block: QualityBlock; error?: string }> {
  if (!process.env.POSTHOG_PERSONAL_API_KEY || !process.env.POSTHOG_PROJECT_ID) {
    return { block: EMPTY_QUALITY, error: "PostHog not configured" };
  }

  try {
    // Build 7 day windows ending at nowIso (oldest first).
    const nowMs = new Date(nowIso).getTime();
    const dayWindows: Array<{ from: string; to: string }> = [];
    for (let i = 6; i >= 0; i--) {
      const from = new Date(nowMs - (i + 1) * DAY_MS).toISOString();
      const to = new Date(nowMs - i * DAY_MS).toISOString();
      dayWindows.push({ from, to });
    }

    const trendPromises = dayWindows.map((w) =>
      withDeadline(runHogQL(citationHealth(w)), DEADLINE_MS).then(
        (res) => {
          const rows = rowsToObjects(res);
          if (rows.length === 0) return null;
          const zeroRate = rows[0].zero_citation_rate;
          if (zeroRate == null) return null;
          return Math.round((1 - num(zeroRate)) * 100 * 10) / 10;
        },
        () => null,
      ),
    );

    const [todayHealthRes, exceptionsRes, trendRes] = await Promise.allSettled([
      withDeadline(
        runHogQL(citationHealth({ from: todayStartIso, to: nowIso })),
        DEADLINE_MS,
      ),
      withDeadline(
        runHogQL(topExceptions({ from: todayStartIso, to: nowIso })),
        DEADLINE_MS,
      ),
      Promise.all(trendPromises),
    ]);

    const errors: string[] = [];

    let citationHealthPct: number | null = null;
    if (todayHealthRes.status === "fulfilled") {
      const rows = rowsToObjects(todayHealthRes.value);
      if (rows.length > 0 && rows[0].zero_citation_rate != null) {
        citationHealthPct =
          Math.round((1 - num(rows[0].zero_citation_rate)) * 100 * 10) / 10;
      }
    } else {
      errors.push(`citationHealth: ${(todayHealthRes.reason as Error).message}`);
    }

    let topException: QualityBlock["topException"] = null;
    if (exceptionsRes.status === "fulfilled") {
      const rows = rowsToObjects(exceptionsRes.value);
      if (rows.length > 0 && str(rows[0].message)) {
        topException = {
          message: str(rows[0].message),
          count: num(rows[0].hits),
        };
      }
    } else {
      errors.push(
        `topExceptions: ${(exceptionsRes.reason as Error).message}`,
      );
    }

    let citationTrend7d: number[] = [];
    if (trendRes.status === "fulfilled") {
      // Drop nulls — keep only days that produced a number, oldest first.
      citationTrend7d = trendRes.value.filter(
        (v): v is number => typeof v === "number",
      );
    } else {
      errors.push(
        `citationTrend7d: ${(trendRes.reason as Error).message}`,
      );
    }

    return {
      block: { citationHealthPct, citationTrend7d, topException },
      error: errors.length ? errors.join("; ") : undefined,
    };
  } catch (err) {
    return { block: EMPTY_QUALITY, error: (err as Error).message };
  }
}
