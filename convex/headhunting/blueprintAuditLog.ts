import { query, mutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";

// ─── Action Type Validator ──────────────────────────────────────

const auditActionValidator = v.union(
  v.literal("field_changed"),
  v.literal("status_changed"),
  v.literal("visibility_changed"),
  v.literal("conflict_override"),
  v.literal("release_decision"),
  v.literal("scout_selection"),
  v.literal("brief_generated"),
  v.literal("brief_released"),
  v.literal("brief_recalled")
);

type AuditAction =
  | "field_changed"
  | "status_changed"
  | "visibility_changed"
  | "conflict_override"
  | "release_decision"
  | "scout_selection"
  | "brief_generated"
  | "brief_released"
  | "brief_recalled";

// ─── Internal Helper ────────────────────────────────────────────

/**
 * Internal helper to create a blueprint audit log entry.
 * Call this from other mutation handlers — NOT a Convex mutation itself.
 *
 * Usage:
 *   import { logAudit } from "./blueprintAuditLog";
 *   await logAudit(ctx, blueprintId, "status_changed", { ... });
 */
export async function logAudit(
  ctx: MutationCtx,
  blueprintId: Id<"htRoleBlueprints">,
  action: AuditAction,
  details: {
    fieldPath?: string;
    oldValue?: string;
    newValue?: string;
    rationale?: string;
    metadata?: Record<string, unknown>;
    performedBy?: string; // override — otherwise uses ctx.auth
  }
): Promise<Id<"htBlueprintAuditLog">> {
  let performedBy = details.performedBy;

  if (!performedBy) {
    const identity = await ctx.auth.getUserIdentity();
    performedBy = identity?.subject ?? "system";
  }

  return await ctx.db.insert("htBlueprintAuditLog", {
    blueprintId,
    action,
    fieldPath: details.fieldPath,
    oldValue: details.oldValue,
    newValue: details.newValue,
    performedBy,
    performedAt: Date.now(),
    rationale: details.rationale,
    metadata: details.metadata,
  });
}

// ─── Queries ────────────────────────────────────────────────────

/**
 * Get audit log entries for a specific blueprint, ordered by time desc.
 */
export const getByBlueprint = query({
  args: {
    blueprintId: v.id("htRoleBlueprints"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const all = await ctx.db
      .query("htBlueprintAuditLog")
      .withIndex("by_blueprint", (q) => q.eq("blueprintId", args.blueprintId))
      .order("desc")
      .collect();

    // Manual pagination since Convex doesn't support skip()
    return all.slice(offset, offset + limit);
  },
});

/**
 * Get audit log entries filtered by action type.
 */
export const getByAction = query({
  args: {
    action: auditActionValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("htBlueprintAuditLog")
      .withIndex("by_action", (q) => q.eq("action", args.action))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get audit log entries filtered by who performed the action.
 */
export const getByPerformer = query({
  args: {
    performedBy: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("htBlueprintAuditLog")
      .withIndex("by_performer", (q) => q.eq("performedBy", args.performedBy))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get recent conflict overrides and visibility changes for compliance review.
 */
export const getRecentOverrides = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Fetch both action types and merge by time
    const [conflictOverrides, visibilityChanges] = await Promise.all([
      ctx.db
        .query("htBlueprintAuditLog")
        .withIndex("by_action", (q) => q.eq("action", "conflict_override"))
        .order("desc")
        .take(limit),
      ctx.db
        .query("htBlueprintAuditLog")
        .withIndex("by_action", (q) => q.eq("action", "visibility_changed"))
        .order("desc")
        .take(limit),
    ]);

    // Merge and sort by performedAt desc
    const combined = [...conflictOverrides, ...visibilityChanges];
    combined.sort((a, b) => b.performedAt - a.performedAt);

    return combined.slice(0, limit);
  },
});

// ─── Mutations ──────────────────────────────────────────────────

/**
 * Create an audit log entry. Uses ctx.auth for performedBy.
 */
export const log = mutation({
  args: {
    blueprintId: v.id("htRoleBlueprints"),
    action: auditActionValidator,
    fieldPath: v.optional(v.string()),
    oldValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
    rationale: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required to create audit log entries");
    }

    // Verify blueprint exists
    const bp = await ctx.db.get(args.blueprintId);
    if (!bp) {
      throw new ConvexError("Blueprint not found");
    }

    return await ctx.db.insert("htBlueprintAuditLog", {
      blueprintId: args.blueprintId,
      action: args.action,
      fieldPath: args.fieldPath,
      oldValue: args.oldValue,
      newValue: args.newValue,
      performedBy: identity.subject,
      performedAt: Date.now(),
      rationale: args.rationale,
      metadata: args.metadata,
    });
  },
});
