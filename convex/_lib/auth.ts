/**
 * Convex auth helpers — single source of truth for identity / role / ownership
 * gates inside Convex query/mutation/action handlers.
 *
 * These re-export and supplement `convex/lib/adminGuard.ts` + `convex/lib/orgGuard.ts`
 * so new code can import everything from one place. Existing callers using the
 * `lib/*` paths continue to work.
 *
 * SECURITY NOTE: Convex's NEXT_PUBLIC_CONVEX_URL is bundled into the client.
 * Anyone with that URL can call any non-internal mutation/query directly via
 * the SDK — even bypassing the Next.js app. Therefore EVERY non-public handler
 * MUST call `requireUser` / `requireAdmin` / `requireOwner` at the top.
 *
 * Public-by-design handlers (published blog posts, public expert directory,
 * public profile lookups, file URL resolution) MAY skip identity, but MUST
 * filter results to public/published rows server-side — never trust client
 * filters or `isPublic` flags supplied as args.
 */

import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { ConvexError } from "convex/values";

// Re-export existing guards so callers can use a single import path.
export { requireAdmin } from "../lib/adminGuard";
export { requireOrgUser, blockOrgUser } from "../lib/orgGuard";

type AnyCtx = QueryCtx | MutationCtx | ActionCtx;

/**
 * Require an authenticated Clerk user. Throws otherwise. Returns the identity
 * so callers can read `identity.subject` (Clerk user id) without re-fetching.
 */
export async function requireUser(ctx: AnyCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthorized");
  }
  return identity;
}

/**
 * Verify the caller is the owner of `doc`. Throws if not authenticated, the
 * doc is missing, or the owner field does not match the caller's Clerk id.
 *
 * `ownerField` defaults to "ownerId" but most LLP tables use "userId",
 * "clerkId", or "createdBy" / "createdByClerkId". Pass the correct field for
 * the table being checked.
 */
export async function requireOwner<T extends Record<string, unknown> | null>(
  ctx: QueryCtx | MutationCtx,
  doc: T,
  ownerField: string = "ownerId",
) {
  const identity = await requireUser(ctx);
  if (!doc) {
    throw new ConvexError("Not found");
  }
  const owner = (doc as Record<string, unknown>)[ownerField];
  if (typeof owner !== "string" || owner !== identity.subject) {
    throw new ConvexError("Forbidden");
  }
  return identity;
}

/**
 * Require either admin OR ownership. Useful for "user can edit their own X,
 * admin can edit anyone's X" patterns.
 */
export async function requireAdminOrOwner<T extends Record<string, unknown> | null>(
  ctx: QueryCtx | MutationCtx,
  doc: T,
  ownerField: string = "ownerId",
) {
  const identity = await requireUser(ctx);
  const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
  if (role === "admin") return identity;

  // DB fallback for admin (mirrors lib/adminGuard.ts).
  const member = await ctx.db
    .query("ctTeamMembers")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .first();
  if (member?.dashboardRole === "super_admin" && member.isActive) {
    return identity;
  }

  if (!doc) throw new ConvexError("Not found");
  const owner = (doc as Record<string, unknown>)[ownerField];
  if (typeof owner !== "string" || owner !== identity.subject) {
    throw new ConvexError("Forbidden");
  }
  return identity;
}

/**
 * Require the caller's Clerk subject to equal `targetUserId`. Used for
 * handlers keyed by `userId` arg (e.g. listByUser, getByUserId) where the
 * client passes their own Clerk id and we just need to verify it really is
 * theirs.
 */
export async function requireSelf(ctx: AnyCtx, targetUserId: string) {
  const identity = await requireUser(ctx);
  if (identity.subject !== targetUserId) {
    throw new ConvexError("Forbidden");
  }
  return identity;
}

/**
 * Require admin OR self. Admins can read any user's data, otherwise the
 * caller must be reading their own.
 */
export async function requireAdminOrSelf(
  ctx: QueryCtx | MutationCtx,
  targetUserId: string,
) {
  const identity = await requireUser(ctx);
  const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
  if (role === "admin") return identity;

  const member = await ctx.db
    .query("ctTeamMembers")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .first();
  if (member?.dashboardRole === "super_admin" && member.isActive) {
    return identity;
  }

  if (identity.subject !== targetUserId) {
    throw new ConvexError("Forbidden");
  }
  return identity;
}
