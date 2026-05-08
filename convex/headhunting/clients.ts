import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireOrgUser } from "../lib/orgGuard";
import { requireUser, requireAdmin, requireSelf } from "../_lib/auth";

// --- Queries ---

export const list = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("htClients")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("htClients").order("desc").collect();
  },
});

export const getById = query({
  args: { id: v.id("htClients") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const client = await ctx.db.get(args.id);
    if (!client) return null;
    const contacts = await ctx.db
      .query("htClientContacts")
      .withIndex("by_client", (q) => q.eq("clientId", args.id))
      .collect();
    return { ...client, contacts };
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.query.trim()) return [];
    return await ctx.db
      .query("htClients")
      .withSearchIndex("search_name", (q) => q.search("companyName", args.query))
      .take(10);
  },
});

// --- Mutations ---

export const create = mutation({
  args: {
    companyName: v.string(),
    industry: v.optional(v.string()),
    sector: v.optional(v.string()),
    billingEntity: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    defaultConfidentiality: v.union(
      v.literal("full_mask"),
      v.literal("partial_clue"),
      v.literal("disclosed")
    ),
    notes: v.optional(v.string()),
    // Primary contact
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    contactDesignation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const { contactName, contactEmail, contactPhone, contactDesignation, ...clientFields } = args;

    const clientId = await ctx.db.insert("htClients", {
      ...clientFields,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("htClientContacts", {
      clientId,
      name: contactName,
      email: contactEmail,
      ...(contactPhone != null ? { phone: contactPhone } : {}),
      ...(contactDesignation != null ? { designation: contactDesignation } : {}),
      isPrimary: true,
      createdAt: now,
    });

    return clientId;
  },
});

export const update = mutation({
  args: {
    id: v.id("htClients"),
    companyName: v.optional(v.string()),
    industry: v.optional(v.string()),
    sector: v.optional(v.string()),
    logoId: v.optional(v.id("_storage")),
    website: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    companySize: v.optional(v.string()),
    description: v.optional(v.string()),
    officeLocations: v.optional(v.array(v.string())),
    hiringVolume: v.optional(v.string()),
    typicalFunctions: v.optional(v.array(v.string())),
    billingEntity: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    defaultConfidentiality: v.optional(
      v.union(
        v.literal("full_mask"),
        v.literal("partial_clue"),
        v.literal("disclosed")
      )
    ),
    defaultUrgency: v.optional(v.union(
      v.literal("standard"),
      v.literal("urgent"),
      v.literal("critical")
    )),
    notes: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    // Extended Company Profile fields
    companyEmail: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    companyLocation: v.optional(v.string()),
    organisationType: v.optional(v.string()),
    businessStage: v.optional(v.string()),
    alternativeContact: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Either admin OR the org user owning this client (their primary contact's clerkId)
    // can edit. Quick check: admin first, then verify ownership via primary contact.
    const identity = await requireUser(ctx);
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    const isAdmin = role === "admin";
    if (!isAdmin) {
      const member = await ctx.db
        .query("ctTeamMembers")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .first();
      const isSuperAdmin = member?.dashboardRole === "super_admin" && member.isActive;
      if (!isSuperAdmin) {
        // Verify caller is the linked client contact.
        const contact = await ctx.db
          .query("htClientContacts")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
          .first();
        if (!contact || contact.clientId !== args.id) {
          throw new Error("Forbidden");
        }
      }
    }
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Client not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// --- Contact mutations ---

export const addContact = mutation({
  args: {
    clientId: v.id("htClients"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    designation: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");

    if (args.isPrimary) {
      // Unset existing primary
      const contacts = await ctx.db
        .query("htClientContacts")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
        .collect();
      for (const c of contacts) {
        if (c.isPrimary) await ctx.db.patch(c._id, { isPrimary: false });
      }
    }

    return await ctx.db.insert("htClientContacts", {
      clientId: args.clientId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      designation: args.designation,
      isPrimary: args.isPrimary ?? false,
      createdAt: Date.now(),
    });
  },
});

// Create client + primary contact with clerkId in one call (used by auto-create on role upgrade)
export const createWithClerkId = mutation({
  args: {
    companyName: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    contactDesignation: v.optional(v.string()),
    clerkId: v.string(),
    industry: v.optional(v.string()),
    sector: v.optional(v.string()),
    website: v.optional(v.string()),
    companyEmail: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    companyLocation: v.optional(v.string()),
    companySize: v.optional(v.string()),
    organisationType: v.optional(v.string()),
    businessStage: v.optional(v.string()),
    alternativeContact: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Used by Clerk role-upgrade auto-create — caller must own clerkId they pass.
    await requireSelf(ctx, args.clerkId);
    // Check if a contact with this clerkId already exists
    const existingContact = await ctx.db
      .query("htClientContacts")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (existingContact) {
      // Already linked — return the client ID
      return existingContact.clientId;
    }

    const now = Date.now();
    const { contactName, contactEmail, contactPhone, contactDesignation, clerkId, ...companyFields } = args;
    const clientId = await ctx.db.insert("htClients", {
      ...companyFields,
      defaultConfidentiality: "full_mask",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("htClientContacts", {
      clientId,
      name: contactName,
      email: contactEmail,
      ...(contactPhone != null ? { phone: contactPhone } : {}),
      ...(contactDesignation != null ? { designation: contactDesignation } : {}),
      clerkId,
      isPrimary: true,
      createdAt: now,
    });

    return clientId;
  },
});

// Link a Clerk user to a client's primary contact
export const linkClerkId = mutation({
  args: {
    clientId: v.id("htClients"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Caller can only link their own clerkId.
    await requireSelf(ctx, args.clerkId);
    // Check if this clerkId is already linked elsewhere
    const existing = await ctx.db
      .query("htClientContacts")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (existing) {
      throw new Error("This user is already linked to a client");
    }

    // Find primary contact for this client
    const contacts = await ctx.db
      .query("htClientContacts")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();
    const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];
    if (!primary) throw new Error("No contact found for this client");

    await ctx.db.patch(primary._id, { clerkId: args.clerkId });
  },
});

// Update contact details (employer self-edit)
export const updateContact = mutation({
  args: {
    contactId: v.id("htClientContacts"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    designation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const { contactId, ...fields } = args;
    const existing = await ctx.db.get(contactId);
    if (!existing) throw new Error("Contact not found");

    // Caller must be admin or the contact themselves.
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    if (role !== "admin" && existing.clerkId !== identity.subject) {
      const member = await ctx.db
        .query("ctTeamMembers")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .first();
      if (!(member?.dashboardRole === "super_admin" && member.isActive)) {
        throw new Error("Forbidden");
      }
    }

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(contactId, updates);
    }
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getLogoUrl = query({
  args: { logoId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.storage.getUrl(args.logoId);
  },
});

// Find client by contact's clerkId
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.clerkId);
    const contact = await ctx.db
      .query("htClientContacts")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!contact) return null;
    const client = await ctx.db.get(contact.clientId);
    return client ? { ...client, contact } : null;
  },
});
