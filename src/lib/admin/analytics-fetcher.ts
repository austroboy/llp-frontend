import { headers } from "next/headers";
import type { HogQLResult } from "@/lib/posthog/server";
import type { QueryName, TimeRange } from "@/lib/posthog/queries";

interface FetchOptions {
  signal?: AbortSignal;
}

function resolveBaseUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL;
  if (env) {
    return env.startsWith("http") ? env : `https://${env}`;
  }
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

export async function fetchAnalytics<Q extends QueryName>(
  queryName: Q,
  range: TimeRange,
  params?: Record<string, unknown>,
  options?: FetchOptions,
): Promise<HogQLResult> {
  const url = `${resolveBaseUrl()}/api/admin/analytics/query`;
  const cookie =
    typeof window === "undefined" ? (await headers()).get("cookie") ?? "" : "";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ queryName, from: range.from, to: range.to, params }),
    next: { revalidate: 60 },
    signal: options?.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`analytics fetch failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return (await res.json()) as HogQLResult;
}

export function parseRows<T extends Record<string, unknown>>(
  result: HogQLResult,
): T[] {
  if (!result?.columns || !result?.results) return [];
  return result.results.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as T;
  });
}
