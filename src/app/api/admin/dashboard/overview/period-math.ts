/**
 * Asia/Dhaka period math for the admin dashboard overview.
 *
 * Dhaka is a fixed +06:00 offset year-round (no DST), so we treat the
 * "local" time as `UTC + 6h` without hitting Intl. Keeps the math
 * deterministic for tests + cache keys.
 *
 * Spec: docs/superpowers/specs/2026-04-28-admin-home-hero-board-design.md
 */

import type { Period, PeriodRange } from "@/app/admin/dashboard-overview/types";

/** Asia/Dhaka offset in milliseconds (no DST). */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Format a UTC instant as ISO with `+06:00` offset suffix (Asia/Dhaka). */
export function toDhakaIso(utcMs: number): string {
  const localMs = utcMs + DHAKA_OFFSET_MS;
  const d = new Date(localMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+06:00`;
}

/** YYYY-MM-DD for a UTC instant rendered in Asia/Dhaka local time. */
export function dhakaYmd(utcMs: number): string {
  const localMs = utcMs + DHAKA_OFFSET_MS;
  const d = new Date(localMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** UTC ms for Dhaka-local 00:00 of the given UTC instant. */
function dhakaStartOfDayUtc(utcMs: number): number {
  const localMs = utcMs + DHAKA_OFFSET_MS;
  const d = new Date(localMs);
  const localMidnight = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    0,
    0,
    0,
    0,
  );
  return localMidnight - DHAKA_OFFSET_MS;
}

/** UTC ms for Monday 00:00 (Asia/Dhaka local) of the ISO week containing nowUtc. */
function dhakaStartOfIsoWeekUtc(nowUtc: number): number {
  const startOfDayUtc = dhakaStartOfDayUtc(nowUtc);
  // Compute weekday in Dhaka. JS getUTCDay: 0=Sun..6=Sat. ISO Monday=0, Sunday=6.
  const localD = new Date(startOfDayUtc + DHAKA_OFFSET_MS);
  const jsDow = localD.getUTCDay(); // 0..6
  const daysSinceMonday = (jsDow + 6) % 7; // 0 if Monday, 6 if Sunday
  return startOfDayUtc - daysSinceMonday * DAY_MS;
}

/** UTC ms for Dhaka-local 1st-of-month 00:00 of the month containing nowUtc. */
function dhakaStartOfMonthUtc(nowUtc: number): number {
  const localMs = nowUtc + DHAKA_OFFSET_MS;
  const d = new Date(localMs);
  const localFirst = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  return localFirst - DHAKA_OFFSET_MS;
}

/** Compute the prior-month 1st in Dhaka local time. */
function dhakaStartOfPriorMonthUtc(nowUtc: number): number {
  const localMs = nowUtc + DHAKA_OFFSET_MS;
  const d = new Date(localMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const priorY = m === 0 ? y - 1 : y;
  const priorM = m === 0 ? 11 : m - 1;
  const localPriorFirst = Date.UTC(priorY, priorM, 1, 0, 0, 0, 0);
  return localPriorFirst - DHAKA_OFFSET_MS;
}

export interface PeriodWindow {
  current: PeriodRange;
  prior: PeriodRange;
  /** YYYY-MM-DD list (Dhaka local) covering current.start → current.end (inclusive of any day touched). */
  currentDates: string[];
  priorDates: string[];
}

/** Inclusive list of YYYY-MM-DD dates between two UTC endpoints (Dhaka local). */
function ymdRange(startUtc: number, endUtc: number): string[] {
  const dates: string[] = [];
  let cursor = dhakaStartOfDayUtc(startUtc);
  const endDay = dhakaStartOfDayUtc(endUtc);
  while (cursor <= endDay) {
    dates.push(dhakaYmd(cursor));
    cursor += DAY_MS;
  }
  return dates;
}

/**
 * Compute current + prior windows for `today` / `week` / `month` in Asia/Dhaka.
 * Prior = same-shape window immediately preceding (yesterday / last week / last month).
 *
 * `nowUtc` is captured once per request so all three windows share a clock.
 */
export function computeAllPeriods(nowUtc: number): Record<Period, PeriodWindow> {
  // ── today
  const todayStart = dhakaStartOfDayUtc(nowUtc);
  const yesterdayStart = todayStart - DAY_MS;
  const today: PeriodWindow = {
    current: { start: toDhakaIso(todayStart), end: toDhakaIso(nowUtc) },
    prior: { start: toDhakaIso(yesterdayStart), end: toDhakaIso(todayStart) },
    currentDates: ymdRange(todayStart, nowUtc),
    priorDates: ymdRange(yesterdayStart, todayStart - 1),
  };

  // ── week (Mon 00:00 → now). Prior = full prior ISO week (Mon..Sun).
  const weekStart = dhakaStartOfIsoWeekUtc(nowUtc);
  const priorWeekStart = weekStart - 7 * DAY_MS;
  const week: PeriodWindow = {
    current: { start: toDhakaIso(weekStart), end: toDhakaIso(nowUtc) },
    prior: { start: toDhakaIso(priorWeekStart), end: toDhakaIso(weekStart) },
    currentDates: ymdRange(weekStart, nowUtc),
    priorDates: ymdRange(priorWeekStart, weekStart - 1),
  };

  // ── month (1st 00:00 → now). Prior = full prior calendar month.
  const monthStart = dhakaStartOfMonthUtc(nowUtc);
  const priorMonthStart = dhakaStartOfPriorMonthUtc(nowUtc);
  const month: PeriodWindow = {
    current: { start: toDhakaIso(monthStart), end: toDhakaIso(nowUtc) },
    prior: { start: toDhakaIso(priorMonthStart), end: toDhakaIso(monthStart) },
    currentDates: ymdRange(monthStart, nowUtc),
    priorDates: ymdRange(priorMonthStart, monthStart - 1),
  };

  return { today, week, month };
}
