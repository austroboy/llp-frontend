"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useAccountType } from "@/components/providers/account-context";
import { api } from "@convex/_generated/api";
import {
  Bell,
  Search,
  ArrowRight,
  FileText,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, type CSSProperties } from "react";
import { motion, MotionConfig, type Variants } from "framer-motion";
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

const hairlineGrid = (cols: number): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  gap: "1px",
  background: "var(--glass-border)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--r-lg)",
  overflow: "hidden",
});

const hairlineCell: CSSProperties = {
  background: "var(--glass-bg)",
  padding: "var(--s-4)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--s-2)",
  textDecoration: "none",
  transition: "background 200ms cubic-bezier(0.16,1,0.3,1)",
};

export default function MemberDashboardPage() {
  const { user } = useUser();
  const { isOrgUser } = useAccountType();
  const router = useRouter();
  const userId = user?.id;

  useEffect(() => {
    if (isOrgUser) router.replace("/org");
  }, [isOrgUser, router]);

  const shouldQuery = !!userId && !isOrgUser;
  const expert = useQuery(
    api.experts.getByClerkId,
    shouldQuery ? { clerkId: userId! } : "skip"
  );
  const scoutProfile = useQuery(
    api.headhunting.scoutProfiles.getByUser,
    shouldQuery ? { clerkId: userId! } : "skip"
  );
  const requests = useQuery(
    api.personalServiceRequests.listByUser,
    shouldQuery ? { userId: userId!, limit: 5 } : "skip"
  );
  const notifications = useQuery(
    api.notifications.getByUser,
    shouldQuery
      ? { userId: userId!, accountType: "personal" as const, limit: 5 }
      : "skip"
  );

  const [notifyOpen, setNotifyOpen] = useState(false);
  const notifyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!notifyOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!notifyRef.current?.contains(e.target as Node)) setNotifyOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [notifyOpen]);

  if (isOrgUser) return null;

  const firstName =
    user?.firstName ||
    (user?.fullName ? user.fullName.split(" ")[0] : null) ||
    "Member";

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const openRequests =
    requests?.filter((r) => r.status !== "closed").length ?? 0;
  const totalRequests = requests?.length ?? 0;
  const awaitingMe =
    requests?.filter((r) => r.status === "awaiting_input").length ?? 0;
  const scoutStatus = scoutProfile?.status ?? "not_started";
  const expertStatus = expert?.status ?? "not_started";
  const hasExpert = !!expert;

  const expertStatusLabel: Record<string, string> = {
    published: "Active",
    archived: "Archived",
    draft: "Draft",
    not_started: "Not started",
  };
  const scoutStatusLabel: Record<string, string> = {
    approved: "Approved",
    submitted: "Under review",
    pending: "Under review",
    draft: "Draft",
    not_started: "Not started",
  };

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

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
          Personal Desk · {today} ·{" "}
          <Link
            href="/org"
            style={{
              fontFamily: "var(--lf-display)",
              fontStyle: "italic",
              fontWeight: 600,
              color: "var(--accent-blue)",
              textDecoration: "none",
              marginLeft: "4px",
            }}
          >
            Switch to Organization →
          </Link>
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
          Welcome back,{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            {firstName}.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          {totalRequests > 0
            ? `${openRequests} open request${openRequests === 1 ? "" : "s"}, ${awaitingMe} awaiting your input.`
            : "Your requests, profiles, and dispatches — filed in one place."}
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
          <Link href="/chat" className="lf-cta lf-cta--primary">
            Ask LLP
            <ArrowRight size={14} style={{ marginLeft: 8 }} />
          </Link>
          <Link href="/dashboard/requests" className="lf-cta lf-cta--ghost">
            Open requests · {openRequests}
          </Link>
          <div ref={notifyRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="lf-icon-btn"
              aria-label="Notifications"
              aria-expanded={notifyOpen}
              onClick={() => setNotifyOpen((v) => !v)}
              style={{ position: "relative" }}
            >
              <Bell size={14} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: "var(--rust)",
                  }}
                />
              )}
            </button>
            {notifyOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="lf-dropdown"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 320,
                  zIndex: 50,
                  padding: "var(--s-2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--s-2) var(--s-3)",
                    borderBottom: "1px solid var(--line-1)",
                  }}
                >
                  <span
                    className="lf-meta"
                    style={{ textTransform: "uppercase" }}
                  >
                    Notifications
                  </span>
                  <button
                    type="button"
                    className="lf-clear-btn"
                    onClick={() => setNotifyOpen(false)}
                  >
                    × Close
                  </button>
                </div>
                <div style={{ maxHeight: 360, overflow: "auto" }}>
                  {notifications && notifications.length > 0 ? (
                    notifications.map((n) => (
                      <Link
                        key={n._id}
                        href={n.targetUrl ?? "#"}
                        className="lf-dropdown-item"
                        onClick={() => setNotifyOpen(false)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          padding: "var(--s-3)",
                          textDecoration: "none",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--lf-display)",
                            fontWeight: 500,
                            color: "var(--ink)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {!n.read && (
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 999,
                                background: "var(--rust)",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          {n.title}
                        </span>
                        {n.summary && (
                          <span
                            className="lf-body"
                            style={{ fontSize: 13, color: "var(--ink-3)" }}
                          >
                            {n.summary}
                          </span>
                        )}
                        <span className="lf-meta">
                          {new Date(n._creationTime).toLocaleDateString()}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <div
                      style={{ padding: "var(--s-4)", textAlign: "center" }}
                    >
                      <span className="lf-meta">
                        Updates from LLP will appear here.
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
          <Link
            href="/chat"
            className="lf-cta lf-cta--ghost"
            aria-label="Search"
          >
            <Search size={14} style={{ marginRight: 6 }} />
            Search
            <kbd
              style={{
                marginLeft: 8,
                padding: "2px 6px",
                background: "var(--paper-inner)",
                border: "1px solid var(--line-2)",
                borderRadius: 4,
                fontFamily: "var(--lf-mono)",
                fontSize: 10,
              }}
            >
              ⌘K
            </kbd>
          </Link>
        </motion.div>
      </motion.section>

      {/* -- Hairline summary 4-up -------------------------------- */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ ...hairlineGrid(4), marginBottom: "var(--s-7)" }}
      >
        {[
          {
            href: "/chat",
            label: "Ask LLP",
            value: "∞",
            unit: "questions",
            note: (
              <>
                Search the indexed labour-law universe.{" "}
                <strong>EN · BN</strong>.
              </>
            ),
          },
          {
            href: "/dashboard/requests",
            label: "Open requests",
            value: String(openRequests),
            unit: "in progress",
            note:
              awaitingMe > 0 ? (
                <>
                  <strong>{awaitingMe} awaiting</strong> your input.
                </>
              ) : (
                <>None awaiting your input.</>
              ),
          },
          {
            href: "/dashboard/academy",
            label: "Path progress",
            value: "0",
            unit: "/ 5 sessions",
            note: (
              <>
                Begin <strong>Session 1 · Sort</strong> to start your Path.
              </>
            ),
          },
          {
            href: "/dashboard/resources",
            label: "Audits completed",
            value: "0",
            unit: "reports",
            note: (
              <>
                Run a <strong>Self-Audit</strong> to surface compliance risks.
              </>
            ),
          },
        ].map((s) => (
          <motion.div key={s.label} variants={fadeUp}>
            <Link href={s.href} style={{ ...hairlineCell, height: "100%" }}>
              <span className="lf-meta" style={{ textTransform: "uppercase" }}>
                {s.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 32,
                  fontWeight: 400,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                {s.value}
                <span
                  style={{
                    fontFamily: "var(--lf-mono)",
                    fontSize: 11,
                    fontWeight: 400,
                    color: "var(--ink-4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {s.unit}
                </span>
              </span>
              <span
                className="lf-body"
                style={{ fontSize: 13, color: "var(--ink-3)" }}
              >
                {s.note}
              </span>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* -- Your next steps ------------------------------------- */}
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
            Your next steps
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            Three doors <em>to begin.</em>
          </h2>
          <p className="lf-section-deck">
            Pick one. Each produces a saved artifact in your Library.
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--s-4)",
          }}
        >
          <motion.div variants={fadeUp}>
            <Link
              href="/dashboard/academy"
              className="lf-card lf-card--feature lf-card--hover"
              style={{
                display: "block",
                height: "100%",
                textDecoration: "none",
                position: "relative",
              }}
            >
              <span
                className="lf-meta lf-meta--accent"
                style={{ textTransform: "uppercase" }}
              >
                ● Continue · 5S Foundation
              </span>
              <h3
                className="lf-h3"
                style={{ margin: "var(--s-3) 0 var(--s-2)" }}
              >
                Begin <em>Session 1 · Sort.</em>
              </h3>
              <p
                className="lf-body"
                style={{ color: "var(--ink-3)", marginBottom: "var(--s-4)" }}
              >
                Map applicability of one labour-law topic to your business.
                ~30 minutes. Produces a saved decision tree.
              </p>
              <span className="lf-meta">
                First session <strong>free</strong> →
              </span>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Link
              href="/dashboard/requests"
              className="lf-card lf-card--hover"
              style={{
                display: "block",
                height: "100%",
                textDecoration: "none",
                padding: "var(--s-5)",
              }}
            >
              <span
                className="lf-meta"
                style={{ textTransform: "uppercase" }}
              >
                My Requests
              </span>
              <h3
                className="lf-h3"
                style={{ margin: "var(--s-3) 0 var(--s-2)" }}
              >
                Track work <em>open with LLP.</em>
              </h3>
              <p
                className="lf-body"
                style={{ color: "var(--ink-3)", marginBottom: "var(--s-4)" }}
              >
                Review status, exchange documents, and move requests through
                their procedural stages.
              </p>
              <span className="lf-meta">
                {openRequests} open ·{" "}
                <strong>
                  {Math.max(totalRequests - openRequests, 0)} closed
                </strong>{" "}
                →
              </span>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Link
              href="/chat"
              className="lf-card lf-card--hover"
              style={{
                display: "block",
                height: "100%",
                textDecoration: "none",
                padding: "var(--s-5)",
              }}
            >
              <span
                className="lf-meta"
                style={{ textTransform: "uppercase" }}
              >
                Ask LLP
              </span>
              <h3
                className="lf-h3"
                style={{ margin: "var(--s-3) 0 var(--s-2)" }}
              >
                Ask a question <em>in your own words.</em>
              </h3>
              <p
                className="lf-body"
                style={{ color: "var(--ink-3)", marginBottom: "var(--s-4)" }}
              >
                A clear answer first, the section cited, the requirements
                listed, the law one click away.
              </p>
              <span className="lf-meta">
                Cited from <strong>9 indexed instruments</strong> →
              </span>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* -- From LLP editorial ---------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        viewport={inViewOnce}
        className="lf-card"
        style={{
          marginBottom: "var(--s-7)",
          padding: "var(--s-5) var(--s-6)",
          background: "var(--accent-blue-ghost)",
          borderLeft: "2px solid var(--accent-blue)",
          borderRadius: "var(--r-md)",
        }}
      >
        <span
          className="lf-meta lf-meta--accent"
          style={{
            textTransform: "uppercase",
            display: "block",
            marginBottom: "var(--s-2)",
          }}
        >
          From LLP
        </span>
        <p
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: 22,
            fontWeight: 400,
            fontStyle: "italic",
            lineHeight: 1.4,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
            margin: 0,
          }}
        >
          Bangladesh Labour (Amendment) Act, 2026 supersedes the 2025
          Ordinance.{" "}
          <strong style={{ fontStyle: "normal", fontWeight: 600 }}>
            9 instruments now indexed
          </strong>{" "}
          — DOC-011 live, DOC-006 retained for historical queries only.
        </p>
      </motion.div>

      {/* -- Your modules ---------------------------------------- */}
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
            <span className="lf-kicker-mark">§ III</span>
            Your modules
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            What's <em>active.</em>
          </h2>
          <p className="lf-section-deck">
            Each module produces saved artifacts. Open any for detail.
          </p>
        </motion.div>

        {/* Active Path feature card */}
        <motion.div
          variants={fadeUp}
          className="lf-card lf-card--feature"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "var(--s-5)",
            alignItems: "start",
            marginBottom: "var(--s-4)",
          }}
        >
          <div>
            <span
              className="lf-meta lf-meta--accent"
              style={{ textTransform: "uppercase" }}
            >
              ● Active Path · 5S Foundation
            </span>
            <h3 className="lf-h3" style={{ margin: "var(--s-3) 0 var(--s-2)" }}>
              LLP Path <em>· start your first session.</em>
            </h3>
            <p
              className="lf-body"
              style={{ color: "var(--ink-3)", marginBottom: "var(--s-4)" }}
            >
              Five sessions per topic. The first session is free and produces
              an Applicability Decision Tree saved to your library.
              Subsequent sessions unlock the full readiness scorecard.
            </p>
            <div
              style={{
                display: "flex",
                gap: "var(--s-4)",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Link href="/dashboard/academy" className="lf-cta lf-cta--primary">
                Open LLP Path
                <ArrowRight size={14} style={{ marginLeft: 8 }} />
              </Link>
              <span className="lf-meta">
                Methodology · <strong>5S Foundation</strong> · Artifacts ·{" "}
                <strong>0 of 5</strong>
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--s-2)",
              minWidth: 80,
            }}
          >
            <div style={{ position: "relative", width: 60, height: 60 }}>
              <svg viewBox="0 0 60 60" width="60" height="60">
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="none"
                  stroke="var(--line-2)"
                  strokeWidth={3}
                />
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="none"
                  stroke="var(--accent-blue)"
                  strokeWidth={3}
                  strokeDasharray="0 163.36"
                  strokeLinecap="round"
                  transform="rotate(-90 30 30)"
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--lf-display)",
                  fontSize: 16,
                  color: "var(--ink)",
                }}
              >
                0<span style={{ fontSize: 11, color: "var(--ink-4)" }}>/5</span>
              </div>
            </div>
            <span className="lf-meta" style={{ textTransform: "uppercase" }}>
              Sessions
            </span>
          </div>
        </motion.div>

        {/* 4-up module grid (hairline) */}
        <motion.div variants={fadeUp} style={hairlineGrid(2)}>
          {[
            {
              title: "Ask LLP",
              status: "active" as const,
              statusLabel: "Active",
              stats: [
                { val: "9", label: "Instruments" },
                { val: "EN · BN", label: "Languages" },
                { val: "100%", label: "Citation rate" },
              ],
              detail:
                "Ask in your own words. Every answer cites its primary section and links to the law itself.",
              cta: "Open Ask LLP",
              href: "/chat",
              tip: "First question free",
            },
            {
              title: "My Requests",
              status: (openRequests > 0 ? "active" : "idle") as
                | "active"
                | "idle",
              statusLabel: openRequests > 0 ? `${openRequests} open` : "Idle",
              stats: [
                { val: String(openRequests), label: "In progress" },
                { val: String(awaitingMe), label: "Awaiting you" },
                {
                  val: String(Math.max(totalRequests - openRequests, 0)),
                  label: "Closed",
                },
              ],
              detail:
                requests && requests.length > 0
                  ? `Latest: ${requests[0].subject}`
                  : "Submit a service request to begin a procedural file.",
              cta: "Open tracker",
              href: "/dashboard/requests",
              tip: "Single lead per request",
            },
            {
              title: "Scout profile · Headhunting",
              status: (scoutStatus === "approved" ? "active" : "off") as
                | "active"
                | "off",
              statusLabel: scoutStatusLabel[scoutStatus] ?? scoutStatus,
              stats: [
                {
                  val: scoutStatus === "not_started" ? "Inactive" : "Active",
                  label: "Profile state",
                },
              ],
              detail:
                "Source talent and earn placement fees on confirmed hires. Visibility curated to your declared scope.",
              cta:
                scoutStatus === "approved"
                  ? "Open scout workspace"
                  : "Join as scout",
              href:
                scoutStatus === "approved"
                  ? "/dashboard/headhunting"
                  : "/headhunting/scout/join",
              tip: "Scope-based mandate release",
            },
            {
              title: "Expert profile · Marketplace",
              status: (hasExpert && expertStatus === "published"
                ? "active"
                : "off") as "active" | "off",
              statusLabel: expertStatusLabel[expertStatus] ?? expertStatus,
              stats: [
                {
                  val: hasExpert ? "Active" : "Incomplete",
                  label: "Profile state",
                },
              ],
              detail:
                "Get discovered as a subject-matter expert. Paid review jobs when your area matches an incoming request.",
              cta: hasExpert ? "Manage profile" : "Apply as expert",
              href: hasExpert ? "/dashboard/expert" : "/experts/apply",
              tip: "~15 minutes to complete",
            },
          ].map((m) => (
            <div
              key={m.title}
              style={{
                ...hairlineCell,
                gap: "var(--s-3)",
                padding: "var(--s-5)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "var(--s-3)",
                }}
              >
                <h3
                  className="lf-h3"
                  style={{ margin: 0, fontSize: 18 }}
                >
                  {m.title}
                </h3>
                <span
                  className={cn(
                    "lf-status",
                    m.status === "active" && "lf-status--live",
                    m.status === "idle" && "lf-status--busy",
                    m.status === "off" && "lf-status--off"
                  )}
                >
                  <span className="lf-status-dot" />
                  {m.statusLabel}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "var(--s-4)",
                  flexWrap: "wrap",
                }}
              >
                {m.stats.map((s) => (
                  <div
                    key={s.label}
                    style={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--lf-display)",
                        fontSize: 22,
                        color: "var(--ink)",
                      }}
                    >
                      {s.val}
                    </span>
                    <span className="lf-meta">{s.label}</span>
                  </div>
                ))}
              </div>
              <p
                className="lf-body"
                style={{
                  color: "var(--ink-3)",
                  fontSize: 13,
                  margin: 0,
                  flex: 1,
                }}
              >
                {m.detail}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--s-3)",
                  paddingTop: "var(--s-2)",
                  borderTop: "1px solid var(--line-1)",
                }}
              >
                <Link href={m.href} className="lf-cta lf-cta--ghost">
                  {m.cta}
                  <ArrowRight size={12} style={{ marginLeft: 6 }} />
                </Link>
                <span className="lf-meta">{m.tip}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.section>

      {/* -- Recent activity ------------------------------------- */}
      {((requests && requests.length > 0) ||
        (notifications && notifications.length > 0)) && (
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
            style={{ marginBottom: "var(--s-4)" }}
          >
            <div className="lf-kicker">
              <span className="lf-kicker-mark">§ IV</span>
              Recent activity
            </div>
            <h2
              className="lf-h2"
              style={{ marginTop: "var(--s-2)", fontSize: 32 }}
            >
              The last <em>five threads.</em>
            </h2>
          </motion.div>

          <motion.div
            variants={fadeUp}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              background: "var(--glass-border)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--r-lg)",
              overflow: "hidden",
            }}
          >
            {requests?.slice(0, 3).map((req) => (
              <Link
                key={req._id}
                href="/dashboard/requests"
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: "var(--s-3)",
                  alignItems: "center",
                  padding: "var(--s-4)",
                  background: "var(--glass-bg)",
                  textDecoration: "none",
                  transition: "background 200ms",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: "var(--paper-inner)",
                    border: "1px solid var(--line-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-blue)",
                  }}
                >
                  <FileText size={14} />
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontSize: 15,
                      color: "var(--ink)",
                    }}
                  >
                    {req.subject}
                  </span>
                  <span className="lf-meta">
                    {req.category} · {req.status}
                  </span>
                </div>
                <span className="lf-meta">
                  {new Date(req.updatedAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
            {notifications?.slice(0, 2).map((n) => (
              <Link
                key={n._id}
                href={n.targetUrl ?? "#"}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: "var(--s-3)",
                  alignItems: "center",
                  padding: "var(--s-4)",
                  background: "var(--glass-bg)",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: "var(--paper-inner)",
                    border: "1px solid var(--line-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--bronze)",
                  }}
                >
                  <Bell size={14} />
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontSize: 15,
                      color: "var(--ink)",
                    }}
                  >
                    {n.title}
                  </span>
                  {n.summary && (
                    <span className="lf-meta">{n.summary}</span>
                  )}
                </div>
                <span className="lf-meta">
                  {new Date(n._creationTime).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </motion.div>
        </motion.section>
      )}

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
          Your Desk. Everything saved here is yours. Organization activity
          stays separate in your <strong>Organization Desk</strong> if
          applicable.
        </span>
        <div
          style={{
            display: "flex",
            gap: "var(--s-3)",
          }}
        >
          <span className="lf-meta">Foundation v1.9</span>
          <span className="lf-meta">Universe v2.0</span>
        </div>
      </motion.div>

      {/* -- Floating Ask LLP FAB -------------------------------- */}
      <Link
        href="/chat"
        className="lf-cta lf-cta--primary"
        aria-label="Open Ask LLP"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 999,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 40,
        }}
      >
        <MessageSquare size={20} />
      </Link>
    </MotionConfig>
  );
}
