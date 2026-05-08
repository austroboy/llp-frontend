// ─── Blueprint Validation ────────────────────────────────────────
//
// Client-side validation helpers for Role Blueprint status transitions.
// These mirror the guards in convex/headhunting/blueprints.ts so the UI
// can show which fields are missing before the user attempts a transition.

interface TagNote {
  tag: string;
  note?: string;
}

interface BlueprintData {
  title?: string;
  roleBand?: string;
  function?: string;
  location?: string;
  searchGeography?: string;
  mustHaves?: string[];
  mustHaveDetails?: TagNote[];
  criticalMatchPoints?: string[];
  criticalMatchDetails?: TagNote[];
  confidentialityLevel?: string;
}

interface ReleaseData extends BlueprintData {
  selectedScoutIds?: string[];
  releaseApprovedBy?: string;
}

interface MissingField {
  field: string;
  label: string;
}

interface ValidationResult {
  valid: boolean;
  missingFields: MissingField[];
  warnings: MissingField[];
}

// ─── Validate for Client Validation ──────────────────────────────
//
// Required before transitioning from draft -> ready_for_client_validation.
// Checks minimum fields needed to present a meaningful blueprint to a client.

export function validateForClientValidation(
  data: BlueprintData
): ValidationResult {
  const missingFields: MissingField[] = [];
  const warnings: MissingField[] = [];

  // Required fields
  if (!data.title || data.title.trim() === "") {
    missingFields.push({ field: "title", label: "Role Title" });
  }

  if (!data.roleBand) {
    missingFields.push({ field: "roleBand", label: "Role Band / Level" });
  }

  if (!data.function || data.function.trim() === "") {
    missingFields.push({ field: "function", label: "Function" });
  }

  const hasLocation =
    (data.location && data.location.trim() !== "") ||
    (data.searchGeography && data.searchGeography.trim() !== "");
  if (!hasLocation) {
    missingFields.push({
      field: "location",
      label: "Location or Search Geography",
    });
  }

  const hasMustHaves =
    (data.mustHaves && data.mustHaves.length > 0) ||
    (data.mustHaveDetails && data.mustHaveDetails.length > 0);
  if (!hasMustHaves) {
    missingFields.push({
      field: "mustHaves",
      label: "Must-Have Requirements",
    });
  }

  const hasCriticalMatch =
    (data.criticalMatchPoints && data.criticalMatchPoints.length > 0) ||
    (data.criticalMatchDetails && data.criticalMatchDetails.length > 0);
  if (!hasCriticalMatch) {
    missingFields.push({
      field: "criticalMatchPoints",
      label: "Critical Match Points",
    });
  }

  // Warnings (not blocking but recommended)
  if (!data.confidentialityLevel) {
    warnings.push({
      field: "confidentialityLevel",
      label: "Confidentiality Level (defaults to full_mask if not set)",
    });
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

// ─── Validate for Release ────────────────────────────────────────
//
// Required before transitioning to release_ready and released_to_scouts.
// Includes all client validation checks plus release-specific requirements.

export function validateForRelease(data: ReleaseData): ValidationResult {
  // Start with client validation checks
  const clientResult = validateForClientValidation(data);
  const missingFields = [...clientResult.missingFields];
  const warnings = [...clientResult.warnings];

  // Release-specific: must have scouts selected
  if (!data.selectedScoutIds || data.selectedScoutIds.length === 0) {
    missingFields.push({
      field: "selectedScoutIds",
      label: "Selected Scouts (at least one required)",
    });
  }

  // Executive/C-level roles require explicit release approval
  if (data.roleBand === "executive_clevel" && !data.releaseApprovedBy) {
    missingFields.push({
      field: "releaseApprovedBy",
      label: "Release Approval (required for Executive/C-Level roles)",
    });
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

// ─── Field Completeness Score ────────────────────────────────────
//
// Returns a 0-100 score indicating how complete the blueprint is.
// Useful for showing a progress indicator in the UI.

interface CompletenessData extends BlueprintData {
  department?: string;
  reportingLine?: string;
  whyRoleExists?: string;
  whyNow?: string;
  businessContext?: string;
  sixMonthExpectation?: string;
  twelveMonthOutcomes?: string;
  challengeProfile?: string;
  targetSectors?: string[];
  dealBreakers?: string[];
  dealBreakerDetails?: TagNote[];
}

const COMPLETENESS_FIELDS: { field: keyof CompletenessData; weight: number }[] = [
  { field: "title", weight: 10 },
  { field: "roleBand", weight: 8 },
  { field: "function", weight: 8 },
  { field: "location", weight: 5 },
  { field: "searchGeography", weight: 5 },
  { field: "confidentialityLevel", weight: 5 },
  { field: "mustHaves", weight: 10 },
  { field: "mustHaveDetails", weight: 5 },
  { field: "criticalMatchPoints", weight: 10 },
  { field: "criticalMatchDetails", weight: 5 },
  { field: "department", weight: 3 },
  { field: "reportingLine", weight: 3 },
  { field: "whyRoleExists", weight: 4 },
  { field: "whyNow", weight: 3 },
  { field: "businessContext", weight: 3 },
  { field: "sixMonthExpectation", weight: 3 },
  { field: "twelveMonthOutcomes", weight: 3 },
  { field: "challengeProfile", weight: 3 },
  { field: "targetSectors", weight: 3 },
  { field: "dealBreakers", weight: 2 },
  { field: "dealBreakerDetails", weight: 2 },
];

export function getCompletenessScore(data: CompletenessData): number {
  let earned = 0;
  let total = 0;

  for (const { field, weight } of COMPLETENESS_FIELDS) {
    total += weight;
    const value = data[field];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    earned += weight;
  }

  return total > 0 ? Math.round((earned / total) * 100) : 0;
}
