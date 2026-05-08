// src/app/admin/cost-calculator/__tests__/calc-engine.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyMacros, computeStream1, computeStream2, computeMonthly } from "../calc-engine";
import type { Macros, CalcState, TierCfg, TierKey } from "../calc-types";

describe("applyMacros", () => {
  it("Quality 50 (Production today) selects Grok primary + G1 only", () => {
    const macros: Macros = { scaleUsers: 100, quality: 50, subsidyPct: 100 };
    const overrides = new Set<string>();
    const result = applyMacros(macros, overrides);

    assert.equal(result.t1Primary, "grok-4-1-fast-reasoning");
    assert.equal(result.verifyModel, null);
    assert.deepEqual(Array.from(result.flagsOn).sort(), ["ENABLE_HONESTY_GUARD"]);
    assert.equal(result.pDirty, 12);
  });

  it("Quality 10 (Cost floor) selects Gemini Flash + no flags", () => {
    const macros: Macros = { scaleUsers: 100, quality: 10, subsidyPct: 100 };
    const result = applyMacros(macros, new Set());

    assert.equal(result.t1Primary, "gemini-3-flash-preview");
    assert.equal(result.verifyModel, null);
    assert.deepEqual(Array.from(result.flagsOn), []);
  });

  it("Quality 95 (Phase B Full) enables all flags + Opus verify", () => {
    const macros: Macros = { scaleUsers: 100, quality: 95, subsidyPct: 100 };
    const result = applyMacros(macros, new Set());

    assert.equal(result.t1Primary, "grok-4-1-fast-reasoning");
    assert.equal(result.verifyModel, "opus");
    assert.deepEqual(
      Array.from(result.flagsOn).sort(),
      [
        "ENABLE_BN_BRIDGE",
        "ENABLE_F1_CORRECTOR",
        "ENABLE_HONESTY_GUARD",
        "ENABLE_RECOVERY_LOOP",
        "ENABLE_TURN1_VERIFY",
        "ENABLE_VERIFY_CACHE",
      ],
    );
    assert.equal(result.pDirty, 8);
  });

  it("respects override on t1Primary — keeps user value despite Quality cascade", () => {
    const macros: Macros = { scaleUsers: 100, quality: 95, subsidyPct: 100 };
    const overrides = new Set(["t1Primary"]);
    const result = applyMacros(macros, overrides, { t1Primary: "gemini-3-flash-preview" });

    assert.equal(result.t1Primary, "gemini-3-flash-preview", "override wins over Quality 95 cascade");
  });
});

describe("computeStream1 — LLP direct cost", () => {
  it("Quality 50 prod-today: Grok primary + Gemini Flash backup + tree confirm Haiku", () => {
    const macros = { scaleUsers: 100, quality: 50, subsidyPct: 100 };
    const cascade = applyMacros(macros, new Set());

    const result = computeStream1({
      cascade,
      t1RagChunks: 9600,
      t1TreeNodes: 7000,
      t1Output: 1436,
      t1UptimePct: 97,
      bnPct: 25,
      a2Enabled: false, // G1-only flagsOn at Quality 50
      selfcheckEnabled: true, // exercise the selfcheck cost path
    });

    // Grok primary: 19884 in × $0.20/M + 1436 out × $0.50/M = $0.003977 + $0.000718 = $0.004695
    // × 0.97 uptime = ~$0.00455
    assert.ok(result.t1GenPrimary > 0.003 && result.t1GenPrimary < 0.006, `t1GenPrimary in expected range, got ${result.t1GenPrimary}`);
    // Gemini 3 Flash fallback is FREE
    assert.equal(result.t1GenFallback, 0);
    // Intent classify Gemini 2.5 Flash ~ $0.000185
    assert.ok(result.intentCost > 0.0001 && result.intentCost < 0.0005);
    // Embed near-zero
    assert.ok(result.embedCost < 0.000001);
    // Subsection self-check: 0.25 prob × Grok primary (150 in / 150 out)
    // = 0.25 × (150/1e6×0.20 + 150/1e6×0.50) = 0.25 × $0.000105 = $0.0000263
    assert.ok(
      result.subsectionSelfcheck > 0 && result.subsectionSelfcheck < 0.0001,
      `subsectionSelfcheck in expected range, got ${result.subsectionSelfcheck}`,
    );
    // A2 BN bridge OFF in Quality 50 → cost 0
    assert.equal(result.a2BnBridge, 0);
    // Total > 0
    assert.ok(result.total > 0);
  });

  it("Quality 95 with A2 enabled adds BN bridge cost proportional to bn%", () => {
    const macros = { scaleUsers: 100, quality: 95, subsidyPct: 100 };
    const cascade = applyMacros(macros, new Set());

    const r25 = computeStream1({
      cascade,
      t1RagChunks: 9600,
      t1TreeNodes: 7000,
      t1Output: 1436,
      t1UptimePct: 97,
      bnPct: 25,
      a2Enabled: true,
      selfcheckEnabled: false,
    });
    const r50 = computeStream1({
      cascade,
      t1RagChunks: 9600,
      t1TreeNodes: 7000,
      t1Output: 1436,
      t1UptimePct: 97,
      bnPct: 50,
      a2Enabled: true,
      selfcheckEnabled: false,
    });

    assert.ok(r50.a2BnBridge > r25.a2BnBridge, "doubling BN% roughly doubles A2 cost");
  });
});

describe("computeStream2 — post-T1 redClaw subsidiary cost", () => {
  it("subsidy 100% → llpResidual is $0, redClawAbsorbed equals subtotal", () => {
    const result = computeStream2({
      cascade: applyMacros({ scaleUsers: 100, quality: 95, subsidyPct: 100 }, new Set()),
      t1BaseCost: 0.02,
      t2PriorAnswer: 1436,
      t2History: 600,
      t2Output: 600,
      t2UptimePct: 98,
      d1Enabled: true,
      e3Enabled: true,
      f1Enabled: true,
      cacheEnabled: true,
      cacheHitPct: 0,
      deepSearchPct: 5,
      pDirty: 8,
      pF1: 3,
      subsidyPct: 100,
    });

    assert.equal(result.llpResidual, 0, "100% subsidy = LLP pays nothing post-T1");
    assert.ok(result.subtotalBeforeSubsidy > 0, "subtotal should be > 0");
    assert.equal(result.redClawAbsorbed, result.subtotalBeforeSubsidy);
  });

  it("subsidy 0% → llpResidual equals subtotal, redClawAbsorbed is 0", () => {
    const result = computeStream2({
      cascade: applyMacros({ scaleUsers: 100, quality: 95, subsidyPct: 0 }, new Set()),
      t1BaseCost: 0.02,
      t2PriorAnswer: 1436,
      t2History: 600,
      t2Output: 600,
      t2UptimePct: 98,
      d1Enabled: true,
      e3Enabled: true,
      f1Enabled: true,
      cacheEnabled: true,
      cacheHitPct: 0,
      deepSearchPct: 5,
      pDirty: 8,
      pF1: 3,
      subsidyPct: 0,
    });

    assert.equal(result.llpResidual, result.subtotalBeforeSubsidy);
    assert.equal(result.redClawAbsorbed, 0);
  });

  it("D1 verify cost matches verifyModel choice (Opus > Sonnet > Haiku)", () => {
    const macros = { scaleUsers: 100, quality: 95, subsidyPct: 100 };
    const opusCascade = applyMacros(macros, new Set()); // Quality 95 → opus
    const sonnetCascade = applyMacros(macros, new Set(["verifyModel"]), { verifyModel: "sonnet-4.6" });
    const haikuCascade = applyMacros(macros, new Set(["verifyModel"]), { verifyModel: "haiku-4.5" });

    const opus = computeStream2({ cascade: opusCascade, t1BaseCost: 0.02, t2PriorAnswer: 1436, t2History: 600, t2Output: 600, t2UptimePct: 98, d1Enabled: true, e3Enabled: false, f1Enabled: false, cacheEnabled: false, cacheHitPct: 0, deepSearchPct: 5, pDirty: 8, pF1: 3, subsidyPct: 0 });
    const sonnet = computeStream2({ cascade: sonnetCascade, t1BaseCost: 0.02, t2PriorAnswer: 1436, t2History: 600, t2Output: 600, t2UptimePct: 98, d1Enabled: true, e3Enabled: false, f1Enabled: false, cacheEnabled: false, cacheHitPct: 0, deepSearchPct: 5, pDirty: 8, pF1: 3, subsidyPct: 0 });
    const haiku = computeStream2({ cascade: haikuCascade, t1BaseCost: 0.02, t2PriorAnswer: 1436, t2History: 600, t2Output: 600, t2UptimePct: 98, d1Enabled: true, e3Enabled: false, f1Enabled: false, cacheEnabled: false, cacheHitPct: 0, deepSearchPct: 5, pDirty: 8, pF1: 3, subsidyPct: 0 });

    assert.ok(opus.d1Verify > sonnet.d1Verify, "Opus more expensive than Sonnet");
    assert.ok(sonnet.d1Verify > haiku.d1Verify, "Sonnet more expensive than Haiku");
  });

  it("D1 verify cache hit% reduces D1 cost linearly", () => {
    const macros = { scaleUsers: 100, quality: 95, subsidyPct: 0 };
    const cascade = applyMacros(macros, new Set());

    const noCache = computeStream2({ cascade, t1BaseCost: 0.02, t2PriorAnswer: 1436, t2History: 600, t2Output: 600, t2UptimePct: 98, d1Enabled: true, e3Enabled: false, f1Enabled: false, cacheEnabled: true, cacheHitPct: 0, deepSearchPct: 5, pDirty: 8, pF1: 3, subsidyPct: 0 });
    const halfCache = computeStream2({ cascade, t1BaseCost: 0.02, t2PriorAnswer: 1436, t2History: 600, t2Output: 600, t2UptimePct: 98, d1Enabled: true, e3Enabled: false, f1Enabled: false, cacheEnabled: true, cacheHitPct: 50, deepSearchPct: 5, pDirty: 8, pF1: 3, subsidyPct: 0 });

    assert.ok(Math.abs(halfCache.d1Verify - noCache.d1Verify * 0.5) < 0.0001, "50% cache hit halves D1 cost");
  });
});

const TEST_TIER_CFG: Record<TierKey, TierCfg> = {
  free_guest: { label: "Free Guest", color: "text-zinc-400", priceBdt: 0, utilizationPct: 100, t1Uptime: 97, t2Uptime: 98 },
  free_subscribed: { label: "Free Sub", color: "text-sky-400", priceBdt: 0, utilizationPct: 100, t1Uptime: 97, t2Uptime: 98 },
  mini: { label: "Mini", color: "text-emerald-400", priceBdt: 149, utilizationPct: 100, t1Uptime: 97, t2Uptime: 98 },
  max: { label: "Max", color: "text-amber-400", priceBdt: 299, utilizationPct: 100, t1Uptime: 97, t2Uptime: 98 },
};

const TEST_STATE: CalcState = {
  presetId: "today",
  macros: { scaleUsers: 100, quality: 50, subsidyPct: 100 },
  overrides: [],
  phaseB: {
    flags: { ENABLE_HONESTY_GUARD: true, ENABLE_BN_BRIDGE: false, ENABLE_TURN1_VERIFY: false, ENABLE_RECOVERY_LOOP: false, ENABLE_F1_CORRECTOR: false, ENABLE_VERIFY_CACHE: false, ENABLE_SUBSECTION_SELFCHECK: false },
    verifyModel: "opus",
    bnPct: 25, deepSearchPct: 5, cacheHitPct: 0, pDirty: 12, pF1: 3,
  },
  t1RagChunks: 9600, t1TreeNodes: 7000, t1Output: 1436,
  t2PriorAnswer: 1436, t2History: 600, t2Output: 600,
  tierCfg: TEST_TIER_CFG,
  monthlyUsage: { free_guest: 4, free_subscribed: 10, mini: 60, max: 180 },
  userCounts: { free_guest: 24, free_subscribed: 56, mini: 12, max: 8 },
  paidPercent: 20,
  currency: "USD",
  subscriptions: [],
};

describe("computeMonthly — Today (prod) preset, 100 users, 100% subsidy", () => {
  it("totalNetLLP rolls up Stream-1 variable cost; totalRedClaw rolls up Stream-2 absorbed", () => {
    const result = computeMonthly(TEST_STATE);
    assert.ok(result.totalNetLLP > 0, "Stream-1 (Grok + Gemini paid APIs) rolls up as variable cost");
    assert.ok(result.totalRedClaw >= 0, "Stream-2 absorbed informational (≥ 0)");
    assert.ok(result.perTier.mini.pl.blended.stream1.total > 0, "stream1 per-tier breakdown intact");
  });

  it("totalChats matches sum of tier usage × tier user count", () => {
    const result = computeMonthly(TEST_STATE);
    const expectedChats =
      result.perTier.free_guest.users * 4 +
      result.perTier.free_subscribed.users * 10 +
      result.perTier.mini.users * 60 +
      result.perTier.max.users * 180;
    assert.equal(result.totalChats, expectedChats);
  });

  it("totalUsers equals macros.scaleUsers", () => {
    const result = computeMonthly(TEST_STATE);
    assert.equal(result.totalUsers, 100);
  });

  it("subsidyPct < 100 adds Stream-2 LLP residual to totalNetLLP on top of Grok-T1 burn", () => {
    const subsidy100 = computeMonthly(TEST_STATE);
    const subsidy0 = computeMonthly({ ...TEST_STATE, macros: { ...TEST_STATE.macros, subsidyPct: 0 } });
    // At 100% subsidy → Grok T1 only. At 0% subsidy → Grok T1 + full Stream-2.
    assert.ok(subsidy0.totalNetLLP > subsidy100.totalNetLLP, "subsidy 0% should increase LLP cost");
    const s100Residual = subsidy100.perTier.mini.pl.blended.stream2.llpResidual;
    const s0Residual = subsidy0.perTier.mini.pl.blended.stream2.llpResidual;
    assert.ok(s0Residual > s100Residual, "subsidy 0% pushes stream2 cost to LLP residual in the breakdown");
  });

  it("subscriptions sum into marginAfterFixed; disabled rows are ignored", () => {
    const empty = computeMonthly(TEST_STATE);
    assert.equal(empty.totalSubscriptions, 0);
    assert.equal(empty.marginAfterFixed, empty.totalMargin);

    const withSubs = computeMonthly({
      ...TEST_STATE,
      subscriptions: [
        { id: "a", label: "Inference",monthlyUsd: 15,  enabled: true },
        { id: "b", label: "Vercel",   monthlyUsd: 20,  enabled: true },
        { id: "c", label: "ChatGPT",  monthlyUsd: 100, enabled: false }, // disabled — must be skipped
      ],
    });
    assert.equal(withSubs.totalSubscriptions, 35);
    assert.ok(
      Math.abs(withSubs.marginAfterFixed - (withSubs.totalMargin - 35)) < 1e-9,
      "marginAfterFixed = totalMargin - totalSubscriptions",
    );
  });
});
