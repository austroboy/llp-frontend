import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { blockOrgUser } from "../lib/orgGuard";
import { requireAdmin, requireSelf } from "../_lib/auth";

// ═══════════════════════════════════════════════════════════════
// Scout Join Form — Profile CRUD
// ═══════════════════════════════════════════════════════════════

const geographyExposureValidator = v.object({
  geography: v.string(),
  exposureTypes: v.array(v.string()),
});

const strengthLiteral = v.union(v.literal("Strong"), v.literal("Moderate"), v.literal("Limited"));
const geoTypeLiteral = v.union(v.literal("Active sourcing"), v.literal("Market understanding"), v.literal("Past hiring exposure"));

const sourcingMarketValidator = v.object({
  country: v.string(),
  strength: strengthLiteral,
  type: geoTypeLiteral,
});

const crossBorderCorridorValidator = v.object({
  corridor: v.string(),
  strength: strengthLiteral,
  type: geoTypeLiteral,
});

const communityValidator = v.object({
  name: v.string(),
  role: v.optional(v.string()),
  country: v.optional(v.string()),
});

// --- Queries ---

export const getByUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Owner-scoped: scouts only read their own profile.
    await requireSelf(ctx, args.clerkId);
    return await ctx.db
      .query("htScoutProfiles")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const getById = query({
  args: { id: v.id("htScoutProfiles") },
  handler: async (ctx, args) => {
    // Admin OR owning scout. Doc lookup first, then enforce.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    if (doc.clerkId !== identity.subject) {
      const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
      if (role !== "admin") {
        const member = await ctx.db
          .query("ctTeamMembers")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
          .first();
        if (!(member?.dashboardRole === "super_admin" && member.isActive)) {
          throw new Error("Forbidden");
        }
      }
    }
    return doc;
  },
});

export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("draft"), v.literal("submitted"),
      v.literal("under_review"), v.literal("approved"), v.literal("rejected")
    )),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("htScoutProfiles")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("htScoutProfiles")
      .order("desc")
      .collect();
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const submitted = await ctx.db
      .query("htScoutProfiles")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
    const underReview = await ctx.db
      .query("htScoutProfiles")
      .withIndex("by_status", (q) => q.eq("status", "under_review"))
      .collect();
    return [...submitted, ...underReview].sort(
      (a, b) => (b.submittedAt || b.createdAt) - (a.submittedAt || a.createdAt)
    );
  },
});

export const getPendingCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const submitted = await ctx.db
      .query("htScoutProfiles")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
    const underReview = await ctx.db
      .query("htScoutProfiles")
      .withIndex("by_status", (q) => q.eq("status", "under_review"))
      .collect();
    return submitted.length + underReview.length;
  },
});

// --- Mutations ---

/**
 * Create or update (upsert) a scout profile.
 * Called on every auto-save during form completion.
 */
export const upsert = mutation({
  args: {
    clerkId: v.string(),
    // S1
    fullName: v.optional(v.string()),
    currentTitle: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
    location: v.optional(v.string()),
    mobile: v.optional(v.string()),
    email: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    oneLiner: v.optional(v.string()),
    totalYearsExperience: v.optional(v.string()),
    // S2
    professionalBase: v.optional(v.string()),
    professionalBaseOther: v.optional(v.string()),
    // S3
    functionPrimary: v.optional(v.array(v.string())),
    functionSecondary: v.optional(v.array(v.string())),
    functionBasis: v.optional(v.string()),
    // S4
    industryPrimary: v.optional(v.array(v.string())),
    industrySecondary: v.optional(v.array(v.string())),
    industryBasis: v.optional(v.string()),
    // S5-S6
    talentAccessSegments: v.optional(v.array(v.string())),
    talentAccessBasis: v.optional(v.array(v.string())),
    // S7-S9
    roleLevelReach: v.optional(v.array(v.string())),
    hiringExperienceTypes: v.optional(v.array(v.string())),
    hiringScope: v.optional(v.array(v.string())),
    seniorityExposure: v.optional(v.array(v.string())),
    recruitmentYears: v.optional(v.string()),
    hiringPercentage: v.optional(v.string()),
    // S10-S11
    countriesSupported: v.optional(v.array(v.string())),
    countriesOther: v.optional(v.string()),
    hiringCorridors: v.optional(v.array(v.string())),
    corridorsOther: v.optional(v.string()),
    // S12
    geographyExposure: v.optional(v.array(geographyExposureValidator)),
    // S10-S12 v2: Enhanced Geography
    primarySourcingMarkets: v.optional(v.array(sourcingMarketValidator)),
    crossBorderCorridors: v.optional(v.array(crossBorderCorridorValidator)),
    marketFamiliarity: v.optional(v.array(v.string())),
    geographyExample: v.optional(v.string()),
    // S13-S14
    mandateTypeStrengths: v.optional(v.array(v.string())),
    // S15
    communitiesPrimary: v.optional(v.array(communityValidator)),
    communitiesAdditional: v.optional(v.array(communityValidator)),
    // S16
    activeScouting: v.optional(v.boolean()),
    involvementTypes: v.optional(v.array(v.string())),
    willingConfidential: v.optional(v.boolean()),
    willingCrossBorder: v.optional(v.boolean()),
    preferredLevels: v.optional(v.array(v.string())),
    // S17
    visibility: v.optional(v.union(
      v.literal("internal_only"), v.literal("public_listed"),
      v.literal("limited_public"), v.literal("employer_via_llp")
    )),
    // Identity privacy
    identityMode: v.optional(v.union(
      v.literal("anonymous"), v.literal("credited"), v.literal("selective_reveal")
    )),
    // S18
    confirmMasterAcceptance: v.optional(v.boolean()),
    confirmEmployerTrust: v.optional(v.boolean()),
    confirmPlatformConduct: v.optional(v.boolean()),
    // Talent Bank
    talentBankConsent: v.optional(v.boolean()),
    talentBankCvStorageId: v.optional(v.id("_storage")),
    // Meta
    currentStep: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await blockOrgUser(ctx);
    // Caller must own the clerkId they're upserting against.
    await requireSelf(ctx, args.clerkId);
    const { clerkId, ...fields } = args;
    const now = Date.now();

    const existing = await ctx.db
      .query("htScoutProfiles")
      .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      // After submission, only allow updates to editable fields
      const editableAfterSubmit = new Set(["mobile", "linkedin", "visibility", "identityMode", "activeScouting", "involvementTypes", "preferredLevels", "willingConfidential", "willingCrossBorder"]);
      // Rejected/removed profiles can be fully edited (they are re-applying)
      const isPostSubmit = existing.status !== "draft" && existing.status !== "rejected" && existing.status !== "removed";

      // Filter out undefined values to avoid overwriting with undefined
      const updates: Record<string, unknown> = { updatedAt: now };
      for (const [k, val] of Object.entries(fields)) {
        if (val !== undefined) {
          if (isPostSubmit && !editableAfterSubmit.has(k)) continue; // Skip non-editable fields after submission
          updates[k] = val;
        }
      }
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      return await ctx.db.insert("htScoutProfiles", {
        clerkId,
        fullName: fields.fullName || "",
        email: fields.email || "",
        currentTitle: fields.currentTitle,
        currentCompany: fields.currentCompany,
        location: fields.location,
        mobile: fields.mobile,
        linkedin: fields.linkedin,
        oneLiner: fields.oneLiner,
        totalYearsExperience: fields.totalYearsExperience,
        professionalBase: fields.professionalBase,
        professionalBaseOther: fields.professionalBaseOther,
        functionPrimary: fields.functionPrimary,
        functionSecondary: fields.functionSecondary,
        functionBasis: fields.functionBasis,
        industryPrimary: fields.industryPrimary,
        industrySecondary: fields.industrySecondary,
        industryBasis: fields.industryBasis,
        talentAccessSegments: fields.talentAccessSegments,
        talentAccessBasis: fields.talentAccessBasis,
        hiringExperienceTypes: fields.hiringExperienceTypes,
        hiringScope: fields.hiringScope,
        recruitmentYears: fields.recruitmentYears,
        hiringPercentage: fields.hiringPercentage,
        countriesSupported: fields.countriesSupported,
        countriesOther: fields.countriesOther,
        hiringCorridors: fields.hiringCorridors,
        corridorsOther: fields.corridorsOther,
        geographyExposure: fields.geographyExposure,
        primarySourcingMarkets: fields.primarySourcingMarkets,
        crossBorderCorridors: fields.crossBorderCorridors,
        marketFamiliarity: fields.marketFamiliarity,
        geographyExample: fields.geographyExample,
        mandateTypeStrengths: fields.mandateTypeStrengths,
        communitiesPrimary: fields.communitiesPrimary,
        communitiesAdditional: fields.communitiesAdditional,
        activeScouting: fields.activeScouting,
        involvementTypes: fields.involvementTypes,
        willingConfidential: fields.willingConfidential,
        willingCrossBorder: fields.willingCrossBorder,
        preferredLevels: fields.preferredLevels,
        visibility: fields.visibility,
        confirmMasterAcceptance: fields.confirmMasterAcceptance,
        confirmEmployerTrust: fields.confirmEmployerTrust,
        confirmPlatformConduct: fields.confirmPlatformConduct,
        talentBankConsent: fields.talentBankConsent,
        talentBankCvStorageId: fields.talentBankCvStorageId,
        currentStep: fields.currentStep ?? 0,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Reset a rejected/removed profile back to draft so the user can re-apply.
 */
export const resetForReapply = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await blockOrgUser(ctx);
    await requireSelf(ctx, args.clerkId);
    const existing = await ctx.db
      .query("htScoutProfiles")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!existing) throw new Error("No profile found");
    if (!(["rejected", "removed"] as string[]).includes(existing.status)) {
      throw new Error("Only rejected or removed profiles can be reset for re-application");
    }
    const now = Date.now();
    await ctx.db.patch(existing._id, {
      status: "draft",
      reviewNotes: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
      removedBy: undefined,
      removedAt: undefined,
      removalReason: undefined,
      currentStep: 0,
      updatedAt: now,
    });
    return existing._id;
  },
});

/**
 * Submit a draft profile for review.
 */
export const submit = mutation({
  args: { id: v.id("htScoutProfiles") },
  handler: async (ctx, args) => {
    await blockOrgUser(ctx);
    const profile = await ctx.db.get(args.id);
    if (!profile) throw new Error("Profile not found");
    // Owner-scope: caller must own this profile via clerkId.
    await requireSelf(ctx, profile.clerkId);
    if (profile.status !== "draft") throw new Error("Only draft profiles can be submitted");

    // Validate required fields
    if (!profile.fullName?.trim()) throw new Error("Name is required");
    if (!profile.email?.trim()) throw new Error("Email is required");
    if (!profile.mobile?.trim()) throw new Error("Mobile number is required");
    if (!profile.linkedin?.trim()) throw new Error("LinkedIn profile is required");
    if (!profile.confirmMasterAcceptance) throw new Error("Application confirmation is required");
    if (!profile.confirmPlatformConduct) throw new Error("Platform conduct confirmation is required");

    // Generate profile ID
    const allProfiles = await ctx.db.query("htScoutProfiles").collect();
    const nextNum = allProfiles.length + 1;
    const profileId = `SCT-${String(nextNum).padStart(4, "0")}`;

    // Capture "Other" field suggestions for admin review
    const suggestions: Array<{ fieldName: string; value: string }> = [];
    
    if (profile.professionalBase === "Other" && profile.professionalBaseOther?.trim()) {
      suggestions.push({ fieldName: "professionalBase", value: profile.professionalBaseOther.trim() });
    }
    if (profile.countriesOther?.trim()) {
      suggestions.push({ fieldName: "countries", value: profile.countriesOther.trim() });
    }
    if (profile.corridorsOther?.trim()) {
      suggestions.push({ fieldName: "hiringCorridors", value: profile.corridorsOther.trim() });
    }
    
    // Create suggestion records
    for (const suggestion of suggestions) {
      await ctx.db.insert("scoutSuggestions", {
        fieldName: suggestion.fieldName,
        suggestedValue: suggestion.value,
        scoutClerkId: profile.clerkId,
        scoutProfileId: profileId,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.id, {
      status: "submitted",
      profileId,
      submittedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { profileId, suggestionsCreated: suggestions.length };
  },
});

// --- Admin Review ---

export const updateStatus = mutation({
  args: {
    id: v.id("htScoutProfiles"),
    status: v.union(
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    reviewedBy: v.string(),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const profile = await ctx.db.get(args.id);
    if (!profile) throw new Error("Profile not found");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: args.status,
      reviewedBy: args.reviewedBy,
      reviewNotes: args.reviewNotes,
      reviewedAt: now,
      updatedAt: now,
    });

    // On approval, create/update expert entry with scout fields
    if (args.status === "approved") {
      const existingExpert = await ctx.db
        .query("experts")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", profile.clerkId))
        .first();

      const scoutData = {
        scoutTier: "standard" as const,
        scoutStatus: "active" as const,
        coverageLanes: {
          functions: profile.functionPrimary || [],
          industries: profile.industryPrimary || [],
          geographies: profile.countriesSupported || [],
          roleLevels: [], // Derived from talentAccessSegments instead
        },
        credibilityScore: 50,
      };

      if (existingExpert) {
        await ctx.db.patch(existingExpert._id, {
          ...scoutData,
          updatedAt: now,
        });
      }
      // If no expert entry exists, the admin will need to create one separately
      // or we can auto-create a minimal one
    }
  },
});

// --- Remove Scout (soft-delete — keeps record, allows re-apply) ---

export const removeScout = mutation({
  args: {
    id: v.id("htScoutProfiles"),
    removedBy: v.string(),
    removalReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const profile = await ctx.db.get(args.id);
    if (!profile) throw new Error("Profile not found");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "removed",
      removedBy: args.removedBy,
      removalReason: args.removalReason,
      removedAt: now,
      updatedAt: now,
    });

    // If they had an active expert/scout entry, deactivate it
    if (profile.clerkId) {
      const existingExpert = await ctx.db
        .query("experts")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", profile.clerkId))
        .first();
      if (existingExpert && existingExpert.scoutStatus === "active") {
        await ctx.db.patch(existingExpert._id, {
          scoutStatus: "paused",
          updatedAt: now,
        });
      }
    }
  },
});

// --- File Upload ---

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await blockOrgUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
