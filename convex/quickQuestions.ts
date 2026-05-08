import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./_lib/auth";

// --- Queries ---

// Public-by-design: anyone can view answered Q&A on an expert's profile.
// Filter to answered status server-side to avoid leaking pending/expired ones.
export const listByExpert = query({
  args: { expertId: v.id("experts") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("quickQuestions")
      .withIndex("by_expert", (q) => q.eq("expertId", args.expertId))
      .order("desc")
      .collect();
    return all.filter((q) => q.status === "answered");
  },
});

// Admin-only: pending question queue.
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("quickQuestions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  },
});

// Admin-only: full Q&A list with answers.
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const questions = await ctx.db
      .query("quickQuestions")
      .order("desc")
      .collect();

    // Join with expert names (handle deleted/orphaned experts)
    const expertCache = new Map<string, string | null>();
    for (const q of questions) {
      const key = q.expertId as string;
      if (!expertCache.has(key)) {
        const expert = await ctx.db.get(q.expertId);
        expertCache.set(key, expert?.name ?? null);
      }
    }

    return questions.map((q) => ({
      ...q,
      expertName: expertCache.get(q.expertId as string) ?? "[Deleted Expert]",
    }));
  },
});

// --- Mutations ---

// Public-by-design (with rate limit): public visitors can ask questions.
// We trust the email-based rate limit + force askerClerkId to authenticated
// subject when one is present (don't trust client value).
export const create = mutation({
  args: {
    expertId: v.id("experts"),
    askerName: v.string(),
    askerEmail: v.string(),
    askerClerkId: v.optional(v.string()),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.question.length > 200) {
      throw new Error("Question must be 200 characters or fewer");
    }

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentByEmail = await ctx.db
      .query("quickQuestions")
      .withIndex("by_email", (q) => q.eq("askerEmail", args.askerEmail))
      .collect();
    const recentCount = recentByEmail.filter(
      (q) => q._creationTime > oneDayAgo
    ).length;
    if (recentCount >= 3) {
      throw new Error(
        "Rate limit exceeded: maximum 3 questions per day. Please try again later."
      );
    }

    const identity = await ctx.auth.getUserIdentity();
    return await ctx.db.insert("quickQuestions", {
      expertId: args.expertId,
      askerName: args.askerName,
      askerEmail: args.askerEmail,
      askerClerkId: identity?.subject ?? args.askerClerkId,
      question: args.question,
      status: "pending",
    });
  },
});

export const answer = mutation({
  args: {
    id: v.id("quickQuestions"),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      answer: args.answer,
      status: "answered",
      answeredAt: Date.now(),
    });
  },
});

export const markExpired = mutation({
  args: { id: v.id("quickQuestions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: "expired",
    });
  },
});

export const remove = mutation({
  args: { id: v.id("quickQuestions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
