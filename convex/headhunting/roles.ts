import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireOrgUser } from "../lib/orgGuard";
import { requireUser } from "../_lib/auth";

const benefitFieldValidator = v.optional(
  v.object({ enabled: v.boolean(), note: v.optional(v.string()) })
);

// --- Queries ---

export const getByRoleGroup = query({
  args: { roleGroupId: v.id("htRoleGroups") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("htRoles")
      .withIndex("by_roleGroup", (q) => q.eq("roleGroupId", args.roleGroupId))
      .collect();
  },
});

export const getByAssignment = query({
  args: { assignmentId: v.id("htHiringAssignments") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("htRoles")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("htRoles") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db.get(args.id);
  },
});

// --- Mutations ---

export const create = mutation({
  args: {
    roleGroupId: v.id("htRoleGroups"),
    assignmentId: v.id("htHiringAssignments"),
    roleTitle: v.string(),
    department: v.optional(v.string()),
    seniorityLevel: v.optional(v.string()),
    openings: v.number(),
    reportingTo: v.optional(v.string()),
    roleSummary: v.optional(v.string()),
    mustHaveCriteria: v.optional(v.string()),
    goodToHaveCriteria: v.optional(v.string()),
    roleNotes: v.optional(v.string()),
    // Override fields
    overriddenFields: v.optional(v.array(v.string())),
    ovWorkMode: v.optional(v.string()),
    ovWeeklyWorkingDays: v.optional(v.string()),
    ovShiftType: v.optional(v.string()),
    ovWorkingHours: v.optional(v.string()),
    ovJobLocation: v.optional(v.string()),
    ovTravelRequirement: v.optional(v.string()),
    ovRelocationSupport: v.optional(v.string()),
    ovMonthlySalaryRange: v.optional(v.string()),
    ovAnnualCtcRange: v.optional(v.string()),
    ovVariablePay: benefitFieldValidator,
    ovCashBenefits: benefitFieldValidator,
    ovTransportSupport: benefitFieldValidator,
    ovAccommodationSupport: benefitFieldValidator,
    ovMedicalCoverage: benefitFieldValidator,
    ovLifeAccidentProtection: benefitFieldValidator,
    ovRetirementBenefits: benefitFieldValidator,
    ovLeaveBenefits: benefitFieldValidator,
    ovLearningDevelopment: benefitFieldValidator,
    ovCareerGrowth: benefitFieldValidator,
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const now = Date.now();
    return await ctx.db.insert("htRoles", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("htRoles"),
    roleTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    seniorityLevel: v.optional(v.string()),
    openings: v.optional(v.number()),
    reportingTo: v.optional(v.string()),
    roleSummary: v.optional(v.string()),
    mustHaveCriteria: v.optional(v.string()),
    goodToHaveCriteria: v.optional(v.string()),
    roleNotes: v.optional(v.string()),
    // Override fields
    overriddenFields: v.optional(v.array(v.string())),
    ovWorkMode: v.optional(v.string()),
    ovWeeklyWorkingDays: v.optional(v.string()),
    ovShiftType: v.optional(v.string()),
    ovWorkingHours: v.optional(v.string()),
    ovJobLocation: v.optional(v.string()),
    ovTravelRequirement: v.optional(v.string()),
    ovRelocationSupport: v.optional(v.string()),
    ovMonthlySalaryRange: v.optional(v.string()),
    ovAnnualCtcRange: v.optional(v.string()),
    ovVariablePay: benefitFieldValidator,
    ovCashBenefits: benefitFieldValidator,
    ovTransportSupport: benefitFieldValidator,
    ovAccommodationSupport: benefitFieldValidator,
    ovMedicalCoverage: benefitFieldValidator,
    ovLifeAccidentProtection: benefitFieldValidator,
    ovRetirementBenefits: benefitFieldValidator,
    ovLeaveBenefits: benefitFieldValidator,
    ovLearningDevelopment: benefitFieldValidator,
    ovCareerGrowth: benefitFieldValidator,
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Role not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// Clear a specific override (revert to group value)
export const clearOverride = mutation({
  args: {
    id: v.id("htRoles"),
    field: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const role = await ctx.db.get(args.id);
    if (!role) throw new Error("Role not found");

    const overriddenFields = (role.overriddenFields || []).filter((f) => f !== args.field);
    const updates: Record<string, unknown> = {
      overriddenFields: overriddenFields.length > 0 ? overriddenFields : undefined,
      updatedAt: Date.now(),
    };
    // Clear the override field value
    const ovField = `ov${args.field.charAt(0).toUpperCase()}${args.field.slice(1)}`;
    updates[ovField] = undefined;
    await ctx.db.patch(args.id, updates);
  },
});

export const moveToGroup = mutation({
  args: {
    id: v.id("htRoles"),
    newGroupId: v.id("htRoleGroups"),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const role = await ctx.db.get(args.id);
    if (!role) throw new Error("Role not found");

    const newGroup = await ctx.db.get(args.newGroupId);
    if (!newGroup) throw new Error("Target group not found");

    // Ensure same assignment
    if (role.assignmentId !== newGroup.assignmentId) {
      throw new Error("Cannot move role to a group in a different assignment");
    }

    await ctx.db.patch(args.id, {
      roleGroupId: args.newGroupId,
      updatedAt: Date.now(),
    });
  },
});

// Create a new group from an existing role (extracting it into its own group)
export const createGroupFromRole = mutation({
  args: {
    roleId: v.id("htRoles"),
    groupName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const role = await ctx.db.get(args.roleId);
    if (!role) throw new Error("Role not found");

    const sourceGroup = await ctx.db.get(role.roleGroupId);
    if (!sourceGroup) throw new Error("Source group not found");

    const now = Date.now();

    // Create new group with the source group's conditions (or role overrides if present)
    const { _id, _creationTime, createdAt, updatedAt, groupName, groupDescription, positionsInGroup, ...groupFields } = sourceGroup;
    const newGroupId = await ctx.db.insert("htRoleGroups", {
      ...groupFields,
      groupName: args.groupName,
      groupDescription: undefined,
      positionsInGroup: role.openings,
      createdAt: now,
      updatedAt: now,
    });

    // Move the role to the new group and clear overrides
    await ctx.db.patch(args.roleId, {
      roleGroupId: newGroupId,
      overriddenFields: undefined,
      ovWorkMode: undefined,
      ovWeeklyWorkingDays: undefined,
      ovShiftType: undefined,
      ovWorkingHours: undefined,
      ovJobLocation: undefined,
      ovTravelRequirement: undefined,
      ovRelocationSupport: undefined,
      ovMonthlySalaryRange: undefined,
      ovAnnualCtcRange: undefined,
      ovVariablePay: undefined,
      ovCashBenefits: undefined,
      ovTransportSupport: undefined,
      ovAccommodationSupport: undefined,
      ovMedicalCoverage: undefined,
      ovLifeAccidentProtection: undefined,
      ovRetirementBenefits: undefined,
      ovLeaveBenefits: undefined,
      ovLearningDevelopment: undefined,
      ovCareerGrowth: undefined,
      updatedAt: now,
    });

    return newGroupId;
  },
});

export const remove = mutation({
  args: { id: v.id("htRoles") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Role not found");
    await ctx.db.delete(args.id);
  },
});
