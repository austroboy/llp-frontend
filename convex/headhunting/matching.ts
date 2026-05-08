import { query, mutation, action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireAdmin } from "../_lib/auth";

// ═══════════════════════════════════════════════════════════════
// AI Candidate Matching — Profile Pool → Mandate
// ═══════════════════════════════════════════════════════════════

/**
 * Find candidates from the professional profile pool that match a mandate's blueprint.
 * Uses in-DB matching (no vector search needed — blueprints have structured fields).
 */
export const findMatchingCandidates = query({
  args: { mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const mandate = await ctx.db.get(args.mandateId);
    if (!mandate) return [];

    const blueprint = await ctx.db
      .query("htRoleBlueprints")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .order("desc")
      .first();
    if (!blueprint) return [];

    // Get all profiles that opted into headhunting
    const profiles = await ctx.db.query("professionalProfiles").collect();
    const optedIn = profiles.filter(
      (p) =>
        p.headhuntingPreferences?.availability !== "not_now" &&
        p.headhuntingPreferences?.consentTimestamp
    );

    // Score each candidate
    const scored = optedIn.map((profile) => {
      let score = 0;
      const reasons: string[] = [];
      const prefs = profile.headhuntingPreferences;

      // 1. Target role match
      if (prefs?.targetRoles?.length && blueprint.function) {
        const roleMatch = prefs.targetRoles.some(
          (r) => r.toLowerCase().includes(blueprint.function!.toLowerCase()) ||
                 blueprint.function!.toLowerCase().includes(r.toLowerCase())
        );
        if (roleMatch) { score += 20; reasons.push("Target role match"); }
      }

      // 2. Target function match
      if (prefs?.targetFunctions?.length && blueprint.function) {
        const funcMatch = prefs.targetFunctions.some(
          (f) => f.toLowerCase().includes(blueprint.function!.toLowerCase())
        );
        if (funcMatch) { score += 15; reasons.push("Function match"); }
      }

      // 3. Seniority match
      if (prefs?.targetSeniority?.length && blueprint.seniority) {
        const senMatch = prefs.targetSeniority.some(
          (s) => s.toLowerCase().includes(blueprint.seniority!.toLowerCase()) ||
                 blueprint.seniority!.toLowerCase().includes(s.toLowerCase())
        );
        if (senMatch) { score += 15; reasons.push("Seniority level match"); }
      }

      // 4. Location match
      if (blueprint.location && profile.district) {
        if (blueprint.location.toLowerCase().includes(profile.district.toLowerCase())) {
          score += 10;
          reasons.push("Location match");
        }
      }

      // 5. Salary alignment
      if (prefs?.minimumSalary && blueprint.compensationMode) {
        score += 5; // Has salary expectations set — can be compared
        reasons.push("Salary expectations available");
      }

      // 6. Skills overlap (profile skills vs blueprint must-haves)
      if (profile.skills?.length && blueprint.mustHaves?.length) {
        const profileSkills = profile.skills.map(
          (s: { name: string }) => s.name.toLowerCase()
        );
        const mustHaveLower = blueprint.mustHaves.map((m) => m.toLowerCase());

        let overlap = 0;
        for (const mh of mustHaveLower) {
          if (profileSkills.some((ps: string) => mh.includes(ps) || ps.includes(mh))) {
            overlap++;
          }
        }
        if (overlap > 0) {
          score += Math.min(overlap * 8, 25);
          reasons.push(`${overlap} skill/must-have overlap`);
        }
      }

      // 7. Availability bonus
      if (prefs?.availability === "active") {
        score += 10;
        reasons.push("Actively looking");
      }

      // 8. Blacklist check (disqualify)
      if (prefs?.blacklistedCompanies?.length) {
        const clientCompany = mandate.rawTitle?.toLowerCase() || "";
        const blacklisted = prefs.blacklistedCompanies.some(
          (c) => clientCompany.includes(c.toLowerCase())
        );
        if (blacklisted) {
          return { profile, score: -1, reasons: ["Blacklisted company"] };
        }
      }

      return { profile, score: Math.min(score, 100), reasons };
    });

    // Filter out disqualified and low scores, sort by score
    return scored
      .filter((s) => s.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((s) => ({
        userId: s.profile.userId,
        headline: s.profile.headline,
        name: s.profile.fullName || s.profile.headline,
        district: s.profile.district,
        skills: (s.profile.skills || []).slice(0, 5).map(
          (sk: { name: string }) => sk.name
        ),
        matchScore: s.score,
        matchReasons: s.reasons,
        availability: s.profile.headhuntingPreferences?.availability,
        confidentiality: s.profile.headhuntingPreferences?.confidentiality,
      }));
  },
});

/**
 * Surface a matched candidate as an opportunity in their dashboard.
 */
export const surfaceOpportunity = mutation({
  args: {
    candidateUserId: v.string(),
    mandateId: v.id("htMandates"),
    matchScore: v.number(),
    matchReasons: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Check if opportunity already exists for this candidate + mandate
    const existing = await ctx.db
      .query("htOpportunities")
      .withIndex("by_user", (q) => q.eq("candidateUserId", args.candidateUserId))
      .collect();

    const alreadySurfaced = existing.find(
      (o) => o.mandateId === args.mandateId && o.status !== "withdrawn"
    );
    if (alreadySurfaced) return alreadySurfaced._id; // Already surfaced

    // Check max opportunities limit
    const activeOpps = existing.filter(
      (o) => o.status === "pending" || o.status === "interested"
    );
    if (activeOpps.length >= 5) {
      throw new Error("Candidate has too many active opportunities");
    }

    // Get mandate + blueprint info for the opportunity card
    const mandate = await ctx.db.get(args.mandateId);
    if (!mandate) throw new Error("Mandate not found");

    const blueprint = await ctx.db
      .query("htRoleBlueprints")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .order("desc")
      .first();

    const client = await ctx.db.get(mandate.clientId);

    // Determine what to show based on confidentiality
    let companyHint: string | undefined;
    if (blueprint?.confidentialityLevel === "disclosed") {
      companyHint = client?.companyName;
    } else if (blueprint?.confidentialityLevel === "partial_clue") {
      companyHint = client?.industry;
    }

    const now = Date.now();
    return await ctx.db.insert("htOpportunities", {
      candidateUserId: args.candidateUserId,
      mandateId: args.mandateId,
      matchSource: "ai_match",
      matchScore: args.matchScore,
      matchReasons: args.matchReasons,
      roleTitle: blueprint?.title || mandate.rawTitle,
      location: blueprint?.location,
      companyHint,
      status: "pending",
      createdAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  },
});

/**
 * Bulk-surface opportunities for all matching candidates of a mandate.
 */
export const bulkSurfaceForMandate = mutation({
  args: { mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // This will be called from the admin UI after reviewing matches
    // For now it's a placeholder — the actual matching is done by findMatchingCandidates
    // and admin picks which ones to surface
    return { status: "use_findMatchingCandidates_then_surfaceOpportunity" };
  },
});
