import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireSelf, requireUser } from "../_lib/auth";

// --- Queries ---

// Get released briefs for a scout (matched by scoutId = clerkId)
// Merges legacy htBriefReleases AND new htScoutBriefs into one sorted list
export const getMyBriefs = query({
  args: { scoutId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    // 1. Legacy briefs from htBriefReleases
    const releases = await ctx.db
      .query("htBriefReleases")
      .withIndex("by_scout", (q) => q.eq("scoutId", args.scoutId))
      .order("desc")
      .collect();

    const legacyBriefs = await Promise.all(
      releases.map(async (r) => {
        const mandate = await ctx.db.get(r.mandateId);
        const blueprint = await ctx.db.get(r.blueprintId);
        return {
          _id: r._id,
          source: "legacy" as const,
          sortDate: r.releasedAt,
          slotsAllocated: r.slotsAllocated,
          slotsUsed: r.slotsUsed,
          mandate: mandate
            ? {
                rawTitle: mandate.rawTitle,
                urgency: mandate.urgency,
                mandateType: mandate.mandateType,
                status: mandate.status,
              }
            : null,
          blueprint: blueprint
            ? {
                title: blueprint.title,
                function: blueprint.function,
                seniority: blueprint.seniority,
                location: blueprint.location,
                mustHaves: blueprint.mustHaves,
                criticalMatchPoints: blueprint.criticalMatchPoints,
                generalMatchPoints: blueprint.generalMatchPoints,
                confidentialityLevel: blueprint.confidentialityLevel,
                shortlistMin: blueprint.shortlistMin,
                shortlistMax: blueprint.shortlistMax,
                compensationMode: blueprint.compensationMode,
                // Mask client info based on disclosure level
                ...(r.disclosureLevel === "disclosed"
                  ? { department: blueprint.department, reportingLine: blueprint.reportingLine }
                  : {}),
              }
            : null,
        };
      })
    );

    // 2. New-style briefs from htScoutBriefs (status = "released")
    // First, find this scout's htScoutProfiles doc ID from their clerkId
    const scoutProfile = await ctx.db
      .query("htScoutProfiles")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.scoutId))
      .first();
    const scoutProfileId = scoutProfile?._id;

    const releasedBriefs = await ctx.db
      .query("htScoutBriefs")
      .withIndex("by_status", (q) => q.eq("status", "released"))
      .order("desc")
      .collect();

    const newBriefs = [];
    for (const brief of releasedBriefs) {
      // Check if the scout is in selectedScoutIds on the parent blueprint
      // selectedScoutIds stores htScoutProfiles._id values
      const blueprint = await ctx.db.get(brief.blueprintId);
      if (!blueprint) continue;
      const selectedScoutIds = blueprint.selectedScoutIds ?? [];
      if (!scoutProfileId || !selectedScoutIds.includes(scoutProfileId)) continue;

      // Avoid duplicates: skip if this blueprint+scout combo already has a legacy release
      const alreadyInLegacy = releases.some(
        (r) => r.blueprintId === brief.blueprintId
      );
      if (alreadyInLegacy) continue;

      newBriefs.push({
        _id: brief._id,
        source: "blueprint" as const,
        sortDate: brief.releasedAt ?? brief.createdAt,
        slotsAllocated: undefined as number | undefined,
        slotsUsed: undefined as number | undefined,
        mandate: null,
        blueprint: {
          title: brief.roleTitle,
          function: brief.functionAndLevel,
          seniority: undefined as string | undefined,
          location: brief.location,
          mustHaves: brief.mustHaves,
          criticalMatchPoints: brief.criticalMatchLogic
            ? [brief.criticalMatchLogic]
            : [],
          generalMatchPoints: brief.roleSummaryNarrative
            ? [brief.roleSummaryNarrative]
            : [],
          confidentialityLevel: blueprint.confidentialityLevel,
          shortlistMin: blueprint.shortlistMin,
          shortlistMax: blueprint.shortlistMax,
          compensationMode: blueprint.compensationMode,
        },
      });
    }

    // 3. Merge and sort by date desc
    const all = [...legacyBriefs, ...newBriefs];
    all.sort((a, b) => (b.sortDate ?? 0) - (a.sortDate ?? 0));
    return all;
  },
});

// Get full detail for a new-style scout brief (htScoutBriefs)
export const getNewBriefDetail = query({
  args: {
    briefId: v.id("htScoutBriefs"),
    scoutId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    const brief = await ctx.db.get(args.briefId);
    if (!brief) return null;
    if (brief.status !== "released") return null;

    const blueprint = await ctx.db.get(brief.blueprintId);
    if (!blueprint) return null;

    // Verify scout is in selectedScoutIds (which stores htScoutProfiles._id values)
    const scoutProfile = await ctx.db
      .query("htScoutProfiles")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.scoutId))
      .first();
    const selectedScoutIds = blueprint.selectedScoutIds ?? [];
    if (!scoutProfile || !selectedScoutIds.includes(scoutProfile._id)) return null;

    // Get the mandate for submissions
    const mandate = await ctx.db.get(blueprint.mandateId);

    // Client hint based on confidentiality
    let clientHint: string | null = null;
    if (brief.employerDisplay === "named" && brief.employerName) {
      clientHint = brief.employerName;
    } else if (brief.maskDescription) {
      clientHint = brief.maskDescription;
    }

    // Get scout's submissions for this mandate
    const submissions = mandate
      ? await ctx.db
          .query("htSubmissions")
          .withIndex("by_mandate", (q) => q.eq("mandateId", mandate._id))
          .collect()
      : [];
    const mySubmissions = submissions.filter((s) => s.scoutId === args.scoutId);

    return {
      brief,
      mandateId: mandate?._id ?? null,
      mandateTitle: mandate?.rawTitle ?? null,
      mandateStatus: mandate?.status ?? null,
      clientHint,
      compensationMode: blueprint.compensationMode,
      confidentialityLevel: blueprint.confidentialityLevel,
      shortlistMin: blueprint.shortlistMin,
      shortlistMax: blueprint.shortlistMax,
      mySubmissions,
    };
  },
});

export const getBriefDetail = query({
  args: { releaseId: v.id("htBriefReleases"), scoutId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    const release = await ctx.db.get(args.releaseId);
    if (!release || release.scoutId !== args.scoutId) return null;

    const mandate = await ctx.db.get(release.mandateId);
    const blueprint = await ctx.db.get(release.blueprintId);

    // Get scout's submissions for this mandate
    const submissions = await ctx.db
      .query("htSubmissions")
      .withIndex("by_mandate", (q) => q.eq("mandateId", release.mandateId))
      .collect();
    const mySubmissions = submissions.filter((s) => s.scoutId === args.scoutId);

    // Client info based on disclosure
    let clientHint: string | null = null;
    if (mandate && release.disclosureLevel !== "full_mask") {
      const client = await ctx.db.get(mandate.clientId);
      clientHint =
        release.disclosureLevel === "disclosed"
          ? client?.companyName ?? null
          : client?.industry ?? null; // partial clue = industry only
    }

    return {
      release,
      mandate: mandate
        ? { rawTitle: mandate.rawTitle, urgency: mandate.urgency, status: mandate.status }
        : null,
      blueprint: blueprint
        ? {
            title: blueprint.title,
            function: blueprint.function,
            seniority: blueprint.seniority,
            department:
              release.disclosureLevel === "disclosed" ? blueprint.department : undefined,
            reportingLine:
              release.disclosureLevel === "disclosed" ? blueprint.reportingLine : undefined,
            location: blueprint.location,
            mustHaves: blueprint.mustHaves,
            dealBreakers: blueprint.dealBreakers,
            criticalMatchPoints: blueprint.criticalMatchPoints,
            generalMatchPoints: blueprint.generalMatchPoints,
            targetSectors: blueprint.targetSectors,
            confidentialityLevel: blueprint.confidentialityLevel,
            shortlistMin: blueprint.shortlistMin,
            shortlistMax: blueprint.shortlistMax,
            compensationMode: blueprint.compensationMode,
            environmentDescription: blueprint.environmentDescription,
          }
        : null,
      clientHint,
      mySubmissions,
    };
  },
});

export const getMySubmissions = query({
  args: { scoutId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    const submissions = await ctx.db
      .query("htSubmissions")
      .withIndex("by_scout", (q) => q.eq("scoutId", args.scoutId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      submissions.map(async (s) => {
        const mandate = await ctx.db.get(s.mandateId);
        return {
          ...s,
          mandateTitle: mandate?.rawTitle ?? "Unknown",
        };
      })
    );
    return enriched;
  },
});

export const getScoutStats = query({
  args: { scoutId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    const submissions = await ctx.db
      .query("htSubmissions")
      .withIndex("by_scout", (q) => q.eq("scoutId", args.scoutId))
      .collect();
    const briefs = await ctx.db
      .query("htBriefReleases")
      .withIndex("by_scout", (q) => q.eq("scoutId", args.scoutId))
      .collect();

    return {
      totalBriefs: briefs.length,
      totalSubmissions: submissions.length,
      shortlisted: submissions.filter((s) => s.status === "shortlisted").length,
      placed: submissions.filter((s) => s.status === "joined").length,
    };
  },
});

// --- Mutations ---

export const markBriefViewed = mutation({
  args: { releaseId: v.id("htBriefReleases"), scoutId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    const release = await ctx.db.get(args.releaseId);
    if (!release || release.scoutId !== args.scoutId) throw new Error("Not found");
    if (!release.viewedAt) {
      await ctx.db.patch(args.releaseId, { viewedAt: Date.now() });
    }
  },
});

export const submitCandidate = mutation({
  args: {
    mandateId: v.id("htMandates"),
    scoutId: v.string(),
    candidateName: v.string(),
    candidateEmail: v.string(),
    candidatePhone: v.optional(v.string()),
    candidateLinkedin: v.optional(v.string()),
    cvFileId: v.optional(v.id("_storage")),
    coverLetterFileId: v.optional(v.id("_storage")),
    scoutConfidence: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    const mandate = await ctx.db.get(args.mandateId);
    if (!mandate) throw new Error("Mandate not found");

    // --- Scout tier-based submission limit (Phase 2) ---
    const TIER_LIMITS: Record<string, number> = {
      standard: 3,   // Level 1
      verified: 5,   // Level 2
      premium: 7,    // Level 3
      elite: 10,     // Level 4
    };

    // Find scout's expert profile to get tier
    const expertResults = await ctx.db
      .query("experts")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.scoutId))
      .collect();
    const scoutExpert = expertResults[0];
    const scoutTier = scoutExpert?.scoutTier || "standard";
    const maxSubmissions = TIER_LIMITS[scoutTier] || 3;

    // Count existing active submissions by this scout for this mandate
    const allSubs = await ctx.db
      .query("htSubmissions")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .collect();
    const myActiveSubs = allSubs.filter(
      (s) => s.scoutId === args.scoutId && s.status !== "withdrawn" && s.status !== "rejected"
    );

    if (myActiveSubs.length >= maxSubmissions) {
      throw new Error(
        `Submission limit reached: ${scoutTier} tier allows up to ${maxSubmissions} candidates per mandate. You have ${myActiveSubs.length}.`
      );
    }

    // --- Duplicate detection ---
    const existingSubs = allSubs;

    const emailNorm = args.candidateEmail.toLowerCase().trim();
    const phoneNorm = args.candidatePhone
      ? args.candidatePhone.replace(/\D/g, "").slice(-10)
      : null;
    const linkedinNorm = args.candidateLinkedin
      ? args.candidateLinkedin
          .toLowerCase()
          .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "")
          .replace(/\/+$/, "")
          .trim()
      : null;
    const namePrefix = args.candidateName.toLowerCase().trim().slice(0, 3);

    // Common stop words to exclude from company-name matching in notes
    const STOP_WORDS = new Set([
      "the", "and", "for", "with", "from", "this", "that", "has", "have",
      "was", "were", "are", "been", "being", "will", "would", "can", "could",
      "should", "may", "might", "shall", "not", "but", "also", "very",
      "about", "into", "over", "after", "before", "during", "between",
      "years", "year", "experience", "currently", "working", "works",
      "candidate", "role", "position", "company", "good", "great",
      "strong", "well", "note", "notes", "they", "their", "them",
    ]);

    for (const sub of existingSubs) {
      // Skip withdrawn/rejected — allow resubmission
      if (sub.status === "withdrawn" || sub.status === "rejected") continue;

      // Email match (strongest)
      if (sub.candidateEmail.toLowerCase().trim() === emailNorm) {
        throw new Error(
          "Duplicate: This candidate has already been submitted for this mandate. First submission owns the candidate."
        );
      }
      // Phone match
      if (
        phoneNorm &&
        sub.candidatePhone &&
        sub.candidatePhone.replace(/\D/g, "").slice(-10) === phoneNorm
      ) {
        throw new Error(
          "Duplicate: A candidate with this phone number has already been submitted for this mandate."
        );
      }

      // LinkedIn match
      if (linkedinNorm && sub.candidateLinkedin) {
        const existingLinkedin = sub.candidateLinkedin
          .toLowerCase()
          .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "")
          .replace(/\/+$/, "")
          .trim();
        if (existingLinkedin && existingLinkedin === linkedinNorm) {
          throw new Error(
            "Duplicate: A candidate with this LinkedIn profile has already been submitted for this mandate."
          );
        }
      }

      // Name + employer fuzzy match (first 3 chars of name + same company in notes)
      if (namePrefix.length >= 3) {
        const existingNamePrefix = sub.candidateName.toLowerCase().trim().slice(0, 3);
        if (existingNamePrefix === namePrefix) {
          // Check if both submissions mention the same company in notes
          const notesLower = args.notes?.toLowerCase() ?? "";
          const existingNotesLower = (sub.notes ?? "").toLowerCase();
          if (notesLower.length > 0 && existingNotesLower.length > 0) {
            // Extract potential company names (words >= 3 chars) from existing notes
            const existingWords = new Set(
              existingNotesLower.split(/\s+/).filter((w) => w.length >= 3)
            );
            const submittedWords = notesLower.split(/\s+/).filter((w) => w.length >= 3);
            // If any meaningful word appears in both notes, flag as likely duplicate
            const commonCompanyWords = submittedWords.filter(
              (w) => existingWords.has(w) && !STOP_WORDS.has(w)
            );
            if (commonCompanyWords.length >= 1) {
              throw new Error(
                `Likely duplicate: "${sub.candidateName}" has a similar name and overlapping employer/company mention ("${commonCompanyWords[0]}"). If this is a different person, please differentiate in the notes.`
              );
            }
          }
        }
      }
    }

    const now = Date.now();
    return await ctx.db.insert("htSubmissions", {
      mandateId: args.mandateId,
      candidateName: args.candidateName,
      candidateEmail: args.candidateEmail,
      candidatePhone: args.candidatePhone,
      candidateLinkedin: args.candidateLinkedin,
      sourceChannel: "scout",
      scoutId: args.scoutId,
      cvFileId: args.cvFileId,
      coverLetterFileId: args.coverLetterFileId,
      structuredFitForm: args.scoutConfidence
        ? { criticalYesNo: [], scoutConfidence: args.scoutConfidence }
        : undefined,
      duplicateStatus: "unique",
      ownershipTimestamp: now,
      status: "submitted_to_llp",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
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
