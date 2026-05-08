// Labor Law Partner — AI Response Framework v1.0
// Types, constants, and tier access matrix

// ── Intent Taxonomy ──────────────────────────────────────────────

export const INTENTS = [
  "FACTUAL",
  "ADVISORY",
  "DRAFTING",
  "CALCULATION",
  "PROCEDURAL",
  "CROSS_DOMAIN",
  "PRODUCT_INQUIRY",
  "NOT_A_QUESTION",
] as const;

export type Intent = (typeof INTENTS)[number];

export const URGENCY_LEVELS = ["general", "time_sensitive", "crisis"] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

export const PERSPECTIVES = ["worker", "employer", "neutral"] as const;
export type Perspective = (typeof PERSPECTIVES)[number];

export const LANGUAGES = ["bangla", "english", "mixed"] as const;
export type Language = (typeof LANGUAGES)[number];

export interface IntentClassification {
  intents: Intent[];
  primary_intent: Intent;
  domain: string;
  cross_domains: string[];
  urgency: Urgency;
  language: Language;
  requires_file: boolean;
  perspective: Perspective;
}

// ── Tier Definitions ─────────────────────────────────────────────

export const TIERS = [
  "free_guest",
  "free_subscribed",
  "mini",
  "max",
] as const;

export type Tier = (typeof TIERS)[number];

export interface TierConfig {
  tier: Tier;
  label: string;
  allowedIntents: Intent[];
  dailyRequestLimit: number;
  rateLimit: number; // requests per minute
  fileUploadAllowed: boolean;
  crossDomainAllowed: boolean;
  advisoryAllowed: boolean;
  price: number | null; // BDT/month
}

// Default tier configs — seeded into Convex tierConfig table
export const DEFAULT_TIER_CONFIGS: TierConfig[] = [
  {
    tier: "free_guest",
    label: "Free Guest",
    allowedIntents: ["FACTUAL", "PROCEDURAL", "PRODUCT_INQUIRY"],
    dailyRequestLimit: 5,
    rateLimit: 5,
    fileUploadAllowed: false,
    crossDomainAllowed: false,
    advisoryAllowed: false,
    price: null,
  },
  {
    tier: "free_subscribed",
    label: "Free Subscribed",
    allowedIntents: ["FACTUAL", "PROCEDURAL", "CALCULATION", "PRODUCT_INQUIRY"],
    dailyRequestLimit: 15,
    rateLimit: 10,
    fileUploadAllowed: false,
    crossDomainAllowed: false,
    advisoryAllowed: false,
    price: null,
  },
  {
    tier: "mini",
    label: "Mini — ১৪৯৳/mo",
    allowedIntents: [
      "FACTUAL",
      "ADVISORY",
      "DRAFTING",
      "CALCULATION",
      "PROCEDURAL",
      "CROSS_DOMAIN",
      "PRODUCT_INQUIRY",
    ],
    dailyRequestLimit: 100,
    rateLimit: 20,
    fileUploadAllowed: false,
    crossDomainAllowed: true,
    advisoryAllowed: false,
    price: 149,
  },
  {
    tier: "max",
    label: "Max — ২৯৯৳/mo",
    allowedIntents: [
      "FACTUAL",
      "ADVISORY",
      "DRAFTING",
      "CALCULATION",
      "PROCEDURAL",
      "CROSS_DOMAIN",
      "PRODUCT_INQUIRY",
    ],
    dailyRequestLimit: 500,
    rateLimit: 30,
    fileUploadAllowed: true,
    crossDomainAllowed: true,
    advisoryAllowed: true,
    price: 299,
  },
];

// ── CTA Rules ────────────────────────────────────────────────────

export interface CTAMessage {
  text: string;
  textBn: string;
  targetTier: Tier | null;
}

export const CTA_MESSAGES: Record<Exclude<Tier, "max">, CTAMessage> = {
  free_guest: {
    text: "Sign up free for 15 chats/day →",
    textBn: "বিনামূল্যে সাইন আপ করুন → প্রতিদিন ১৫টি চ্যাট",
    targetTier: "free_subscribed",
  },
  free_subscribed: {
    text: "Need drafting, memory & more? → Mini ১৪৯৳/mo",
    textBn: "ড্রাফটিং, মেমোরি ও আরও বেশি? → Mini ১৪৯৳/মাস",
    targetTier: "mini",
  },
  mini: {
    text: "Need advisory, file analysis & persistent memory? → Max ২৯৯৳/mo",
    textBn:
      "পরামর্শ, ফাইল বিশ্লেষণ ও স্থায়ী মেমোরি? → Max ২৯৯৳/মাস",
    targetTier: "max",
  },
};

// ── Disclaimers ──────────────────────────────────────────────────

export const LEGAL_DISCLAIMER = {
  en: "This is legal information, not legal advice.",
  bn: "এটি আইনি তথ্য, আইনি পরামর্শ নয়।",
  both: "এটি আইনি তথ্য, আইনি পরামর্শ নয়। / This is legal information, not legal advice.",
};

export function getKnowledgeTimestamp(updateDate: string): {
  en: string;
  bn: string;
} {
  return {
    en: `📚 Based on: Bangladesh Labour Act 2006 (amended 2025) | Labor Law Partner knowledge base updated: ${updateDate}`,
    bn: `📚 ভিত্তি: বাংলাদেশ শ্রম আইন ২০০৬ (সংশোধিত ২০২৫) | Labor Law Partner জ্ঞানভাণ্ডার আপডেট: ${updateDate}`,
  };
}

// ── Knowledge Gap Responses ──────────────────────────────────────

export const KNOWLEDGE_GAP_RESPONSE = {
  en: (date: string) =>
    `This response is based on Labor Law Partner's knowledge base, last updated ${date}. Recent amendments may not yet be reflected.`,
  bn: (date: string) =>
    `এই বিষয়ে Labor Law Partner-এর বর্তমান ডাটাবেসে সর্বশেষ আপডেট ${date} পর্যন্ত। সাম্প্রতিক কোনো সংশোধনী থাকলে তা এখনো আমাদের সিস্টেমে অন্তর্ভুক্ত হয়নি।`,
};

export const OUT_OF_SCOPE_RESPONSE = {
  en: "This topic is currently outside Labor Law Partner's coverage.",
  bn: "এই বিষয়টি বর্তমানে Labor Law Partner-এর আওতার বাইরে। আমাদের সিস্টেম বাংলাদেশ শ্রম আইন বিষয়ে বিশেষজ্ঞ সহায়তা প্রদান করে।",
};

// ── Tier from Clerk Metadata ─────────────────────────────────────

export interface ClerkTierMetadata {
  tier?: Tier;
  subscriptionStatus?: "active" | "expired" | "cancelled";
  subscriptionExpiry?: string; // ISO date
}

export function resolveTier(metadata?: ClerkTierMetadata | null): Tier {
  // No metadata = no tier set = signed-in users default to free_subscribed
  if (!metadata?.tier) return "free_subscribed";

  // Backward compat: map legacy "free" → "free_subscribed"
  const tier = metadata.tier === ("free" as Tier) ? "free_subscribed" : metadata.tier;

  // If paid tier but subscription not active, downgrade
  if (
    (tier === "mini" || tier === "max") &&
    metadata.subscriptionStatus !== "active"
  ) {
    return "free_subscribed";
  }

  // Check expiry
  if (metadata.subscriptionExpiry) {
    const expiry = new Date(metadata.subscriptionExpiry);
    if (expiry < new Date()) {
      return "free_subscribed";
    }
  }

  return tier;
}
