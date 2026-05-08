import type { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Require the caller to be an authenticated admin user.
 *
 * Check order:
 *   1. JWT claim: identity.publicMetadata.role === "admin"
 *   2. DB fallback: ctTeamMembers record with super_admin role
 *      (covers cases where Clerk JWT template doesn't include
 *       publicMetadata, or the token hasn't refreshed yet)
 *
 * Returns the identity on success, throws on failure.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  // 1. JWT claim (fast path — works when Clerk JWT template includes publicMetadata)
  const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
  if (role === "admin") return identity;

  // 2. DB fallback — check ctTeamMembers for super_admin role
  const member = await ctx.db
    .query("ctTeamMembers")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (member?.dashboardRole === "super_admin" && member.isActive) {
    return identity;
  }

  throw new Error("Admin access required");
}
