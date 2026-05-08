"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getBlueprintStatusLabel,
  getStatusBadgeClasses,
} from "@/lib/headhunting/status-labels";
import { RoutingWeightTuner } from "@/components/headhunting/routing-weight-tuner";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Users,
  CheckCircle,
  AlertTriangle,
  Eye,
  Pencil,
  RotateCcw,
  Send,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  BarChart3,
  Ban,
  Sliders,
  History,
  Lock,
  Shield,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, MotionConfig, type Variants } from "framer-motion";

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

// ─── Brief Status Helpers ───────────────────────────────────────

const BRIEF_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  approved: "Approved",
  released: "Released",
  recalled: "Recalled",
};

const BRIEF_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  released:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  recalled:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

function BriefStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        BRIEF_STATUS_COLORS[status] ?? BRIEF_STATUS_COLORS.draft
      )}
    >
      {BRIEF_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Page Wrapper ───────────────────────────────────────────────

export default function BriefPreviewPage() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        }
      >
        <BriefPreviewContent />
      </Suspense>
    </MotionConfig>
  );
}

// ─── Main Content ───────────────────────────────────────────────

function BriefPreviewContent() {
  const params = useParams();
  const router = useRouter();
  const blueprintId = params.id as Id<"htRoleBlueprints">;

  // ── Queries ──
  const blueprint = useQuery(api.headhunting.blueprints.getById, {
    id: blueprintId,
  });
  const brief = useQuery(api.headhunting.briefs.getLatestByBlueprint, {
    blueprintId,
  });
  const approvedScouts = useQuery(api.headhunting.scoutProfiles.list, {
    status: "approved",
  });
  const routingScores = useQuery(api.headhunting.routing.getEligibleScouts, {
    blueprintId,
  });
  const scoutGroups = useQuery(api.headhunting.scoutGroups.list);

  // ── Mutations ──
  const generateBrief = useMutation(api.headhunting.briefs.generate);
  const approveBrief = useMutation(api.headhunting.briefs.approve);
  const releaseBrief = useMutation(api.headhunting.briefs.release);
  const recallBrief = useMutation(api.headhunting.briefs.recall);
  const updateBrief = useMutation(api.headhunting.briefs.update);
  const selectScouts = useMutation(api.headhunting.blueprints.selectScouts);
  const transitionStatus = useMutation(
    api.headhunting.blueprints.transitionStatus
  );
  const setReleaseApproval = useMutation(
    api.headhunting.blueprints.setReleaseApproval
  );

  // ── Local state ──
  const [selectedScoutIds, setSelectedScoutIds] = useState<Set<string>>(
    new Set()
  );
  const [attestVisibility, setAttestVisibility] = useState(false);
  const [attestConflicts, setAttestConflicts] = useState(false);
  const [attestExecutiveApproval, setAttestExecutiveApproval] = useState(false);
  const [executiveApproverName, setExecutiveApproverName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [recalling, setRecalling] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [showWeightTuner, setShowWeightTuner] = useState(false);
  const [releaseMode, setReleaseMode] = useState<"standard" | "restricted">(
    "standard"
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string>("");
  const [executiveApprovalStep, setExecutiveApprovalStep] = useState<
    "none" | "pending" | "approved"
  >("none");
  const [executiveApproverRole, setExecutiveApproverRole] = useState("");

  // Brief edit state
  const [editRoleTitle, setEditRoleTitle] = useState("");
  const [editFunctionAndLevel, setEditFunctionAndLevel] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editMaskDescription, setEditMaskDescription] = useState("");
  const [editRoleSummaryNarrative, setEditRoleSummaryNarrative] = useState("");
  const [editCriticalMatchLogic, setEditCriticalMatchLogic] = useState("");
  const [editDealBreakerLogic, setEditDealBreakerLogic] = useState("");
  const [editTargetSectorGuidance, setEditTargetSectorGuidance] = useState("");
  const [editSubmissionGuidance, setEditSubmissionGuidance] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Sync blueprint's selectedScoutIds on load
  useEffect(() => {
    if (blueprint?.selectedScoutIds) {
      setSelectedScoutIds(new Set(blueprint.selectedScoutIds));
    }
  }, [blueprint?.selectedScoutIds]);

  // Sync executive approval status from blueprint
  useEffect(() => {
    if (blueprint?.releaseApprovedBy && blueprint?.releaseApprovedAt) {
      setExecutiveApprovalStep("approved");
      setExecutiveApproverName(blueprint.releaseApprovedBy);
    } else if (blueprint?.releaseApprovedBy && !blueprint?.releaseApprovedAt) {
      setExecutiveApprovalStep("pending");
      setExecutiveApproverName(blueprint.releaseApprovedBy);
    }
  }, [blueprint?.releaseApprovedBy, blueprint?.releaseApprovedAt]);

  // ── Derived group data ──
  // The list API returns top-level groups with nested subgroups and memberCount
  type GroupListItem = {
    _id: string;
    name: string;
    memberCount: number;
    isInvitationOnly?: boolean;
    subgroups: { _id: string; name: string; memberCount: number; isInvitationOnly?: boolean }[];
  };

  const topLevelGroups = useMemo(() => {
    if (!scoutGroups) return [] as GroupListItem[];
    return scoutGroups as GroupListItem[];
  }, [scoutGroups]);

  const subgroupsForSelected = useMemo(() => {
    if (!selectedGroupId) return [];
    const parent = topLevelGroups.find((g) => g._id === selectedGroupId);
    return parent?.subgroups ?? [];
  }, [topLevelGroups, selectedGroupId]);

  // We need the detail query to get actual member clerk IDs for group selection
  const selectedGroupDetail = useQuery(
    api.headhunting.scoutGroups.getById,
    (selectedSubgroupId || selectedGroupId)
      ? { id: (selectedSubgroupId || selectedGroupId) as Id<"htScoutGroups"> }
      : "skip"
  );

  const selectedGroupMembers = useMemo(() => {
    if (!selectedGroupDetail) return [] as string[];
    const detail = selectedGroupDetail as { memberClerkIds?: string[] } | null;
    return detail?.memberClerkIds ?? [];
  }, [selectedGroupDetail]);

  // ── Filtered scouts for restricted mode ──
  const filteredApprovedScouts = useMemo(() => {
    if (!approvedScouts) return [];
    if (releaseMode === "restricted") {
      return approvedScouts.filter((s) => {
        const suitability = (s as { confidentialitySuitability?: string }).confidentialitySuitability;
        return suitability === "high_discretion" || suitability === "executive_confidential";
      });
    }
    return approvedScouts;
  }, [approvedScouts, releaseMode]);

  // ── Group selection handlers ──
  const handleSelectGroupMembers = () => {
    if (!approvedScouts || selectedGroupMembers.length === 0) return;
    const scoutDocIdsByClerk = new Map(
      approvedScouts.map((s) => [s.clerkId, s._id])
    );
    setSelectedScoutIds((prev) => {
      const next = new Set(prev);
      for (const clerkId of selectedGroupMembers) {
        const docId = scoutDocIdsByClerk.get(clerkId);
        if (docId) next.add(docId);
      }
      return next;
    });
    toast.success(`Selected ${selectedGroupMembers.length} scout(s) from group`);
  };

  // ── Executive approval request handler ──
  const handleRequestApproval = async () => {
    if (!executiveApproverName.trim() || !executiveApproverRole.trim()) {
      toast.error("Please enter approver name and role");
      return;
    }
    try {
      await setReleaseApproval({
        id: blueprintId,
        approvedBy: executiveApproverName.trim(),
      });
      setExecutiveApprovalStep("pending");
      toast.success(`Approval requested from ${executiveApproverName.trim()}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to request approval"
      );
    }
  };

  const handleConfirmApproval = async () => {
    try {
      await setReleaseApproval({
        id: blueprintId,
        approvedBy: executiveApproverName.trim(),
      });
      setExecutiveApprovalStep("approved");
      toast.success("Executive release approved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to confirm approval"
      );
    }
  };

  // Sync brief fields into edit state when brief loads or changes
  useEffect(() => {
    if (brief) {
      setEditRoleTitle(brief.roleTitle ?? "");
      setEditFunctionAndLevel(brief.functionAndLevel ?? "");
      setEditLocation(brief.location ?? "");
      setEditMaskDescription(brief.maskDescription ?? "");
      setEditRoleSummaryNarrative(
        (brief as Record<string, unknown>).roleSummaryNarrative as string ?? ""
      );
      setEditCriticalMatchLogic(brief.criticalMatchLogic ?? "");
      setEditDealBreakerLogic(brief.dealBreakerLogic ?? "");
      setEditTargetSectorGuidance(brief.targetSectorGuidance ?? "");
      setEditSubmissionGuidance(brief.submissionGuidance ?? "");
    }
  }, [brief]);

  // ── Handlers ──

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateBrief({ blueprintId });
      toast.success("Brief generated successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate brief"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveBrief = async () => {
    if (!brief) return;
    setApproving(true);
    try {
      await approveBrief({ id: brief._id });
      toast.success("Brief approved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve brief"
      );
    } finally {
      setApproving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!brief) return;
    setSavingEdit(true);
    try {
      await updateBrief({
        id: brief._id,
        roleTitle: editRoleTitle || undefined,
        functionAndLevel: editFunctionAndLevel || undefined,
        location: editLocation || undefined,
        maskDescription: editMaskDescription || undefined,
        roleSummaryNarrative: editRoleSummaryNarrative || undefined,
        criticalMatchLogic: editCriticalMatchLogic || undefined,
        dealBreakerLogic: editDealBreakerLogic || undefined,
        targetSectorGuidance: editTargetSectorGuidance || undefined,
        submissionGuidance: editSubmissionGuidance || undefined,
      });
      setIsEditing(false);
      toast.success("Brief updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update brief"
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRelease = async () => {
    if (!brief || !blueprint) return;
    setReleasing(true);
    try {
      const scoutIdArray = Array.from(selectedScoutIds);

      // 1. Select scouts on the blueprint
      await selectScouts({ id: blueprintId, scoutIds: scoutIdArray });

      // 2. Set executive approval if needed
      if (
        blueprint.roleBand === "executive_clevel" &&
        executiveApproverName.trim()
      ) {
        await setReleaseApproval({
          id: blueprintId,
          approvedBy: executiveApproverName.trim(),
        });
      }

      // 3. Transition blueprint: brief_generated -> release_ready
      if (blueprint.status === "brief_generated") {
        await transitionStatus({
          id: blueprintId,
          targetStatus: "release_ready",
          reason: "Scouts selected, preparing for release",
        });
      }

      // 4. Transition blueprint: release_ready -> released_to_scouts
      await transitionStatus({
        id: blueprintId,
        targetStatus: "released_to_scouts",
        reason: `Released to ${scoutIdArray.length} scout(s)`,
      });

      // 5. Release the brief
      await releaseBrief({
        id: brief._id,
        releasedBy: "admin",
      });

      setShowReleaseDialog(false);
      toast.success(`Brief released to ${scoutIdArray.length} scout(s)`);

      // 6. Notify scouts (non-blocking)
      // Resolve scout emails from the approved scouts list
      if (approvedScouts && brief.roleTitle) {
        const selectedScoutProfiles = approvedScouts.filter((s) =>
          scoutIdArray.includes(s._id)
        );
        const scoutsToNotify = selectedScoutProfiles
          .filter((s) => s.email)
          .map((s) => ({ email: s.email!, name: s.fullName }));

        if (scoutsToNotify.length > 0) {
          fetch("/api/blueprint/notify-scouts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              briefId: brief._id,
              roleTitle: brief.roleTitle,
              scouts: scoutsToNotify,
            }),
          })
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                toast.success(`Notification emails sent to ${data.sent} scout(s)`);
              }
            })
            .catch(() => {
              // Non-critical — scout can still see the brief in-app
              console.error("[brief-release] Scout notification emails failed");
            });
        }
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to release brief"
      );
    } finally {
      setReleasing(false);
    }
  };

  const handleRecall = async () => {
    if (!brief) return;
    setRecalling(true);
    try {
      await recallBrief({ id: brief._id });
      toast.success("Brief recalled");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to recall brief"
      );
    } finally {
      setRecalling(false);
    }
  };

  const toggleScout = (scoutId: string) => {
    setSelectedScoutIds((prev) => {
      const next = new Set(prev);
      if (next.has(scoutId)) next.delete(scoutId);
      else next.add(scoutId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredApprovedScouts || filteredApprovedScouts.length === 0) return;
    if (selectedScoutIds.size === filteredApprovedScouts.length) {
      setSelectedScoutIds(new Set());
    } else {
      setSelectedScoutIds(new Set(filteredApprovedScouts.map((s) => s._id)));
    }
  };

  // ── Derived state ──

  // Build a map of scout doc ID -> clerkId for conflict checking
  const selectedScoutClerkIds: string[] = approvedScouts
    ? approvedScouts
        .filter((s) => selectedScoutIds.has(s._id))
        .map((s) => s.clerkId)
    : [];

  // Conflict check for selected scouts (always runs, may return empty results)
  const conflictCheck = useQuery(
    api.headhunting.conflicts.checkScoutsForBlueprint,
    selectedScoutClerkIds.length > 0
      ? { blueprintId, scoutClerkIds: selectedScoutClerkIds }
      : "skip"
  );

  // Build lookup maps for routing scores and conflicts
  const routingScoreMap = new Map<string, { score: number; eligible: boolean; conflictStatus?: string; filterReason?: string; breakdown: { dimension: string; score: number }[] }>();
  if (routingScores?.scouts) {
    for (const s of routingScores.scouts) {
      routingScoreMap.set(s.scoutClerkId, s);
    }
  }

  const conflictStatusMap = new Map<string, { status: "clear" | "blocked"; conflictType?: string; reason?: string }>();
  if (conflictCheck?.results) {
    for (const r of conflictCheck.results) {
      conflictStatusMap.set(r.scoutClerkId, r);
    }
  }

  // Count blocked scouts
  const blockedScoutClerkIds = new Set(
    conflictCheck?.results
      ?.filter((r) => r.status === "blocked")
      .map((r) => r.scoutClerkId) ?? []
  );

  // Map blocked clerk IDs back to doc IDs for checkbox disabling
  const blockedScoutDocIds = new Set(
    approvedScouts
      ?.filter((s) => blockedScoutClerkIds.has(s.clerkId))
      .map((s) => s._id) ?? []
  );

  const clearScoutCount = selectedScoutClerkIds.length - blockedScoutClerkIds.size;

  const isExecutive = blueprint?.roleBand === "executive_clevel";
  const canRelease =
    brief?.status === "approved" &&
    selectedScoutIds.size > 0 &&
    clearScoutCount > 0 &&
    attestVisibility &&
    attestConflicts &&
    (!isExecutive || (attestExecutiveApproval && executiveApproverName.trim()));

  // ═══ Loading State ════════════════════════════════════════════
  if (blueprint === undefined || brief === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (blueprint === null) {
    return (
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-4xl"
        style={{ padding: "var(--s-6) 16px", textAlign: "center" }}
      >
        <motion.div variants={fadeUp}>
          <AlertTriangle
            size={40}
            style={{ margin: "0 auto", color: "var(--rust)" }}
          />
        </motion.div>
        <motion.h2
          variants={fadeUp}
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: 28,
            fontWeight: 400,
            color: "var(--ink)",
            margin: "var(--s-3) 0 var(--s-2)",
          }}
        >
          Blueprint <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>not found.</em>
        </motion.h2>
        <motion.p variants={fadeUp} className="lf-section-deck">
          The blueprint you are looking for does not exist.
        </motion.p>
        <motion.div variants={fadeUp} style={{ marginTop: "var(--s-4)" }}>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/headhunting")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Headhunting
          </Button>
        </motion.div>
      </motion.section>
    );
  }

  // ═══ Released State ═══════════════════════════════════════════
  const isReleased = brief?.status === "released";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* -- Hero ------------------------------------------------ */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-5)" }}
      >
        <motion.div variants={fadeUp} style={{ marginBottom: "var(--s-3)" }}>
          <button
            onClick={() => router.back()}
            className="lf-meta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--ink-3)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textTransform: "uppercase",
              padding: 0,
            }}
          >
            <ArrowLeft size={12} />
            Back to Blueprint
          </button>
        </motion.div>

        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ V</span>
          Admin · Headhunting · Scout Brief
        </motion.div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "var(--s-4)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <motion.h1
              variants={fadeUp}
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: "clamp(32px, 4.6vw, 48px)",
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                margin: "var(--s-3) 0 var(--s-2)",
              }}
            >
              Brief for{" "}
              <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
                {blueprint.title}.
              </em>
            </motion.h1>
            <motion.div
              variants={fadeUp}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--s-2)",
                flexWrap: "wrap",
              }}
            >
              <span className={getStatusBadgeClasses(blueprint.status)}>
                {getBlueprintStatusLabel(blueprint.status)}
              </span>
              {brief && <BriefStatusBadge status={brief.status} />}
            </motion.div>
          </div>
          <motion.div variants={fadeUp}>
            <Link
              href={`/admin/headhunting/blueprints/${blueprintId}/audit`}
              className="lf-cta lf-cta--ghost"
            >
              <History size={14} style={{ marginRight: 8 }} />
              View Audit Trail &rarr;
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ═══ Two-Panel Layout ════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left: Brief Preview / Editor ─────────────────────── */}
        <div className="lg:col-span-2">
          {!brief ? (
            /* ── No Brief Yet ── */
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  No Brief Generated Yet
                </h3>
                <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
                  Generate a scout brief from the finalized blueprint. The brief
                  will be formatted for scouts to review.
                </p>
                <Button
                  className="mt-6"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Brief
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* ── Brief Exists ── */
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">
                    Scout Brief v{brief.version}
                  </CardTitle>
                  <BriefStatusBadge status={brief.status} />
                </div>
                <div className="flex items-center gap-2">
                  {brief.status === "draft" && !isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                  {brief.status === "draft" && isEditing && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={savingEdit}
                      >
                        {savingEdit && (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        )}
                        Save
                      </Button>
                    </>
                  )}
                  {brief.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={handleApproveBrief}
                      disabled={approving || isEditing}
                      className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                    >
                      {approving && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      Approve Brief
                    </Button>
                  )}
                  {brief.status === "released" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRecall}
                      disabled={recalling}
                      className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400"
                    >
                      {recalling && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Recall Brief
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* ── Released Banner ── */}
                {isReleased && brief.releasedAt && (
                  <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/10">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Brief released
                        {blueprint.selectedScoutIds
                          ? ` to ${blueprint.selectedScoutIds.length} scout(s)`
                          : ""}{" "}
                        on{" "}
                        {new Date(brief.releasedAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                    {blueprint.selectedScoutIds &&
                      blueprint.selectedScoutIds.length > 0 &&
                      approvedScouts && (
                        <div className="mt-3">
                          <p className="mb-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                            Released to:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {blueprint.selectedScoutIds.map((sid) => {
                              const scout = approvedScouts.find(
                                (s) => s._id === sid
                              );
                              return (
                                <Badge
                                  key={sid}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {scout?.fullName ?? sid}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* ── Brief Content (Preview or Edit) ── */}
                <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                  {/* Title / Location */}
                  {isEditing ? (
                    <div className="space-y-3 mb-6">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Role Title
                        </label>
                        <Input
                          value={editRoleTitle}
                          onChange={(e) => setEditRoleTitle(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Function &amp; Level
                          </label>
                          <Input
                            value={editFunctionAndLevel}
                            onChange={(e) =>
                              setEditFunctionAndLevel(e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Location
                          </label>
                          <Input
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Employer Description (masked)
                        </label>
                        <Input
                          value={editMaskDescription}
                          onChange={(e) =>
                            setEditMaskDescription(e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold text-foreground">
                        {brief.roleTitle} &mdash; {brief.location}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Function: {brief.functionAndLevel}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Employer:{" "}
                        {brief.employerDisplay === "named"
                          ? ((brief as Record<string, unknown>).employerName as string || "Named Employer")
                          : (brief.maskDescription ??
                            "Confidential")}
                      </p>
                    </div>
                  )}

                  {/* Role Overview */}
                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold text-foreground uppercase tracking-wide">
                      Role Overview
                    </h3>
                    {isEditing ? (
                      <Textarea
                        value={editRoleSummaryNarrative}
                        onChange={(e) =>
                          setEditRoleSummaryNarrative(e.target.value)
                        }
                        rows={4}
                        placeholder="Describe the role overview..."
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {(brief as Record<string, unknown>)
                          .roleSummaryNarrative as string ||
                          brief.challengeSummary ||
                          "No overview provided."}
                      </p>
                    )}
                  </div>

                  {/* Key Requirements */}
                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold text-foreground uppercase tracking-wide">
                      Key Requirements
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Must-Haves
                        </p>
                        {brief.mustHaves && brief.mustHaves.length > 0 ? (
                          <ul className="list-disc pl-5 space-y-0.5">
                            {brief.mustHaves.map((item, i) => (
                              <li
                                key={i}
                                className="text-sm text-muted-foreground"
                              >
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground/60 italic">
                            None specified
                          </p>
                        )}
                      </div>
                      {(brief.dealBreakerLogic || isEditing) && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Deal Breakers
                          </p>
                          {isEditing ? (
                            <Textarea
                              value={editDealBreakerLogic}
                              onChange={(e) =>
                                setEditDealBreakerLogic(e.target.value)
                              }
                              rows={2}
                              placeholder="Deal breakers..."
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {brief.dealBreakerLogic}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Critical Match Logic */}
                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold text-foreground uppercase tracking-wide">
                      What We&apos;re Looking For
                    </h3>
                    {isEditing ? (
                      <Textarea
                        value={editCriticalMatchLogic}
                        onChange={(e) =>
                          setEditCriticalMatchLogic(e.target.value)
                        }
                        rows={3}
                        placeholder="Critical match criteria..."
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {brief.criticalMatchLogic}
                      </p>
                    )}
                  </div>

                  {/* Target Sector Guidance */}
                  {(brief.targetSectorGuidance || isEditing) && (
                    <div className="mb-5">
                      <h3 className="mb-2 text-sm font-semibold text-foreground uppercase tracking-wide">
                        Target Profile Direction
                      </h3>
                      {isEditing ? (
                        <Textarea
                          value={editTargetSectorGuidance}
                          onChange={(e) =>
                            setEditTargetSectorGuidance(e.target.value)
                          }
                          rows={2}
                          placeholder="Target sectors and backgrounds..."
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {brief.targetSectorGuidance}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Submission Guidance */}
                  {(brief.submissionGuidance || isEditing) && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-foreground uppercase tracking-wide">
                        Submission
                      </h3>
                      {isEditing ? (
                        <Textarea
                          value={editSubmissionGuidance}
                          onChange={(e) =>
                            setEditSubmissionGuidance(e.target.value)
                          }
                          rows={2}
                          placeholder="Submission deadline, format..."
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {brief.submissionGuidance}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Scout Selection & Release Controls ─────────── */}
        <div className="space-y-6">
          {/* ── Release Mode Toggle ── */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <label
                  className={cn(
                    "flex flex-1 items-center gap-2 cursor-pointer rounded-lg border p-3 transition-colors",
                    releaseMode === "standard"
                      ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/10"
                      : "border-transparent hover:bg-muted/50"
                  )}
                >
                  <input
                    type="radio"
                    name="releaseMode"
                    value="standard"
                    checked={releaseMode === "standard"}
                    onChange={() => setReleaseMode("standard")}
                    className="h-3.5 w-3.5 text-blue-600"
                  />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Standard Release
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Full brief to all selected scouts
                    </p>
                  </div>
                </label>
                <label
                  className={cn(
                    "flex flex-1 items-center gap-2 cursor-pointer rounded-lg border p-3 transition-colors",
                    releaseMode === "restricted"
                      ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/10"
                      : "border-transparent hover:bg-muted/50"
                  )}
                >
                  <input
                    type="radio"
                    name="releaseMode"
                    value="restricted"
                    checked={releaseMode === "restricted"}
                    onChange={() => setReleaseMode("restricted")}
                    className="h-3.5 w-3.5 text-amber-600"
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <Lock className="size-3 text-amber-600 dark:text-amber-400" />
                      <p className="text-xs font-medium text-foreground">
                        Restricted Release
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Minimal brief, high-trust scouts only
                    </p>
                  </div>
                </label>
              </div>
              {releaseMode === "restricted" && (
                <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Shield className="size-3" />
                  Only scouts with &ldquo;High Discretion&rdquo; or higher
                  confidentiality suitability are shown below.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Group-based Selection ── */}
          {topLevelGroups.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Select by Group</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={selectedGroupId}
                  onValueChange={(val) => {
                    setSelectedGroupId(val);
                    setSelectedSubgroupId("");
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select a scout group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {topLevelGroups.map((g) => (
                      <SelectItem key={g._id} value={g._id}>
                        <span className="flex items-center gap-1.5">
                          {g.name}
                          <span className="text-muted-foreground">
                            ({g.memberCount})
                          </span>
                          {g.isInvitationOnly && (
                            <Lock className="size-2.5 text-amber-500" />
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedGroupId && subgroupsForSelected.length > 0 && (
                  <Select
                    value={selectedSubgroupId}
                    onValueChange={setSelectedSubgroupId}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Narrow to subgroup (optional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All members</SelectItem>
                      {subgroupsForSelected.map((g) => (
                        <SelectItem key={g._id} value={g._id}>
                          {g.name} ({g.memberCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedGroupId && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedGroupId && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] gap-1"
                        >
                          <UsersRound className="size-2.5" />
                          {selectedGroupMembers.length} member
                          {selectedGroupMembers.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={handleSelectGroupMembers}
                      disabled={selectedGroupMembers.length === 0}
                    >
                      <Users className="size-3" />
                      Select All in Group
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Scout Selection Panel ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">
                    Select Scouts for Release
                  </CardTitle>
                </div>
              </div>
              {filteredApprovedScouts && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    {selectedScoutIds.size} of {filteredApprovedScouts.length} scouts
                    selected
                    {releaseMode === "restricted" && approvedScouts && filteredApprovedScouts.length < approvedScouts.length && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {" "}(filtered for high-trust)
                      </span>
                    )}
                  </p>
                  {selectedScoutClerkIds.length > 0 && conflictCheck && (
                    <p className="text-xs">
                      <span className="text-green-600 dark:text-green-400">
                        {clearScoutCount} clear
                      </span>
                      {blockedScoutClerkIds.size > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          {", "}{blockedScoutClerkIds.size} blocked by conflicts
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {filteredApprovedScouts === undefined || approvedScouts === undefined ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredApprovedScouts.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {releaseMode === "restricted"
                    ? "No high-trust scouts available. Switch to Standard Release to see all scouts."
                    : "No approved scouts available."}
                </p>
              ) : (
                <div className="space-y-1">
                  {/* Select All / Deselect All */}
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="mb-2 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {selectedScoutIds.size === filteredApprovedScouts.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>

                  <div className="max-h-80 overflow-y-auto space-y-1">
                    {filteredApprovedScouts.map((scout) => {
                      const isSelected = selectedScoutIds.has(scout._id);
                      const isBlocked = blockedScoutDocIds.has(scout._id);
                      const conflictInfo = conflictStatusMap.get(scout.clerkId);
                      const routingInfo = routingScoreMap.get(scout.clerkId);
                      const routingScore = routingInfo?.score;
                      const isEligible = routingInfo?.eligible ?? true;

                      return (
                        <label
                          key={scout._id}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                            isBlocked
                              ? "cursor-not-allowed border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-900/10 opacity-70"
                              : "cursor-pointer",
                            !isBlocked && isSelected
                              ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/10"
                              : !isBlocked
                                ? "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                : ""
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected && !isBlocked}
                            onChange={() => !isBlocked && toggleScout(scout._id)}
                            disabled={isBlocked}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">
                                {scout.fullName}
                              </p>
                              {/* Routing Score */}
                              {routingScore !== undefined && isEligible && (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                    routingScore >= 70
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : routingScore >= 40
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                  )}
                                  title={
                                    routingInfo?.breakdown
                                      .map((b) => `${b.dimension}: ${b.score}`)
                                      .join(", ") ?? ""
                                  }
                                >
                                  <BarChart3 className="h-2.5 w-2.5" />
                                  {routingScore}
                                </span>
                              )}
                              {/* Not eligible badge */}
                              {routingInfo && !isEligible && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                                  title={routingInfo.filterReason ?? "Not eligible"}
                                >
                                  <Ban className="h-2.5 w-2.5" />
                                  Ineligible
                                </span>
                              )}
                              {/* Conflict status indicator */}
                              {conflictInfo?.status === "blocked" && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  title={conflictInfo.reason}
                                >
                                  <ShieldAlert className="h-2.5 w-2.5" />
                                  Blocked
                                </span>
                              )}
                              {conflictInfo?.status === "clear" && isSelected && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle className="h-2.5 w-2.5" />
                                  Clear
                                </span>
                              )}
                            </div>
                            {scout.currentTitle && (
                              <p className="text-xs text-muted-foreground truncate">
                                {scout.currentTitle}
                                {scout.currentCompany
                                  ? ` at ${scout.currentCompany}`
                                  : ""}
                              </p>
                            )}
                            {/* Conflict reason text */}
                            {conflictInfo?.status === "blocked" && conflictInfo.reason && (
                              <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400">
                                {conflictInfo.reason}
                              </p>
                            )}
                            {scout.functionPrimary &&
                              scout.functionPrimary.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {scout.functionPrimary
                                    .slice(0, 3)
                                    .map((fn, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                      >
                                        {fn}
                                      </span>
                                    ))}
                                  {scout.functionPrimary.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{scout.functionPrimary.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Routing Weight Tuning ── */}
          <Button
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => setShowWeightTuner(true)}
          >
            <Sliders className="size-4" />
            Tune Routing Weights
          </Button>

          {/* ── Release Controls ── */}
          {brief && brief.status !== "released" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Release Controls</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Attestation Checklist */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attestVisibility}
                      onChange={(e) => setAttestVisibility(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-foreground">
                      I confirm visibility settings are appropriate for this
                      release
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attestConflicts}
                      onChange={(e) => setAttestConflicts(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-foreground">
                      I confirm no known conflicts exist with selected scouts
                    </span>
                  </label>

                  {/* ── Two-Step Executive Approval (exec roles only) ── */}
                  {isExecutive && (
                    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/30 p-3 dark:border-amber-800 dark:bg-amber-950/10">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          Executive Release Approval Required
                        </p>
                      </div>

                      {executiveApprovalStep === "none" && (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Executive-level blueprints require two-step approval before release.
                          </p>
                          <div className="space-y-2">
                            <Input
                              value={executiveApproverName}
                              onChange={(e) =>
                                setExecutiveApproverName(e.target.value)
                              }
                              placeholder="Approver name..."
                              className="h-8 text-xs"
                            />
                            <Input
                              value={executiveApproverRole}
                              onChange={(e) =>
                                setExecutiveApproverRole(e.target.value)
                              }
                              placeholder="Approver role (e.g. Managing Partner)..."
                              className="h-8 text-xs"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs gap-1"
                              onClick={handleRequestApproval}
                              disabled={
                                !executiveApproverName.trim() ||
                                !executiveApproverRole.trim()
                              }
                            >
                              <Send className="size-3" />
                              Step 1: Request Release Approval
                            </Button>
                          </div>
                        </>
                      )}

                      {executiveApprovalStep === "pending" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 rounded-md bg-yellow-100 px-2.5 py-1.5 dark:bg-yellow-900/20">
                            <Loader2 className="size-3.5 animate-spin text-yellow-600 dark:text-yellow-400" />
                            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                              Pending Approval from {executiveApproverName}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="w-full text-xs gap-1 bg-green-600 text-white hover:bg-green-700"
                            onClick={handleConfirmApproval}
                          >
                            <CheckCircle className="size-3" />
                            Step 2: Confirm Release
                          </Button>
                        </div>
                      )}

                      {executiveApprovalStep === "approved" && (
                        <div className="flex items-center gap-2 rounded-md bg-green-100 px-2.5 py-1.5 dark:bg-green-900/20">
                          <CheckCircle className="size-3.5 text-green-600 dark:text-green-400" />
                          <p className="text-xs font-medium text-green-700 dark:text-green-400">
                            Approved by {executiveApproverName}
                            {blueprint?.releaseApprovedAt && (
                              <span className="font-normal text-muted-foreground">
                                {" "}at{" "}
                                {new Date(
                                  blueprint.releaseApprovedAt
                                ).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      {/* Legacy checkbox for backward compat */}
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            attestExecutiveApproval ||
                            executiveApprovalStep === "approved"
                          }
                          onChange={(e) =>
                            setAttestExecutiveApproval(e.target.checked)
                          }
                          disabled={executiveApprovalStep === "approved"}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="text-sm text-foreground">
                          I attest executive release is authorized
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Validation messages */}
                {brief.status !== "approved" && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Brief must be approved before release.
                  </p>
                )}
                {selectedScoutIds.size === 0 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Select at least one scout to release.
                  </p>
                )}

                {/* Release Button */}
                <Button
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                  disabled={!canRelease || releasing}
                  onClick={() => setShowReleaseDialog(true)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Release to {selectedScoutIds.size} Scout
                  {selectedScoutIds.size !== 1 ? "s" : ""}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Released State Info ── */}
          {isReleased && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="py-6">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <CheckCircle className="h-5 w-5" />
                  <p className="text-sm font-medium">Brief Released</p>
                </div>
                {brief.releasedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Released on{" "}
                    {new Date(brief.releasedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Release Confirmation Dialog ────────────────────────── */}
      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Brief Release</DialogTitle>
            <DialogDescription>
              You are about to release the scout brief for{" "}
              <strong>{blueprint.title}</strong> to{" "}
              <strong>{selectedScoutIds.size}</strong> scout
              {selectedScoutIds.size !== 1 ? "s" : ""}. This will make the brief
              visible to the selected scouts.
            </DialogDescription>
          </DialogHeader>

          {/* Preview selected scouts */}
          {approvedScouts && selectedScoutIds.size > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Selected Scouts:
              </p>
              <div className="space-y-1">
                {approvedScouts
                  .filter((s) => selectedScoutIds.has(s._id))
                  .map((scout) => (
                    <p
                      key={scout._id}
                      className="text-sm text-foreground"
                    >
                      {scout.fullName}
                      {scout.currentTitle ? ` — ${scout.currentTitle}` : ""}
                    </p>
                  ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReleaseDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRelease}
              disabled={releasing}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {releasing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Routing Weight Tuner Dialog ───────────────────────── */}
      <Dialog open={showWeightTuner} onOpenChange={setShowWeightTuner}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <RoutingWeightTuner
            blueprintId={blueprintId}
            initialWeights={
              (blueprint?.routingWeights as Record<string, number>) ?? undefined
            }
            onClose={() => setShowWeightTuner(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
