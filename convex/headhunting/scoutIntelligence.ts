/**
 * LLP Sprint 4 — Scout Intelligence Layer
 *
 * 1. Per-country tier rating engine (compute + store)
 * 2. Scout suggestion engine for mandate matching
 * 3. Silent performance event logging
 * 4. Scout dashboard stats (healthy, limited view)
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { calculateScoutCountryRatings } from "../../src/lib/headhunting/scout-rating";
import type { ScoutRatingProfile } from "../../src/lib/headhunting/scout-rating";
import { requireAdmin, requireSelf } from "../_lib/auth";

// ─────────────────────────────────────────────────────────────────
// 1. TIER RATING ENGINE
// ─────────────────────────────────────────────────────────────────

/**
 * Compute and store per-country ratings for a scout.
 * Called: on scout profile approval, on profile update.
 * LLP-internal only — scouts never see the raw scores.
 */
export const computeAndStoreRatings = mutation({
  args: {
    scoutProfileId: v.id("htScoutProfiles"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const profile = await ctx.db.get(args.scoutProfileId);
    if (!profile) throw new Error("Scout profile not found");

    const ratingProfile: ScoutRatingProfile = {
      totalYearsExperience: profile.totalYearsExperience,
      recruitmentYears: (profile as Record<string, unknown>).recruitmentYears as string | undefined,
      hiringPercentage: (profile as Record<string, unknown>).hiringPercentage as string | undefined,
      roleLevelReach: profile.roleLevelReach,
      functionPrimary: profile.functionPrimary,
      functionSecondary: profile.functionSecondary,
      industryPrimary: profile.industryPrimary,
      industrySecondary: profile.industrySecondary,
      primarySourcingMarkets: profile.primarySourcingMarkets as ScoutRatingProfile["primarySourcingMarkets"],
      geographyExposure: profile.geographyExposure,
      talentAccessSegments: profile.talentAccessSegments,
      networkFreshness: profile.networkFreshness,
    };

    const ratings = calculateScoutCountryRatings(ratingProfile);
    const now = Date.now();

    // Upsert each country rating
    for (const rating of ratings) {
      const existing = await ctx.db
        .query("htScoutCountryRatings")
        .withIndex("by_scout_country", q =>
          q.eq("scoutId", profile.clerkId).eq("country", rating.country)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          score: rating.score,
          tier: rating.tier,
          breakdown: rating.breakdown,
          computedAt: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("htScoutCountryRatings", {
          scoutId: profile.clerkId,
          scoutProfileId: args.scoutProfileId,
          country: rating.country,
          score: rating.score,
          tier: rating.tier,
          breakdown: rating.breakdown,
          computedAt: now,
          updatedAt: now,
        });
      }
    }

    return ratings;
  },
});

/**
 * LLP admin: manually override a scout's tier for a country.
 */
export const overrideCountryTier = mutation({
  args: {
    scoutId: v.string(),
    country: v.string(),
    tier: v.union(v.literal("S"), v.literal("P"), v.literal("E"), v.literal("N")),
    reason: v.string(),
    overriddenBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("htScoutCountryRatings")
      .withIndex("by_scout_country", q =>
        q.eq("scoutId", args.scoutId).eq("country", args.country)
      )
      .first();

    if (!existing) throw new Error("No rating found for this scout/country combination");

    await ctx.db.patch(existing._id, {
      tier: args.tier,
      manualOverride: {
        tier: args.tier,
        reason: args.reason,
        overriddenBy: args.overriddenBy,
        overriddenAt: Date.now(),
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get all country ratings for a scout (LLP-internal).
 */
export const getCountryRatingsByScout = query({
  args: { scoutId: v.string() },
  handler: async (ctx, args) => {
    // LLP-internal only — scouts never see their raw scores.
    await requireAdmin(ctx);
    return await ctx.db
      .query("htScoutCountryRatings")
      .withIndex("by_scout", q => q.eq("scoutId", args.scoutId))
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────
// 2. SCOUT SUGGESTION ENGINE
// ─────────────────────────────────────────────────────────────────

/**
 * Suggest ranked scouts for a mandate based on:
 * - Country match → tier (S first, then P, then E)
 * - Function + industry overlap
 * - Mandate seniority vs scout's role level reach
 *
 * Returns ranked list for LLP agent to review and select from.
 * LLP always makes the final selection — this just ranks.
 */
export const getSuggestedScoutsForMandate = query({
  args: {
    mandateId: v.id("htMandates"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const mandate = await ctx.db.get(args.mandateId);
    if (!mandate) return [];

    // Get mandate blueprint for function/industry context
    const blueprint = await ctx.db
      .query("htRoleBlueprints")
      .withIndex("by_mandate", q => q.eq("mandateId", args.mandateId))
      .order("desc")
      .first();

    // Determine country to match (use mandate country or first sourcing market)
    const mandateCountry = (mandate as Record<string, unknown>).country as string | undefined
      ?? "Bangladesh"; // default

    // Get all scouts with a rating for this country
    const countryRatings = await ctx.db
      .query("htScoutCountryRatings")
      .withIndex("by_country_tier", q => q.eq("country", mandateCountry))
      .collect();

    if (countryRatings.length === 0) return [];

    // Get approved scout profiles
    const results = [];

    for (const rating of countryRatings) {
      // Only suggest active scouts
      const expert = await ctx.db
        .query("experts")
        .withIndex("by_clerkId", q => q.eq("clerkId", rating.scoutId))
        .first();

      if (!expert || expert.scoutStatus !== "active") continue;

      const profile = await ctx.db
        .query("htScoutProfiles")
        .withIndex("by_clerk", q => q.eq("clerkId", rating.scoutId))
        .first();

      if (!profile || profile.status !== "approved") continue;

      // Calculate match relevance score
      let relevanceBoost = 0;

      // Function overlap
      if (blueprint?.function) {
        const scoutFunctions = [
          ...(profile.functionPrimary ?? []),
          ...(profile.functionSecondary ?? []),
        ].map(f => f.toLowerCase());
        if (scoutFunctions.some(f => f.includes(blueprint.function!.toLowerCase()))) {
          relevanceBoost += 10;
        }
      }

      // Industry overlap
      if (blueprint?.targetSectors?.length) {
        const scoutIndustries = [
          ...(profile.industryPrimary ?? []),
          ...(profile.industrySecondary ?? []),
        ].map(i => i.toLowerCase());
        const overlap = (blueprint.targetSectors ?? []).filter(
          s => scoutIndustries.some(i => i.includes(s.toLowerCase()))
        );
        relevanceBoost += Math.min(10, overlap.length * 3);
      }

      results.push({
        scoutId: rating.scoutId,
        scoutName: expert.name,
        country: rating.country,
        tier: rating.tier,
        score: rating.score,
        breakdown: rating.breakdown,
        manualOverride: rating.manualOverride,
        relevanceBoost,
        totalRank: rating.score + relevanceBoost,
        profile: {
          functionPrimary: profile.functionPrimary,
          industryPrimary: profile.industryPrimary,
          networkFreshness: profile.networkFreshness,
        },
      });
    }

    // Sort: Tier S first, within tier by totalRank desc
    const tierOrder: Record<string, number> = { S: 0, P: 1, E: 2, N: 3 };
    results.sort((a, b) => {
      const tierDiff = (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9);
      if (tierDiff !== 0) return tierDiff;
      return b.totalRank - a.totalRank;
    });

    return results;
  },
});

// ─────────────────────────────────────────────────────────────────
// 3. SILENT PERFORMANCE TRACKING
// ─────────────────────────────────────────────────────────────────

/**
 * Log a scout performance event.
 * Called from other mutations (submit, shortlist, placement, etc.)
 * Zero frontend — purely internal intelligence building.
 */
export const logPerformanceEvent = mutation({
  args: {
    scoutId: v.string(),
    eventType: v.union(
      v.literal("submission_created"),
      v.literal("submission_shortlisted"),
      v.literal("submission_rejected"),
      v.literal("duplicate_flagged"),
      v.literal("override_recorded"),
      v.literal("client_accepted"),
      v.literal("client_passed"),
      v.literal("placement_confirmed"),
      v.literal("brief_viewed"),
      v.literal("brief_responded"),
    ),
    mandateId: v.optional(v.id("htMandates")),
    submissionId: v.optional(v.id("htSubmissions")),
    meta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Admin-only: silent performance events are emitted by trusted server flows
    // (submit, shortlist, etc.) and must not be forgable by scouts themselves.
    await requireAdmin(ctx);
    await ctx.db.insert("htScoutPerformanceEvents", {
      scoutId: args.scoutId,
      eventType: args.eventType,
      mandateId: args.mandateId,
      submissionId: args.submissionId,
      meta: args.meta,
      timestamp: Date.now(),
    });
  },
});

/**
 * Get raw performance event counts for a scout (LLP-internal).
 * Not exposed to scouts directly.
 */
export const getScoutPerformanceSummary = query({
  args: { scoutId: v.string() },
  handler: async (ctx, args) => {
    // LLP-internal only — not exposed to scouts directly per design comment above.
    await requireAdmin(ctx);
    const events = await ctx.db
      .query("htScoutPerformanceEvents")
      .withIndex("by_scout", q => q.eq("scoutId", args.scoutId))
      .collect();

    const counts: Record<string, number> = {};
    for (const ev of events) {
      counts[ev.eventType] = (counts[ev.eventType] ?? 0) + 1;
    }

    return {
      total: events.length,
      submissionsCreated: counts.submission_created ?? 0,
      submissionsShortlisted: counts.submission_shortlisted ?? 0,
      submissionsRejected: counts.submission_rejected ?? 0,
      duplicatesFlagged: counts.duplicate_flagged ?? 0,
      overridesRecorded: counts.override_recorded ?? 0,
      clientAccepted: counts.client_accepted ?? 0,
      clientPassed: counts.client_passed ?? 0,
      placements: counts.placement_confirmed ?? 0,
      // Derived rates (only when denominator > 0)
      shortlistRate: counts.submission_created
        ? Math.round(((counts.submission_shortlisted ?? 0) / counts.submission_created) * 100)
        : null,
    };
  },
});

// ─────────────────────────────────────────────────────────────────
// 4. SCOUT DASHBOARD — HEALTHY STATS (limited, public-facing)
// ─────────────────────────────────────────────────────────────────

/**
 * What scouts see on their dashboard.
 * Clean, motivating, no internal scoring logic exposed.
 */
export const getScoutDashboardStats = query({
  args: { scoutId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    // All submissions by this scout
    const allSubs = await ctx.db
      .query("htSubmissions")
      .filter(q => q.eq(q.field("scoutId"), args.scoutId))
      .collect();

    const submitted = allSubs.length;
    const shortlisted = allSubs.filter(s =>
      ["shortlisted", "interview", "selected", "offer", "joined"].includes(s.status)
    ).length;
    const placed = allSubs.filter(s => s.status === "joined").length;

    // Active mandates (briefs where scout can still submit)
    const activeBriefs = await ctx.db
      .query("htBriefReleases")
      .filter(q => q.eq(q.field("scoutId"), args.scoutId))
      .collect();

    const activeMandates = activeBriefs.filter(b => {
      const deadline = (b as Record<string, unknown>).deadline as number | undefined;
      if (!deadline) return true;
      return deadline > Date.now();
    }).length;

    return {
      submitted,
      shortlisted,
      placed,
      activeMandates,
      // Nothing else. Clean. No rates. No rankings. No scores.
    };
  },
});
