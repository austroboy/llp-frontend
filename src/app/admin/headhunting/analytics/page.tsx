"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

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

const statusColors: Record<string, string> = {
  received: "bg-blue-100 text-blue-700",
  clarification: "bg-yellow-100 text-yellow-700",
  architecture: "bg-purple-100 text-purple-700",
  internal_review: "bg-orange-100 text-orange-700",
  client_review: "bg-indigo-100 text-indigo-700",
  approved: "bg-emerald-100 text-emerald-700",
  released: "bg-green-100 text-green-700",
  paused: "bg-gray-100 text-gray-600",
  filled: "bg-teal-100 text-teal-700",
  closed: "bg-gray-100 text-gray-500",
};

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const kanban = useQuery(api.headhunting.analytics.pipelineKanban);
  const velocity = useQuery(api.headhunting.analytics.mandateVelocity);
  const funnel = useQuery(api.headhunting.analytics.conversionFunnel);
  const scoutPerf = useQuery(api.headhunting.analytics.scoutPerformance);

  if (!kanban) {
    return (
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
        {t("admin.loading")}
      </div>
    );
  }

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
          Admin · Headhunting · Analytics
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
          <BarChart3
            className="size-7"
            style={{ color: "var(--accent-blue)" }}
          />
          Pipeline{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            Analytics.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          Mandate velocity, conversion funnel, scout performance — the
          procedural view of revenue throughput.
        </motion.p>
      </motion.section>

      {/* -- Stats hairline grid 4-up --------------------------- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp} style={hairlineGrid(4)}>
          <div style={hairlineCell}>
            <span
              className="lf-meta"
              style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Total Mandates
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
              {kanban.totalMandates}
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
              {kanban.activeMandates}
            </span>
          </div>
          <div style={hairlineCell}>
            <span
              className="lf-meta"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Clock className="size-3" /> Avg Time to Fill
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
              {velocity?.avgTimeToFillDays != null
                ? `${velocity.avgTimeToFillDays}d`
                : "—"}
            </span>
          </div>
          <div style={hairlineCell}>
            <span
              className="lf-meta"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <TrendingUp className="size-3" /> Avg Time to Release
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
              {velocity?.avgTimeToReleaseDays != null
                ? `${velocity.avgTimeToReleaseDays}d`
                : "—"}
            </span>
          </div>
        </motion.div>
      </motion.section>

      {/* -- Pipeline Kanban ------------------------------------ */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-6)" }}
      >
        <motion.div
          variants={fadeUp}
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--r-lg)",
            padding: "var(--s-4)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: 18,
              fontWeight: 500,
              color: "var(--ink)",
              margin: "0 0 var(--s-3)",
            }}
          >
            Pipeline Kanban
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {kanban.columns.map((col) => (
              <div key={col.status} className="min-w-[160px] flex-shrink-0">
                <div
                  className={cn(
                    "rounded-t-lg px-3 py-2 text-xs font-semibold",
                    statusColors[col.status] || "bg-gray-100 text-gray-700",
                  )}
                >
                  {col.status.replace(/_/g, " ")} ({col.count})
                </div>
                <div className="border border-t-0 border-border rounded-b-lg p-2 space-y-2 min-h-[100px] bg-muted/30">
                  {col.mandates.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-4">
                      Empty
                    </p>
                  ) : (
                    col.mandates.map((m) => (
                      <Link
                        key={m._id}
                        href={`/admin/headhunting/mandates/${m._id}`}
                        className="block rounded border border-border bg-card p-2 hover:border-primary/50 transition-colors"
                      >
                        <p className="text-[11px] font-medium leading-tight">
                          {m.rawTitle}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-[8px]">
                            {m.urgency}
                          </Badge>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* -- Conversion Funnel ---------------------------------- */}
      {funnel && funnel.total > 0 && (
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={inViewOnce}
          style={{ marginBottom: "var(--s-6)" }}
        >
          <motion.div
            variants={fadeUp}
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--r-lg)",
              padding: "var(--s-4)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 18,
                fontWeight: 500,
                color: "var(--ink)",
                margin: "0 0 var(--s-3)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Target
                className="size-4"
                style={{ color: "var(--accent-blue)" }}
              />
              Conversion Funnel
            </h2>
            <div className="space-y-2">
              {funnel.funnel.map((stage) => {
                const pct =
                  funnel.total > 0
                    ? Math.round((stage.count / funnel.total) * 100)
                    : 0;
                return (
                  <div
                    key={stage.stage}
                    className="flex items-center gap-3"
                  >
                    <span className="text-xs w-24 text-right capitalize">
                      {stage.stage}
                    </span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max(pct, 5)}%`,
                          background: "var(--accent-blue)",
                          opacity: 0.75,
                        }}
                      >
                        <span className="text-[10px] font-bold text-white">
                          {stage.count}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-10">
                      {pct}%
                    </span>
                  </div>
                );
              })}
              <div
                className="flex items-center gap-3 mt-2 pt-2"
                style={{ borderTop: "1px solid var(--line-1)" }}
              >
                <span className="text-xs w-24 text-right text-red-500">
                  Rejected
                </span>
                <span className="text-xs font-medium">{funnel.rejected}</span>
                <span className="text-xs w-24 text-right text-gray-500 ml-4">
                  Withdrawn
                </span>
                <span className="text-xs font-medium">{funnel.withdrawn}</span>
              </div>
            </div>
          </motion.div>
        </motion.section>
      )}

      {/* -- Scout Performance ---------------------------------- */}
      {scoutPerf && scoutPerf.length > 0 && (
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={inViewOnce}
        >
          <motion.div
            variants={fadeUp}
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--r-lg)",
              padding: "var(--s-4)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 18,
                fontWeight: 500,
                color: "var(--ink)",
                margin: "0 0 var(--s-3)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Users
                className="size-4"
                style={{ color: "var(--accent-blue)" }}
              />
              Scout Performance
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                    <th className="text-left py-2 px-2">Scout</th>
                    <th className="text-center py-2 px-2">Tier</th>
                    <th className="text-center py-2 px-2">Briefs</th>
                    <th className="text-center py-2 px-2">Submissions</th>
                    <th className="text-center py-2 px-2">Shortlisted</th>
                    <th className="text-center py-2 px-2">Placed</th>
                    <th className="text-center py-2 px-2">Hit Rate</th>
                    <th className="text-right py-2 px-2">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {scoutPerf.map((s) => (
                    <tr
                      key={s._id}
                      style={{ borderBottom: "1px solid var(--line-1)" }}
                    >
                      <td className="py-2 px-2 font-medium">{s.name}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge variant="outline" className="text-[9px]">
                          {s.scoutTier}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-center">{s.totalBriefs}</td>
                      <td className="py-2 px-2 text-center">
                        {s.totalSubmissions}
                      </td>
                      <td className="py-2 px-2 text-center">{s.shortlisted}</td>
                      <td className="py-2 px-2 text-center">{s.placed}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            s.hitRate >= 50
                              ? "bg-green-100 text-green-700"
                              : s.hitRate >= 25
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-600",
                          )}
                        >
                          {s.hitRate}%
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {s.totalEarnings > 0
                          ? `৳${s.totalEarnings.toLocaleString()}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.section>
      )}
    </MotionConfig>
  );
}
