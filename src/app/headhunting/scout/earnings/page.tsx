"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

const chainStatusLabels: Record<string, string> = {
  invoice_sent: "Invoice Sent",
  client_paid: "Client Paid",
  collab_received: "Collab Received",
  collab_paid_llp: "Collab Paid LLP",
  llp_received: "LLP Received",
  scout_payout_pending: "Payout Pending",
  scout_paid: "Paid",
  completed: "Completed",
  disputed: "Disputed",
};

const chainStatusColors: Record<string, string> = {
  invoice_sent: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400",
  client_paid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  collab_received: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  collab_paid_llp: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  llp_received: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  scout_payout_pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  scout_paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  disputed: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

type Tab = "pending" | "completed";

export default function ScoutEarningsPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const userId = user?.id;
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  const scoutPayments = useQuery(
    api.headhunting.payments.getScoutPayments,
    userId ? { scoutId: userId } : "skip"
  );

  const originProtections = useQuery(
    api.headhunting.originProtection.getByScout,
    userId ? { scoutId: userId } : "skip"
  );

  // Derive summary values
  const completedPayments = scoutPayments?.filter(
    (p) => p.status === "scout_paid" || p.status === "completed"
  ) ?? [];
  const pendingPayments = scoutPayments?.filter(
    (p) => p.status === "scout_payout_pending"
  ) ?? [];

  const totalEarned = completedPayments.reduce(
    (s, p) => s + (p.scoutPayoutAmount ?? 0),
    0
  );
  const totalPending = pendingPayments.reduce(
    (s, p) => s + (p.scoutPayoutAmount ?? 0),
    0
  );
  const activeProtections = originProtections?.length ?? 0;

  const now = Date.now();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="size-6 text-primary" />
        Earnings & Rewards
      </h1>

      {/* Nav */}
      <div className="flex gap-2">
        <Link href="/headhunting/scout">
          <Badge
            variant="outline"
            className="px-3 py-1 cursor-pointer hover:bg-muted"
          >
            {t("scout.nav.dashboard")}
          </Badge>
        </Link>
        <Link href="/headhunting/scout/briefs">
          <Badge
            variant="outline"
            className="px-3 py-1 cursor-pointer hover:bg-muted"
          >
            {t("scout.nav.briefs")}
          </Badge>
        </Link>
        <Link href="/headhunting/scout/submissions">
          <Badge
            variant="outline"
            className="px-3 py-1 cursor-pointer hover:bg-muted"
          >
            {t("scout.nav.submissions")}
          </Badge>
        </Link>
        <Badge variant="default" className="px-3 py-1">
          Earnings
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="size-4 text-emerald-600" />
            <p className="text-xs text-muted-foreground">Total Earned</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            ৳{totalEarned.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="size-4 text-yellow-600" />
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            ৳{totalPending.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="size-4 text-blue-600" />
            <p className="text-xs text-muted-foreground">Active Protections</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {activeProtections}
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("pending")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "pending"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Pending Payouts
          {pendingPayments.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px] font-bold px-1">
              {pendingPayments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "completed"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Completed Payouts
          {completedPayments.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold px-1">
              {completedPayments.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {!scoutPayments ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {t("admin.loading")}
        </div>
      ) : activeTab === "pending" ? (
        /* Pending Payouts Tab */
        pendingPayments.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No pending payouts. Payouts appear here once LLP receives funds
            from the client.
          </div>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Mandate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Expected Amount</TableHead>
                  <TableHead className="text-right">Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayments.map((p) => {
                  const isOverdue =
                    p.scoutPayoutDeadline && p.scoutPayoutDeadline < now;
                  return (
                    <TableRow
                      key={p._id}
                      className={cn(isOverdue && "bg-red-50/50 dark:bg-red-950/20")}
                    >
                      <TableCell className="font-medium text-sm">
                        {p.candidateName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.mandateTitle}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[11px]",
                              chainStatusColors[p.status]
                            )}
                          >
                            {chainStatusLabels[p.status] ?? p.status}
                          </Badge>
                          {isOverdue && (
                            <AlertTriangle className="size-3.5 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {p.scoutPayoutAmount
                          ? `৳${p.scoutPayoutAmount.toLocaleString()}`
                          : "TBD"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-xs",
                          isOverdue
                            ? "text-red-600 font-semibold"
                            : "text-muted-foreground"
                        )}
                      >
                        {p.scoutPayoutDeadline
                          ? new Date(p.scoutPayoutDeadline).toLocaleDateString()
                          : "—"}
                        {isOverdue && " (overdue)"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        /* Completed Payouts Tab */
        completedPayments.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No completed payouts yet. Place candidates to earn rewards.
          </div>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Mandate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Date Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedPayments.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        {p.candidateName}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.mandateTitle}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-emerald-600">
                      {p.scoutPayoutAmount
                        ? `৳${p.scoutPayoutAmount.toLocaleString()}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {p.scoutPaidAt
                        ? new Date(p.scoutPaidAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      )}
    </div>
  );
}
