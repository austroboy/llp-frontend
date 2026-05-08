"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

// ─── Types ──────────────────────────────────────────────────────

export interface ExtractionFieldResult {
  value: unknown;
  state: "extracted" | "inferred" | "missing";
  confidence: number;
  sourceQuote?: string | null;
  reasoning?: string | null;
}

export interface ExtractionResults {
  fields: Record<string, ExtractionFieldResult>;
}

interface UseExtractBlueprintReturn {
  /** Whether extraction is currently running */
  extracting: boolean;
  /** Extraction results (null until extraction completes) */
  results: ExtractionResults | null;
  /** Error message if extraction failed */
  error: string | null;
  /** Run the extraction */
  extract: (sourceText: string) => Promise<ExtractionResults | null>;
  /** Apply extracted results to the blueprint via updateFields mutation */
  applyResults: (
    blueprintId: Id<"htRoleBlueprints">,
    results: ExtractionResults,
    options?: ApplyOptions
  ) => Promise<ApplyReport>;
  /** Clear results and error state */
  reset: () => void;
}

interface ApplyOptions {
  /** Minimum confidence threshold to auto-apply (default: 50) */
  minConfidence?: number;
  /** Only apply fields with these states (default: ["extracted", "inferred"]) */
  applyStates?: Array<"extracted" | "inferred">;
  /** Fields to skip even if extracted */
  skipFields?: string[];
}

export interface ApplyReport {
  applied: string[];
  skipped: string[];
  missing: string[];
}

// ─── Field Mapping ──────────────────────────────────────────────
//
// Maps extraction field names to blueprint schema field names.
// Most are 1:1, but some need special handling.

const DIRECT_FIELD_MAP: Record<string, string> = {
  title: "title",
  department: "department",
  reportingLine: "reportingLine",
  location: "location",
  mustHaves: "mustHaves",
  dealBreakers: "dealBreakers",
  criticalMatchPoints: "criticalMatchPoints",
  roleBand: "roleBand",
  businessStage: "businessStage",
  whyRoleExists: "whyRoleExists",
  whyNow: "whyNow",
  searchGeography: "searchGeography",
  function: "function",
};

// Fields that need value transformation before applying
const ARCHETYPE_MAP: Record<string, string> = {
  builder: "Builder",
  stabilizer: "Stabilizer",
  maintainer: "Maintainer",
  transformer: "Transformer",
  scaler: "Scaler",
};

// ─── Hook ───────────────────────────────────────────────────────

export function useExtractBlueprint(): UseExtractBlueprintReturn {
  const [extracting, setExtracting] = useState(false);
  const [results, setResults] = useState<ExtractionResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateFields = useMutation(api.headhunting.blueprints.updateFields);

  const extract = useCallback(async (sourceText: string): Promise<ExtractionResults | null> => {
    setExtracting(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/blueprint/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Extraction failed" }));
        throw new Error(errorData.error || `Extraction failed (${res.status})`);
      }

      const data: ExtractionResults = await res.json();
      setResults(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed";
      setError(message);
      return null;
    } finally {
      setExtracting(false);
    }
  }, []);

  const applyResults = useCallback(
    async (
      blueprintId: Id<"htRoleBlueprints">,
      extractionResults: ExtractionResults,
      options?: ApplyOptions
    ): Promise<ApplyReport> => {
      const minConfidence = options?.minConfidence ?? 50;
      const applyStates = options?.applyStates ?? ["extracted", "inferred"];
      const skipFields = new Set(options?.skipFields ?? []);

      const report: ApplyReport = {
        applied: [],
        skipped: [],
        missing: [],
      };

      const fieldsToUpdate: Record<string, unknown> = {};

      for (const [fieldName, fieldResult] of Object.entries(extractionResults.fields)) {
        // Skip missing fields
        if (fieldResult.state === "missing" || fieldResult.value === null || fieldResult.value === undefined) {
          report.missing.push(fieldName);
          continue;
        }

        // Skip fields below confidence threshold
        if (fieldResult.confidence < minConfidence) {
          report.skipped.push(fieldName);
          continue;
        }

        // Skip fields not in allowed states
        if (!applyStates.includes(fieldResult.state)) {
          report.skipped.push(fieldName);
          continue;
        }

        // Skip explicitly excluded fields
        if (skipFields.has(fieldName)) {
          report.skipped.push(fieldName);
          continue;
        }

        // Map to blueprint field name
        const blueprintField = DIRECT_FIELD_MAP[fieldName];
        if (blueprintField) {
          fieldsToUpdate[blueprintField] = fieldResult.value;
          report.applied.push(fieldName);
          continue;
        }

        // Special handling for primaryMissionArchetype -> missionArchetype
        if (fieldName === "primaryMissionArchetype" && typeof fieldResult.value === "string") {
          const mapped = ARCHETYPE_MAP[fieldResult.value.toLowerCase()] ?? fieldResult.value;
          fieldsToUpdate.missionArchetype = mapped;
          report.applied.push(fieldName);
          continue;
        }

        // Fields that don't have a direct blueprint mapping are stored as extraction metadata
        // but not applied to the blueprint directly (e.g., mandatoryEducation, minimumExperience,
        // licensesOrCertifications, travelMobilityRequirement, languageRequirement)
        report.skipped.push(fieldName);
      }

      // Apply all updates in a single mutation
      if (Object.keys(fieldsToUpdate).length > 0) {
        await updateFields({
          id: blueprintId,
          fields: fieldsToUpdate,
        });
      }

      return report;
    },
    [updateFields]
  );

  const reset = useCallback(() => {
    setResults(null);
    setError(null);
    setExtracting(false);
  }, []);

  return {
    extracting,
    results,
    error,
    extract,
    applyResults,
    reset,
  };
}
