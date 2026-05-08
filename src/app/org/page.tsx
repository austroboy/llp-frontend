"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  ArrowRight,
  Briefcase,
  FileText,
  Headphones,
  FolderOpen,
  BookOpen,
  GraduationCap,
  CreditCard,
  Building2,
  Megaphone,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { type CSSProperties } from "react";
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

type LedgerSpec = {
  label: string;
  value: string;
  unit: string;
  hint: string;
};

export default function OrgDashboardPage() {
  const { user } = useUser();
  const orgData = useQuery(api.organizations.getByCreator, {
    clerkId: user?.id ?? "",
  });
  const orgName =
    (user?.publicMetadata as { orgName?: string })?.orgName ||
    orgData?.name ||
    "Your Organization";

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const stats: LedgerSpec[] = [
    { label: "Hiring — Open", value: "0", unit: "in review", hint: "requests filed" },
    { label: "Mandates", value: "0", unit: "under sourcing", hint: "active briefs" },
    { label: "Service Desk", value: "0", unit: "open tickets", hint: "across desks" },
    { label: "Actions", value: "0", unit: "pending you", hint: "awaiting input" },
    { label: "Outstanding", value: "৳0", unit: "invoices due", hint: "settlement" },
  ];

  const quickDoors: Array<{
    title: string;
    body: string;
    cta: string;
    href: string;
    feature?: boolean;
  }> = [
    {
      title: "Hiring",
      body: "Submit roles and review LLP shortlists as they arrive.",
      cta: "Open hiring",
      href: "/org/hiring",
      feature: true,
    },
    {
      title: "Mandates",
      body: "Track sourcing briefs, shortlists, and clarifications in one thread.",
      cta: "Open mandates",
      href: "/org/mandates",
    },
    {
      title: "Service Desk",
      body: "Compliance, expatriate, HR, and licensing work — one log.",
      cta: "Open service desk",
      href: "/org/services",
    },
  ];

  const surfaces: Array<{ title: string; body: string; href: string }> = [
    {
      title: "Documents",
      body: "Uploaded briefs, contracts, and delivered materials for the org.",
      href: "/org/documents",
    },
    {
      title: "Resources",
      body: "Templates, SOPs, and tools for compliance and HR operations.",
      href: "/org/resources",
    },
    {
      title: "Academy",
      body: "Training programmes for your team — labour law, compliance, HR.",
      href: "/org/academy",
    },
    {
      title: "Billing",
      body: "Invoices, settlements, and finance coordination.",
      href: "/org/billing",
    },
    {
      title: "Organization Profile",
      body: "Company information, primary contact, and billing details.",
      href: "/org/profile",
    },
  ];

  const surfaceIcons: Record<string, React.ComponentType<{ size?: number }>> = {
    Documents: FolderOpen,
    Resources: BookOpen,
    Academy: GraduationCap,
    Billing: CreditCard,
    "Organization Profile": Building2,
  };

  const doorIcons: Record<string, React.ComponentType<{ size?: number }>> = {
    Hiring: Briefcase,
    Mandates: FileText,
    "Service Desk": Headphones,
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
        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ I</span>
          Organization Desk · {today} ·{" "}
          <Link
            href="/dashboard"
            style={{
              fontFamily: "var(--lf-display)",
              fontStyle: "italic",
              fontWeight: 600,
              color: "var(--accent-blue)",
              textDecoration: "none",
              marginLeft: "4px",
            }}
          >
            Switch to Personal →
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
          Welcome,{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            {orgName}.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          Hiring, service desk, documents, and activity with LLP — filed in one
          procedural record. The clauses below proceed in sequence.
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
            <UserPlus size={14} style={{ marginRight: 8 }} />
            New hiring request
            <ArrowRight size={14} style={{ marginLeft: 8 }} />
          </Link>
          <Link href="/org/services" className="lf-cta lf-cta--ghost">
            <Headphones size={14} style={{ marginRight: 8 }} />
            New service request
          </Link>
          <Link href="/org/mandates" className="lf-cta lf-cta--ghost">
            Open mandates
          </Link>
        </motion.div>
      </motion.section>

      {/* -- Hairline summary 5-up -------------------------------- */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ ...hairlineGrid(5), marginBottom: "var(--s-7)" }}
      >
        {stats.map((s) => (
          <motion.div key={s.label} variants={fadeUp}>
            <div style={{ ...hairlineCell, height: "100%" }}>
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
                {s.hint}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* -- Quick doors ---------------------------------------- */}
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
            Quick doors
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            Three doors <em>to begin.</em>
          </h2>
          <p className="lf-section-deck">
            File a request, track a brief, or reach the LLP service desk.
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--s-4)",
          }}
        >
          {quickDoors.map((d) => {
            const Icon = doorIcons[d.title];
            return (
              <motion.div key={d.title} variants={fadeUp}>
                <Link
                  href={d.href}
                  className={
                    d.feature
                      ? "lf-card lf-card--feature lf-card--hover"
                      : "lf-card lf-card--hover"
                  }
                  style={{
                    display: "block",
                    height: "100%",
                    textDecoration: "none",
                    padding: d.feature ? undefined : "var(--s-5)",
                  }}
                >
                  <span
                    className={
                      d.feature
                        ? "lf-meta lf-meta--accent"
                        : "lf-meta"
                    }
                    style={{
                      textTransform: "uppercase",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {Icon && <Icon size={12} />}
                    {d.feature ? "● " : ""}
                    {d.title}
                  </span>
                  <h3
                    className="lf-h3"
                    style={{ margin: "var(--s-3) 0 var(--s-2)" }}
                  >
                    {d.body.split(" ").slice(0, 4).join(" ")}{" "}
                    <em>{d.body.split(" ").slice(4).join(" ")}</em>
                  </h3>
                  <span className="lf-meta">
                    {d.cta} →
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* -- Work surfaces -------------------------------------- */}
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
            Work surfaces
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            Everything <em>else.</em>
          </h2>
          <p className="lf-section-deck">
            Documents, resources, academy, billing, and organization profile.
          </p>
        </motion.div>

        <motion.div variants={fadeUp} style={hairlineGrid(2)}>
          {surfaces.map((s) => {
            const Icon = surfaceIcons[s.title];
            return (
              <Link
                key={s.title}
                href={s.href}
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
                    style={{
                      margin: 0,
                      fontSize: 18,
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--s-2)",
                    }}
                  >
                    {Icon && <Icon size={16} />}
                    {s.title}
                  </h3>
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
                  {s.body}
                </p>
                <span
                  className="lf-meta"
                  style={{
                    paddingTop: "var(--s-2)",
                    borderTop: "1px solid var(--line-1)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Open →
                </span>
              </Link>
            );
          })}
        </motion.div>
      </motion.section>

      {/* -- Dispatch from LLP ---------------------------------- */}
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
            Dispatch from LLP
          </div>
          <h2
            className="lf-h2"
            style={{ marginTop: "var(--s-2)", fontSize: 32 }}
          >
            Bulletins <em>and advisories.</em>
          </h2>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="lf-card"
          style={{
            padding: "var(--s-6)",
            border: "1px dashed var(--glass-border)",
            background: "var(--glass-bg)",
            borderRadius: "var(--r-md)",
            textAlign: "center",
          }}
        >
          <Megaphone
            size={20}
            style={{ color: "var(--ink-4)", marginBottom: "var(--s-2)" }}
          />
          <p
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: 18,
              fontStyle: "italic",
              color: "var(--ink-3)",
              margin: "0 0 var(--s-2)",
            }}
          >
            No dispatches at this time.
          </p>
          <span className="lf-meta">
            Bulletins, advisories, and platform notes from the LLP team surface
            here.
          </span>
        </motion.div>
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
          Organization Desk. Activity here is filed under{" "}
          <strong>{orgName}</strong>. Personal activity stays separate in your
          Personal Desk.
        </span>
        <div style={{ display: "flex", gap: "var(--s-3)" }}>
          <span className="lf-meta">Foundation v1.9</span>
          <span className="lf-meta">Universe v2.0</span>
          <span className="lf-meta">
            Filed · {new Date().toLocaleDateString()}
          </span>
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
