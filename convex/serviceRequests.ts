import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireSelf } from "./_lib/auth";

const CATEGORY_PREFIX: Record<string, string> = {
  expatriate: "EXP",
  hr: "HRS",
  licensing: "LIC",
};
const DEFAULT_PREFIX = "SVC";

function generateOrderNumber(category: string): string {
  const prefix = CATEGORY_PREFIX[category] || DEFAULT_PREFIX;
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}${digits}`;
}

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("reviewed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("serviceRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("serviceRequests").order("desc").collect();
  },
});

export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("serviceRequests").order("desc").collect();
    return all.slice(0, args.limit ?? 5);
  },
});

export const listByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.clerkId);
    return await ctx.db
      .query("serviceRequests")
      .withIndex("by_requesterClerkId", (q) => q.eq("requesterClerkId", args.clerkId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    serviceProductId: v.optional(v.id("serviceProducts")),
    serviceTitle: v.string(),
    serviceCategory: v.string(),
    servicePrice: v.optional(v.string()),
    serviceTimeline: v.optional(v.string()),
    serviceWorkflow: v.optional(v.string()),
    requesterName: v.string(),
    requesterEmail: v.string(),
    requesterPhone: v.optional(v.string()),
    requesterCompany: v.optional(v.string()),
    requesterClerkId: v.optional(v.string()),
    description: v.string(),
    urgency: v.union(v.literal("normal"), v.literal("urgent")),
    preferredLanguage: v.union(v.literal("en"), v.literal("bn")),
  },
  handler: async (ctx, args) => {
    // Public-by-design: marketing-site form, but force requesterClerkId to
    // authenticated subject if signed in (don't trust client value).
    const identity = await ctx.auth.getUserIdentity();
    const requesterClerkId = identity ? identity.subject : args.requesterClerkId;
    // Generate unique order number with retry
    let orderNumber = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = generateOrderNumber(args.serviceCategory);
      const existing = await ctx.db
        .query("serviceRequests")
        .withIndex("by_orderNumber", (q) => q.eq("orderNumber", candidate))
        .first();
      if (!existing) {
        orderNumber = candidate;
        break;
      }
    }
    if (!orderNumber) {
      // Extremely unlikely fallback — use timestamp suffix
      const prefix = CATEGORY_PREFIX[args.serviceCategory] || DEFAULT_PREFIX;
      orderNumber = `${prefix}${Date.now().toString().slice(-5)}`;
    }

    await ctx.db.insert("serviceRequests", {
      ...args,
      requesterClerkId,
      orderNumber,
      status: "pending",
      updatedAt: Date.now(),
    });

    return { orderNumber };
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("serviceRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: args.status,
      adminNotes: args.adminNotes,
      respondedAt: args.status !== "pending" ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

export const assignTo = mutation({
  args: {
    id: v.id("serviceRequests"),
    assignedTo: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      assignedTo: args.assignedTo,
      updatedAt: Date.now(),
    });
  },
});

// Public-by-design: order tracking via order number + email pair.
// The pair acts as a shared secret. We return only client-safe fields.
export const getByOrderNumber = query({
  args: {
    orderNumber: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("serviceRequests")
      .withIndex("by_orderNumber", (q) =>
        q.eq("orderNumber", args.orderNumber.toUpperCase())
      )
      .first();

    if (!request) return null;

    // Case-insensitive email verification
    if (request.requesterEmail.toLowerCase() !== args.email.toLowerCase()) {
      return null;
    }

    // Return only client-safe fields
    return {
      orderNumber: request.orderNumber,
      serviceTitle: request.serviceTitle,
      serviceCategory: request.serviceCategory,
      serviceTimeline: request.serviceTimeline,
      status: request.status,
      publicNotes: request.publicNotes ?? [],
      createdAt: request._creationTime,
      updatedAt: request.updatedAt,
    };
  },
});

export const addPublicNote = mutation({
  args: {
    id: v.id("serviceRequests"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);

    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Request not found");

    const currentNotes = request.publicNotes ?? [];
    await ctx.db.patch(args.id, {
      publicNotes: [
        ...currentNotes,
        {
          message: args.message,
          createdAt: Date.now(),
          createdBy: identity.subject,
        },
      ],
      updatedAt: Date.now(),
    });
  },
});

export const removePublicNote = mutation({
  args: {
    id: v.id("serviceRequests"),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Request not found");

    const currentNotes = request.publicNotes ?? [];
    await ctx.db.patch(args.id, {
      publicNotes: currentNotes.filter(
        (n: { createdAt: number }) => n.createdAt !== args.createdAt
      ),
      updatedAt: Date.now(),
    });
  },
});
