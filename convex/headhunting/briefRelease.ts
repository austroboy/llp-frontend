import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireUser } from "../_lib/auth";

// Release a blueprint as brief to matching scouts
export const releaseBriefToScouts = mutation({
  args: {
    mandateId: v.id("htMandates"),
    blueprintId: v.id("htRoleBlueprints"),
    scoutIds: v.array(v.string()), // clerkIds of matched scouts
    disclosureLevel: v.union(
      v.literal("full_mask"),
      v.literal("partial_clue"),
      v.literal("disclosed")
    ),
    compensationMode: v.union(
      v.literal("revenue_share"),
      v.literal("fixed_bounty")
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const created: string[] = [];

    for (const scoutId of args.scoutIds) {
      // Check if already released to this scout
      const existing = await ctx.db
        .query("htBriefReleases")
        .withIndex("by_scout_mandate", (q) =>
          q.eq("scoutId", scoutId).eq("mandateId", args.mandateId)
        )
        .first();

      if (!existing) {
        const referralCode = `REF-${args.mandateId.slice(-4)}-${scoutId.slice(-4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const id = await ctx.db.insert("htBriefReleases", {
          mandateId: args.mandateId,
          blueprintId: args.blueprintId,
          scoutId,
          disclosureLevel: args.disclosureLevel,
          compensationMode: args.compensationMode,
          referralCode,
          slotsAllocated: 7,
          slotsUsed: 0,
          releasedAt: now,
        });
        created.push(id);
      }
    }
    return { released: created.length, skipped: args.scoutIds.length - created.length };
  },
});

// Get scouts that match a blueprint's requirements (by coverage lanes)
export const findMatchingScouts = query({
  args: { blueprintId: v.id("htRoleBlueprints") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const blueprint = await ctx.db.get(args.blueprintId);
    if (!blueprint) return [];

    // Get all active published experts with scout status
    const experts = await ctx.db
      .query("experts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    const activeScouts = experts.filter(
      (e) => e.scoutStatus === "active" && e.coverageLanes
    );

    // Score each scout by lane overlap
    const scored = activeScouts.map((scout) => {
      let score = 0;
      const lanes = scout.coverageLanes!;

      // Function match
      if (blueprint.function && lanes.functions.length > 0) {
        const fn = blueprint.function.toLowerCase();
        if (lanes.functions.some((f) => fn.includes(f.toLowerCase()) || f.toLowerCase().includes(fn))) {
          score += 3;
        }
      }

      // Industry/sector match
      if (blueprint.targetSectors && blueprint.targetSectors.length > 0 && lanes.industries.length > 0) {
        const overlap = blueprint.targetSectors.filter((s) =>
          lanes.industries.some((i) => i.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(i.toLowerCase()))
        );
        score += overlap.length * 2;
      }

      // Geography match
      if (blueprint.location && lanes.geographies.length > 0) {
        const loc = blueprint.location.toLowerCase();
        if (lanes.geographies.some((g) => loc.includes(g.toLowerCase()) || g.toLowerCase().includes(loc))) {
          score += 2;
        }
      }

      // Role level match
      if (blueprint.seniority && lanes.roleLevels.length > 0) {
        const sen = blueprint.seniority.toLowerCase();
        if (lanes.roleLevels.some((r) => sen.includes(r.toLowerCase()) || r.toLowerCase().includes(sen))) {
          score += 2;
        }
      }

      return {
        scoutId: scout.clerkId!,
        name: scout.name,
        tier: scout.scoutTier ?? "standard",
        coverageLanes: lanes,
        credibilityScore: scout.credibilityScore ?? 0,
        hitRate: scout.hitRate ?? 0,
        matchScore: score,
      };
    });

    // Return sorted by match score, only those with > 0
    return scored
      .filter((s) => s.matchScore > 0 && s.scoutId)
      .sort((a, b) => b.matchScore - a.matchScore);
  },
});

// Get release status for a mandate (admin view)
export const getReleasesByMandate = query({
  args: { mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const releases = await ctx.db
      .query("htBriefReleases")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .collect();

    const enriched = await Promise.all(
      releases.map(async (r) => {
        // Find scout name from experts
        const experts = await ctx.db
          .query("experts")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", r.scoutId))
          .first();
        return {
          ...r,
          scoutName: experts?.name ?? r.scoutId,
        };
      })
    );
    return enriched;
  },
});

// Look up a brief release by referral code (for candidate apply flow)
// Requires authenticated user (any candidate applying); referral code is a
// shareable link, but we still require sign-in to discourage scraping.
export const getByReferralCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const release = await ctx.db
      .query("htBriefReleases")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", args.code))
      .first();
    if (!release) return null;

    const mandate = await ctx.db.get(release.mandateId);
    const blueprint = await ctx.db.get(release.blueprintId);

    return { release, mandate, blueprint };
  },
});

// Increment slot usage when a scout submits a candidate
export const incrementSlotUsed = mutation({
  args: { releaseId: v.id("htBriefReleases") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const release = await ctx.db.get(args.releaseId);
    if (!release) throw new Error("Brief release not found");

    const maxSlots = release.slotsAllocated ?? 7;
    const used = release.slotsUsed ?? 0;
    if (used >= maxSlots) throw new Error("Submission slots exhausted for this brief");

    await ctx.db.patch(args.releaseId, { slotsUsed: used + 1 });
  },
});
