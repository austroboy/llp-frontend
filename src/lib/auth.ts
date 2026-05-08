/**
 * Shared auth helpers for role / capability checks against Clerk metadata.
 *
 * The codebase uses two distinct concepts:
 *  - `role`: the user's access tier (e.g. "admin"). 53+ files check this directly.
 *  - `isMasterAdmin`: a capability flag granting access to security-sensitive
 *    features (Email Users management, Email Routing). Master admins still
 *    carry `role: "admin"` so all existing role checks continue to pass.
 */

interface PublicMetadata {
  role?: string;
  isMasterAdmin?: boolean;
  [key: string]: unknown;
}

/**
 * Returns true if the given Clerk user has the master admin capability.
 * Works with both server-side (`currentUser()`) and client-side (`useUser()`)
 * user objects since both expose `publicMetadata`.
 */
export function isMasterAdmin(
  user: { publicMetadata?: unknown } | null | undefined
): boolean {
  if (!user) return false;
  const meta = user.publicMetadata as PublicMetadata | undefined;
  return meta?.isMasterAdmin === true;
}
