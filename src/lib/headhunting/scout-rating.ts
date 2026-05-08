/**
 * LLP Scout Per-Country Rating Engine
 *
 * Calculates a 0-100 score per country for each scout,
 * then maps to a Tier (S/P/E/N) for mandate matching.
 *
 * Five factors:
 * 1. Recruitment-specific experience (0-30) — highest weight
 * 2. Hiring depth in this country (0-25)
 * 3. Network depth in this country (0-20)
 * 4. Functional breadth (0-15) — transferable
 * 5. Industry range in this country (0-10)
 */

export type ScoutTierLabel = "S" | "P" | "E" | "N";

export interface CountryRating {
  country: string;
  score: number;
  tier: ScoutTierLabel;
  breakdown: {
    recruitmentExperience: number;
    hiringDepth: number;
    networkDepth: number;
    functionalBreadth: number;
    industryRange: number;
  };
}

export interface ScoutRatingProfile {
  // From S1
  totalYearsExperience?: string;
  // From S8 (Sprint 0 additions)
  recruitmentYears?: string;
  hiringPercentage?: string;
  // From S7
  roleLevelReach?: string[];
  // From S3
  functionPrimary?: string[];
  functionSecondary?: string[];
  // From S4
  industryPrimary?: string[];
  industrySecondary?: string[];
  // From S10 v2
  primarySourcingMarkets?: Array<{
    country: string;
    strength: "Strong" | "Moderate" | "Limited" | "Developing";
    type?: string;
  }>;
  // From S12
  geographyExposure?: Array<{
    geography: string;
    exposureTypes: string[];
  }>;
  // From S5
  talentAccessSegments?: string[];
  // From S14
  networkFreshness?: string;
}

// ─── Factor 1: Recruitment-specific experience (0-30) ────────────────────────

function scoreRecruitmentExperience(profile: ScoutRatingProfile): number {
  const recYears = profile.recruitmentYears;
  const hiringPct = profile.hiringPercentage;

  // Base from years
  let yearsScore = 0;
  if (recYears) {
    if (recYears.includes("10+")) yearsScore = 25;
    else if (recYears.includes("7-10") || recYears.includes("7–10")) yearsScore = 20;
    else if (recYears.includes("4-7") || recYears.includes("4–7")) yearsScore = 15;
    else if (recYears.includes("2-4") || recYears.includes("2–4")) yearsScore = 10;
    else yearsScore = 5; // <2 years
  } else {
    // Fall back to total years as proxy (heavily discounted)
    const total = profile.totalYearsExperience;
    if (total?.includes("20+")) yearsScore = 10;
    else if (total?.includes("15-20") || total?.includes("15–20")) yearsScore = 8;
    else if (total?.includes("10-15") || total?.includes("10–15")) yearsScore = 6;
    else if (total?.includes("5-10") || total?.includes("5–10")) yearsScore = 5;
    else yearsScore = 3;
  }

  // Boost from hiring percentage (up to +5)
  let pctBoost = 0;
  if (hiringPct) {
    if (hiringPct.includes("80%") || hiringPct.includes("80 or more")) pctBoost = 5;
    else if (hiringPct.includes("60-80") || hiringPct.includes("60–80")) pctBoost = 4;
    else if (hiringPct.includes("40-60") || hiringPct.includes("40–60")) pctBoost = 3;
    else if (hiringPct.includes("20-40") || hiringPct.includes("20–40")) pctBoost = 1;
    // <20% → 0 boost
  }

  return Math.min(30, yearsScore + pctBoost);
}

// ─── Factor 2: Hiring depth in a specific country (0-25) ─────────────────────

function scoreHiringDepth(profile: ScoutRatingProfile): number {
  const levels = profile.roleLevelReach ?? [];
  // Check for highest level present
  if (levels.some(l => /board|advisory/i.test(l))) return 25;
  if (levels.some(l => /c.suite|ceo|cfo|coo|cto/i.test(l))) return 25;
  if (levels.some(l => /vp|avp|svp/i.test(l))) return 20;
  if (levels.some(l => /director/i.test(l))) return 20;
  if (levels.some(l => /senior manager|associate director/i.test(l))) return 15;
  if (levels.some(l => /manager|lead/i.test(l))) return 10;
  if (levels.some(l => /mid|senior.*\(8/i.test(l))) return 10;
  if (levels.length > 0) return 5;
  return 5; // default
}

// ─── Factor 3: Network depth per country (0-20) ───────────────────────────────

function scoreNetworkDepth(
  profile: ScoutRatingProfile,
  country: string
): number {
  // Check primarySourcingMarkets for this country
  const market = profile.primarySourcingMarkets?.find(
    m => m.country.toLowerCase() === country.toLowerCase()
  );

  if (market) {
    const strength = market.strength;
    if (strength === "Strong") return 20;
    if (strength === "Moderate") return 13;
    if (strength === "Developing" || strength === "Limited") return 7;
  }

  // Check geographyExposure
  const geoExp = profile.geographyExposure?.find(
    g => g.geography.toLowerCase().includes(country.toLowerCase())
  );
  if (geoExp) {
    const types = geoExp.exposureTypes ?? [];
    if (types.some(t => /active sourcing/i.test(t))) return 12;
    if (types.some(t => /market understanding/i.test(t))) return 7;
    return 5;
  }

  // Network freshness as a proxy if country matched in countriesSupported
  if (profile.networkFreshness) {
    if (/very active/i.test(profile.networkFreshness)) return 12;
    if (/active/i.test(profile.networkFreshness)) return 8;
    if (/moderate/i.test(profile.networkFreshness)) return 5;
  }

  return 3; // minimal — country listed but no network data
}

// ─── Factor 4: Functional breadth (0-15) ─────────────────────────────────────

function scoreFunctionalBreadth(profile: ScoutRatingProfile): number {
  const primary = (profile.functionPrimary ?? []).length;
  const secondary = (profile.functionSecondary ?? []).length;
  const total = primary + secondary;
  if (total >= 5) return 15;
  if (total >= 3) return 10;
  if (total >= 2) return 7;
  if (total >= 1) return 4;
  return 2;
}

// ─── Factor 5: Industry range per country (0-10) ─────────────────────────────

function scoreIndustryRange(profile: ScoutRatingProfile): number {
  const primary = (profile.industryPrimary ?? []).length;
  const secondary = (profile.industrySecondary ?? []).length;
  const total = primary + secondary;
  if (total >= 5) return 10;
  if (total >= 3) return 7;
  if (total >= 2) return 5;
  if (total >= 1) return 3;
  return 1;
}

// ─── Tier thresholds ──────────────────────────────────────────────────────────

function scoreToTier(score: number): ScoutTierLabel {
  if (score >= 80) return "S"; // Strategic
  if (score >= 50) return "P"; // Professional
  if (score >= 25) return "E"; // Emerging
  return "N";                   // New/Unrated
}

// ─── Main: calculate rating for all countries the scout operates in ───────────

export function calculateScoutCountryRatings(
  profile: ScoutRatingProfile
): CountryRating[] {
  // Collect all countries this scout is associated with
  const countrySet = new Set<string>();

  profile.primarySourcingMarkets?.forEach(m => countrySet.add(m.country));
  profile.geographyExposure?.forEach(g => {
    if (g.geography && g.geography !== "Other") countrySet.add(g.geography);
  });

  if (countrySet.size === 0) {
    // Fallback: create a single "Global" entry
    countrySet.add("Global");
  }

  const recruitmentExp = scoreRecruitmentExperience(profile);
  const hiringDepth = scoreHiringDepth(profile);
  const functionalBreadth = scoreFunctionalBreadth(profile);

  return Array.from(countrySet).map(country => {
    const networkDepth = scoreNetworkDepth(profile, country);
    const industryRange = scoreIndustryRange(profile);

    const score = recruitmentExp + hiringDepth + networkDepth + functionalBreadth + industryRange;
    const capped = Math.min(100, score);

    return {
      country,
      score: capped,
      tier: scoreToTier(capped),
      breakdown: {
        recruitmentExperience: recruitmentExp,
        hiringDepth,
        networkDepth,
        functionalBreadth,
        industryRange,
      },
    };
  });
}

// ─── Default cap per tier ─────────────────────────────────────────────────────

export const TIER_SUBMISSION_CAPS: Record<ScoutTierLabel, number> = {
  S: 7,
  P: 5,
  E: 3,
  N: 2,
};

export const TIER_LABELS: Record<ScoutTierLabel, string> = {
  S: "Strategic",
  P: "Professional",
  E: "Emerging",
  N: "New Scout",
};
