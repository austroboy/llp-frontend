import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireSelf, requireAdmin } from "./_lib/auth";

// Re-declare validators (can't import from schema)
const profileSkillValidator = v.object({
  name: v.string(),
  yearsOfExperience: v.optional(v.number()),
});

const profileEducationValidator = v.object({
  degree: v.string(),
  institution: v.string(),
  fieldOfStudy: v.optional(v.string()),
  year: v.optional(v.string()),
});

const profileCertificationValidator = v.object({
  name: v.string(),
  org: v.optional(v.string()),
  year: v.optional(v.string()),
});

const profileExperienceValidator = v.object({
  title: v.string(),
  company: v.string(),
  location: v.optional(v.string()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  isCurrent: v.boolean(),
  description: v.optional(v.string()),
});

const profileLanguageValidator = v.object({
  name: v.string(),
  proficiency: v.optional(v.string()),
});

const profileSocialValidator = v.object({
  platform: v.string(),
  url: v.string(),
});

const headhuntingPreferencesValidator = v.object({
  confidentiality: v.union(v.literal("anonymous"), v.literal("scouts_only"), v.literal("open")),
  targetRoles: v.optional(v.array(v.string())),
  targetFunctions: v.optional(v.array(v.string())),
  targetSeniority: v.optional(v.array(v.string())),
  minimumSalary: v.optional(v.number()),
  blacklistedCompanies: v.optional(v.array(v.string())),
  availability: v.union(v.literal("active"), v.literal("open"), v.literal("not_now")),
  consentTimestamp: v.number(),
});

const profileStatusValidator = v.union(v.literal("draft"), v.literal("complete"));

// --- Helpers ---

function computeCompletion(profile: Record<string, unknown>): number {
  let score = 0;
  if (profile.fullName && profile.email && profile.city) score += 10;
  if (profile.headline) score += 15;
  const skills = profile.skills as Array<unknown> | undefined;
  if (skills && skills.length > 0) score += 15;
  const experiences = profile.experiences as Array<unknown> | undefined;
  if (experiences && experiences.length > 0) score += 15;
  const education = profile.education as Array<unknown> | undefined;
  if (education && education.length > 0) score += 10;
  const bio = profile.bio as string | undefined;
  if (bio && bio.length >= 50) score += 10;
  if (profile.photo) score += 5;
  if (profile.linkedin) score += 5;
  if (profile.cvFileId) score += 5;
  return score;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateUniqueSlug(ctx: any, name: string): Promise<string> {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let slug = base;
  let counter = 2;
  while (true) {
    const existing = await ctx.db.query("professionalProfiles")
      .withIndex("by_slug", (q: any) => q.eq("slug", slug))
      .first();
    if (!existing) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

// --- Queries ---

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireUser(ctx);
    return await ctx.db
      .query("professionalProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    const profile = await ctx.db
      .query("professionalProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!profile) return null;
    if (role !== "admin" && profile.userId !== identity.subject) {
      // Other users only see public projection.
      if (!profile.isPublic) return null;
      const { email, phone, socialProfiles, cvFileId, cvFileName, emailNotifications, ...safeFields } = profile;
      return { ...safeFields, isPublic: true as const };
    }
    return profile;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("professionalProfiles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!profile) return null;
    // Strip sensitive data for private profiles
    if (!profile.isPublic) {
      const { email, phone, socialProfiles, cvFileId, cvFileName, emailNotifications, ...safeFields } = profile;
      return { ...safeFields, isPublic: false as const };
    }
    return profile;
  },
});

export const getPublicProfiles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("professionalProfiles")
      .withIndex("by_public", (q) =>
        q.eq("isPublic", true)
      )
      .collect();
  },
});

/** List all profiles with email notifications enabled (for cron digest jobs).
 *  Admin-only — exposes user emails which would be a privacy leak. */
export const listEmailEnabled = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("professionalProfiles").collect();
    return all.filter((p) => p.emailNotifications && p.email);
  },
});

export const getPhotoUrl = query({
  args: { photoId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.photoId);
  },
});

export const getCvUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.fileId);
  },
});

// --- Mutations ---

export const create = mutation({
  args: {
    userId: v.string(),
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    photo: v.optional(v.id("_storage")),
    photoUrl: v.optional(v.string()),
    headline: v.string(),
    bio: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.string(),
    division: v.optional(v.string()),
    district: v.optional(v.string()),
    willingToRelocate: v.boolean(),
    preferredLocations: v.optional(v.array(v.string())),
    openToRemote: v.boolean(),
    currentDesignation: v.optional(v.string()),
    currentOrganization: v.optional(v.string()),
    totalExperienceYears: v.optional(v.number()),
    experienceLevel: v.optional(v.string()),
    skills: v.array(profileSkillValidator),
    education: v.array(profileEducationValidator),
    certifications: v.array(profileCertificationValidator),
    experiences: v.array(profileExperienceValidator),
    languages: v.optional(v.array(profileLanguageValidator)),
    linkedin: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    socialProfiles: v.optional(v.array(profileSocialValidator)),
    cvFileId: v.optional(v.id("_storage")),
    cvFileName: v.optional(v.string()),
    isPublic: v.boolean(),
    isOpenToOpportunities: v.boolean(),
    emailNotifications: v.boolean(),
    headhuntingPreferences: v.optional(headhuntingPreferencesValidator),
    status: profileStatusValidator,
  },
  handler: async (ctx, args) => {
    // Verify authenticated user matches the userId

    // Check if user already has a profile
    const existingProfile = await ctx.db
      .query("professionalProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (existingProfile) {
      throw new Error("A profile already exists for this user");
    }

    const slug = await generateUniqueSlug(ctx, args.fullName);
    const now = Date.now();
    const completionPercentage = computeCompletion(args as unknown as Record<string, unknown>);

    return await ctx.db.insert("professionalProfiles", {
      ...args,
      slug,
      completionPercentage,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    userId: v.string(),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    photo: v.optional(v.id("_storage")),
    photoUrl: v.optional(v.string()),
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    division: v.optional(v.string()),
    district: v.optional(v.string()),
    willingToRelocate: v.optional(v.boolean()),
    preferredLocations: v.optional(v.array(v.string())),
    openToRemote: v.optional(v.boolean()),
    currentDesignation: v.optional(v.string()),
    currentOrganization: v.optional(v.string()),
    totalExperienceYears: v.optional(v.number()),
    experienceLevel: v.optional(v.string()),
    skills: v.optional(v.array(profileSkillValidator)),
    education: v.optional(v.array(profileEducationValidator)),
    certifications: v.optional(v.array(profileCertificationValidator)),
    experiences: v.optional(v.array(profileExperienceValidator)),
    languages: v.optional(v.array(profileLanguageValidator)),
    linkedin: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    socialProfiles: v.optional(v.array(profileSocialValidator)),
    cvFileId: v.optional(v.id("_storage")),
    cvFileName: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    isOpenToOpportunities: v.optional(v.boolean()),
    emailNotifications: v.optional(v.boolean()),
    headhuntingPreferences: v.optional(headhuntingPreferencesValidator),
    status: v.optional(profileStatusValidator),
  },
  handler: async (ctx, args) => {
    const { userId, ...fields } = args;

    // Verify authenticated user

    // Find profile by userId
    const profile = await ctx.db
      .query("professionalProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) {
      throw new Error("Profile not found");
    }

    // Build updates, skipping undefined fields
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    // If fullName changed, regenerate slug
    if (fields.fullName !== undefined) {
      updates.slug = await generateUniqueSlug(ctx, fields.fullName);
    }

    // Recompute completion with merged data
    const merged = { ...profile, ...updates };
    updates.completionPercentage = computeCompletion(merged as Record<string, unknown>);

    await ctx.db.patch(profile._id, updates);
  },
});

export const updatePhoto = mutation({
  args: {
    userId: v.string(),
    photoId: v.id("_storage"),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {

    const profile = await ctx.db
      .query("professionalProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!profile) {
      throw new Error("Profile not found");
    }

    const merged = { ...profile, photo: args.photoId };
    const completionPercentage = computeCompletion(merged as Record<string, unknown>);

    await ctx.db.patch(profile._id, {
      photo: args.photoId,
      photoUrl: args.photoUrl,
      completionPercentage,
      updatedAt: Date.now(),
    });
  },
});

export const uploadCV = mutation({
  args: {
    userId: v.string(),
    fileId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {

    const profile = await ctx.db
      .query("professionalProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!profile) {
      throw new Error("Profile not found");
    }

    const merged = { ...profile, cvFileId: args.fileId };
    const completionPercentage = computeCompletion(merged as Record<string, unknown>);

    await ctx.db.patch(profile._id, {
      cvFileId: args.fileId,
      cvFileName: args.fileName,
      completionPercentage,
      updatedAt: Date.now(),
    });
  },
});

export const togglePublic = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {

    const profile = await ctx.db
      .query("professionalProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      isPublic: !profile.isPublic,
      updatedAt: Date.now(),
    });
  },
});

export const toggleOpenToWork = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {

    const profile = await ctx.db
      .query("professionalProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      isOpenToOpportunities: !profile.isOpenToOpportunities,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {

    const profile = await ctx.db
      .query("professionalProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.delete(profile._id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    return await ctx.storage.generateUploadUrl();
  },
});
