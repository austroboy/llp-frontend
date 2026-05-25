/**
 * One-off patch for the V2026.05 services-page feedback.
 *
 * Applies the markup changes Tanbhir Bhai sent on the Headhunting (III.1)
 * and Placement & Outplacement (III.2) cards. Run once via Convex CLI:
 *
 *     pnpm dlx convex run servicePatches:applyV2026_05
 *
 * Idempotent — running again has no effect if the target services aren't
 * found or already match the new values.
 */
import { internalMutation } from "./_generated/server";

export const applyV2026_05 = internalMutation({
  args: {},
  handler: async (ctx) => {
    // --- Patch 1: Executive search · Head hunting (III.1) ----------------
    // - Authority    → "LLP Headhunting Workflow" (link target on the page)
    // - Duration     → "Standard"
    // - Price        → "Scope-defined pricing"
    // - Notes/desc   → "Fee varies by role level, timeline, and service depth"
    const headhunting = await ctx.db
      .query("serviceProducts")
      .filter((q) =>
        q.or(
          q.eq(q.field("title"), "Executive search · Head hunting"),
          q.eq(q.field("title"), "Executive search · Headhunting"),
        ),
      )
      .first();

    if (headhunting) {
      await ctx.db.patch(headhunting._id, {
        authority: "LLP Headhunting Workflow",
        deliveryTimeline: "Standard",
        price: "Scope-defined pricing",
        notes: "Fee varies by role level, timeline, and service depth.",
        updatedAt: Date.now(),
      });
    }

    // --- Patch 2: Placement and outplacement (III.2) ----------------------
    // - Price        → "Scope-defined pricing"
    // - Notes        → "Fee varies by role level, timeline, and service depth"
    const placement = await ctx.db
      .query("serviceProducts")
      .filter((q) =>
        q.or(
          q.eq(q.field("title"), "Placement and outplacement"),
          q.eq(q.field("title"), "Placement & outplacement"),
        ),
      )
      .first();

    if (placement) {
      await ctx.db.patch(placement._id, {
        price: "Scope-defined pricing",
        notes: "Fee varies by role level, timeline, and service depth.",
        updatedAt: Date.now(),
      });
    }

    // --- Patch 3: I.10 Work permit · Amendment and I.11 Work permit ·
    // Cancellation. PDF markup boxes out "(bidaquickserv.org)" in the
    // authority string for both cards. The portal URL stays on all other
    // BIDA filings (I.1, I.4, etc.) so we narrowly target these two titles.
    const workPermitTargets = await ctx.db
      .query("serviceProducts")
      .filter((q) =>
        q.or(
          q.eq(q.field("title"), "Work permit · Amendment"),
          q.eq(q.field("title"), "Work permit · Cancellation"),
        ),
      )
      .collect();

    let bidaCleaned = 0;
    for (const svc of workPermitTargets) {
      if (svc.authority && svc.authority.includes("(bidaquickserv.org)")) {
        const cleaned = svc.authority
          .replace(/\s*·\s*OSS Portal\s*\(bidaquickserv\.org\)\s*/g, "")
          .replace(/\s*\(bidaquickserv\.org\)\s*/g, "")
          .trim();
        if (cleaned !== svc.authority) {
          await ctx.db.patch(svc._id, {
            authority: cleaned,
            updatedAt: Date.now(),
          });
          bidaCleaned += 1;
        }
      }
    }

    return {
      headhunting: headhunting ? "patched" : "not_found",
      placement: placement ? "patched" : "not_found",
      bida_portal_url_cleaned: bidaCleaned,
    };
  },
});
