import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./_lib/auth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Public-by-design: file URLs are unguessable signed URLs from Convex storage.
// Anyone holding a storageId already has access by construction; gating this
// would break public blog post cover images and public expert avatars.
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const remove = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    // NOTE: storage objects don't track an owner, so we can't enforce per-file
    // ownership here. Require auth as a baseline — admin tools that delete
    // files should additionally call requireAdmin in their own handlers.
    await requireUser(ctx);
    await ctx.storage.delete(args.storageId);
  },
});
