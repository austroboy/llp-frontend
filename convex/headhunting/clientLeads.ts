import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../_lib/auth";

// public write: lead capture form is intentionally open to unauthenticated visitors
// who want to engage LLP. Inputs are validated above via the validator and stored
// as "new" status — no privileged side effects.
export const submit = mutation({
  args: {
    contactName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    companyName: v.string(),
    roleTitle: v.string(),
    briefDescription: v.optional(v.string()),
    urgency: v.union(v.literal("standard"), v.literal("urgent"), v.literal("critical")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("htClientLeads", {
      ...args,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const list = query({
  args: {
    status: v.optional(v.union(v.literal("new"), v.literal("contacted"), v.literal("converted"), v.literal("closed"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("htClientLeads")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("htClientLeads").order("desc").collect();
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("htClientLeads"),
    status: v.union(v.literal("new"), v.literal("contacted"), v.literal("converted"), v.literal("closed")),
    notes: v.optional(v.string()),
    convertedClientId: v.optional(v.id("htClients")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: args.status,
      notes: args.notes,
      convertedClientId: args.convertedClientId,
      updatedAt: Date.now(),
    });
  },
});
