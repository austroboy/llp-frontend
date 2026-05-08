export type ActorRole = "admin" | "scout" | "collaborator" | "client" | "applicant";
export type CommentVisibility = "internal" | "scout" | "collaborator" | "client" | "applicant";

/**
 * Cascading visibility hierarchy.
 * Each role can see comments at their level AND all more-public levels.
 *
 * admin: sees everything
 * scout: sees scout + collaborator + client + applicant
 * collaborator: sees collaborator + client + applicant
 * client: sees client + applicant
 * applicant: sees applicant only
 */
const VISIBILITY_HIERARCHY: Record<ActorRole, CommentVisibility[]> = {
  admin: ["internal", "scout", "collaborator", "client", "applicant"],
  scout: ["scout", "collaborator", "client", "applicant"],
  collaborator: ["collaborator", "client", "applicant"],
  client: ["client", "applicant"],
  applicant: ["applicant"],
};

/**
 * Filter an array of items by visibility for a given actor role.
 * Items without a visibility field are treated as "internal" (admin-only).
 */
export function filterByVisibility<T extends { visibility?: CommentVisibility | string }>(
  items: T[],
  actorRole: ActorRole
): T[] {
  const allowedLevels = VISIBILITY_HIERARCHY[actorRole];
  if (!allowedLevels) return [];

  return items.filter((item) => {
    const level = (item.visibility ?? "internal") as CommentVisibility;
    return allowedLevels.includes(level);
  });
}

/**
 * Check if a specific visibility level is visible to a given actor role.
 */
export function isVisibleTo(
  visibility: CommentVisibility | string | undefined,
  actorRole: ActorRole
): boolean {
  const allowedLevels = VISIBILITY_HIERARCHY[actorRole];
  if (!allowedLevels) return false;
  const level = (visibility ?? "internal") as CommentVisibility;
  return allowedLevels.includes(level);
}

/**
 * Get the default visibility for a given sender role.
 * LLP/admin messages default to "internal", client messages default to "client", etc.
 */
export function getDefaultVisibility(senderRole: string): CommentVisibility {
  switch (senderRole) {
    case "admin":
    case "llp":
      return "internal";
    case "scout":
      return "scout";
    case "collaborator":
      return "collaborator";
    case "client":
      return "client";
    case "applicant":
      return "applicant";
    default:
      return "internal";
  }
}

/**
 * Labels for the visibility dropdown in admin UI.
 */
export const VISIBILITY_OPTIONS: { value: CommentVisibility; label: string; description: string }[] = [
  { value: "internal", label: "Internal Only", description: "Visible to LLP team only" },
  { value: "scout", label: "Visible to Scout", description: "Scout + LLP team" },
  { value: "collaborator", label: "Visible to Collaborator", description: "Collaborator + Scout + LLP" },
  { value: "client", label: "Visible to Client", description: "Client + Collaborator + Scout + LLP" },
  { value: "applicant", label: "Visible to Applicant", description: "Everyone including the candidate" },
];
