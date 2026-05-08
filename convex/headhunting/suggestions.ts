import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAdmin, requireSelf } from "../_lib/auth";

/**
 * Create a new "Other" field suggestion when scout submits form
 */
export const createSuggestion = mutation({
  args: {
    fieldName: v.string(),
    suggestedValue: v.string(),
    scoutClerkId: v.string(),
    scoutProfileId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutClerkId);
    const now = Date.now();
    
    // Check for duplicate pending suggestions for same field + value
    const existing = await ctx.db
      .query("scoutSuggestions")
      .withIndex("by_field", (q) => q.eq("fieldName", args.fieldName).eq("status", "pending"))
      .filter((q) => q.eq(q.field("suggestedValue"), args.suggestedValue))
      .first();
    
    if (existing) {
      // Don't create duplicate - return existing ID
      return existing._id;
    }
    
    return await ctx.db.insert("scoutSuggestions", {
      ...args,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Get all pending suggestions for admin review
 */
export const getPendingSuggestions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("scoutSuggestions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  },
});

/**
 * Get suggestions by field name (for building updated option lists)
 */
export const getApprovedSuggestionsByField = query({
  args: { fieldName: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("scoutSuggestions")
      .withIndex("by_field", (q) => q.eq("fieldName", args.fieldName).eq("status", "approved"))
      .collect();
  },
});

/**
 * Admin review a suggestion
 */
export const reviewSuggestion = mutation({
  args: {
    suggestionId: v.id("scoutSuggestions"),
    action: v.union(v.literal("approve"), v.literal("reject"), v.literal("edit")),
    adminDecision: v.optional(v.string()), // for "edit" action
    adminNotes: v.optional(v.string()),
    reviewedBy: v.string(), // admin clerk ID
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) {
      throw new Error("Suggestion not found");
    }
    
    let status: "approved" | "rejected" | "edited";
    let adminDecision = args.adminDecision;
    
    switch (args.action) {
      case "approve":
        status = "approved";
        adminDecision = suggestion.suggestedValue; // use original suggestion
        break;
      case "reject":
        status = "rejected";
        adminDecision = undefined;
        break;
      case "edit":
        status = "edited";
        if (!args.adminDecision) {
          throw new Error("adminDecision required for edit action");
        }
        break;
      default:
        throw new Error("Invalid action");
    }
    
    await ctx.db.patch(args.suggestionId, {
      status,
      adminDecision,
      adminNotes: args.adminNotes,
      reviewedBy: args.reviewedBy,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return { success: true, status, adminDecision };
  },
});

/**
 * Get all suggestions for admin dashboard
 */
export const getAllSuggestions = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("edited"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("scoutSuggestions")
        .withIndex("by_status", (q) => q.eq("status", args.status as "pending" | "approved" | "rejected" | "edited"))
        .order("desc")
        .take(args.limit || 100);
    }
    
    return await ctx.db
      .query("scoutSuggestions")
      .order("desc")
      .take(args.limit || 100);
  },
});

/**
 * Get suggestions for a specific scout (for profile view)
 */
export const getSuggestionsByScout = query({
  args: { scoutClerkId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutClerkId);
    return await ctx.db
      .query("scoutSuggestions")
      .withIndex("by_scout", (q) => q.eq("scoutClerkId", args.scoutClerkId))
      .order("desc")
      .collect();
  },
});