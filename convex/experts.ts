import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireUser } from "./_lib/auth";

// Re-declare validators (can't import from schema)
const skillLevelValidator = v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4));

const skillValidator = v.object({
  name: v.string(),
  level: skillLevelValidator,
  evidence: v.string(),
  documentId: v.optional(v.id("_storage")),
  verifiedAt: v.optional(v.number()),
  verifiedBy: v.optional(v.string()),
});

const certificationValidator = v.object({
  name: v.string(),
  org: v.optional(v.string()),
  year: v.optional(v.string()),
  documentId: v.optional(v.id("_storage")),
});

const workModeValidator = v.union(v.literal("on-site"), v.literal("remote"), v.literal("hybrid"));

const expertExperienceValidator = v.object({
  title: v.string(),
  company: v.optional(v.string()),
  location: v.optional(v.string()),
  workMode: v.optional(workModeValidator),
  duration: v.optional(v.string()),
  scope: v.optional(v.string()),
  role: v.string(),
});

const socialProfileValidator = v.object({
  platform: v.string(),
  url: v.string(),
});

const sessionPreferencesValidator = v.object({
  lengths: v.array(v.number()),
  availabilityNotes: v.optional(v.string()),
});

const headhuntingValidator = v.object({
  optedIn: v.boolean(),
  cvId: v.optional(v.id("_storage")),
  ctcRange: v.optional(v.string()),
  preferredLocations: v.optional(v.array(v.string())),
  noticePeriod: v.optional(v.string()),
});

const educationValidator = v.object({
  degree: v.string(),
  institution: v.string(),
  fieldOfStudy: v.optional(v.string()),
  year: v.optional(v.string()),
});

const projectValidator = v.object({
  name: v.string(),
  client: v.optional(v.string()),
  description: v.optional(v.string()),
  duration: v.optional(v.string()),
  outcome: v.optional(v.string()),
});

const languageProficiencyValidator = v.union(
  v.literal("native"),
  v.literal("fluent"),
  v.literal("advanced"),
  v.literal("intermediate"),
  v.literal("basic")
);

const languageValidator = v.object({
  name: v.string(),
  proficiency: v.optional(languageProficiencyValidator),
});

const affiliationValidator = v.object({
  name: v.string(),
  role: v.optional(v.string()),
  since: v.optional(v.string()),
});

const companyValidator = v.object({
  name: v.string(),
  initials: v.string(),
  color: v.string(),
});

const statsValidator = v.object({
  rating: v.number(),
  reviewCount: v.number(),
  sessionCount: v.number(),
});

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived")
);

const availabilityStatusValidator = v.union(
  v.literal("available"),
  v.literal("busy"),
  v.literal("on_leave")
);

// --- Queries ---

// Admin-only: includes drafts/archived. Public uses `listPublished`.
export const list = query({
  args: {
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("experts")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("experts").order("desc").collect();
  },
});

// Public-by-design: published expert directory.
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const experts = await ctx.db
      .query("experts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    // Sort: featured first, then by displayOrder asc, then by rating desc
    experts.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) {
        return a.isFeatured ? -1 : 1;
      }
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return b.stats.rating - a.stats.rating;
    });

    return experts;
  },
});

// Public-by-design: published expert profile pages. Hide drafts.
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const expert = await ctx.db
      .query("experts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!expert) return null;
    if (expert.status !== "published") {
      // Allow self/admin to see their own draft
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;
      const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
      if (role !== "admin" && expert.clerkId !== identity.subject) return null;
    }
    return expert;
  },
});

export const getById = query({
  args: { id: v.id("experts") },
  handler: async (ctx, args) => {
    const expert = await ctx.db.get(args.id);
    if (!expert) return null;
    if (expert.status !== "published") {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;
      const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
      if (role !== "admin" && expert.clerkId !== identity.subject) return null;
    }
    return expert;
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    if (role !== "admin" && identity.subject !== args.clerkId) {
      throw new Error("Forbidden");
    }
    // Direct match via clerkId field
    const direct = await ctx.db
      .query("experts")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (direct) return direct;

    // Fallback: find via application link
    const application = await ctx.db
      .query("expertApplications")
      .withIndex("by_applicant", (q) => q.eq("applicantClerkId", args.clerkId))
      .order("desc")
      .first();
    if (application && application.status === "approved") {
      // Find expert linked to this application
      const experts = await ctx.db.query("experts").collect();
      return experts.find((e) => e.applicationId === application._id) ?? null;
    }
    return null;
  },
});

// Public-by-design: only return published experts.
export const getByIds = query({
  args: { ids: v.array(v.id("experts")) },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.ids.map((id) => ctx.db.get(id))
    );
    return results.filter((e) => e !== null && e.status === "published");
  },
});

// Public-by-design: photo URLs for published expert directory cards.
export const getPhotoUrl = query({
  args: { photoId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.photoId);
  },
});

// --- Mutations ---

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    designation: v.string(),
    organization: v.string(),
    city: v.string(),
    slug: v.string(),
    clerkId: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    socialProfiles: v.optional(v.array(socialProfileValidator)),
    bio: v.string(),
    photoId: v.optional(v.id("_storage")),
    profilePhotoUrl: v.optional(v.string()),
    initials: v.string(),
    sectors: v.array(v.string()),
    countriesWorked: v.array(v.string()),
    companiesWorked: v.array(companyValidator),
    skills: v.array(skillValidator),
    certifications: v.array(certificationValidator),
    education: v.optional(v.array(educationValidator)),
    projects: v.optional(v.array(projectValidator)),
    languages: v.optional(v.array(languageValidator)),
    affiliations: v.optional(v.array(affiliationValidator)),
    experiences: v.array(expertExperienceValidator),
    sessionPreferences: sessionPreferencesValidator,
    headhunting: headhuntingValidator,
    stats: statsValidator,
    keywords: v.optional(v.array(v.string())),
    availabilityStatus: availabilityStatusValidator,
    isFeatured: v.boolean(),
    displayOrder: v.number(),
    status: statusValidator,
    applicationId: v.optional(v.id("expertApplications")),
    // Scout fields
    scoutTier: v.optional(v.union(v.literal("standard"), v.literal("verified"), v.literal("premium"))),
    coverageLanes: v.optional(v.object({
      functions: v.array(v.string()),
      industries: v.array(v.string()),
      geographies: v.array(v.string()),
      roleLevels: v.array(v.string()),
    })),
    scoutStatus: v.optional(v.union(v.literal("pending"), v.literal("active"), v.literal("paused"), v.literal("suspended"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Validate slug uniqueness
    const existing = await ctx.db
      .query("experts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) {
      throw new Error(`An expert with slug "${args.slug}" already exists`);
    }

    return await ctx.db.insert("experts", {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("experts"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    designation: v.optional(v.string()),
    organization: v.optional(v.string()),
    city: v.optional(v.string()),
    slug: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    socialProfiles: v.optional(v.array(socialProfileValidator)),
    bio: v.optional(v.string()),
    photoId: v.optional(v.id("_storage")),
    profilePhotoUrl: v.optional(v.string()),
    initials: v.optional(v.string()),
    sectors: v.optional(v.array(v.string())),
    countriesWorked: v.optional(v.array(v.string())),
    companiesWorked: v.optional(v.array(companyValidator)),
    skills: v.optional(v.array(skillValidator)),
    certifications: v.optional(v.array(certificationValidator)),
    education: v.optional(v.array(educationValidator)),
    projects: v.optional(v.array(projectValidator)),
    languages: v.optional(v.array(languageValidator)),
    affiliations: v.optional(v.array(affiliationValidator)),
    experiences: v.optional(v.array(expertExperienceValidator)),
    sessionPreferences: v.optional(sessionPreferencesValidator),
    headhunting: v.optional(headhuntingValidator),
    stats: v.optional(statsValidator),
    keywords: v.optional(v.array(v.string())),
    availabilityStatus: v.optional(availabilityStatusValidator),
    isFeatured: v.optional(v.boolean()),
    displayOrder: v.optional(v.number()),
    status: v.optional(statusValidator),
    applicationId: v.optional(v.id("expertApplications")),
    // Scout fields
    scoutTier: v.optional(v.union(v.literal("standard"), v.literal("verified"), v.literal("premium"))),
    coverageLanes: v.optional(v.object({
      functions: v.array(v.string()),
      industries: v.array(v.string()),
      geographies: v.array(v.string()),
      roleLevels: v.array(v.string()),
    })),
    scoutStatus: v.optional(v.union(v.literal("pending"), v.literal("active"), v.literal("paused"), v.literal("suspended"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...fields } = args;

    // Validate slug uniqueness if slug is being changed
    if (fields.slug !== undefined) {
      const existing = await ctx.db
        .query("experts")
        .withIndex("by_slug", (q) => q.eq("slug", fields.slug!))
        .first();
      if (existing && existing._id !== id) {
        throw new Error(`An expert with slug "${fields.slug}" already exists`);
      }
    }

    // Remove undefined fields before patching
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("experts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const expert = await ctx.db.get(args.id);
    if (expert?.applicationId) {
      // Also delete the linked application so "Application Approved" doesn't persist
      const application = await ctx.db.get(expert.applicationId);
      if (application) {
        await ctx.db.delete(expert.applicationId);
      }
    }
    await ctx.db.delete(args.id);
  },
});

// Self-update: experts can edit their own profile (restricted fields)
export const selfUpdate = mutation({
  args: {
    id: v.id("experts"),
    clerkId: v.string(),
    email: v.optional(v.string()),
    designation: v.optional(v.string()),
    organization: v.optional(v.string()),
    city: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    socialProfiles: v.optional(v.array(socialProfileValidator)),
    bio: v.optional(v.string()),
    photoId: v.optional(v.id("_storage")),
    profilePhotoUrl: v.optional(v.string()),
    sectors: v.optional(v.array(v.string())),
    countriesWorked: v.optional(v.array(v.string())),
    companiesWorked: v.optional(v.array(companyValidator)),
    certifications: v.optional(v.array(certificationValidator)),
    education: v.optional(v.array(educationValidator)),
    projects: v.optional(v.array(projectValidator)),
    languages: v.optional(v.array(languageValidator)),
    affiliations: v.optional(v.array(affiliationValidator)),
    experiences: v.optional(v.array(expertExperienceValidator)),
    sessionPreferences: v.optional(sessionPreferencesValidator),
    headhunting: v.optional(headhuntingValidator),
    keywords: v.optional(v.array(v.string())),
    availabilityStatus: v.optional(availabilityStatusValidator),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    // Force clerkId arg to authenticated subject — never trust client.
    if (identity.subject !== args.clerkId) {
      throw new Error("Forbidden");
    }
    const expert = await ctx.db.get(args.id);
    if (!expert) {
      throw new Error("Expert not found");
    }

    // Verify ownership: direct clerkId match or via application link
    let isOwner = expert.clerkId === args.clerkId;
    if (!isOwner && expert.applicationId) {
      const application = await ctx.db.get(expert.applicationId);
      isOwner = application?.applicantClerkId === args.clerkId;
    }
    if (!isOwner) {
      throw new Error("You can only edit your own profile");
    }

    // Backfill clerkId if missing
    if (!expert.clerkId) {
      await ctx.db.patch(args.id, { clerkId: args.clerkId });
    }

    const { id, clerkId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(id, updates);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
