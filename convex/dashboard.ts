import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireAdminOrSelf } from "./_lib/auth";

// Admin-only: aggregate platform stats.
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const allPosts = await ctx.db.query("blogPosts").collect();
    const publishedPosts = allPosts.filter((p) => p.status === "published");
    const draftPosts = allPosts.filter((p) => p.status === "draft");

    const allServices = await ctx.db.query("serviceProducts").collect();
    const activeServices = allServices.filter((s) => s.isActive);

    const allRequests = await ctx.db
      .query("consultationRequests")
      .collect();
    const pendingRequests = allRequests.filter(
      (r) => r.status === "pending"
    );

    const allExperts = await ctx.db.query("experts").collect();
    const publishedExperts = allExperts.filter((e) => e.status === "published");
    const draftExperts = allExperts.filter((e) => e.status === "draft");

    const allApplications = await ctx.db.query("expertApplications").collect();
    const pendingApplications = allApplications.filter(
      (a) => a.status === "submitted" || a.status === "under_review"
    );

    const allServiceRequests = await ctx.db.query("serviceRequests").collect();
    const pendingServiceRequests = allServiceRequests.filter(
      (r) => r.status === "pending"
    );

    const allScoutApps = await ctx.db.query("htScoutProfiles").collect();
    const pendingScoutApps = allScoutApps.filter(
      (a) => a.status === "submitted" || a.status === "under_review"
    );

    return {
      blogPosts: {
        total: allPosts.length,
        published: publishedPosts.length,
        draft: draftPosts.length,
      },
      services: {
        total: allServices.length,
        active: activeServices.length,
      },
      consultations: {
        total: allRequests.length,
        pending: pendingRequests.length,
      },
      experts: {
        total: allExperts.length,
        published: publishedExperts.length,
        draft: draftExperts.length,
      },
      applications: {
        total: allApplications.length,
        pending: pendingApplications.length,
      },
      serviceRequests: {
        total: allServiceRequests.length,
        pending: pendingServiceRequests.length,
      },
      scoutApplications: {
        total: allScoutApps.filter((a) => a.status !== "draft").length,
        pending: pendingScoutApps.length,
      },
    };
  },
});

// User-scoped: caller must be self or admin.
export const getStatsByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminOrSelf(ctx, args.userId);
    const posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userId))
      .collect();
    const published = posts.filter((p) => p.status === "published");
    const draft = posts.filter((p) => p.status === "draft");

    return {
      blogPosts: {
        total: posts.length,
        published: published.length,
        draft: draft.length,
      },
    };
  },
});

export const getRecentPostsByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminOrSelf(ctx, args.userId);
    const posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userId))
      .order("desc")
      .collect();
    return posts.slice(0, 5);
  },
});

// Admin-only: includes drafts/unpublished items.
export const getRecentPosts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("blogPosts")
      .order("desc")
      .take(5);
  },
});

export const getRecentRequests = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("consultationRequests")
      .order("desc")
      .take(5);
  },
});

export const getRecentExperts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("experts").order("desc").take(5);
  },
});

export const getRecentApplications = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("expertApplications")
      .order("desc")
      .take(5);
  },
});

export const getRecentScoutApplications = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db
      .query("htScoutProfiles")
      .order("desc")
      .collect();
    // Only show submitted ones (not drafts)
    return all.filter((a) => a.status !== "draft").slice(0, 5);
  },
});

export const getPendingQuestions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const questions = await ctx.db
      .query("quickQuestions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(10);

    // Join with expert names
    const withExperts = await Promise.all(
      questions.map(async (q) => {
        const expert = await ctx.db.get(q.expertId);
        return { ...q, expertName: expert?.name ?? "Unknown" };
      })
    );
    return withExperts;
  },
});
