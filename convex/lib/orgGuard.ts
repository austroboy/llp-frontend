import type { QueryCtx, MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";

/**
 * Server-side backstop for the frontend OrgGuard component.
 *
 * Throws if the authenticated user is an organization account. Returns the
 * identity (or null if unauthenticated) so callers can reuse it.
 *
 * Behavior:
 *   - Authenticated + publicMetadata.accountType === "organization" → throws
 *   - Authenticated + anything else                                  → returns identity
 *   - Unauthenticated                                                → returns null
 *
 * Used by mutations that power individual-only flows (scout join, expert
 * apply, candidate apply) to prevent org users from POSTing directly past
 * the UI guard.
 */
export async function blockOrgUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const metadata = identity.publicMetadata as { accountType?: string } | undefined;
  if (metadata?.accountType === "organization") {
    throw new ConvexError(
      "This action is restricted to individual professional accounts. Organization accounts cannot apply through this flow."
    );
  }

  return identity;
}

/**
 * Server-side backstop for org-only flows (LLP Services request, Headhunting
 * hire/new). Mirrors `blockOrgUser` but in reverse: requires the caller to be
 * an authenticated organization user, otherwise throws.
 *
 * Behavior:
 *   - Authenticated + publicMetadata.accountType === "organization" → returns identity
 *   - Authenticated + organizations table has record for this user  → returns identity
 *     (covers freshly-signed-up org users whose JWT hasn't refreshed yet)
 *   - Authenticated + anything else                                  → throws (individual)
 *   - Unauthenticated                                                → throws (guest)
 *
 * The DB fallback queries the organizations table by createdByClerkId so that
 * org users can submit immediately even if their Clerk publicMetadata hasn't
 * propagated to the Convex JWT token yet (e.g. finalize-org just completed but
 * the JWT hasn't refreshed).
 */
export async function requireOrgUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError(
      "Sign in with an organization account to continue. Personal accounts cannot access this flow."
    );
  }

  const publicMeta = identity.publicMetadata as { accountType?: string } | undefined;

  if (publicMeta?.accountType === "organization") {
    return identity;
  }

  // DB fallback: the JWT may not yet reflect the user's org status (e.g.
  // finalize-org just promoted publicMetadata but the token hasn't refreshed).
  // Check the organizations table directly.
  const clerkId = identity.subject;
  const orgRecord = await ctx.db
    .query("organizations")
    .withIndex("by_creator", (q) => q.eq("createdByClerkId", clerkId))
    .first();

  if (orgRecord) {
    return identity;
  }

  throw new ConvexError(
    "This action is restricted to organization accounts. Please create an organization account to continue."
  );
}
