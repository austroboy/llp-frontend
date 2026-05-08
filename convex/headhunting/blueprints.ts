import { query, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { requireOrgUser } from "../lib/orgGuard";
import { requireAdmin } from "../_lib/auth";
import { logAudit } from "./blueprintAuditLog";

// ─── Validators ──────────────────────────────────────────────────

const confidentialityValidator = v.union(
  v.literal("full_mask"),
  v.literal("partial_clue"),
  v.literal("disclosed"),
  v.literal("highly_confidential"),
  v.literal("executive_confidential")
);

const compensationValidator = v.union(
  v.literal("revenue_share"),
  v.literal("fixed_bounty")
);

const blueprintStatusValidator = v.union(
  // Original statuses (backward compat)
  v.literal("draft"),
  v.literal("internal_approved"),
  v.literal("client_approved"),
  v.literal("released"),
  // Extended lifecycle statuses
  v.literal("ready_for_client_validation"),
  v.literal("sent_to_client"),
  v.literal("returned_with_revisions"),
  v.literal("finalized_by_client"),
  v.literal("brief_generated"),
  v.literal("release_ready"),
  v.literal("released_to_scouts")
);

const lifecycleStatusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("cancelled"),
  v.literal("archived")
);

const roleBandValidator = v.union(
  v.literal("entry_junior"),
  v.literal("management_functional"),
  v.literal("executive_clevel")
);

// ─── Status Transition Map ───────────────────────────────────────

type BlueprintStatus =
  | "draft"
  | "internal_approved"
  | "client_approved"
  | "released"
  | "ready_for_client_validation"
  | "sent_to_client"
  | "returned_with_revisions"
  | "finalized_by_client"
  | "brief_generated"
  | "release_ready"
  | "released_to_scouts";

const VALID_TRANSITIONS: Record<BlueprintStatus, BlueprintStatus[]> = {
  draft: ["ready_for_client_validation", "internal_approved"],
  internal_approved: ["client_approved"],
  client_approved: ["released"],
  released: [],
  ready_for_client_validation: ["sent_to_client", "draft"],
  sent_to_client: ["finalized_by_client", "returned_with_revisions"],
  returned_with_revisions: ["sent_to_client"],
  finalized_by_client: ["brief_generated"],
  brief_generated: ["release_ready", "finalized_by_client"],
  release_ready: ["released_to_scouts", "brief_generated"],
  released_to_scouts: [],
};

// ─── Queries ─────────────────────────────────────────────────────

export const list = query({
  args: {
    status: v.optional(blueprintStatusValidator),
    lifecycleStatus: v.optional(lifecycleStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    let q;

    if (args.status) {
      q = ctx.db
        .query("htRoleBlueprints")
        .withIndex("by_status", (idx) => idx.eq("status", args.status!));
    } else if (args.lifecycleStatus) {
      q = ctx.db
        .query("htRoleBlueprints")
        .withIndex("by_lifecycle", (idx) =>
          idx.eq("lifecycleStatus", args.lifecycleStatus!)
        );
    } else {
      q = ctx.db.query("htRoleBlueprints");
    }

    const results = await q.order("desc").collect();

    // Post-filter if both filters are set
    if (args.status && args.lifecycleStatus) {
      return results.filter(
        (bp) => bp.lifecycleStatus === args.lifecycleStatus
      );
    }

    return results;
  },
});

export const getById = query({
  args: { id: v.id("htRoleBlueprints") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    return await ctx.db.get(args.id);
  },
});

export const getByMandate = query({
  args: { mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    return await ctx.db
      .query("htRoleBlueprints")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .order("desc")
      .collect();
  },
});

export const getLatestByMandate = query({
  args: { mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    return await ctx.db
      .query("htRoleBlueprints")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .order("desc")
      .first();
  },
});

// public read: token-based access for client validation page (no auth required —
// security is provided by random token + expiry; mirrors clientApproveValidation
// mutation which also accepts unauthenticated token-bearing callers).
export const getByValidationToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const bp = await ctx.db
      .query("htRoleBlueprints")
      .withIndex("by_validation_token", (q) =>
        q.eq("validationToken", args.token)
      )
      .first();

    if (!bp) return null;

    // Check expiry
    if (
      bp.validationTokenExpiresAt &&
      Date.now() > bp.validationTokenExpiresAt
    ) {
      return null;
    }

    return bp;
  },
});

// Resolve client contact info for a blueprint (for validation emails)
export const getClientContact = query({
  args: { id: v.id("htRoleBlueprints") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    const bp = await ctx.db.get(args.id);
    if (!bp) return null;

    const mandate = await ctx.db.get(bp.mandateId);
    if (!mandate) return null;

    const client = await ctx.db.get(mandate.clientId);
    if (!client) return null;

    // Try to get primary contact first, then any contact
    const contacts = await ctx.db
      .query("htClientContacts")
      .withIndex("by_client", (q) => q.eq("clientId", mandate.clientId))
      .collect();

    const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0] ?? null;

    return {
      companyName: client.companyName,
      contactName: primaryContact?.name ?? null,
      contactEmail: primaryContact?.email ?? null,
      contactPhone: primaryContact?.phone ?? null,
    };
  },
});

export const search = query({
  args: {
    searchText: v.string(),
    status: v.optional(blueprintStatusValidator),
    roleBand: v.optional(roleBandValidator),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    let q = ctx.db
      .query("htRoleBlueprints")
      .withSearchIndex("search_title", (idx) => {
        let search = idx.search("title", args.searchText);
        if (args.status) search = search.eq("status", args.status);
        if (args.roleBand) search = search.eq("roleBand", args.roleBand);
        return search;
      });

    return await q.take(50);
  },
});

// ─── Mutations ───────────────────────────────────────────────────

export const create = mutation({
  args: {
    mandateId: v.id("htMandates"),
    title: v.string(),
    function: v.optional(v.string()),
    seniority: v.optional(v.string()),
    department: v.optional(v.string()),
    reportingLine: v.optional(v.string()),
    location: v.optional(v.string()),
    travelRequired: v.optional(v.boolean()),
    businessStage: v.optional(v.string()),
    stakeholderComplexity: v.optional(v.string()),
    environmentDescription: v.optional(v.string()),
    industry: v.optional(v.string()),
    teamSize: v.optional(v.string()),
    exposureType: v.optional(
      v.union(
        v.literal("plant"),
        v.literal("project"),
        v.literal("corporate"),
        v.literal("mixed")
      )
    ),
    greenBrownField: v.optional(
      v.union(
        v.literal("greenfield"),
        v.literal("brownfield"),
        v.literal("both")
      )
    ),
    preferredAttributes: v.optional(v.array(v.string())),
    disqualifiers: v.optional(v.array(v.string())),
    geography: v.optional(v.string()),
    mustHaves: v.optional(v.array(v.string())),
    dealBreakers: v.optional(v.array(v.string())),
    criticalMatchPoints: v.optional(v.array(v.string())),
    generalMatchPoints: v.optional(v.array(v.string())),
    targetSectors: v.optional(v.array(v.string())),
    searchNotes: v.optional(v.string()),
    confidentialityLevel: v.optional(confidentialityValidator),
    shortlistMin: v.optional(v.number()),
    shortlistMax: v.optional(v.number()),
    compensationMode: v.optional(compensationValidator),
    roleBand: v.optional(roleBandValidator),
    assignedTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const mandate = await ctx.db.get(args.mandateId);
    if (!mandate) throw new ConvexError("Mandate not found");

    // Get current version count
    const existing = await ctx.db
      .query("htRoleBlueprints")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .collect();

    const now = Date.now();
    return await ctx.db.insert("htRoleBlueprints", {
      ...args,
      mustHaves: args.mustHaves ?? [],
      criticalMatchPoints: args.criticalMatchPoints ?? [],
      confidentialityLevel: args.confidentialityLevel ?? "full_mask",
      shortlistMin: args.shortlistMin ?? 3,
      shortlistMax: args.shortlistMax ?? 5,
      compensationMode: args.compensationMode ?? "revenue_share",
      version: existing.length + 1,
      status: "draft",
      lifecycleStatus: "active",
      statusHistory: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateField = mutation({
  args: {
    id: v.id("htRoleBlueprints"),
    field: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const bp = await ctx.db.get(args.id);
    if (!bp) throw new ConvexError("Blueprint not found");

    if (bp.status !== "draft" && bp.status !== "returned_with_revisions") {
      throw new ConvexError(
        "Blueprint can only be edited in draft or returned_with_revisions status"
      );
    }

    // Prevent editing system fields
    const protectedFields = [
      "_id",
      "_creationTime",
      "mandateId",
      "version",
      "status",
      "createdAt",
      "statusHistory",
      "validationToken",
      "validationTokenExpiresAt",
    ];
    if (protectedFields.includes(args.field)) {
      throw new ConvexError(`Cannot directly edit protected field: ${args.field}`);
    }

    await ctx.db.patch(args.id, {
      [args.field]: args.value,
      updatedAt: Date.now(),
    });
  },
});

export const updateFields = mutation({
  args: {
    id: v.id("htRoleBlueprints"),
    fields: v.any(), // Record<string, unknown>
  },
  handler: async (ctx, args) => {
    const identity = await requireOrgUser(ctx);

    const bp = await ctx.db.get(args.id);
    if (!bp) throw new ConvexError("Blueprint not found");

    if (bp.status !== "draft" && bp.status !== "returned_with_revisions") {
      throw new ConvexError(
        "Blueprint can only be edited in draft or returned_with_revisions status"
      );
    }

    const protectedFields = new Set([
      "_id",
      "_creationTime",
      "mandateId",
      "version",
      "status",
      "createdAt",
      "statusHistory",
      "validationToken",
      "validationTokenExpiresAt",
    ]);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    const changedFields: { field: string; oldValue: string; newValue: string }[] = [];

    for (const [key, value] of Object.entries(
      args.fields as Record<string, unknown>
    )) {
      if (protectedFields.has(key)) {
        throw new ConvexError(`Cannot directly edit protected field: ${key}`);
      }
      if (value !== undefined) {
        updates[key] = value;
        // Track changes for audit
        const oldVal = (bp as Record<string, unknown>)[key];
        changedFields.push({
          field: key,
          oldValue: oldVal !== undefined ? JSON.stringify(oldVal) : "",
          newValue: JSON.stringify(value),
        });
      }
    }

    await ctx.db.patch(args.id, updates);

    // Audit log: field_changed (batch all changes into one entry with metadata)
    if (changedFields.length > 0) {
      await logAudit(ctx, args.id, "field_changed", {
        fieldPath: changedFields.map((c) => c.field).join(", "),
        oldValue: changedFields.length === 1 ? changedFields[0].oldValue : undefined,
        newValue: changedFields.length === 1 ? changedFields[0].newValue : undefined,
        metadata: { changedFields },
        performedBy: identity.subject,
      });
    }
  },
});

export const transitionStatus = mutation({
  args: {
    id: v.id("htRoleBlueprints"),
    targetStatus: blueprintStatusValidator,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrgUser(ctx);

    const bp = await ctx.db.get(args.id);
    if (!bp) throw new ConvexError("Blueprint not found");

    const currentStatus = bp.status as BlueprintStatus;
    const targetStatus = args.targetStatus as BlueprintStatus;

    // Check lifecycle allows transitions
    if (bp.lifecycleStatus === "cancelled" || bp.lifecycleStatus === "archived") {
      throw new ConvexError(
        `Cannot transition status of a ${bp.lifecycleStatus} blueprint`
      );
    }
    if (bp.lifecycleStatus === "paused") {
      throw new ConvexError(
        "Blueprint is paused. Resume it before changing status."
      );
    }

    // Validate transition is allowed
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new ConvexError(
        `Invalid status transition: ${currentStatus} -> ${targetStatus}. Allowed targets: ${(allowed || []).join(", ") || "none"}`
      );
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: targetStatus,
      updatedAt: now,
    };

    // ── Transition-specific guards and side effects ──

    // draft -> ready_for_client_validation: validate minimum fields
    if (targetStatus === "ready_for_client_validation") {
      const missing: string[] = [];
      if (!bp.title) missing.push("title");
      if (!bp.roleBand) missing.push("roleBand");
      if (!bp.function) missing.push("function");
      if (!bp.location && !bp.searchGeography) {
        missing.push("location or searchGeography");
      }
      const hasMustHaves =
        (bp.mustHaves && bp.mustHaves.length > 0) ||
        (bp.mustHaveDetails && bp.mustHaveDetails.length > 0);
      if (!hasMustHaves) missing.push("mustHaves or mustHaveDetails");
      const hasCritical =
        (bp.criticalMatchPoints && bp.criticalMatchPoints.length > 0) ||
        (bp.criticalMatchDetails && bp.criticalMatchDetails.length > 0);
      if (!hasCritical) {
        missing.push("criticalMatchPoints or criticalMatchDetails");
      }

      if (missing.length > 0) {
        throw new ConvexError(
          `Cannot move to ready_for_client_validation. Missing: ${missing.join(", ")}`
        );
      }
    }

    // ready_for_client_validation -> sent_to_client: generate validation token
    if (targetStatus === "sent_to_client") {
      const token = crypto.randomUUID();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      updates.validationToken = token;
      updates.validationTokenExpiresAt = now + thirtyDays;
      updates.clientValidationSentAt = now;
    }

    // sent_to_client -> finalized_by_client: record timestamp
    if (targetStatus === "finalized_by_client") {
      updates.clientFinalizedAt = now;
    }

    // brief_generated -> release_ready: check selectedScoutIds
    if (targetStatus === "release_ready") {
      if (!bp.selectedScoutIds || bp.selectedScoutIds.length === 0) {
        throw new ConvexError(
          "Cannot move to release_ready without at least one scout selected"
        );
      }
    }

    // release_ready -> released_to_scouts: set releasedAt, check exec approval
    if (targetStatus === "released_to_scouts") {
      if (bp.roleBand === "executive_clevel" && !bp.releaseApprovedBy) {
        throw new ConvexError(
          "Executive/C-level blueprints require explicit release approval (releaseApprovedBy) before release to scouts"
        );
      }
      updates.releasedAt = now;
    }

    // Log transition in status history
    const historyEntry = {
      from: currentStatus,
      to: targetStatus,
      changedBy: identity.subject,
      changedAt: now,
      reason: args.reason,
    };
    const existingHistory = bp.statusHistory ?? [];
    updates.statusHistory = [...existingHistory, historyEntry];

    await ctx.db.patch(args.id, updates);

    // Audit log: status_changed
    await logAudit(ctx, args.id, "status_changed", {
      oldValue: currentStatus,
      newValue: targetStatus,
      rationale: args.reason,
      performedBy: identity.subject,
    });
  },
});

export const setLifecycleStatus = mutation({
  args: {
    id: v.id("htRoleBlueprints"),
    lifecycleStatus: lifecycleStatusValidator,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const bp = await ctx.db.get(args.id);
    if (!bp) throw new ConvexError("Blueprint not found");

    const current = bp.lifecycleStatus ?? "active";

    // Terminal states cannot be changed
    if (current === "cancelled") {
      throw new ConvexError("Cancelled blueprints cannot change lifecycle status");
    }
    if (current === "archived") {
      throw new ConvexError("Archived blueprints cannot change lifecycle status");
    }

    // Validate allowed transitions
    if (args.lifecycleStatus === "active" && current !== "paused") {
      throw new ConvexError(
        "Only paused blueprints can be resumed to active"
      );
    }

    const updates: Record<string, unknown> = {
      lifecycleStatus: args.lifecycleStatus,
      updatedAt: Date.now(),
    };

    if (args.lifecycleStatus === "paused") {
      updates.pauseReason = args.reason ?? null;
    }
    if (args.lifecycleStatus === "cancelled") {
      updates.cancelReason = args.reason ?? null;
    }

    await ctx.db.patch(args.id, updates);
  },
});

export const clientApproveValidation = mutation({
  args: {
    token: v.string(),
    action: v.union(v.literal("approve"), v.literal("revise")),
    revisions: v.optional(v.any()),
    generalNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // No auth required — token-based access for public validation page
    const bp = await ctx.db
      .query("htRoleBlueprints")
      .withIndex("by_validation_token", (q) =>
        q.eq("validationToken", args.token)
      )
      .first();

    if (!bp) {
      throw new ConvexError("Invalid or expired validation token");
    }

    if (
      bp.validationTokenExpiresAt &&
      Date.now() > bp.validationTokenExpiresAt
    ) {
      throw new ConvexError(
        "Validation token has expired. Please request a new validation link."
      );
    }

    if (bp.status !== "sent_to_client") {
      throw new ConvexError(
        `Blueprint is not awaiting client validation (current status: ${bp.status})`
      );
    }

    const now = Date.now();
    const historyEntry = {
      from: bp.status,
      to:
        args.action === "approve"
          ? "finalized_by_client"
          : "returned_with_revisions",
      changedBy: "client_validation",
      changedAt: now,
      reason:
        args.action === "approve"
          ? "Client approved via validation link"
          : "Client requested revisions via validation link",
    };
    const existingHistory = bp.statusHistory ?? [];

    if (args.action === "approve") {
      await ctx.db.patch(bp._id, {
        status: "finalized_by_client",
        clientFinalizedAt: now,
        clientGeneralNote: args.generalNote,
        statusHistory: [...existingHistory, historyEntry],
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(bp._id, {
        status: "returned_with_revisions",
        clientRevisions: args.revisions,
        clientGeneralNote: args.generalNote,
        statusHistory: [...existingHistory, historyEntry],
        updatedAt: now,
      });
    }
  },
});

export const selectScouts = mutation({
  args: {
    id: v.id("htRoleBlueprints"),
    scoutIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrgUser(ctx);

    const bp = await ctx.db.get(args.id);
    if (!bp) throw new ConvexError("Blueprint not found");

    if (args.scoutIds.length === 0) {
      throw new ConvexError("Must select at least one scout");
    }

    const previousScoutIds = bp.selectedScoutIds ?? [];

    await ctx.db.patch(args.id, {
      selectedScoutIds: args.scoutIds,
      updatedAt: Date.now(),
    });

    // Audit log: scout_selection
    await logAudit(ctx, args.id, "scout_selection", {
      oldValue: previousScoutIds.length > 0 ? JSON.stringify(previousScoutIds) : undefined,
      newValue: JSON.stringify(args.scoutIds),
      metadata: {
        previousCount: previousScoutIds.length,
        newCount: args.scoutIds.length,
        added: args.scoutIds.filter((id) => !previousScoutIds.includes(id)),
        removed: previousScoutIds.filter((id) => !args.scoutIds.includes(id)),
      },
      performedBy: identity.subject,
    });
  },
});

export const setReleaseApproval = mutation({
  args: {
    id: v.id("htRoleBlueprints"),
    approvedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrgUser(ctx);

    const bp = await ctx.db.get(args.id);
    if (!bp) throw new ConvexError("Blueprint not found");

    await ctx.db.patch(args.id, {
      releaseApprovedBy: args.approvedBy,
      releaseApprovedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Audit log: release_decision
    await logAudit(ctx, args.id, "release_decision", {
      newValue: args.approvedBy,
      rationale: `Release approved by ${args.approvedBy}`,
      performedBy: identity.subject,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireOrgUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const addSourceDocument = mutation({
  args: {
    id: v.id("htRoleBlueprints"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const bp = await ctx.db.get(args.id);
    if (!bp) throw new ConvexError("Blueprint not found");

    const existing = bp.sourceDocumentIds ?? [];
    await ctx.db.patch(args.id, {
      sourceDocumentIds: [...existing, args.storageId],
      updatedAt: Date.now(),
    });
  },
});

// ─── Legacy-compatible mutations ─────────────────────────────────
// Kept for backward compatibility with existing code paths

export const update = mutation({
  args: {
    id: v.id("htRoleBlueprints"),
    title: v.optional(v.string()),
    function: v.optional(v.string()),
    seniority: v.optional(v.string()),
    department: v.optional(v.string()),
    reportingLine: v.optional(v.string()),
    location: v.optional(v.string()),
    travelRequired: v.optional(v.boolean()),
    businessStage: v.optional(v.string()),
    stakeholderComplexity: v.optional(v.string()),
    environmentDescription: v.optional(v.string()),
    mustHaves: v.optional(v.array(v.string())),
    dealBreakers: v.optional(v.array(v.string())),
    criticalMatchPoints: v.optional(v.array(v.string())),
    generalMatchPoints: v.optional(v.array(v.string())),
    targetSectors: v.optional(v.array(v.string())),
    searchNotes: v.optional(v.string()),
    confidentialityLevel: v.optional(confidentialityValidator),
    shortlistMin: v.optional(v.number()),
    shortlistMax: v.optional(v.number()),
    compensationMode: v.optional(compensationValidator),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("Blueprint not found");
    if (
      existing.status !== "draft" &&
      existing.status !== "returned_with_revisions"
    ) {
      throw new ConvexError(
        "Only draft or returned blueprints can be edited. Create a new version instead."
      );
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

export const approve = mutation({
  args: {
    id: v.id("htRoleBlueprints"),
    approvedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const bp = await ctx.db.get(args.id);
    if (!bp) throw new ConvexError("Blueprint not found");
    if (bp.status !== "draft")
      throw new ConvexError("Blueprint is not in draft status");

    const now = Date.now();
    const historyEntry = {
      from: "draft",
      to: "internal_approved",
      changedBy: args.approvedBy,
      changedAt: now,
    };
    const existingHistory = bp.statusHistory ?? [];

    await ctx.db.patch(args.id, {
      status: "internal_approved",
      approvedBy: args.approvedBy,
      approvedAt: now,
      statusHistory: [...existingHistory, historyEntry],
      updatedAt: now,
    });

    // Move mandate to internal_review
    await ctx.db.patch(bp.mandateId, {
      status: "internal_review",
      updatedAt: now,
    });
  },
});

export const clientApprove = mutation({
  args: {
    id: v.id("htRoleBlueprints"),
    clientApprovedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const bp = await ctx.db.get(args.id);
    if (!bp) throw new ConvexError("Blueprint not found");
    if (bp.status !== "internal_approved") {
      throw new ConvexError("Blueprint must be internally approved first");
    }

    const now = Date.now();
    const historyEntry = {
      from: "internal_approved",
      to: "client_approved",
      changedBy: args.clientApprovedBy,
      changedAt: now,
    };
    const existingHistory = bp.statusHistory ?? [];

    await ctx.db.patch(args.id, {
      status: "client_approved",
      clientApprovedBy: args.clientApprovedBy,
      clientApprovedAt: now,
      statusHistory: [...existingHistory, historyEntry],
      updatedAt: now,
    });

    // Move mandate to approved
    await ctx.db.patch(bp.mandateId, {
      status: "approved",
      updatedAt: now,
    });
  },
});

export const release = mutation({
  args: { id: v.id("htRoleBlueprints") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const bp = await ctx.db.get(args.id);
    if (!bp) throw new ConvexError("Blueprint not found");
    if (bp.status !== "client_approved") {
      throw new ConvexError("Blueprint must be client-approved before release");
    }

    const now = Date.now();
    const historyEntry = {
      from: "client_approved",
      to: "released",
      changedBy: "system",
      changedAt: now,
    };
    const existingHistory = bp.statusHistory ?? [];

    await ctx.db.patch(args.id, {
      status: "released",
      releasedAt: now,
      statusHistory: [...existingHistory, historyEntry],
      updatedAt: now,
    });

    await ctx.db.patch(bp.mandateId, {
      status: "released",
      updatedAt: now,
    });
  },
});
