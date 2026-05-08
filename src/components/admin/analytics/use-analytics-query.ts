"use client";

import { useEffect, useState } from "react";
import type { HogQLResult } from "@/lib/posthog/server";
import type { QueryName } from "@/lib/posthog/queries";
import { useDateRange } from "@/components/admin/analytics/date-range-context";

interface QueryState<T> {
  rows: T[];
  loading: boolean;
  error: string | null;
}

function rowsToObjects<T extends Record<string, unknown>>(
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

export function useAnalyticsQuery<T extends Record<string, unknown>>(
  queryName: QueryName,
  params?: Record<string, unknown>,
): QueryState<T> {
  const { from, to, refreshKey } = useDateRange();
  const [state, setState] = useState<QueryState<T>>({
    rows: [],
    loading: true,
    error: null,
  });

  const paramsKey = params ? JSON.stringify(params) : "";

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    fetch("/api/admin/analytics/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queryName, from, to, params: paramsKey ? JSON.parse(paramsKey) : undefined }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        }
        return (await res.json()) as HogQLResult;
      })
      .then((result) => {
        if (cancelled) return;
        setState({ rows: rowsToObjects<T>(result), loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : "";
        if (name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "fetch failed";
        if (msg.includes("aborted")) return;
        setState({ rows: [], loading: false, error: msg });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queryName, from, to, refreshKey, paramsKey]);

  return state;
}
