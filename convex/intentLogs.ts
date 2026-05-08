import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, requireAdmin } from "./_lib/auth";

// Log an intent classification (called by chat pipeline on behalf of caller).
export const log = mutation({
  args: {
    userId: v.string(),
    intents: v.array(v.string()),
    primaryIntent: v.string(),
    domain: v.string(),
    crossDomains: v.optional(v.array(v.string())),
    perspective: v.string(),
    urgency: v.string(),
    language: v.string(),
    tier: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    templateUsed: v.optional(v.string()),
    outOfScope: v.boolean(),
    blocked: v.optional(v.boolean()),
    blockedIntents: v.optional(v.array(v.string())),
    productMentioned: v.optional(v.string()),
    productTrigger: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    // Force userId to authenticated subject — never trust arg.
    return await ctx.db.insert("intentLogs", {
      ...args,
      userId: identity.subject,
      timestamp: Date.now(),
    });
  },
});

// Admin: list recent intent logs
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireAdmin(ctx);
    const results = await ctx.db
      .query("intentLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();
    return results.slice(0, limit ?? 50);
  },
});

// Admin: list out-of-scope queries (drives module expansion decisions)
export const listOutOfScope = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireAdmin(ctx);
    const results = await ctx.db
      .query("intentLogs")
      .withIndex("by_outOfScope", (q) => q.eq("outOfScope", true))
      .order("desc")
      .collect();
    return results.slice(0, limit ?? 50);
  },
});

// Admin: get analytics summary
export const getAnalytics = query({
  args: {
    startTimestamp: v.optional(v.number()),
    endTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, { startTimestamp, endTimestamp }) => {
    await requireAdmin(ctx);
    let logs = await ctx.db
      .query("intentLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    // Filter by time range
    if (startTimestamp) {
      logs = logs.filter((l) => l.timestamp >= startTimestamp);
    }
    if (endTimestamp) {
      logs = logs.filter((l) => l.timestamp <= endTimestamp);
    }

    // Aggregate
    const domainCounts: Record<string, number> = {};
    const intentCounts: Record<string, number> = {};
    const tierCounts: Record<string, number> = {};
    const perspectiveCounts: Record<string, number> = {};
    const productMentionedCounts: Record<string, number> = {};
    const productTriggerCounts: Record<string, number> = {};
    let totalInput = 0;
    let totalOutput = 0;
    let outOfScopeCount = 0;
    let blockedCount = 0;
    let productQueriesCount = 0;

    for (const log of logs) {
      domainCounts[log.domain] = (domainCounts[log.domain] || 0) + 1;
      intentCounts[log.primaryIntent] = (intentCounts[log.primaryIntent] || 0) + 1;
      tierCounts[log.tier] = (tierCounts[log.tier] || 0) + 1;
      perspectiveCounts[log.perspective] = (perspectiveCounts[log.perspective] || 0) + 1;
      totalInput += log.inputTokens;
      totalOutput += log.outputTokens;
      if (log.outOfScope) outOfScopeCount++;
      if (log.blocked) blockedCount++;
      if (log.productMentioned) {
        productQueriesCount++;
        productMentionedCounts[log.productMentioned] = (productMentionedCounts[log.productMentioned] || 0) + 1;
      }
      if (log.productTrigger) {
        productTriggerCounts[log.productTrigger] = (productTriggerCounts[log.productTrigger] || 0) + 1;
      }
    }

    return {
      totalQueries: logs.length,
      domainCounts,
      intentCounts,
      tierCounts,
      perspectiveCounts,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      outOfScopeCount,
      blockedCount,
      productQueriesCount,
      productMentionedCounts,
      productTriggerCounts,
    };
  },
});
