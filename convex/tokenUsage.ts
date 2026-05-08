import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireAdminOrSelf, requireSelf } from "./_lib/auth";

// Default tags for legacy/untagged rows. Treat any row lacking these as a
// turn-1 LLP-paid Grok call so historical numbers stay coherent with the
// new per-agent telemetry shipped 2026-04-28.
const DEFAULT_AGENT_SLUG = "chat-proxy-grok";
const DEFAULT_TURN = 1;
const DEFAULT_STREAM = 1;

// Get today's usage for a user.
// NOTE: kept SUM-across-agents for backward compat with the quota route.
// Use `getTodayByAgent` if you need per-agent breakdown for today.
export const getToday = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireAdminOrSelf(ctx, userId);
    const today = new Date().toISOString().split("T")[0];
    const rows = await ctx.db
      .query("tokenUsage")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", today))
      .collect();

    if (rows.length === 0) {
      return {
        userId,
        date: today,
        inputUsed: 0,
        outputUsed: 0,
        requestCount: 0,
        tier: "free_guest",
        resetAt: getNextMidnight(),
      };
    }

    let inputUsed = 0;
    let outputUsed = 0;
    let requestCount = 0;
    let tier = rows[0].tier;
    let resetAt = rows[0].resetAt;
    for (const row of rows) {
      inputUsed += row.inputUsed;
      outputUsed += row.outputUsed;
      requestCount += row.requestCount;
      tier = row.tier; // latest wins
      resetAt = row.resetAt;
    }
    return {
      userId,
      date: today,
      inputUsed,
      outputUsed,
      requestCount,
      tier,
      resetAt,
    };
  },
});

// Get today's usage for a user, broken down per agentSlug.
export const getTodayByAgent = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireAdminOrSelf(ctx, userId);
    const today = new Date().toISOString().split("T")[0];
    const rows = await ctx.db
      .query("tokenUsage")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", today))
      .collect();
    return rows.map((row) => ({
      agentSlug: row.agentSlug ?? DEFAULT_AGENT_SLUG,
      turn: row.turn ?? DEFAULT_TURN,
      stream: row.stream ?? DEFAULT_STREAM,
      model: row.model,
      tier: row.tier,
      inputUsed: row.inputUsed,
      outputUsed: row.outputUsed,
      requestCount: row.requestCount,
    }));
  },
});

// Track token usage for a request. Row key is now (userId, date, agentSlug)
// so per-agent counters don't collide. Defaults preserve back-compat with
// callers that haven't been migrated yet.
export const track = mutation({
  args: {
    userId: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    tier: v.string(),
    model: v.optional(v.string()),
    agentSlug: v.optional(v.string()),
    turn: v.optional(v.number()),
    stream: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { userId, inputTokens, outputTokens, tier, model, agentSlug, turn, stream }
  ) => {
    await requireSelf(ctx, userId);
    const today = new Date().toISOString().split("T")[0];
    const slug = agentSlug ?? DEFAULT_AGENT_SLUG;
    const turnNum = turn ?? DEFAULT_TURN;
    const streamNum = stream ?? DEFAULT_STREAM;

    // Find an existing row for this (userId, date, agentSlug) triple.
    // Convex's by_user_date index covers (userId, date); we filter agentSlug
    // client-side because the table only ever has a handful of agents per
    // user per day.
    const sameDay = await ctx.db
      .query("tokenUsage")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", today))
      .collect();
    const existing = sameDay.find(
      (row) => (row.agentSlug ?? DEFAULT_AGENT_SLUG) === slug
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        inputUsed: existing.inputUsed + inputTokens,
        outputUsed: existing.outputUsed + outputTokens,
        requestCount: existing.requestCount + 1,
        tier,
        ...(model ? { model } : {}),
        agentSlug: slug,
        turn: turnNum,
        stream: streamNum,
      });
    } else {
      await ctx.db.insert("tokenUsage", {
        userId,
        date: today,
        inputUsed: inputTokens,
        outputUsed: outputTokens,
        requestCount: 1,
        tier,
        ...(model ? { model } : {}),
        agentSlug: slug,
        turn: turnNum,
        stream: streamNum,
        resetAt: getNextMidnight(),
      });
    }
  },
});

// Admin: get usage stats for all users on a date.
export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("tokenUsage")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();
    return rows.map((row) => ({
      ...row,
      agentSlug: row.agentSlug ?? DEFAULT_AGENT_SLUG,
      turn: row.turn ?? DEFAULT_TURN,
      stream: row.stream ?? DEFAULT_STREAM,
    }));
  },
});

// Admin: get usage history for a specific user.
export const listByUser = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    await requireAdminOrSelf(ctx, userId);
    const results = await ctx.db
      .query("tokenUsage")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    const decorated = results.map((row) => ({
      ...row,
      agentSlug: row.agentSlug ?? DEFAULT_AGENT_SLUG,
      turn: row.turn ?? DEFAULT_TURN,
      stream: row.stream ?? DEFAULT_STREAM,
    }));
    return limit ? decorated.slice(0, limit) : decorated;
  },
});

// Admin: get all usage records (recent first), across all users.
export const listAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireAdmin(ctx);
    const results = await ctx.db
      .query("tokenUsage")
      .withIndex("by_date")
      .order("desc")
      .collect();
    const decorated = results.map((row) => ({
      ...row,
      agentSlug: row.agentSlug ?? DEFAULT_AGENT_SLUG,
      turn: row.turn ?? DEFAULT_TURN,
      stream: row.stream ?? DEFAULT_STREAM,
    }));
    return (limit ? decorated.slice(0, limit) : decorated).slice(0, 500);
  },
});

// Admin: aggregate usage per unique userId (all time). Sums across every
// agentSlug row that belongs to the user so totals stay comparable to the
// pre-2026-04-28 single-row-per-day model.
export const aggregateByUser = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("tokenUsage").collect();
    const userMap = new Map<
      string,
      {
        userId: string;
        totalInput: number;
        totalOutput: number;
        totalRequests: number;
        tier: string;
        model?: string;
        firstDate: string;
        lastDate: string;
        daysActive: number;
        // Track distinct (date) values so daysActive isn't inflated by
        // the new per-agent rows (multiple rows per user per day now).
        _dates: Set<string>;
      }
    >();

    for (const row of all) {
      const existing = userMap.get(row.userId);
      if (existing) {
        existing.totalInput += row.inputUsed;
        existing.totalOutput += row.outputUsed;
        existing.totalRequests += row.requestCount;
        existing.tier = row.tier; // latest tier
        if (row.model) existing.model = row.model; // latest model
        existing._dates.add(row.date);
        if (row.date < existing.firstDate) existing.firstDate = row.date;
        if (row.date > existing.lastDate) existing.lastDate = row.date;
      } else {
        userMap.set(row.userId, {
          userId: row.userId,
          totalInput: row.inputUsed,
          totalOutput: row.outputUsed,
          totalRequests: row.requestCount,
          tier: row.tier,
          model: row.model,
          firstDate: row.date,
          lastDate: row.date,
          daysActive: 1,
          _dates: new Set([row.date]),
        });
      }
    }

    return Array.from(userMap.values())
      .map(({ _dates, ...rest }) => ({
        ...rest,
        daysActive: _dates.size,
      }))
      .sort((a, b) => b.totalRequests - a.totalRequests);
  },
});

// Admin: aggregate usage per agentSlug (all time). Consumed by P2 to render
// per-agent totals on /admin/chat-usage.
export const aggregateByAgent = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("tokenUsage").collect();
    const agentMap = new Map<
      string,
      {
        agentSlug: string;
        totalInput: number;
        totalOutput: number;
        totalRequests: number;
        stream: number;
        model?: string;
      }
    >();

    for (const row of all) {
      const slug = row.agentSlug ?? DEFAULT_AGENT_SLUG;
      const existing = agentMap.get(slug);
      if (existing) {
        existing.totalInput += row.inputUsed;
        existing.totalOutput += row.outputUsed;
        existing.totalRequests += row.requestCount;
        if (row.model) existing.model = row.model;
        // stream is intrinsic to the agentSlug — keep first observed value
        // but overwrite if a row explicitly tags it (handles legacy → new
        // transition cleanly).
        if (row.stream !== undefined) existing.stream = row.stream;
      } else {
        agentMap.set(slug, {
          agentSlug: slug,
          totalInput: row.inputUsed,
          totalOutput: row.outputUsed,
          totalRequests: row.requestCount,
          stream: row.stream ?? DEFAULT_STREAM,
          model: row.model,
        });
      }
    }

    return Array.from(agentMap.values()).sort(
      (a, b) => b.totalRequests - a.totalRequests
    );
  },
});

// Admin: nested aggregate — per user, then per agent within that user.
// Consumed by P2's per-user expand to show which agents a single user hit.
export const aggregateByUserAndAgent = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("tokenUsage").collect();
    const userMap = new Map<
      string,
      {
        userId: string;
        totalRequests: number;
        perAgent: Map<
          string,
          {
            agentSlug: string;
            totalInput: number;
            totalOutput: number;
            totalRequests: number;
            model?: string;
            stream: number;
          }
        >;
      }
    >();

    for (const row of all) {
      const slug = row.agentSlug ?? DEFAULT_AGENT_SLUG;
      let userEntry = userMap.get(row.userId);
      if (!userEntry) {
        userEntry = {
          userId: row.userId,
          totalRequests: 0,
          perAgent: new Map(),
        };
        userMap.set(row.userId, userEntry);
      }
      userEntry.totalRequests += row.requestCount;

      const agentEntry = userEntry.perAgent.get(slug);
      if (agentEntry) {
        agentEntry.totalInput += row.inputUsed;
        agentEntry.totalOutput += row.outputUsed;
        agentEntry.totalRequests += row.requestCount;
        if (row.model) agentEntry.model = row.model;
        if (row.stream !== undefined) agentEntry.stream = row.stream;
      } else {
        userEntry.perAgent.set(slug, {
          agentSlug: slug,
          totalInput: row.inputUsed,
          totalOutput: row.outputUsed,
          totalRequests: row.requestCount,
          model: row.model,
          stream: row.stream ?? DEFAULT_STREAM,
        });
      }
    }

    return Array.from(userMap.values())
      .map((entry) => ({
        userId: entry.userId,
        totalRequests: entry.totalRequests,
        perAgent: Array.from(entry.perAgent.values()).sort(
          (a, b) => b.totalRequests - a.totalRequests
        ),
      }))
      .sort((a, b) => b.totalRequests - a.totalRequests);
  },
});

function getNextMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}
