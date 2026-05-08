"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Save, X as XIcon, Loader2 } from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  KpiTargetPatch,
  KpiTargetRow,
  KpiUnit,
} from "@/lib/analytics/kpi-status";

interface ListResponse {
  targets?: KpiTargetRow[];
  error?: string;
}

interface PatchResponse {
  target?: KpiTargetRow;
  error?: string;
}

interface EditState {
  display_name: string;
  target_value: number;
  warn_threshold_pct: number;
  red_threshold_pct: number;
  unit: KpiUnit;
}

function toEdit(row: KpiTargetRow): EditState {
  return {
    display_name: row.display_name,
    target_value: row.target_value,
    warn_threshold_pct: row.warn_threshold_pct,
    red_threshold_pct: row.red_threshold_pct,
    unit: row.unit,
  };
}

function toPatch(edit: EditState): KpiTargetPatch {
  return {
    display_name: edit.display_name,
    target_value: edit.target_value,
    warn_threshold_pct: edit.warn_threshold_pct,
    red_threshold_pct: edit.red_threshold_pct,
    unit: edit.unit,
  };
}

const UNIT_OPTIONS: ReadonlyArray<{ value: KpiUnit; label: string }> = [
  { value: "percent", label: "percent" },
  { value: "count", label: "count" },
  { value: "bdt", label: "BDT" },
];

export default function KpiTargetsPage() {
  const [rows, setRows] = useState<KpiTargetRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics/targets", {
        cache: "no-store",
      });
      const json = (await res.json()) as ListResponse;
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setRows(json.targets ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load failed");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const startEdit = (row: KpiTargetRow) => {
    setEditingId(row.kpi_id);
    setEdit(toEdit(row));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit(null);
  };

  const saveEdit = async (row: KpiTargetRow) => {
    if (!edit) return;
    setSaving(row.kpi_id);
    try {
      const res = await fetch(
        `/api/admin/analytics/targets/${encodeURIComponent(row.kpi_id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPatch(edit)),
        },
      );
      const json = (await res.json()) as PatchResponse;
      if (!res.ok || !json.target) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setRows((prev) =>
        prev
          ? prev.map((r) => (r.kpi_id === row.kpi_id ? json.target! : r))
          : prev,
      );
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "save failed");
    } finally {
      setSaving(null);
    }
  };

  const isLoading = rows === null;
  const isEmpty = !isLoading && rows !== null && rows.length === 0;

  return (
    <MotionConfig reducedMotion="user">
      {/* -- Hero ------------------------------------------------ */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-5)" }}
      >
        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ 3.8.a</span>
          Admin · Analytics · KPI Targets
        </motion.div>
        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: "clamp(32px, 4.4vw, 48px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "var(--s-3) 0 var(--s-3)",
          }}
        >
          KPI targets <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>&amp; thresholds.</em>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: "60ch" }}
        >
          Editable targets that drive the analytics scorecard pills. The
          warn-shortfall threshold flips a card from green to yellow; the red
          threshold is reserved for a future split. Only super-admin and
          growth-admin may save changes.
        </motion.p>
      </motion.section>

      {error ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="rounded-lg border border-amber-700/40 bg-amber-50/40 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200/90"
          style={{ marginBottom: "var(--s-4)" }}
        >
          {error}
        </motion.div>
      ) : null}

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="lf-card"
        style={{ padding: 0, overflow: "hidden", marginBottom: "var(--s-4)" }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <Th>KPI ID</Th>
              <Th>Display name</Th>
              <Th className="text-right">Target</Th>
              <Th>Unit</Th>
              <Th className="text-right">Warn shortfall %</Th>
              <Th className="text-right">Red shortfall %</Th>
              <Th>Last edited</Th>
              <Th className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows />
            ) : isEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No KPI rows yet. Run the migration to seed defaults.
                </TableCell>
              </TableRow>
            ) : (
              rows!.map((row) => {
                const isEditing = editingId === row.kpi_id;
                const draft = isEditing && edit ? edit : null;
                return (
                  <TableRow key={row.kpi_id}>
                    <TableCell className="font-jetbrains text-xs tracking-tight">
                      {row.kpi_id}
                    </TableCell>
                    <TableCell>
                      {draft ? (
                        <Input
                          value={draft.display_name}
                          onChange={(e) =>
                            setEdit({ ...draft, display_name: e.target.value })
                          }
                          className="h-8 text-sm"
                        />
                      ) : (
                        <span className="text-sm">{row.display_name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {draft ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={draft.target_value}
                          onChange={(e) =>
                            setEdit({
                              ...draft,
                              target_value:
                                Number.parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-8 w-24 text-sm text-right ml-auto"
                        />
                      ) : (
                        <span className="text-sm font-jetbrains tabular-nums">
                          {row.target_value}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {draft ? (
                        <Select
                          value={draft.unit}
                          onValueChange={(v) =>
                            setEdit({ ...draft, unit: v as KpiUnit })
                          }
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map((u) => (
                              <SelectItem
                                key={u.value}
                                value={u.value}
                                className="text-xs"
                              >
                                {u.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase tracking-wider"
                        >
                          {row.unit}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {draft ? (
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={draft.warn_threshold_pct}
                          onChange={(e) =>
                            setEdit({
                              ...draft,
                              warn_threshold_pct:
                                Number.parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-8 w-20 text-sm text-right ml-auto"
                        />
                      ) : (
                        <span className="text-sm font-jetbrains tabular-nums">
                          {row.warn_threshold_pct}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {draft ? (
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={draft.red_threshold_pct}
                          onChange={(e) =>
                            setEdit({
                              ...draft,
                              red_threshold_pct:
                                Number.parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-8 w-20 text-sm text-right ml-auto"
                        />
                      ) : (
                        <span className="text-sm font-jetbrains tabular-nums">
                          {row.red_threshold_pct}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-jetbrains text-muted-foreground">
                        {formatRelative(row.updated_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            disabled={saving === row.kpi_id}
                            onClick={() => void saveEdit(row)}
                            aria-label="Save"
                          >
                            {saving === row.kpi_id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Save className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={cancelEdit}
                            aria-label="Cancel"
                          >
                            <XIcon className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 ml-auto"
                          onClick={() => startEdit(row)}
                          aria-label="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={inViewOnce}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="lf-meta"
        style={{ fontStyle: "italic" }}
      >
        Note: read-only and tech-admin roles see the scorecard pills but cannot
        edit targets. PATCH attempts from those roles return 403.
      </motion.p>
    </MotionConfig>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <span className="text-[10px] tracking-[0.18em] uppercase font-jetbrains">
        {children}
      </span>
    </TableHead>
  );
}

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelative(iso: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const diffMs = then - Date.now();
  const diffMins = Math.round(diffMs / 60_000);
  if (Math.abs(diffMins) < 60) return RELATIVE.format(diffMins, "minute");
  const diffHrs = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHrs) < 48) return RELATIVE.format(diffHrs, "hour");
  const diffDays = Math.round(diffMs / 86_400_000);
  return RELATIVE.format(diffDays, "day");
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 8 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
