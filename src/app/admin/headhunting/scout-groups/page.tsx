"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  Plus,
  Users,
  ChevronDown,
  ChevronRight,
  Lock,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Search,
  Loader2,
  FolderPlus,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Skeleton } from "@/components/ui/skeleton";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

// ─── Types ─────────────────────────────────────────────────────

interface ScoutGroupSubgroup {
  _id: string;
  name: string;
  description?: string;
  memberCount: number;
  isInvitationOnly?: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

interface ScoutGroup {
  _id: Id<"htScoutGroups">;
  name: string;
  description?: string;
  parentGroupId?: string;
  memberCount: number;
  isInvitationOnly?: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  subgroups: ScoutGroupSubgroup[];
  // These fields are only on the raw DB records, not on list results
  memberClerkIds?: string[];
}

interface ScoutProfile {
  _id: string;
  clerkId: string;
  fullName: string;
  currentTitle?: string;
  functionPrimary?: string[];
  confidentialitySuitability?: string;
}

// ─── Page Wrapper ──────────────────────────────────────────────

export default function ScoutGroupsPage() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense
        fallback={
          <div
            style={{
              padding: "var(--s-7) var(--s-4)",
              textAlign: "center",
              fontFamily: "var(--lf-mono)",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-4)",
            }}
          >
            Loading...
          </div>
        }
      >
        <ScoutGroupsContent />
      </Suspense>
    </MotionConfig>
  );
}

// ─── Main Content ──────────────────────────────────────────────

function ScoutGroupsContent() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<ScoutGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [addMembersTarget, setAddMembersTarget] = useState<ScoutGroup | null>(
    null
  );
  const [createSubgroupParent, setCreateSubgroupParent] =
    useState<ScoutGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScoutGroup | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const groups = useQuery(api.headhunting.scoutGroups.list);
  const approvedScouts = useQuery(api.headhunting.scoutProfiles.list, {
    status: "approved",
  });

  // Mutations
  const deleteGroup = useMutation(api.headhunting.scoutGroups.deleteGroup);
  const removeMembers = useMutation(
    api.headhunting.scoutGroups.removeMembers
  );

  // Build scout lookup and process groups from the API
  const { topLevelGroups, scoutLookup } = useMemo(() => {
    const lookup = new Map<string, ScoutProfile>();

    if (approvedScouts) {
      for (const s of approvedScouts) {
        lookup.set(s.clerkId, s as ScoutProfile);
      }
    }

    return {
      topLevelGroups: (groups as ScoutGroup[] | undefined) ?? [],
      scoutLookup: lookup,
    };
  }, [groups, approvedScouts]);

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return topLevelGroups;
    const q = searchQuery.toLowerCase();
    return topLevelGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q)
    );
  }, [topLevelGroups, searchQuery]);

  const toggleExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteGroup({ id: deleteTarget._id });
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete group"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRemoveMember = async (
    groupId: Id<"htScoutGroups">,
    groupName: string,
    scoutClerkId: string
  ) => {
    try {
      await removeMembers({ id: groupId, scoutClerkIds: [scoutClerkId] });
      const scout = scoutLookup.get(scoutClerkId);
      toast.success(
        `Removed ${scout?.fullName ?? "scout"} from "${groupName}"`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove member"
      );
    }
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <>
      {/* -- Hero --------------------------------------------- */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp}>
          <Link
            href="/admin/headhunting"
            className="lf-meta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-4)",
              textDecoration: "none",
              marginBottom: "var(--s-3)",
            }}
          >
            <ArrowLeft className="size-3.5" />
            Headhunting
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ 2.2.c</span>
          Admin · Headhunting · Scout Groups
        </motion.div>

        <motion.div
          variants={fadeUp}
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "var(--s-4)",
            flexWrap: "wrap",
            marginTop: "var(--s-3)",
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: "clamp(34px, 4.4vw, 48px)",
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                margin: "0 0 var(--s-2)",
              }}
            >
              Scout{" "}
              <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
                groups.
              </em>
            </h1>
            <p
              className="lf-section-deck"
              style={{ margin: 0, maxWidth: 640 }}
            >
              Roster clusters the release engine uses to target briefs. Each
              group is a clause-scoped audience.
            </p>
          </div>
          <button
            onClick={() => setShowNewDialog(true)}
            className="lf-cta lf-cta--primary"
          >
            <Plus className="size-4" />
            New Group
          </button>
        </motion.div>
      </motion.section>

      {/* -- Body --------------------------------------------- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-4)",
        }}
      >
        {/* Search */}
        <motion.div variants={fadeUp} style={{ position: "relative" }}>
          <Search
            className="size-4"
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
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </motion.div>

        {/* Group list */}
        <motion.div variants={fadeUp}>
        {groups === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div
            style={{
              background: "var(--glass-bg)",
              border: "1px dashed var(--glass-border)",
              borderRadius: "var(--r-lg)",
              padding: "var(--s-7) var(--s-4)",
              textAlign: "center",
            }}
          >
            <Users
              className="size-10"
              style={{
                color: "var(--ink-5)",
                margin: "0 auto var(--s-2)",
              }}
            />
            <p
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 16,
                color: "var(--ink-2)",
                margin: 0,
              }}
            >
              {searchQuery
                ? "No groups match your search."
                : "No scout groups yet. Create one to organize your scouts."}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => setShowNewDialog(true)}
              >
                <Plus className="size-3.5" />
                Create Group
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((group) => (
              <GroupCard
                key={group._id}
                group={group}
                scoutLookup={scoutLookup}
                isExpanded={expandedGroups.has(group._id)}
                expandedGroups={expandedGroups}
                onToggleExpand={toggleExpand}
                onEdit={() => setEditTarget(group)}
                onDelete={() => setDeleteTarget(group)}
                onAddMembers={() => setAddMembersTarget(group)}
                onRemoveMember={(groupId, groupName, clerkId) => {
                  handleRemoveMember(groupId as Id<"htScoutGroups">, groupName, clerkId);
                }}
                onCreateSubgroup={() => setCreateSubgroupParent(group)}
                depth={0}
              />
            ))}
          </div>
        )}
        </motion.div>
      </motion.section>

      {/* New Group Dialog */}
      <GroupFormDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        allGroups={(groups as ScoutGroup[]) ?? []}
        allScouts={(approvedScouts as ScoutProfile[]) ?? []}
      />

      {/* Edit Group Dialog */}
      {editTarget && (
        <GroupFormDialog
          open
          onClose={() => setEditTarget(null)}
          editGroup={editTarget}
          allGroups={(groups as ScoutGroup[]) ?? []}
          allScouts={(approvedScouts as ScoutProfile[]) ?? []}
        />
      )}

      {/* Create Subgroup Dialog */}
      {createSubgroupParent && (
        <GroupFormDialog
          open
          onClose={() => setCreateSubgroupParent(null)}
          parentGroup={createSubgroupParent}
          allGroups={(groups as ScoutGroup[]) ?? []}
          allScouts={(approvedScouts as ScoutProfile[]) ?? []}
        />
      )}

      {/* Add Members Dialog */}
      {addMembersTarget && (
        <AddMembersDialog
          open
          onClose={() => setAddMembersTarget(null)}
          group={addMembersTarget}
          allScouts={(approvedScouts as ScoutProfile[]) ?? []}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.name}
            </span>
            ? This will not remove the scouts themselves, only the group.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading && (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              )}
              Delete Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Group Card ────────────────────────────────────────────────

interface GroupCardProps {
  group: ScoutGroup;
  scoutLookup: Map<string, ScoutProfile>;
  isExpanded: boolean;
  expandedGroups: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddMembers: () => void;
  onRemoveMember: (groupId: string, groupName: string, clerkId: string) => void;
  onCreateSubgroup: () => void;
  depth: number;
}

function GroupCard({
  group,
  scoutLookup,
  isExpanded,
  expandedGroups,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddMembers,
  onRemoveMember,
  onCreateSubgroup,
  depth,
}: GroupCardProps) {
  const memberCount = group.memberCount;
  const subgroups = group.subgroups ?? [];

  // Fetch detailed member list when expanded
  const groupDetail = useQuery(
    api.headhunting.scoutGroups.getById,
    isExpanded ? { id: group._id } : "skip"
  );

  const members = (groupDetail as { members: { clerkId: string; fullName: string; currentTitle?: string; currentCompany?: string; status: string }[] } | null)?.members ?? [];

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden",
        depth > 0 && "ml-6 border-dashed"
      )}
    >
      {/* Group header */}
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          onClick={() => onToggleExpand(group._id)}
          className="flex items-center gap-3 text-left flex-1 min-w-0"
        >
          {isExpanded ? (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {group.name}
              </h3>
              {group.isInvitationOnly && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 gap-0.5"
                >
                  <Lock className="size-2.5" />
                  Invitation Only
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {memberCount} member{memberCount !== 1 ? "s" : ""}
              </span>
              {subgroups.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {subgroups.length} subgroup
                  {subgroups.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {group.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {group.description}
              </p>
            )}
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={onAddMembers}
          >
            <UserPlus className="size-3" />
            <span className="hidden sm:inline">Add</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={onCreateSubgroup}
          >
            <FolderPlus className="size-3" />
            <span className="hidden sm:inline">Subgroup</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={onEdit}
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
            onClick={onDelete}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border px-4 pb-4">
          {/* Member list */}
          {groupDetail === undefined ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No members yet.{" "}
              <button
                type="button"
                onClick={onAddMembers}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Add members
              </button>
            </p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => {
                const scout = scoutLookup.get(member.clerkId);
                return (
                  <div
                    key={member.clerkId}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.fullName}
                        </p>
                        {scout?.confidentialitySuitability && (
                          <ConfidentialityBadge
                            level={scout.confidentialitySuitability}
                          />
                        )}
                      </div>
                      {(member.currentTitle || member.currentCompany) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.currentTitle}
                          {member.currentCompany
                            ? ` at ${member.currentCompany}`
                            : ""}
                        </p>
                      )}
                      {scout?.functionPrimary &&
                        scout.functionPrimary.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {scout.functionPrimary.slice(0, 3).map((fn, i) => (
                              <span
                                key={i}
                                className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              >
                                {fn}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-xs text-red-600 hover:text-red-700 shrink-0"
                      onClick={() =>
                        onRemoveMember(group._id, group.name, member.clerkId)
                      }
                    >
                      <UserMinus className="size-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Subgroups */}
          {subgroups.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Subgroups
              </p>
              {subgroups.map((sub) => (
                <SubgroupCard
                  key={sub._id}
                  subgroup={sub}
                  scoutLookup={scoutLookup}
                  isExpanded={expandedGroups.has(sub._id)}
                  onToggleExpand={onToggleExpand}
                  onRemoveMember={onRemoveMember}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Subgroup Card (simplified) ────────────────────────────────

interface SubgroupCardProps {
  subgroup: ScoutGroupSubgroup;
  scoutLookup: Map<string, ScoutProfile>;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onRemoveMember: (groupId: string, groupName: string, clerkId: string) => void;
}

function SubgroupCard({
  subgroup,
  scoutLookup,
  isExpanded,
  onToggleExpand,
  onRemoveMember,
}: SubgroupCardProps) {
  const subgroupDetail = useQuery(
    api.headhunting.scoutGroups.getById,
    isExpanded ? { id: subgroup._id as Id<"htScoutGroups"> } : "skip"
  );

  const members = (subgroupDetail as { members: { clerkId: string; fullName: string; currentTitle?: string; currentCompany?: string; status: string }[] } | null)?.members ?? [];

  return (
    <div className="ml-6 rounded-lg border border-dashed border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => onToggleExpand(subgroup._id)}
        className="flex items-center gap-3 w-full text-left p-3"
      >
        {isExpanded ? (
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground">
            {subgroup.name}
          </span>
          {subgroup.isInvitationOnly && (
            <Lock className="size-2.5 text-amber-500" />
          )}
          <span className="text-[10px] text-muted-foreground">
            {subgroup.memberCount} member{subgroup.memberCount !== 1 ? "s" : ""}
          </span>
        </div>
      </button>
      {isExpanded && (
        <div className="border-t border-border px-3 pb-3">
          {subgroupDetail === undefined ? (
            <div className="flex justify-center py-3">
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-3 text-center text-[10px] text-muted-foreground">
              No members in this subgroup.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => {
                const scout = scoutLookup.get(member.clerkId);
                return (
                  <div
                    key={member.clerkId}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-foreground truncate">
                          {member.fullName}
                        </p>
                        {scout?.confidentialitySuitability && (
                          <ConfidentialityBadge
                            level={scout.confidentialitySuitability}
                          />
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 text-xs text-red-600 hover:text-red-700 shrink-0"
                      onClick={() =>
                        onRemoveMember(
                          subgroup._id,
                          subgroup.name,
                          member.clerkId
                        )
                      }
                    >
                      <UserMinus className="size-2.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Confidentiality Badge ─────────────────────────────────────

const CONF_BADGE_COLORS: Record<string, string> = {
  restricted:
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  standard:
    "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  trusted:
    "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  high_discretion:
    "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  executive_confidential:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const CONF_BADGE_LABELS: Record<string, string> = {
  restricted: "Restricted",
  standard: "Standard",
  trusted: "Trusted",
  high_discretion: "High Discretion",
  executive_confidential: "Exec Confidential",
};

function ConfidentialityBadge({ level }: { level: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        CONF_BADGE_COLORS[level] ?? CONF_BADGE_COLORS.standard
      )}
    >
      <Shield className="size-2.5" />
      {CONF_BADGE_LABELS[level] ?? level}
    </span>
  );
}

// ─── Group Form Dialog (Create / Edit) ─────────────────────────

interface GroupFormDialogProps {
  open: boolean;
  onClose: () => void;
  editGroup?: ScoutGroup;
  parentGroup?: ScoutGroup;
  allGroups: ScoutGroup[];
  allScouts: ScoutProfile[];
}

function GroupFormDialog({
  open,
  onClose,
  editGroup,
  parentGroup,
  allGroups,
  allScouts,
}: GroupFormDialogProps) {
  const createGroup = useMutation(api.headhunting.scoutGroups.create);
  const updateGroup = useMutation(api.headhunting.scoutGroups.update);

  const isEdit = !!editGroup;
  const [name, setName] = useState(editGroup?.name ?? "");
  const [description, setDescription] = useState(
    editGroup?.description ?? ""
  );
  const [parentId, setParentId] = useState<string>(
    editGroup?.parentGroupId ?? parentGroup?._id ?? ""
  );
  const [isInvitationOnly, setIsInvitationOnly] = useState(
    editGroup?.isInvitationOnly ?? false
  );
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredScouts = useMemo(() => {
    if (!memberSearch.trim()) return allScouts;
    const q = memberSearch.toLowerCase();
    return allScouts.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.currentTitle?.toLowerCase().includes(q)
    );
  }, [allScouts, memberSearch]);

  const topLevelGroupsForSelect = useMemo(() => {
    return allGroups.filter(
      (g) => !g.parentGroupId && g._id !== editGroup?._id
    );
  }, [allGroups, editGroup?._id]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && editGroup) {
        await updateGroup({
          id: editGroup._id,
          name: name.trim(),
          description: description.trim() || undefined,
          isInvitationOnly,
        });
        toast.success(`"${name.trim()}" updated`);
      } else {
        await createGroup({
          name: name.trim(),
          description: description.trim() || undefined,
          parentGroupId: parentId
            ? (parentId as Id<"htScoutGroups">)
            : undefined,
          isInvitationOnly,
          memberClerkIds: Array.from(selectedMembers),
        });
        toast.success(`"${name.trim()}" created`);
      }
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save group"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (clerkId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(clerkId)) next.delete(clerkId);
      else next.add(clerkId);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Edit Group"
              : parentGroup
                ? `New Subgroup of "${parentGroup.name}"`
                : "New Scout Group"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Executive Search Team"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this group's purpose..."
              rows={2}
            />
          </div>

          {/* Parent Group (not shown when creating subgroup or editing) */}
          {!isEdit && !parentGroup && (
            <div className="space-y-2">
              <Label>Parent Group (optional)</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level group)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (top-level)</SelectItem>
                  {topLevelGroupsForSelect.map((g) => (
                    <SelectItem key={g._id} value={g._id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Invitation Only */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isInvitationOnly}
              onChange={(e) => setIsInvitationOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-foreground">
                Invitation Only
              </span>
              <p className="text-xs text-muted-foreground">
                Restrict this group to invited scouts only
              </p>
            </div>
          </label>

          {/* Member Selection (only for new groups) */}
          {!isEdit && (
            <div className="space-y-2">
              <Label>
                Initial Members ({selectedMembers.size} selected)
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search scouts..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {filteredScouts.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No scouts found
                  </p>
                ) : (
                  filteredScouts.map((scout) => (
                    <label
                      key={scout.clerkId}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors",
                        selectedMembers.has(scout.clerkId)
                          ? "bg-blue-50/50 dark:bg-blue-900/10"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(scout.clerkId)}
                        onChange={() => toggleMember(scout.clerkId)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">
                          {scout.fullName}
                        </p>
                        {scout.currentTitle && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {scout.currentTitle}
                          </p>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving && (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              )}
              {isEdit ? "Update Group" : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Members Dialog ────────────────────────────────────────

interface AddMembersDialogProps {
  open: boolean;
  onClose: () => void;
  group: ScoutGroup;
  allScouts: ScoutProfile[];
}

function AddMembersDialog({
  open,
  onClose,
  group,
  allScouts,
}: AddMembersDialogProps) {
  const addMembers = useMutation(api.headhunting.scoutGroups.addMembers);
  const groupDetail = useQuery(api.headhunting.scoutGroups.getById, {
    id: group._id,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Get current member clerk IDs from the detail query
  const existingMemberIds = useMemo(() => {
    if (!groupDetail) return new Set<string>();
    const detail = groupDetail as { memberClerkIds?: string[] };
    return new Set(detail.memberClerkIds ?? []);
  }, [groupDetail]);

  // Only show scouts not already in the group
  const availableScouts = useMemo(() => {
    let scouts = allScouts.filter((s) => !existingMemberIds.has(s.clerkId));
    if (search.trim()) {
      const q = search.toLowerCase();
      scouts = scouts.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.currentTitle?.toLowerCase().includes(q)
      );
    }
    return scouts;
  }, [allScouts, existingMemberIds, search]);

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await addMembers({
        id: group._id,
        scoutClerkIds: Array.from(selected),
      });
      toast.success(
        `Added ${selected.size} member${selected.size !== 1 ? "s" : ""} to "${group.name}"`
      );
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add members"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleScout = (clerkId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(clerkId)) next.delete(clerkId);
      else next.add(clerkId);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Members to &ldquo;{group.name}&rdquo;</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scouts..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {availableScouts.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {search
                  ? "No matching scouts found."
                  : "All scouts are already members."}
              </p>
            ) : (
              availableScouts.map((scout) => (
                <label
                  key={scout.clerkId}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors",
                    selected.has(scout.clerkId)
                      ? "bg-blue-50/50 dark:bg-blue-900/10"
                      : "hover:bg-muted/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(scout.clerkId)}
                    onChange={() => toggleScout(scout.clerkId)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-foreground truncate">
                        {scout.fullName}
                      </p>
                      {scout.confidentialitySuitability && (
                        <ConfidentialityBadge
                          level={scout.confidentialitySuitability}
                        />
                      )}
                    </div>
                    {scout.currentTitle && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {scout.currentTitle}
                      </p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={saving || selected.size === 0}
            >
              {saving && (
                <Loader2 className="size-3 animate-spin mr-1.5" />
              )}
              Add {selected.size} Member{selected.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
