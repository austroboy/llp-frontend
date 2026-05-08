"use client";

import { useReducer, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import type { CalcState, TierKey, PresetId, Currency, VerifyModel, SubscriptionItem, LiveDataResponse, MonthlyAggregate } from "./calc-types";
import { TIER_KEYS } from "./calc-types";
import { MODELS, USD_TO_BDT, T1_FIXED, T2_FIXED, QUALITY_BANDS } from "./models";
import { PRESETS, findPreset } from "./presets";
import { computeMonthly, computeBlended, applyMacros } from "./calc-engine";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number, currency: Currency = "USD"): string {
  if (currency === "BDT") {
    const bdt = n * USD_TO_BDT;
    if (bdt === 0) return "৳0";
    if (bdt < 0.01) return `৳${bdt.toFixed(4)}`;
    if (bdt < 100)  return `৳${bdt.toFixed(2)}`;
    return `৳${bdt.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  if (n === 0) return "$0.00";
  if (n < 0.0001) return `$${n.toFixed(8)}`;
  if (n < 0.01)   return `$${n.toFixed(6)}`;
  if (n < 1)      return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Slider({
  label, value, onChange, min = 0, max = 100, step = 1, displayValue, unit, editable = false, live = false,
}: {
  label: string; value: number; onChange: (n: number) => void;
  min?: number; max?: number; step?: number; displayValue?: string; unit?: string; editable?: boolean;
  /** When true: lock the slider, amber-outline it, and surface a tooltip. */
  live?: boolean;
}) {
  const liveTip = "Sourced from live telemetry — switch preset to override";
  return (
    <div className={`space-y-2 ${live ? "ring-1 ring-amber-500/40 rounded-md px-2 py-1.5 -mx-2 -my-1.5" : ""}`} title={live ? liveTip : undefined}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
          {label}
          {live && <span className="text-[9px] uppercase tracking-wider text-amber-500 font-mono">Live</span>}
        </span>
        {editable && !live ? (
          <div className="flex items-center gap-1">
            <input type="number" value={value} min={min} max={max} step={step}
              onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
              className="w-20 text-right text-xs font-mono tabular-nums bg-background border border-border rounded px-2 py-0.5 focus:outline-none focus:border-primary" />
            {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
          </div>
        ) : (
          <span className={`text-xs font-mono tabular-nums ${live ? "text-amber-500" : "text-muted-foreground"}`}>
            {displayValue ?? value}{unit ? ` ${unit}` : ""}
          </span>
        )}
      </div>
      <input type="range" value={value} min={min} max={max} step={step}
        onChange={e => { if (!live) onChange(Number(e.target.value)); }}
        disabled={live}
        className={`w-full h-1.5 cursor-pointer ${live ? "accent-amber-500 opacity-60 cursor-not-allowed" : "accent-primary"}`} />
    </div>
  );
}

function CostRow({
  label, cost, fmtUsd, muted = false,
}: { label: string; cost: number; fmtUsd: (n: number) => string; muted?: boolean }) {
  if (cost === 0 && muted) return null;
  return (
    <div className={`flex items-center justify-between gap-3 py-0.5 ${muted ? "opacity-35" : ""}`}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-[11px] font-mono tabular-nums ${cost === 0 ? "text-muted-foreground/40" : "text-foreground"}`}>
        {cost === 0 ? "—" : fmtUsd(cost)}
      </span>
    </div>
  );
}

function TokenBar({
  label, tokens, total, color,
}: { label: string; tokens: number; total: number; color: string }) {
  const pct = total > 0 ? (tokens / total) * 100 : 0;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground flex-1">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-20 h-1 bg-muted/30 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono text-[10px] w-14 text-right text-foreground/60">{tokens.toLocaleString()}</span>
      </div>
    </div>
  );
}

/** Header badge that surfaces the "Today (prod)" live-fetch status. */
function LiveBadge({
  status, fetchedAt, data,
}: {
  status: "idle" | "loading" | "ok" | "error";
  fetchedAt: number | null;
  data: LiveDataResponse | null;
}) {
  if (status === "loading") {
    return (
      <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-sky-500/10 text-sky-400">
        ⏳ Loading live…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        className="text-[10px] font-mono px-2 py-1 rounded-full bg-red-500/10 text-red-400"
        title="Falling back to calibrated 2026-04-28 static values."
      >
        🔴 Live data unavailable, using calibrated 2026-04-28 fallbacks
      </span>
    );
  }
  if (status === "ok" && data) {
    const ageMs = fetchedAt ? Date.now() - fetchedAt : 0;
    const ageMin = Math.max(0, Math.floor(ageMs / 60000));
    const ageLabel = ageMin === 0 ? "just now" : `${ageMin}m ago`;
    return (
      <span
        className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500"
        title={`${data.estNote} · window ${data.windowStart} → ${data.windowEnd} · ${data.totalRequests} requests, ${data.totalUsers} users`}
      >
        🟢 Live (last {data.windowDays} days) · updated {ageLabel}
      </span>
    );
  }
  return null;
}

const STORAGE_KEY_V3 = "cost-calc-v3";
const STORAGE_KEY_V2 = "cost-calc-v2";

// ─── State + Reducer ───────────────────────────────────────────────────────────

const INITIAL_STATE: CalcState = {
  presetId: "today",
  macros: { scaleUsers: 100, quality: 50, subsidyPct: 100 },
  overrides: [],
  phaseB: {
    flags: {
      ENABLE_HONESTY_GUARD: true,
      ENABLE_BN_BRIDGE: false,
      ENABLE_TURN1_VERIFY: false,
      ENABLE_RECOVERY_LOOP: false,
      ENABLE_F1_CORRECTOR: false,
      ENABLE_VERIFY_CACHE: false,
      ENABLE_SUBSECTION_SELFCHECK: false,
    },
    verifyModel: "opus",
    bnPct: 25,
    deepSearchPct: 5,
    cacheHitPct: 0,
    pDirty: 12,
    pF1: 3,
  },
  // Slider defaults calibrated 2026-04-28 vs real Grok telemetry
  // (scripts/grok-token-meter.ts — see project_cost_calculator memory).
  t1RagChunks: 1800,    // was 9600; live RAG retrieves ~8 chunks not 40
  t1TreeNodes: 0,       // was 7000; tree-reasoning bundled into RAG context now
  t1Output: 400,        // was 1436; legal answers are short (real avg 378)
  t2PriorAnswer: 400,
  t2History: 500,
  t2Output: 400,
  tierCfg: {
    free_guest:      { label: "Free Guest",      color: "text-zinc-400",    priceBdt: 0,   utilizationPct: 30, t1Uptime: 97, t2Uptime: 98 },
    free_subscribed: { label: "Free Subscribed", color: "text-sky-400",     priceBdt: 0,   utilizationPct: 30, t1Uptime: 97, t2Uptime: 98 },
    mini:            { label: "Mini",            color: "text-emerald-400", priceBdt: 149, utilizationPct: 60, t1Uptime: 97, t2Uptime: 98 },
    max:             { label: "Max",             color: "text-amber-400",   priceBdt: 299, utilizationPct: 80, t1Uptime: 97, t2Uptime: 98 },
  },
  monthlyUsage: { free_guest: 4, free_subscribed: 10, mini: 60, max: 180 },
  userCounts: { free_guest: 24, free_subscribed: 56, mini: 12, max: 8 },
  paidPercent: 20,
  currency: "USD",
  subscriptions: [],
};

const SUGGESTED_SUBSCRIPTIONS: Array<{ label: string; note: string; monthlyUsd: number }> = [
  { label: "Inference host",       note: "chat-proxy host",                 monthlyUsd: 15 },
  { label: "Bridge host",          note: "WhatsApp/Telegram bridges",        monthlyUsd: 14 },
  { label: "Vercel Pro",           note: "hosting + functions",              monthlyUsd: 20 },
  { label: "ChatGPT Pro / Codex",  note: "powers llp-chat-followup (T2)",    monthlyUsd: 100 },
  { label: "Claude Pro",           note: "powers F1 corrector + D1 verify",  monthlyUsd: 20 },
  { label: "Supabase",             note: "Postgres + pgvector",              monthlyUsd: 25 },
];

function newSubscriptionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type Action =
  | { type: "SET_PRESET"; presetId: PresetId }
  | { type: "SET_MACRO"; key: keyof CalcState["macros"]; value: number }
  | { type: "SET_PHASEB_FLAG"; flag: keyof CalcState["phaseB"]["flags"]; value: boolean }
  | { type: "SET_PHASEB_NUMBER"; key: Exclude<keyof CalcState["phaseB"], "flags" | "verifyModel">; value: number }
  | { type: "SET_VERIFY_MODEL"; value: VerifyModel }
  | { type: "SET_TOKEN"; key: "t1RagChunks" | "t1TreeNodes" | "t1Output" | "t2PriorAnswer" | "t2History" | "t2Output"; value: number }
  | { type: "SET_CURRENCY"; value: Currency }
  | { type: "SET_PAID_PCT"; value: number }
  | { type: "SET_TIER_USAGE"; tier: TierKey; value: number }
  | { type: "PATCH_TIER"; tier: TierKey; patch: Partial<CalcState["tierCfg"][TierKey]> }
  | { type: "ADD_OVERRIDE"; path: string }
  | { type: "REMOVE_OVERRIDE"; path: string }
  | { type: "RESET_OVERRIDES" }
  | { type: "HYDRATE"; state: CalcState }
  | { type: "ADD_SUBSCRIPTION"; item?: Partial<Omit<SubscriptionItem, "id">> }
  | { type: "UPDATE_SUBSCRIPTION"; id: string; patch: Partial<Omit<SubscriptionItem, "id">> }
  | { type: "REMOVE_SUBSCRIPTION"; id: string }
  | { type: "SEED_SUBSCRIPTIONS" }
  | { type: "CLEAR_SUBSCRIPTIONS" }
  | { type: "SET_TIER_USER_COUNT"; tier: TierKey; value: number }
  | { type: "LOAD_LIVE"; live: LiveDataResponse };

/**
 * Redistribute total users across 4 tiers using current paid/free + sub-splits.
 * Splits: 30% guest / 70% subscribed of free, 60% mini / 40% max of paid.
 */
function distributeUsers(total: number, paidPct: number): Record<TierKey, number> {
  const paidUsers = Math.round(total * (paidPct / 100));
  const freeUsers = Math.max(0, total - paidUsers);
  const guestUsers = Math.round(freeUsers * 0.3);
  const miniUsers = Math.round(paidUsers * 0.6);
  return {
    free_guest: guestUsers,
    free_subscribed: freeUsers - guestUsers,
    mini: miniUsers,
    max: paidUsers - miniUsers,
  };
}

function reducer(state: CalcState, action: Action): CalcState {
  switch (action.type) {
    case "SET_PRESET": {
      const preset = findPreset(action.presetId);
      if (!preset) return state;
      const presetBand = QUALITY_BANDS.find(b => preset.macros.quality <= b.max) ?? QUALITY_BANDS[QUALITY_BANDS.length - 1];
      const presetFlags: CalcState["phaseB"]["flags"] = {
        ENABLE_HONESTY_GUARD:        presetBand.flags.includes("ENABLE_HONESTY_GUARD"),
        ENABLE_BN_BRIDGE:            presetBand.flags.includes("ENABLE_BN_BRIDGE"),
        ENABLE_TURN1_VERIFY:         presetBand.flags.includes("ENABLE_TURN1_VERIFY"),
        ENABLE_RECOVERY_LOOP:        presetBand.flags.includes("ENABLE_RECOVERY_LOOP"),
        ENABLE_F1_CORRECTOR:         presetBand.flags.includes("ENABLE_F1_CORRECTOR"),
        ENABLE_VERIFY_CACHE:         presetBand.flags.includes("ENABLE_VERIFY_CACHE"),
        ENABLE_SUBSECTION_SELFCHECK: presetBand.flags.includes("ENABLE_SUBSECTION_SELFCHECK"),
      };
      return {
        ...state,
        presetId: action.presetId,
        macros: { ...preset.macros },
        overrides: [],
        phaseB: { ...state.phaseB, flags: presetFlags, verifyModel: presetBand.verifyModel ?? state.phaseB.verifyModel },
        userCounts: distributeUsers(preset.macros.scaleUsers, state.paidPercent),
      };
    }
    case "SET_MACRO": {
      const newMacros = { ...state.macros, [action.key]: action.value };
      // Scale slider redistributes userCounts under current paidPercent.
      if (action.key === "scaleUsers") {
        return {
          ...state,
          presetId: "custom",
          macros: newMacros,
          userCounts: distributeUsers(action.value as number, state.paidPercent),
        };
      }
      if (action.key === "quality") {
        const macroBand = QUALITY_BANDS.find(b => (action.value as number) <= b.max) ?? QUALITY_BANDS[QUALITY_BANDS.length - 1];
        const macroFlags: CalcState["phaseB"]["flags"] = {
          ENABLE_HONESTY_GUARD:        macroBand.flags.includes("ENABLE_HONESTY_GUARD"),
          ENABLE_BN_BRIDGE:            macroBand.flags.includes("ENABLE_BN_BRIDGE"),
          ENABLE_TURN1_VERIFY:         macroBand.flags.includes("ENABLE_TURN1_VERIFY"),
          ENABLE_RECOVERY_LOOP:        macroBand.flags.includes("ENABLE_RECOVERY_LOOP"),
          ENABLE_F1_CORRECTOR:         macroBand.flags.includes("ENABLE_F1_CORRECTOR"),
          ENABLE_VERIFY_CACHE:         macroBand.flags.includes("ENABLE_VERIFY_CACHE"),
          ENABLE_SUBSECTION_SELFCHECK: macroBand.flags.includes("ENABLE_SUBSECTION_SELFCHECK"),
        };
        return {
          ...state,
          presetId: "custom",
          macros: newMacros,
          phaseB: { ...state.phaseB, flags: macroFlags, verifyModel: macroBand.verifyModel ?? state.phaseB.verifyModel },
        };
      }
      return { ...state, presetId: "custom", macros: newMacros };
    }
    case "SET_PHASEB_FLAG":
      return { ...state, presetId: "custom", phaseB: { ...state.phaseB, flags: { ...state.phaseB.flags, [action.flag]: action.value } } };
    case "SET_PHASEB_NUMBER":
      return { ...state, presetId: "custom", phaseB: { ...state.phaseB, [action.key]: action.value } };
    case "SET_VERIFY_MODEL":
      return { ...state, presetId: "custom", phaseB: { ...state.phaseB, verifyModel: action.value } };
    case "SET_TOKEN":
      return { ...state, presetId: "custom", [action.key]: action.value };
    case "SET_CURRENCY":
      return { ...state, currency: action.value };
    case "SET_PAID_PCT": {
      // Paid % rebalances paid/free buckets at current total user count.
      const total = TIER_KEYS.reduce((s, k) => s + state.userCounts[k], 0);
      return {
        ...state,
        presetId: "custom",
        paidPercent: action.value,
        userCounts: distributeUsers(total, action.value),
      };
    }
    case "SET_TIER_USER_COUNT": {
      const newCounts = { ...state.userCounts, [action.tier]: Math.max(0, action.value) };
      const total = TIER_KEYS.reduce((s, k) => s + newCounts[k], 0);
      const paidNow = newCounts.mini + newCounts.max;
      const newPaidPct = total > 0 ? Math.round((paidNow / total) * 100) : state.paidPercent;
      return {
        ...state,
        presetId: "custom",
        userCounts: newCounts,
        paidPercent: newPaidPct,
        macros: { ...state.macros, scaleUsers: total },
      };
    }
    case "SET_TIER_USAGE":
      return { ...state, presetId: "custom", monthlyUsage: { ...state.monthlyUsage, [action.tier]: action.value } };
    case "PATCH_TIER":
      return { ...state, presetId: "custom", tierCfg: { ...state.tierCfg, [action.tier]: { ...state.tierCfg[action.tier], ...action.patch } } };
    case "ADD_OVERRIDE":
      return state.overrides.includes(action.path)
        ? state
        : { ...state, overrides: [...state.overrides, action.path] };
    case "REMOVE_OVERRIDE":
      return { ...state, overrides: state.overrides.filter(p => p !== action.path) };
    case "RESET_OVERRIDES":
      return { ...state, overrides: [] };
    case "HYDRATE":
      return action.state;
    case "ADD_SUBSCRIPTION": {
      const seed = action.item ?? {};
      const item: SubscriptionItem = {
        id: newSubscriptionId(),
        label: seed.label ?? "New subscription",
        note: seed.note,
        monthlyUsd: Number.isFinite(seed.monthlyUsd) ? Number(seed.monthlyUsd) : 0,
        enabled: seed.enabled ?? true,
      };
      return { ...state, subscriptions: [...state.subscriptions, item] };
    }
    case "UPDATE_SUBSCRIPTION":
      return {
        ...state,
        subscriptions: state.subscriptions.map(s =>
          s.id === action.id ? { ...s, ...action.patch } : s,
        ),
      };
    case "REMOVE_SUBSCRIPTION":
      return { ...state, subscriptions: state.subscriptions.filter(s => s.id !== action.id) };
    case "SEED_SUBSCRIPTIONS": {
      const existingLabels = new Set(state.subscriptions.map(s => s.label.toLowerCase()));
      const seeded = SUGGESTED_SUBSCRIPTIONS
        .filter(s => !existingLabels.has(s.label.toLowerCase()))
        .map(s => ({ id: newSubscriptionId(), label: s.label, note: s.note, monthlyUsd: s.monthlyUsd, enabled: true }));
      return { ...state, subscriptions: [...state.subscriptions, ...seeded] };
    }
    case "CLEAR_SUBSCRIPTIONS":
      return { ...state, subscriptions: [] };
    case "LOAD_LIVE": {
      // Only overlay onto the "today" preset. If the user moved off it
      // between fetch + dispatch, no-op so we don't clobber their edits.
      if (state.presetId !== "today") return state;
      const live = action.live;

      // Per-tier monthly chats = requestsPerUserDay × 30 (rounded).
      // Live users only override userCounts when at least one tier reports
      // non-zero traffic — otherwise keep the static distribution so the
      // table doesn't blank out on a quiet weekend.
      const liveHasUsers = TIER_KEYS.some(k => live.perTier[k].users > 0);
      const newUserCounts = liveHasUsers
        ? TIER_KEYS.reduce((acc, k) => {
            acc[k] = live.perTier[k].users || state.userCounts[k];
            return acc;
          }, { ...state.userCounts })
        : state.userCounts;
      const newMonthlyUsage = TIER_KEYS.reduce((acc, k) => {
        const live30 = Math.round(live.perTier[k].requestsPerUserDay * 30);
        acc[k] = live30 > 0 ? live30 : state.monthlyUsage[k];
        return acc;
      }, { ...state.monthlyUsage });

      // Token sliders: pick the tier with the most T1 traffic as the
      // representative cohort (avoids weighting a single max-tier outlier
      // when 99% of traffic is free_guest). Falls back to existing slider
      // value if zero data.
      const t1RepTier = TIER_KEYS.reduce<TierKey>((best, k) => {
        return live.perTier[k].requests > live.perTier[best].requests ? k : best;
      }, "free_guest");
      const t1OutLive = live.perTier[t1RepTier].avgOutputT1;
      const t2OutLive = live.perTier[t1RepTier].avgOutputT2;

      // Derive total scale + paid mix from the live user distribution so the
      // header chip stays in sync.
      const totalUsersLive = liveHasUsers
        ? TIER_KEYS.reduce((s, k) => s + (live.perTier[k].users || 0), 0)
        : state.macros.scaleUsers;
      const paidLive = liveHasUsers
        ? (live.perTier.mini.users || 0) + (live.perTier.max.users || 0)
        : 0;
      const newPaidPct = liveHasUsers && totalUsersLive > 0
        ? Math.round((paidLive / totalUsersLive) * 100)
        : state.paidPercent;

      return {
        ...state,
        // Stay on "today" — LOAD_LIVE is server-driven, not user-driven.
        presetId: "today",
        macros: { ...state.macros, scaleUsers: totalUsersLive },
        paidPercent: newPaidPct,
        userCounts: newUserCounts,
        monthlyUsage: newMonthlyUsage,
        t1Output: t1OutLive > 0 ? t1OutLive : state.t1Output,
        t2Output: t2OutLive > 0 ? t2OutLive : state.t2Output,
        phaseB: {
          ...state.phaseB,
          bnPct: live.ratios.bnPct,
          deepSearchPct: live.ratios.deepSearchPct,
          cacheHitPct: live.ratios.cacheHitPct,
          // Keep pDirty as-is when we don't have verdict telemetry.
          pDirty: live.pDirty != null ? live.pDirty : state.phaseB.pDirty,
        },
      };
    }
  }
}

/**
 * Backfill missing fields on hydrated state. Old localStorage payloads
 * predate later schema additions (utilizationPct, ENABLE_SUBSECTION_SELFCHECK,
 * subscriptions, etc.) — without backfilling, React flags controlled→
 * uncontrolled input warnings the first time a number field flips from
 * undefined to a value.
 */
function normalizeHydrated(parsed: Partial<CalcState>): CalcState {
  const tierCfg = { ...INITIAL_STATE.tierCfg };
  if (parsed.tierCfg) {
    for (const k of TIER_KEYS) {
      tierCfg[k] = { ...INITIAL_STATE.tierCfg[k], ...(parsed.tierCfg[k] ?? {}) };
    }
  }

  // One-shot 2026-04-29 migration: legacy localStorage shipped pre-calibration
  // token sliders (9600 / 7000 / 1436 / 1436 / 600 / 600). When we detect those
  // exact values, replace with calibrated defaults (1800 / 0 / 400 / 400 / 500 /
  // 400). Anything else is treated as user-customized and preserved.
  const STALE = { t1RagChunks: 9600, t1TreeNodes: 7000, t1Output: 1436, t2PriorAnswer: 1436, t2History: 600, t2Output: 600 } as const;
  const migrateToken = (key: keyof typeof STALE): number =>
    parsed[key] === STALE[key] ? INITIAL_STATE[key] : (parsed[key] ?? INITIAL_STATE[key]);

  return {
    ...INITIAL_STATE,
    ...parsed,
    macros:        { ...INITIAL_STATE.macros, ...(parsed.macros ?? {}) },
    phaseB:        {
      ...INITIAL_STATE.phaseB,
      ...(parsed.phaseB ?? {}),
      flags: { ...INITIAL_STATE.phaseB.flags, ...(parsed.phaseB?.flags ?? {}) },
    },
    tierCfg,
    monthlyUsage:  { ...INITIAL_STATE.monthlyUsage, ...(parsed.monthlyUsage ?? {}) },
    userCounts:    { ...INITIAL_STATE.userCounts, ...(parsed.userCounts ?? {}) },
    subscriptions: parsed.subscriptions ?? [],
    overrides:     parsed.overrides ?? [],
    t1RagChunks:   migrateToken("t1RagChunks"),
    t1TreeNodes:   migrateToken("t1TreeNodes"),
    t1Output:      migrateToken("t1Output"),
    t2PriorAnswer: migrateToken("t2PriorAnswer"),
    t2History:     migrateToken("t2History"),
    t2Output:      migrateToken("t2Output"),
  };
}

// One-shot per-browser migration: framework refinement 2026-04-29 narrowed the
// cost model to Grok-T1 + Stream-2-residual. Existing localStorage from earlier
// sessions can still hold inflated token sliders (legacy 9600/7000/1436 OR any
// values the user dragged up while exploring). Reset all 6 token sliders to the
// calibrated `INITIAL_STATE` values exactly once. The flag in localStorage
// prevents re-running on subsequent loads, so users can freely re-tune sliders.
const TOKEN_MIGRATION_FLAG = "cost-calc-token-migration-2026-04-29";
function applyTokenCalibrationMigration(state: CalcState): CalcState {
  if (typeof window === "undefined") return state;
  try {
    if (localStorage.getItem(TOKEN_MIGRATION_FLAG) === "done") return state;
    localStorage.setItem(TOKEN_MIGRATION_FLAG, "done");
  } catch { return state; }
  return {
    ...state,
    t1RagChunks:   INITIAL_STATE.t1RagChunks,
    t1TreeNodes:   INITIAL_STATE.t1TreeNodes,
    t1Output:      INITIAL_STATE.t1Output,
    t2PriorAnswer: INITIAL_STATE.t2PriorAnswer,
    t2History:     INITIAL_STATE.t2History,
    t2Output:      INITIAL_STATE.t2Output,
  };
}

function migrateV2toV3(v2: Record<string, unknown>): Partial<CalcState> {
  const overrides: string[] = [];
  // Detect tier overrides: any tierCfg/monthlyUsage divergence from defaults gets flagged
  if (v2.tierCfg) overrides.push("tierCfg");
  if (v2.monthlyUsage) overrides.push("monthlyUsage");

  return {
    macros: {
      scaleUsers: typeof v2.totalUsers === "number" ? v2.totalUsers : 100,
      quality: 50, // v2 had no quality concept; default to prod-today
      subsidyPct: typeof v2.redClawSubsidy === "number" ? v2.redClawSubsidy : 100,
    },
    paidPercent: typeof v2.paidPercent === "number" ? v2.paidPercent : 20,
    currency: v2.currency === "BDT" ? "BDT" : "USD",
    t1RagChunks:   typeof v2.t1RagChunks   === "number" ? v2.t1RagChunks   : INITIAL_STATE.t1RagChunks,
    t1TreeNodes:   typeof v2.t1TreeNodes   === "number" ? v2.t1TreeNodes   : INITIAL_STATE.t1TreeNodes,
    t1Output:      typeof v2.t1Output      === "number" ? v2.t1Output      : INITIAL_STATE.t1Output,
    t2PriorAnswer: typeof v2.t2PriorAnswer === "number" ? v2.t2PriorAnswer : INITIAL_STATE.t2PriorAnswer,
    t2History:     typeof v2.t2History     === "number" ? v2.t2History     : INITIAL_STATE.t2History,
    t2Output:      typeof v2.t2Output      === "number" ? v2.t2Output      : INITIAL_STATE.t2Output,
    overrides,
    presetId: "custom",
  };
}

// ─── Main component ─────────────────────────────────────────────────────────────

// ─── AI Insight Card ──────────────────────────────────────────────────────────
// Replaces the static "Custom mix..." footer with an OpenRouter-race
// generated explanation of why the bottom line lands where it does.
// Mirrors /api/sidebar/greeting race pattern — uses free OpenRouter models,
// burns no paid credits.

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function AIInsightCard({ calc, state }: { calc: MonthlyAggregate; state: CalcState }) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "fallback" | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [relativeTime, setRelativeTime] = useState<string>("");
  const [snapshot, setSnapshot] = useState<{
    marginAfterFixed: number;
    totalRev: number;
    totalNetLLP: number;
    totalSubscriptions: number;
    totalChats: number;
    totalUsers: number;
    paidPercent: number;
    subsidyPct: number;
  } | null>(null);
  const firedRef = useRef(false);

  // Stale = current calc state diverges from the snapshot used to build the explanation.
  const isStale = snapshot != null && (
    Math.abs(snapshot.marginAfterFixed - calc.marginAfterFixed) > 0.01 ||
    Math.abs(snapshot.totalRev - calc.totalRev) > 0.01 ||
    Math.abs(snapshot.totalNetLLP - calc.totalNetLLP) > 0.01 ||
    snapshot.totalSubscriptions !== calc.totalSubscriptions ||
    Math.abs(snapshot.totalChats - calc.totalChats) > 0.5 ||
    snapshot.totalUsers !== calc.totalUsers ||
    snapshot.paidPercent !== state.paidPercent ||
    snapshot.subsidyPct !== state.macros.subsidyPct
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const activePhaseBFlags = Object.entries(state.phaseB.flags)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const enabledSubscriptions = state.subscriptions
        .filter(s => s.enabled)
        .map(s => ({ label: s.label, monthlyUsd: s.monthlyUsd }));
      const body = {
        totalRev: calc.totalRev,
        totalNetLLP: calc.totalNetLLP,
        totalRedClaw: calc.totalRedClaw,
        totalSubscriptions: calc.totalSubscriptions,
        marginAfterFixed: calc.marginAfterFixed,
        marginAfterFixedPct: calc.marginAfterFixedPct,
        totalUsers: calc.totalUsers,
        totalChats: calc.totalChats,
        paidPercent: state.paidPercent,
        subsidyPct: state.macros.subsidyPct,
        scaleUsers: state.macros.scaleUsers,
        activePhaseBFlags,
        enabledSubscriptions,
      };
      const res = await fetch("/api/admin/cost-calc/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setExplanation(data.explanation);
      setModel(data.model);
      setSource(data.source);
      setGeneratedAt(new Date(data.generatedAt));
      setSnapshot({
        marginAfterFixed: calc.marginAfterFixed,
        totalRev: calc.totalRev,
        totalNetLLP: calc.totalNetLLP,
        totalSubscriptions: calc.totalSubscriptions,
        totalChats: calc.totalChats,
        totalUsers: calc.totalUsers,
        paidPercent: state.paidPercent,
        subsidyPct: state.macros.subsidyPct,
      });
    } catch (err) {
      setExplanation(`Couldn't generate AI insight: ${(err as Error).message}`);
      setSource(null);
    } finally {
      setLoading(false);
    }
  }, [calc, state]);

  // Auto-trigger first call on mount, delayed so localStorage hydration
  // settles before the snapshot is captured (otherwise the explanation
  // describes the INITIAL_STATE defaults but the hero shows the
  // hydrated values — instant stale).
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const t = setTimeout(() => { void refresh(); }, 1000);
    return () => clearTimeout(t);
  }, [refresh]);

  // Relative time updater
  useEffect(() => {
    if (!generatedAt) return;
    const update = () => {
      const sec = Math.floor((Date.now() - generatedAt.getTime()) / 1000);
      if (sec < 5) setRelativeTime("just now");
      else if (sec < 60) setRelativeTime(`${sec}s ago`);
      else setRelativeTime(`${Math.floor(sec / 60)}m ago`);
    };
    update();
    const t = setInterval(update, 5000);
    return () => clearInterval(t);
  }, [generatedAt]);

  return (
    <div className="relative rounded-lg border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-sky-500/10 p-4 overflow-hidden">
      <div aria-hidden className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SparkleIcon />
          <span className="text-[11px] font-bold tracking-wider uppercase text-purple-500">AI Insight</span>
          {source && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground">
              {source === "ai" ? "free model race" : "fallback"}
            </span>
          )}
          {isStale && !loading && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 animate-pulse">
              ⚠ stale · refresh
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          aria-label="Refresh AI insight"
          title={isStale ? "Insight is out of sync with current state — click to regenerate" : "Re-generate explanation from current state"}
          className={`transition-colors disabled:opacity-50 ${loading ? "animate-spin text-purple-500" : isStale ? "text-amber-500 hover:text-amber-400" : "text-muted-foreground hover:text-purple-500"}`}
        >
          <RefreshIcon />
        </button>
      </div>

      {loading && !explanation ? (
        <div className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-2 relative">
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
          <span>Racing free OpenRouter models…</span>
        </div>
      ) : (
        <p className={`text-xs leading-relaxed mt-2 relative ${isStale ? "text-foreground/40 line-through-soft" : "text-foreground/85"}`}>
          {explanation ?? "Click ↻ to generate an AI explanation."}
        </p>
      )}
      {isStale && !loading && snapshot && (
        <p className="text-[10px] text-amber-500/80 mt-1.5 relative">
          Was generated for: ${snapshot.marginAfterFixed.toFixed(2)} margin · {snapshot.totalUsers} users · {snapshot.subsidyPct}% subsidy.
          Current is ${calc.marginAfterFixed.toFixed(2)}.
        </p>
      )}

      {generatedAt && (
        <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground/60 relative">
          <span>{relativeTime}</span>
          {model && <span className="font-mono truncate max-w-[60%] text-right">{model}</span>}
        </div>
      )}
    </div>
  );
}

export default function CostCalculatorPage() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [selectedTier, setSelectedTier] = useState<TierKey>("max");
  const [saveStatus, setSaveStatus]     = useState<"idle" | "saving" | "autosaved" | "saved" | "loaded">("idle");
  const [openAccordion, setOpenAccordion] = useState<"none" | "advanced" | "phaseb" | "subscriptions">("none");
  const hasHydratedRef = useRef(false);

  // ── Live telemetry (only active when presetId === "today") ────────────────
  const [liveData, setLiveData] = useState<LiveDataResponse | null>(null);
  const [liveStatus, setLiveStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [liveFetchedAt, setLiveFetchedAt] = useState<number | null>(null);

  // True when sliders should be readonly + amber-outlined: live data loaded
  // AND the user is still on the "today" preset.
  const liveActive = liveStatus === "ok" && state.presetId === "today";

  const calc = useMemo(() => computeMonthly(state), [state]);
  const sel  = useMemo(() => ({
    pl:      calc.perTier[selectedTier].pl,
    blended: computeBlended(state, selectedTier),
  }), [state, selectedTier, calc]);
  const fmtUsd = useCallback((n: number) => fmtMoney(n, state.currency), [state.currency]);

  // ── Persistence ───────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_V3);
      if (raw) {
        const parsed = JSON.parse(raw) as CalcState;
        const normalized = applyTokenCalibrationMigration(normalizeHydrated(parsed));
        dispatch({ type: "HYDRATE", state: normalized });
        hasHydratedRef.current = true;
        return;
      }
      // Try v2 migration
      const v2raw = localStorage.getItem(STORAGE_KEY_V2);
      if (v2raw) {
        const v2 = JSON.parse(v2raw) as Record<string, unknown>;
        const migrated = migrateV2toV3(v2);
        const merged = applyTokenCalibrationMigration({ ...INITIAL_STATE, ...migrated } as CalcState);
        dispatch({ type: "HYDRATE", state: merged });
        // Write to v3 so future loads skip migration (v2 left intact for rollback safety)
        localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(merged));
      }
      hasHydratedRef.current = true;
    } catch {
      hasHydratedRef.current = true;
    }
  }, []);

  // Auto-save: debounced write on every state change after hydration.
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    setSaveStatus("saving");
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(state));
        setSaveStatus("autosaved");
        setTimeout(() => setSaveStatus(prev => (prev === "autosaved" ? "idle" : prev)), 1200);
      } catch { setSaveStatus("idle"); }
    }, 600);
    return () => clearTimeout(t);
  }, [state]);

  // ── Live fetch — fires when "today" preset is active ─────────────────────
  // Refetch when the user switches back to "today". Does NOT refetch on
  // every re-render or every state change; only on preset transition.
  useEffect(() => {
    const preset = findPreset(state.presetId as PresetId);
    if (!preset?.useLive) {
      // Off the live preset — clear status so badges hide.
      if (liveStatus !== "idle") setLiveStatus("idle");
      return;
    }
    let cancelled = false;
    setLiveStatus("loading");
    fetch("/api/admin/cost-calc/live?days=7", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as LiveDataResponse;
        if (cancelled) return;
        setLiveData(data);
        setLiveStatus("ok");
        setLiveFetchedAt(Date.now());
        dispatch({ type: "LOAD_LIVE", live: data });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[cost-calc] live fetch failed:", err);
        setLiveStatus("error");
      });
    return () => { cancelled = true; };
    // Depend only on presetId — fetching every keystroke would hammer Convex.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.presetId]);

  const saveDefaults = () => {
    try {
      localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(state));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch { /* ignore */ }
  };

  const loadDefaults = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_V3);
      if (raw) {
        const parsed = JSON.parse(raw) as CalcState;
        dispatch({ type: "HYDRATE", state: applyTokenCalibrationMigration(normalizeHydrated(parsed)) });
        setSaveStatus("loaded");
        setTimeout(() => setSaveStatus("idle"), 1500);
      }
    } catch { /* ignore */ }
  };

  // ── Derived display values ─────────────────────────────────────────────────────

  const maxAbsMargin = Math.max(
    ...TIER_KEYS.map(k => Math.abs(calc.perTier[k].pl.marginPerUser * calc.perTier[k].users)),
    0.01,
  );

  // T1 input token total for display in advanced section
  const t1TotalInputDisplay = T1_FIXED.systemPromptTokens + state.t1RagChunks + state.t1TreeNodes + T1_FIXED.historyTokens + T1_FIXED.queryTokens;
  const t2TotalInputDisplay = state.t2PriorAnswer + T2_FIXED.citationTokens + state.t2History + T2_FIXED.queryTokens;

  // ─── Render ────────────────────────────────────────────────────────────────────

  return (
    <MotionConfig reducedMotion="user">
    <div className="mx-auto max-w-6xl w-full px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6">

      {/* ── Hero ── */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        className="flex items-start justify-between gap-3 flex-wrap"
      >
        <div className="space-y-2">
          <motion.div variants={fadeUp} className="lf-kicker">
            <span className="lf-kicker-mark">§ 3.7</span>
            Admin · Cost Analytics
          </motion.div>
          <motion.h1
            variants={fadeUp}
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: "clamp(28px, 4vw, 36px)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            AI Cost{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
              Calculator.
            </em>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="lf-section-deck"
            style={{ maxWidth: "60ch" }}
          >
            Turn-aware · Backup failover · redClaw subsidy · Monthly budget
            model
          </motion.p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border border-border rounded-full bg-card p-0.5">
            {(["USD", "BDT"] as Currency[]).map(c => (
              <button key={c} onClick={() => dispatch({ type: "SET_CURRENCY", value: c })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${state.currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {c === "USD" ? "$" : "৳"}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">1 USD = {USD_TO_BDT}৳</span>
          <div className="flex items-center border border-border rounded-full bg-card p-0.5">
            <select
              value={state.presetId}
              onChange={e => dispatch({ type: "SET_PRESET", presetId: e.target.value as PresetId })}
              className="bg-transparent text-xs font-semibold px-3 py-1.5 focus:outline-none"
            >
              <option value="custom">Custom</option>
              {PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          {state.presetId === "today" && (
            <LiveBadge
              status={liveStatus}
              fetchedAt={liveFetchedAt}
              data={liveData}
            />
          )}
          <div className="flex items-center border border-border rounded-full bg-card p-0.5">
            <button onClick={saveDefaults}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${saveStatus === "saved" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {saveStatus === "saved" ? "✓ Saved" : "Save"}
            </button>
            <button onClick={loadDefaults}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${saveStatus === "loaded" ? "bg-sky-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {saveStatus === "loaded" ? "✓ Loaded" : "Load"}
            </button>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-1 rounded-full transition-all ${
              saveStatus === "saving"    ? "bg-amber-500/10 text-amber-500"
              : saveStatus === "autosaved" ? "bg-emerald-500/10 text-emerald-500"
              : "bg-muted/20 text-muted-foreground"
            }`}
            aria-live="polite"
            title="Saves automatically to localStorage 600ms after each change"
          >
            {saveStatus === "saving"    ? "● Saving…"
              : saveStatus === "autosaved" ? "✓ Auto-saved"
              : "⚡ Auto-save on"}
          </span>
        </div>
      </motion.section>

      {/* ── Net Margin Hero ── */}
      <section className="lf-card lf-card--feature relative overflow-hidden" style={{ padding: 0 }}>
        <div aria-hidden className={`absolute inset-0 opacity-15 pointer-events-none ${calc.marginAfterFixed >= 0
          ? "bg-[radial-gradient(circle_at_20%_50%,theme(colors.emerald.500)_0%,transparent_55%)]"
          : "bg-[radial-gradient(circle_at_20%_50%,theme(colors.red.500)_0%,transparent_55%)]"}`} />
        <div className="relative p-5 md:p-6 grid gap-5 md:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Monthly Net Margin</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${calc.marginAfterFixed >= 0 ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-400"}`}>
                {calc.marginAfterFixedPct >= 0 ? "▲" : "▼"} {Math.abs(calc.marginAfterFixedPct).toFixed(1)}%
              </span>
              <span className="text-[9px] uppercase tracking-wider text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                Revenue − Variable − Subscriptions
              </span>
            </div>
            <div className={`text-5xl md:text-6xl font-bold tabular-nums ${calc.marginAfterFixed >= 0 ? "text-emerald-500" : "text-red-400"}`}>
              {fmtUsd(calc.marginAfterFixed)}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span>{calc.totalUsers.toLocaleString()} users</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>{state.paidPercent}% paid</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>{calc.totalChats.toLocaleString()} chats/mo</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>{state.subscriptions.filter(s => s.enabled).length} active subs</span>
            </div>
            {(() => {
              const activePreset = state.presetId !== "custom" ? findPreset(state.presetId as PresetId) : null;
              return activePreset && (
                <p className="text-[11px] text-foreground/70 leading-relaxed border-l-2 border-sky-500/50 pl-3 py-1 bg-sky-500/5 rounded-r">
                  <span className="font-semibold text-sky-500">{activePreset.label}:</span> {activePreset.description}
                </p>
              );
            })()}
            <AIInsightCard calc={calc} state={state} />
          </div>
          <div className="space-y-3 flex flex-col justify-center">
            {([
              { label: "Revenue",                value: calc.totalRev,           color: "bg-emerald-500", show: true },
              { label: "Variable cost (T1 API)", value: calc.totalNetLLP,        color: "bg-amber-500",   show: calc.totalNetLLP > 0 },
              { label: "Subscriptions",          value: calc.totalSubscriptions, color: "bg-orange-500",  show: true },
              { label: calc.marginAfterFixed >= 0 ? "Net Profit" : "Net Loss", value: Math.abs(calc.marginAfterFixed), color: calc.marginAfterFixed >= 0 ? "bg-emerald-500" : "bg-red-400", show: true },
            ]).filter(r => r.show).map(({ label, value, color }) => {
              const max = Math.max(calc.totalRev, calc.totalNetLLP, calc.totalSubscriptions, 0.01);
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono tabular-nums text-foreground">{fmtUsd(value)}</span>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Macro Sliders ── */}
      <section className="lf-card p-5 grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Scale</span>
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              {state.macros.scaleUsers.toLocaleString()} users
            </span>
          </div>
          <input
            type="range" min={50} max={10000} step={50}
            value={state.macros.scaleUsers}
            onChange={e => dispatch({ type: "SET_MACRO", key: "scaleUsers", value: Number(e.target.value) })}
            className="w-full h-1.5 accent-primary cursor-pointer"
          />
          <div className="text-[10px] text-muted-foreground/60">
            Pilot · Launch · Growth · Scale
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">redClaw subsidy %</span>
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              {state.macros.subsidyPct}% absorbed
            </span>
          </div>
          <input
            type="range" min={0} max={100} step={1}
            value={state.macros.subsidyPct}
            onChange={e => dispatch({ type: "SET_MACRO", key: "subsidyPct", value: Number(e.target.value) })}
            className="w-full h-1.5 accent-primary cursor-pointer"
          />
          <div className="text-[10px] text-muted-foreground/60">
            0 = LLP pays all post-T1 · 100 = redClaw covers all
          </div>
        </div>

      </section>

      {/* ── Mix Simulation (moved up — direct response to Scale + subsidy + per-tier user counts) ── */}
      <section className="lf-card overflow-hidden">
        <header className="px-5 py-3 border-b border-border flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Full Mix Simulation</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {calc.totalUsers.toLocaleString()} users · {state.paidPercent}% paid · gross and net P&amp;L per tier cohort
            </p>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Paid users %</span>
              <span className="font-mono tabular-nums text-foreground">{state.paidPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={state.paidPercent}
              onChange={e => dispatch({ type: "SET_PAID_PCT", value: Number(e.target.value) })}
              className="w-full h-1.5 accent-primary cursor-pointer"
              title="Redistributes paid/free buckets at current total. Direct edit on Users column overrides."
            />
            <span className="text-[9px] text-muted-foreground/60">Paid: 60/40 mini/max · Free: 30/70 guest/sub</span>
          </div>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-muted/10">
                {[
                  "Tier", "Users", "T1 Grok/chat",
                  "Gross cost/mo", ...(state.macros.subsidyPct < 100 ? ["Net cost/mo"] : []),
                  "Revenue/mo", "Net margin/mo",
                ].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {TIER_KEYS.map(k => {
                const { users, pl } = calc.perTier[k];
                const isFreeTier = k === "free_guest" || k === "free_subscribed";
                const isPaid   = !isFreeTier && state.tierCfg[k].priceBdt > 0;
                const isProfit = pl.marginPerUser * users >= 0;
                return (
                  <tr key={k} className="hover:bg-muted/10 cursor-pointer" onClick={() => setSelectedTier(k)}>
                    <td className={`px-4 py-2.5 font-semibold ${state.tierCfg[k].color}`}>{state.tierCfg[k].label}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={users}
                        onChange={e => dispatch({ type: "SET_TIER_USER_COUNT", tier: k, value: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-20 bg-background border border-border rounded px-2 py-1 text-xs font-mono tabular-nums focus:outline-none focus:border-primary"
                        title={`Editing changes total + paid % automatically`}
                      />
                    </td>
                    <td
                      className="px-4 py-2.5 font-mono tabular-nums"
                      title="T1 generator cost only (Grok 4.1 Fast Reasoning, input + output, uptime-weighted with free Gemini 3 Flash fallback). Excludes intent classify, embeddings, and Stream-2 follow-up."
                    >
                      {fmtUsd(pl.blended.stream1.t1GenPrimary + pl.blended.stream1.t1GenFallback)}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-amber-400/80">{fmtUsd(pl.grossPerUser * users)}</td>
                    {state.macros.subsidyPct < 100 && (
                      <td className="px-4 py-2.5 font-mono tabular-nums text-sky-400">{fmtUsd(pl.netPerUserLLP * users)}</td>
                    )}
                    <td className="px-4 py-2.5 font-mono tabular-nums text-emerald-400/80">
                      {isPaid ? fmtUsd(pl.revenuePerUser * users) : "—"}
                    </td>
                    <td className={`px-4 py-2.5 font-mono tabular-nums font-semibold ${isPaid ? (isProfit ? "text-emerald-500" : "text-red-400") : "text-muted-foreground"}`}>
                      {isPaid
                        ? ((pl.marginPerUser * users >= 0 ? "+" : "") + fmtUsd(pl.marginPerUser * users))
                        : `−${fmtUsd(pl.netPerUserLLP * users)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-border">
              <tr className="bg-muted/10 font-semibold">
                <td className="px-4 py-3 text-foreground">Totals</td>
                <td className="px-4 py-3 font-mono tabular-nums text-foreground">{calc.totalUsers.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">—</td>
                <td className="px-4 py-3 font-mono tabular-nums text-amber-400">{fmtUsd(calc.totalGross)}</td>
                {state.macros.subsidyPct < 100 && (
                  <td className="px-4 py-3 font-mono tabular-nums text-sky-400">{fmtUsd(calc.totalNetLLP)}</td>
                )}
                <td className="px-4 py-3 font-mono tabular-nums text-emerald-400">{fmtUsd(calc.totalRev)}</td>
                <td className={`px-4 py-3 font-mono tabular-nums font-bold ${calc.totalMargin >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                  {calc.totalMargin >= 0 ? "+" : ""}{fmtUsd(calc.totalMargin)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ── Tier Configuration ── */}
      <section className="lf-card overflow-hidden">
        <header className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Tier Configuration</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Pricing, usage, and chat-proxy uptime per tier.</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-muted/10">
                {[
                  "Tier", "Price ৳", "Usage /day", "Usage /mo", "Active %", "T1 Uptime", "T2 Uptime",
                ].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {TIER_KEYS.map(k => {
                const tc = state.tierCfg[k];
                const isFreeTier = k === "free_guest" || k === "free_subscribed";
                return (
                  <tr key={k} className="hover:bg-muted/10">
                    <td className={`px-3 py-2 font-semibold whitespace-nowrap ${tc.color}`}>{tc.label}</td>
                    <td className="px-3 py-2">
                      <input type="number" value={isFreeTier ? 0 : tc.priceBdt} min={0} step={1}
                        disabled={isFreeTier}
                        title={isFreeTier ? "Free tier — no revenue" : undefined}
                        onChange={e => dispatch({ type: "PATCH_TIER", tier: k, patch: { priceBdt: Math.max(0, Number(e.target.value) || 0) } })}
                        className={`w-20 bg-background border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary ${isFreeTier ? "opacity-40 cursor-not-allowed" : ""}`} />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={Number((state.monthlyUsage[k] / 30).toFixed(2))}
                        min={0}
                        step={0.1}
                        onChange={e => {
                          const daily = Math.max(0, Number(e.target.value) || 0);
                          const monthly = Math.max(0, Math.round(daily * 30));
                          dispatch({ type: "SET_TIER_USAGE", tier: k, value: monthly });
                        }}
                        className="w-20 bg-background border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                        title={`= ${state.monthlyUsage[k]} chats/mo (× 30)`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={state.monthlyUsage[k]} min={0} step={1}
                        onChange={e => dispatch({ type: "SET_TIER_USAGE", tier: k, value: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-20 bg-background border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input type="number" value={tc.utilizationPct} min={0} max={100} step={1}
                          onChange={e => dispatch({ type: "PATCH_TIER", tier: k, patch: { utilizationPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })}
                          className="w-16 bg-background border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                          title={`Effective: ${Math.round(state.monthlyUsage[k] * tc.utilizationPct / 100)} chats/mo`} />
                        <span className="text-[10px] text-muted-foreground">%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input type="number" value={tc.t1Uptime} min={50} max={100} step={0.5}
                          onChange={e => dispatch({ type: "PATCH_TIER", tier: k, patch: { t1Uptime: Math.min(100, Math.max(50, Number(e.target.value) || 97)) } })}
                          className="w-16 bg-background border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary" />
                        <span className="text-[10px] text-muted-foreground">%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input type="number" value={tc.t2Uptime} min={50} max={100} step={0.5}
                          onChange={e => dispatch({ type: "PATCH_TIER", tier: k, patch: { t2Uptime: Math.min(100, Math.max(50, Number(e.target.value) || 98)) } })}
                          className="w-16 bg-background border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary" />
                        <span className="text-[10px] text-muted-foreground">%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Tier Contribution ── */}
      <section className="lf-card overflow-hidden">
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Tier Contribution</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Click a tier to inspect it below. Net margin after redClaw subsidy.</p>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">Σ {fmtUsd(calc.totalMargin)}</span>
        </header>
        <div className="divide-y divide-border/50">
          {TIER_KEYS.map(k => {
            const { users, pl } = calc.perTier[k];
            const netMargin = pl.marginPerUser * users;
            const pct       = (Math.abs(netMargin) / maxAbsMargin) * 100;
            const isPaid    = state.tierCfg[k].priceBdt > 0;
            const isProfit  = netMargin >= 0;
            return (
              <div key={k} onClick={() => setSelectedTier(k)}
                className={`px-5 py-3 transition-colors cursor-pointer ${selectedTier === k ? "bg-muted/20" : "hover:bg-muted/10"}`}>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-1 h-8 rounded-full ${isPaid ? (isProfit ? "bg-emerald-500" : "bg-red-400") : "bg-muted-foreground/25"}`} />
                    <div>
                      <div className={`text-sm font-semibold ${state.tierCfg[k].color}`}>{state.tierCfg[k].label}</div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">
                        {users.toLocaleString()} users · {fmtUsd(pl.blended.stream1.t1GenPrimary + pl.blended.stream1.t1GenFallback)}/chat · {state.monthlyUsage[k]} chats/mo
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-mono font-semibold tabular-nums ${isPaid ? (isProfit ? "text-emerald-500" : "text-red-400") : "text-muted-foreground"}`}>
                      {isPaid ? ((isProfit ? "+" : "") + fmtUsd(netMargin)) : `−${fmtUsd(pl.netPerUserLLP * users)}`}
                    </div>
                    {state.macros.subsidyPct < 100 && isPaid && (
                      <div className="text-[9px] text-muted-foreground/60 tabular-nums">
                        gross {fmtUsd(pl.grossPerUser * users)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border/60" />
                  {isPaid ? (
                    <div className={`absolute inset-y-0 transition-all duration-500 rounded-full ${isProfit ? "left-1/2 bg-emerald-500" : "right-1/2 bg-red-400"}`}
                      style={{ width: `${pct / 2}%` }} />
                  ) : (
                    <div className="absolute inset-y-0 right-1/2 bg-red-400/50 transition-all duration-500 rounded-full"
                      style={{ width: `${(Math.abs(netMargin) / maxAbsMargin) * 50}%` }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Two-Stream Inspector ── */}
      <section className="lf-card overflow-hidden">
        <header className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Two-Stream Inspector</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {state.tierCfg[selectedTier].label} · LLP {fmtUsd(sel.blended.stream1.total)}/T1 + redClaw absorbs {fmtUsd(sel.blended.stream2.redClawAbsorbed)}/chat
            </p>
          </div>
          <div className="flex gap-1 p-1 bg-muted/30 rounded-xl">
            {TIER_KEYS.map(k => (
              <button key={k} onClick={() => setSelectedTier(k)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${selectedTier === k ? `bg-background ${state.tierCfg[k].color} shadow-sm` : "text-muted-foreground hover:text-foreground"}`}>
                {state.tierCfg[k].label}
              </button>
            ))}
          </div>
        </header>

        <div className="p-5 grid md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-border/50">

          {/* ── Stream 1: LLP direct (warm tone) ── */}
          <div className="pb-6 md:pb-0 md:pr-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-amber-400">Stream 1 — T1 LLP direct</div>
                <div className="text-[10px] text-muted-foreground">External API cash · per T1 chat</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono tabular-nums text-amber-400">{fmtUsd(sel.blended.stream1.total)}</div>
              </div>
            </div>

            <div className="space-y-0.5">
              <CostRow label="chat-proxy · intent classify" cost={sel.blended.stream1.intentCost} fmtUsd={fmtUsd} />
              <CostRow label="chat-proxy · query embedding" cost={sel.blended.stream1.embedCost} fmtUsd={fmtUsd} />
              <CostRow label={`chat-proxy · T1 primary ×${state.tierCfg[selectedTier].t1Uptime}%`} cost={sel.blended.stream1.t1GenPrimary} fmtUsd={fmtUsd} />
              <CostRow label={`chat-proxy · T1 fallback ×${100 - state.tierCfg[selectedTier].t1Uptime}%`} cost={sel.blended.stream1.t1GenFallback} fmtUsd={fmtUsd} muted={sel.blended.stream1.t1GenFallback === 0} />
              <CostRow label="chat-proxy · subsection self-check" cost={sel.blended.stream1.subsectionSelfcheck} fmtUsd={fmtUsd} muted={!state.phaseB.flags.ENABLE_SUBSECTION_SELFCHECK} />
              <CostRow label={`chat-proxy · A2 BN bridge × ${state.phaseB.bnPct}% queries`} cost={sel.blended.stream1.a2BnBridge} fmtUsd={fmtUsd} muted={!state.phaseB.flags.ENABLE_BN_BRIDGE} />
              <div className="border-t border-border/50 mt-1 pt-1">
                <CostRow label="Total Stream 1 (LLP cash)" cost={sel.blended.stream1.total} fmtUsd={fmtUsd} />
              </div>
            </div>
          </div>

          {/* ── Stream 2: redClaw subsidiary (cool tone) ── */}
          <div className="pt-6 md:pt-0 md:pl-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-sky-400">Stream 2 — Post-T1 redClaw (subscription)</div>
                <div className="text-[10px] text-muted-foreground">absorbed by Claude/Codex subs · $0 LLP burn</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono tabular-nums text-sky-400/60 line-through">{fmtUsd(sel.blended.stream2.subtotalBeforeSubsidy)}</div>
                <div className="text-[10px] text-muted-foreground">theoretical pay-per-token</div>
              </div>
            </div>

            <div className="space-y-0.5">
              <CostRow label="chat-followup · T2+ continuation" cost={sel.blended.stream2.t2Continuation} fmtUsd={fmtUsd} />
              <CostRow label={`chat-verify · D1 first-turn verify (${state.phaseB.verifyModel})`} cost={sel.blended.stream2.d1Verify} fmtUsd={fmtUsd} muted={!state.phaseB.flags.ENABLE_TURN1_VERIFY} />
              <CostRow label={`chat-verify · E3 recovery loop × ${state.phaseB.pDirty}% dirty`} cost={sel.blended.stream2.e3Recovery} fmtUsd={fmtUsd} muted={!state.phaseB.flags.ENABLE_RECOVERY_LOOP} />
              <CostRow label={`chat-recover · F1 corrector × ${state.phaseB.pF1}% fires`} cost={sel.blended.stream2.f1Corrector} fmtUsd={fmtUsd} muted={!state.phaseB.flags.ENABLE_F1_CORRECTOR} />
              <div className="border-t border-border/50 mt-1 pt-1 space-y-0.5">
                <CostRow label="Subtotal" cost={sel.blended.stream2.subtotalBeforeSubsidy} fmtUsd={fmtUsd} />
                <CostRow label={`redClaw absorbs (${state.macros.subsidyPct}%)`} cost={-sel.blended.stream2.redClawAbsorbed} fmtUsd={fmtUsd} />
                <CostRow label="LLP residual share" cost={sel.blended.stream2.llpResidual} fmtUsd={fmtUsd} />
              </div>
            </div>

            <div className="bg-muted/20 rounded-xl p-3">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">True LLP cost per chat</div>
              <div className="text-2xl font-bold font-mono tabular-nums">{fmtUsd(sel.blended.stream1.t1GenPrimary + sel.blended.stream1.t1GenFallback + sel.blended.stream2.llpResidual)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Grok 4.1 T1 ({fmtUsd(sel.blended.stream1.t1GenPrimary + sel.blended.stream1.t1GenFallback)}) + Stream-2 residual after redClaw subsidy ({fmtUsd(sel.blended.stream2.llpResidual)}).
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Phase B Layer Toggles ── */}
      <section className="lf-card overflow-hidden">
        <button
          onClick={() => setOpenAccordion(openAccordion === "phaseb" ? "none" : "phaseb")}
          className="w-full px-5 py-3 border-b border-border flex items-center justify-between hover:bg-muted/10"
        >
          <div className="text-left">
            <h2 className="text-sm font-semibold">Phase B Layer Toggles</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              All layers absorbed by Claude Pro + ChatGPT/Codex subscriptions — $0 LLP burn regardless of flag state.
              Flip flags here to model operational state, not cost.
            </p>
          </div>
          <span className="text-xs">{openAccordion === "phaseb" ? "▴" : "▾"}</span>
        </button>

        {openAccordion === "phaseb" && (
          <div className="p-5 grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Flags</div>
              {(Object.keys(state.phaseB.flags) as Array<keyof CalcState["phaseB"]["flags"]>).map(flag => (
                <label key={flag} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono">{flag}</span>
                  <button
                    onClick={() => dispatch({ type: "SET_PHASEB_FLAG", flag, value: !state.phaseB.flags[flag] })}
                    role="switch"
                    aria-checked={state.phaseB.flags[flag]}
                    aria-label={flag}
                    className={`relative inline-flex w-8 h-4 rounded-full transition-colors ${state.phaseB.flags[flag] ? "bg-sky-500" : "bg-muted"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${state.phaseB.flags[flag] ? "translate-x-4" : ""}`} />
                  </button>
                </label>
              ))}

              <div className="space-y-1 pt-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">VERIFY_MODEL</label>
                <select
                  value={state.phaseB.verifyModel}
                  onChange={e => dispatch({ type: "SET_VERIFY_MODEL", value: e.target.value as CalcState["phaseB"]["verifyModel"] })}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs"
                >
                  <option value="opus">chat-verify · Opus 4.7 — default</option>
                  <option value="sonnet-4.6">chat-verify · Sonnet 4.6</option>
                  <option value="haiku-4.5">chat-verify · Haiku 4.5</option>
                  <option value="grok-reasoning">chat-verify · Grok 4.1 Fast Reasoning</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Probabilities</div>
              {([
                { key: "bnPct", label: "BN query %", min: 0, max: 100, fromLive: true },
                { key: "deepSearchPct", label: "Deep search %", min: 0, max: 50, fromLive: true },
                { key: "cacheHitPct", label: "Verify cache hit %", min: 0, max: 80, fromLive: true },
                { key: "pDirty", label: "P(D1 dirty verdict) %", min: 0, max: 40, fromLive: false },
                { key: "pF1", label: "P(F1 fires) %", min: 0, max: 15, fromLive: false },
              ] as const).map(({ key, label, min, max, fromLive }) => {
                const locked = liveActive && fromLive;
                return (
                  <div
                    key={key}
                    className={`space-y-1 ${locked ? "ring-1 ring-amber-500/40 rounded-md px-2 py-1.5 -mx-2 -my-1.5" : ""}`}
                    title={locked ? "Sourced from live telemetry — switch preset to override" : undefined}
                  >
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        {label}
                        {locked && <span className="text-[9px] uppercase tracking-wider text-amber-500 font-mono">Live</span>}
                      </span>
                      <span className={`font-mono ${locked ? "text-amber-500" : ""}`}>{state.phaseB[key]}%</span>
                    </div>
                    <input
                      type="range" min={min} max={max} step={1}
                      value={state.phaseB[key]}
                      disabled={locked}
                      onChange={e => { if (!locked) dispatch({ type: "SET_PHASEB_NUMBER", key, value: Number(e.target.value) }); }}
                      className={`w-full h-1 cursor-pointer ${locked ? "accent-amber-500 opacity-60 cursor-not-allowed" : "accent-sky-500"}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── Advanced (token sliders + per-tier overrides) ── */}
      <section className="lf-card overflow-hidden">
        <button
          onClick={() => setOpenAccordion(openAccordion === "advanced" ? "none" : "advanced")}
          className="w-full px-5 py-3 border-b border-border flex items-center justify-between hover:bg-muted/10"
        >
          <div className="text-left">
            <h2 className="text-sm font-semibold">Advanced — Token Configuration + Tier Overrides</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Production-measured token counts · Per-tier model picks (Quality cascade still wins unless 🔒 locked)
            </p>
          </div>
          <span className="text-xs">{openAccordion === "advanced" ? "▴" : "▾"}</span>
        </button>

        {openAccordion === "advanced" && (
          <>
            {/* Token sliders */}
            <section className="lf-card overflow-hidden">
              <header className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Token Configuration</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Adjust production-measured counts. Lower RAG chunks / tree nodes = biggest input savings.
                </p>
              </header>
              <div className="p-5 grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">Turn 1 — variable inputs</div>
                  <Slider label="RAG Chunks (fix: add top_n cap to reranker)" value={state.t1RagChunks} onChange={n => dispatch({ type: "SET_TOKEN", key: "t1RagChunks", value: n })} min={1000} max={16000} step={200} editable unit="tokens" />
                  <Slider label="Tree Nodes (chat-proxy injection)"           value={state.t1TreeNodes} onChange={n => dispatch({ type: "SET_TOKEN", key: "t1TreeNodes", value: n })} min={0}    max={12000} step={200} editable unit="tokens" />
                  <Slider label="Output tokens (avg response)"                value={state.t1Output}    onChange={n => dispatch({ type: "SET_TOKEN", key: "t1Output", value: n })}    min={200}  max={4000}  step={50}  editable unit="tokens" live={liveActive} />
                  <div className="bg-muted/20 rounded-xl p-3 text-[10px] space-y-1">
                    <div className="text-muted-foreground/60 mb-1">Fixed inputs</div>
                    {[
                      ["System prompt", T1_FIXED.systemPromptTokens],
                      ["History (8 turns)", T1_FIXED.historyTokens],
                      ["User query", T1_FIXED.queryTokens],
                    ].map(([l, v]) => (
                      <div key={String(l)} className="flex justify-between text-muted-foreground">
                        <span>{l}</span><span className="font-mono">{Number(v).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold text-foreground/70 border-t border-border/40 pt-1 mt-1">
                      <span>Total input</span>
                      <span className="font-mono">{t1TotalInputDisplay.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-[10px] uppercase tracking-wider text-sky-400 font-semibold">Turn 2+ — variable inputs</div>
                  <Slider label="Prior answer (fetched from Supabase)" value={state.t2PriorAnswer} onChange={n => dispatch({ type: "SET_TOKEN", key: "t2PriorAnswer", value: n })} min={200}  max={3000} step={50} editable unit="tokens" />
                  <Slider label="History (recent turns)"               value={state.t2History}     onChange={n => dispatch({ type: "SET_TOKEN", key: "t2History", value: n })}     min={100}  max={2000} step={50} editable unit="tokens" />
                  <Slider label="Output tokens (follow-up response)"   value={state.t2Output}      onChange={n => dispatch({ type: "SET_TOKEN", key: "t2Output", value: n })}      min={100}  max={2000} step={50} editable unit="tokens" live={liveActive} />
                  <div className="bg-muted/20 rounded-xl p-3 text-[10px] space-y-1">
                    <div className="text-muted-foreground/60 mb-1">Fixed inputs</div>
                    {[["Citations", T2_FIXED.citationTokens], ["User query", T2_FIXED.queryTokens]].map(([l, v]) => (
                      <div key={String(l)} className="flex justify-between text-muted-foreground">
                        <span>{l}</span><span className="font-mono">{Number(v)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold text-foreground/70 border-t border-border/40 pt-1 mt-1">
                      <span>Total input</span>
                      <span className="font-mono">{t2TotalInputDisplay.toLocaleString()}</span>
                    </div>
                    <div className="text-emerald-400/50 pt-0.5 border-t border-border/30">No intent · No embed · No rerank</div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </section>

      {/* ── Advanced — Monthly Subscriptions ── */}
      <section className="lf-card overflow-hidden">
        <button
          onClick={() => setOpenAccordion(openAccordion === "subscriptions" ? "none" : "subscriptions")}
          className="w-full px-5 py-3 border-b border-border flex items-center justify-between hover:bg-muted/10"
        >
          <div className="text-left">
            <h2 className="text-sm font-semibold">Advanced — Monthly Subscriptions</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Fixed infra + agent license costs. Subtracted from per-chat margin to give the bottom line.
            </p>
          </div>
          <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
            {fmtUsd(calc.totalSubscriptions)}/mo · {state.subscriptions.filter(s => s.enabled).length} active
          </span>
        </button>

        {openAccordion === "subscriptions" && (
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => dispatch({ type: "SEED_SUBSCRIPTIONS" })}
                className="text-xs px-3 py-1.5 rounded border border-border bg-muted/10 hover:bg-muted/30 transition-colors"
                title="Adds inference host, bridge host, Vercel Pro, ChatGPT Pro, Claude Pro, Supabase rows"
              >
                + Seed defaults
              </button>
              <button
                onClick={() => dispatch({ type: "ADD_SUBSCRIPTION" })}
                className="text-xs px-3 py-1.5 rounded border border-border bg-muted/10 hover:bg-muted/30 transition-colors"
              >
                + Add row
              </button>
              {state.subscriptions.length > 0 && (
                <button
                  onClick={() => dispatch({ type: "CLEAR_SUBSCRIPTIONS" })}
                  className="text-xs px-3 py-1.5 rounded border border-border text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
                >
                  Clear all
                </button>
              )}
            </div>

            {state.subscriptions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No subscriptions configured. Click <span className="font-mono">+ Seed defaults</span> for the suggested
                stack (inference host, bridge host, Vercel, ChatGPT Pro, Claude Pro, Supabase) or <span className="font-mono">+ Add row</span> to enter custom items.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/10">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-12">On</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Label</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Note</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-32">USD / month</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {state.subscriptions.map(sub => (
                      <tr key={sub.id} className={sub.enabled ? "" : "opacity-50"}>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => dispatch({ type: "UPDATE_SUBSCRIPTION", id: sub.id, patch: { enabled: !sub.enabled } })}
                            role="switch"
                            aria-checked={sub.enabled}
                            aria-label={`Toggle ${sub.label}`}
                            className={`relative inline-flex w-8 h-4 rounded-full transition-colors ${sub.enabled ? "bg-sky-500" : "bg-muted"}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${sub.enabled ? "translate-x-4" : ""}`} />
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={sub.label}
                            onChange={e => dispatch({ type: "UPDATE_SUBSCRIPTION", id: sub.id, patch: { label: e.target.value } })}
                            className="w-full bg-transparent border-b border-border/30 focus:border-sky-500 outline-none px-1 py-0.5"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={sub.note ?? ""}
                            onChange={e => dispatch({ type: "UPDATE_SUBSCRIPTION", id: sub.id, patch: { note: e.target.value } })}
                            placeholder="(optional)"
                            className="w-full bg-transparent border-b border-border/30 focus:border-sky-500 outline-none px-1 py-0.5 text-muted-foreground"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={sub.monthlyUsd}
                            onChange={e => dispatch({ type: "UPDATE_SUBSCRIPTION", id: sub.id, patch: { monthlyUsd: Math.max(0, Number(e.target.value) || 0) } })}
                            className="w-24 bg-transparent border-b border-border/30 focus:border-sky-500 outline-none px-1 py-0.5 text-right font-mono tabular-nums"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => dispatch({ type: "REMOVE_SUBSCRIPTION", id: sub.id })}
                            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-red-400 transition-colors"
                            aria-label={`Remove ${sub.label}`}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border/50 bg-muted/10 font-semibold">
                      <td colSpan={3} className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground">Total enabled</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtUsd(calc.totalSubscriptions)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="border-t border-border/40 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Per-chat margin</div>
                <div className={`font-mono tabular-nums font-semibold ${calc.totalMargin >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                  {fmtUsd(calc.totalMargin)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">− Subscriptions</div>
                <div className="font-mono tabular-nums font-semibold text-amber-400">
                  −{fmtUsd(calc.totalSubscriptions)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">= Bottom line</div>
                <div className={`font-mono tabular-nums font-semibold ${calc.marginAfterFixed >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                  {fmtUsd(calc.marginAfterFixed)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Margin %</div>
                <div className={`font-mono tabular-nums font-semibold ${calc.marginAfterFixed >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                  {calc.marginAfterFixedPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer className="text-[10px] text-muted-foreground/60 text-center pt-4 border-t border-border/30">
        Agents: chat-proxy (T1 stack) · chat-followup (T2+) · chat-verify (D1/E3) · chat-recover (F1).
        chat-proxy runs uniform max-tier model for all users. Verify pricing against inference-host cost log.
      </footer>

    </div>
    </MotionConfig>
  );
}
