"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Plus, Briefcase, ArrowRight } from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import type { CSSProperties } from "react";
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

const hairlineColumn: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 1,
  background: "var(--glass-border)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--r-lg)",
  overflow: "hidden",
};

const hairlineRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: "var(--s-3)",
  alignItems: "center",
  padding: "var(--s-4)",
  background: "var(--glass-bg)",
  textDecoration: "none",
  transition: "background 200ms cubic-bezier(0.16,1,0.3,1)",
};

const iconBubble: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  background: "var(--paper-inner)",
  border: "1px solid var(--line-2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--accent-blue)",
  flexShrink: 0,
};

type StatusVariant = "live" | "busy" | "off";

function statusVariant(status: string): StatusVariant {
  const s = status.toLowerCase();
  if (s.includes("close") || s.includes("archived") || s.includes("cancel")) {
    return "off";
  }
  if (s.includes("review") || s.includes("submitted") || s.includes("pending")) {
    return "busy";
  }
  return "live";
}

function statusLabel(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OrgHiringPage() {
  const { user } = useUser();
  const clerkId = user?.id;
  const assignments = useQuery(
    api.headhunting.hiringAssignments.getByClerkId,
    clerkId ? { clerkId } : "skip"
  );

  const loading = assignments === undefined;
  const isEmpty = !loading && (!assignments || assignments.length === 0);

  return (
    <MotionConfig reducedMotion="user">
      {/* -- Hero ------------------------------------------------ */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ I</span>
          Organization Desk · Hiring
        </motion.div>

        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: "clamp(40px, 5.6vw, 64px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "var(--s-3) 0 var(--s-3)",
          }}
        >
          Your{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            hiring requests.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          Submit, track, and review roles filed with the LLP headhunting desk.
          Each row opens the mandate thread once sourcing begins.
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
          <Link href="/org/hiring/new" className="lf-cta lf-cta--primary">
            <Plus size={14} style={{ marginRight: 8 }} />
            New request
          </Link>
          <Link href="/org" className="lf-cta lf-cta--ghost">
            Back to Organization Desk
          </Link>
        </motion.div>
      </motion.section>

      {/* -- Active mandates ------------------------------------- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-7)" }}
      >
        <motion.div
          variants={fadeUp}
          className="lf-section-header"
          style={{ marginBottom: "var(--s-5)" }}
        >
          <div className="lf-kicker">
            <span className="lf-kicker-mark">§ II</span>
            Active mandates
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            Filed <em>requests.</em>
          </h2>
          <p className="lf-section-deck">
            Each request becomes a mandate thread once the LLP desk begins
            sourcing.
          </p>
        </motion.div>

        {loading && (
          <motion.div variants={fadeUp} style={hairlineColumn}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  ...hairlineRow,
                  background: "var(--paper-inner)",
                  opacity: 0.6,
                }}
              >
                <div style={iconBubble} />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: "40%",
                      height: 14,
                      borderRadius: 4,
                      background: "var(--line-2)",
                    }}
                  />
                  <span
                    style={{
                      width: "70%",
                      height: 11,
                      borderRadius: 4,
                      background: "var(--line-1)",
                    }}
                  />
                </div>
                <span
                  style={{
                    width: 72,
                    height: 22,
                    borderRadius: 999,
                    background: "var(--line-1)",
                  }}
                />
              </div>
            ))}
          </motion.div>
        )}

        {isEmpty && (
          <motion.div
            variants={fadeUp}
            className="lf-card"
            style={{
              border: "1px dashed var(--line-2)",
              padding: "var(--s-6)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--s-3)",
            }}
          >
            <span
              className="lf-meta"
              style={{ textTransform: "uppercase", letterSpacing: "0.14em" }}
            >
              Empty file
            </span>
            <h3
              className="lf-h3"
              style={{ margin: 0 }}
            >
              No active hiring requests yet.
            </h3>
            <p
              className="lf-body"
              style={{
                color: "var(--ink-3)",
                maxWidth: 480,
                margin: 0,
              }}
            >
              Submit a request to start talent sourcing with the LLP
              headhunting desk.
            </p>
            <Link
              href="/org/hiring/new"
              className="lf-cta lf-cta--primary"
              style={{ marginTop: "var(--s-2)" }}
            >
              <Plus size={14} style={{ marginRight: 8 }} />
              File your first request
            </Link>
          </motion.div>
        )}

        {!loading && assignments && assignments.length > 0 && (
          <motion.div variants={fadeUp} style={hairlineColumn}>
            {assignments.map((a) => {
              const variant = statusVariant(a.status);
              const updatedAt = (a as { updatedAt?: number }).updatedAt;
              return (
                <Link
                  key={a._id}
                  href="/org/hiring"
                  style={hairlineRow}
                >
                  <div style={iconBubble}>
                    <Briefcase size={14} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--lf-display)",
                        fontSize: 16,
                        color: "var(--ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.assignmentName}
                    </span>
                    <span className="lf-meta">
                      {a.hiringEntity ? `${a.hiringEntity} · ` : ""}
                      Filed {new Date(a.createdAt).toLocaleDateString()}
                      {updatedAt
                        ? ` · Updated ${new Date(updatedAt).toLocaleDateString()}`
                        : ""}
                      {a.urgencyLevel ? ` · Urgency · ${a.urgencyLevel}` : ""}
                      {typeof a.totalOpenings === "number"
                        ? ` · Openings · ${a.totalOpenings}`
                        : ""}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "lf-status",
                      variant === "live" && "lf-status--live",
                      variant === "busy" && "lf-status--busy",
                      variant === "off" && "lf-status--off"
                    )}
                  >
                    <span className="lf-status-dot" />
                    {statusLabel(a.status)}
                    <ArrowRight
                      size={12}
                      style={{ marginLeft: 6, opacity: 0.7 }}
                    />
                  </span>
                </Link>
              );
            })}
          </motion.div>
        )}
      </motion.section>

      {/* -- Stamp ----------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        viewport={inViewOnce}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--s-3)",
          paddingTop: "var(--s-4)",
          borderTop: "1px solid var(--line-1)",
        }}
      >
        <span className="lf-meta" style={{ fontStyle: "italic" }}>
          Each request opens a mandate thread with the LLP headhunting desk.
          Acknowledgements are filed to your primary contact.
        </span>
        <div style={{ display: "flex", gap: "var(--s-3)" }}>
          <span className="lf-meta">Foundation v1.9</span>
          <span className="lf-meta">Universe v2.0</span>
        </div>
      </motion.div>
    </MotionConfig>
  );
}
