import { NextRequest } from "next/server";

/**
 * Same-origin CSRF guard for admin destructive endpoints (H-4).
 *
 * Verifies the request's `Origin` (preferred) or `Referer` header host
 * matches the request `Host`. Same-origin POST/PATCH/DELETE from the SPA
 * always carries one of these; cross-origin form submits / image-tag GETs
 * either omit them or set them to a different host, which we reject.
 *
 * Apply AFTER `requireAdminUser()` so a 401/403 takes priority over a
 * CSRF 403 — failed auth must not leak whether origin checks would pass.
 */
export function assertSameOrigin(req: NextRequest): { ok: true } | { ok: false; reason: string } {
  // Vercel forwards origin/host; both should match in same-origin requests.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  const referer = req.headers.get("referer");

  // Same-origin POST from the SPA always sends Origin === `https://${host}`.
  if (origin && host) {
    try {
      const o = new URL(origin);
      if (o.host === host) return { ok: true };
    } catch { /* fallthrough */ }
  }
  // Some CDN/edge configs strip Origin on same-origin POSTs; fall back to Referer.
  if (referer && host) {
    try {
      const r = new URL(referer);
      if (r.host === host) return { ok: true };
    } catch { /* fallthrough */ }
  }
  return { ok: false, reason: "cross_origin_or_missing_origin" };
}
