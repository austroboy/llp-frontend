"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Search,
  Pause,
  XCircle,
  Play,
  FileText,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getBlueprintStatusLabel,
  getStatusBadgeClasses,
} from "@/lib/headhunting/status-labels";
import { getCompletenessScore } from "@/lib/headhunting/blueprint-validation";
import Link from "next/link";
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

// ─── Role band label mapping ────────────────────────────────────

const ROLE_BAND_LABELS: Record<string, string> = {
  entry_junior: "Entry",
  management_functional: "Management",
  executive_clevel: "Executive",
};

const ROLE_BAND_COLORS: Record<string, string> = {
  entry_junior:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  management_functional:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  executive_clevel:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

// ─── Filter tab status mapping ──────────────────────────────────

type FilterTab =
  | "all"
  | "draft"
  | "awaiting_client"
  | "client_confirmed"
  | "released";

const FILTER_TAB_STATUSES: Record<FilterTab, string[] | null> = {
  all: null,
  draft: ["draft", "ready_for_client_validation"],
  awaiting_client: ["sent_to_client", "returned_with_revisions"],
  client_confirmed: [
    "finalized_by_client",
    "brief_generated",
    "release_ready",
  ],
  released: ["released_to_scouts", "released"],
};

// ─── Main Export ────────────────────────────────────────────────

export default function BlueprintListPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <BlueprintListContent />
    </Suspense>
  );
}

// ─── Content ────────────────────────────────────────────────────

function BlueprintListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as FilterTab | null;
  const initialTab: FilterTab =
    tabParam && tabParam in FILTER_TAB_STATUSES ? tabParam : "all";

  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [pauseTarget, setPauseTarget] = useState<{
    id: Id<"htRoleBlueprints">;
    title: string;
  } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    id: Id<"htRoleBlueprints">;
    title: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const blueprints = useQuery(api.headhunting.blueprints.list, {});
  const setLifecycleStatus = useMutation(
    api.headhunting.blueprints.setLifecycleStatus
  );

  // Tab persistence in URL
  const handleTabChange = (tab: string) => {
    const t = tab as FilterTab;
    setActiveTab(t);
    const url = new URL(window.location.href);
    if (t === "all") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", t);
    }
    window.history.replaceState({}, "", url.toString());
  };

  // Filtered blueprints
  const filteredBlueprints = useMemo(() => {
    if (!blueprints) return [];
    let list = blueprints;

    // Filter by status tab
    const allowedStatuses = FILTER_TAB_STATUSES[activeTab];
    if (allowedStatuses) {
      list = list.filter((bp) => allowedStatuses.includes(bp.status));
    }

    // Filter out cancelled/archived unless searching
    if (!searchQuery) {
      list = list.filter(
        (bp) =>
          bp.lifecycleStatus === "active" || bp.lifecycleStatus === "paused"
      );
    }

    // Search filter (client-side)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (bp) =>
          bp.title?.toLowerCase().includes(q) ||
          bp.function?.toLowerCase().includes(q) ||
          bp.assignedTo?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [blueprints, activeTab, searchQuery]);

  // Pause handler
  const handlePause = async () => {
    if (!pauseTarget) return;
    setActionLoading(true);
    try {
      await setLifecycleStatus({
        id: pauseTarget.id,
        lifecycleStatus: "paused",
        reason: actionReason || undefined,
      });
      toast.success(`"${pauseTarget.title}" paused`);
      setPauseTarget(null);
      setActionReason("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to pause blueprint"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Resume handler
  const handleResume = async (id: Id<"htRoleBlueprints">, title: string) => {
    try {
      await setLifecycleStatus({
        id,
        lifecycleStatus: "active",
      });
      toast.success(`"${title}" resumed`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to resume blueprint"
      );
    }
  };

  // Cancel handler
  const handleCancel = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      await setLifecycleStatus({
        id: cancelTarget.id,
        lifecycleStatus: "cancelled",
        reason: actionReason || undefined,
      });
      toast.success(`"${cancelTarget.title}" cancelled`);
      setCancelTarget(null);
      setActionReason("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel blueprint"
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-5xl">
        {/* -- Hero ------------------------------------------------ */}
        <motion.section
          variants={heroStagger}
          initial="hidden"
          animate="show"
          style={{ paddingBottom: "var(--s-5)" }}
        >
          <motion.div variants={fadeUp} style={{ marginBottom: "var(--s-3)" }}>
            <Link
              href="/admin/headhunting"
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
              Headhunting
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="lf-kicker">
            <span className="lf-kicker-mark">§ V</span>
            Admin · Headhunting · Blueprints
          </motion.div>

          <motion.h1
            variants={fadeUp}
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              margin: "var(--s-3) 0 var(--s-3)",
            }}
          >
            Role{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
              blueprints.
            </em>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="lf-section-deck"
            style={{ maxWidth: 640 }}
          >
            The nine-dimension clause tree editor. Each blueprint is drafted,
            client-validated, then released to the scout network.
          </motion.p>

          <motion.div
            variants={fadeUp}
            style={{
              display: "flex",
              gap: "var(--s-2)",
              marginTop: "var(--s-4)",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setShowNewDialog(true)}
              className="lf-cta lf-cta--primary"
              style={{ border: "none", cursor: "pointer" }}
            >
              <Plus size={14} style={{ marginRight: 8 }} />
              New Blueprint
            </button>
          </motion.div>
        </motion.section>

        {/* -- Status filter tabs ---------------------------------- */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={inViewOnce}
          style={{ marginBottom: "var(--s-4)" }}
        >
          <motion.div variants={fadeUp}>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="all" className="gap-1.5">
                  <FileText className="size-3.5" />
                  All
                </TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="awaiting_client">
                  Awaiting Client
                </TabsTrigger>
                <TabsTrigger value="client_confirmed">
                  Client Confirmed
                </TabsTrigger>
                <TabsTrigger value="released">Released</TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Search */}
          <motion.div
            variants={fadeUp}
            style={{ position: "relative", marginTop: "var(--s-4)" }}
          >
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--ink-4)",
                pointerEvents: "none",
              }}
            />
            <Input
              placeholder="Search by role title, function, or assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </motion.div>
        </motion.section>

        {/* -- Table ----------------------------------------------- */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={inViewOnce}
          style={{ marginBottom: "var(--s-7)" }}
        >
        {blueprints === undefined ? (
          <motion.div
            variants={fadeUp}
            className="lf-card"
            style={{
              padding: "var(--s-6)",
              textAlign: "center",
              borderStyle: "dashed",
            }}
          >
            <Loader2
              className="animate-spin"
              size={20}
              style={{ margin: "0 auto var(--s-2)", color: "var(--ink-4)" }}
            />
            <p
              style={{
                fontFamily: "var(--lf-display)",
                fontStyle: "italic",
                color: "var(--ink-3)",
                margin: 0,
              }}
            >
              Loading blueprints…
            </p>
          </motion.div>
        ) : filteredBlueprints.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="lf-card"
            style={{
              padding: "var(--s-6)",
              textAlign: "center",
              borderStyle: "dashed",
            }}
          >
            <FileText
              size={40}
              style={{
                margin: "0 auto var(--s-3)",
                color: "var(--ink-5)",
                opacity: 0.4,
              }}
            />
            <p
              style={{
                fontFamily: "var(--lf-display)",
                fontStyle: "italic",
                fontSize: 18,
                color: "var(--ink-3)",
                margin: 0,
              }}
            >
              {searchQuery
                ? "No blueprints match your search."
                : activeTab !== "all"
                  ? "No blueprints in this status."
                  : "No blueprints yet. Create one to get started."}
            </p>
            {!searchQuery && activeTab === "all" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => setShowNewDialog(true)}
              >
                <Plus className="size-3.5" />
                Create Blueprint
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            variants={fadeUp}
            className="lf-card"
            style={{
              padding: 0,
              overflow: "hidden",
            }}
          >
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Role Title</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Role Band</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completeness</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBlueprints.map((bp) => {
                const completeness = getCompletenessScore(bp);
                const isPaused = bp.lifecycleStatus === "paused";
                return (
                  <TableRow
                    key={bp._id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                      isPaused && "opacity-60"
                    )}
                  >
                    <TableCell>
                      <button
                        onClick={() =>
                          router.push(
                            `/admin/headhunting/blueprints/${bp._id}`
                          )
                        }
                        className="text-sm font-medium text-left hover:underline"
                      >
                        {bp.title || "Untitled"}
                      </button>
                      {isPaused && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] border-yellow-300 text-yellow-600 dark:border-yellow-700 dark:text-yellow-400"
                        >
                          Paused
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {bp.function || "—"}
                    </TableCell>
                    <TableCell>
                      {bp.roleBand ? (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            ROLE_BAND_COLORS[bp.roleBand] ??
                              "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          )}
                        >
                          {ROLE_BAND_LABELS[bp.roleBand] ?? bp.roleBand}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={getStatusBadgeClasses(bp.status)}>
                        {getBlueprintStatusLabel(bp.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
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
                        <span className="text-xs text-muted-foreground">
                          {completeness}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {bp.assignedTo || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {bp.updatedAt
                        ? formatDistanceToNow(new Date(bp.updatedAt), {
                            addSuffix: true,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isPaused ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResume(bp._id, bp.title || "Untitled");
                            }}
                          >
                            <Play className="size-3" />
                            Resume
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-yellow-600 hover:text-yellow-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPauseTarget({
                                id: bp._id,
                                title: bp.title || "Untitled",
                              });
                            }}
                          >
                            <Pause className="size-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelTarget({
                              id: bp._id,
                              title: bp.title || "Untitled",
                            });
                          }}
                        >
                          <XCircle className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </motion.div>
        )}
        </motion.section>

      {/* New Blueprint Dialog */}
      <NewBlueprintDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
      />

      {/* Pause Confirmation Dialog */}
      <Dialog
        open={!!pauseTarget}
        onOpenChange={() => {
          setPauseTarget(null);
          setActionReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Blueprint</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to pause{" "}
            <span className="font-medium text-foreground">
              {pauseTarget?.title}
            </span>
            ? Status transitions will be blocked until resumed.
          </p>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Input
              placeholder="Why is this being paused?"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setPauseTarget(null);
                setActionReason("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePause} disabled={actionLoading}>
              {actionLoading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Pause
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={() => {
          setCancelTarget(null);
          setActionReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Blueprint</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel{" "}
            <span className="font-medium text-foreground">
              {cancelTarget?.title}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Input
              placeholder="Why is this being cancelled?"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setCancelTarget(null);
                setActionReason("");
              }}
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Cancel Blueprint
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </MotionConfig>
  );
}

// ─── New Blueprint Dialog ───────────────────────────────────────

function NewBlueprintDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const mandates = useQuery(api.headhunting.mandates.list, {});
  const createBlueprint = useMutation(api.headhunting.blueprints.create);

  const [selectedMandate, setSelectedMandate] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedMandate || !roleTitle.trim()) {
      toast.error("Please select a mandate and enter a role title.");
      return;
    }

    setCreating(true);
    try {
      const id = await createBlueprint({
        mandateId: selectedMandate as Id<"htMandates">,
        title: roleTitle.trim(),
      });
      toast.success("Blueprint created");
      onClose();
      setSelectedMandate("");
      setRoleTitle("");
      router.push(`/admin/headhunting/blueprints/${id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create blueprint"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        onClose();
        setSelectedMandate("");
        setRoleTitle("");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Role Blueprint</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Mandate <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedMandate} onValueChange={setSelectedMandate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a mandate..." />
              </SelectTrigger>
              <SelectContent>
                {mandates?.map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.rawTitle} — {m.clientName}
                  </SelectItem>
                ))}
                {(!mandates || mandates.length === 0) && (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    No mandates available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Role Title <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Head of Operations — Bangladesh"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                setSelectedMandate("");
                setRoleTitle("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !selectedMandate || !roleTitle.trim()}
            >
              {creating && (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              )}
              Create Blueprint
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
