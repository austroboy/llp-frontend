import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireUser } from "../_lib/auth";

const mandateStatusValidator = v.union(
  v.literal("received"),
  v.literal("clarification"),
  v.literal("architecture"),
  v.literal("internal_review"),
  v.literal("client_review"),
  v.literal("approved"),
  v.literal("released"),
  v.literal("paused"),
  v.literal("filled"),
  v.literal("closed"),
  v.literal("cancelled_by_client"),
  v.literal("role_filled_internally"),
);

const sourceValidator = v.union(
  v.literal("web_form"),
  v.literal("email"),
  v.literal("jd_upload"),
  v.literal("internal"),
  v.literal("sample_cv")
);

const urgencyValidator = v.union(
  v.literal("standard"),
  v.literal("urgent"),
  v.literal("critical")
);

const mandateTypeValidator = v.union(
  v.literal("exclusive"),
  v.literal("non_exclusive"),
  v.literal("retainer")
);

// --- Queries ---

export const list = query({
  args: {
    status: v.optional(mandateStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let mandates;
    if (args.status) {
      mandates = await ctx.db
        .query("htMandates")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      mandates = await ctx.db.query("htMandates").order("desc").collect();
    }

    // Enrich with client names
    const enriched = await Promise.all(
      mandates.map(async (m) => {
        const client = await ctx.db.get(m.clientId) as { companyName?: string } | null;
        return { ...m, clientName: client?.companyName ?? "Unknown" };
      })
    );
    return enriched;
  },
});

export const getById = query({
  args: { id: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const mandate = await ctx.db.get(args.id);
    if (!mandate) return null;

    const client = await ctx.db.get(mandate.clientId);
    const blueprint = await ctx.db
      .query("htRoleBlueprints")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.id))
      .order("desc")
      .first();
    const submissions = await ctx.db
      .query("htSubmissions")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.id))
      .collect();
    const contactPerson = mandate.contactPersonId
      ? await ctx.db.get(mandate.contactPersonId)
      : null;

    return {
      ...mandate,
      client,
      contactPerson,
      blueprint,
      submissionCount: submissions.length,
      submissionsByStatus: submissions.reduce(
        (acc, s) => {
          acc[s.status] = (acc[s.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  },
});

export const getByClient = query({
  args: { clientId: v.id("htClients") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("htMandates")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .collect();
  },
});

// --- Mutations ---

const mandateSourceValidator = v.optional(v.union(
  v.literal("llp_direct"),
  v.literal("collab_partner"),
  v.literal("shared")
));
const commercialOwnerValidator = v.optional(v.union(
  v.literal("llp"),
  v.literal("partner"),
  v.literal("shared")
));
const clientFacingBrandValidator = v.optional(v.union(
  v.literal("llp"),
  v.literal("partner"),
  v.literal("co_branded")
));
const approvalOwnerValidator = v.optional(v.union(
  v.literal("llp_only"),
  v.literal("partner_only"),
  v.literal("llp_and_partner")
));
const scoutPayoutBasisValidator = v.optional(v.union(
  v.literal("llp_direct_revenue"),
  v.literal("llp_partner_share"),
  v.literal("special_approved")
));

export const create = mutation({
  args: {
    clientId: v.id("htClients"),
    contactPersonId: v.optional(v.id("htClientContacts")),
    source: sourceValidator,
    rawTitle: v.string(),
    rawDescription: v.optional(v.string()),
    rawNotes: v.optional(v.string()),
    jdFileId: v.optional(v.id("_storage")),
    sampleCvFileId: v.optional(v.id("_storage")),
    urgency: urgencyValidator,
    mandateType: mandateTypeValidator,
    assignedAgentId: v.optional(v.string()),
    // Phase 2: Commercial structure
    mandateSource: mandateSourceValidator,
    commercialOwner: commercialOwnerValidator,
    clientFacingBrand: clientFacingBrandValidator,
    approvalOwner: approvalOwnerValidator,
    scoutPayoutBasis: scoutPayoutBasisValidator,
    partnerId: v.optional(v.id("collabPartners")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");

    const now = Date.now();
    return await ctx.db.insert("htMandates", {
      ...args,
      status: "received",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("htMandates"),
    rawTitle: v.optional(v.string()),
    rawDescription: v.optional(v.string()),
    rawNotes: v.optional(v.string()),
    urgency: v.optional(urgencyValidator),
    mandateType: v.optional(mandateTypeValidator),
    assignedAgentId: v.optional(v.string()),
    contactPersonId: v.optional(v.id("htClientContacts")),
    // Phase 2: Commercial structure
    mandateSource: mandateSourceValidator,
    commercialOwner: commercialOwnerValidator,
    clientFacingBrand: clientFacingBrandValidator,
    approvalOwner: approvalOwnerValidator,
    scoutPayoutBasis: scoutPayoutBasisValidator,
    partnerId: v.optional(v.id("collabPartners")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Mandate not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("htMandates"),
    status: mandateStatusValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Mandate not found");

    const now = Date.now();
    const log = existing.communicationLog ?? [];
    if (args.note) {
      log.push({
        timestamp: now,
        channel: "status_change",
        note: `${existing.status} → ${args.status}: ${args.note}`,
      });
    }

    // Auto-log terminal status transitions
    if (
      (args.status === "cancelled_by_client" || args.status === "role_filled_internally") &&
      !args.note
    ) {
      log.push({
        timestamp: now,
        channel: "status_change",
        note: `${existing.status} → ${args.status}`,
        visibility: "internal" as const,
      });
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      communicationLog: log,
      updatedAt: now,
    });
  },
});

export const deleteMandate = mutation({
  args: { id: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const mandate = await ctx.db.get(args.id);
    if (!mandate) throw new Error("Mandate not found");
    await ctx.db.delete(args.id);
  },
});

export const addCommunicationLog = mutation({
  args: {
    id: v.id("htMandates"),
    channel: v.string(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Mandate not found");

    const log = existing.communicationLog ?? [];
    log.push({
      timestamp: Date.now(),
      channel: args.channel,
      note: args.note,
    });

    await ctx.db.patch(args.id, {
      communicationLog: log,
      updatedAt: Date.now(),
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// ── Client Workspace v3.1 Additions ──────────────────────────────────

/** Client confirms an offline-originated mandate */
export const clientConfirm = mutation({
  args: { id: v.id("htMandates") },
  handler: async (ctx, args) => {
    // Defaulted to admin-only: client-confirm endpoint mutates mandate state but
    // the calling client identity isn't bound to the row in this signature. Tighten
    // to admin until the schema is extended to verify caller against a contact link.
    await requireAdmin(ctx);
    const mandate = await ctx.db.get(args.id);
    if (!mandate) throw new Error("Mandate not found");

    await ctx.db.patch(args.id, {
      clientConfirmed: true,
      clientConfirmedAt: Date.now(),
      // Move to next status if it was waiting for client confirmation
      status: mandate.status === "client_review" ? "approved" : mandate.status,
      updatedAt: Date.now(),
    });
  },
});

/** LLP admin updates communication policy stage */
export const updateCommunicationStage = mutation({
  args: {
    id: v.id("htMandates"),
    stage: v.union(
      v.literal("pre_shortlist"),
      v.literal("shortlisted"),
      v.literal("interview"),
      v.literal("offer")
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      communicationStage: args.stage,
      updatedAt: Date.now(),
    });
  },
});
