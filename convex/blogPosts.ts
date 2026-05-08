import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireAdmin, requireAdminOrOwner } from "./_lib/auth";

// Admin-only: list ALL posts including drafts. Public consumers use
// `getPublished` instead.
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("blogPosts")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("blogPosts").order("desc").collect();
  },
});

// User-scoped: caller can only list their own posts (or admin can list any).
export const listByUser = query({
  args: {
    userId: v.string(),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("pending_review"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    if (identity.subject !== args.userId && role !== "admin") {
      throw new Error("Forbidden");
    }
    const posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userId))
      .order("desc")
      .collect();
    if (args.status) {
      return posts.filter((p) => p.status === args.status);
    }
    return posts;
  },
});

// Public-by-design: only returns posts whose status is "published".
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!post || post.status !== "published") return null;
    return post;
  },
});

// Public-by-design: only published posts.
export const getPublished = query({
  args: {
    category: v.optional(
      v.union(v.literal("official"), v.literal("community"))
    ),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();
    if (args.category) {
      return posts.filter((p) => p.category === args.category);
    }
    return posts;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    titleBn: v.optional(v.string()),
    slug: v.string(),
    excerpt: v.string(),
    excerptBn: v.optional(v.string()),
    content: v.string(),
    contentBn: v.optional(v.string()),
    category: v.union(v.literal("official"), v.literal("community")),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_review"),
      v.literal("published"),
      v.literal("archived")
    ),
    authorName: v.string(),
    authorRole: v.optional(v.string()),
    authorInitials: v.string(),
    coverImageId: v.optional(v.id("_storage")),
    tags: v.optional(v.array(v.string())),
    readTimeMinutes: v.optional(v.number()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    // Force createdBy to the authenticated user — never trust client value.
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    // Non-admins cannot publish directly; force to draft or pending_review.
    let status = args.status;
    if (role !== "admin" && status === "published") {
      status = "pending_review";
    }
    const now = Date.now();
    return await ctx.db.insert("blogPosts", {
      ...args,
      createdBy: identity.subject,
      status,
      publishedAt: status === "published" ? now : undefined,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("blogPosts"),
    title: v.optional(v.string()),
    titleBn: v.optional(v.string()),
    slug: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    excerptBn: v.optional(v.string()),
    content: v.optional(v.string()),
    contentBn: v.optional(v.string()),
    category: v.optional(
      v.union(v.literal("official"), v.literal("community"))
    ),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("pending_review"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
    authorName: v.optional(v.string()),
    authorRole: v.optional(v.string()),
    authorInitials: v.optional(v.string()),
    coverImageId: v.optional(v.id("_storage")),
    tags: v.optional(v.array(v.string())),
    readTimeMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    const identity = await requireAdminOrOwner(ctx, existing, "createdBy");
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    // Non-admins cannot directly publish.
    if (role !== "admin" && fields.status === "published") {
      fields.status = "pending_review";
    }
    const updates: Record<string, unknown> = { ...fields, updatedAt: Date.now() };
    if (fields.status === "published") {
      if (existing && !existing.publishedAt) {
        updates.publishedAt = Date.now();
      }
    }
    await ctx.db.patch(id, updates);
  },
});

export const publish = mutation({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Post not found");
    await ctx.db.patch(args.id, {
      status: "published",
      publishedAt: post.publishedAt ?? Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    await requireAdminOrOwner(ctx, existing, "createdBy");
    await ctx.db.delete(args.id);
  },
});

// Public-by-design: navigation between published posts.
export const getAdjacentPosts = query({
  args: { publishedAt: v.number(), currentId: v.id("blogPosts") },
  handler: async (ctx, args) => {
    const allPublished = await ctx.db
      .query("blogPosts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();

    const sorted = allPublished.sort(
      (a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0)
    );
    const currentIndex = sorted.findIndex((p) => p._id === args.currentId);

    const prev =
      currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;
    const next = currentIndex > 0 ? sorted[currentIndex - 1] : null;

    return {
      prev: prev
        ? {
            title: prev.title,
            slug: prev.slug,
            coverImageId: prev.coverImageId,
          }
        : null,
      next: next
        ? {
            title: next.title,
            slug: next.slug,
            coverImageId: next.coverImageId,
          }
        : null,
    };
  },
});

// Public-by-design: shows other published posts in same category.
export const getRelated = query({
  args: {
    postId: v.id("blogPosts"),
    category: v.string(),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 3;
    const sameCategory = await ctx.db
      .query("blogPosts")
      .withIndex("by_category", (q) =>
        q.eq("category", args.category as "official" | "community")
      )
      .collect();

    const candidates = sameCategory.filter(
      (p) => p._id !== args.postId && p.status === "published"
    );

    const scored = candidates.map((p) => {
      const overlap = (p.tags ?? []).filter((t) =>
        (args.tags ?? []).includes(t)
      ).length;
      return { ...p, score: overlap };
    });

    scored.sort(
      (a, b) =>
        b.score - a.score || (b.publishedAt ?? 0) - (a.publishedAt ?? 0)
    );
    return scored.slice(0, limit);
  },
});
