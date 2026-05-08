import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./_lib/auth";

// ══════════════════════════════════════════════════════════════════
// Launch Objectives (top of hierarchy — 3-5 max)
// ══════════════════════════════════════════════════════════════════

const CT_STATUS = v.union(
  v.literal("not_started"), v.literal("in_progress"), v.literal("awaiting_input"),
  v.literal("awaiting_review"), v.literal("blocked"), v.literal("completed"), v.literal("dropped"),
);

export const listObjectives = query({
  args: {},
  handler: async (ctx) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    return ctx.db.query("ctLaunchObjectives").collect();
  },
});

export const createObjective = mutation({
  args: {
    name: v.string(),
    successStatement: v.string(),
    executiveOwnerId: v.optional(v.string()),
    executiveOwnerName: v.optional(v.string()),
    targetPhase: v.string(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const existing = await ctx.db.query("ctLaunchObjectives").collect();
    if (existing.length >= 5) throw new Error("Maximum 5 launch objectives allowed");
    const now = Date.now();
    return ctx.db.insert("ctLaunchObjectives", {
      ...args,
      sortOrder: args.sortOrder ?? existing.length,
      status: "not_started",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateObjective = mutation({
  args: {
    id: v.id("ctLaunchObjectives"),
    name: v.optional(v.string()),
    successStatement: v.optional(v.string()),
    executiveOwnerId: v.optional(v.string()),
    executiveOwnerName: v.optional(v.string()),
    targetPhase: v.optional(v.string()),
    status: v.optional(CT_STATUS),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, v2] of Object.entries(fields)) if (v2 !== undefined) updates[k] = v2;
    await ctx.db.patch(id, updates);
  },
});

// ══════════════════════════════════════════════════════════════════
// Dependencies
// ══════════════════════════════════════════════════════════════════

export const listDependencies = query({
  args: { sourceId: v.optional(v.string()), escalationStatus: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    if (args.sourceId) {
      const all = await ctx.db.query("ctDependencies").collect();
      return all.filter(d => d.sourceId === args.sourceId);
    }
    if (args.escalationStatus) {
      return ctx.db.query("ctDependencies")
        .withIndex("by_escalation", q => q.eq("escalationStatus", args.escalationStatus as "none"))
        .collect();
    }
    return ctx.db.query("ctDependencies").collect();
  },
});

export const createDependency = mutation({
  args: {
    sourceType: v.union(v.literal("milestone"), v.literal("task")),
    sourceId: v.string(),
    sourceTitle: v.string(),
    dependsOnType: v.union(v.literal("milestone"), v.literal("task")),
    dependsOnId: v.string(),
    dependsOnTitle: v.string(),
    dependencyType: v.union(
      v.literal("internal_sequential"), v.literal("internal_parallel"),
      v.literal("approval"), v.literal("external"),
      v.literal("technical_blocker"), v.literal("legal_content_blocker"),
    ),
    blockerOwnerId: v.optional(v.string()),
    blockerOwnerName: v.optional(v.string()),
    unblockTargetDate: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const now = Date.now();
    return ctx.db.insert("ctDependencies", {
      ...args,
      escalationStatus: "none",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateDependency = mutation({
  args: {
    id: v.id("ctDependencies"),
    escalationStatus: v.optional(v.union(
      v.literal("none"), v.literal("flagged"), v.literal("escalated"), v.literal("resolved")
    )),
    unblockTargetDate: v.optional(v.number()),
    note: v.optional(v.string()),
    blockerOwnerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, v2] of Object.entries(fields)) if (v2 !== undefined) updates[k] = v2;
    if (fields.escalationStatus === "resolved") updates.resolvedAt = Date.now();
    await ctx.db.patch(id, updates);
  },
});

/**
 * LLP Control Tower — Management Operating Module
 * Founder-level dashboard with KPIs, milestones, tasks, and team management.
 */

// ══════════════════════════════════════════════════════════════════
// Workstreams
// ══════════════════════════════════════════════════════════════════

export const listWorkstreams = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    if (args.activeOnly) {
      return ctx.db.query("ctWorkstreams").withIndex("by_active", (q) => q.eq("isActive", true)).collect();
    }
    return ctx.db.query("ctWorkstreams").collect();
  },
});

export const createWorkstream = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const now = Date.now();
    return ctx.db.insert("ctWorkstreams", { ...args, isActive: true, createdAt: now, updatedAt: now });
  },
});

export const updateWorkstream = mutation({
  args: {
    id: v.id("ctWorkstreams"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    ownerId: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    color: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// ══════════════════════════════════════════════════════════════════
// KPIs
// ══════════════════════════════════════════════════════════════════

export const listKpis = query({
  args: { workstreamId: v.optional(v.id("ctWorkstreams")) },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    if (args.workstreamId) {
      return ctx.db.query("ctKpis").withIndex("by_workstream", (q) => q.eq("workstreamId", args.workstreamId!)).collect();
    }
    return ctx.db.query("ctKpis").collect();
  },
});

export const createKpi = mutation({
  args: {
    objectiveId: v.optional(v.id("ctLaunchObjectives")),
    workstreamId: v.id("ctWorkstreams"),
    title: v.string(),
    description: v.optional(v.string()),
    kpiType: v.optional(v.union(v.literal("readiness"), v.literal("outcome"))),
    metric: v.string(),
    targetValue: v.number(),
    actualValue: v.number(),
    unit: v.optional(v.string()),
    period: v.union(v.literal("weekly"), v.literal("monthly"), v.literal("quarterly")),
    cadence: v.optional(v.string()),
    sourceOfTruth: v.optional(v.string()),
    ownerId: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const now = Date.now();
    return ctx.db.insert("ctKpis", {
      ...args,
      kpiType: args.kpiType ?? "readiness",
      status: "not_started" as const,
      riskFlag: "on_track",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateKpi = mutation({
  args: {
    id: v.id("ctKpis"),
    title: v.optional(v.string()),
    targetValue: v.optional(v.number()),
    actualValue: v.optional(v.number()),
    trend: v.optional(v.union(v.literal("up"), v.literal("down"), v.literal("flat"))),
    riskFlag: v.optional(v.union(v.literal("on_track"), v.literal("at_risk"), v.literal("behind"), v.literal("critical"))),
    riskNote: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    status: v.optional(CT_STATUS),
    cadence: v.optional(v.string()),
    sourceOfTruth: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// ══════════════════════════════════════════════════════════════════
// Milestones
// ══════════════════════════════════════════════════════════════════

export const listMilestones = query({
  args: { workstreamId: v.optional(v.id("ctWorkstreams")), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    if (args.workstreamId) {
      const all = await ctx.db.query("ctMilestones").withIndex("by_workstream", (q) => q.eq("workstreamId", args.workstreamId!)).collect();
      return args.status ? all.filter((m) => m.status === args.status) : all;
    }
    if (args.status) {
      return ctx.db.query("ctMilestones").withIndex("by_status", (q) => q.eq("status", args.status as "not_started")).collect();
    }
    return ctx.db.query("ctMilestones").collect();
  },
});

export const createMilestone = mutation({
  args: {
    kpiId: v.id("ctKpis"),
    workstreamId: v.id("ctWorkstreams"),
    title: v.string(),
    description: v.optional(v.string()),
    ownerId: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    backupOwnerId: v.optional(v.string()),
    backupOwnerName: v.optional(v.string()),
    dueDate: v.number(),
    acceptanceCriteria: v.optional(v.string()),
    riskLevel: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    evidenceLink: v.optional(v.string()),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const now = Date.now();
    const { actorId, actorName, ...milestoneData } = args;
    const id = await ctx.db.insert("ctMilestones", {
      ...milestoneData, progressPercent: 0, status: "not_started", blockerFlag: false, createdAt: now, updatedAt: now,
    });
    if (actorId && actorName) {
      await ctx.db.insert("ctActivityLog", {
        actorId, actorName, action: "created", entityType: "milestone",
        entityId: id, entityTitle: args.title,
        workstreamId: args.workstreamId, kpiId: args.kpiId, timestamp: now,
      });
    }
    return id;
  },
});

export const updateMilestone = mutation({
  args: {
    id: v.id("ctMilestones"),
    title: v.optional(v.string()),
    progressPercent: v.optional(v.number()),
    status: v.optional(CT_STATUS),
    blockers: v.optional(v.array(v.string())),
    blockerFlag: v.optional(v.boolean()),
    dueDate: v.optional(v.number()),
    acceptanceCriteria: v.optional(v.string()),
    riskLevel: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    evidenceLink: v.optional(v.string()),
    lastUpdate: v.optional(v.string()),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const { id, actorId, actorName, detail, ...fields } = args;
    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    if (fields.status === "completed") updates.completedAt = now;
    const ms = await ctx.db.get(id);
    await ctx.db.patch(id, updates);
    // Log activity
    if (actorId && actorName && ms) {
      const action = fields.status === "completed" ? "completed" :
                     fields.status === "blocked" ? "blocked" :
                     fields.progressPercent !== undefined ? "progress_updated" : "updated";
      await ctx.db.insert("ctActivityLog", {
        actorId, actorName, action,
        entityType: "milestone",
        entityId: id,
        entityTitle: ms.title,
        workstreamId: ms.workstreamId,
        kpiId: ms.kpiId,
        milestoneId: id,
        detail: detail || (fields.status ? `status → ${fields.status}` : undefined),
        timestamp: now,
      });
    }
  },
});

export const addMilestoneComment = mutation({
  args: { id: v.id("ctMilestones"), author: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const ms = await ctx.db.get(args.id);
    if (!ms) throw new Error("Milestone not found");
    const comments = [...(ms.comments || []), { author: args.author, text: args.text, timestamp: Date.now() }];
    await ctx.db.patch(args.id, { comments, updatedAt: Date.now() });
  },
});

// ══════════════════════════════════════════════════════════════════
// Tasks
// ══════════════════════════════════════════════════════════════════

export const listTasks = query({
  args: {
    workstreamId: v.optional(v.id("ctWorkstreams")),
    milestoneId: v.optional(v.id("ctMilestones")),
    assigneeId: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    if (args.workstreamId) {
      const all = await ctx.db.query("ctTasks").withIndex("by_workstream", (q) => q.eq("workstreamId", args.workstreamId!)).collect();
      return args.status ? all.filter((t) => t.status === args.status) : all;
    }
    if (args.assigneeId) {
      return ctx.db.query("ctTasks").withIndex("by_assignee", (q) => q.eq("assigneeId", args.assigneeId!)).collect();
    }
    if (args.status) {
      return ctx.db.query("ctTasks").withIndex("by_status", (q) => q.eq("status", args.status as "not_started")).collect();
    }
    return ctx.db.query("ctTasks").collect();
  },
});

export const getOverdueTasks = query({
  args: {},
  handler: async (ctx) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const all = await ctx.db.query("ctTasks").collect();
    const now = Date.now();
    return all.filter((t) => t.dueDate && t.dueDate < now && t.status !== "completed");
  },
});

export const createTask = mutation({
  args: {
    milestoneId: v.id("ctMilestones"),
    workstreamId: v.id("ctWorkstreams"),
    kpiId: v.optional(v.id("ctKpis")),
    title: v.string(),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
    backupOwnerId: v.optional(v.string()),
    backupOwnerName: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    dueDate: v.optional(v.number()),
    evidenceOutput: v.optional(v.string()),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const now = Date.now();
    const { actorId, actorName, ...taskData } = args;
    // Auto-denormalize kpiId from milestone
    let kpiId = taskData.kpiId;
    if (!kpiId) {
      const ms = await ctx.db.get(taskData.milestoneId);
      kpiId = ms?.kpiId;
    }
    const id = await ctx.db.insert("ctTasks", {
      ...taskData, kpiId, status: "not_started", lastActivityAt: now, createdAt: now, updatedAt: now,
    });
    // Log activity
    if (actorId && actorName) {
      const milestone = await ctx.db.get(args.milestoneId);
      await ctx.db.insert("ctActivityLog", {
        actorId, actorName,
        action: "created",
        entityType: "task",
        entityId: id,
        entityTitle: args.title,
        workstreamId: args.workstreamId,
        milestoneId: args.milestoneId,
        kpiId: milestone?.kpiId,
        detail: args.assigneeName ? `assigned to ${args.assigneeName}` : undefined,
        timestamp: now,
      });
    }
    return id;
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("ctTasks"),
    title: v.optional(v.string()),
    status: v.optional(CT_STATUS),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"))),
    assigneeId: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
    backupOwnerName: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    evidenceOutput: v.optional(v.string()),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const { id, actorId, actorName, ...fields } = args;
    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now, lastActivityAt: now };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    if (fields.status === "completed") updates.completedAt = now;
    const task = await ctx.db.get(id);
    await ctx.db.patch(id, updates);
    // Log activity
    if (actorId && actorName && task) {
      const action = fields.status === "completed" ? "completed" :
                     fields.status === "blocked" ? "blocked" :
                     fields.status === "in_progress" ? "status_changed" :
                     fields.assigneeId ? "assigned" : "updated";
      const detail = fields.status ? `status: ${task.status} → ${fields.status}` :
                     fields.assigneeName ? `assigned to ${fields.assigneeName}` : undefined;
      await ctx.db.insert("ctActivityLog", {
        actorId, actorName, action,
        entityType: "task",
        entityId: id,
        entityTitle: task.title,
        workstreamId: task.workstreamId,
        milestoneId: task.milestoneId,
        detail,
        timestamp: now,
      });
    }
  },
});

// ══════════════════════════════════════════════════════════════════
// Team Members
// ══════════════════════════════════════════════════════════════════

export const listTeamMembers = query({
  args: { workstreamId: v.optional(v.id("ctWorkstreams")), activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    let members = await ctx.db.query("ctTeamMembers").collect();
    if (args.workstreamId) members = members.filter((m) => m.workstreamId === args.workstreamId);
    if (args.activeOnly) members = members.filter((m) => m.isActive);
    return members;
  },
});

export const upsertTeamMember = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    dashboardRole: v.union(v.literal("super_admin"), v.literal("workstream_owner"), v.literal("contributor"), v.literal("viewer")),
    workstreamId: v.optional(v.id("ctWorkstreams")),
    reportingTo: v.optional(v.string()),
    reportingToName: v.optional(v.string()),
    employmentType: v.optional(v.union(v.literal("full_time"), v.literal("part_time"), v.literal("contract"))),
    reminderPreference: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("none"))),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const existing = await ctx.db.query("ctTeamMembers").withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId)).first();
    const now = Date.now();
    if (existing) {
      const { clerkId: _, ...fields } = args;
      await ctx.db.patch(existing._id, { ...fields, updatedAt: now });
      return existing._id;
    }
    return ctx.db.insert("ctTeamMembers", { ...args, isActive: true, createdAt: now, updatedAt: now });
  },
});

export const updateTeamMember = mutation({
  args: {
    id: v.id("ctTeamMembers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    dashboardRole: v.optional(v.union(
      v.literal("super_admin"), v.literal("workstream_owner"),
      v.literal("contributor"), v.literal("viewer")
    )),
    workstreamId: v.optional(v.id("ctWorkstreams")),
    reportingTo: v.optional(v.string()),
    reportingToName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

export const deactivateTeamMember = mutation({
  args: { id: v.id("ctTeamMembers") },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { isActive: false, updatedAt: Date.now() });
  },
});

export const removeTeamMember = mutation({
  args: { id: v.id("ctTeamMembers") },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// ══════════════════════════════════════════════════════════════════
// Overview / Aggregation Queries
// ══════════════════════════════════════════════════════════════════

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const workstreams = await ctx.db.query("ctWorkstreams").withIndex("by_active", (q) => q.eq("isActive", true)).collect();
    const kpis = await ctx.db.query("ctKpis").collect();
    const milestones = await ctx.db.query("ctMilestones").collect();
    const tasks = await ctx.db.query("ctTasks").collect();
    const team = await ctx.db.query("ctTeamMembers").collect();

    const now = Date.now();
    const overdueMilestones = milestones.filter((m) => m.dueDate < now && m.status !== "completed");
    const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== "completed");
    const blockedTasks = tasks.filter((t) => t.status === "blocked");
    const criticalKpis = kpis.filter((k) => k.riskFlag === "critical" || k.riskFlag === "behind");

    // Stale tasks (no update in 7 days)
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const staleTasks = tasks.filter((t) => t.lastActivityAt < sevenDaysAgo && t.status !== "completed");

    return {
      workstreamCount: workstreams.length,
      kpiCount: kpis.length,
      milestoneCount: milestones.length,
      taskCount: tasks.length,
      teamCount: team.filter((t) => t.isActive).length,
      overdueMilestones: overdueMilestones.length,
      overdueTasks: overdueTasks.length,
      blockedTasks: blockedTasks.length,
      criticalKpis: criticalKpis.length,
      staleTasks: staleTasks.length,
      completedTasks: tasks.filter((t) => t.status === "completed").length,
      totalTasks: tasks.length,
      completedMilestones: milestones.filter((m) => m.status === "completed").length,
      totalMilestones: milestones.length,
    };
  },
});

// Seed initial 9 workstreams
export const seedWorkstreams = mutation({
  args: {},
  handler: async (ctx) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    const existing = await ctx.db.query("ctWorkstreams").collect();
    if (existing.length > 0) return { message: "Already seeded" };

    const now = Date.now();
    const workstreams = [
      { name: "Launch Readiness", color: "#ef4444" },
      { name: "Website / Product", color: "#f97316" },
      { name: "AI Search", color: "#eab308" },
      { name: "Headhunting / Scout Network", color: "#22c55e" },
      { name: "Collaboration Partners", color: "#06b6d4" },
      { name: "Training Academy", color: "#3b82f6" },
      { name: "Services Desk", color: "#8b5cf6" },
      { name: "Marketing / Lead Gen", color: "#ec4899" },
      { name: "Finance / Admin / Compliance", color: "#6b7280" },
    ];

    for (let i = 0; i < workstreams.length; i++) {
      await ctx.db.insert("ctWorkstreams", {
        name: workstreams[i].name,
        color: workstreams[i].color,
        sortOrder: i,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { message: `Seeded ${workstreams.length} workstreams` };
  },
});

// ══════════════════════════════════════════════════════════════════
// Email Notifications (via Next.js API — centralized email sending)
// ══════════════════════════════════════════════════════════════════

export const sendTaskAssignmentEmail = action({
  args: {
    assigneeName: v.string(),
    assigneeEmail: v.string(),
    taskTitle: v.string(),
    workstreamName: v.string(),
    priority: v.string(),
    dueDate: v.optional(v.number()),
    assignedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK — action ctx has no db; rely on Clerk publicMetadata role
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    if (role !== "admin") throw new ConvexError("Forbidden");
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://laborlawpartner.com";

    const res = await fetch(`${APP_URL}/api/control-tower/notify-assignment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assigneeName: args.assigneeName,
        assigneeEmail: args.assigneeEmail,
        taskTitle: args.taskTitle,
        workstreamName: args.workstreamName,
        priority: args.priority,
        dueDate: args.dueDate,
      }),
    });

    const data = await res.json() as Record<string, unknown>;
    return { ok: data.ok, id: data.id, error: data.error };
  },
});

// ══════════════════════════════════════════════════════════════════
// Activity Log
// ══════════════════════════════════════════════════════════════════

export const listActivityLog = query({
  args: {
    actorId: v.optional(v.string()),
    workstreamId: v.optional(v.id("ctWorkstreams")),
    entityType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // CT-AUTH-OK
    await requireAdmin(ctx);
    let logs;
    if (args.actorId) {
      logs = await ctx.db.query("ctActivityLog").withIndex("by_actor", q => q.eq("actorId", args.actorId!)).order("desc").take(args.limit ?? 100);
    } else if (args.workstreamId) {
      logs = await ctx.db.query("ctActivityLog").withIndex("by_workstream", q => q.eq("workstreamId", args.workstreamId!)).order("desc").take(args.limit ?? 100);
    } else {
      logs = await ctx.db.query("ctActivityLog").withIndex("by_timestamp").order("desc").take(args.limit ?? 200);
    }
    if (args.entityType) logs = logs.filter(l => l.entityType === args.entityType);
    return logs;
  },
});
