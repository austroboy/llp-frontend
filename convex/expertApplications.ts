import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { blockOrgUser } from "./lib/orgGuard";
import { requireUser, requireAdmin, requireAdminOrSelf } from "./_lib/auth";

// Re-declare validators matching schema (can't import from schema)
const skillLevelValidator = v.union(
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4)
);

const applicationSkillValidator = v.object({
  name: v.string(),
  level: skillLevelValidator,
  evidence: v.string(),
  documentId: v.optional(v.id("_storage")),
});

const certificationValidator = v.object({
  name: v.string(),
  org: v.optional(v.string()),
  year: v.optional(v.string()),
  documentId: v.optional(v.id("_storage")),
});

const workModeValidator = v.union(v.literal("on-site"), v.literal("remote"), v.literal("hybrid"));

const applicationExperienceValidator = v.object({
  title: v.optional(v.string()),
  company: v.optional(v.string()),
  location: v.optional(v.string()),
  workMode: v.optional(workModeValidator),
  duration: v.optional(v.string()),
  scope: v.optional(v.string()),
  role: v.optional(v.string()),
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

const consentValidator = v.object({
  accuracy: v.boolean(),
  profileCreation: v.boolean(),
  marketing: v.boolean(),
});

const applicationStatusValidator = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("approved"),
  v.literal("rejected")
);

// Skill override validator (admin can adjust levels during approval)
const skillOverrideValidator = v.object({
  name: v.string(),
  level: skillLevelValidator,
  evidence: v.string(),
  documentId: v.optional(v.id("_storage")),
});

// --- Queries ---

export const list = query({
  args: {
    status: v.optional(applicationStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("expertApplications")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("expertApplications")
      .order("desc")
      .collect();
  },
});

export const getByApplicant = query({
  args: { applicantClerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminOrSelf(ctx, args.applicantClerkId);
    return await ctx.db
      .query("expertApplications")
      .withIndex("by_applicant", (q) =>
        q.eq("applicantClerkId", args.applicantClerkId)
      )
      .order("desc")
      .first();
  },
});

export const getById = query({
  args: { id: v.id("expertApplications") },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    // Owner OR admin — non-admin must be the applicant.
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    if (role !== "admin" && doc.applicantClerkId !== identity.subject) {
      const member = await ctx.db
        .query("ctTeamMembers")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .first();
      if (!(member?.dashboardRole === "super_admin" && member.isActive)) {
        throw new Error("Forbidden");
      }
    }
    return doc;
  },
});

export const listForApprovals = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Fetch all applications
    const all = await ctx.db
      .query("expertApplications")
      .order("desc")
      .collect();

    // Exclude drafts — they haven't been submitted
    const nonDraft = all.filter((app) => app.status !== "draft");

    // Filter by approval status if provided
    if (!args.status) return nonDraft;

    if (args.status === "pending") {
      // "pending" maps to both submitted and under_review
      return nonDraft.filter(
        (app) => app.status === "submitted" || app.status === "under_review"
      );
    }

    // approved, rejected map 1:1
    return nonDraft.filter((app) => app.status === args.status);
  },
});

export const getPendingCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const submitted = await ctx.db
      .query("expertApplications")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
    const underReview = await ctx.db
      .query("expertApplications")
      .withIndex("by_status", (q) => q.eq("status", "under_review"))
      .collect();
    return submitted.length + underReview.length;
  },
});

// --- Mutations ---

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    designation: v.optional(v.string()),
    organization: v.optional(v.string()),
    city: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    bio: v.optional(v.string()),
    profilePhotoUrl: v.optional(v.string()),
    sectors: v.array(v.string()),
    skills: v.array(applicationSkillValidator),
    certifications: v.array(certificationValidator),
    education: v.optional(v.array(educationValidator)),
    projects: v.optional(v.array(projectValidator)),
    languages: v.optional(v.array(languageValidator)),
    affiliations: v.optional(v.array(affiliationValidator)),
    experiences: v.array(applicationExperienceValidator),
    sessionPreferences: v.optional(sessionPreferencesValidator),
    headhunting: v.optional(headhuntingValidator),
    consent: consentValidator,
    status: v.union(v.literal("draft"), v.literal("submitted")),
    applicantClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await blockOrgUser(ctx);
    return await ctx.db.insert("expertApplications", {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("expertApplications"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    designation: v.optional(v.string()),
    organization: v.optional(v.string()),
    city: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    bio: v.optional(v.string()),
    profilePhotoUrl: v.optional(v.string()),
    sectors: v.optional(v.array(v.string())),
    skills: v.optional(v.array(applicationSkillValidator)),
    certifications: v.optional(v.array(certificationValidator)),
    education: v.optional(v.array(educationValidator)),
    projects: v.optional(v.array(projectValidator)),
    languages: v.optional(v.array(languageValidator)),
    affiliations: v.optional(v.array(affiliationValidator)),
    experiences: v.optional(v.array(applicationExperienceValidator)),
    sessionPreferences: v.optional(sessionPreferencesValidator),
    headhunting: v.optional(headhuntingValidator),
    consent: v.optional(consentValidator),
    status: v.optional(applicationStatusValidator),
    applicantClerkId: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await blockOrgUser(ctx);
    const { id, ...fields } = args;

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
  args: { id: v.id("expertApplications") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const approve = mutation({
  args: {
    id: v.id("expertApplications"),
    reviewedBy: v.string(),
    reviewNotes: v.optional(v.string()),
    skillOverrides: v.optional(v.array(skillOverrideValidator)),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const application = await ctx.db.get(args.id);
    if (!application) {
      throw new Error("Application not found");
    }
    if (application.status === "approved") {
      throw new Error("Application has already been approved");
    }

    // Generate slug from name
    const baseSlug = application.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Check slug uniqueness, append -2, -3 etc if needed
    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      const existing = await ctx.db
        .query("experts")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    // Generate initials from name (first letter of first two words, uppercase)
    const nameParts = application.name.trim().split(/\s+/);
    const initials =
      nameParts.length >= 2
        ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
        : (nameParts[0][0] + (nameParts[0][1] || "")).toUpperCase();

    // Use skillOverrides if provided, otherwise copy from application
    const sourceSkills = args.skillOverrides ?? application.skills;
    const now = Date.now();
    const verifiedSkills = sourceSkills.map((skill) => ({
      name: skill.name,
      level: skill.level,
      evidence: skill.evidence,
      documentId: skill.documentId,
      verifiedAt: now,
      verifiedBy: args.reviewedBy,
    }));

    // Convert application experiences to expert experiences (required fields)
    const experiences = application.experiences.map((exp) => ({
      title: exp.title || "Untitled",
      company: exp.company,
      location: exp.location,
      workMode: exp.workMode,
      duration: exp.duration,
      scope: exp.scope,
      role: exp.role || "Unspecified",
    }));

    // Create expert profile
    const expertId = await ctx.db.insert("experts", {
      name: application.name,
      email: application.email,
      designation: application.designation || "Consultant",
      organization: application.organization || "Independent",
      city: application.city || "Dhaka",
      slug,
      clerkId: application.applicantClerkId,
      linkedin: application.linkedin,
      portfolio: application.portfolio,
      socialProfiles: application.socialProfiles,
      bio: application.bio || "",
      photoId: undefined,
      profilePhotoUrl: application.profilePhotoUrl,
      initials,
      sectors: application.sectors,
      countriesWorked: [],
      companiesWorked: [],
      skills: verifiedSkills,
      certifications: application.certifications,
      education: application.education,
      projects: application.projects,
      languages: application.languages,
      affiliations: application.affiliations,
      experiences,
      sessionPreferences: application.sessionPreferences || {
        lengths: [30, 60],
      },
      headhunting: application.headhunting || { optedIn: false },
      stats: { rating: 0, reviewCount: 0, sessionCount: 0 },
      availabilityStatus: "available",
      isFeatured: false,
      displayOrder: 999,
      status: "draft",
      applicationId: args.id,
      updatedAt: now,
    });

    // Update application status
    await ctx.db.patch(args.id, {
      status: "approved",
      reviewedBy: args.reviewedBy,
      reviewedAt: now,
      reviewNotes: args.reviewNotes,
      updatedAt: now,
    });

    return expertId;
  },
});

export const reject = mutation({
  args: {
    id: v.id("expertApplications"),
    reviewedBy: v.string(),
    reviewNotes: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const application = await ctx.db.get(args.id);
    if (!application) {
      throw new Error("Application not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "rejected",
      reviewedBy: args.reviewedBy,
      reviewedAt: now,
      reviewNotes: args.reviewNotes,
      updatedAt: now,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStorageUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});
