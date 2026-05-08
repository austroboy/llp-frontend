// ─── Mandate Status Labels ──────────────────────────────────────

const MANDATE_CLIENT_LABELS: Record<string, string> = {
  received: "Mandate Received",
  clarification: "Job Evaluation in Progress",
  architecture: "Job Evaluation in Progress",
  internal_review: "Job Evaluation in Progress",
  client_review: "Job Evaluation in Progress",
  approved: "Job Evaluation in Progress",
  released: "Search Active",
  paused: "On Hold",
  filled: "Role Filled",
  closed: "Closed",
  cancelled_by_client: "Cancelled",
  role_filled_internally: "Role Filled Internally",
};

export function getMandateClientLabel(status: string): string {
  return MANDATE_CLIENT_LABELS[status] ?? status;
}

// ─── Submission Status Labels ──────────────────────────────────

const SUBMISSION_APPLICANT_LABELS: Record<string, string> = {
  pending_scout_review: "Application Received",
  pending_verification: "Verification Pending",
  verification_expired: "Verification Expired",
  submitted_to_llp: "Under Processing",
  under_review: "Under Review",
  verified: "Under Review",
  shortlist_shared: "Shortlisted",
  interview: "Interview Stage",
  offer_stage: "Offer Stage",
  offer_extended: "Offer Extended",
  offer_accepted: "Offer Accepted",
  joined: "Joined",
  rejected: "Not Selected",
  withdrawn: "Withdrawn",
  // Legacy
  submitted: "Under Processing",
  screening: "Under Review",
  shortlisted: "Shortlisted",
  selected: "Offer Stage",
  offer: "Offer Extended",
};

export function getSubmissionApplicantLabel(status: string): string {
  return SUBMISSION_APPLICANT_LABELS[status] ?? status;
}

const SUBMISSION_SCOUT_LABELS: Record<string, string> = {
  pending_scout_review: "Pending Your Review",
  pending_verification: "Awaiting Candidate Verification",
  verification_expired: "Verification Expired",
  submitted_to_llp: "Submitted to LLP",
  under_review: "Under LLP Review",
  verified: "Verified by LLP",
  shortlist_shared: "Shortlisted",
  interview: "Interview Stage",
  offer_stage: "Offer Stage",
  offer_extended: "Offer Extended",
  offer_accepted: "Offer Accepted",
  joined: "Placed",
  rejected: "Not Progressed",
  withdrawn: "Withdrawn",
  // Legacy
  submitted: "Submitted to LLP",
  screening: "Under LLP Review",
  shortlisted: "Shortlisted",
  selected: "Offer Stage",
  offer: "Offer Extended",
};

export function getSubmissionScoutLabel(status: string): string {
  return SUBMISSION_SCOUT_LABELS[status] ?? status;
}

const SUBMISSION_COLLABORATOR_LABELS: Record<string, string> = {
  pending_scout_review: "Sourcing in Progress",
  pending_verification: "Sourcing in Progress",
  verification_expired: "Sourcing in Progress",
  submitted_to_llp: "Under Processing",
  under_review: "Under Review",
  verified: "Verified",
  shortlist_shared: "Shortlist Shared",
  interview: "Interview Stage",
  offer_stage: "Offer Stage",
  offer_extended: "Offer Extended",
  offer_accepted: "Offer Accepted",
  joined: "Placed",
  rejected: "Not Progressed",
  withdrawn: "Withdrawn",
  // Legacy
  submitted: "Under Processing",
  screening: "Under Review",
  shortlisted: "Shortlist Shared",
  selected: "Offer Stage",
  offer: "Offer Extended",
};

export function getSubmissionCollaboratorLabel(status: string): string {
  return SUBMISSION_COLLABORATOR_LABELS[status] ?? status;
}

// ─── Status Color Type ──────────────────────────────────────────

type StatusColor = "gray" | "blue" | "yellow" | "orange" | "green" | "red" | "purple" | "emerald";

// ─── Blueprint Status Labels ──────────────────────────────────

const BLUEPRINT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready_for_client_validation: "Ready for Client",
  sent_to_client: "Awaiting Client",
  returned_with_revisions: "Client Feedback",
  finalized_by_client: "Client Confirmed",
  brief_generated: "Brief Ready",
  release_ready: "Release Ready",
  released_to_scouts: "Released",
  // Legacy compat
  internal_approved: "Internally Approved",
  client_approved: "Client Approved",
  released: "Released",
};

export function getBlueprintStatusLabel(status: string): string {
  return BLUEPRINT_STATUS_LABELS[status] ?? status;
}

const BLUEPRINT_STATUS_COLORS: Record<string, StatusColor> = {
  draft: "gray",
  ready_for_client_validation: "blue",
  sent_to_client: "yellow",
  returned_with_revisions: "orange",
  finalized_by_client: "green",
  brief_generated: "emerald",
  release_ready: "purple",
  released_to_scouts: "green",
  // Legacy
  internal_approved: "blue",
  client_approved: "green",
  released: "green",
};

export function getBlueprintStatusColor(status: string): StatusColor {
  return BLUEPRINT_STATUS_COLORS[status] ?? "gray";
}

// ─── Status Colors ──────────────────────────────────────────────

const STATUS_COLORS: Record<string, StatusColor> = {
  // Pre-LLP
  pending_scout_review: "gray",
  pending_verification: "yellow",
  verification_expired: "red",
  // LLP intake
  submitted_to_llp: "blue",
  under_review: "blue",
  verified: "emerald",
  // Client-facing
  shortlist_shared: "purple",
  interview: "orange",
  offer_stage: "orange",
  offer_extended: "yellow",
  offer_accepted: "green",
  joined: "green",
  // Terminal
  rejected: "red",
  withdrawn: "gray",
  // Mandate statuses
  received: "gray",
  clarification: "yellow",
  architecture: "blue",
  internal_review: "blue",
  client_review: "orange",
  approved: "emerald",
  released: "green",
  paused: "yellow",
  filled: "green",
  closed: "gray",
  cancelled_by_client: "red",
  role_filled_internally: "orange",
  // Blueprint statuses
  ready_for_client_validation: "blue",
  sent_to_client: "yellow",
  returned_with_revisions: "orange",
  finalized_by_client: "green",
  brief_generated: "emerald",
  release_ready: "purple",
  released_to_scouts: "green",
  internal_approved: "blue",
  client_approved: "green",
  // Legacy submission
  submitted: "blue",
  screening: "blue",
  shortlisted: "purple",
  selected: "orange",
  offer: "yellow",
};

export function getStatusColor(status: string): StatusColor {
  return STATUS_COLORS[status] ?? "gray";
}

// ─── Status Badge CSS Helper ────────────────────────────────────

const COLOR_CLASSES: Record<StatusColor, string> = {
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
};

export function getStatusBadgeClasses(status: string): string {
  const color = getStatusColor(status);
  return `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_CLASSES[color]}`;
}
