import { query, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { requireOrgUser } from "../lib/orgGuard";
import { requireAdmin, requireSelf } from "../_lib/auth";

// ─── Queries ────────────────────────────────────────────────────

/**
 * List all groups with member count, grouped by parent.
 * Top-level groups first, then subgroups nested underneath.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const allGroups = await ctx.db
      .query("htScoutGroups")
      .order("desc")
      .collect();

    // Separate top-level from subgroups
    const topLevel = allGroups.filter((g) => !g.parentGroupId);
    const subgroups = allGroups.filter((g) => g.parentGroupId);

    // Build grouped result
    const result: {
      _id: string;
      name: string;
      description?: string;
      parentGroupId?: string;
      memberCount: number;
      isInvitationOnly?: boolean;
      createdBy: string;
      createdAt: number;
      updatedAt: number;
      subgroups: {
        _id: string;
        name: string;
        description?: string;
        memberCount: number;
        isInvitationOnly?: boolean;
        createdBy: string;
        createdAt: number;
        updatedAt: number;
      }[];
    }[] = [];

    for (const group of topLevel) {
      const children = subgroups
        .filter((sg) => sg.parentGroupId === group._id)
        .map((sg) => ({
          _id: sg._id,
          name: sg.name,
          description: sg.description,
          memberCount: sg.memberClerkIds.length,
          isInvitationOnly: sg.isInvitationOnly,
          createdBy: sg.createdBy,
          createdAt: sg.createdAt,
          updatedAt: sg.updatedAt,
        }));

      result.push({
        _id: group._id,
        name: group.name,
        description: group.description,
        parentGroupId: undefined,
        memberCount: group.memberClerkIds.length,
        isInvitationOnly: group.isInvitationOnly,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        subgroups: children,
      });
    }

    // Also include orphaned subgroups (parent was deleted) at the end
    const topLevelIds = new Set(topLevel.map((g) => g._id));
    const orphans = subgroups.filter(
      (sg) => sg.parentGroupId && !topLevelIds.has(sg.parentGroupId)
    );
    for (const orphan of orphans) {
      result.push({
        _id: orphan._id,
        name: orphan.name,
        description: orphan.description,
        parentGroupId: orphan.parentGroupId as string,
        memberCount: orphan.memberClerkIds.length,
        isInvitationOnly: orphan.isInvitationOnly,
        createdBy: orphan.createdBy,
        createdAt: orphan.createdAt,
        updatedAt: orphan.updatedAt,
        subgroups: [],
      });
    }

    return result;
  },
});

/**
 * Get a single group with resolved member profiles.
 */
export const getById = query({
  args: { id: v.id("htScoutGroups") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const group = await ctx.db.get(args.id);
    if (!group) return null;

    // Resolve member profiles
    const members: {
      clerkId: string;
      fullName: string;
      currentTitle?: string;
      currentCompany?: string;
      status: string;
      profileId?: string;
    }[] = [];

    for (const clerkId of group.memberClerkIds) {
      const profile = await ctx.db
        .query("htScoutProfiles")
        .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
        .first();

      if (profile) {
        members.push({
          clerkId: profile.clerkId,
          fullName: profile.fullName,
          currentTitle: profile.currentTitle,
          currentCompany: profile.currentCompany,
          status: profile.status,
          profileId: profile.profileId,
        });
      } else {
        members.push({
          clerkId,
          fullName: "(Profile not found)",
          status: "unknown",
        });
      }
    }

    return {
      ...group,
      members,
    };
  },
});

/**
 * Get subgroups of a parent group.
 */
export const getSubgroups = query({
  args: { parentGroupId: v.id("htScoutGroups") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const subgroups = await ctx.db
      .query("htScoutGroups")
      .withIndex("by_parent", (q) => q.eq("parentGroupId", args.parentGroupId))
      .collect();

    return subgroups.map((sg) => ({
      ...sg,
      memberCount: sg.memberClerkIds.length,
    }));
  },
});

/**
 * Get all groups a specific scout belongs to.
 */
export const getGroupsForScout = query({
  args: { scoutClerkId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutClerkId);
    // No index on memberClerkIds (array), so we scan all groups
    const allGroups = await ctx.db
      .query("htScoutGroups")
      .collect();

    return allGroups
      .filter((g) => g.memberClerkIds.includes(args.scoutClerkId))
      .map((g) => ({
        _id: g._id,
        name: g.name,
        description: g.description,
        parentGroupId: g.parentGroupId,
        memberCount: g.memberClerkIds.length,
        isInvitationOnly: g.isInvitationOnly,
      }));
  },
});

/**
 * Suggest relevant groups for a mandate based on function matching.
 * Reads the blueprint's function/industry/targetSectors and matches
 * against group names and descriptions.
 */
export const getRelevantGroups = query({
  args: { blueprintId: v.id("htRoleBlueprints") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const blueprint = await ctx.db.get(args.blueprintId);
    if (!blueprint) {
      throw new ConvexError("Blueprint not found");
    }

    // Collect search terms from the blueprint
    const searchTerms: string[] = [];
    if (blueprint.function) searchTerms.push(blueprint.function.toLowerCase());
    if (blueprint.industry) searchTerms.push(blueprint.industry.toLowerCase());
    if (blueprint.targetSectors) {
      searchTerms.push(...blueprint.targetSectors.map((s) => s.toLowerCase()));
    }
    if (blueprint.roleBand) searchTerms.push(blueprint.roleBand.toLowerCase());
    if (blueprint.subFunction) searchTerms.push(blueprint.subFunction.toLowerCase());

    if (searchTerms.length === 0) {
      return [];
    }

    // Get all groups and score them
    const allGroups = await ctx.db
      .query("htScoutGroups")
      .collect();

    const scored: {
      group: typeof allGroups[0];
      score: number;
      matchedTerms: string[];
    }[] = [];

    for (const group of allGroups) {
      const groupText = `${group.name} ${group.description ?? ""}`.toLowerCase();
      let score = 0;
      const matchedTerms: string[] = [];

      for (const term of searchTerms) {
        if (groupText.includes(term) || term.includes(groupText.split(" ")[0])) {
          score++;
          matchedTerms.push(term);
        }
      }

      if (score > 0) {
        scored.push({ group, score, matchedTerms });
      }
    }

    // Sort by score desc
    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => ({
      _id: s.group._id,
      name: s.group.name,
      description: s.group.description,
      memberCount: s.group.memberClerkIds.length,
      isInvitationOnly: s.group.isInvitationOnly,
      relevanceScore: s.score,
      matchedTerms: s.matchedTerms,
    }));
  },
});

// ─── Mutations ──────────────────────────────────────────────────

/**
 * Create a new scout group or subgroup.
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    parentGroupId: v.optional(v.id("htScoutGroups")),
    isInvitationOnly: v.optional(v.boolean()),
    memberClerkIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrgUser(ctx);

    // If parentGroupId is provided, verify the parent exists
    if (args.parentGroupId) {
      const parent = await ctx.db.get(args.parentGroupId);
      if (!parent) {
        throw new ConvexError("Parent group not found");
      }
    }

    const now = Date.now();
    return await ctx.db.insert("htScoutGroups", {
      name: args.name,
      description: args.description,
      parentGroupId: args.parentGroupId,
      memberClerkIds: args.memberClerkIds ?? [],
      isInvitationOnly: args.isInvitationOnly,
      createdBy: identity.subject,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update group metadata (name, description, invitation-only flag).
 */
export const update = mutation({
  args: {
    id: v.id("htScoutGroups"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isInvitationOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const group = await ctx.db.get(args.id);
    if (!group) throw new ConvexError("Scout group not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isInvitationOnly !== undefined) updates.isInvitationOnly = args.isInvitationOnly;

    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Add scouts to a group.
 */
export const addMembers = mutation({
  args: {
    id: v.id("htScoutGroups"),
    scoutClerkIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const group = await ctx.db.get(args.id);
    if (!group) throw new ConvexError("Scout group not found");

    if (args.scoutClerkIds.length === 0) {
      throw new ConvexError("Must provide at least one scout to add");
    }

    // Merge, deduplicating
    const existingSet = new Set(group.memberClerkIds);
    const newMembers = args.scoutClerkIds.filter((id) => !existingSet.has(id));

    if (newMembers.length === 0) {
      return; // All scouts already in group
    }

    await ctx.db.patch(args.id, {
      memberClerkIds: [...group.memberClerkIds, ...newMembers],
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove scouts from a group.
 */
export const removeMembers = mutation({
  args: {
    id: v.id("htScoutGroups"),
    scoutClerkIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const group = await ctx.db.get(args.id);
    if (!group) throw new ConvexError("Scout group not found");

    if (args.scoutClerkIds.length === 0) {
      throw new ConvexError("Must provide at least one scout to remove");
    }

    const removeSet = new Set(args.scoutClerkIds);
    const remaining = group.memberClerkIds.filter((id) => !removeSet.has(id));

    await ctx.db.patch(args.id, {
      memberClerkIds: remaining,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a group.
 * Only allowed if no active brief releases reference scouts exclusively through this group.
 */
export const deleteGroup = mutation({
  args: { id: v.id("htScoutGroups") },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const group = await ctx.db.get(args.id);
    if (!group) throw new ConvexError("Scout group not found");

    // Check for active brief releases referencing members of this group
    // We check if any member has active brief releases
    for (const scoutClerkId of group.memberClerkIds) {
      const releases = await ctx.db
        .query("htBriefReleases")
        .withIndex("by_scout", (q) => q.eq("scoutId", scoutClerkId))
        .collect();

      if (releases.length > 0) {
        // Check if this scout is ONLY in this group (not in any other group)
        const allGroups = await ctx.db
          .query("htScoutGroups")
          .collect();

        const otherGroups = allGroups.filter(
          (g) => g._id !== args.id && g.memberClerkIds.includes(scoutClerkId)
        );

        if (otherGroups.length === 0) {
          throw new ConvexError(
            `Cannot delete group: scout ${scoutClerkId} has active brief releases and belongs to no other group. Remove their releases first or move them to another group.`
          );
        }
      }
    }

    // Also check for subgroups — prevent deleting if subgroups exist
    const subgroups = await ctx.db
      .query("htScoutGroups")
      .withIndex("by_parent", (q) => q.eq("parentGroupId", args.id))
      .collect();

    if (subgroups.length > 0) {
      throw new ConvexError(
        `Cannot delete group: it has ${subgroups.length} subgroup(s). Delete or reassign subgroups first.`
      );
    }

    await ctx.db.delete(args.id);
  },
});
