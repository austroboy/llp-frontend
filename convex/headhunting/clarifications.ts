import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { requireUser, requireAdmin, requireSelf } from "../_lib/auth";

/**
 * Client Workspace — Clarification Requests (v3.1)
 *
 * Threaded Q&A between client and LLP per mandate or candidate.
 * Client raises questions → LLP admin responds → client sees response.
 */

// ── Queries ──────────────────────────────────────────────────────────

export const getByMandate = query({
  args: { mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db
      .query("htClarifications")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .order("desc")
      .collect();
  },
});

export const getOpenByMandate = query({
  args: { mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const all = await ctx.db
      .query("htClarifications")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .collect();
    return all.filter((c) => c.status !== "resolved");
  },
});

export const getById = query({
  args: { id: v.id("htClarifications") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db.get(args.id);
  },
});

export const getPendingCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const pending = await ctx.db
      .query("htClarifications")
      .withIndex("by_status", (q) => q.eq("status", "awaiting_llp"))
      .collect();
    return pending.length;
  },
});

// ── Mutations ────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    mandateId: v.id("htMandates"),
    submissionId: v.optional(v.id("htSubmissions")),
    topic: v.string(),
    content: v.string(),
    senderName: v.string(),
    senderClerkId: v.string(),
    visibility: v.optional(v.union(
      v.literal("internal"),
      v.literal("scout"),
      v.literal("collaborator"),
      v.literal("client"),
      v.literal("applicant"),
    )),
  },
  handler: async (ctx, args) => {
    // Caller must own the senderClerkId they're claiming.
    await requireSelf(ctx, args.senderClerkId);
    const now = Date.now();
    return ctx.db.insert("htClarifications", {
      mandateId: args.mandateId,
      submissionId: args.submissionId,
      topic: args.topic,
      messages: [
        {
          sender: "client",
          senderName: args.senderName,
          senderClerkId: args.senderClerkId,
          content: args.content,
          timestamp: now,
          visibility: args.visibility ?? ("client" as const),
        },
      ],
      status: "awaiting_llp",
      createdBy: args.senderClerkId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const reply = mutation({
  args: {
    id: v.id("htClarifications"),
    content: v.string(),
    senderName: v.string(),
    senderClerkId: v.optional(v.string()),
    senderRole: v.union(v.literal("client"), v.literal("llp")),
    visibility: v.optional(v.union(
      v.literal("internal"),
      v.literal("scout"),
      v.literal("collaborator"),
      v.literal("client"),
      v.literal("applicant"),
    )),
  },
  handler: async (ctx, args) => {
    // LLP role is admin-only; client role just requires authenticated identity.
    if (args.senderRole === "llp") {
      await requireAdmin(ctx);
    } else {
      await requireUser(ctx);
    }
    const clarification = await ctx.db.get(args.id);
    if (!clarification) throw new Error("Clarification not found");

    // Default visibility based on sender role
    const resolvedVisibility = args.visibility ?? (args.senderRole === "client" ? "client" as const : "internal" as const);

    const now = Date.now();
    const messages = [
      ...clarification.messages,
      {
        sender: args.senderRole,
        senderName: args.senderName,
        senderClerkId: args.senderClerkId,
        content: args.content,
        timestamp: now,
        visibility: resolvedVisibility,
      },
    ];

    // Auto-toggle status based on who replied
    const newStatus = args.senderRole === "client" ? "awaiting_llp" : "awaiting_client";

    await ctx.db.patch(args.id, {
      messages,
      status: newStatus as "awaiting_llp" | "awaiting_client",
      updatedAt: now,
    });
  },
});

export const resolve = mutation({
  args: { id: v.id("htClarifications") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: "resolved",
      updatedAt: Date.now(),
    });
  },
});
