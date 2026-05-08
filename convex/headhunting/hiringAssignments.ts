import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireOrgUser } from "../lib/orgGuard";
import { requireAdmin, requireSelf } from "../_lib/auth";

const assignmentStatusValidator = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("in_review"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("filled"),
  v.literal("closed")
);

// --- Queries ---

export const list = query({
  args: {
    clientId: v.optional(v.id("htClients")),
    status: v.optional(assignmentStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.clientId) {
      const assignments = await ctx.db
        .query("htHiringAssignments")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
        .order("desc")
        .collect();
      if (args.status) return assignments.filter((a) => a.status === args.status);
      return assignments;
    }
    if (args.status) {
      return await ctx.db
        .query("htHiringAssignments")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("htHiringAssignments").order("desc").collect();
  },
});

export const getById = query({
  args: { id: v.id("htHiringAssignments") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const assignment = await ctx.db.get(args.id);
    if (!assignment) return null;

    const client = await ctx.db.get(assignment.clientId);
    const roleGroups = await ctx.db
      .query("htRoleGroups")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.id))
      .collect();

    const roles = await ctx.db
      .query("htRoles")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.id))
      .collect();

    return {
      ...assignment,
      clientName: client?.companyName ?? "Unknown",
      roleGroups,
      roles,
    };
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.clerkId);
    return await ctx.db
      .query("htHiringAssignments")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .order("desc")
      .collect();
  },
});

// --- Mutations ---

export const create = mutation({
  args: {
    clientId: v.id("htClients"),
    clerkId: v.optional(v.string()),
    assignmentName: v.string(),
    hiringSupportType: v.string(),
    hiringScopeSummary: v.optional(v.string()),
    totalOpenings: v.number(),
    hiringEntity: v.optional(v.string()),
    confidentialityPreference: v.optional(v.string()),
    geography: v.optional(v.string()),
    urgencyLevel: v.optional(v.string()),
    targetJoiningTimeline: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const now = Date.now();
    return await ctx.db.insert("htHiringAssignments", {
      ...args,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("htHiringAssignments"),
    assignmentName: v.optional(v.string()),
    hiringSupportType: v.optional(v.string()),
    hiringScopeSummary: v.optional(v.string()),
    totalOpenings: v.optional(v.number()),
    hiringEntity: v.optional(v.string()),
    confidentialityPreference: v.optional(v.string()),
    geography: v.optional(v.string()),
    urgencyLevel: v.optional(v.string()),
    targetJoiningTimeline: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    status: v.optional(assignmentStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Assignment not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

export const submit = mutation({
  args: { id: v.id("htHiringAssignments") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const assignment = await ctx.db.get(args.id);
    if (!assignment) throw new Error("Assignment not found");
    if (assignment.status !== "draft") throw new Error("Only draft assignments can be submitted");
    await ctx.db.patch(args.id, { status: "submitted", updatedAt: Date.now() });
  },
});

export const deleteAssignment = mutation({
  args: { id: v.id("htHiringAssignments") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const assignment = await ctx.db.get(args.id);
    if (!assignment) throw new Error("Assignment not found");
    await ctx.db.delete(args.id);
  },
});

// List all with enriched data (for admin)
export const listAll = query({
  args: {
    status: v.optional(assignmentStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let assignments;
    if (args.status) {
      assignments = await ctx.db
        .query("htHiringAssignments")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      assignments = await ctx.db.query("htHiringAssignments").order("desc").collect();
    }

    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const client = await ctx.db.get(a.clientId) as { companyName?: string } | null;
        const roleGroups = await ctx.db
          .query("htRoleGroups")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
          .collect();
        const roles = await ctx.db
          .query("htRoles")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
          .collect();
        return {
          ...a,
          clientName: client?.companyName ?? "Unknown",
          groupCount: roleGroups.length,
          roleCount: roles.length,
          totalOpenings: roles.reduce((sum, r) => sum + r.openings, 0),
        };
      })
    );
    return enriched;
  },
});

// Convert assignment to mandate (bridge to existing pipeline)
export const convertToMandate = mutation({
  args: {
    id: v.id("htHiringAssignments"),
    urgency: v.optional(v.union(v.literal("standard"), v.literal("urgent"), v.literal("critical"))),
    mandateType: v.optional(v.union(v.literal("exclusive"), v.literal("non_exclusive"), v.literal("retainer"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const assignment = await ctx.db.get(args.id);
    if (!assignment) throw new Error("Assignment not found");
    if (assignment.mandateId) throw new Error("Assignment already linked to a mandate");

    const client = await ctx.db.get(assignment.clientId);
    if (!client) throw new Error("Client not found");

    // Get roles for description
    const roles = await ctx.db
      .query("htRoles")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.id))
      .collect();

    const rolesSummary = roles
      .map((r) => `${r.roleTitle} (${r.openings} opening${r.openings !== 1 ? "s" : ""})`)
      .join(", ");

    const now = Date.now();
    const mandateId = await ctx.db.insert("htMandates", {
      clientId: assignment.clientId,
      source: "web_form" as const,
      rawTitle: assignment.assignmentName,
      rawDescription: [
        assignment.hiringScopeSummary,
        `Roles: ${rolesSummary}`,
        assignment.geography && `Geography: ${assignment.geography}`,
        assignment.hiringEntity && `Entity: ${assignment.hiringEntity}`,
      ].filter(Boolean).join("\n"),
      rawNotes: assignment.internalNotes,
      urgency: args.urgency ?? "standard",
      mandateType: args.mandateType ?? "non_exclusive",
      status: "received",
      mandateSource: "llp_direct",
      commercialOwner: "llp",
      clientFacingBrand: "llp",
      approvalOwner: "llp_only",
      scoutPayoutBasis: "llp_direct_revenue",
      createdAt: now,
      updatedAt: now,
    });

    // Link assignment to mandate
    await ctx.db.patch(args.id, {
      mandateId,
      status: "active",
      updatedAt: now,
    });

    return mandateId;
  },
});
