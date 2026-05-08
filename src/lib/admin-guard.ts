import { currentUser } from "@clerk/nextjs/server";

/**
 * Tier 5 — analytics access roles.
 *
 * The legacy `publicMetadata.role === "admin"` is kept as a backward-compat
 * shim that maps to `super_admin`. New users should be tagged via
 * `publicMetadata.analytics_role` so the four-tier matrix works without
 * the legacy boolean. Drop the legacy branch after every human admin has
 * an `analytics_role`.
 */
export const ANALYTICS_ROLES = [
  "super_admin",
  "growth_admin",
  "tech_admin",
  "read_only",
] as const;

export type AnalyticsRole = (typeof ANALYTICS_ROLES)[number];

interface PublicMetadata {
  role?: string;
  analytics_role?: string;
}

export type AdminUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

/**
 * Pure helper. Returns the resolved analytics role or `null` if the user
 * has neither `analytics_role` nor the legacy `role === "admin"`.
 *
 * Legacy `role === "admin"` is treated as `super_admin` so existing API
 * routes do not break while client tagging catches up.
 */
export function getAnalyticsRole(
  user: AdminUser | null | undefined,
): AnalyticsRole | null {
  if (!user) return null;
  const meta = user.publicMetadata as PublicMetadata | undefined;
  const explicit = meta?.analytics_role;
  if (
    explicit === "super_admin" ||
    explicit === "growth_admin" ||
    explicit === "tech_admin" ||
    explicit === "read_only"
  ) {
    return explicit;
  }
  if (meta?.role === "admin") return "super_admin";
  return null;
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function forbidden(): Response {
  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Backward-compat: any of the four analytics roles OR the legacy
 * `role === "admin"` count as authorised. Existing API routes call this
 * with no expectation of a specific role.
 */
export async function requireAdminUser(): Promise<AdminUser> {
  const user = await currentUser();
  if (!user) throw unauthorized();
  const resolved = getAnalyticsRole(user);
  if (!resolved) throw forbidden();
  return user;
}

/**
 * Tier 5 — strict role gate. Throws 403 if the user's resolved role is
 * not in `allowed`. Use for routes that expose PII or raw event logs
 * (e.g. `/api/admin/analytics/query` for queries that return raw rows).
 */
export async function requireRole(
  allowed: ReadonlyArray<AnalyticsRole>,
): Promise<AdminUser> {
  const user = await currentUser();
  if (!user) throw unauthorized();
  const resolved = getAnalyticsRole(user);
  if (!resolved || !allowed.includes(resolved)) throw forbidden();
  return user;
}
