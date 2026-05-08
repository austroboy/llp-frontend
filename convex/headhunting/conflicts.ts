import { query, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { requireOrgUser } from "../lib/orgGuard";

// ─── Helpers ────────────────────────────────────────────────────

function normalizeCompanyName(name: string): string {
  return name.toLowerCase().trim();
}

const conflictTypeValidator = v.union(
  v.literal("current_employer"),
  v.literal("recent_employer"),
  v.literal("declared_conflict"),
  v.literal("manual_exclusion"),
  v.literal("group_company")
);

// ─── Queries ────────────────────────────────────────────────────

/**
 * List all conflict records for a scout.
 * By default returns active only; pass includeInactive=true for all.
 */
export const listByScout = query({
  args: {
    scoutClerkId: v.string(),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.includeInactive) {
      return await ctx.db
        .query("htConflictRecords")
        .withIndex("by_scout", (q) => q.eq("scoutClerkId", args.scoutClerkId))
        .collect();
    }
    return await ctx.db
      .query("htConflictRecords")
      .withIndex("by_scout_active", (q) =>
        q.eq("scoutClerkId", args.scoutClerkId).eq("isActive", true)
      )
      .collect();
  },
});

/**
 * List all scouts conflicted with a given company name.
 * Normalizes the company name for matching.
 */
export const listByCompany = query({
  args: { companyName: v.string() },
  handler: async (ctx, args) => {
    const normalized = normalizeCompanyName(args.companyName);
    return await ctx.db
      .query("htConflictRecords")
      .withIndex("by_company", (q) =>
        q.eq("companyNameNormalized", normalized)
      )
      .collect();
  },
});

/**
 * THE KEY FUNCTION: Check whether each scout in a list has a conflict
 * with the client company behind a blueprint.
 *
 * Resolution chain: blueprint -> mandate -> client -> companyName
 *
 * For recent_employer conflicts: checks if cooling period has expired.
 * coolingPeriod = endDate + (coolingPeriodMonths * 30 * 24 * 60 * 60 * 1000)
 */
export const checkScoutsForBlueprint = query({
  args: {
    blueprintId: v.id("htRoleBlueprints"),
    scoutClerkIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Step 1: Resolve client company name through the chain
    const blueprint = await ctx.db.get(args.blueprintId);
    if (!blueprint) {
      throw new ConvexError("Blueprint not found");
    }

    const mandate = await ctx.db.get(blueprint.mandateId);
    if (!mandate) {
      throw new ConvexError("Mandate not found for this blueprint");
    }

    const client = await ctx.db.get(mandate.clientId);
    if (!client) {
      throw new ConvexError("Client not found for this mandate");
    }

    const clientCompanyNormalized = normalizeCompanyName(client.companyName);
    const now = Date.now();

    // Step 2: Check each scout (Phase A hard blocks + Phase B soft blocks)
    const results: {
      scoutClerkId: string;
      status: "clear" | "blocked";
      blockType?: "hard" | "soft";
      conflictType?: string;
      reason?: string;
    }[] = [];

    for (const scoutClerkId of args.scoutClerkIds) {
      // Get all active conflict records for this scout
      const conflicts = await ctx.db
        .query("htConflictRecords")
        .withIndex("by_scout_active", (q) =>
          q.eq("scoutClerkId", scoutClerkId).eq("isActive", true)
        )
        .collect();

      let hardBlocked = false;
      let softBlocked = false;
      let blockingType: string | undefined;
      let blockingReason: string | undefined;
      let blockType: "hard" | "soft" | undefined;

      for (const conflict of conflicts) {
        // Check if this conflict matches the client company
        if (conflict.companyNameNormalized !== clientCompanyNormalized) {
          continue;
        }

        // ── Phase B: Group company conflicts = soft block ──
        if (conflict.conflictType === "group_company") {
          if (!softBlocked) {
            softBlocked = true;
            blockingType = conflict.conflictType;
            blockingReason = `Group company conflict with ${conflict.companyName}. Admin override available.`;
            blockType = "soft";
          }
          // Don't break — a hard block may follow and takes precedence
          continue;
        }

        // ── Phase A: Hard blocks ──
        // For recent_employer: check if cooling period has expired
        if (conflict.conflictType === "recent_employer") {
          if (conflict.endDate) {
            const coolingMs =
              conflict.coolingPeriodMonths * 30 * 24 * 60 * 60 * 1000;
            const coolingExpiry = conflict.endDate + coolingMs;
            if (coolingExpiry <= now) {
              // Cooling period has expired — this conflict no longer blocks
              continue;
            }
            hardBlocked = true;
            blockingType = conflict.conflictType;
            const expiryDate = new Date(coolingExpiry).toLocaleDateString(
              "en-US",
              { year: "numeric", month: "short", day: "numeric" }
            );
            blockingReason = `Recent employer conflict with ${conflict.companyName}. Cooling period expires ${expiryDate}.`;
            blockType = "hard";
          } else {
            // No end date — treat as still active
            hardBlocked = true;
            blockingType = conflict.conflictType;
            blockingReason = `Recent employer conflict with ${conflict.companyName}. No end date recorded — cooling period cannot be verified.`;
            blockType = "hard";
          }
          break;
        }

        // All other hard block types: blocked if active
        hardBlocked = true;
        blockingType = conflict.conflictType;
        const typeLabel =
          conflict.conflictType === "current_employer"
            ? "Currently employed at"
            : conflict.conflictType === "declared_conflict"
              ? "Self-declared conflict with"
              : "Manual exclusion for";
        blockingReason = `${typeLabel} ${conflict.companyName}.`;
        blockType = "hard";
        break;
      }

      // Hard block takes precedence over soft block
      const isBlocked = hardBlocked || softBlocked;

      results.push(
        isBlocked
          ? {
              scoutClerkId,
              status: "blocked",
              blockType: hardBlocked ? "hard" : "soft",
              conflictType: blockingType,
              reason: blockingReason,
            }
          : { scoutClerkId, status: "clear" }
      );
    }

    return { results };
  },
});

// ─── Mutations ──────────────────────────────────────────────────

/**
 * Create a conflict record (admin action).
 */
export const create = mutation({
  args: {
    scoutClerkId: v.string(),
    companyName: v.string(),
    conflictType: conflictTypeValidator,
    coolingPeriodMonths: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrgUser(ctx);

    const now = Date.now();
    return await ctx.db.insert("htConflictRecords", {
      scoutClerkId: args.scoutClerkId,
      companyName: args.companyName,
      companyNameNormalized: normalizeCompanyName(args.companyName),
      conflictType: args.conflictType,
      coolingPeriodMonths: args.coolingPeriodMonths ?? 24,
      startDate: args.startDate,
      endDate: args.endDate,
      declaredBy: identity.subject,
      notes: args.notes,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a conflict record (admin action).
 */
export const update = mutation({
  args: {
    id: v.id("htConflictRecords"),
    companyName: v.optional(v.string()),
    conflictType: v.optional(conflictTypeValidator),
    coolingPeriodMonths: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Conflict record not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.companyName !== undefined) {
      updates.companyName = args.companyName;
      updates.companyNameNormalized = normalizeCompanyName(args.companyName);
    }
    if (args.conflictType !== undefined) updates.conflictType = args.conflictType;
    if (args.coolingPeriodMonths !== undefined)
      updates.coolingPeriodMonths = args.coolingPeriodMonths;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.endDate !== undefined) updates.endDate = args.endDate;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Deactivate a conflict record (soft delete).
 */
export const deactivate = mutation({
  args: { id: v.id("htConflictRecords") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Conflict record not found");

    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// ─── Phase B: Group Company Conflict Detection ────────────────

/**
 * Check if a scout has a group company conflict with a given company.
 * Returns a soft block result (admin can override).
 */
export const checkGroupCompanyConflict = query({
  args: {
    scoutClerkId: v.string(),
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    const normalized = normalizeCompanyName(args.companyName);

    // Look up all active group_company conflicts for this scout
    const conflicts = await ctx.db
      .query("htConflictRecords")
      .withIndex("by_scout_active", (q) =>
        q.eq("scoutClerkId", args.scoutClerkId).eq("isActive", true)
      )
      .collect();

    const groupCompanyConflicts = conflicts.filter(
      (c) =>
        c.conflictType === "group_company" &&
        c.companyNameNormalized === normalized
    );

    if (groupCompanyConflicts.length === 0) {
      return {
        hasConflict: false,
        blockType: null as "soft" | null,
        conflicts: [],
      };
    }

    return {
      hasConflict: true,
      blockType: "soft" as const,
      conflicts: groupCompanyConflicts.map((c) => ({
        _id: c._id,
        companyName: c.companyName,
        notes: c.notes,
        createdAt: c.createdAt,
      })),
    };
  },
});

/**
 * Store group company relationships.
 * When a conflict exists for company A, also flag scouts conflicted
 * with A's parent/sister companies.
 *
 * For each relatedCompany, creates a conflict record with type "group_company"
 * for every scout that has an active conflict with the original company.
 */
export const addGroupCompanyMapping = mutation({
  args: {
    companyName: v.string(),
    relatedCompanies: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrgUser(ctx);

    if (args.relatedCompanies.length === 0) {
      throw new ConvexError("Must provide at least one related company");
    }

    const primaryNormalized = normalizeCompanyName(args.companyName);
    const now = Date.now();

    // Find all scouts with any active conflict on the primary company
    const primaryConflicts = await ctx.db
      .query("htConflictRecords")
      .withIndex("by_company", (q) =>
        q.eq("companyNameNormalized", primaryNormalized)
      )
      .collect();

    const activeScoutIds = Array.from(
      new Set(
        primaryConflicts
          .filter((c) => c.isActive)
          .map((c) => c.scoutClerkId)
      )
    );

    let created = 0;

    // For each related company, create group_company conflicts for each affected scout
    for (const relatedCompany of args.relatedCompanies) {
      const relatedNormalized = normalizeCompanyName(relatedCompany);

      for (const scoutClerkId of activeScoutIds) {
        // Check if a group_company conflict already exists for this scout + related company
        const existing = await ctx.db
          .query("htConflictRecords")
          .withIndex("by_scout_active", (q) =>
            q.eq("scoutClerkId", scoutClerkId).eq("isActive", true)
          )
          .collect();

        const alreadyExists = existing.some(
          (c) =>
            c.companyNameNormalized === relatedNormalized &&
            c.conflictType === "group_company"
        );

        if (alreadyExists) continue;

        await ctx.db.insert("htConflictRecords", {
          scoutClerkId,
          companyName: relatedCompany,
          companyNameNormalized: relatedNormalized,
          conflictType: "group_company",
          coolingPeriodMonths: 0, // No cooling period for group company conflicts
          declaredBy: identity.subject,
          notes: `Group company mapping: related to ${args.companyName}`,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }

      // Also create reverse: for each scout conflicted with a related company,
      // add group_company conflict for the primary company
      const relatedConflicts = await ctx.db
        .query("htConflictRecords")
        .withIndex("by_company", (q) =>
          q.eq("companyNameNormalized", relatedNormalized)
        )
        .collect();

      const relatedActiveScoutIds = Array.from(
        new Set(
          relatedConflicts
            .filter((c) => c.isActive && c.conflictType !== "group_company")
            .map((c) => c.scoutClerkId)
        )
      );

      for (const scoutClerkId of relatedActiveScoutIds) {
        // Skip if already has a conflict with the primary company
        const existingPrimary = await ctx.db
          .query("htConflictRecords")
          .withIndex("by_scout_active", (q) =>
            q.eq("scoutClerkId", scoutClerkId).eq("isActive", true)
          )
          .collect();

        const alreadyHasPrimary = existingPrimary.some(
          (c) => c.companyNameNormalized === primaryNormalized
        );

        if (alreadyHasPrimary) continue;

        await ctx.db.insert("htConflictRecords", {
          scoutClerkId,
          companyName: args.companyName,
          companyNameNormalized: primaryNormalized,
          conflictType: "group_company",
          coolingPeriodMonths: 0,
          declaredBy: identity.subject,
          notes: `Group company mapping: related to ${relatedCompany}`,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    return { created, affectedScouts: activeScoutIds.length };
  },
});

/**
 * Self-declare a conflict (scout's own action).
 * Uses auth to identify the scout — no admin auth required.
 */
export const selfDeclare = mutation({
  args: {
    companyName: v.string(),
    conflictType: conflictTypeValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("You must be signed in to declare a conflict.");
    }

    const scoutClerkId = identity.subject;

    // Verify the scout has a profile
    const profile = await ctx.db
      .query("htScoutProfiles")
      .withIndex("by_clerk", (q) => q.eq("clerkId", scoutClerkId))
      .first();

    if (!profile) {
      throw new ConvexError(
        "Scout profile not found. You must have an approved scout profile to declare conflicts."
      );
    }

    // Check for existing active conflict with same company + type
    const existingConflicts = await ctx.db
      .query("htConflictRecords")
      .withIndex("by_scout_active", (q) =>
        q.eq("scoutClerkId", scoutClerkId).eq("isActive", true)
      )
      .collect();

    const normalized = normalizeCompanyName(args.companyName);
    const duplicate = existingConflicts.find(
      (c) =>
        c.companyNameNormalized === normalized &&
        c.conflictType === args.conflictType
    );

    if (duplicate) {
      throw new ConvexError(
        `You already have an active ${args.conflictType.replace(/_/g, " ")} conflict with "${args.companyName}".`
      );
    }

    const now = Date.now();
    return await ctx.db.insert("htConflictRecords", {
      scoutClerkId,
      companyName: args.companyName,
      companyNameNormalized: normalized,
      conflictType: args.conflictType,
      coolingPeriodMonths: 24,
      declaredBy: scoutClerkId,
      notes: args.notes,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});
