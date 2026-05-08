import { query, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { requireOrgUser } from "../lib/orgGuard";
import { logAudit } from "./blueprintAuditLog";

// ─── Queries ─────────────────────────────────────────────────────

export const getByBlueprint = query({
  args: { blueprintId: v.id("htRoleBlueprints") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    return await ctx.db
      .query("htScoutBriefs")
      .withIndex("by_blueprint", (q) => q.eq("blueprintId", args.blueprintId))
      .order("desc")
      .collect();
  },
});

export const getLatestByBlueprint = query({
  args: { blueprintId: v.id("htRoleBlueprints") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    return await ctx.db
      .query("htScoutBriefs")
      .withIndex("by_blueprint", (q) => q.eq("blueprintId", args.blueprintId))
      .order("desc")
      .first();
  },
});

export const getById = query({
  args: { id: v.id("htScoutBriefs") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);
    return await ctx.db.get(args.id);
  },
});

// ─── Mutations ───────────────────────────────────────────────────

export const generate = mutation({
  args: {
    blueprintId: v.id("htRoleBlueprints"),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const bp = await ctx.db.get(args.blueprintId);
    if (!bp) throw new ConvexError("Blueprint not found");

    // Must be finalized_by_client or later (or client_approved for legacy flow)
    const allowedStatuses = [
      "finalized_by_client",
      "brief_generated",
      "release_ready",
      "released_to_scouts",
      "client_approved",
      "released",
    ];
    if (!allowedStatuses.includes(bp.status)) {
      throw new ConvexError(
        `Blueprint must be finalized by client before generating a brief (current status: ${bp.status})`
      );
    }

    // Get existing briefs to determine version
    const existingBriefs = await ctx.db
      .query("htScoutBriefs")
      .withIndex("by_blueprint", (q) => q.eq("blueprintId", args.blueprintId))
      .collect();
    const nextVersion = existingBriefs.length + 1;

    // ── Resolve visibility template based on confidentiality level ──

    const confidentiality = bp.confidentialityLevel ?? "full_mask";

    // Helper: check if a field has a visibility override
    const overrides = bp.visibilityOverrides ?? [];
    const getFieldVisibility = (fieldPath: string): string | null => {
      const override = overrides.find((o) => o.fieldPath === fieldPath);
      return override ? override.visibility : null;
    };

    // Helper: should a field be included in the brief?
    // The override takes precedence, otherwise use template defaults.
    const shouldIncludeField = (
      fieldPath: string,
      templateDefault: boolean
    ): boolean => {
      const override = getFieldVisibility(fieldPath);
      if (override !== null) {
        // "scout_visible", "masked_scout_visible", "restricted_scout_visible" = include
        // "internal_only", "client_visible" = exclude from scout brief
        return (
          override === "scout_visible" ||
          override === "masked_scout_visible" ||
          override === "restricted_scout_visible"
        );
      }
      return templateDefault;
    };

    // ── Visibility template defaults per confidentiality level ──
    // "disclosed" / Open: everything visible, employer named
    // "partial_clue" / Standard: same but exclude risk flags, profile types to avoid
    // "full_mask" / Confidential: role identity (masked), hard gates, critical match only
    // "highly_confidential": calibrated title + function + level, location generalized, must-haves, critical match
    // "executive_confidential": generic title + level, country only, minimal must-haves

    const isOpen =
      confidentiality === "disclosed";
    const isStandard =
      confidentiality === "partial_clue";
    const isConfidential =
      confidentiality === "full_mask";
    const isHighlyConfidential =
      confidentiality === "highly_confidential";
    const isExecutiveConfidential =
      confidentiality === "executive_confidential";

    // ── Employer display ──
    let employerDisplay: "named" | "masked";
    let maskDescription: string | undefined;
    let employerName: string | undefined;

    // Resolve the actual client company name for "named" employer
    const mandate = await ctx.db.get(bp.mandateId);
    const client = mandate ? await ctx.db.get(mandate.clientId) : null;
    const clientCompanyName = client?.companyName;

    if (isOpen || isStandard) {
      employerDisplay = "named";
      employerName = clientCompanyName ?? "Named Employer";
    } else if (isConfidential) {
      employerDisplay = "masked";
      maskDescription =
        "Confidential - employer details disclosed only to shortlisted candidates";
    } else if (isHighlyConfidential) {
      employerDisplay = "masked";
      maskDescription =
        "A confidential client in the sector — minimal details available at this stage";
    } else {
      // executive_confidential
      employerDisplay = "masked";
      maskDescription = undefined; // No description at all
    }

    // Build functionAndLevel
    const roleBandLabels: Record<string, string> = {
      entry_junior: "Entry/Junior Level",
      management_functional: "Management/Functional Level",
      executive_clevel: "Executive/C-Level",
    };
    const bandLabel = bp.roleBand
      ? roleBandLabels[bp.roleBand] ?? bp.roleBand
      : bp.seniority ?? "Unspecified Level";

    let functionAndLevel: string;
    if (isExecutiveConfidential) {
      // Generic title + level only, no function name
      functionAndLevel = bandLabel;
    } else if (isHighlyConfidential) {
      // Calibrated role title with function + level
      functionAndLevel = bp.function
        ? `${bp.function} - ${bandLabel}`
        : bandLabel;
    } else {
      functionAndLevel = bp.function
        ? `${bp.function} - ${bandLabel}`
        : bandLabel;
    }

    // Build location (may be generalized at higher confidentiality)
    let location: string;
    if (isExecutiveConfidential) {
      // Country only — strip city-level detail
      const rawLocation = bp.location || bp.searchGeography || "";
      // Simple heuristic: take last comma-separated segment (usually country)
      const parts = rawLocation.split(",").map((s) => s.trim());
      location = parts.length > 1 ? parts[parts.length - 1] : rawLocation || "Location confidential";
    } else if (isHighlyConfidential) {
      // Generalized (e.g., "South Asia" instead of "Dhaka, Bangladesh")
      const rawLocation = bp.searchGeography || bp.location || "";
      location = rawLocation || "Location to be confirmed";
    } else {
      location = bp.location || bp.searchGeography || "Location to be confirmed";
    }

    // Build roleTitle (may be calibrated at higher confidentiality)
    let roleTitle: string;
    if (isExecutiveConfidential) {
      // Very generic
      roleTitle = `${bandLabel} Position`;
    } else {
      roleTitle = bp.title;
    }

    // Build mustHaves from either format
    const mustHaves: string[] = [];
    if (shouldIncludeField("mustHaves", true)) {
      if (bp.mustHaves && bp.mustHaves.length > 0) {
        if (isExecutiveConfidential) {
          // Minimal: only first 3
          mustHaves.push(...bp.mustHaves.slice(0, 3));
        } else {
          mustHaves.push(...bp.mustHaves);
        }
      }
      if (bp.mustHaveDetails && bp.mustHaveDetails.length > 0) {
        const details = isExecutiveConfidential
          ? bp.mustHaveDetails.slice(0, 3)
          : bp.mustHaveDetails;
        for (const detail of details) {
          mustHaves.push(detail.note ? `${detail.tag}: ${detail.note}` : detail.tag);
        }
      }
    }

    // Build criticalMatchLogic
    let criticalMatchLogic: string;
    if (shouldIncludeField("criticalMatchPoints", true)) {
      const criticalParts: string[] = [];
      if (bp.criticalMatchPoints && bp.criticalMatchPoints.length > 0) {
        criticalParts.push(...bp.criticalMatchPoints);
      }
      if (bp.criticalMatchDetails && bp.criticalMatchDetails.length > 0) {
        for (const detail of bp.criticalMatchDetails) {
          criticalParts.push(
            detail.note ? `${detail.tag}: ${detail.note}` : detail.tag
          );
        }
      }
      criticalMatchLogic =
        criticalParts.length > 0
          ? criticalParts.join("; ")
          : "Critical match criteria to be defined";
    } else {
      criticalMatchLogic = "Critical match criteria provided upon engagement";
    }

    // Build dealBreakerLogic (excluded at full_mask and above)
    let dealBreakerLogic: string | undefined;
    if (
      shouldIncludeField(
        "dealBreakers",
        isOpen || isStandard // only included by default for open/standard
      )
    ) {
      const dealParts: string[] = [];
      if (bp.dealBreakers && bp.dealBreakers.length > 0) {
        dealParts.push(...bp.dealBreakers);
      }
      if (bp.dealBreakerDetails && bp.dealBreakerDetails.length > 0) {
        for (const detail of bp.dealBreakerDetails) {
          dealParts.push(
            detail.note ? `${detail.tag}: ${detail.note}` : detail.tag
          );
        }
      }
      if (dealParts.length > 0) {
        dealBreakerLogic = dealParts.join("; ");
      }
    }

    // Build challengeSummary (excluded at full_mask and above)
    let challengeSummary: string | undefined;
    if (
      shouldIncludeField(
        "challengeProfile",
        isOpen || isStandard // only for open/standard
      )
    ) {
      challengeSummary = bp.challengeProfile ?? undefined;
    }

    // Build targetSectorGuidance (excluded at full_mask and above)
    let targetSectorGuidance: string | undefined;
    if (
      shouldIncludeField(
        "targetSectors",
        isOpen || isStandard // only for open/standard
      )
    ) {
      targetSectorGuidance =
        bp.targetSectors && bp.targetSectors.length > 0
          ? bp.targetSectors.join(", ")
          : undefined;
    }

    // Build generalMatchLogic (excluded at full_mask and above)
    let roleSummaryNarrative: string | undefined;
    if (
      shouldIncludeField(
        "generalMatchPoints",
        isOpen // only for fully open
      )
    ) {
      const generalParts: string[] = [];
      if (bp.generalMatchPoints && bp.generalMatchPoints.length > 0) {
        generalParts.push(...bp.generalMatchPoints);
      }
      if (bp.generalMatchDetails && bp.generalMatchDetails.length > 0) {
        for (const detail of bp.generalMatchDetails) {
          generalParts.push(
            detail.note ? `${detail.tag}: ${detail.note}` : detail.tag
          );
        }
      }
      if (generalParts.length > 0) {
        roleSummaryNarrative = generalParts.join("; ");
      }
    }

    // Build submission guidance
    const submissionGuidance = shouldIncludeField("scoutVisibleNotes", true)
      ? (bp.scoutVisibleNotes ?? undefined)
      : undefined;

    const now = Date.now();
    const briefId = await ctx.db.insert("htScoutBriefs", {
      blueprintId: args.blueprintId,
      version: nextVersion,
      roleTitle,
      employerDisplay,
      employerName,
      maskDescription,
      functionAndLevel,
      location,
      mustHaves,
      criticalMatchLogic,
      dealBreakerLogic,
      challengeSummary,
      targetSectorGuidance,
      roleSummaryNarrative,
      submissionGuidance,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    // If blueprint was finalized_by_client, transition to brief_generated
    if (bp.status === "finalized_by_client") {
      const historyEntry = {
        from: bp.status,
        to: "brief_generated",
        changedBy: "system",
        changedAt: now,
        reason: "Brief auto-generated",
      };
      const existingHistory = bp.statusHistory ?? [];

      await ctx.db.patch(args.blueprintId, {
        status: "brief_generated",
        statusHistory: [...existingHistory, historyEntry],
        updatedAt: now,
      });
    }

    // Audit log: brief_generated
    await logAudit(ctx, args.blueprintId, "brief_generated", {
      newValue: `v${nextVersion}`,
      metadata: {
        briefId,
        version: nextVersion,
        confidentialityLevel: confidentiality,
        employerDisplay,
      },
    });

    return briefId;
  },
});

export const update = mutation({
  args: {
    id: v.id("htScoutBriefs"),
    roleTitle: v.optional(v.string()),
    employerDisplay: v.optional(
      v.union(v.literal("named"), v.literal("masked"))
    ),
    employerName: v.optional(v.string()),
    maskDescription: v.optional(v.string()),
    functionAndLevel: v.optional(v.string()),
    location: v.optional(v.string()),
    mustHaves: v.optional(v.array(v.string())),
    criticalMatchLogic: v.optional(v.string()),
    dealBreakerLogic: v.optional(v.string()),
    challengeSummary: v.optional(v.string()),
    targetSectorGuidance: v.optional(v.string()),
    submissionGuidance: v.optional(v.string()),
    roleSummaryNarrative: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const { id, ...fields } = args;
    const brief = await ctx.db.get(id);
    if (!brief) throw new ConvexError("Brief not found");

    if (brief.status !== "draft") {
      throw new ConvexError(
        "Only draft briefs can be edited. Recall the brief first if already released."
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
    id: v.id("htScoutBriefs"),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const brief = await ctx.db.get(args.id);
    if (!brief) throw new ConvexError("Brief not found");

    if (brief.status !== "draft") {
      throw new ConvexError("Only draft briefs can be approved");
    }

    await ctx.db.patch(args.id, {
      status: "approved",
      updatedAt: Date.now(),
    });
  },
});

export const release = mutation({
  args: {
    id: v.id("htScoutBriefs"),
    releasedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const brief = await ctx.db.get(args.id);
    if (!brief) throw new ConvexError("Brief not found");

    if (brief.status !== "approved") {
      throw new ConvexError("Brief must be approved before release");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "released",
      releasedAt: now,
      releasedBy: args.releasedBy,
      updatedAt: now,
    });

    // Audit log: brief_released
    await logAudit(ctx, brief.blueprintId, "brief_released", {
      newValue: `v${brief.version}`,
      metadata: {
        briefId: args.id,
        version: brief.version,
        releasedBy: args.releasedBy,
      },
      performedBy: args.releasedBy,
    });
  },
});

export const recall = mutation({
  args: {
    id: v.id("htScoutBriefs"),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const brief = await ctx.db.get(args.id);
    if (!brief) throw new ConvexError("Brief not found");

    if (brief.status !== "released") {
      throw new ConvexError("Only released briefs can be recalled");
    }

    await ctx.db.patch(args.id, {
      status: "recalled",
      updatedAt: Date.now(),
    });

    // Audit log: brief_recalled
    await logAudit(ctx, brief.blueprintId, "brief_recalled", {
      oldValue: "released",
      newValue: "recalled",
      metadata: {
        briefId: args.id,
        version: brief.version,
      },
    });
  },
});
