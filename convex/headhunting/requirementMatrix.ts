import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../_lib/auth";

const categoryValidator = v.union(
  v.literal("technical"),
  v.literal("experience"),
  v.literal("education"),
  v.literal("soft_skill"),
  v.literal("cultural"),
  v.literal("commercial"),
  v.literal("other")
);

const priorityValidator = v.union(
  v.literal("must_have"),
  v.literal("strong_preference"),
  v.literal("nice_to_have")
);

const requirementValidator = v.object({
  id: v.string(),
  category: categoryValidator,
  label: v.string(),
  description: v.optional(v.string()),
  priority: priorityValidator,
  weight: v.number(),
  sourceField: v.optional(v.string()),
});

// --- Queries ---

export const getByMandate = query({
  args: { mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("htRequirementMatrix")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .first();
  },
});

export const getById = query({
  args: { id: v.id("htRequirementMatrix") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

// --- Mutations ---

export const create = mutation({
  args: {
    mandateId: v.id("htMandates"),
    requirements: v.array(requirementValidator),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const mandate = await ctx.db.get(args.mandateId);
    if (!mandate) throw new Error("Mandate not found");

    // Check if matrix already exists for this mandate
    const existing = await ctx.db
      .query("htRequirementMatrix")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .first();
    if (existing) throw new Error("Requirement matrix already exists for this mandate. Use update instead.");

    const now = Date.now();
    return await ctx.db.insert("htRequirementMatrix", {
      mandateId: args.mandateId,
      requirements: args.requirements,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("htRequirementMatrix"),
    requirements: v.array(requirementValidator),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Requirement matrix not found");

    await ctx.db.patch(args.id, {
      requirements: args.requirements,
      updatedBy: args.updatedBy,
      updatedAt: Date.now(),
    });
  },
});

export const addRequirement = mutation({
  args: {
    id: v.id("htRequirementMatrix"),
    requirement: requirementValidator,
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const matrix = await ctx.db.get(args.id);
    if (!matrix) throw new Error("Requirement matrix not found");

    // Ensure unique ID
    if (matrix.requirements.some((r) => r.id === args.requirement.id)) {
      throw new Error(`Requirement with ID ${args.requirement.id} already exists`);
    }

    await ctx.db.patch(args.id, {
      requirements: [...matrix.requirements, args.requirement],
      updatedBy: args.updatedBy,
      updatedAt: Date.now(),
    });
  },
});

export const removeRequirement = mutation({
  args: {
    id: v.id("htRequirementMatrix"),
    requirementId: v.string(),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const matrix = await ctx.db.get(args.id);
    if (!matrix) throw new Error("Requirement matrix not found");

    const filtered = matrix.requirements.filter((r) => r.id !== args.requirementId);
    if (filtered.length === matrix.requirements.length) {
      throw new Error(`Requirement ${args.requirementId} not found`);
    }

    await ctx.db.patch(args.id, {
      requirements: filtered,
      updatedBy: args.updatedBy,
      updatedAt: Date.now(),
    });
  },
});

export const updateRequirement = mutation({
  args: {
    id: v.id("htRequirementMatrix"),
    requirementId: v.string(),
    updates: v.object({
      category: v.optional(categoryValidator),
      label: v.optional(v.string()),
      description: v.optional(v.string()),
      priority: v.optional(priorityValidator),
      weight: v.optional(v.number()),
    }),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const matrix = await ctx.db.get(args.id);
    if (!matrix) throw new Error("Requirement matrix not found");

    const idx = matrix.requirements.findIndex((r) => r.id === args.requirementId);
    if (idx === -1) throw new Error(`Requirement ${args.requirementId} not found`);

    const updated = [...matrix.requirements];
    const current = updated[idx];
    updated[idx] = {
      ...current,
      ...(args.updates.category !== undefined && { category: args.updates.category }),
      ...(args.updates.label !== undefined && { label: args.updates.label }),
      ...(args.updates.description !== undefined && { description: args.updates.description }),
      ...(args.updates.priority !== undefined && { priority: args.updates.priority }),
      ...(args.updates.weight !== undefined && { weight: args.updates.weight }),
    };

    await ctx.db.patch(args.id, {
      requirements: updated,
      updatedBy: args.updatedBy,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("htRequirementMatrix") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const matrix = await ctx.db.get(args.id);
    if (!matrix) throw new Error("Requirement matrix not found");

    // Check if any assessments exist
    const assessments = await ctx.db
      .query("htCandidateAssessments")
      .withIndex("by_matrix", (q) => q.eq("matrixId", args.id))
      .first();
    if (assessments) {
      throw new Error("Cannot delete matrix with existing assessments. Remove assessments first.");
    }

    await ctx.db.delete(args.id);
  },
});

// --- Generate from Blueprint ---

export const generateFromBlueprint = mutation({
  args: {
    mandateId: v.id("htMandates"),
    blueprintId: v.id("htRoleBlueprints"),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const mandate = await ctx.db.get(args.mandateId);
    if (!mandate) throw new Error("Mandate not found");

    const blueprint = await ctx.db.get(args.blueprintId);
    if (!blueprint) throw new Error("Blueprint not found");
    if (blueprint.mandateId !== args.mandateId) {
      throw new Error("Blueprint does not belong to this mandate");
    }

    // Check if matrix already exists
    const existing = await ctx.db
      .query("htRequirementMatrix")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .first();
    if (existing) throw new Error("Requirement matrix already exists. Delete it first or use update.");

    let counter = 1;
    const nextId = () => {
      const id = `REQ-${String(counter).padStart(3, "0")}`;
      counter++;
      return id;
    };

    const requirements: Array<{
      id: string;
      category: "technical" | "experience" | "education" | "soft_skill" | "cultural" | "commercial" | "other";
      label: string;
      description?: string;
      priority: "must_have" | "strong_preference" | "nice_to_have";
      weight: number;
      sourceField?: string;
    }> = [];

    // Must-haves → must_have priority, weight 8-10
    for (const item of blueprint.mustHaves) {
      requirements.push({
        id: nextId(),
        category: "experience",
        label: item,
        priority: "must_have",
        weight: 10,
        sourceField: "mustHaves",
      });
    }

    // Critical match points → must_have priority, weight 7-9
    for (const item of blueprint.criticalMatchPoints) {
      requirements.push({
        id: nextId(),
        category: "experience",
        label: item,
        priority: "must_have",
        weight: 8,
        sourceField: "criticalMatchPoints",
      });
    }

    // Deal breakers → must_have, weight 10 (negative screening)
    if (blueprint.dealBreakers) {
      for (const item of blueprint.dealBreakers) {
        requirements.push({
          id: nextId(),
          category: "other",
          label: `No: ${item}`,
          description: "Deal breaker — candidate must NOT have this",
          priority: "must_have",
          weight: 10,
          sourceField: "dealBreakers",
        });
      }
    }

    // General match points → nice_to_have, weight 4-5
    if (blueprint.generalMatchPoints) {
      for (const item of blueprint.generalMatchPoints) {
        requirements.push({
          id: nextId(),
          category: "experience",
          label: item,
          priority: "nice_to_have",
          weight: 5,
          sourceField: "generalMatchPoints",
        });
      }
    }

    // Seniority → experience category
    if (blueprint.seniority) {
      requirements.push({
        id: nextId(),
        category: "experience",
        label: `Seniority: ${blueprint.seniority}`,
        priority: "strong_preference",
        weight: 7,
        sourceField: "seniority",
      });
    }

    // Location
    if (blueprint.location) {
      requirements.push({
        id: nextId(),
        category: "other",
        label: `Location: ${blueprint.location}`,
        priority: "strong_preference",
        weight: 6,
        sourceField: "location",
      });
    }

    // Industry
    if (blueprint.industry) {
      requirements.push({
        id: nextId(),
        category: "experience",
        label: `Industry: ${blueprint.industry}`,
        priority: "strong_preference",
        weight: 7,
        sourceField: "industry",
      });
    }

    // Target sectors → nice_to_have
    if (blueprint.targetSectors) {
      for (const sector of blueprint.targetSectors) {
        requirements.push({
          id: nextId(),
          category: "experience",
          label: `Sector experience: ${sector}`,
          priority: "nice_to_have",
          weight: 4,
          sourceField: "targetSectors",
        });
      }
    }

    // Preferred attributes → nice_to_have
    if (blueprint.preferredAttributes) {
      for (const attr of blueprint.preferredAttributes) {
        requirements.push({
          id: nextId(),
          category: "soft_skill",
          label: attr,
          priority: "nice_to_have",
          weight: 4,
          sourceField: "preferredAttributes",
        });
      }
    }

    const now = Date.now();
    return await ctx.db.insert("htRequirementMatrix", {
      mandateId: args.mandateId,
      requirements,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});
