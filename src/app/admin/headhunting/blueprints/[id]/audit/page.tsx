"use client";

import { useState, useMemo, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  History,
  Filter,
  ChevronDown,
  AlertTriangle,
  Eye,
  ShieldAlert,
  Send,
  FileText,
  Users,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

// ─── Types ─────────────────────────────────────────────────────

type AuditAction =
  | "field_changed"
  | "status_changed"
  | "visibility_changed"
  | "conflict_override"
  | "release_decision"
  | "scout_selection"
  | "brief_generated"
  | "brief_released"
  | "brief_recalled";

interface AuditEntry {
  _id: string;
  blueprintId: Id<"htRoleBlueprints">;
  action: AuditAction;
  fieldPath?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  performedAt: number;
  rationale?: string;
  metadata?: Record<string, unknown>;
}

// ─── Action Configuration ──────────────────────────────────────

const ACTION_CONFIG: Record<
  AuditAction,
  {
    label: string;
    colorClass: string;
    bgClass: string;
    icon: typeof Pencil;
    isHighlight?: boolean;
  }
> = {
  field_changed: {
    label: "Field Changed",
    colorClass: "text-blue-700 dark:text-blue-400",
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
    icon: Pencil,
  },
  status_changed: {
    label: "Status Changed",
    colorClass: "text-green-700 dark:text-green-400",
    bgClass: "bg-green-100 dark:bg-green-900/30",
    icon: ChevronDown,
  },
  visibility_changed: {
    label: "Visibility Changed",
    colorClass: "text-yellow-700 dark:text-yellow-400",
    bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
    icon: Eye,
    isHighlight: true,
  },
  conflict_override: {
    label: "Conflict Override",
    colorClass: "text-red-700 dark:text-red-400",
    bgClass: "bg-red-100 dark:bg-red-900/30",
    icon: ShieldAlert,
    isHighlight: true,
  },
  release_decision: {
    label: "Release Decision",
    colorClass: "text-purple-700 dark:text-purple-400",
    bgClass: "bg-purple-100 dark:bg-purple-900/30",
    icon: Send,
  },
  scout_selection: {
    label: "Scout Selection",
    colorClass: "text-teal-700 dark:text-teal-400",
    bgClass: "bg-teal-100 dark:bg-teal-900/30",
    icon: Users,
  },
  brief_generated: {
    label: "Brief Generated",
    colorClass: "text-indigo-700 dark:text-indigo-400",
    bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
    icon: FileText,
  },
  brief_released: {
    label: "Brief Released",
    colorClass: "text-indigo-700 dark:text-indigo-400",
    bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
    icon: Send,
  },
  brief_recalled: {
    label: "Brief Recalled",
    colorClass: "text-indigo-700 dark:text-indigo-400",
    bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
    icon: RotateCcw,
  },
};

const ALL_ACTIONS: AuditAction[] = [
  "field_changed",
  "status_changed",
  "visibility_changed",
  "conflict_override",
  "release_decision",
  "scout_selection",
  "brief_generated",
  "brief_released",
  "brief_recalled",
];

// ─── Page Wrapper ──────────────────────────────────────────────

export default function BlueprintAuditPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <BlueprintAuditContent />
    </Suspense>
  );
}

// ─── Main Content ──────────────────────────────────────────────

function BlueprintAuditContent() {
  const params = useParams();
  const blueprintId = params.id as Id<"htRoleBlueprints">;

  const [actionFilter, setActionFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(50);

  // Queries
  const blueprint = useQuery(api.headhunting.blueprints.getById, {
    id: blueprintId,
  });

  // Query the blueprint-specific audit log table
  const blueprintAuditEntries = useQuery(
    api.headhunting.blueprintAuditLog.getByBlueprint,
    { blueprintId, limit: 200 }
  );

  // Fallback to entity-based log for older entries
  const auditEntries = useQuery(
    api.headhunting.auditLog.getByEntity,
    {
      entityType: "role" as const,
      entityId: blueprintId,
    }
  );

  // Merge and normalize entries from both sources
  const normalizedEntries = useMemo((): AuditEntry[] => {
    const entries: AuditEntry[] = [];

    // Add blueprint-specific entries if available
    if (blueprintAuditEntries && Array.isArray(blueprintAuditEntries)) {
      for (const e of blueprintAuditEntries) {
        const entry = e as Record<string, unknown>;
        entries.push({
          _id: entry._id as string,
          blueprintId,
          action: (entry.action as AuditAction) ?? "field_changed",
          fieldPath: entry.fieldPath as string | undefined,
          oldValue: entry.oldValue as string | undefined,
          newValue: entry.newValue as string | undefined,
          performedBy:
            (entry.performedByName as string) ??
            (entry.performedBy as string) ??
            "System",
          performedAt:
            (entry.performedAt as number) ??
            (entry.timestamp as number) ??
            Date.now(),
          rationale: entry.rationale as string | undefined,
          metadata: entry.metadata as Record<string, unknown> | undefined,
        });
      }
    }

    // Add general audit entries if no blueprint-specific entries
    if (entries.length === 0 && auditEntries && Array.isArray(auditEntries)) {
      for (const e of auditEntries) {
        const entry = e as Record<string, unknown>;
        let changes: Record<string, unknown> | undefined;
        try {
          if (entry.changes && typeof entry.changes === "string") {
            changes = JSON.parse(entry.changes);
          }
        } catch {
          // ignore parse errors
        }

        entries.push({
          _id: entry._id as string,
          blueprintId,
          action: mapLegacyAction(entry.action as string),
          fieldPath: changes?.fieldPath as string | undefined,
          oldValue: changes?.oldValue as string | undefined,
          newValue: changes?.newValue as string | undefined,
          performedBy:
            (entry.performedByName as string) ??
            (entry.performedBy as string) ??
            "System",
          performedAt: (entry.timestamp as number) ?? Date.now(),
          rationale: changes?.rationale as string | undefined,
        });
      }
    }

    // Sort by time descending
    entries.sort((a, b) => b.performedAt - a.performedAt);
    return entries;
  }, [blueprintAuditEntries, auditEntries, blueprintId]);

  // Filter by action type
  const filteredEntries = useMemo(() => {
    if (actionFilter === "all") return normalizedEntries;
    return normalizedEntries.filter((e) => e.action === actionFilter);
  }, [normalizedEntries, actionFilter]);

  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const hasMore = visibleEntries.length < filteredEntries.length;

  // Loading state
  if (blueprint === undefined) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (blueprint === null) {
    return (
      <MotionConfig reducedMotion="user">
        <motion.section
          variants={heroStagger}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-5xl"
          style={{ paddingBottom: "var(--s-6)", textAlign: "center" }}
        >
          <motion.div variants={fadeUp} style={{ paddingTop: "var(--s-6)" }}>
            <AlertTriangle
              size={40}
              style={{ margin: "0 auto", color: "var(--rust)" }}
            />
          </motion.div>
          <motion.h1
            variants={fadeUp}
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "var(--s-3) 0 var(--s-2)",
            }}
          >
            Blueprint <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>not found.</em>
          </motion.h1>
          <motion.p variants={fadeUp} className="lf-section-deck">
            The blueprint you are looking for does not exist.
          </motion.p>
        </motion.section>
      </MotionConfig>
    );
  }

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
              href={`/admin/headhunting/blueprints/${blueprintId}`}
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
              Back to Blueprint
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="lf-kicker">
            <span className="lf-kicker-mark">§ V</span>
            Admin · Headhunting · Blueprint Audit
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
            Audit{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
              trail.
            </em>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="lf-section-deck"
            style={{ maxWidth: 640 }}
          >
            {blueprint.title} ·{" "}
            {normalizedEntries.length} event
            {normalizedEntries.length !== 1 ? "s" : ""} recorded.
          </motion.p>
        </motion.section>

        {/* -- Filter bar ------------------------------------------ */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={inViewOnce}
          style={{ marginBottom: "var(--s-5)" }}
        >
          <motion.div
            variants={fadeUp}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--s-3)",
              flexWrap: "wrap",
            }}
          >
            <Filter size={16} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filter by action..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ALL_ACTIONS.map((action) => {
                  const config = ACTION_CONFIG[action];
                  return (
                    <SelectItem key={action} value={action}>
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-block size-2 rounded-full",
                            config.bgClass
                          )}
                        />
                        {config.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {actionFilter !== "all" && (
              <button
                type="button"
                onClick={() => setActionFilter("all")}
                className="lf-meta"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--accent-blue)",
                  textTransform: "uppercase",
                }}
              >
                Clear filter
              </button>
            )}
            <Badge
              variant="secondary"
              className="lf-meta"
              style={{
                marginLeft: "auto",
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--ink-3)",
                textTransform: "uppercase",
              }}
            >
              {normalizedEntries.length} event
              {normalizedEntries.length !== 1 ? "s" : ""}
            </Badge>
          </motion.div>
        </motion.section>

        {/* -- Timeline -------------------------------------------- */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={inViewOnce}
          style={{ marginBottom: "var(--s-7)" }}
        >
          {auditEntries === undefined && blueprintAuditEntries === undefined ? (
            <motion.div variants={fadeUp} className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </motion.div>
          ) : visibleEntries.length === 0 ? (
            <motion.div
              variants={fadeUp}
              className="lf-card"
              style={{
                padding: "var(--s-6)",
                textAlign: "center",
                borderStyle: "dashed",
              }}
            >
              <History
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
                  fontSize: 18,
                  fontStyle: "italic",
                  color: "var(--ink-3)",
                  margin: 0,
                }}
              >
                {actionFilter !== "all"
                  ? "No events match this filter."
                  : "No audit events recorded yet."}
              </p>
            </motion.div>
          ) : (
            <motion.div variants={fadeUp} style={{ position: "relative" }}>
              {/* Timeline line */}
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: "var(--line-2)",
                }}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {visibleEntries.map((entry, index) => (
                  <AuditTimelineEntry
                    key={entry._id}
                    entry={entry}
                    isFirst={index === 0}
                    isLast={index === visibleEntries.length - 1 && !hasMore}
                  />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div
                  style={{
                    marginTop: "var(--s-4)",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((prev) => prev + 50)}
                    className="gap-1.5"
                  >
                    <ChevronDown className="size-3.5" />
                    Load More ({filteredEntries.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </motion.section>
      </div>
    </MotionConfig>
  );
}

// ─── Timeline Entry ────────────────────────────────────────────

interface AuditTimelineEntryProps {
  entry: AuditEntry;
  isFirst: boolean;
  isLast: boolean;
}

function AuditTimelineEntry({ entry }: AuditTimelineEntryProps) {
  const config = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.field_changed;
  const Icon = config.icon;
  const isHighlight = config.isHighlight;

  const timestamp = new Date(entry.performedAt);
  const dateStr = timestamp.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = timestamp.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        gap: "var(--s-3)",
        paddingLeft: 8,
      }}
    >
      {/* Timeline dot */}
      <div
        className={cn(
          "relative z-10 mt-3 flex size-7 shrink-0 items-center justify-center rounded-full",
          config.bgClass
        )}
        style={{
          border: "2px solid var(--paper-inner)",
        }}
      >
        <Icon className={cn("size-3.5", config.colorClass)} />
      </div>

      {/* Content */}
      <div
        className="lf-card"
        style={{
          flex: 1,
          padding: "var(--s-3)",
          marginBottom: 8,
          ...(isHighlight
            ? {
                borderLeft: "3px solid var(--bronze)",
                background: "var(--bronze-ghost)",
              }
            : {}),
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                config.bgClass,
                config.colorClass
              )}
            >
              {config.label}
            </span>
            {entry.fieldPath && (
              <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                {entry.fieldPath}
              </code>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">{dateStr}</p>
            <p className="text-[10px] text-muted-foreground">{timeStr}</p>
          </div>
        </div>

        {/* Value changes */}
        {(entry.oldValue || entry.newValue) && (
          <div className="mt-2 flex items-start gap-2 text-xs">
            {entry.oldValue && (
              <div className="flex-1 rounded bg-red-50 p-1.5 dark:bg-red-900/10">
                <span className="text-[10px] font-medium text-red-600 dark:text-red-400">
                  Old:
                </span>
                <p className="text-muted-foreground mt-0.5 break-words">
                  {truncateValue(entry.oldValue)}
                </p>
              </div>
            )}
            {entry.oldValue && entry.newValue && (
              <span className="mt-2 text-muted-foreground shrink-0">
                &rarr;
              </span>
            )}
            {entry.newValue && (
              <div className="flex-1 rounded bg-green-50 p-1.5 dark:bg-green-900/10">
                <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                  New:
                </span>
                <p className="text-muted-foreground mt-0.5 break-words">
                  {truncateValue(entry.newValue)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Rationale */}
        {entry.rationale && (
          <p className="mt-2 text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
            {entry.rationale}
          </p>
        )}

        {/* Performer */}
        <p className="mt-2 text-[10px] text-muted-foreground">
          by {entry.performedBy}
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────

function mapLegacyAction(action: string): AuditAction {
  const mapping: Record<string, AuditAction> = {
    created: "field_changed",
    updated: "field_changed",
    status_changed: "status_changed",
    submitted: "status_changed",
    converted_to_mandate: "status_changed",
    released: "brief_released",
    recalled: "brief_recalled",
  };
  return (mapping[action] ?? "field_changed") as AuditAction;
}

function truncateValue(value: string, maxLen = 150): string {
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen) + "...";
}
