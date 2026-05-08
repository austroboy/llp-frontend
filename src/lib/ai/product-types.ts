// Labor Law Partner — Product Awareness Types
// Schema for LLP product/service knowledge integration

export interface LLPProduct {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  status: "live" | "coming_soon";
  directTriggers: string[]; // ONLY explicit LLP product names
  relatedDomains: string[]; // For contextual domain matching
  tierAvailability: string;
  url?: string;
  lastUpdated: string;
}

export interface ProductMatchResult {
  product: LLPProduct;
  confidence: number;
  trigger: "direct" | "tier_exceed" | "contextual";
}

export const PRODUCT_RELEVANCE_THRESHOLD = 0.6;

// Live service from Convex serviceProducts table
export interface LiveService {
  title: string;
  titleBn?: string;
  description: string;
  descriptionBn?: string;
  category: "expatriate" | "hr" | "licensing";
  deliveryTimeline?: string;
  price?: string;
  badge?: string;
}

// Maps Convex service categories to intent classifier domains
export const SERVICE_CATEGORY_DOMAINS: Record<string, string[]> = {
  expatriate: ["foreign_workers", "employment_conditions"],
  hr: ["employment_conditions", "contract", "termination"],
  licensing: ["factory_regulations", "workplace_safety"],
};
