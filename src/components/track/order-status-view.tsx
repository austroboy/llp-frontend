"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  X,
  Circle,
  Clock,
  CalendarDays,
  Timer,
  Tag,
  Briefcase,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface PublicNote {
  message: string;
  createdAt: number;
  createdBy: string;
}

interface OrderStatusData {
  orderNumber?: string;
  serviceTitle: string;
  serviceCategory: string;
  serviceTimeline?: string;
  status: string;
  publicNotes: PublicNote[];
  createdAt: number;
  updatedAt: number;
}

interface OrderStatusViewProps {
  data: OrderStatusData;
  onBack: () => void;
}

const STAGES = ["pending", "reviewed", "in_progress", "completed"] as const;

const STATUS_TONE: Record<string, "live" | "busy" | "off"> = {
  pending: "busy",
  reviewed: "busy",
  in_progress: "live",
  completed: "live",
  cancelled: "off",
};

const CATEGORY_LABELS: Record<string, string> = {
  expatriate: "Expatriate & Visa",
  hr: "HR Services",
  licensing: "Licensing & Regulatory",
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const inViewOnce = { once: true, margin: "-72px 0px" } as const;

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OrderStatusView({ data, onBack }: OrderStatusViewProps) {
  const { t } = useLanguage();

  const isCancelled = data.status === "cancelled";
  const currentStageIndex = STAGES.indexOf(data.status as (typeof STAGES)[number]);

  const stageLabels: Record<string, string> = {
    pending: t("track.submitted"),
    reviewed: t("track.reviewed"),
    in_progress: t("track.inProgress"),
    completed: t("track.completed"),
  };

  const tone = STATUS_TONE[data.status] ?? "off";
  const statusLabel = isCancelled
    ? t("track.cancelled")
    : stageLabels[data.status] || data.status;

  return (
    <section
      className="lf-section"
      style={{ paddingTop: "calc(var(--s-7) + 48px)" }}
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ maxWidth: 720, marginInline: "auto" }}
      >
        {/* Back button */}
        <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={onBack}
            className="lf-cta lf-cta--ghost lf-glow"
            style={{ padding: "8px 16px" }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("track.title")}</span>
          </button>
        </motion.div>

        {/* Header card */}
        <motion.div
          variants={fadeUp}
          className="lf-card lf-card--feature"
          style={{
            padding: "clamp(20px, 2.5vw, 28px)",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 240px" }}>
            <div
              className="lf-meta lf-meta--accent"
              style={{ fontSize: 11, marginBottom: 6 }}
            >
              {data.orderNumber}
            </div>
            <div
              className="lf-h3"
              style={{ marginTop: 2 }}
            >
              {data.serviceTitle}
            </div>
          </div>
          <div className={`lf-status lf-status--${tone}`}>
            <span className="lf-status-dot" />
            <span>{statusLabel}</span>
          </div>
        </motion.div>

        {/* Horizontal Progress Stepper */}
        <motion.div
          variants={fadeUp}
          className="lf-card"
          style={{ padding: "20px 18px", marginBottom: 16 }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "0 8px",
            }}
          >
            {/* Background track */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 14,
                left: 24,
                right: 24,
                height: 2,
                background: "var(--line-2)",
              }}
            />
            {/* Progress fill */}
            {currentStageIndex > 0 && !isCancelled && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 14,
                  left: 24,
                  height: 2,
                  background: "var(--emerald)",
                  width: `${(Math.min(currentStageIndex, STAGES.length - 1) / (STAGES.length - 1)) * 100}%`,
                  maxWidth: "calc(100% - 48px)",
                }}
              />
            )}

            {STAGES.map((stage, i) => {
              const isDone = !isCancelled && currentStageIndex > i;
              const isCurrent = !isCancelled && currentStageIndex === i;
              const isCancelledStage = isCancelled && currentStageIndex === i;

              const circleBg = isDone
                ? "var(--emerald)"
                : isCurrent
                  ? "var(--accent-blue)"
                  : isCancelledStage
                    ? "var(--rust)"
                    : "var(--glass-bg-strong)";
              const circleColor =
                isDone || isCurrent || isCancelledStage
                  ? "#fafaf5"
                  : "var(--ink-4)";
              const ring = isCurrent
                ? "0 0 0 4px color-mix(in oklab, var(--accent-blue) 20%, transparent)"
                : isCancelledStage
                  ? "0 0 0 4px color-mix(in oklab, var(--rust) 20%, transparent)"
                  : "none";
              const labelColor = isDone
                ? "var(--emerald)"
                : isCurrent
                  ? "var(--accent-blue)"
                  : isCancelledStage
                    ? "var(--rust)"
                    : "var(--ink-4)";

              return (
                <div
                  key={stage}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    flex: "0 0 auto",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: circleBg,
                      color: circleColor,
                      boxShadow: ring,
                      border:
                        !isDone && !isCurrent && !isCancelledStage
                          ? "1px solid var(--glass-border)"
                          : "none",
                    }}
                  >
                    {isDone && <Check className="h-3.5 w-3.5" />}
                    {isCurrent && (
                      <Circle className="h-2.5 w-2.5 fill-current" />
                    )}
                    {isCancelledStage && <X className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className="lf-meta"
                    style={{
                      marginTop: 8,
                      fontSize: 10.5,
                      color: labelColor,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stageLabels[stage]}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Info Grid */}
        <motion.div
          variants={fadeUp}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <InfoCell
            icon={<CalendarDays className="h-3 w-3" />}
            label={t("track.submittedDate")}
            value={formatDate(data.createdAt)}
          />
          <InfoCell
            icon={<Clock className="h-3 w-3" />}
            label={t("track.lastUpdated")}
            value={formatDate(data.updatedAt)}
          />
          <InfoCell
            icon={<Timer className="h-3 w-3" />}
            label={t("track.timeline")}
            value={data.serviceTimeline || "—"}
          />
          <InfoCell
            icon={<Tag className="h-3 w-3" />}
            label={t("track.category")}
            value={
              CATEGORY_LABELS[data.serviceCategory] || data.serviceCategory
            }
          />
        </motion.div>

        {/* Activity Log */}
        <motion.div
          variants={fadeUp}
          className="lf-card"
          style={{ padding: "20px 18px", marginBottom: 16 }}
        >
          <div
            className="lf-meta lf-meta--accent"
            style={{ fontSize: 11, marginBottom: 12 }}
          >
            {t("track.updates")}
          </div>
          {data.publicNotes.length === 0 ? (
            <p className="lf-body" style={{ color: "var(--ink-4)" }}>
              {t("track.noUpdates")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...data.publicNotes].reverse().map((note, i) => {
                const isLatest = i === 0;
                return (
                  <div
                    key={note.createdAt}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--r-md)",
                      background: isLatest
                        ? "color-mix(in oklab, var(--accent-blue) 8%, var(--glass-bg))"
                        : "var(--glass-bg)",
                      border: `1px solid ${
                        isLatest
                          ? "color-mix(in oklab, var(--accent-blue) 28%, var(--glass-border))"
                          : "var(--glass-border)"
                      }`,
                      borderLeft: `3px solid ${
                        isLatest ? "var(--accent-blue)" : "var(--line-2)"
                      }`,
                      color: isLatest ? "var(--ink)" : "var(--ink-3)",
                      fontFamily: "var(--lf-body)",
                      fontSize: 13,
                    }}
                  >
                    <div
                      className="lf-meta"
                      style={{ fontSize: 10.5, marginBottom: 4 }}
                    >
                      {formatDate(note.createdAt)}
                    </div>
                    <div>{note.message}</div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Back to Services */}
        <motion.div variants={fadeUp}>
          <Link
            href="/services"
            className="lf-cta lf-cta--ghost lf-glow"
            style={{ width: "100%", justifyContent: "center" }}
          >
            <Briefcase className="h-4 w-4" />
            <span>Back to Services</span>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="lf-card" style={{ padding: "14px 14px" }}>
      <div
        className="lf-meta"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10.5,
        }}
      >
        {icon}
        <span>{label}</span>
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: "var(--lf-display)",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--ink)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
