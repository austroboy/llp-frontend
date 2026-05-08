"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getBlueprintStatusLabel,
  getStatusBadgeClasses,
} from "@/lib/headhunting/status-labels";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  ShieldCheck,
  FileText,
  MapPin,
  Lock,
  MessageSquare,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────

type Revisions = {
  mustHaves?: string[];
  dealBreakers?: string[];
  criticalMatchPoints?: string[];
  targetSectors?: string[];
  searchGeography?: string;
  confidentialityLevel?: string;
  employerVisibleToScouts?: boolean;
  toleranceAreas?: string[];
  flaggedItemAnswers?: Record<string, string>;
};

// ─── Tag Chip Editor ────────────────────────────────────────────

function TagChipEditor({
  tags,
  onChange,
  placeholder,
  disabled,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-sm text-muted-foreground italic">None specified</span>
        )}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder ?? "Add item..."}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTag}
            disabled={!inputValue.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────

export default function ClientValidationPage() {
  const params = useParams();
  const token = params.token as string;

  const blueprint = useQuery(api.headhunting.blueprints.getByValidationToken, {
    token,
  });
  const submitValidation = useMutation(
    api.headhunting.blueprints.clientApproveValidation
  );

  // ── Local editable state ──
  const [mustHaves, setMustHaves] = useState<string[] | null>(null);
  const [dealBreakers, setDealBreakers] = useState<string[] | null>(null);
  const [criticalMatchPoints, setCriticalMatchPoints] = useState<string[] | null>(null);
  const [targetSectors, setTargetSectors] = useState<string[] | null>(null);
  const [searchGeography, setSearchGeography] = useState<string | null>(null);
  const [toleranceAreas, setToleranceAreas] = useState<string[] | null>(null);
  const [confidentialityLevel, setConfidentialityLevel] = useState<string | null>(null);
  const [employerVisibleToScouts, setEmployerVisibleToScouts] = useState<boolean | null>(null);
  const [generalNote, setGeneralNote] = useState("");
  const [flaggedAnswers, setFlaggedAnswers] = useState<Record<string, string>>({});

  // ── UI state ──
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<"approve" | "revise" | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // ── Derive whether any edits have been made ──
  const hasEdits = useCallback(() => {
    if (!blueprint) return false;
    if (mustHaves !== null) return true;
    if (dealBreakers !== null) return true;
    if (criticalMatchPoints !== null) return true;
    if (targetSectors !== null) return true;
    if (searchGeography !== null) return true;
    if (toleranceAreas !== null) return true;
    if (confidentialityLevel !== null) return true;
    if (employerVisibleToScouts !== null) return true;
    if (Object.keys(flaggedAnswers).length > 0) return true;
    return false;
  }, [
    blueprint,
    mustHaves,
    dealBreakers,
    criticalMatchPoints,
    targetSectors,
    searchGeography,
    toleranceAreas,
    confidentialityLevel,
    employerVisibleToScouts,
    flaggedAnswers,
  ]);

  // ── Build revisions payload ──
  const buildRevisions = (): Revisions | undefined => {
    if (!hasEdits()) return undefined;
    const revisions: Revisions = {};
    if (mustHaves !== null) revisions.mustHaves = mustHaves;
    if (dealBreakers !== null) revisions.dealBreakers = dealBreakers;
    if (criticalMatchPoints !== null) revisions.criticalMatchPoints = criticalMatchPoints;
    if (targetSectors !== null) revisions.targetSectors = targetSectors;
    if (searchGeography !== null) revisions.searchGeography = searchGeography;
    if (confidentialityLevel !== null) revisions.confidentialityLevel = confidentialityLevel;
    if (employerVisibleToScouts !== null) revisions.employerVisibleToScouts = employerVisibleToScouts;
    if (toleranceAreas !== null) revisions.toleranceAreas = toleranceAreas;
    if (Object.keys(flaggedAnswers).length > 0) revisions.flaggedItemAnswers = flaggedAnswers;
    return revisions;
  };

  // ── Submit handlers ──
  const handleApprove = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);
    try {
      await submitValidation({
        token,
        action: "approve",
        generalNote: generalNote.trim() || undefined,
      });
      setSubmitted("approve");
      toast.success("Blueprint approved successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit approval"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevise = async () => {
    setSubmitting(true);
    try {
      await submitValidation({
        token,
        action: "revise",
        revisions: buildRevisions(),
        generalNote: generalNote.trim() || undefined,
      });
      setSubmitted("revise");
      toast.success("Revisions submitted successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit revisions"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Extract flagged items from clientVisibleNotes ──
  const getFlaggedItems = (): string[] => {
    if (!blueprint) return [];
    const notes = (blueprint as Record<string, unknown>).clientVisibleNotes;
    if (!notes || typeof notes !== "string") return [];
    return notes
      .split("\n")
      .filter((line: string) => line.includes("?"))
      .map((line: string) => line.trim());
  };

  // ═══ Loading State ════════════════════════════════════════════
  if (blueprint === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-4 text-sm text-slate-500">Loading blueprint...</p>
        </div>
      </div>
    );
  }

  // ═══ Invalid / Expired Token ══════════════════════════════════
  if (blueprint === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-md px-6 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Invalid Validation Link
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            This validation link has expired or is invalid. Please contact LLP to
            request a new validation link.
          </p>
        </div>
      </div>
    );
  }

  // ═══ Already Finalized ════════════════════════════════════════
  if (blueprint.status !== "sent_to_client" && !submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-md px-6 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Blueprint Already Confirmed
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            This blueprint has already been confirmed. No further action is
            required.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Current status:{" "}
            <span className={getStatusBadgeClasses(blueprint.status)}>
              {getBlueprintStatusLabel(blueprint.status)}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ═══ Submission Success State ═════════════════════════════════
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-md px-6 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {submitted === "approve" ? "Thank You!" : "Feedback Submitted"}
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {submitted === "approve"
              ? "Your blueprint has been confirmed. LLP will proceed with the search."
              : "Your feedback has been sent to the LLP team for review. They will update the blueprint and may send a revised version for your review."}
          </p>
        </div>
      </div>
    );
  }

  // ═══ Active Validation State ══════════════════════════════════

  const bp = blueprint;
  const flaggedItems = getFlaggedItems();

  // Resolve display values (local edits override blueprint values)
  const displayMustHaves = mustHaves ?? bp.mustHaves ?? [];
  const displayDealBreakers = dealBreakers ?? bp.dealBreakers ?? [];
  const displayCriticalMatchPoints = criticalMatchPoints ?? bp.criticalMatchPoints ?? [];
  const displayTargetSectors = targetSectors ?? bp.targetSectors ?? [];
  const displaySearchGeography =
    searchGeography ?? (bp as Record<string, unknown>).searchGeography as string ?? bp.location ?? "";
  const displayConfidentiality = confidentialityLevel ?? bp.confidentialityLevel ?? "full_mask";
  const displayEmployerVisible =
    employerVisibleToScouts ?? ((bp as Record<string, unknown>).employerVisibleToScouts as boolean | undefined) ?? false;
  const displayToleranceAreas =
    toleranceAreas ?? ((bp as Record<string, unknown>).toleranceAreas as string[] | undefined) ?? [];

  const roleBandLabels: Record<string, string> = {
    entry_junior: "Entry / Junior Level",
    management_functional: "Management / Functional Level",
    executive_clevel: "Executive / C-Level",
  };

  const confidentialityLabels: Record<string, string> = {
    full_mask: "Confidential",
    partial_clue: "Standard",
    disclosed: "Open",
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
              <span className="text-sm font-bold text-white dark:text-slate-900">
                LLP
              </span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white">
                Role Blueprint Validation
              </h1>
              <p className="text-xs text-slate-500">Labor Law Partner</p>
            </div>
          </div>
          <span className={getStatusBadgeClasses(bp.status)}>
            {getBlueprintStatusLabel(bp.status)}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* ── Blueprint Summary Card ───────────────────────────── */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900 dark:text-white">
              {bp.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Function
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {(bp as Record<string, unknown>).function as string || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Role Band
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {bp.roleBand ? roleBandLabels[bp.roleBand] ?? bp.roleBand : "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Location
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {bp.location || "Not specified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Role Summary (Read-only) ─────────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Role Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {typeof (bp as Record<string, unknown>).whyRoleExists === "string" && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                    Why This Role Exists
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {String((bp as Record<string, unknown>).whyRoleExists)}
                  </p>
                </div>
              )}
              {typeof (bp as Record<string, unknown>).businessContext === "string" && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                    Business Context
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {String((bp as Record<string, unknown>).businessContext)}
                  </p>
                </div>
              )}
              {!(bp as Record<string, unknown>).whyRoleExists &&
                !(bp as Record<string, unknown>).businessContext && (
                  <p className="text-sm text-slate-400 italic">
                    No role summary provided.
                  </p>
                )}
            </div>
          </CardContent>
        </Card>

        {/* ── Key Requirements (Editable) ──────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Key Requirements</CardTitle>
            </div>
            <p className="text-xs text-slate-500">
              You can add or remove items. Changes will be sent as revision
              requests.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Must-Haves
              </label>
              <TagChipEditor
                tags={displayMustHaves}
                onChange={(tags) => setMustHaves(tags)}
                placeholder="Add a must-have requirement..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Deal Breakers
              </label>
              <TagChipEditor
                tags={displayDealBreakers}
                onChange={(tags) => setDealBreakers(tags)}
                placeholder="Add a deal breaker..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Critical Match Points
              </label>
              <TagChipEditor
                tags={displayCriticalMatchPoints}
                onChange={(tags) => setCriticalMatchPoints(tags)}
                placeholder="Add a critical match point..."
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Search Direction (Editable) ──────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Search Direction</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Target Sectors
              </label>
              <TagChipEditor
                tags={displayTargetSectors}
                onChange={(tags) => setTargetSectors(tags)}
                placeholder="Add a target sector..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Search Geography
              </label>
              <Input
                value={displaySearchGeography}
                onChange={(e) => setSearchGeography(e.target.value)}
                placeholder="e.g., Bangladesh, South Asia"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tolerance Areas
              </label>
              <TagChipEditor
                tags={displayToleranceAreas}
                onChange={(tags) => setToleranceAreas(tags)}
                placeholder="Add a tolerance area..."
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Confidentiality (Editable) ───────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Confidentiality</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confidentiality Level
              </label>
              <Select
                value={displayConfidentiality}
                onValueChange={(val) => setConfidentialityLevel(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disclosed">Open</SelectItem>
                  <SelectItem value="partial_clue">Standard</SelectItem>
                  <SelectItem value="full_mask">Confidential</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-slate-500">
                {displayConfidentiality === "disclosed" &&
                  "Employer name will be visible to scouts."}
                {displayConfidentiality === "partial_clue" &&
                  "Employer description shared, name withheld until shortlist."}
                {displayConfidentiality === "full_mask" &&
                  "Full confidentiality. Employer details disclosed only to shortlisted candidates."}
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Employer Visible to Scouts?
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setEmployerVisibleToScouts(true)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    displayEmployerVisible
                      ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setEmployerVisibleToScouts(false)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    !displayEmployerVisible
                      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Flagged Items (if any) ───────────────────────────── */}
        {flaggedItems.length > 0 && (
          <Card className="mb-6 border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <CardTitle className="text-base text-yellow-800 dark:text-yellow-300">
                  Items Requiring Your Input
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {flaggedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/10"
                >
                  <p className="mb-2 text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    {item}
                  </p>
                  <Input
                    value={flaggedAnswers[`flag_${idx}`] ?? ""}
                    onChange={(e) =>
                      setFlaggedAnswers((prev) => ({
                        ...prev,
                        [`flag_${idx}`]: e.target.value,
                      }))
                    }
                    placeholder="Your response..."
                    className="border-yellow-300 dark:border-yellow-700"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── General Note ─────────────────────────────────────── */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">General Note to LLP</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={generalNote}
              onChange={(e) => setGeneralNote(e.target.value)}
              placeholder="Any additional comments or notes for the LLP team..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* ── Action Buttons ───────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="lg"
            onClick={handleRevise}
            disabled={submitting || !hasEdits()}
            className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Submit Revisions
          </Button>
          <Button
            size="lg"
            onClick={() => setShowConfirmDialog(true)}
            disabled={submitting}
            className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Approve All as Proposed
          </Button>
        </div>

        {/* ── Confirmation Dialog ──────────────────────────────── */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Blueprint Approval</DialogTitle>
              <DialogDescription>
                By approving, you confirm that the role blueprint for{" "}
                <strong>{bp.title}</strong> is accurate and LLP may proceed with
                the candidate search. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={submitting}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm Approval
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-slate-400 sm:px-6">
          <p>
            Labor Law Partner — Confidential. This document is for your review
            only.
          </p>
        </div>
      </footer>
    </div>
  );
}
