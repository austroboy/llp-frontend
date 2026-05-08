import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireUser } from "./_lib/auth";

// Search for matching template by domain + docType. Used by the chat pipeline
// for active users — gate to authenticated callers only.
export const search = query({
  args: {
    domain: v.string(),
    docType: v.optional(v.string()),
  },
  handler: async (ctx, { domain, docType }) => {
    await requireUser(ctx);
    if (docType) {
      return await ctx.db
        .query("templates")
        .withIndex("by_domain_docType", (q) =>
          q.eq("domain", domain).eq("docType", docType)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
    }
    // Return first active template for domain
    const templates = await ctx.db
      .query("templates")
      .withIndex("by_domain", (q) => q.eq("domain", domain))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return templates[0] ?? null;
  },
});

// List all templates (admin)
export const list = query({
  args: { domain: v.optional(v.string()) },
  handler: async (ctx, { domain }) => {
    await requireAdmin(ctx);
    if (domain) {
      return await ctx.db
        .query("templates")
        .withIndex("by_domain", (q) => q.eq("domain", domain))
        .collect();
    }
    return await ctx.db.query("templates").collect();
  },
});

// Get a single template
export const getById = query({
  args: { id: v.id("templates") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    return await ctx.db.get(id);
  },
});

// Create a template (admin)
export const create = mutation({
  args: {
    domain: v.string(),
    docType: v.string(),
    title: v.string(),
    titleBn: v.optional(v.string()),
    content: v.string(),
    version: v.string(),
    reviewedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    return await ctx.db.insert("templates", {
      ...args,
      isActive: true,
      lastReviewed: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update a template (admin)
export const update = mutation({
  args: {
    id: v.id("templates"),
    domain: v.optional(v.string()),
    docType: v.optional(v.string()),
    title: v.optional(v.string()),
    titleBn: v.optional(v.string()),
    content: v.optional(v.string()),
    version: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requireAdmin(ctx);

    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...filtered,
      updatedAt: Date.now(),
      ...(updates.reviewedBy ? { lastReviewed: Date.now() } : {}),
    });
  },
});

// Delete a template (admin)
export const remove = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);

    await ctx.db.delete(id);
  },
});
