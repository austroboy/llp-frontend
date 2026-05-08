import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireOrgUser } from "../lib/orgGuard";
import { requireUser } from "../_lib/auth";

const benefitFieldValidator = v.optional(
  v.object({ enabled: v.boolean(), note: v.optional(v.string()) })
);

// --- Queries ---

export const getByAssignment = query({
  args: { assignmentId: v.id("htHiringAssignments") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("htRoleGroups")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("htRoleGroups") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const group = await ctx.db.get(args.id);
    if (!group) return null;

    const roles = await ctx.db
      .query("htRoles")
      .withIndex("by_roleGroup", (q) => q.eq("roleGroupId", args.id))
      .collect();

    return { ...group, roles };
  },
});

// --- Mutations ---

export const create = mutation({
  args: {
    assignmentId: v.id("htHiringAssignments"),
    groupName: v.string(),
    groupDescription: v.optional(v.string()),
    positionsInGroup: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const now = Date.now();
    return await ctx.db.insert("htRoleGroups", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("htRoleGroups"),
    groupName: v.optional(v.string()),
    groupDescription: v.optional(v.string()),
    positionsInGroup: v.optional(v.number()),
    // Shared Hiring Conditions
    workMode: v.optional(v.string()),
    weeklyWorkingDays: v.optional(v.string()),
    shiftType: v.optional(v.string()),
    workingHours: v.optional(v.string()),
    jobLocation: v.optional(v.string()),
    travelRequirement: v.optional(v.string()),
    relocationSupport: v.optional(v.string()),
    // Shared Compensation
    monthlySalaryRange: v.optional(v.string()),
    annualCtcRange: v.optional(v.string()),
    variablePay: benefitFieldValidator,
    // Allowances
    cashBenefits: benefitFieldValidator,
    transportSupport: benefitFieldValidator,
    accommodationSupport: benefitFieldValidator,
    // Coverage
    medicalCoverage: benefitFieldValidator,
    lifeAccidentProtection: benefitFieldValidator,
    retirementBenefits: benefitFieldValidator,
    // Others
    leaveBenefits: benefitFieldValidator,
    learningDevelopment: benefitFieldValidator,
    careerGrowth: benefitFieldValidator,
    otherBenefits: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Role group not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

export const duplicate = mutation({
  args: { id: v.id("htRoleGroups") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const group = await ctx.db.get(args.id);
    if (!group) throw new Error("Role group not found");

    const now = Date.now();
    const { _id, _creationTime, createdAt, updatedAt, ...fields } = group;
    const newGroupId = await ctx.db.insert("htRoleGroups", {
      ...fields,
      groupName: `${fields.groupName} (copy)`,
      createdAt: now,
      updatedAt: now,
    });

    // Duplicate all roles in the group
    const roles = await ctx.db
      .query("htRoles")
      .withIndex("by_roleGroup", (q) => q.eq("roleGroupId", args.id))
      .collect();

    for (const role of roles) {
      const { _id: _rid, _creationTime: _rc, createdAt: _rca, updatedAt: _rua, ...roleFields } = role;
      await ctx.db.insert("htRoles", {
        ...roleFields,
        roleGroupId: newGroupId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return newGroupId;
  },
});

export const addAttachment = mutation({
  args: {
    id: v.id("htRoleGroups"),
    field: v.union(
      v.literal("jdFileId"),
      v.literal("rjpFileId"),
      v.literal("compensationSheetFileId"),
      v.literal("orgChartFileId")
    ),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const group = await ctx.db.get(args.id);
    if (!group) throw new Error("Role group not found");
    await ctx.db.patch(args.id, { [args.field]: args.storageId, updatedAt: Date.now() });
  },
});

export const setOtherDocs = mutation({
  args: {
    id: v.id("htRoleGroups"),
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const group = await ctx.db.get(args.id);
    if (!group) throw new Error("Role group not found");
    await ctx.db.patch(args.id, { otherDocFileIds: args.storageIds, updatedAt: Date.now() });
  },
});

export const removeAttachment = mutation({
  args: {
    id: v.id("htRoleGroups"),
    field: v.union(
      v.literal("jdFileId"),
      v.literal("rjpFileId"),
      v.literal("compensationSheetFileId"),
      v.literal("orgChartFileId")
    ),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const group = await ctx.db.get(args.id);
    if (!group) throw new Error("Role group not found");
    await ctx.db.patch(args.id, { [args.field]: undefined, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("htRoleGroups") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const group = await ctx.db.get(args.id);
    if (!group) throw new Error("Role group not found");

    // Delete all roles in the group first
    const roles = await ctx.db
      .query("htRoles")
      .withIndex("by_roleGroup", (q) => q.eq("roleGroupId", args.id))
      .collect();

    for (const role of roles) {
      await ctx.db.delete(role._id);
    }

    await ctx.db.delete(args.id);
  },
});
