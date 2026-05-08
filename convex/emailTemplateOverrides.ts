import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./_lib/auth";

// Admin-only: email template overrides used by transactional email pipeline.
// Anyone editing these can hijack outgoing emails — strict admin gate.

export const get = query({
  args: { templateId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("emailTemplateOverrides")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .unique();
    return row;
  },
});

// List all overrides (admin UI).
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("emailTemplateOverrides").collect();
  },
});

// Create or update override. Upserts on templateId.
export const upsert = mutation({
  args: {
    templateId: v.string(),
    html: v.string(),
    subject: v.string(),
    updatedByClerkId: v.string(),
    updatedByEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const existing = await ctx.db
      .query("emailTemplateOverrides")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .unique();
    const now = Date.now();
    // Force updatedByClerkId to authenticated subject.
    if (existing) {
      await ctx.db.patch(existing._id, {
        html: args.html,
        subject: args.subject,
        updatedAt: now,
        updatedByClerkId: identity.subject,
        updatedByEmail: args.updatedByEmail,
      });
      return existing._id;
    }
    return await ctx.db.insert("emailTemplateOverrides", {
      templateId: args.templateId,
      html: args.html,
      subject: args.subject,
      updatedAt: now,
      updatedByClerkId: identity.subject,
      updatedByEmail: args.updatedByEmail,
    });
  },
});

// Delete override (restore default).
export const remove = mutation({
  args: { templateId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("emailTemplateOverrides")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return existing?._id ?? null;
  },
});
