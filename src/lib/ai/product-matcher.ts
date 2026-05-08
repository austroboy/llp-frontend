import type { ProductMatchResult } from "./product-types";
import { PRODUCT_RELEVANCE_THRESHOLD } from "./product-types";
import { loadProducts } from "@/data/load-products";

/**
 * Category 1: Direct product inquiry — matches ONLY when user explicitly
 * names an LLP product. Uses directTriggers, not generic keywords.
 */
export function matchDirectProductInquiry(
  query: string
): ProductMatchResult | null {
  const products = loadProducts();
  const queryLower = query.toLowerCase();

  for (const product of products) {
    const nameMatch = queryLower.includes(product.name.toLowerCase());
    const triggerMatch = product.directTriggers.some((t) =>
      queryLower.includes(t.toLowerCase())
    );

    if (nameMatch || triggerMatch) {
      return {
        product,
        confidence: 1.0,
        trigger: "direct",
      };
    }
  }

  return null;
}

/**
 * Check if query references "LLP" as a service provider (Category 2).
 * Must mention "LLP" without naming a specific product.
 */
export function isLLPServiceIntent(query: string, directAlreadyChecked = false): boolean {
  // Word-boundary match to avoid false positives (e.g. "llphone")
  if (!/\bllp\b/i.test(query)) return false;

  // If caller already confirmed no direct product match, skip redundant check
  if (directAlreadyChecked) return true;

  // If it's a direct product match, it's Category 1 not 2
  const directMatch = matchDirectProductInquiry(query);
  return directMatch === null;
}

/**
 * Domain-based product matching (shared logic for Category 2 and tier-exceed).
 * Returns only live products with relatedDomains. Help Desk excluded.
 */
function matchByDomain(
  domain: string,
  crossDomains: string[]
): ProductMatchResult | null {
  const products = loadProducts().filter(
    (p) => p.status === "live" && p.relatedDomains.length > 0
  );
  const allDomains = [domain, ...crossDomains];

  let bestMatch: ProductMatchResult | null = null;
  let bestScore = 0;

  for (const product of products) {
    const domainOverlap = product.relatedDomains.filter((d) =>
      allDomains.includes(d)
    ).length;

    if (domainOverlap === 0) continue;

    const score =
      domainOverlap /
      Math.max(product.relatedDomains.length, allDomains.length);

    if (score > bestScore && score >= PRODUCT_RELEVANCE_THRESHOLD) {
      bestScore = score;
      bestMatch = {
        product,
        confidence: score,
        trigger: "contextual",
      };
    }
  }

  return bestMatch;
}

/**
 * Category 2: Mixed LLP Service Intent — domain-based selection.
 * Only called when isLLPServiceIntent() returns true.
 * Returns only live products. Help Desk is fallback.
 */
export function matchLLPServiceProduct(
  domain: string,
  crossDomains: string[]
): ProductMatchResult | null {
  const domainMatch = matchByDomain(domain, crossDomains);
  if (domainMatch) return domainMatch;

  // Fallback to Help Desk if no domain match
  const helpDesk = loadProducts().find(
    (p) => p.id === "help-desk" && p.status === "live"
  );
  if (helpDesk) {
    return { product: helpDesk, confidence: 0.5, trigger: "contextual" };
  }

  return null;
}

/**
 * Tier-exceed product match — domain-specific first, Help Desk as fallback.
 * Only live products.
 */
export function matchTierExceedProduct(
  domain: string
): ProductMatchResult | null {
  // Try domain-specific first
  const domainMatch = matchByDomain(domain, []);
  if (domainMatch) {
    return { ...domainMatch, trigger: "tier_exceed" };
  }

  // Fallback to Help Desk
  const helpDesk = loadProducts().find(
    (p) => p.id === "help-desk" && p.status === "live"
  );
  if (helpDesk) {
    return {
      product: helpDesk,
      confidence: 0.5,
      trigger: "tier_exceed",
    };
  }

  return null;
}
