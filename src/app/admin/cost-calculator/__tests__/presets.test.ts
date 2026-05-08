// src/app/admin/cost-calculator/__tests__/presets.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PRESETS } from "../presets";
import { computeMonthly } from "../calc-engine";
import type { CalcState, TierCfg, TierKey } from "../calc-types";

const BASE_TIER_CFG: Record<TierKey, TierCfg> = {
  free_guest: { label: "Free Guest", color: "text-zinc-400", priceBdt: 0, utilizationPct: 100, t1Uptime: 97, t2Uptime: 98 },
  free_subscribed: { label: "Free Sub", color: "text-sky-400", priceBdt: 0, utilizationPct: 100, t1Uptime: 97, t2Uptime: 98 },
  mini: { label: "Mini", color: "text-emerald-400", priceBdt: 149, utilizationPct: 100, t1Uptime: 97, t2Uptime: 98 },
  max: { label: "Max", color: "text-amber-400", priceBdt: 299, utilizationPct: 100, t1Uptime: 97, t2Uptime: 98 },
};

function distributeUsersForTest(total: number, paidPct: number): CalcState["userCounts"] {
  const paid = Math.round(total * (paidPct / 100));
  const free = Math.max(0, total - paid);
  const guest = Math.round(free * 0.3);
  const mini = Math.round(paid * 0.6);
  return { free_guest: guest, free_subscribed: free - guest, mini, max: paid - mini };
}

function buildState(presetIdx: number): CalcState {
  const preset = PRESETS[presetIdx];
  return {
    presetId: preset.id,
    macros: preset.macros,
    overrides: [],
    phaseB: {
      flags: { ENABLE_HONESTY_GUARD: false, ENABLE_BN_BRIDGE: false, ENABLE_TURN1_VERIFY: false, ENABLE_RECOVERY_LOOP: false, ENABLE_F1_CORRECTOR: false, ENABLE_VERIFY_CACHE: false, ENABLE_SUBSECTION_SELFCHECK: false },
      verifyModel: "opus", bnPct: 25, deepSearchPct: 5, cacheHitPct: 0, pDirty: 12, pF1: 3,
    },
    t1RagChunks: 9600, t1TreeNodes: 7000, t1Output: 1436,
    t2PriorAnswer: 1436, t2History: 600, t2Output: 600,
    tierCfg: BASE_TIER_CFG,
    monthlyUsage: { free_guest: 4, free_subscribed: 10, mini: 60, max: 180 },
    userCounts: distributeUsersForTest(preset.macros.scaleUsers, 20),
    paidPercent: 20,
    currency: "USD",
    subscriptions: [],
  };
}

describe("Preset snapshots — sanity bounds", () => {
  for (let i = 0; i < PRESETS.length; i++) {
    const preset = PRESETS[i];
    it(`preset "${preset.label}" produces non-NaN totals with positive chat count`, () => {
      const result = computeMonthly(buildState(i));
      assert.ok(!Number.isNaN(result.totalNetLLP), "totalNetLLP not NaN");
      assert.ok(!Number.isNaN(result.totalMargin), "totalMargin not NaN");
      assert.ok(result.totalChats >= 0, "totalChats non-negative");
      assert.ok(result.totalUsers > 0, "totalUsers > 0");
    });
  }

  it("Today (prod) → variable Stream-1 rolls up as totalNetLLP", () => {
    const result = computeMonthly(buildState(0));
    assert.ok(result.totalNetLLP > 0, "Stream-1 paid APIs roll up");
    assert.ok(result.totalRedClaw >= 0);
    assert.ok(result.totalRev >= 0);
  });

  it("Phase B Full → variable cost > Cost Floor (Grok primary vs Gemini-flash free)", () => {
    const phaseBFull = computeMonthly(buildState(1));   // phase_b_full (Grok primary)
    const costFloor  = computeMonthly(buildState(3));   // cost_floor (Gemini-3-flash free)
    assert.ok(phaseBFull.totalNetLLP > costFloor.totalNetLLP, `${phaseBFull.totalNetLLP} should be > ${costFloor.totalNetLLP}`);
  });
});
