import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../_lib/auth";

// ═══════════════════════════════════════════════════════════════
// Pipeline Analytics
// ═══════════════════════════════════════════════════════════════

/**
 * Pipeline Kanban data — mandates grouped by status.
 */
export const pipelineKanban = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const mandates = await ctx.db.query("htMandates").order("desc").collect();

    const statuses = [
      "received", "clarification", "architecture", "internal_review",
      "client_review", "approved", "released", "paused", "filled", "closed",
    ];

    const columns = statuses.map((status) => ({
      status,
      mandates: mandates
        .filter((m) => m.status === status)
        .map((m) => ({
          _id: m._id,
          rawTitle: m.rawTitle,
          urgency: m.urgency,
          mandateType: m.mandateType,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })),
      count: mandates.filter((m) => m.status === status).length,
    }));

    return {
      columns,
      totalMandates: mandates.length,
      activeMandates: mandates.filter((m) =>
        !["filled", "closed", "paused"].includes(m.status)
      ).length,
    };
  },
});

/**
 * Mandate velocity — average time spent in each status stage.
 */
export const mandateVelocity = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const mandates = await ctx.db.query("htMandates").collect();

    // Use communication log to calculate time between status transitions
    const velocityData = mandates
      .filter((m) => m.communicationLog && m.communicationLog.length > 0)
      .map((m) => {
        const log = m.communicationLog || [];
        const transitions = log
          .filter((e) => e.channel === "status_change" || e.note.includes("Status:"))
          .sort((a, b) => a.timestamp - b.timestamp);

        const ageMs = Date.now() - m.createdAt;
        const ageDays = Math.round(ageMs / (1000 * 60 * 60 * 24));

        return {
          _id: m._id,
          title: m.rawTitle,
          status: m.status,
          createdAt: m.createdAt,
          ageDays,
          transitionCount: transitions.length,
        };
      });

    // Aggregate stats
    const filled = mandates.filter((m) => m.status === "filled");
    const avgTimeToFill = filled.length > 0
      ? Math.round(
          filled.reduce((s, m) => s + (m.updatedAt - m.createdAt), 0) /
            filled.length /
            (1000 * 60 * 60 * 24)
        )
      : null;

    const released = mandates.filter((m) =>
      ["released", "filled", "closed"].includes(m.status)
    );
    const avgTimeToRelease = released.length > 0
      ? Math.round(
          released.reduce((s, m) => s + (m.updatedAt - m.createdAt), 0) /
            released.length /
            (1000 * 60 * 60 * 24)
        )
      : null;

    return {
      mandates: velocityData,
      avgTimeToFillDays: avgTimeToFill,
      avgTimeToReleaseDays: avgTimeToRelease,
      totalFilled: filled.length,
      totalActive: mandates.filter((m) =>
        !["filled", "closed", "paused"].includes(m.status)
      ).length,
    };
  },
});

/**
 * Scout performance metrics.
 */
export const scoutPerformance = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const experts = await ctx.db
      .query("experts")
      .collect();

    const scouts = experts.filter(
      (e) => e.scoutTier || e.scoutStatus === "active"
    );

    const performance = await Promise.all(
      scouts.map(async (s) => {
        const clerkId = s.clerkId ?? "";
        const submissions = await ctx.db
          .query("htSubmissions")
          .withIndex("by_scout", (q) => q.eq("scoutId", clerkId))
          .collect();

        const briefs = await ctx.db
          .query("htBriefReleases")
          .withIndex("by_scout", (q) => q.eq("scoutId", clerkId))
          .collect();

        const shortlisted = submissions.filter(
          (sub) => sub.status === "shortlisted"
        ).length;
        const placed = submissions.filter(
          (sub) => sub.status === "joined"
        ).length;

        const hitRate =
          submissions.length > 0
            ? Math.round((shortlisted / submissions.length) * 100)
            : 0;

        return {
          _id: s._id,
          name: s.name,
          clerkId: s.clerkId,
          scoutTier: s.scoutTier || "bronze",
          totalBriefs: briefs.length,
          totalSubmissions: submissions.length,
          shortlisted,
          placed,
          hitRate,
          totalEarnings: s.totalEarnings || 0,
          credibilityScore: s.credibilityScore || 0,
        };
      })
    );

    return performance.sort((a, b) => b.hitRate - a.hitRate);
  },
});

/**
 * Conversion funnel — submissions through stages.
 */
export const conversionFunnel = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const submissions = await ctx.db.query("htSubmissions").collect();

    const stages = [
      "submitted", "screening", "shortlisted", "interview",
      "selected", "offer", "joined",
    ];

    const funnel = stages.map((stage) => ({
      stage,
      count: submissions.filter((s) => {
        const stageIdx = stages.indexOf(s.status);
        const currentIdx = stages.indexOf(stage);
        // Count all that reached this stage or beyond
        return stageIdx >= currentIdx || s.status === stage;
      }).length,
      current: submissions.filter((s) => s.status === stage).length,
    }));

    const rejected = submissions.filter((s) => s.status === "rejected").length;
    const withdrawn = submissions.filter((s) => s.status === "withdrawn").length;

    return { funnel, rejected, withdrawn, total: submissions.length };
  },
});
