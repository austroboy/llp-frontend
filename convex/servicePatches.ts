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
/**
 * One-off patch for the V2026.06 services-page feedback.
 *
 * Applies Tanbhir Bhai's six service-data corrections:
 *  (1) E-Visa Extension authority MOHA → DIP (title + authority)
 *  (2) Expatriate TIN price 3,000 → 5,000
 *  (3) "VAT BIN registration" → "BIN Certificate (VAT Registration)"
 *  (4) Acid usage license — authority adds Pourashava/Union Parishad
 *  (5) Deep tubewell permission — authority adds Pourashava/Union Parishad
 *  (6) Group all Work Permit services together, then all Visa services
 *      together via sortOrder allocation in the Expatriate Mobility deck.
 *
 *  Run once via Convex CLI:
 *
 *      pnpm dlx convex run servicePatches:applyV2026_06
 *
 *  Idempotent — running again only patches what hasn't already converged.
 */
import { internalMutation } from "./_generated/server";

const POURASHAVA_NOTE =
  "Pourashava or Union Parishad (per project or business location)";

export const applyV2026_06 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const report: Record<string, string | number> = {};

    // ── (1) E-Visa Extension — MOHA → DIP ────────────────────────────
    const eVisaExt = await ctx.db
      .query("serviceProducts")
      .filter((q) =>
        q.or(
          q.eq(q.field("title"), "E-Visa · Extension (MOHA)"),
          q.eq(q.field("title"), "E-Visa Extension (MOHA)"),
          q.eq(q.field("title"), "E-Visa · Extension"),
          q.eq(q.field("title"), "E-Visa Extension"),
        ),
      )
      .first();

    if (eVisaExt) {
      const correctedAuthority = (eVisaExt.authority ?? "")
        .replace(
          /Ministry of Home Affairs( ?\(MOHA\))?/gi,
          "Department of Immigration & Passports (DIP)",
        )
        .replace(/\bMOHA\b/g, "DIP");

      await ctx.db.patch(eVisaExt._id, {
        title: "E-Visa Extension (DIP)",
        authority:
          correctedAuthority.length > 0
            ? correctedAuthority
            : "Department of Immigration & Passports (DIP)",
        updatedAt: now,
      });
      report.eVisaExtension = "patched";
    } else {
      report.eVisaExtension = "not_found";
    }

    // ── (2) Expatriate TIN — price 3,000 → 5,000 ────────────────────
    const expatTin = await ctx.db
      .query("serviceProducts")
      .filter((q) =>
        q.or(
          q.eq(q.field("title"), "Expatriate TIN"),
          q.eq(q.field("title"), "Expat TIN"),
          q.eq(q.field("title"), "Expatriate TIN registration"),
        ),
      )
      .first();

    if (expatTin) {
      await ctx.db.patch(expatTin._id, {
        price: "BDT 5,000",
        updatedAt: now,
      });
      report.expatriateTin = "patched";
    } else {
      report.expatriateTin = "not_found";
    }

    // ── (3) VAT BIN registration → BIN Certificate (VAT Registration) ─
    const vatBin = await ctx.db
      .query("serviceProducts")
      .filter((q) =>
        q.or(
          q.eq(q.field("title"), "VAT BIN registration"),
          q.eq(q.field("title"), "VAT BIN Registration"),
          q.eq(q.field("title"), "VAT BIN"),
          q.eq(q.field("title"), "BIN Registration"),
        ),
      )
      .first();

    if (vatBin) {
      await ctx.db.patch(vatBin._id, {
        title: "BIN Certificate (VAT Registration)",
        updatedAt: now,
      });
      report.vatBin = "patched";
    } else {
      report.vatBin = "not_found";
    }

    // ── (4) Acid usage license — authority addition ──────────────────
    const acidLicenses = await ctx.db
      .query("serviceProducts")
      .filter((q) =>
        q.or(
          q.eq(q.field("title"), "Acid usage license"),
          q.eq(q.field("title"), "Acid Usage License"),
          q.eq(q.field("title"), "Acid use license"),
        ),
      )
      .collect();

    let acidPatched = 0;
    for (const svc of acidLicenses) {
      if ((svc.authority ?? "").includes(POURASHAVA_NOTE)) continue;
      const newAuthority =
        svc.authority && svc.authority.length > 0
          ? `${svc.authority} · ${POURASHAVA_NOTE}`
          : POURASHAVA_NOTE;
      await ctx.db.patch(svc._id, {
        authority: newAuthority,
        updatedAt: now,
      });
      acidPatched += 1;
    }
    report.acidUsage = acidLicenses.length === 0 ? "not_found" : `patched_${acidPatched}`;

    // ── (5) Deep tubewell permission — authority addition ───────────
    const tubewellPermissions = await ctx.db
      .query("serviceProducts")
      .filter((q) =>
        q.or(
          q.eq(q.field("title"), "Deep tubewell permission"),
          q.eq(q.field("title"), "Deep Tubewell Permission"),
          q.eq(q.field("title"), "Deep tube-well permission"),
          q.eq(q.field("title"), "Deep tube well permission"),
        ),
      )
      .collect();

    let tubewellPatched = 0;
    for (const svc of tubewellPermissions) {
      if ((svc.authority ?? "").includes(POURASHAVA_NOTE)) continue;
      const newAuthority =
        svc.authority && svc.authority.length > 0
          ? `${svc.authority} · ${POURASHAVA_NOTE}`
          : POURASHAVA_NOTE;
      await ctx.db.patch(svc._id, {
        authority: newAuthority,
        updatedAt: now,
      });
      tubewellPatched += 1;
    }
    report.deepTubewell =
      tubewellPermissions.length === 0 ? "not_found" : `patched_${tubewellPatched}`;

    // ── (6) Group: Work Permits cluster, Visas cluster ─────────────
    // Block-allocate sortOrder so all Work Permit cards render together,
    // then all Visa cards, then everything else in the Expatriate Mobility
    // deck. Only writes when the existing sortOrder is wrong, so the
    // patch stays idempotent.
    const expatriateServices = await ctx.db
      .query("serviceProducts")
      .filter((q) => q.eq(q.field("category"), "expatriate"))
      .collect();
    expatriateServices.sort((a, b) => a.sortOrder - b.sortOrder);

    const isWorkPermit = (t: string) =>
      /work\s*permit/i.test(t);
    const isVisa = (t: string) =>
      !isWorkPermit(t) && /\bvisa\b/i.test(t);

    const workPermits = expatriateServices.filter((s) => isWorkPermit(s.title));
    const visas = expatriateServices.filter((s) => isVisa(s.title));
    const others = expatriateServices.filter(
      (s) => !isWorkPermit(s.title) && !isVisa(s.title),
    );

    let cursor = 0;
    let regrouped = 0;
    for (const svc of [...workPermits, ...visas, ...others]) {
      if (svc.sortOrder !== cursor) {
        await ctx.db.patch(svc._id, { sortOrder: cursor, updatedAt: now });
        regrouped += 1;
      }
      cursor += 1;
    }
    report.expatriateRegrouped = `${regrouped}_reordered_of_${expatriateServices.length}`;

    return report;
  },
});
// ─────────────────────────────────────────────────────────────────────
// V2026.07 — Follow-up: Expatriate TIN price 3,000 → 5,000
// (V2026_06 matched plain "Expatriate TIN" but DB uses
//  "Expatriate TIN · Registration" with middle-dot separator.)
//
//   pnpm dlx convex run servicePatches:applyV2026_07 --prod
// ─────────────────────────────────────────────────────────────────────
export const applyV2026_07 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expatTin = await ctx.db
      .query("serviceProducts")
      .filter((q) =>
        q.or(
          q.eq(q.field("title"), "Expatriate TIN · Registration"),
          q.eq(q.field("title"), "Expatriate TIN · registration"),
          q.eq(q.field("title"), "Expatriate TIN · Registration "),
          q.eq(q.field("title"), "Expatriate TIN"),
          q.eq(q.field("title"), "Expat TIN"),
        ),
      )
      .first();

    if (!expatTin) {
      return { expatriateTin: "not_found", searched_titles: 5 };
    }

    await ctx.db.patch(expatTin._id, {
      price: "Starting from BDT 5,000 + VAT",
      updatedAt: now,
    });

    return {
      expatriateTin: "patched",
      title: expatTin.title,
      old_price: expatTin.price,
      new_price: "Starting from BDT 5,000 + VAT",
    };
  },
});

