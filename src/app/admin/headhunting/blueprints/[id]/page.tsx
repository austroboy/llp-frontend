"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Upload,
  Sparkles,
  X,
  Plus,
  FileText,
  ChevronRight,
  RotateCcw,
  Rocket,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, MotionConfig, type Variants } from "framer-motion";
import {
  getBlueprintStatusLabel,
  getBlueprintStatusColor,
  getStatusBadgeClasses,
} from "@/lib/headhunting/status-labels";
import {
  validateForClientValidation,
  getCompletenessScore,
} from "@/lib/headhunting/blueprint-validation";
import { useExtractBlueprint } from "@/lib/headhunting/use-extract-blueprint";
import {
  FieldStateIndicator,
  AdminClue,
  getConfidenceInputClass,
  type FieldState,
  type AiFieldStates,
} from "@/components/headhunting/field-state-indicator";
import { SuccessProfileTab } from "@/components/headhunting/blueprint-tab-success-profile";
import { SearchArchitectureTab } from "@/components/headhunting/blueprint-tab-search-architecture";

// ─── Constants ──────────────────────────────────────────────────

const ROLE_BAND_OPTIONS = [
  { value: "entry_junior", label: "Entry / Junior" },
  { value: "management_functional", label: "Management / Functional" },
  { value: "executive_clevel", label: "Executive / C-Level" },
] as const;

const BUSINESS_STAGE_OPTIONS = [
  "Greenfield / New Setup",
  "Early Build / Foundation Stage",
  "Growth / Scale-Up",
  "Mature / Stable Operations",
  "Transformation / Change Phase",
  "Turnaround / Recovery",
  "Restructuring / Post-Merger / Reorganization",
  "Project Phase / Construction Phase",
  "Market Entry / New Geography Expansion",
  "Confidential / Not yet disclosed",
] as const;

const MISSION_ARCHETYPE_OPTIONS = [
  "Builder",
  "Stabilizer",
  "Maintainer",
  "Transformer",
  "Scaler",
] as const;

const CONFIDENTIALITY_OPTIONS = [
  { value: "disclosed", label: "Open" },
  { value: "partial_clue", label: "Standard" },
  { value: "full_mask", label: "Confidential" },
] as const;

const ROLE_TYPE_OPTIONS = [
  { value: "replacement", label: "Replacement" },
  { value: "new_position", label: "New Position" },
  { value: "expansion", label: "Expansion" },
] as const;

const EXPOSURE_OPTIONS = [
  { value: "plant", label: "Plant" },
  { value: "project", label: "Project" },
  { value: "corporate", label: "Corporate" },
  { value: "mixed", label: "Mixed" },
] as const;

const GREENFIELD_OPTIONS = [
  { value: "greenfield", label: "Greenfield" },
  { value: "brownfield", label: "Brownfield" },
  { value: "both", label: "Both" },
] as const;

const COMPENSATION_OPTIONS = [
  { value: "revenue_share", label: "Revenue Share" },
  { value: "fixed_bounty", label: "Fixed Bounty" },
] as const;

// ─── Types ──────────────────────────────────────────────────────

type SectionTab =
  | "identity"
  | "context"
  | "scope"
  | "gates"
  | "match"
  | "success"
  | "search"
  | "commercial";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlueprintDoc = Record<string, any>;

// ─── Required fields by role band ───────────────────────────────

const BASE_REQUIRED = ["title", "roleBand", "function"];
const MANAGEMENT_REQUIRED = [
  ...BASE_REQUIRED,
  "location",
  "mustHaves",
  "criticalMatchPoints",
];
const EXECUTIVE_REQUIRED = [
  ...MANAGEMENT_REQUIRED,
  "confidentialityLevel",
  "reportingLine",
];

function getRequiredFields(roleBand?: string): string[] {
  switch (roleBand) {
    case "executive_clevel":
      return EXECUTIVE_REQUIRED;
    case "management_functional":
      return MANAGEMENT_REQUIRED;
    default:
      return BASE_REQUIRED;
  }
}

// ─── Motion Variants ────────────────────────────────────────────

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};
const inViewOnce = { once: true, margin: "-72px 0px" } as const;

// ─── Main Export ────────────────────────────────────────────────

export default function BlueprintEditorPage() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        }
      >
        <BlueprintEditorContent />
      </Suspense>
    </MotionConfig>
  );
}

// ─── Editor Content ─────────────────────────────────────────────

function BlueprintEditorContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const blueprintId = params.id as string;
  const tabParam = searchParams.get("section") as SectionTab | null;

  const blueprint = useQuery(api.headhunting.blueprints.getById, {
    id: blueprintId as Id<"htRoleBlueprints">,
  });
  const clientContact = useQuery(api.headhunting.blueprints.getClientContact, {
    id: blueprintId as Id<"htRoleBlueprints">,
  });
  const updateField = useMutation(api.headhunting.blueprints.updateField);
  const updateFields = useMutation(api.headhunting.blueprints.updateFields);
  const transitionStatus = useMutation(
    api.headhunting.blueprints.transitionStatus
  );
  const generateBrief = useMutation(api.headhunting.briefs.generate);
  const generateUploadUrl = useMutation(
    api.headhunting.blueprints.generateUploadUrl
  );
  const addSourceDocument = useMutation(
    api.headhunting.blueprints.addSourceDocument
  );

  // Local form state (mirrors blueprint data for debounced saves)
  const [localFields, setLocalFields] = useState<Record<string, unknown>>({});
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [activeSection, setActiveSection] = useState<SectionTab>(
    tabParam && ["identity", "context", "scope", "gates", "match", "success", "search", "commercial"].includes(tabParam)
      ? tabParam
      : "identity"
  );
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showExtractionDialog, setShowExtractionDialog] = useState(false);

  // AI Extraction hook
  const {
    extracting,
    results: extractionResults,
    error: extractionError,
    extract,
    applyResults,
    reset: resetExtraction,
  } = useExtractBlueprint();

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFieldsRef = useRef<Record<string, unknown>>({});

  // Sync local fields when blueprint loads
  useEffect(() => {
    if (blueprint) {
      setLocalFields({});
    }
  }, [blueprint?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get field value: local override or from blueprint
  const getField = useCallback(
    (field: string): unknown => {
      if (field in localFields) return localFields[field];
      return (blueprint as Record<string, unknown> | null)?.[field];
    },
    [localFields, blueprint]
  );

  // Debounced save
  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const fieldsToSave = { ...pendingFieldsRef.current };
      if (Object.keys(fieldsToSave).length === 0) return;

      pendingFieldsRef.current = {};
      setSaveStatus("saving");

      try {
        await updateFields({
          id: blueprintId as Id<"htRoleBlueprints">,
          fields: fieldsToSave,
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
        toast.error("Failed to save changes");
      }
    }, 1000);
  }, [blueprintId, updateFields]);

  // Set a field locally and queue auto-save
  const setField = useCallback(
    (field: string, value: unknown) => {
      setLocalFields((prev) => ({ ...prev, [field]: value }));
      pendingFieldsRef.current[field] = value;
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  // Tab change with URL persistence
  const handleSectionChange = (tab: string) => {
    const t = tab as SectionTab;
    setActiveSection(t);
    const url = new URL(window.location.href);
    url.searchParams.set("section", t);
    window.history.replaceState({}, "", url.toString());
  };

  // Status transition handlers
  const handleSendForValidation = () => {
    if (!blueprint) return;
    const merged = { ...blueprint, ...localFields };
    const result = validateForClientValidation(merged);
    if (!result.valid) {
      setShowValidationDialog(true);
      return;
    }
    doTransition("ready_for_client_validation");
  };

  const handleResendToClient = () => {
    doTransition("sent_to_client");
  };

  const handleGenerateBrief = async () => {
    if (!blueprint) return;
    setBriefLoading(true);
    try {
      await generateBrief({
        blueprintId: blueprint._id,
      });
      toast.success("Scout brief generated successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate brief"
      );
    } finally {
      setBriefLoading(false);
    }
  };

  const doTransition = async (targetStatus: string) => {
    if (!blueprint) return;
    setTransitionLoading(true);
    try {
      await transitionStatus({
        id: blueprint._id,
        targetStatus: targetStatus as Parameters<typeof transitionStatus>[0]["targetStatus"],
      });
      toast.success(`Status updated to ${getBlueprintStatusLabel(targetStatus)}`);
      setShowValidationDialog(false);

      // After "sent_to_client": send validation email to client (non-blocking)
      // The API route fetches the validationToken directly from Convex.
      if (targetStatus === "sent_to_client" && clientContact?.contactEmail) {
        fetch("/api/blueprint/notify-client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blueprintId: blueprint._id,
            clientEmail: clientContact.contactEmail,
            clientName: clientContact.contactName || clientContact.companyName,
            roleTitle: blueprint.title,
          }),
        })
          .then(async (res) => {
            if (res.ok) {
              toast.success(`Validation email sent to ${clientContact.contactEmail}`);
            } else {
              const data = await res.json().catch(() => null);
              toast.error(data?.error || "Failed to send validation email");
            }
          })
          .catch(() => {
            toast.error("Failed to send validation email");
          });
      } else if (targetStatus === "sent_to_client" && !clientContact?.contactEmail) {
        toast.warning("No client contact email found — validation email not sent. Add a contact to the client record.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Status transition failed"
      );
    } finally {
      setTransitionLoading(false);
    }
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !blueprint) return;

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await addSourceDocument({
        id: blueprint._id,
        storageId,
      });
      toast.success(`Uploaded: ${file.name}`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // AI Extraction handler
  const handleExtractWithAI = async () => {
    if (!blueprint) return;

    // Use sourceText from blueprint, or prompt user if empty
    const text = (blueprint.sourceText as string) || "";
    if (text.trim().length < 50) {
      toast.error(
        "Please paste the job description text into the Source Text field first (minimum 50 characters)."
      );
      return;
    }

    const results = await extract(text);
    if (results) {
      setShowExtractionDialog(true);
    }
  };

  const handleApplyExtraction = async () => {
    if (!extractionResults || !blueprint) return;

    try {
      const report = await applyResults(blueprint._id, extractionResults, {
        minConfidence: 50,
        applyStates: ["extracted", "inferred"],
      });

      // Build AI field states from extraction results
      const newAiFieldStates: AiFieldStates = {
        ...(blueprint.aiFieldStates as AiFieldStates | undefined),
      };
      for (const [fieldName, fieldResult] of Object.entries(
        extractionResults.fields
      )) {
        newAiFieldStates[fieldName] = {
          state: fieldResult.state,
          confidence: fieldResult.confidence,
          sourceQuote: fieldResult.sourceQuote,
          reasoning: fieldResult.reasoning,
        };
      }

      // Save AI field states
      await updateFields({
        id: blueprint._id,
        fields: { aiFieldStates: newAiFieldStates },
      });

      // Update local fields to reflect applied changes immediately
      for (const fieldName of report.applied) {
        const fieldResult = extractionResults.fields[fieldName];
        if (fieldResult) {
          // Map extraction field name to blueprint field name
          const blueprintFieldMap: Record<string, string> = {
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
            primaryMissionArchetype: "missionArchetype",
          };
          const bpField = blueprintFieldMap[fieldName];
          if (bpField) {
            const value =
              fieldName === "primaryMissionArchetype" &&
              typeof fieldResult.value === "string"
                ? fieldResult.value.charAt(0).toUpperCase() +
                  fieldResult.value.slice(1).toLowerCase()
                : fieldResult.value;
            setLocalFields((prev) => ({ ...prev, [bpField]: value }));
          }
        }
      }

      // Update local aiFieldStates too
      setLocalFields((prev) => ({ ...prev, aiFieldStates: newAiFieldStates }));

      toast.success(
        `Applied ${report.applied.length} fields. ${report.missing.length} fields not found in source.`
      );
      setShowExtractionDialog(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to apply extraction results"
      );
    }
  };

  // AI field state confirm handler
  const handleConfirmField = useCallback(
    async (field: string) => {
      if (!blueprint) return;
      const currentStates = (getField("aiFieldStates") as AiFieldStates) ?? {};
      const fieldState = currentStates[field];
      if (!fieldState) return;

      const updatedStates: AiFieldStates = {
        ...currentStates,
        [field]: { ...fieldState, state: "confirmed" },
      };
      setLocalFields((prev) => ({ ...prev, aiFieldStates: updatedStates }));
      try {
        await updateFields({
          id: blueprint._id,
          fields: { aiFieldStates: updatedStates },
        });
        toast.success(`Confirmed: ${field}`);
      } catch {
        toast.error("Failed to confirm field");
      }
    },
    [blueprint, getField, updateFields]
  );

  // Get AI field states for the current blueprint
  const aiFieldStates = useMemo(
    () => (getField("aiFieldStates") as AiFieldStates) ?? {},
    [getField]
  );

  // Role band value for conditional rendering
  const currentRoleBand = getField("roleBand") as string | undefined;

  // Computed values
  const completeness = useMemo(() => {
    if (!blueprint) return 0;
    return getCompletenessScore({ ...blueprint, ...localFields });
  }, [blueprint, localFields]);

  const validationResult = useMemo(() => {
    if (!blueprint) return null;
    return validateForClientValidation({ ...blueprint, ...localFields });
  }, [blueprint, localFields]);

  const requiredFields = useMemo(
    () => getRequiredFields(getField("roleBand") as string | undefined),
    [getField]
  );

  const isEditable =
    blueprint?.status === "draft" ||
    blueprint?.status === "returned_with_revisions";

  // ─── Loading / Not Found ────────────────────────────────────

  if (blueprint === undefined) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin mx-auto mb-2" />
        Loading blueprint...
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Blueprint not found.
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* -- Hero ------------------------------------------------ */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-4)" }}
      >
        <motion.div variants={fadeUp} style={{ marginBottom: "var(--s-3)" }}>
          <Link
            href="/admin/headhunting/blueprints"
            className="lf-meta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--ink-3)",
              textDecoration: "none",
              textTransform: "uppercase",
            }}
          >
            <ArrowLeft size={12} />
            All Blueprints
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ V</span>
          Admin · Headhunting · Blueprint Editor
        </motion.div>
      </motion.section>

      {/* Header Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Editable title */}
            {isEditable ? (
              <input
                type="text"
                value={(getField("title") as string) || ""}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Enter role title..."
                className="text-xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground/50 focus:ring-0"
              />
            ) : (
              <h1 className="text-xl font-bold">{blueprint.title}</h1>
            )}

            <div className="flex items-center gap-3 flex-wrap mt-2 text-sm">
              <span className={getStatusBadgeClasses(blueprint.status)}>
                {getBlueprintStatusLabel(blueprint.status)}
              </span>

              {blueprint.lifecycleStatus === "paused" && (
                <Badge
                  variant="outline"
                  className="text-xs border-yellow-300 text-yellow-600 dark:border-yellow-700 dark:text-yellow-400"
                >
                  Paused
                </Badge>
              )}

              <span className="text-muted-foreground">
                v{blueprint.version}
              </span>

              {blueprint.updatedAt && (
                <span className="text-xs text-muted-foreground">
                  Updated{" "}
                  {formatDistanceToNow(new Date(blueprint.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Right side: completeness + save indicator */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Save indicator */}
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Saving...
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="size-3 text-green-500" />
                  Saved
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <AlertTriangle className="size-3 text-red-500" />
                  Save failed
                </>
              )}
            </div>

            {/* Completeness */}
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-20 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    completeness >= 80
                      ? "bg-green-500"
                      : completeness >= 50
                        ? "bg-yellow-500"
                        : "bg-red-400"
                  )}
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <span className="text-sm font-medium">{completeness}%</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          {blueprint.status === "draft" && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSendForValidation}
              disabled={transitionLoading}
            >
              {transitionLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Send for Validation
            </Button>
          )}

          {blueprint.status === "returned_with_revisions" && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleResendToClient}
              disabled={transitionLoading}
            >
              {transitionLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RotateCcw className="size-3.5" />
              )}
              Re-send to Client
            </Button>
          )}

          {blueprint.status === "finalized_by_client" && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleGenerateBrief}
              disabled={briefLoading}
            >
              {briefLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate Brief
            </Button>
          )}

          {blueprint.status === "brief_generated" && (
            <Link href={`/admin/headhunting/blueprints/${blueprintId}/brief`}>
              <Button size="sm" className="gap-1.5">
                <Rocket className="size-3.5" />
                Select Scouts & Release
              </Button>
            </Link>
          )}

          {blueprint.status === "ready_for_client_validation" && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => doTransition("sent_to_client")}
              disabled={transitionLoading}
            >
              {transitionLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Send to Client
            </Button>
          )}
        </div>
      </div>

      {/* Client Revisions Panel */}
      {blueprint.status === "returned_with_revisions" &&
        (blueprint.clientRevisions || blueprint.clientGeneralNote) && (
          <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 p-4">
            <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="size-4" />
              Client Feedback
            </h3>
            {blueprint.clientGeneralNote && (
              <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                {blueprint.clientGeneralNote}
              </p>
            )}
            {blueprint.clientRevisions &&
              typeof blueprint.clientRevisions === "object" && (
                <div className="space-y-2">
                  {Object.entries(
                    blueprint.clientRevisions as Record<string, unknown>
                  ).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex gap-2 text-sm text-orange-700 dark:text-orange-300"
                    >
                      <ChevronRight className="size-3.5 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{key}:</span>{" "}
                        {String(val)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

      {/* Section Tabs */}
      <Tabs value={activeSection} onValueChange={handleSectionChange}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="identity" className="gap-1.5 text-xs sm:text-sm">
            Role Identity
          </TabsTrigger>
          <TabsTrigger value="context" className="gap-1.5 text-xs sm:text-sm">
            Mandate Context
          </TabsTrigger>
          <TabsTrigger value="scope" className="gap-1.5 text-xs sm:text-sm">
            Scope & Authority
          </TabsTrigger>
          <TabsTrigger value="gates" className="gap-1.5 text-xs sm:text-sm">
            Hard Gates
          </TabsTrigger>
          <TabsTrigger value="match" className="gap-1.5 text-xs sm:text-sm">
            Match Logic
          </TabsTrigger>
          {currentRoleBand !== "entry_junior" && (
            <TabsTrigger value="success" className="gap-1.5 text-xs sm:text-sm">
              Success Profile
            </TabsTrigger>
          )}
          <TabsTrigger value="search" className="gap-1.5 text-xs sm:text-sm">
            Search Architecture
          </TabsTrigger>
          <TabsTrigger value="commercial" className="gap-1.5 text-xs sm:text-sm">
            Commercial
          </TabsTrigger>
        </TabsList>

        {/* ─── Role Identity ─────────────────────────────────── */}
        <TabsContent value="identity">
          <SectionCard>
            {/* Executive banner */}
            {currentRoleBand === "executive_clevel" && (
              <div className="mb-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 px-3 py-2 text-xs text-red-700 dark:text-red-400 font-medium flex items-center gap-2">
                <ShieldAlert className="size-3.5 flex-shrink-0" />
                Executive mandate — stricter release controls apply.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldText
                label="Role Title"
                field="title"
                required={requiredFields.includes("title")}
                value={getField("title") as string}
                onChange={(v) => setField("title", v)}
                disabled={!isEditable}
                aiState={aiFieldStates["title"]}
                onConfirm={() => handleConfirmField("title")}
              />
              <FieldSelect
                label="Role Band"
                field="roleBand"
                required={requiredFields.includes("roleBand")}
                value={getField("roleBand") as string}
                onChange={(v) => setField("roleBand", v)}
                options={ROLE_BAND_OPTIONS.map((o) => o)}
                disabled={!isEditable}
                aiState={aiFieldStates["roleBand"]}
                onConfirm={() => handleConfirmField("roleBand")}
              />
              <FieldText
                label="Function"
                field="function"
                required={requiredFields.includes("function")}
                value={getField("function") as string}
                onChange={(v) => setField("function", v)}
                disabled={!isEditable}
                aiState={aiFieldStates["function"]}
                onConfirm={() => handleConfirmField("function")}
              />
              <FieldText
                label="Seniority"
                field="seniority"
                value={getField("seniority") as string}
                onChange={(v) => setField("seniority", v)}
                disabled={!isEditable}
                aiState={aiFieldStates["seniority"]}
                onConfirm={() => handleConfirmField("seniority")}
              />
              <FieldText
                label="Department"
                field="department"
                value={getField("department") as string}
                onChange={(v) => setField("department", v)}
                disabled={!isEditable}
                aiState={aiFieldStates["department"]}
                onConfirm={() => handleConfirmField("department")}
              />
              <FieldText
                label="Reporting Line"
                field="reportingLine"
                required={requiredFields.includes("reportingLine")}
                value={getField("reportingLine") as string}
                onChange={(v) => setField("reportingLine", v)}
                disabled={!isEditable}
                aiState={aiFieldStates["reportingLine"]}
                onConfirm={() => handleConfirmField("reportingLine")}
              />
              <FieldText
                label="Location"
                field="location"
                required={requiredFields.includes("location")}
                value={getField("location") as string}
                onChange={(v) => setField("location", v)}
                disabled={!isEditable}
                aiState={aiFieldStates["location"]}
                onConfirm={() => handleConfirmField("location")}
              />
              <FieldText
                label="Industry"
                field="industry"
                value={getField("industry") as string}
                onChange={(v) => setField("industry", v)}
                disabled={!isEditable}
                aiState={aiFieldStates["industry"]}
                onConfirm={() => handleConfirmField("industry")}
              />
            </div>

            <div className="mt-4">
              <FieldSelect
                label="Role Type"
                field="roleType"
                value={getField("roleType") as string}
                onChange={(v) => setField("roleType", v)}
                options={ROLE_TYPE_OPTIONS.map((o) => o)}
                disabled={!isEditable}
              />
            </div>

            <Separator className="my-6" />

            {/* Source Document Upload */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Source Documents (JD Upload)
              </Label>
              {isEditable && (
                <div className="relative border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                  <Upload className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Drag and drop or click to upload JD
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    PDF, DOC, DOCX accepted
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                      <Loader2 className="size-5 animate-spin" />
                    </div>
                  )}
                </div>
              )}

              {/* Uploaded files */}
              {blueprint.sourceDocumentIds &&
                blueprint.sourceDocumentIds.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {blueprint.sourceDocumentIds.map(
                      (docId: string, i: number) => (
                        <div
                          key={docId}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <FileText className="size-3.5" />
                          Document {i + 1}
                        </div>
                      )
                    )}
                  </div>
                )}

              {/* Source text input + AI extraction */}
              {isEditable && (
                <div className="mt-4 space-y-3">
                  <Label className="text-sm font-medium">
                    Source Text (paste JD / hiring brief for AI extraction)
                  </Label>
                  <Textarea
                    value={(getField("sourceText") as string) || ""}
                    onChange={(e) => setField("sourceText", e.target.value)}
                    placeholder="Paste the full job description or hiring brief text here. The AI will extract structured fields from this text..."
                    rows={6}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={handleExtractWithAI}
                    disabled={extracting}
                  >
                    {extracting ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    {extracting ? "Extracting..." : "Extract with AI"}
                  </Button>
                  {extractionError && (
                    <p className="text-xs text-red-500">{extractionError}</p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── Mandate Context ───────────────────────────────── */}
        <TabsContent value="context">
          <SectionCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldSelect
                  label="Business Stage"
                  field="businessStage"
                  value={getField("businessStage") as string}
                  onChange={(v) => setField("businessStage", v)}
                  options={BUSINESS_STAGE_OPTIONS.map((o) => ({
                    value: o,
                    label: o,
                  }))}
                  disabled={!isEditable}
                  aiState={aiFieldStates["businessStage"]}
                  onConfirm={() => handleConfirmField("businessStage")}
                />
                <AdminClue text="Ask whether the organization is building, stabilizing, scaling, or repairing." />
              </div>
              <div>
                <FieldSelect
                  label="Mission Archetype"
                  field="missionArchetype"
                  value={getField("missionArchetype") as string}
                  onChange={(v) => setField("missionArchetype", v)}
                  options={MISSION_ARCHETYPE_OPTIONS.map((o) => ({
                    value: o,
                    label: o,
                  }))}
                  disabled={!isEditable}
                  aiState={aiFieldStates["primaryMissionArchetype"]}
                  onConfirm={() => handleConfirmField("primaryMissionArchetype")}
                />
                <AdminClue text="Is this person expected to create, repair, keep running, redesign, or expand?" />
              </div>
              <FieldText
                label="Stakeholder Complexity"
                field="stakeholderComplexity"
                value={getField("stakeholderComplexity") as string}
                onChange={(v) => setField("stakeholderComplexity", v)}
                disabled={!isEditable}
                aiState={aiFieldStates["stakeholderComplexity"]}
                onConfirm={() => handleConfirmField("stakeholderComplexity")}
              />
            </div>

            <div className="mt-4 space-y-4">
              <FieldTextarea
                label="Why This Role Exists"
                field="whyRoleExists"
                value={getField("whyRoleExists") as string}
                onChange={(v) => setField("whyRoleExists", v)}
                disabled={!isEditable}
                aiState={aiFieldStates["whyRoleExists"]}
                onConfirm={() => handleConfirmField("whyRoleExists")}
              />
              <FieldTextarea
                label="Why Now?"
                field="whyNow"
                value={getField("whyNow") as string}
                onChange={(v) => setField("whyNow", v)}
                disabled={!isEditable}
                aiState={aiFieldStates["whyNow"]}
                onConfirm={() => handleConfirmField("whyNow")}
              />
              <FieldTextarea
                label="Business Context"
                field="businessContext"
                value={getField("businessContext") as string}
                onChange={(v) => setField("businessContext", v)}
                disabled={!isEditable}
                aiState={aiFieldStates["businessContext"]}
                onConfirm={() => handleConfirmField("businessContext")}
              />
              <FieldTextarea
                label="Environment Description"
                field="environmentDescription"
                value={getField("environmentDescription") as string}
                onChange={(v) => setField("environmentDescription", v)}
                disabled={!isEditable}
                aiState={aiFieldStates["environmentDescription"]}
                onConfirm={() => handleConfirmField("environmentDescription")}
              />
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── Scope & Authority ─────────────────────────────── */}
        <TabsContent value="scope">
          <SectionCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldText
                label="Team Size"
                field="teamSize"
                value={getField("teamSize") as string}
                onChange={(v) => setField("teamSize", v)}
                disabled={!isEditable}
                placeholder="e.g. 15-20"
                aiState={aiFieldStates["teamSize"]}
                onConfirm={() => handleConfirmField("teamSize")}
              />
              <FieldNumber
                label="Direct Reports"
                field="directReports"
                value={getField("directReports") as number}
                onChange={(v) => setField("directReports", v)}
                disabled={!isEditable}
              />
              <FieldSelect
                label="Exposure Type"
                field="exposureType"
                value={getField("exposureType") as string}
                onChange={(v) => setField("exposureType", v)}
                options={EXPOSURE_OPTIONS.map((o) => o)}
                disabled={!isEditable}
                aiState={aiFieldStates["exposureType"]}
                onConfirm={() => handleConfirmField("exposureType")}
              />
              <FieldSelect
                label="Greenfield / Brownfield"
                field="greenBrownField"
                value={getField("greenBrownField") as string}
                onChange={(v) => setField("greenBrownField", v)}
                options={GREENFIELD_OPTIONS.map((o) => o)}
                disabled={!isEditable}
                aiState={aiFieldStates["greenBrownField"]}
                onConfirm={() => handleConfirmField("greenBrownField")}
              />
              <FieldCheckbox
                label="Travel Required"
                field="travelRequired"
                checked={getField("travelRequired") as boolean}
                onChange={(v) => setField("travelRequired", v)}
                disabled={!isEditable}
              />
            </div>

            <div className="mt-4 space-y-4">
              <FieldTextarea
                label="Budget Scope"
                field="budgetScope"
                value={getField("budgetScope") as string}
                onChange={(v) => setField("budgetScope", v)}
                disabled={!isEditable}
                placeholder="Revenue/budget responsibility, if any..."
                aiState={aiFieldStates["budgetScope"]}
                onConfirm={() => handleConfirmField("budgetScope")}
              />
              <FieldTextarea
                label="Decision Authority"
                field="decisionAuthority"
                value={getField("decisionAuthority") as string}
                onChange={(v) => setField("decisionAuthority", v)}
                disabled={!isEditable}
                placeholder="What decisions can this person make independently?"
                aiState={aiFieldStates["decisionAuthority"]}
                onConfirm={() => handleConfirmField("decisionAuthority")}
              />
              <FieldText
                label="Stakeholder Level"
                field="stakeholderLevel"
                value={getField("stakeholderLevel") as string}
                onChange={(v) => setField("stakeholderLevel", v)}
                disabled={!isEditable}
                placeholder="C-suite, Board, Government, etc."
                aiState={aiFieldStates["stakeholderLevel"]}
                onConfirm={() => handleConfirmField("stakeholderLevel")}
              />
              <FieldText
                label="Board / Investor Exposure"
                field="boardInvestorExposure"
                value={getField("boardInvestorExposure") as string}
                onChange={(v) => setField("boardInvestorExposure", v)}
                disabled={!isEditable}
                placeholder="Level of board/investor interaction..."
                aiState={aiFieldStates["boardInvestorExposure"]}
                onConfirm={() => handleConfirmField("boardInvestorExposure")}
              />
              <FieldText
                label="Indirect Reports"
                field="indirectReports"
                value={getField("indirectReports") as string}
                onChange={(v) => setField("indirectReports", v)}
                disabled={!isEditable}
                placeholder="e.g. 50-100 across departments"
                aiState={aiFieldStates["indirectReports"]}
                onConfirm={() => handleConfirmField("indirectReports")}
              />
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── Hard Gates ────────────────────────────────────── */}
        <TabsContent value="gates">
          <SectionCard>
            <TagListField
              label="Must-Haves"
              field="mustHaves"
              required={requiredFields.includes("mustHaves")}
              value={(getField("mustHaves") as string[]) ?? []}
              onChange={(v) => setField("mustHaves", v)}
              disabled={!isEditable}
              placeholder="Add a must-have requirement..."
            />

            <Separator className="my-6" />

            <TagListField
              label="Deal Breakers"
              field="dealBreakers"
              value={(getField("dealBreakers") as string[]) ?? []}
              onChange={(v) => setField("dealBreakers", v)}
              disabled={!isEditable}
              placeholder="Add a deal breaker..."
            />

            <Separator className="my-6" />

            <TagListField
              label="Preferred Attributes"
              field="preferredAttributes"
              value={(getField("preferredAttributes") as string[]) ?? []}
              onChange={(v) => setField("preferredAttributes", v)}
              disabled={!isEditable}
              placeholder="Add a preferred attribute..."
            />

            <Separator className="my-6" />

            <TagListField
              label="Disqualifiers"
              field="disqualifiers"
              value={(getField("disqualifiers") as string[]) ?? []}
              onChange={(v) => setField("disqualifiers", v)}
              disabled={!isEditable}
              placeholder="Add a disqualifier..."
            />
          </SectionCard>
        </TabsContent>

        {/* ─── Match Logic ───────────────────────────────────── */}
        <TabsContent value="match">
          <SectionCard>
            <TagListField
              label="Critical Match Points"
              field="criticalMatchPoints"
              required={requiredFields.includes("criticalMatchPoints")}
              value={(getField("criticalMatchPoints") as string[]) ?? []}
              onChange={(v) => setField("criticalMatchPoints", v)}
              disabled={!isEditable}
              placeholder="Add a critical match point..."
            />

            <Separator className="my-6" />

            <TagListField
              label="General Match Points"
              field="generalMatchPoints"
              value={(getField("generalMatchPoints") as string[]) ?? []}
              onChange={(v) => setField("generalMatchPoints", v)}
              disabled={!isEditable}
              placeholder="Add a general match point..."
            />

            <Separator className="my-6" />

            <TagListField
              label="Transferable Backgrounds"
              field="transferableBackgrounds"
              value={(getField("transferableBackgrounds") as string[]) ?? []}
              onChange={(v) => setField("transferableBackgrounds", v)}
              disabled={!isEditable}
              placeholder="Add a transferable background..."
            />

            <Separator className="my-6" />

            <TagListField
              label="Adjacent Sectors Allowed"
              field="adjacentSectorsAllowed"
              value={(getField("adjacentSectorsAllowed") as string[]) ?? []}
              onChange={(v) => setField("adjacentSectorsAllowed", v)}
              disabled={!isEditable}
              placeholder="Add an adjacent sector..."
            />

            <Separator className="my-6" />

            <FieldTextarea
              label="Profile Types to Avoid"
              field="profileTypesToAvoid"
              value={getField("profileTypesToAvoid") as string}
              onChange={(v) => setField("profileTypesToAvoid", v)}
              disabled={!isEditable}
              placeholder="Describe profile types that should be avoided..."
              aiState={aiFieldStates["profileTypesToAvoid"]}
              onConfirm={() => handleConfirmField("profileTypesToAvoid")}
            />

            <div className="mt-4">
              <FieldTextarea
                label="Search Notes"
                field="searchNotes"
                value={getField("searchNotes") as string}
                onChange={(v) => setField("searchNotes", v)}
                disabled={!isEditable}
                placeholder="Any specific search instructions or preferences..."
                aiState={aiFieldStates["searchNotes"]}
                onConfirm={() => handleConfirmField("searchNotes")}
              />
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── Success Profile ──────────────────────────────── */}
        <TabsContent value="success">
          {currentRoleBand === "entry_junior" ? (
            <div className="rounded-lg border border-border bg-card p-6 mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                This section is not required for entry-level roles.
              </p>
            </div>
          ) : (
            <SuccessProfileTab
              getField={getField}
              setField={setField}
              isEditable={isEditable}
              aiFieldStates={aiFieldStates}
              onConfirmField={handleConfirmField}
              roleBand={currentRoleBand}
            />
          )}
        </TabsContent>

        {/* ─── Search Architecture ──────────────────────────── */}
        <TabsContent value="search">
          <SearchArchitectureTab
            getField={getField}
            setField={setField}
            isEditable={isEditable}
            aiFieldStates={aiFieldStates}
            onConfirmField={handleConfirmField}
            roleBand={currentRoleBand}
          />
        </TabsContent>

        {/* ─── Commercial & Control ──────────────────────────── */}
        <TabsContent value="commercial">
          <SectionCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldSelect
                label="Confidentiality Level"
                field="confidentialityLevel"
                required={requiredFields.includes("confidentialityLevel")}
                value={getField("confidentialityLevel") as string}
                onChange={(v) => setField("confidentialityLevel", v)}
                options={CONFIDENTIALITY_OPTIONS.map((o) => o)}
                disabled={!isEditable}
              />
              <FieldSelect
                label="Compensation Mode"
                field="compensationMode"
                value={getField("compensationMode") as string}
                onChange={(v) => setField("compensationMode", v)}
                options={COMPENSATION_OPTIONS.map((o) => o)}
                disabled={!isEditable}
              />
              <FieldNumber
                label="Shortlist Min"
                field="shortlistMin"
                value={getField("shortlistMin") as number}
                onChange={(v) => setField("shortlistMin", v)}
                disabled={!isEditable}
              />
              <FieldNumber
                label="Shortlist Max"
                field="shortlistMax"
                value={getField("shortlistMax") as number}
                onChange={(v) => setField("shortlistMax", v)}
                disabled={!isEditable}
              />
              <FieldText
                label="Assigned To"
                field="assignedTo"
                value={getField("assignedTo") as string}
                onChange={(v) => setField("assignedTo", v)}
                disabled={!isEditable}
                placeholder="Team member name or ID"
              />
              <FieldText
                label="Geography"
                field="geography"
                value={getField("geography") as string}
                onChange={(v) => setField("geography", v)}
                disabled={!isEditable}
              />
            </div>

            <div className="mt-4 space-y-4">
              <FieldTextarea
                label="Internal Notes"
                field="internalNotes"
                value={getField("internalNotes") as string}
                onChange={(v) => setField("internalNotes", v)}
                disabled={!isEditable}
                placeholder="Notes visible only to LLP team..."
              />
              <FieldTextarea
                label="Scout-Visible Notes"
                field="scoutVisibleNotes"
                value={getField("scoutVisibleNotes") as string}
                onChange={(v) => setField("scoutVisibleNotes", v)}
                disabled={!isEditable}
                placeholder="Notes that will be shared with scouts in the brief..."
              />
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Validation Dialog */}
      <Dialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validation Required</DialogTitle>
          </DialogHeader>
          {validationResult && !validationResult.valid && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The following fields must be completed before sending for client
                validation:
              </p>
              <ul className="space-y-1.5">
                {validationResult.missingFields.map((f) => (
                  <li
                    key={f.field}
                    className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                  >
                    <AlertTriangle className="size-3.5 flex-shrink-0" />
                    {f.label}
                  </li>
                ))}
              </ul>
              {validationResult.warnings.length > 0 && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground">Warnings:</p>
                  <ul className="space-y-1.5">
                    {validationResult.warnings.map((w) => (
                      <li
                        key={w.field}
                        className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400"
                      >
                        <AlertTriangle className="size-3.5 flex-shrink-0" />
                        {w.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          {validationResult?.valid && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Blueprint is ready for client validation. Proceed?
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowValidationDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => doTransition("ready_for_client_validation")}
                  disabled={transitionLoading}
                >
                  {transitionLoading && (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  )}
                  Confirm
                </Button>
              </div>
            </div>
          )}
          {validationResult && !validationResult.valid && (
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowValidationDialog(false)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Extraction Results Dialog */}
      <Dialog
        open={showExtractionDialog}
        onOpenChange={(open) => {
          setShowExtractionDialog(open);
          if (!open) resetExtraction();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              AI Extraction Results
            </DialogTitle>
          </DialogHeader>
          {extractionResults && (
            <div className="space-y-4">
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-green-500 inline-block" />
                  Extracted ({Object.values(extractionResults.fields).filter((f) => f.state === "extracted").length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-blue-500 inline-block" />
                  Inferred ({Object.values(extractionResults.fields).filter((f) => f.state === "inferred").length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-gray-300 inline-block" />
                  Missing ({Object.values(extractionResults.fields).filter((f) => f.state === "missing").length})
                </span>
              </div>

              <div className="space-y-2">
                {Object.entries(extractionResults.fields).map(
                  ([fieldName, field]) => {
                    // Confidence-based border styling
                    const confidenceBorder =
                      field.state === "missing"
                        ? "border-border bg-muted/30"
                        : field.confidence > 80
                          ? "border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                          : field.confidence >= 50
                            ? "border-yellow-300 dark:border-yellow-800 bg-yellow-50/30 dark:bg-yellow-950/20"
                            : "border-orange-300 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/20";

                    return (
                      <div
                        key={fieldName}
                        className={cn(
                          "rounded-md border p-3 text-sm",
                          confidenceBorder
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">
                            {fieldName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded",
                                field.state === "extracted"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  : field.state === "inferred"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                              )}
                            >
                              {field.state}
                            </span>
                            {field.state !== "missing" && (
                              <span className="text-xs text-muted-foreground">
                                {field.confidence}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Confidence hint text */}
                        {field.state !== "missing" && field.confidence < 50 && (
                          <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mb-1">
                            AI guesses — please validate
                          </p>
                        )}
                        {field.state !== "missing" &&
                          field.confidence >= 50 &&
                          field.confidence <= 80 && (
                            <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium mb-1">
                              AI suggests based on context
                            </p>
                          )}

                        {field.state !== "missing" && field.value !== null && (
                          <p className="text-muted-foreground text-xs mt-1 break-words">
                            {typeof field.value === "object"
                              ? JSON.stringify(field.value)
                              : Array.isArray(field.value)
                                ? (field.value as string[]).join(", ")
                                : String(field.value)}
                          </p>
                        )}
                        {field.sourceQuote && (
                          <p className="text-xs text-muted-foreground/70 mt-1 italic">
                            &ldquo;{field.sourceQuote}&rdquo;
                          </p>
                        )}
                        {field.reasoning && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {field.reasoning}
                          </p>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowExtractionDialog(false);
                    resetExtraction();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={handleApplyExtraction}
                >
                  <CheckCircle2 className="size-3.5" />
                  Apply Extracted Fields
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Reusable Field Components
// ═══════════════════════════════════════════════════════════════════

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 mt-4">
      {children}
    </div>
  );
}

// ─── Text Field ──────────────────────────────────────────────────

function FieldText({
  label,
  field,
  value,
  onChange,
  disabled,
  required,
  placeholder,
  aiState,
  onConfirm,
}: {
  label: string;
  field: string;
  value: string | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  aiState?: FieldState;
  onConfirm?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        <FieldStateIndicator fieldState={aiState} onConfirm={onConfirm} />
      </div>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
        className={cn(getConfidenceInputClass(aiState))}
      />
    </div>
  );
}

// ─── Number Field ────────────────────────────────────────────────

function FieldNumber({
  label,
  field,
  value,
  onChange,
  disabled,
  required,
}: {
  label: string;
  field: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const num = e.target.value ? Number(e.target.value) : undefined;
          onChange(num);
        }}
        disabled={disabled}
        placeholder="0"
      />
    </div>
  );
}

// ─── Textarea Field ──────────────────────────────────────────────

function FieldTextarea({
  label,
  field,
  value,
  onChange,
  disabled,
  required,
  placeholder,
  aiState,
  onConfirm,
}: {
  label: string;
  field: string;
  value: string | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  aiState?: FieldState;
  onConfirm?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        <FieldStateIndicator fieldState={aiState} onConfirm={onConfirm} />
      </div>
      <Textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
        rows={3}
        className={cn(getConfidenceInputClass(aiState))}
      />
    </div>
  );
}

// ─── Select Field ────────────────────────────────────────────────

function FieldSelect({
  label,
  field,
  value,
  onChange,
  options,
  disabled,
  required,
  aiState,
  onConfirm,
}: {
  label: string;
  field: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  required?: boolean;
  aiState?: FieldState;
  onConfirm?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        <FieldStateIndicator fieldState={aiState} onConfirm={onConfirm} />
      </div>
      <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn(getConfidenceInputClass(aiState))}>
          <SelectValue placeholder={`Select ${label.toLowerCase()}...`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Checkbox Field ──────────────────────────────────────────────

function FieldCheckbox({
  label,
  field,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  field: string;
  checked: boolean | undefined;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors h-fit self-end",
        checked
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border hover:bg-muted/50 text-muted-foreground",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input
        type="checkbox"
        checked={checked ?? false}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border"
      />
      {label}
    </label>
  );
}

// ─── Tag List Field ──────────────────────────────────────────────

function TagListField({
  label,
  field,
  value,
  onChange,
  disabled,
  required,
  placeholder,
}: {
  label: string;
  field: string;
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput("");
  };

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        <span className="text-xs text-muted-foreground ml-2">
          ({value.length})
        </span>
      </Label>

      {/* Tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(idx)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Add input */}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={placeholder ?? `Add ${label.toLowerCase()}...`}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTag}
            disabled={!input.trim()}
            className="gap-1"
          >
            <Plus className="size-3" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
