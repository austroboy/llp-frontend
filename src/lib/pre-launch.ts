"use client";

import { useEffect, useState } from "react";

// Asia/Dhaka launch moment for LLP Universe.
export const LAUNCH_DATE = new Date("2026-05-01T00:00:00+06:00");

export function isPreLaunch(now: Date = new Date()): boolean {
  return now < LAUNCH_DATE;
}

/**
 * Client hook: returns true while the site is pre-launch.
 * Starts `false` on server/first render to avoid hydration mismatch,
 * then flips to the real value after mount.
 */
export function usePreLaunchLock(): boolean {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    setLocked(isPreLaunch());
  }, []);
  return locked;
}
