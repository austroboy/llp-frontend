"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  DollarSign,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fireNotification } from "@/lib/notify";

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

const hairlineGrid = (cols: number): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  gap: 1,
  background: "var(--glass-border)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--r-lg)",
  overflow: "hidden",
});

const hairlineCell: React.CSSProperties = {
  background: "var(--glass-bg)",
  padding: "var(--s-4)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const PLACEMENT_STATUSES = [
  "offer_accepted", "joined", "invoiced", "paid",
  "protection_active", "protection_cleared", "replacement_triggered",
] as const;

export default function AdminRevenuePage() {
  const { t } = useLanguage();
  const placements = useQuery(api.headhunting.placements.list, {});
  const updateStatus = useMutation(api.headhunting.placements.updateStatus);
  const triggerReplacement = useMutation(api.headhunting.placements.triggerReplacement);
  const releasePayout = useMutation(api.headhunting.placements.releasePayout);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replacementDialog, setReplacementDialog] = useState<string | null>(null);
  const [replacementReason, setReplacementReason] = useState("");
  const [saving, setSaving] = useState(false);

  const totalFees = placements?.reduce((sum, p) => sum + (p.feeAmount ?? 0), 0) ?? 0;
  const activePlacements = placements?.filter((p) => ["joined", "protection_active"].includes(p.status)).length ?? 0;

  const handleStatusChange = async (placementId: string, newStatus: string) => {
    const placement = placements?.find((p) => p._id === placementId);
    if (!placement) return;
    setSaving(true);
    try {
      await updateStatus({
        id: placementId as Id<"htPlacements">,
        status: newStatus as "offer_accepted",
      });

      // Fire email notifications based on status
      if (newStatus === "joined") {
        fireNotification("placement_joined", {
          scoutName: "Scout", // resolved by template defaults
          scoutEmail: "",
          candidateName: placement.candidateName,
          mandateTitle: placement.mandateTitle,
          clientName: placement.clientName,
          feeAmount: placement.feeAmount,
        });
      }

      toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerReplacement = async () => {
    if (!replacementDialog) return;
    const placement = placements?.find((p) => p._id === replacementDialog);
    if (!placement) return;
    setSaving(true);
    try {
      await triggerReplacement({
        id: replacementDialog as Id<"htPlacements">,
        reason: replacementReason.trim() || undefined,
      });

      fireNotification("replacement_triggered", {
        recipientName: "Team",
        recipientEmail: "support@laborlawpartner.com",
        candidateName: placement.candidateName,
        mandateTitle: placement.mandateTitle,
        clientName: placement.clientName,
        reason: replacementReason.trim() || undefined,
        mandateId: placement.mandateId,
      });

      toast.success("Replacement triggered — mandate re-opened");
      setReplacementDialog(null);
      setReplacementReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      {/* -- Hero ------------------------------------------------ */}
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
            <ArrowLeft className="size-3.5" /> Headhunting
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ 2.2</span>
          Admin · Headhunting · Revenue
        </motion.div>

        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: "clamp(34px, 4.4vw, 48px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "var(--s-3) 0 var(--s-3)",
            display: "flex",
            alignItems: "center",
            gap: "var(--s-2)",
          }}
        >
          <DollarSign
            className="size-7"
            style={{ color: "var(--accent-blue)" }}
          />
          Revenue &amp;{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            Placements.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          Every placement under clause — offer accepted, joined, invoiced,
          paid, protection, replacement.
        </motion.p>
      </motion.section>

      {/* -- Stats hairline 3-up -------------------------------- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp} style={hairlineGrid(3)}>
          <div style={hairlineCell}>
            <span
              className="lf-meta"
              style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Total Placements
            </span>
            <span
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 32,
                fontWeight: 400,
                color: "var(--ink)",
                lineHeight: 1,
              }}
            >
              {placements?.length ?? 0}
            </span>
          </div>
          <div style={hairlineCell}>
            <span
              className="lf-meta"
              style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Active
            </span>
            <span
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 32,
                fontWeight: 400,
                color: "var(--ink)",
                lineHeight: 1,
              }}
            >
              {activePlacements}
            </span>
          </div>
          <div style={hairlineCell}>
            <span
              className="lf-meta"
              style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Total Fees
            </span>
            <span
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 32,
                fontWeight: 400,
                color: "var(--ink)",
                lineHeight: 1,
              }}
            >
              ৳{totalFees.toLocaleString()}
            </span>
          </div>
        </motion.div>
      </motion.section>

      {/* -- Table ---------------------------------------------- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        {!placements ? (
          <motion.div
            variants={fadeUp}
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
            {t("admin.loading")}
          </motion.div>
        ) : placements.length === 0 ? (
          <motion.div
            variants={fadeUp}
            style={{
              background: "var(--glass-bg)",
              border: "1px dashed var(--glass-border)",
              borderRadius: "var(--r-lg)",
              padding: "var(--s-7) var(--s-4)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 16,
                color: "var(--ink-2)",
                margin: 0,
              }}
            >
              No placements yet.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={fadeUp}
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--r-lg)",
              overflow: "hidden",
            }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Candidate</TableHead>
                  <TableHead>Mandate</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {placements.map((p) => {
                  const isExpanded = expandedId === p._id;
                  const canReplace = p.status === "protection_active" &&
                    p.protectionWindowEnd && p.protectionWindowEnd > Date.now();
                  return (
                    <>
                      <TableRow key={p._id} className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : p._id)}>
                        <TableCell>
                          {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{p.candidateName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.mandateTitle}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.clientName}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {p.feeAmount ? `৳${p.feeAmount.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={p.status}
                            onValueChange={(v) => handleStatusChange(p._id, v)}
                            disabled={saving}
                          >
                            <SelectTrigger className="h-7 text-[10px] w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLACEMENT_STATUSES.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {s.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {canReplace && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-[10px] h-7 gap-1"
                              onClick={() => setReplacementDialog(p._id)}
                            >
                              <AlertTriangle className="size-3" />
                              Replace
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${p._id}-detail`}>
                          <TableCell colSpan={7} className="bg-muted/30 p-4">
                            <PlacementPayouts
                              placementId={p._id}
                              placementStatus={p.status}
                              candidateName={p.candidateName}
                              onReleasePayout={releasePayout}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </motion.div>
        )}
      </motion.section>

      {/* Replacement Dialog */}
      <Dialog open={!!replacementDialog} onOpenChange={(v) => !v && setReplacementDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Trigger Replacement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              This will re-open the mandate for sourcing and freeze all pending payouts for 90 days.
            </p>
            <Input
              placeholder="Reason (e.g., candidate resigned)"
              value={replacementReason}
              onChange={(e) => setReplacementReason(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setReplacementDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleTriggerReplacement}
                disabled={saving}
                className="gap-1"
              >
                {saving && <Loader2 className="size-3 animate-spin" />}
                Trigger Replacement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MotionConfig>
  );
}

// ─── Payout sub-section ──────────────────────────────────────────

function PlacementPayouts({
  placementId,
  placementStatus,
  candidateName,
  onReleasePayout,
}: {
  placementId: string;
  placementStatus: string;
  candidateName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onReleasePayout: any;
}) {
  const detail = useQuery(api.headhunting.placements.getById, { id: placementId as Id<"htPlacements"> });
  const [releasing, setReleasing] = useState<string | null>(null);

  if (!detail) return <p className="text-xs text-muted-foreground">Loading payouts...</p>;

  const payouts = detail.payouts || [];
  if (payouts.length === 0) {
    return <p className="text-xs text-muted-foreground">No payout records for this placement.</p>;
  }

  const handleRelease = async (payoutId: string, rewardAmount: number) => {
    setReleasing(payoutId);
    try {
      await onReleasePayout({ id: payoutId as Id<"htPayoutRecords"> });
      fireNotification("payout_released", {
        scoutName: "Scout",
        scoutEmail: "",
        candidateName,
        rewardAmount,
      });
      toast.success("Payout released");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to release");
    } finally {
      setReleasing(null);
    }
  };

  return (
    <div className="space-y-2">
      <p
        className="lf-meta"
        style={{
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink-3)",
        }}
      >
        Payout Records
      </p>
      <div
        style={{
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--r-md)",
          overflow: "hidden",
        }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Contributor</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Amount</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((po: { _id: string; contributorId: string; contributorType: string; rewardAmount?: number; status: string; holdReason?: string }) => (
              <TableRow key={po._id}>
                <TableCell className="text-xs">{po.contributorId}</TableCell>
                <TableCell className="text-xs">{po.contributorType.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-xs font-medium">
                  {po.rewardAmount ? `৳${po.rewardAmount.toLocaleString()}` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={cn("text-[10px]", {
                    "bg-orange-100 text-orange-700": po.status === "held",
                    "bg-blue-100 text-blue-700": po.status === "eligible",
                    "bg-green-100 text-green-700": po.status === "released",
                  })}>
                    {po.status}
                  </Badge>
                  {po.holdReason && (
                    <span className="block text-[10px] text-muted-foreground mt-0.5">{po.holdReason}</span>
                  )}
                </TableCell>
                <TableCell>
                  {(po.status === "eligible" || po.status === "held") &&
                    placementStatus !== "replacement_triggered" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-6 gap-1"
                      disabled={releasing === po._id}
                      onClick={() => handleRelease(po._id, po.rewardAmount || 0)}
                    >
                      {releasing === po._id ? <Loader2 className="size-3 animate-spin" /> : <DollarSign className="size-3" />}
                      Release
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
