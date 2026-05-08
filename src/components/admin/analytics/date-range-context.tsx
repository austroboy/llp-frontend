"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type RangeKey = "24h" | "7d" | "30d" | "90d";

export interface DateRangeValue {
  range: RangeKey;
  from: string;
  to: string;
  setRange: (r: RangeKey) => void;
  refresh: () => void;
  refreshKey: number;
}

const RANGE_TO_HOURS: Record<RangeKey, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  "90d": 24 * 90,
};

const DateRangeContext = createContext<DateRangeValue | null>(null);

export function DateRangeProvider({
  children,
  initial = "7d",
}: {
  children: ReactNode;
  initial?: RangeKey;
}) {
  const [range, setRange] = useState<RangeKey>(initial);
  const [refreshKey, setRefreshKey] = useState(0);

  // Window timestamps recompute whenever range or refresh ticks.
  const { from, to } = useMemo(() => {
    const now = new Date();
    const fromDate = new Date(
      now.getTime() - RANGE_TO_HOURS[range] * 60 * 60 * 1000,
    );
    return { from: fromDate.toISOString(), to: now.toISOString() };
  }, [range, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((n) => n + 1);
  }, []);

  const value = useMemo<DateRangeValue>(
    () => ({ range, from, to, setRange, refresh, refreshKey }),
    [range, from, to, refresh, refreshKey],
  );

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange(): DateRangeValue {
  const ctx = useContext(DateRangeContext);
  if (!ctx) {
    throw new Error("useDateRange must be used inside DateRangeProvider");
  }
  return ctx;
}

export function useRefreshKey(): number {
  return useDateRange().refreshKey;
}
