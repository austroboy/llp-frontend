import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const skillLevelValidator = v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4));

const skillValidator = v.object({
  name: v.string(),
  level: skillLevelValidator,
  evidence: v.string(),
  documentId: v.optional(v.id("_storage")),
  verifiedAt: v.optional(v.number()),
  verifiedBy: v.optional(v.string()),
});

const applicationSkillValidator = v.object({
  name: v.string(),
  level: skillLevelValidator,
  evidence: v.string(),
  documentId: v.optional(v.id("_storage")),
});

const certificationValidator = v.object({
  name: v.string(),
  org: v.optional(v.string()),
  year: v.optional(v.string()),
  documentId: v.optional(v.id("_storage")),
});

const educationValidator = v.object({
  degree: v.string(),
  institution: v.string(),
  fieldOfStudy: v.optional(v.string()),
  year: v.optional(v.string()),
});

const projectValidator = v.object({
  name: v.string(),
  client: v.optional(v.string()),
  description: v.optional(v.string()),
  duration: v.optional(v.string()),
  outcome: v.optional(v.string()),
});

const languageProficiencyValidator = v.union(
  v.literal("native"),
  v.literal("fluent"),
  v.literal("advanced"),
  v.literal("intermediate"),
  v.literal("basic")
);

const languageValidator = v.object({
  name: v.string(),
  proficiency: v.optional(languageProficiencyValidator),
});

const affiliationValidator = v.object({
  name: v.string(),
  role: v.optional(v.string()),
  since: v.optional(v.string()),
});

const workModeValidator = v.union(v.literal("on-site"), v.literal("remote"), v.literal("hybrid"));

const socialProfileValidator = v.object({
  platform: v.string(),
  url: v.string(),
});

const expertExperienceValidator = v.object({
  title: v.string(),
  company: v.optional(v.string()),
  location: v.optional(v.string()),
  workMode: v.optional(workModeValidator),
  duration: v.optional(v.string()),
  scope: v.optional(v.string()),
  role: v.string(),
});

const applicationExperienceValidator = v.object({
  title: v.optional(v.string()),
  company: v.optional(v.string()),
  location: v.optional(v.string()),
  workMode: v.optional(workModeValidator),
  duration: v.optional(v.string()),
  scope: v.optional(v.string()),
  role: v.optional(v.string()),
});

const sessionPreferencesValidator = v.object({
  lengths: v.array(v.number()),
  availabilityNotes: v.optional(v.string()),
});

const headhuntingPreferencesValidator = v.object({
  confidentiality: v.union(v.literal("anonymous"), v.literal("scouts_only"), v.literal("open")),
  targetRoles: v.optional(v.array(v.string())),
  targetFunctions: v.optional(v.array(v.string())),
  targetSeniority: v.optional(v.array(v.string())),
  minimumSalary: v.optional(v.number()),
  blacklistedCompanies: v.optional(v.array(v.string())),
  availability: v.union(v.literal("active"), v.literal("open"), v.literal("not_now")),
  consentTimestamp: v.number(),
});

const headhuntingValidator = v.object({
  optedIn: v.boolean(),
  cvId: v.optional(v.id("_storage")),
  ctcRange: v.optional(v.string()),
  preferredLocations: v.optional(v.array(v.string())),
  noticePeriod: v.optional(v.string()),
});

const companyValidator = v.object({
  name: v.string(),
  initials: v.string(),
  color: v.string(),
});

export default defineSchema({
  blogPosts: defineTable({
    title: v.string(),
    titleBn: v.optional(v.string()),
    slug: v.string(),
    excerpt: v.string(),
    excerptBn: v.optional(v.string()),
    content: v.string(),
    contentBn: v.optional(v.string()),
    category: v.union(v.literal("official"), v.literal("community")),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_review"),
      v.literal("published"),
      v.literal("archived")
    ),
    authorName: v.string(),
    authorRole: v.optional(v.string()),
    authorInitials: v.string(),
    coverImageId: v.optional(v.id("_storage")),
    tags: v.optional(v.array(v.string())),
    readTimeMinutes: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    createdBy: v.string(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_createdBy", ["createdBy"]),

  serviceProducts: defineTable({
    title: v.string(),
    titleBn: v.optional(v.string()),
    description: v.string(),
    descriptionBn: v.optional(v.string()),
    category: v.union(v.literal("expatriate"), v.literal("hr"), v.literal("licensing")),
    icon: v.string(),
    deliverables: v.array(v.string()),
    deliverablesBn: v.optional(v.array(v.string())),
    ctaText: v.string(),
    ctaTextBn: v.optional(v.string()),
    badge: v.optional(v.string()),
    badgeBn: v.optional(v.string()),
    workflow: v.optional(v.string()),
    deliveryTimeline: v.optional(v.string()),
    price: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    notes: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdBy: v.string(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  consultationRequests: defineTable({
    requesterName: v.string(),
    requesterEmail: v.string(),
    requesterPhone: v.optional(v.string()),
    requesterClerkId: v.optional(v.string()),
    expertArea: v.string(),
    description: v.string(),
    urgency: v.union(v.literal("normal"), v.literal("urgent")),
    preferredLanguage: v.union(v.literal("en"), v.literal("bn")),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("connected"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    adminNotes: v.optional(v.string()),
    assignedExpert: v.optional(v.string()),
    expertId: v.optional(v.id("experts")),
    respondedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  approvalRequests: defineTable({
    type: v.string(), // "blog_post", "consultation", etc.
    resourceId: v.string(), // ID of the resource (blog post ID, etc.)
    title: v.string(), // Display title for the approval list
    requestedBy: v.string(), // Clerk user ID
    requesterName: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    reviewedBy: v.optional(v.string()),
    reviewerName: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    reviewNote: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_requestedBy", ["requestedBy"])
    .index("by_resourceId", ["resourceId"]),

  experts: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    designation: v.string(),
    organization: v.string(),
    city: v.string(),
    slug: v.string(),
    clerkId: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    socialProfiles: v.optional(v.array(socialProfileValidator)),
    bio: v.string(),
    photoId: v.optional(v.id("_storage")),
    profilePhotoUrl: v.optional(v.string()),
    initials: v.string(),
    sectors: v.array(v.string()),
    countriesWorked: v.array(v.string()),
    companiesWorked: v.array(companyValidator),
    skills: v.array(skillValidator),
    certifications: v.array(certificationValidator),
    education: v.optional(v.array(educationValidator)),
    projects: v.optional(v.array(projectValidator)),
    languages: v.optional(v.array(languageValidator)),
    affiliations: v.optional(v.array(affiliationValidator)),
    experiences: v.array(expertExperienceValidator),
    sessionPreferences: sessionPreferencesValidator,
    headhunting: headhuntingValidator,
    stats: v.object({
      rating: v.number(),
      reviewCount: v.number(),
      sessionCount: v.number(),
    }),
    keywords: v.optional(v.array(v.string())),
    availabilityStatus: v.union(v.literal("available"), v.literal("busy"), v.literal("on_leave")),
    isFeatured: v.boolean(),
    displayOrder: v.number(),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    applicationId: v.optional(v.id("expertApplications")),
    // Scout extension fields
    scoutTier: v.optional(v.union(v.literal("standard"), v.literal("verified"), v.literal("premium"))),
    coverageLanes: v.optional(v.object({
      functions: v.array(v.string()),
      industries: v.array(v.string()),
      geographies: v.array(v.string()),
      roleLevels: v.array(v.string()),
    })),
    credibilityScore: v.optional(v.number()),
    responseSpeed: v.optional(v.number()), // avg hours
    hitRate: v.optional(v.number()), // placements / submissions
    disputeCount: v.optional(v.number()),
    totalEarnings: v.optional(v.number()),
    scoutStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("suspended")
    )),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_status_featured", ["status", "isFeatured", "displayOrder"])
    .index("by_clerkId", ["clerkId"])
    .index("by_scoutStatus", ["scoutStatus"]),

  expertApplications: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    designation: v.optional(v.string()),
    organization: v.optional(v.string()),
    city: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    socialProfiles: v.optional(v.array(socialProfileValidator)),
    bio: v.optional(v.string()),
    profilePhotoUrl: v.optional(v.string()),
    sectors: v.array(v.string()),
    skills: v.array(applicationSkillValidator),
    certifications: v.array(certificationValidator),
    education: v.optional(v.array(educationValidator)),
    projects: v.optional(v.array(projectValidator)),
    languages: v.optional(v.array(languageValidator)),
    affiliations: v.optional(v.array(affiliationValidator)),
    experiences: v.array(applicationExperienceValidator),
    sessionPreferences: v.optional(sessionPreferencesValidator),
    headhunting: v.optional(headhuntingValidator),
    consent: v.object({
      accuracy: v.boolean(),
      profileCreation: v.boolean(),
      marketing: v.boolean(),
    }),
    status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("under_review"), v.literal("approved"), v.literal("rejected")),
    reviewNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    applicantClerkId: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_applicant", ["applicantClerkId"]),

  serviceRequests: defineTable({
    // Service context
    serviceProductId: v.optional(v.id("serviceProducts")),
    serviceTitle: v.string(),
    serviceCategory: v.string(),
    servicePrice: v.optional(v.string()),
    serviceTimeline: v.optional(v.string()),
    serviceWorkflow: v.optional(v.string()),
    // Client info
    requesterName: v.string(),
    requesterEmail: v.string(),
    requesterPhone: v.optional(v.string()),
    requesterCompany: v.optional(v.string()),
    requesterClerkId: v.optional(v.string()),
    // Request details
    description: v.string(),
    urgency: v.union(v.literal("normal"), v.literal("urgent")),
    preferredLanguage: v.union(v.literal("en"), v.literal("bn")),
    // Admin fields
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    adminNotes: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    respondedAt: v.optional(v.number()),
    updatedAt: v.number(),
    // Order tracking
    orderNumber: v.optional(v.string()),
    publicNotes: v.optional(v.array(v.object({
      message: v.string(),
      createdAt: v.number(),
      createdBy: v.string(),
    }))),
  })
    .index("by_status", ["status"])
    .index("by_category", ["serviceCategory"])
    .index("by_orderNumber", ["orderNumber"])
    .index("by_requesterClerkId", ["requesterClerkId"]),

  quickQuestions: defineTable({
    expertId: v.id("experts"),
    askerName: v.string(),
    askerEmail: v.string(),
    askerClerkId: v.optional(v.string()),
    question: v.string(),
    status: v.union(v.literal("pending"), v.literal("answered"), v.literal("expired")),
    answer: v.optional(v.string()),
    answeredAt: v.optional(v.number()),
  })
    .index("by_expert", ["expertId"])
    .index("by_status", ["status"])
    .index("by_email", ["askerEmail"]),

  expertBadges: defineTable({
    expertId: v.id("experts"),
    badge: v.string(),
    icon: v.optional(v.string()),
    awardedBy: v.string(),
    awardedAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_expert", ["expertId"]),

  professionalProfiles: defineTable({
    userId: v.string(),
    slug: v.string(),
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    photo: v.optional(v.id("_storage")),
    photoUrl: v.optional(v.string()),
    headline: v.string(),
    bio: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.string(),
    division: v.optional(v.string()),
    district: v.optional(v.string()),
    willingToRelocate: v.boolean(),
    preferredLocations: v.optional(v.array(v.string())),
    openToRemote: v.boolean(),
    currentDesignation: v.optional(v.string()),
    currentOrganization: v.optional(v.string()),
    totalExperienceYears: v.optional(v.number()),
    experienceLevel: v.optional(v.string()),
    skills: v.array(v.object({
      name: v.string(),
      yearsOfExperience: v.optional(v.number()),
    })),
    education: v.array(v.object({
      degree: v.string(),
      institution: v.string(),
      fieldOfStudy: v.optional(v.string()),
      year: v.optional(v.string()),
    })),
    certifications: v.array(v.object({
      name: v.string(),
      org: v.optional(v.string()),
      year: v.optional(v.string()),
    })),
    experiences: v.array(v.object({
      title: v.string(),
      company: v.string(),
      location: v.optional(v.string()),
      startDate: v.optional(v.string()),
      endDate: v.optional(v.string()),
      isCurrent: v.boolean(),
      description: v.optional(v.string()),
    })),
    languages: v.optional(v.array(v.object({
      name: v.string(),
      proficiency: v.optional(v.string()),
    }))),
    linkedin: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    socialProfiles: v.optional(v.array(v.object({
      platform: v.string(),
      url: v.string(),
    }))),
    cvFileId: v.optional(v.id("_storage")),
    cvFileName: v.optional(v.string()),
    isPublic: v.boolean(),
    isOpenToOpportunities: v.boolean(),
    emailNotifications: v.boolean(),
    headhuntingPreferences: v.optional(headhuntingPreferencesValidator),
    completionPercentage: v.number(),
    status: v.union(v.literal("draft"), v.literal("complete")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_public", ["isPublic", "isOpenToOpportunities"]),

  // ── LLP Framework v1.0 ──────────────────────────────────────────

  tokenUsage: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD
    inputUsed: v.number(),
    outputUsed: v.number(),
    requestCount: v.number(),
    tier: v.string(),
    model: v.optional(v.string()),
    // Per-agent telemetry (added 2026-04-28). Legacy rows missing these
    // should be treated as agentSlug="chat-proxy-grok", turn=1, stream=1.
    // stream: 1 = LLP-paid (Grok / Gemini), 2 = subsidy (GPT-5.4 / Claude).
    agentSlug: v.optional(v.string()),
    turn: v.optional(v.number()),
    stream: v.optional(v.number()),
    resetAt: v.number(), // timestamp
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_date", ["date"])
    .index("by_agent_date", ["agentSlug", "date"]),

  intentLogs: defineTable({
    userId: v.string(),
    intents: v.array(v.string()),
    primaryIntent: v.string(),
    domain: v.string(),
    crossDomains: v.optional(v.array(v.string())),
    perspective: v.string(),
    urgency: v.string(),
    language: v.string(),
    tier: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    templateUsed: v.optional(v.string()),
    outOfScope: v.boolean(),
    blocked: v.optional(v.boolean()),
    blockedIntents: v.optional(v.array(v.string())),
    productMentioned: v.optional(v.string()),
    productTrigger: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_domain", ["domain"])
    .index("by_timestamp", ["timestamp"])
    .index("by_outOfScope", ["outOfScope"]),

  tierConfig: defineTable({
    tier: v.string(), // slug: free_guest, free_subscribed, mini, max
    label: v.string(),
    tierType: v.optional(v.union(v.literal("free"), v.literal("paid"))),
    requiresAccount: v.optional(v.boolean()),
    allowedIntents: v.array(v.string()),
    dailyRequestLimit: v.number(),
    rateLimit: v.number(), // per minute
    fileUploadAllowed: v.boolean(),
    crossDomainAllowed: v.boolean(),
    advisoryAllowed: v.boolean(),
    price: v.optional(v.number()), // BDT per month, null for free
    stripeProductId: v.optional(v.union(v.string(), v.null())),
    isActive: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_tier", ["tier"]),

  templates: defineTable({
    domain: v.string(),
    docType: v.string(), // policy, notice, letter, deed, complaint
    title: v.string(),
    titleBn: v.optional(v.string()),
    content: v.string(), // markdown
    version: v.string(),
    lastReviewed: v.number(),
    reviewedBy: v.string(),
    isActive: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_domain", ["domain"])
    .index("by_domain_docType", ["domain", "docType"])
    .index("by_active", ["isActive"]),

  // ── Headhunting Module ──────────────────────────────────────────

  htClients: defineTable({
    companyName: v.string(),
    industry: v.optional(v.string()),
    sector: v.optional(v.string()),
    logoId: v.optional(v.id("_storage")),
    website: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    companySize: v.optional(v.string()), // 1-50, 51-200, 201-500, 500+
    description: v.optional(v.string()),
    officeLocations: v.optional(v.array(v.string())),
    hiringVolume: v.optional(v.string()), // 1-5, 6-20, 21-50, 50+
    typicalFunctions: v.optional(v.array(v.string())),
    billingEntity: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    defaultConfidentiality: v.union(
      v.literal("full_mask"),
      v.literal("partial_clue"),
      v.literal("disclosed")
    ),
    defaultUrgency: v.optional(v.union(
      v.literal("standard"),
      v.literal("urgent"),
      v.literal("critical")
    )),
    notes: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    // ── Extended Company Profile (Phase 1 Hiring Flow) ──
    companyEmail: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    companyLocation: v.optional(v.string()),
    organisationType: v.optional(v.string()),
    businessStage: v.optional(v.string()),
    alternativeContact: v.optional(v.string()),
    orgId: v.optional(v.id("organizations")), // link to org account
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_orgId", ["orgId"])
    .searchIndex("search_name", { searchField: "companyName" }),

  htClientContacts: defineTable({
    clientId: v.id("htClients"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    designation: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    isPrimary: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_clerkId", ["clerkId"]),

  htMandates: defineTable({
    clientId: v.id("htClients"),
    contactPersonId: v.optional(v.id("htClientContacts")),
    source: v.union(
      v.literal("web_form"),
      v.literal("email"),
      v.literal("jd_upload"),
      v.literal("internal"),
      v.literal("sample_cv")
    ),
    rawTitle: v.string(),
    rawDescription: v.optional(v.string()),
    rawNotes: v.optional(v.string()),
    jdFileId: v.optional(v.id("_storage")),
    sampleCvFileId: v.optional(v.id("_storage")),
    urgency: v.union(
      v.literal("standard"),
      v.literal("urgent"),
      v.literal("critical")
    ),
    mandateType: v.union(
      v.literal("exclusive"),
      v.literal("non_exclusive"),
      v.literal("retainer")
    ),
    status: v.union(
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
    ),
    assignedAgentId: v.optional(v.string()),

    // ── Phase 2: Mandate Source / Commercial Structure ──
    mandateSource: v.optional(v.union(
      v.literal("llp_direct"),
      v.literal("collab_partner"),
      v.literal("shared")
    )),
    commercialOwner: v.optional(v.union(
      v.literal("llp"),
      v.literal("partner"),
      v.literal("shared")
    )),
    clientFacingBrand: v.optional(v.union(
      v.literal("llp"),
      v.literal("partner"),
      v.literal("co_branded")
    )),
    approvalOwner: v.optional(v.union(
      v.literal("llp_only"),
      v.literal("partner_only"),
      v.literal("llp_and_partner")
    )),
    scoutPayoutBasis: v.optional(v.union(
      v.literal("llp_direct_revenue"),
      v.literal("llp_partner_share"),
      v.literal("special_approved")
    )),
    partnerId: v.optional(v.id("collabPartners")),

    // Communication policy stage (v3.1 Client Workspace)
    communicationStage: v.optional(v.union(
      v.literal("pre_shortlist"),
      v.literal("shortlisted"),
      v.literal("interview"),
      v.literal("offer")
    )),
    // Whether client has confirmed this mandate (for offline-originated mandates)
    clientConfirmed: v.optional(v.boolean()),
    clientConfirmedAt: v.optional(v.number()),
    communicationLog: v.optional(v.array(v.object({
      timestamp: v.number(),
      channel: v.string(),
      note: v.string(),
      visibility: v.optional(v.union(
        v.literal("internal"),
        v.literal("scout"),
        v.literal("collaborator"),
        v.literal("client"),
        v.literal("applicant"),
      )),
    }))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_agent", ["assignedAgentId"]),

  // ── Client Hiring Flow (4-level hierarchy) ──────────────────────

  htHiringAssignments: defineTable({
    clientId: v.id("htClients"),
    clerkId: v.optional(v.string()), // submitting user
    assignmentName: v.string(),
    hiringSupportType: v.string(),
    hiringScopeSummary: v.optional(v.string()),
    totalOpenings: v.number(),
    hiringEntity: v.optional(v.string()),
    confidentialityPreference: v.optional(v.string()),
    geography: v.optional(v.string()),
    urgencyLevel: v.optional(v.string()),
    targetJoiningTimeline: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("in_review"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("filled"),
      v.literal("closed")
    ),
    // Link to legacy mandate if bridged
    mandateId: v.optional(v.id("htMandates")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_clerkId", ["clerkId"])
    .index("by_status", ["status"]),

  htRoleGroups: defineTable({
    assignmentId: v.id("htHiringAssignments"),
    groupName: v.string(),
    groupDescription: v.optional(v.string()),
    positionsInGroup: v.optional(v.number()),
    // Shared Hiring Conditions
    workMode: v.optional(v.string()),
    weeklyWorkingDays: v.optional(v.string()),
    shiftType: v.optional(v.string()),
    workingHours: v.optional(v.string()),
    jobLocation: v.optional(v.string()),
    travelRequirement: v.optional(v.string()),
    relocationSupport: v.optional(v.string()),
    // Shared Compensation
    monthlySalaryRange: v.optional(v.string()),
    annualCtcRange: v.optional(v.string()),
    variablePay: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    // Allowances
    cashBenefits: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    transportSupport: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    accommodationSupport: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    // Coverage
    medicalCoverage: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    lifeAccidentProtection: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    retirementBenefits: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    // Others
    leaveBenefits: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    learningDevelopment: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    careerGrowth: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    otherBenefits: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    // Attachments
    jdFileId: v.optional(v.id("_storage")),
    rjpFileId: v.optional(v.id("_storage")),
    compensationSheetFileId: v.optional(v.id("_storage")),
    orgChartFileId: v.optional(v.id("_storage")),
    otherDocFileIds: v.optional(v.array(v.id("_storage"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_assignment", ["assignmentId"]),

  htRoles: defineTable({
    roleGroupId: v.id("htRoleGroups"),
    assignmentId: v.id("htHiringAssignments"),
    roleTitle: v.string(),
    department: v.optional(v.string()),
    seniorityLevel: v.optional(v.string()),
    openings: v.number(),
    reportingTo: v.optional(v.string()),
    roleSummary: v.optional(v.string()),
    mustHaveCriteria: v.optional(v.string()),
    goodToHaveCriteria: v.optional(v.string()),
    roleNotes: v.optional(v.string()),
    // ── Phase 2: Role-level overrides (take precedence over group) ──
    overriddenFields: v.optional(v.array(v.string())), // tracks which fields are overridden
    // Work condition overrides
    ovWorkMode: v.optional(v.string()),
    ovWeeklyWorkingDays: v.optional(v.string()),
    ovShiftType: v.optional(v.string()),
    ovWorkingHours: v.optional(v.string()),
    ovJobLocation: v.optional(v.string()),
    ovTravelRequirement: v.optional(v.string()),
    ovRelocationSupport: v.optional(v.string()),
    // Compensation overrides
    ovMonthlySalaryRange: v.optional(v.string()),
    ovAnnualCtcRange: v.optional(v.string()),
    ovVariablePay: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    // Benefit overrides
    ovCashBenefits: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    ovTransportSupport: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    ovAccommodationSupport: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    ovMedicalCoverage: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    ovLifeAccidentProtection: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    ovRetirementBenefits: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    ovLeaveBenefits: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    ovLearningDevelopment: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    ovCareerGrowth: v.optional(v.object({ enabled: v.boolean(), note: v.optional(v.string()) })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_roleGroup", ["roleGroupId"])
    .index("by_assignment", ["assignmentId"]),

  htAuditLog: defineTable({
    entityType: v.union(
      v.literal("assignment"),
      v.literal("roleGroup"),
      v.literal("role"),
      v.literal("client")
    ),
    entityId: v.string(),
    action: v.string(), // created, updated, status_changed, submitted, converted_to_mandate, etc.
    changes: v.optional(v.string()), // JSON summary of what changed
    performedBy: v.optional(v.string()), // Clerk user ID
    performedByName: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_timestamp", ["timestamp"]),

  htRoleBlueprints: defineTable({
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
    // Mandate Intake Matrix (Phase 2)
    industry: v.optional(v.string()),
    teamSize: v.optional(v.string()),
    exposureType: v.optional(v.union(v.literal("plant"), v.literal("project"), v.literal("corporate"), v.literal("mixed"))),
    greenBrownField: v.optional(v.union(v.literal("greenfield"), v.literal("brownfield"), v.literal("both"))),
    preferredAttributes: v.optional(v.array(v.string())),
    disqualifiers: v.optional(v.array(v.string())),
    geography: v.optional(v.string()),
    mustHaves: v.array(v.string()),
    dealBreakers: v.optional(v.array(v.string())),
    criticalMatchPoints: v.array(v.string()),
    generalMatchPoints: v.optional(v.array(v.string())),
    targetSectors: v.optional(v.array(v.string())),
    searchNotes: v.optional(v.string()), // internal, not visible to scouts
    confidentialityLevel: v.union(
      v.literal("full_mask"),
      v.literal("partial_clue"),
      v.literal("disclosed"),
      v.literal("highly_confidential"),
      v.literal("executive_confidential")
    ),
    shortlistMin: v.number(),
    shortlistMax: v.number(),
    compensationMode: v.union(
      v.literal("revenue_share"),
      v.literal("fixed_bounty")
    ),
    version: v.number(),
    status: v.union(
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
    ),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    clientApprovedBy: v.optional(v.string()),
    clientApprovedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),

    // ── Role Identity expansion ──────────────────────────────────
    roleBand: v.optional(v.union(
      v.literal("entry_junior"),
      v.literal("management_functional"),
      v.literal("executive_clevel")
    )),
    subFunction: v.optional(v.string()),
    searchGeography: v.optional(v.string()),
    roleType: v.optional(v.union(
      v.literal("new_role"),
      v.literal("replacement"),
      v.literal("confidential_replacement")
    )),

    // ── Mandate Context ──────────────────────────────────────────
    whyRoleExists: v.optional(v.string()),
    whyNow: v.optional(v.string()),
    businessContext: v.optional(v.string()),
    teamContext: v.optional(v.string()),
    operatingEnvironment: v.optional(v.string()),
    primaryMissionArchetype: v.optional(v.string()),
    secondaryMissionArchetype: v.optional(v.string()),

    // ── Scope and Authority ──────────────────────────────────────
    directReports: v.optional(v.number()),
    indirectReports: v.optional(v.string()),
    budgetScope: v.optional(v.string()),
    decisionAuthority: v.optional(v.string()),
    stakeholderLevel: v.optional(v.string()),
    boardInvestorExposure: v.optional(v.string()),
    pnlOwnership: v.optional(v.object({
      hasOwnership: v.boolean(),
      note: v.optional(v.string()),
    })),

    // ── Hard Gates expansion ─────────────────────────────────────
    mustHaveDetails: v.optional(v.array(v.object({
      tag: v.string(),
      note: v.optional(v.string()),
    }))),
    dealBreakerDetails: v.optional(v.array(v.object({
      tag: v.string(),
      note: v.optional(v.string()),
    }))),
    mandatoryEducation: v.optional(v.string()),
    minimumExperience: v.optional(v.object({
      years: v.number(),
      note: v.optional(v.string()),
    })),
    mandatoryIndustry: v.optional(v.array(v.string())),
    mandatoryFunctionalDepth: v.optional(v.array(v.string())),
    licensesOrCertifications: v.optional(v.array(v.string())),
    travelMobilityRequirement: v.optional(v.string()),
    languageRequirement: v.optional(v.array(v.string())),

    // ── Match Logic expansion ────────────────────────────────────
    criticalMatchDetails: v.optional(v.array(v.object({
      tag: v.string(),
      note: v.optional(v.string()),
    }))),
    generalMatchDetails: v.optional(v.array(v.object({
      tag: v.string(),
      note: v.optional(v.string()),
    }))),
    toleranceAreas: v.optional(v.array(v.object({
      tag: v.string(),
      note: v.optional(v.string()),
    }))),
    transferableBackgrounds: v.optional(v.array(v.string())),
    adjacentSectorsAllowed: v.optional(v.array(v.string())),
    riskFlags: v.optional(v.array(v.object({
      tag: v.string(),
      note: v.optional(v.string()),
    }))),
    profileTypesToAvoid: v.optional(v.string()),

    // ── Success Profile ──────────────────────────────────────────
    sixMonthExpectation: v.optional(v.string()),
    twelveMonthOutcomes: v.optional(v.string()),
    challengeProfile: v.optional(v.string()),
    maturityNeeded: v.optional(v.string()),
    leadershipStyleNeeded: v.optional(v.string()),
    motivationFit: v.optional(v.string()),
    cultureOperatingStyle: v.optional(v.array(v.string())),

    // ── Search Architecture ──────────────────────────────────────
    targetCompanyTypes: v.optional(v.array(v.string())),
    searchScope: v.optional(v.union(
      v.literal("local"),
      v.literal("regional"),
      v.literal("global")
    )),
    competitorExclusionList: v.optional(v.array(v.string())),
    searchSensitivity: v.optional(v.string()),
    marketLanguageConsiderations: v.optional(v.string()),
    controlledReleaseInstruction: v.optional(v.string()),

    // ── Commercial expansion ─────────────────────────────────────
    exclusivityStatus: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    clientVisibleNotes: v.optional(v.string()),
    scoutVisibleNotes: v.optional(v.string()),

    // ── Source material ──────────────────────────────────────────
    sourceDocumentIds: v.optional(v.array(v.id("_storage"))),
    sourceText: v.optional(v.string()),

    // ── Visibility overrides (Phase 2 ready) ─────────────────────
    visibilityOverrides: v.optional(v.array(v.object({
      fieldPath: v.string(),
      visibility: v.union(
        v.literal("internal_only"),
        v.literal("client_visible"),
        v.literal("scout_visible"),
        v.literal("masked_scout_visible"),
        v.literal("restricted_scout_visible")
      ),
    }))),

    // ── AI metadata (Phase 2 ready) ──────────────────────────────
    aiFieldStates: v.optional(v.any()),

    // ── Lifecycle ────────────────────────────────────────────────
    lifecycleStatus: v.optional(v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("cancelled"),
      v.literal("archived")
    )),
    pauseReason: v.optional(v.string()),
    cancelReason: v.optional(v.string()),

    // ── Client validation ────────────────────────────────────────
    validationToken: v.optional(v.string()),
    validationTokenExpiresAt: v.optional(v.number()),
    clientValidationSentAt: v.optional(v.number()),
    clientFinalizedAt: v.optional(v.number()),
    clientRevisions: v.optional(v.any()),
    clientGeneralNote: v.optional(v.string()),

    // ── Release control ──────────────────────────────────────────
    releaseApprovedBy: v.optional(v.string()),
    releaseApprovedAt: v.optional(v.number()),
    releasedAt: v.optional(v.number()),
    selectedScoutIds: v.optional(v.array(v.string())),

    // ── Status history ───────────────────────────────────────────
    statusHistory: v.optional(v.array(v.object({
      from: v.string(),
      to: v.string(),
      changedBy: v.string(),
      changedAt: v.number(),
      reason: v.optional(v.string()),
    }))),

    // ── Assigned admin ───────────────────────────────────────────
    assignedTo: v.optional(v.string()),

    // ── Routing weight tuning (Phase 3) ─────────────────────────
    routingWeights: v.optional(v.any()),
  })
    .index("by_mandate", ["mandateId"])
    .index("by_status", ["status"])
    .index("by_assigned", ["assignedTo"])
    .index("by_lifecycle", ["lifecycleStatus"])
    .index("by_validation_token", ["validationToken"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status", "roleBand"],
    }),

  htBriefReleases: defineTable({
    mandateId: v.id("htMandates"),
    blueprintId: v.id("htRoleBlueprints"),
    scoutId: v.string(), // expert clerkId
    disclosureLevel: v.union(
      v.literal("full_mask"),
      v.literal("partial_clue"),
      v.literal("disclosed")
    ),
    compensationMode: v.union(
      v.literal("revenue_share"),
      v.literal("fixed_bounty")
    ),
    referralCode: v.optional(v.string()),
    slotsAllocated: v.optional(v.number()),
    slotsUsed: v.optional(v.number()),
    releasedAt: v.number(),
    viewedAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
  })
    .index("by_mandate", ["mandateId"])
    .index("by_scout", ["scoutId"])
    .index("by_scout_mandate", ["scoutId", "mandateId"])
    .index("by_referral_code", ["referralCode"]),

  htScoutBriefs: defineTable({
    blueprintId: v.id("htRoleBlueprints"),
    version: v.number(),
    roleTitle: v.string(),
    employerDisplay: v.union(v.literal("named"), v.literal("masked")),
    employerName: v.optional(v.string()),
    maskDescription: v.optional(v.string()),
    functionAndLevel: v.string(),
    location: v.string(),
    mustHaves: v.array(v.string()),
    criticalMatchLogic: v.string(),
    dealBreakerLogic: v.optional(v.string()),
    challengeSummary: v.optional(v.string()),
    targetSectorGuidance: v.optional(v.string()),
    submissionGuidance: v.optional(v.string()),
    roleSummaryNarrative: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("released"),
      v.literal("recalled")
    ),
    releasedAt: v.optional(v.number()),
    releasedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_blueprint", ["blueprintId"])
    .index("by_status", ["status"]),

  htConflictRecords: defineTable({
    scoutClerkId: v.string(),
    companyName: v.string(),
    companyNameNormalized: v.string(), // lowercase, trimmed for matching
    conflictType: v.union(
      v.literal("current_employer"),
      v.literal("recent_employer"),
      v.literal("declared_conflict"),
      v.literal("manual_exclusion"),
      v.literal("group_company"),
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    coolingPeriodMonths: v.number(), // default 24
    declaredBy: v.optional(v.string()), // clerk ID of who declared
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_scout", ["scoutClerkId"])
    .index("by_company", ["companyNameNormalized"])
    .index("by_scout_active", ["scoutClerkId", "isActive"])
    .index("by_type", ["conflictType"]),

  htSubmissions: defineTable({
    mandateId: v.id("htMandates"),
    candidateUserId: v.optional(v.string()), // Clerk user ID if from platform
    candidateName: v.string(),
    candidateEmail: v.string(),
    candidatePhone: v.optional(v.string()),
    candidateLinkedin: v.optional(v.string()),
    sourceChannel: v.union(
      v.literal("scout"),
      v.literal("self_application"),
      v.literal("llp_internal"),
      v.literal("ai_match")
    ),
    scoutId: v.optional(v.string()), // expert/scout Clerk ID
    cvFileId: v.optional(v.id("_storage")),
    coverLetterFileId: v.optional(v.id("_storage")),
    structuredFitForm: v.optional(v.object({
      criticalYesNo: v.array(v.object({
        point: v.string(),
        met: v.boolean(),
        note: v.optional(v.string()),
      })),
      generalFit: v.optional(v.array(v.object({
        point: v.string(),
        score: v.number(), // 1-5
      }))),
      scoutConfidence: v.optional(v.number()), // 1-5
    })),
    duplicateStatus: v.union(
      v.literal("unique"),
      v.literal("duplicate_rejected"),
      v.literal("dispute")
    ),
    duplicateDecisionLog: v.optional(v.object({
      checkedAgainst: v.string(),
      reason: v.string(),
      timestamp: v.number(),
    })),
    ownershipTimestamp: v.number(),
    status: v.union(
      // Pre-LLP intake (new)
      v.literal("pending_scout_review"),
      v.literal("pending_verification"),
      v.literal("verification_expired"),
      // LLP intake
      v.literal("submitted_to_llp"),
      v.literal("under_review"),
      v.literal("verified"),
      // Client-facing
      v.literal("shortlist_shared"),
      v.literal("interview"),
      v.literal("offer_stage"),
      v.literal("offer_extended"),
      v.literal("offer_accepted"),
      v.literal("joined"),
      // Terminal
      v.literal("rejected"),
      v.literal("withdrawn"),
      // Legacy (backward compat — remove after migration)
      v.literal("submitted"),
      v.literal("screening"),
      v.literal("shortlisted"),
      v.literal("selected"),
      v.literal("offer"),
    ),
    rejectionReason: v.optional(v.string()),
    notes: v.optional(v.string()),
    // AI-generated fields
    aiCvSummary: v.optional(v.string()),
    aiParsedData: v.optional(v.object({
      name: v.optional(v.string()),
      currentTitle: v.optional(v.string()),
      currentCompany: v.optional(v.string()),
      yearsExperience: v.optional(v.number()),
      skills: v.optional(v.array(v.string())),
      education: v.optional(v.array(v.object({
        degree: v.optional(v.string()),
        institution: v.optional(v.string()),
        year: v.optional(v.string()),
      }))),
      experience: v.optional(v.array(v.object({
        title: v.optional(v.string()),
        company: v.optional(v.string()),
        duration: v.optional(v.string()),
        description: v.optional(v.string()),
      }))),
      salary: v.optional(v.string()),
      location: v.optional(v.string()),
      noticePeriod: v.optional(v.string()),
    })),
    aiFitScore: v.optional(v.number()), // 0-100 overall
    aiFitDetails: v.optional(v.object({
      criticalMatches: v.optional(v.array(v.object({
        point: v.string(),
        met: v.boolean(),
        score: v.number(),
        reason: v.string(),
      }))),
      generalMatches: v.optional(v.array(v.object({
        point: v.string(),
        score: v.number(),
        reason: v.string(),
      }))),
      gaps: v.optional(v.array(v.string())),
      strengths: v.optional(v.array(v.string())),
      risks: v.optional(v.array(v.string())),
      complianceFlags: v.optional(v.array(v.string())),
    })),
    // Scout pending queue
    scoutRejected: v.optional(v.boolean()),
    scoutRejectionReason: v.optional(v.string()),
    // Verification
    verificationToken: v.optional(v.string()),
    verificationSentAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    verificationExpiresAt: v.optional(v.number()),
    // Consent
    consentCapturedAt: v.optional(v.number()),
    consentMethod: v.optional(v.union(
      v.literal("form_checkbox"),
      v.literal("email_confirmation"),
      v.literal("verbal_confirmed"),
    )),
    // Human recommendation (separate from AI)
    scoutRecommendationScore: v.optional(v.number()),
    scoutRecommendationNote: v.optional(v.string()),
    // Origin protection
    originScoutId: v.optional(v.string()),
    originProtectionExpiry: v.optional(v.number()),
    // Entry method
    referralCode: v.optional(v.string()),
    entryMethod: v.optional(v.union(
      v.literal("direct_apply"),
      v.literal("scout_code_apply"),
      v.literal("scout_assisted"),
    )),
    // Dedup enhancement
    candidateCurrentOrg: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_mandate", ["mandateId"])
    .index("by_status", ["status"])
    .index("by_candidate", ["candidateUserId"])
    .index("by_scout", ["scoutId"])
    .index("by_mandate_status", ["mandateId", "status"])
    .index("by_scout_status", ["scoutId", "status"])
    .index("by_verification_expiry", ["verificationExpiresAt"])
    .index("by_referral", ["referralCode"])
    .index("by_origin_scout", ["originScoutId"]),

  htCandidateVerifications: defineTable({
    submissionId: v.id("htSubmissions"),
    token: v.string(),
    candidateEmail: v.string(),
    sentAt: v.number(),
    expiresAt: v.number(),
    verifiedAt: v.optional(v.number()),
    expired: v.boolean(),
  })
    .index("by_token", ["token"])
    .index("by_submission", ["submissionId"])
    .index("by_expiry", ["expiresAt"]),

  htOriginProtections: defineTable({
    candidateEmail: v.string(),
    candidatePhone: v.optional(v.string()),
    candidateName: v.string(),
    candidateCurrentOrg: v.optional(v.string()),
    originScoutId: v.string(),
    originMandateId: v.id("htMandates"),
    originSubmissionId: v.id("htSubmissions"),
    protectedUntil: v.number(),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.string()),
    revokedReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["candidateEmail"])
    .index("by_scout", ["originScoutId"])
    .index("by_expiry", ["protectedUntil"]),

  htOpportunities: defineTable({
    candidateUserId: v.string(), // Clerk user ID
    mandateId: v.optional(v.id("htMandates")),
    matchSource: v.union(
      v.literal("ai_match"),
      v.literal("scout_submit"),
      v.literal("agent_manual")
    ),
    matchScore: v.optional(v.number()), // 0-100
    matchReasons: v.optional(v.array(v.string())),
    roleTitle: v.string(), // may be masked per confidentiality
    location: v.optional(v.string()),
    salaryRange: v.optional(v.string()),
    companyHint: v.optional(v.string()), // partial clue or masked
    status: v.union(
      v.literal("pending"),
      v.literal("interested"),
      v.literal("declined"),
      v.literal("shared"),
      v.literal("withdrawn")
    ),
    candidateResponse: v.optional(v.object({
      interested: v.boolean(),
      message: v.optional(v.string()),
      sharedProfileAt: v.optional(v.number()),
      sharedCvAt: v.optional(v.number()),
    })),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_user", ["candidateUserId"])
    .index("by_user_status", ["candidateUserId", "status"])
    .index("by_mandate", ["mandateId"]),

  htScreeningRecords: defineTable({
    submissionId: v.id("htSubmissions"),
    reviewedBy: v.string(),
    fitScore: v.optional(v.number()), // 1-10
    ragFlag: v.optional(v.union(v.literal("red"), v.literal("amber"), v.literal("green"))),
    roleMatchNotes: v.optional(v.string()),
    reportingLineNote: v.optional(v.string()),
    careerFlowNote: v.optional(v.string()),
    compensationNote: v.optional(v.string()),
    noticePeriodNote: v.optional(v.string()),
    locationNote: v.optional(v.string()),
    informationGaps: v.optional(v.array(v.string())),
    aiSummary: v.optional(v.string()),
    comments: v.optional(v.array(v.object({
      author: v.string(),
      text: v.string(),
      timestamp: v.number(),
      visibility: v.optional(v.union(
        v.literal("internal"),
        v.literal("scout"),
        v.literal("collaborator"),
        v.literal("client"),
        v.literal("applicant"),
      )),
    }))),
    updatedAt: v.number(),
  })
    .index("by_submission", ["submissionId"]),

  htShortlistPacks: defineTable({
    mandateId: v.id("htMandates"),
    submissionIds: v.array(v.id("htSubmissions")),
    sentToClientAt: v.optional(v.number()),
    clientFeedback: v.optional(v.string()),
    version: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("internal_approved"),
      v.literal("sent_to_collaborator"),
      v.literal("collaborator_released"),
      v.literal("sent"),
      v.literal("reviewed"),
      v.literal("accepted"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    collaboratorReviewedAt: v.optional(v.number()),
    collaboratorReviewedBy: v.optional(v.string()),
    collaboratorNotes: v.optional(v.string()),
  })
    .index("by_mandate", ["mandateId"]),

  htPlacements: defineTable({
    mandateId: v.id("htMandates"),
    submissionId: v.id("htSubmissions"),
    candidateName: v.string(),
    offerAcceptedAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
    salary: v.optional(v.number()),
    feeFormula: v.optional(v.string()),
    feeAmount: v.optional(v.number()),
    protectionWindowEnd: v.optional(v.number()),
    status: v.union(
      v.literal("offer_accepted"),
      v.literal("joined"),
      v.literal("invoiced"),
      v.literal("paid"),
      v.literal("protection_active"),
      v.literal("protection_cleared"),
      v.literal("replacement_triggered")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_mandate", ["mandateId"])
    .index("by_status", ["status"]),

  htPayoutRecords: defineTable({
    placementId: v.id("htPlacements"),
    contributorType: v.union(
      v.literal("individual_scout"),
      v.literal("scout_company"),
      v.literal("self_applicant"),
      v.literal("llp_internal")
    ),
    contributorId: v.string(),
    rewardFormula: v.optional(v.string()),
    rewardAmount: v.optional(v.number()),
    holdReason: v.optional(v.string()),
    holdUntil: v.optional(v.number()),
    status: v.union(
      v.literal("held"),
      v.literal("eligible"),
      v.literal("released"),
      v.literal("exception")
    ),
    releasedAt: v.optional(v.number()),
    exceptionNotes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_placement", ["placementId"])
    .index("by_contributor", ["contributorId"])
    .index("by_status", ["status"]),

  htPaymentChain: defineTable({
    placementId: v.id("htPlacements"),
    mandateId: v.id("htMandates"),
    chainType: v.union(v.literal("standard"), v.literal("collaborator")),
    // Client payment
    clientInvoiceAmount: v.optional(v.number()),
    clientInvoicedAt: v.optional(v.number()),
    clientPaidAt: v.optional(v.number()),
    // Collaborator leg
    collaboratorId: v.optional(v.id("collabPartners")),
    collaboratorReceivedAt: v.optional(v.number()),
    collaboratorPaidLlpAt: v.optional(v.number()),
    collaboratorPaidAmount: v.optional(v.number()),
    // LLP receipt
    llpReceivedAmount: v.optional(v.number()),
    llpReceivedAt: v.optional(v.number()),
    // Scout payout
    scoutId: v.optional(v.string()),
    scoutPayoutAmount: v.optional(v.number()),
    scoutPayoutDeadline: v.optional(v.number()),
    scoutPaidAt: v.optional(v.number()),
    // Status
    status: v.union(
      v.literal("invoice_sent"),
      v.literal("client_paid"),
      v.literal("collab_received"),
      v.literal("collab_paid_llp"),
      v.literal("llp_received"),
      v.literal("scout_payout_pending"),
      v.literal("scout_paid"),
      v.literal("completed"),
      v.literal("disputed"),
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_placement", ["placementId"])
    .index("by_mandate", ["mandateId"])
    .index("by_status", ["status"])
    .index("by_scout_payout_deadline", ["scoutPayoutDeadline"]),

  // ═══════════════════════════════════════════════════════════════
  // Phase 5 — Requirement Matrix & Candidate Assessments
  // ═══════════════════════════════════════════════════════════════

  htRequirementMatrix: defineTable({
    mandateId: v.id("htMandates"),
    requirements: v.array(v.object({
      id: v.string(), // unique within this matrix, e.g. "REQ-001"
      category: v.union(
        v.literal("technical"),
        v.literal("experience"),
        v.literal("education"),
        v.literal("soft_skill"),
        v.literal("cultural"),
        v.literal("commercial"),
        v.literal("other")
      ),
      label: v.string(), // e.g. "10+ years plant commissioning"
      description: v.optional(v.string()),
      priority: v.union(
        v.literal("must_have"),
        v.literal("strong_preference"),
        v.literal("nice_to_have")
      ),
      weight: v.number(), // 1-10 relative importance
      sourceField: v.optional(v.string()), // blueprint field this was generated from
    })),
    createdBy: v.string(),
    updatedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_mandate", ["mandateId"]),

  htCandidateAssessments: defineTable({
    mandateId: v.id("htMandates"),
    submissionId: v.id("htSubmissions"),
    matrixId: v.id("htRequirementMatrix"),
    // Per-requirement scores (rich format — Sprint 1)
    scores: v.array(v.object({
      requirementId: v.string(), // matches htRequirementMatrix.requirements[].id
      // AI evaluation (rich per-requirement)
      aiMatchLevel: v.optional(v.union(
        v.literal("Matched"),
        v.literal("Partially Matched"),
        v.literal("Not Clearly Evident"),
        v.literal("Not Matched"),
        v.literal("Potential Red Flag"),
      )),
      aiConfidence: v.optional(v.union(v.literal("High"), v.literal("Medium"), v.literal("Low"))),
      aiEvidence: v.optional(v.string()),
      aiMissingEvidence: v.optional(v.string()),
      aiConcern: v.optional(v.string()),
      // Scout override
      scoutMatchLevel: v.optional(v.string()),
      scoutJustification: v.optional(v.string()),
      scoutReviewedAt: v.optional(v.number()),
      // Legacy numeric (kept for backward compat)
      aiScore: v.optional(v.number()),
      aiReason: v.optional(v.string()),
      scoutScore: v.optional(v.number()),
      scoutNote: v.optional(v.string()),
      finalScore: v.optional(v.number()),
    })),
    // Aggregate scores
    weightedTotal: v.optional(v.number()), // legacy
    maxPossible: v.optional(v.number()),   // legacy
    matchPercentage: v.optional(v.number()), // legacy 0-100
    // Rich aggregate scores (Sprint 1)
    overallMatchPct: v.optional(v.number()),    // 0-100 all requirements weighted
    mandatoryMatchPct: v.optional(v.number()),  // 0-100 must_have only (primary filter)
    goodToHaveMatchPct: v.optional(v.number()), // 0-100 nice_to_have only
    riskFlagCount: v.optional(v.number()),      // red flags + mandatory misses
    recommendation: v.optional(v.union(
      v.literal("Strong"),
      v.literal("Moderate"),
      v.literal("Weak"),
      v.literal("Not Recommended"),
    )),
    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("ai_scored"),
      v.literal("scout_reviewed"),
      v.literal("finalized")
    ),
    aiScoredAt: v.optional(v.number()),
    scoutReviewedAt: v.optional(v.number()),
    scoutReviewedBy: v.optional(v.string()),
    finalizedAt: v.optional(v.number()),
    finalizedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_mandate", ["mandateId"])
    .index("by_submission", ["submissionId"])
    .index("by_matrix", ["matrixId"])
    .index("by_mandate_status", ["mandateId", "status"]),

  // ═══════════════════════════════════════════════════════════════
  // Phase 4.3 — Configurable Business Rules
  // ═══════════════════════════════════════════════════════════════

  htConfigRules: defineTable({
    key: v.string(), // e.g. "default_fee_formula", "protection_months_manager"
    value: v.string(), // serialized value
    label: v.string(), // human-readable label
    category: v.union(
      v.literal("fees"),
      v.literal("protection"),
      v.literal("matching"),
      v.literal("briefs"),
      v.literal("general")
    ),
    updatedBy: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"]),

  // ═══════════════════════════════════════════════════════════════
  // Scout Join Form — 18-Section Profile
  // ═══════════════════════════════════════════════════════════════

  htScoutProfiles: defineTable({
    clerkId: v.string(),

    // S1: Basic Identity
    fullName: v.string(),
    currentTitle: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
    location: v.optional(v.string()),
    mobile: v.optional(v.string()),
    email: v.string(),
    linkedin: v.optional(v.string()),
    oneLiner: v.optional(v.string()), // "I connect with..."
    // S1: Experience depth
    totalYearsExperience: v.optional(v.string()), // "<2", "2-5", "5-10", "10-15", "15-20", "20+"

    // S2: Current Professional Base (single select)
    professionalBase: v.optional(v.string()), // HR, TA, Search, Leadership, etc.
    professionalBaseOther: v.optional(v.string()), // Free-text when "Other" selected

    // S3: Function Specialization
    functionPrimary: v.optional(v.array(v.string())),   // up to 3
    functionSecondary: v.optional(v.array(v.string())), // up to 5
    functionBasis: v.optional(v.string()),              // why these functions

    // S4: Industry Specialization
    industryPrimary: v.optional(v.array(v.string())),   // up to 2
    industrySecondary: v.optional(v.array(v.string())), // up to 4
    industryBasis: v.optional(v.string()),

    // S5: Talent Access Segments (which pools they can source)
    talentAccessSegments: v.optional(v.array(v.string())),

    // S6: Talent Access Basis (WHY they can access those segments)
    talentAccessBasis: v.optional(v.array(v.string())),

    // S7: Role Level Reach + Hiring Experience Type
    roleLevelReach: v.optional(v.array(v.string())),
    hiringExperienceTypes: v.optional(v.array(v.string())),

    // S9: Hiring Scope Exposure
    hiringScope: v.optional(v.array(v.string())),
    seniorityExposure: v.optional(v.array(v.string())),
    // S8: Recruitment intensity
    recruitmentYears: v.optional(v.string()), // "<2", "2-4", "4-7", "7-10", "10+"
    hiringPercentage: v.optional(v.string()), // "<20%", "20-40%", "40-60%", "60-80%", "80%+"

    // S10: Countries Supported
    countriesSupported: v.optional(v.array(v.string())),
    countriesOther: v.optional(v.string()),

    // S11: Hiring Corridor Experience (BD↔BD, BD↔India, etc.)
    hiringCorridors: v.optional(v.array(v.string())),
    corridorsOther: v.optional(v.string()),

    // S12: Hiring/Interview Geography Exposure
    geographyExposure: v.optional(v.array(v.object({
      geography: v.string(),
      exposureTypes: v.array(v.string()), // hired from, hired into, interviewed
    }))),

    // S10-S12 v2: Enhanced Geography (2026-03 spec)
    primarySourcingMarkets: v.optional(v.array(v.object({
      country: v.string(),
      strength: v.union(v.literal("Strong"), v.literal("Moderate"), v.literal("Limited")),
      type: v.union(v.literal("Active sourcing"), v.literal("Market understanding"), v.literal("Past hiring exposure")),
    }))),
    crossBorderCorridors: v.optional(v.array(v.object({
      corridor: v.string(),
      strength: v.union(v.literal("Strong"), v.literal("Moderate"), v.literal("Limited")),
      type: v.union(v.literal("Active sourcing"), v.literal("Market understanding"), v.literal("Past hiring exposure")),
    }))),
    marketFamiliarity: v.optional(v.array(v.string())),
    geographyExample: v.optional(v.string()),

    // S13: Mandate Type Strength
    mandateTypeStrengths: v.optional(v.array(v.string())),
    // S14b: Network Freshness (legacy field from existing data)
    networkFreshness: v.optional(v.string()),

    // Talent Bank (optional opt-in on final step)
    talentBankConsent: v.optional(v.boolean()),
    talentBankCvStorageId: v.optional(v.id("_storage")),

    // S14: Professional Communities & Networks
    communitiesPrimary: v.optional(v.array(v.object({
      name: v.string(),
      role: v.optional(v.string()),
      country: v.optional(v.string()),
    }))), // up to 6
    communitiesAdditional: v.optional(v.array(v.object({
      name: v.string(),
      role: v.optional(v.string()),
      country: v.optional(v.string()),
    }))), // up to 6

    // S16: Working Preference
    activeScouting: v.optional(v.boolean()),
    involvementTypes: v.optional(v.array(v.string())),
    willingConfidential: v.optional(v.boolean()),
    willingCrossBorder: v.optional(v.boolean()),
    preferredLevels: v.optional(v.array(v.string())),

    // S17: Visibility Preference
    visibility: v.optional(v.union(
      v.literal("internal_only"),
      v.literal("public_listed"),
      v.literal("limited_public"),
      v.literal("employer_via_llp")
    )),

    // Scout Identity Privacy (Phase 2 — anonymous by default)
    identityMode: v.optional(v.union(
      v.literal("anonymous"),       // default — name never shown to clients
      v.literal("credited"),        // opt-in — name shown on placements
      v.literal("selective_reveal") // per-mandate — scout chooses each time
    )),

    // S18: Trust Summary + Confirmations
    confirmMasterAcceptance: v.optional(v.boolean()),
    confirmEmployerTrust: v.optional(v.boolean()),
    confirmPlatformConduct: v.optional(v.boolean()),

    // ── Scout Routing (Phase 2) ────────────────────────────────────
    networkDepthTags: v.optional(v.array(v.string())),
    confidentialitySuitability: v.optional(v.union(
      v.literal("restricted"),
      v.literal("standard"),
      v.literal("trusted"),
      v.literal("high_discretion"),
      v.literal("executive_confidential"),
    )),
    maxActiveMandates: v.optional(v.number()), // capacity limit, default 10

    // Meta
    profileId: v.optional(v.string()), // generated on submission e.g. SCT-0001
    currentStep: v.optional(v.number()), // form progress tracking
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("removed")
    ),
    removedBy: v.optional(v.string()),
    removedAt: v.optional(v.number()),
    removalReason: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk", ["clerkId"])
    .index("by_status", ["status"])
    .index("by_profileId", ["profileId"]),

  // ═══════════════════════════════════════════════════════════════
  // Scout Form Suggestions
  // ═══════════════════════════════════════════════════════════════

  scoutSuggestions: defineTable({
    fieldName: v.string(), // "professionalBase", "industries", "functions", etc.
    suggestedValue: v.string(), // what the scout typed in "Other" field
    scoutClerkId: v.string(), // who made the suggestion
    scoutProfileId: v.optional(v.string()), // reference to scout profile
    
    // Review workflow
    status: v.union(
      v.literal("pending"),
      v.literal("approved"), 
      v.literal("rejected"),
      v.literal("edited") // approved but with admin modifications
    ),
    adminDecision: v.optional(v.string()), // final approved value (may differ from suggested)
    adminNotes: v.optional(v.string()), // why rejected or how it was modified
    reviewedBy: v.optional(v.string()), // admin clerk ID who reviewed
    reviewedAt: v.optional(v.number()),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_field", ["fieldName", "status"])
    .index("by_scout", ["scoutClerkId"])
    .index("by_reviewer", ["reviewedBy"]),

  // ═══════════════════════════════════════════════════════════════
  // Sprint 4 — Scout Performance Tracking (silent, LLP-internal)
  // ═══════════════════════════════════════════════════════════════

  htScoutPerformanceEvents: defineTable({
    scoutId: v.string(),            // Clerk user ID
    mandateId: v.optional(v.id("htMandates")),
    submissionId: v.optional(v.id("htSubmissions")),
    eventType: v.union(
      v.literal("submission_created"),
      v.literal("submission_shortlisted"),
      v.literal("submission_rejected"),
      v.literal("duplicate_flagged"),
      v.literal("override_recorded"),    // scout changed AI rating
      v.literal("client_accepted"),      // client chose to interview
      v.literal("client_passed"),        // client passed on candidate
      v.literal("placement_confirmed"),
      v.literal("brief_viewed"),
      v.literal("brief_responded"),
    ),
    meta: v.optional(v.string()),       // JSON blob for extra context
    timestamp: v.number(),
  })
    .index("by_scout", ["scoutId"])
    .index("by_scout_event", ["scoutId", "eventType"])
    .index("by_mandate", ["mandateId"]),

  // Sprint 4 — Per-Country Scout Tier Ratings (LLP-internal, computed)
  htScoutCountryRatings: defineTable({
    scoutId: v.string(),            // Clerk user ID
    scoutProfileId: v.id("htScoutProfiles"),
    country: v.string(),
    score: v.number(),              // 0-100
    tier: v.union(
      v.literal("S"),               // Strategic (80-100)
      v.literal("P"),               // Professional (50-79)
      v.literal("E"),               // Emerging (25-49)
      v.literal("N"),               // New/Unrated (<25)
    ),
    breakdown: v.object({
      recruitmentExperience: v.number(),
      hiringDepth: v.number(),
      networkDepth: v.number(),
      functionalBreadth: v.number(),
      industryRange: v.number(),
    }),
    manualOverride: v.optional(v.object({
      tier: v.string(),
      reason: v.string(),
      overriddenBy: v.string(),
      overriddenAt: v.number(),
    })),
    computedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_scout", ["scoutId"])
    .index("by_scout_country", ["scoutId", "country"])
    .index("by_country_tier", ["country", "tier"]),

  // ═══════════════════════════════════════════════════════════════
  // Phase 5 — Collab Network
  // ═══════════════════════════════════════════════════════════════

  collabPartners: defineTable({
    companyName: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    brandColors: v.optional(v.object({
      primary: v.optional(v.string()),
      secondary: v.optional(v.string()),
    })),
    coverageLanes: v.optional(v.object({
      sectors: v.optional(v.array(v.string())),
      functions: v.optional(v.array(v.string())),
      geographies: v.optional(v.array(v.string())),
    })),
    revenueSharePct: v.optional(v.number()), // partner's cut of LLP fee (e.g. 30)
    status: v.union(
      v.literal("prospect"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("terminated")
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .searchIndex("search_name", { searchField: "companyName" }),

  collabContracts: defineTable({
    partnerId: v.id("collabPartners"),
    contractType: v.union(
      v.literal("referral"),
      v.literal("co_delivery"),
      v.literal("white_label")
    ),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    feeShareLlp: v.number(), // LLP's share percentage
    feeSharePartner: v.number(), // partner's share percentage
    feeShareScout: v.optional(v.number()), // scout's share percentage
    terms: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("expired"),
      v.literal("terminated")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_partner", ["partnerId"])
    .index("by_status", ["status"]),

  // ── Notifications (Phase 2) ─────────────────────────────────────────

  htNotifications: defineTable({
    recipientClerkId: v.string(),
    type: v.union(
      v.literal("mandate_new"),
      v.literal("mandate_approved"),
      v.literal("mandate_released"),
      v.literal("submission_received"),
      v.literal("duplicate_detected"),
      v.literal("shortlist_ready"),
      v.literal("review_completed"),
      v.literal("partner_review_pending"),
      v.literal("profiles_approved"),
      v.literal("mandate_closed"),
      v.literal("clarification_reply"),
      v.literal("blueprint_ready"),
      v.literal("client_confirmation_needed")
    ),
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()), // e.g. "/dashboard/mandates/abc123"
    mandateId: v.optional(v.id("htMandates")),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_recipient", ["recipientClerkId"])
    .index("by_recipient_read", ["recipientClerkId", "read"])
    .index("by_type", ["type"]),

  // ── Client Workspace: Clarification Requests ──────────────────────

  htClarifications: defineTable({
    mandateId: v.id("htMandates"),
    submissionId: v.optional(v.id("htSubmissions")), // null = mandate-level, set = candidate-level
    topic: v.string(), // e.g. "Notice period", "Compensation", "Location"
    messages: v.array(v.object({
      sender: v.union(v.literal("client"), v.literal("llp")),
      senderName: v.string(),
      senderClerkId: v.optional(v.string()),
      content: v.string(),
      timestamp: v.number(),
      visibility: v.optional(v.union(
        v.literal("internal"),
        v.literal("scout"),
        v.literal("collaborator"),
        v.literal("client"),
        v.literal("applicant"),
      )),
    })),
    status: v.union(
      v.literal("open"),
      v.literal("awaiting_llp"),
      v.literal("awaiting_client"),
      v.literal("resolved")
    ),
    createdBy: v.string(), // Clerk ID
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_mandate", ["mandateId"])
    .index("by_status", ["status"])
    .index("by_mandate_status", ["mandateId", "status"]),

  // ══════════════════════════════════════════════════════════════════
  // LLP Control Tower — Management Operating Module
  // ══════════════════════════════════════════════════════════════════

  // ─── Control Tower v2 — Full Launch Planning System ───────────────────────

  ctLaunchObjectives: defineTable({
    name: v.string(),
    successStatement: v.string(),
    executiveOwnerId: v.optional(v.string()),
    executiveOwnerName: v.optional(v.string()),
    targetPhase: v.string(), // e.g. "Phase 1 — Pre-Launch", "Phase 2 — Soft Launch"
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("awaiting_input"),
      v.literal("awaiting_review"),
      v.literal("blocked"),
      v.literal("completed"),
      v.literal("dropped"),
    ),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"]),

  ctWorkstreams: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["isActive"]),

  ctKpis: defineTable({
    objectiveId: v.optional(v.id("ctLaunchObjectives")), // linked objective
    workstreamId: v.id("ctWorkstreams"),
    title: v.string(),
    description: v.optional(v.string()),
    kpiType: v.optional(v.union(v.literal("readiness"), v.literal("outcome"))),
    metric: v.string(),
    targetValue: v.number(),
    actualValue: v.number(),
    unit: v.optional(v.string()),
    period: v.union(v.literal("weekly"), v.literal("monthly"), v.literal("quarterly")),
    cadence: v.optional(v.string()),        // e.g. "Weekly Friday review"
    sourceOfTruth: v.optional(v.string()),  // e.g. "Convex dashboard", "Google Sheets"
    ownerId: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    trend: v.optional(v.union(v.literal("up"), v.literal("down"), v.literal("flat"))),
    riskFlag: v.optional(v.union(
      v.literal("on_track"), v.literal("at_risk"), v.literal("behind"), v.literal("critical")
    )),
    riskNote: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("not_started"), v.literal("in_progress"), v.literal("awaiting_input"),
      v.literal("awaiting_review"), v.literal("blocked"), v.literal("completed"), v.literal("dropped"),
    )),
    note: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workstream", ["workstreamId"])
    .index("by_objective", ["objectiveId"])
    .index("by_risk", ["riskFlag"]),

  ctMilestones: defineTable({
    kpiId: v.id("ctKpis"),
    workstreamId: v.id("ctWorkstreams"),
    title: v.string(),
    description: v.optional(v.string()),
    ownerId: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    backupOwnerId: v.optional(v.string()),
    backupOwnerName: v.optional(v.string()),
    dueDate: v.number(),
    progressPercent: v.number(),
    acceptanceCriteria: v.optional(v.string()),
    riskLevel: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    blockerFlag: v.optional(v.boolean()),
    evidenceLink: v.optional(v.string()),
    lastUpdate: v.optional(v.string()), // free text last update note
    status: v.union(
      v.literal("not_started"), v.literal("in_progress"), v.literal("awaiting_input"),
      v.literal("awaiting_review"), v.literal("blocked"), v.literal("completed"), v.literal("dropped"),
    ),
    comments: v.optional(v.array(v.object({
      author: v.string(), text: v.string(), timestamp: v.number(),
    }))),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workstream", ["workstreamId"])
    .index("by_kpi", ["kpiId"])
    .index("by_status", ["status"])
    .index("by_owner", ["ownerId"]),

  ctTasks: defineTable({
    milestoneId: v.id("ctMilestones"),
    workstreamId: v.id("ctWorkstreams"),
    kpiId: v.optional(v.id("ctKpis")),  // denormalized for quick lookup
    title: v.string(),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
    backupOwnerId: v.optional(v.string()),
    backupOwnerName: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    status: v.union(
      v.literal("not_started"), v.literal("in_progress"), v.literal("awaiting_input"),
      v.literal("awaiting_review"), v.literal("blocked"), v.literal("completed"), v.literal("dropped"),
    ),
    dueDate: v.optional(v.number()),
    evidenceOutput: v.optional(v.string()),
    comments: v.optional(v.array(v.object({
      author: v.string(), text: v.string(), timestamp: v.number(),
    }))),
    isStale: v.optional(v.boolean()),
    lastActivityAt: v.number(),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workstream", ["workstreamId"])
    .index("by_milestone", ["milestoneId"])
    .index("by_kpi", ["kpiId"])
    .index("by_assignee", ["assigneeId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  ctDependencies: defineTable({
    sourceType: v.union(v.literal("milestone"), v.literal("task")),
    sourceId: v.string(),
    sourceTitle: v.string(),
    dependsOnType: v.union(v.literal("milestone"), v.literal("task")),
    dependsOnId: v.string(),
    dependsOnTitle: v.string(),
    blockedById: v.optional(v.string()),
    blockedByName: v.optional(v.string()),
    blockerOwnerId: v.optional(v.string()),
    blockerOwnerName: v.optional(v.string()),
    unblockTargetDate: v.optional(v.number()),
    dependencyType: v.union(
      v.literal("internal_sequential"),
      v.literal("internal_parallel"),
      v.literal("approval"),
      v.literal("external"),
      v.literal("technical_blocker"),
      v.literal("legal_content_blocker"),
    ),
    escalationStatus: v.union(
      v.literal("none"), v.literal("flagged"), v.literal("escalated"), v.literal("resolved"),
    ),
    note: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_source", ["sourceType", "sourceId"])
    .index("by_escalation", ["escalationStatus"]),

  ctActivityLog: defineTable({
    actorId: v.string(),
    actorName: v.string(),
    action: v.union(
      v.literal("created"), v.literal("updated"), v.literal("deleted"),
      v.literal("status_changed"), v.literal("assigned"), v.literal("commented"),
      v.literal("progress_updated"), v.literal("blocked"), v.literal("unblocked"), v.literal("completed"),
    ),
    entityType: v.union(
      v.literal("objective"), v.literal("kpi"), v.literal("milestone"),
      v.literal("task"), v.literal("dependency"), v.literal("workstream"), v.literal("team_member"),
    ),
    entityId: v.string(),
    entityTitle: v.string(),
    detail: v.optional(v.string()),
    workstreamId: v.optional(v.id("ctWorkstreams")),
    kpiId: v.optional(v.id("ctKpis")),
    milestoneId: v.optional(v.id("ctMilestones")),
    timestamp: v.number(),
  })
    .index("by_actor", ["actorId"])
    .index("by_workstream", ["workstreamId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_timestamp", ["timestamp"]),

  ctTeamMembers: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    dashboardRole: v.union(
      v.literal("super_admin"), v.literal("workstream_owner"),
      v.literal("contributor"), v.literal("viewer"), v.literal("executive_reviewer"),
    ),
    workstreamId: v.optional(v.id("ctWorkstreams")),
    reportingTo: v.optional(v.string()),
    reportingToName: v.optional(v.string()),
    employmentType: v.optional(v.union(v.literal("full_time"), v.literal("part_time"), v.literal("contract"))),
    reminderPreference: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("none"))),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_workstream", ["workstreamId"])
    .index("by_role", ["dashboardRole"]),

  // ── Headhunting: Client Leads (short intake form) ──
  htClientLeads: defineTable({
    contactName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    companyName: v.string(),
    roleTitle: v.string(),
    briefDescription: v.optional(v.string()),
    urgency: v.union(v.literal("standard"), v.literal("urgent"), v.literal("critical")),
    status: v.union(v.literal("new"), v.literal("contacted"), v.literal("converted"), v.literal("closed")),
    notes: v.optional(v.string()),
    convertedClientId: v.optional(v.id("htClients")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_email", ["email"]),

  // ── Global Notifications (Dashboard Build) ──────────────────────────
  notifications: defineTable({
    userId: v.string(),
    accountType: v.union(v.literal("personal"), v.literal("organization")),
    title: v.string(),
    summary: v.string(),
    targetUrl: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user_account", ["userId", "accountType", "read"])
    .index("by_user_time", ["userId", "createdAt"]),

  // ── Saved Items (AI search results + drafts) ───────────────────────
  savedItems: defineTable({
    userId: v.string(),
    itemType: v.union(v.literal("search_result"), v.literal("ai_draft")),
    itemId: v.string(),
    title: v.string(),
    preview: v.optional(v.string()),
    // Full message body — lets /dashboard/saved expand a card inline
    // without round-tripping back to Supabase.
    content: v.optional(v.string()),
    // Source conversation so the deep-link can reopen the thread and
    // scroll to the saved message.
    conversationId: v.optional(v.string()),
    savedAt: v.number(),
  })
    .index("by_user", ["userId", "savedAt"])
    .index("by_user_type", ["userId", "itemType"]),

  // ── Personal Service Requests ───────────────────────────────────────
  personalServiceRequests: defineTable({
    userId: v.string(),
    category: v.string(),
    subject: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("awaiting_input"),
      v.literal("in_progress"),
      v.literal("delivered"),
      v.literal("closed"),
    ),
    attachments: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId", "status"])
    .index("by_user_time", ["userId", "createdAt"]),

  // ── Organizations (Org Account) ─────────────────────────────────────
  organizations: defineTable({
    name: v.string(),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    primaryContactName: v.optional(v.string()),
    primaryContactDesignation: v.optional(v.string()),
    primaryContactEmail: v.optional(v.string()),
    primaryContactPhone: v.optional(v.string()),
    billingContactEmail: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    createdByClerkId: v.string(),
    createdAt: v.number(),
  })
    .index("by_creator", ["createdByClerkId"]),

  // ── Org Service Requests ────────────────────────────────────────────
  orgServiceRequests: defineTable({
    orgId: v.id("organizations"),
    requestedByClerkId: v.string(),
    serviceType: v.string(),
    subject: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("awaiting_input"),
      v.literal("in_progress"),
      v.literal("delivered"),
      v.literal("closed"),
    ),
    attachments: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId", "status"])
    .index("by_org_time", ["orgId", "createdAt"]),

  // ── Invoices (Payment Infrastructure) ───────────────────────────────
  invoices: defineTable({
    // Who
    userId: v.optional(v.string()),         // personal billing
    orgId: v.optional(v.id("organizations")), // org billing
    accountType: v.union(v.literal("personal"), v.literal("organization")),
    // What
    invoiceNumber: v.string(),              // e.g. "INV-2026-0001"
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),               // in BDT (taka)
      total: v.number(),
    })),
    subtotal: v.number(),
    tax: v.optional(v.number()),
    total: v.number(),
    currency: v.string(),                   // "BDT"
    // Status
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("cancelled"),
    ),
    // Payment
    paymentMethod: v.optional(v.string()),  // "bkash_manual", "sslcommerz", "bank_transfer"
    paymentReference: v.optional(v.string()), // txn ID from gateway
    paidAt: v.optional(v.number()),
    paidAmount: v.optional(v.number()),
    // Metadata
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    relatedMandateId: v.optional(v.string()),
    relatedServiceRequestId: v.optional(v.string()),
    createdByClerkId: v.optional(v.string()), // admin who created
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId", "status"])
    .index("by_org", ["orgId", "status"])
    .index("by_invoice_number", ["invoiceNumber"])
    .index("by_status_date", ["status", "createdAt"]),

  // ═══════════════════════════════════════════════════════════════
  // Phase 3 — Scout Groups & Blueprint Audit Log
  // ═══════════════════════════════════════════════════════════════

  htScoutGroups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    parentGroupId: v.optional(v.id("htScoutGroups")), // null = top-level group, set = subgroup
    memberClerkIds: v.array(v.string()), // scout clerk IDs in this group
    isInvitationOnly: v.optional(v.boolean()), // for executive search subgroups
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentGroupId"])
    .searchIndex("search_name", { searchField: "name" }),

  htBlueprintAuditLog: defineTable({
    blueprintId: v.id("htRoleBlueprints"),
    action: v.union(
      v.literal("field_changed"),
      v.literal("status_changed"),
      v.literal("visibility_changed"),
      v.literal("conflict_override"),
      v.literal("release_decision"),
      v.literal("scout_selection"),
      v.literal("brief_generated"),
      v.literal("brief_released"),
      v.literal("brief_recalled"),
    ),
    fieldPath: v.optional(v.string()),
    oldValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
    performedBy: v.string(), // clerk ID
    performedAt: v.number(),
    rationale: v.optional(v.string()),
    metadata: v.optional(v.any()), // extra context
  })
    .index("by_blueprint", ["blueprintId"])
    .index("by_action", ["action"])
    .index("by_performer", ["performedBy"])
    .index("by_time", ["performedAt"]),

  // ── Payments (transaction log) ──────────────────────────────────────
  payments: defineTable({
    invoiceId: v.id("invoices"),
    amount: v.number(),
    currency: v.string(),
    method: v.string(),                     // "bkash_manual", "sslcommerz", "bank_transfer"
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
    gatewayResponse: v.optional(v.string()), // raw JSON from payment gateway
    transactionId: v.optional(v.string()),   // gateway txn ID
    verifiedByClerkId: v.optional(v.string()), // admin who verified manual payment
    verifiedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_status", ["status", "createdAt"]),

  // Admin-editable overrides for transactional email templates. One row per
  // templateId; missing row = fall back to hard-coded default in route.ts /
  // email*.ts helpers. html/subject are mustache strings ({{token}}).
  emailTemplateOverrides: defineTable({
    templateId: v.string(),
    html: v.string(),
    subject: v.string(),
    updatedAt: v.number(),
    updatedByClerkId: v.string(),
    updatedByEmail: v.optional(v.string()),
  }).index("by_template", ["templateId"]),
});
