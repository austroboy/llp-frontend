/**
 * Shared Cloudflare API constants + helpers.
 *
 * Two routes consume Cloudflare:
 *  - `src/app/api/admin/email-routing/route.ts`   — manages routing rules
 *  - `src/app/api/admin/email-analytics/route.ts` — Phase B inbound stats
 *
 * Token / IDs / base URL live here so both files stay in sync. All three
 * sensitive values come from env; we fail-closed if `CLOUDFLARE_API_TOKEN`
 * is missing so we never silently call Cloudflare with a stale or
 * accidentally-baked-in token.
 *
 * NB: scope of the token in production currently covers Email Routing rules
 * + addresses, but NOT Zone Analytics. The Phase B endpoint handles per-call
 * failures gracefully so a missing Analytics scope only nulls out the
 * `inbound.timeseries` / `inbound.summary` payload — config + DNS still load.
 */

const _CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!_CF_TOKEN && process.env.NODE_ENV === "production") {
  throw new Error("CLOUDFLARE_API_TOKEN env required");
}
export const CF_TOKEN = _CF_TOKEN || "";

export const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || "";
export const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
export const CF_BASE = "https://api.cloudflare.com/client/v4";
export const CF_GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";

export const CF_HEADERS = {
  Authorization: `Bearer ${CF_TOKEN}`,
  "Content-Type": "application/json",
} as const;

/** Standard Cloudflare REST envelope. */
export interface CfResponse<T> {
  success: boolean;
  errors: { code: number; message: string }[];
  result: T;
}
