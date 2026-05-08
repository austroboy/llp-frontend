/**
 * Candidate deduplication for headhunting submissions.
 * Uses normalized hash of email + phone + name to detect duplicates.
 */

/**
 * Normalize a string for dedup comparison:
 * lowercase, trim, remove extra spaces, remove common prefixes/suffixes
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s@.+]/g, ""); // keep alphanumeric, spaces, email chars
}

/**
 * Normalize phone number: strip everything except digits, keep last 10
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Keep last 10 digits (handles country codes like +880)
  return digits.slice(-10);
}

/**
 * Common org suffixes to strip for dedup comparison
 */
const ORG_SUFFIXES_RE =
  /\b(ltd|limited|inc|incorporated|corp|corporation|llc|plc|co|company|group|holdings)\b/g;

/**
 * Normalize organization name for dedup:
 * lowercase, trim, remove common legal suffixes, collapse spaces
 */
function normalizeOrg(org: string): string {
  return org
    .toLowerCase()
    .trim()
    .replace(ORG_SUFFIXES_RE, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate a dedup key from candidate info.
 * Primary: email (most reliable unique identifier)
 * Secondary: phone (if no email match)
 * Tertiary: normalized name (fuzzy — for flagging, not auto-reject)
 * Quaternary: normalized org (used with name for "probable_duplicate" detection)
 */
export function generateDedupKey(candidate: {
  email: string;
  phone?: string;
  name: string;
  currentOrg?: string;
}): { emailKey: string; phoneKey: string | null; nameKey: string; orgKey: string | null } {
  const emailKey = normalize(candidate.email);
  const phoneKey = candidate.phone ? normalizePhone(candidate.phone) : null;
  const nameKey = normalize(candidate.name);
  const orgKey = candidate.currentOrg ? normalizeOrg(candidate.currentOrg) : null;

  return { emailKey, phoneKey, nameKey, orgKey };
}

/**
 * Check if a candidate is a duplicate within the same mandate's submissions.
 * Returns the duplicate submission info if found, null if unique.
 */
export function checkDuplicate(
  candidate: { email: string; phone?: string; name: string; currentOrg?: string },
  existingSubmissions: Array<{
    _id: string;
    candidateEmail: string;
    candidatePhone?: string;
    candidateName: string;
    candidateCurrentOrg?: string;
    scoutId?: string;
    ownershipTimestamp: number;
    status: string;
  }>
): {
  isDuplicate: boolean;
  matchType: "email" | "phone" | "name" | "name_org" | null;
  matchConfidence?: "exact" | "probable_duplicate";
  existingSubmission: (typeof existingSubmissions)[0] | null;
} {
  const { emailKey, phoneKey, nameKey, orgKey } = generateDedupKey(candidate);

  // Skip withdrawn/rejected submissions — allow resubmission
  const active = existingSubmissions.filter(
    (s) => s.status !== "withdrawn" && s.status !== "rejected"
  );

  // Check email match (strongest signal)
  for (const sub of active) {
    if (normalize(sub.candidateEmail) === emailKey) {
      return { isDuplicate: true, matchType: "email", matchConfidence: "exact", existingSubmission: sub };
    }
  }

  // Check phone match
  if (phoneKey) {
    for (const sub of active) {
      if (sub.candidatePhone && normalizePhone(sub.candidatePhone) === phoneKey) {
        return { isDuplicate: true, matchType: "phone", matchConfidence: "exact", existingSubmission: sub };
      }
    }
  }

  // Check name + org match (probable duplicate — same person at same company)
  if (orgKey && nameKey.length > 5) {
    for (const sub of active) {
      if (
        normalize(sub.candidateName) === nameKey &&
        sub.candidateCurrentOrg &&
        normalizeOrg(sub.candidateCurrentOrg) === orgKey
      ) {
        return {
          isDuplicate: true,
          matchType: "name_org",
          matchConfidence: "probable_duplicate",
          existingSubmission: sub,
        };
      }
    }
  }

  // Check exact name match (weaker signal — flag but less certain)
  for (const sub of active) {
    if (normalize(sub.candidateName) === nameKey && nameKey.length > 5) {
      return { isDuplicate: true, matchType: "name", matchConfidence: "probable_duplicate", existingSubmission: sub };
    }
  }

  return { isDuplicate: false, matchType: null, existingSubmission: null };
}
