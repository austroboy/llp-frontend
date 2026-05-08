import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./_lib/auth";

const categoryValidator = v.union(v.literal("expatriate"), v.literal("hr"), v.literal("licensing"));

// Admin-only: includes inactive services. Public consumers use `getActive`.
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("serviceProducts").order("asc").collect();
  },
});

export const getActive = query({
  args: {
    category: v.optional(categoryValidator),
  },
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("serviceProducts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    const filtered = args.category
      ? services.filter((s) => s.category === args.category)
      : services;
    return filtered.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    titleBn: v.optional(v.string()),
    description: v.string(),
    descriptionBn: v.optional(v.string()),
    category: categoryValidator,
    icon: v.string(),
    deliverables: v.array(v.string()),
    deliverablesBn: v.optional(v.array(v.string())),
    ctaText: v.string(),
    ctaTextBn: v.optional(v.string()),
    badge: v.optional(v.string()),
    badgeBn: v.optional(v.string()),
    workflow: v.optional(v.string()),
    deliveryTimeline: v.optional(v.string()),
    price: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    notes: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    return await ctx.db.insert("serviceProducts", {
      ...args,
      createdBy: identity.subject,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("serviceProducts"),
    title: v.optional(v.string()),
    titleBn: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionBn: v.optional(v.string()),
    category: v.optional(categoryValidator),
    icon: v.optional(v.string()),
    deliverables: v.optional(v.array(v.string())),
    deliverablesBn: v.optional(v.array(v.string())),
    ctaText: v.optional(v.string()),
    ctaTextBn: v.optional(v.string()),
    badge: v.optional(v.string()),
    badgeBn: v.optional(v.string()),
    workflow: v.optional(v.string()),
    deliveryTimeline: v.optional(v.string()),
    price: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    notes: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const toggleActive = mutation({
  args: { id: v.id("serviceProducts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const service = await ctx.db.get(args.id);
    if (!service) throw new Error("Service not found");
    await ctx.db.patch(args.id, {
      isActive: !service.isActive,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("serviceProducts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const bulkCreate = mutation({
  args: {
    services: v.array(v.object({
      title: v.string(),
      titleBn: v.optional(v.string()),
      description: v.string(),
      descriptionBn: v.optional(v.string()),
      category: categoryValidator,
      icon: v.string(),
      deliverables: v.array(v.string()),
      deliverablesBn: v.optional(v.array(v.string())),
      ctaText: v.string(),
      ctaTextBn: v.optional(v.string()),
      badge: v.optional(v.string()),
      badgeBn: v.optional(v.string()),
      workflow: v.optional(v.string()),
      deliveryTimeline: v.optional(v.string()),
      price: v.optional(v.string()),
      paymentTerms: v.optional(v.string()),
      notes: v.optional(v.string()),
      sortOrder: v.number(),
      isActive: v.boolean(),
      createdBy: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const ids = [];
    for (const service of args.services) {
      const id = await ctx.db.insert("serviceProducts", {
        ...service,
        createdBy: identity.subject,
        updatedAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});
