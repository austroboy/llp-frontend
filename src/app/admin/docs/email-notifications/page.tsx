"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Crosshair,
  Search,
  UserCheck,
  Briefcase,
  Newspaper,
  User,
  ShieldCheck,
  LogIn,
  Library,
  Share2,
  Bell,
  ChevronDown,
  ChevronRight,
  Mail,
} from "lucide-react";
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

type Status = "implemented" | "in_progress" | "pending";
type Priority = "critical" | "high" | "medium" | "low";

interface NotificationEvent {
  event: string;
  recipient: string;
  status: Status;
  notificationType?: string;
}

interface FeatureArea {
  id: string;
  name: string;
  icon: typeof Crosshair;
  priority: Priority;
  events: NotificationEvent[];
}

const featureAreas: FeatureArea[] = [
  {
    id: "headhunting",
    name: "Headhunting Ecosystem",
    icon: Crosshair,
    priority: "critical",
    events: [
      // Mandate lifecycle
      { event: "Mandate created/received", recipient: "Assigned team lead", status: "implemented", notificationType: "mandate_created" },
      { event: "Mandate status change (each stage)", recipient: "Client + internal stakeholders", status: "implemented", notificationType: "mandate_status_changed" },
      { event: "Mandate moved to clarification", recipient: "Original requester", status: "implemented", notificationType: "mandate_clarification" },
      { event: "Mandate released to scouts", recipient: "Matched scouts", status: "implemented", notificationType: "mandate_released" },
      { event: "Mandate filled/paused/closed", recipient: "Assigned scouts + team lead", status: "implemented", notificationType: "mandate_closed" },
      // Brief releases
      { event: "Brief released to scout", recipient: "Scout", status: "implemented", notificationType: "brief_released" },
      { event: "Brief expiring soon (7 days)", recipient: "Admin (reminder)", status: "implemented", notificationType: "cron/headhunting-alerts" },
      // Submissions
      { event: "New submission from scout", recipient: "Scout (ack) + assignment team", status: "implemented", notificationType: "submission_received" },
      { event: "AI assessment completed", recipient: "Team with match results", status: "implemented", notificationType: "mandate_status_changed" },
      { event: "Submission status changed (shortlisted/rejected)", recipient: "Scout", status: "implemented", notificationType: "submission_status_changed" },
      // Placements
      { event: "Placement created (offer accepted)", recipient: "Scout/partner", status: "implemented", notificationType: "placement_created" },
      { event: "Candidate joined — invoice trigger", recipient: "Scout/partner with fee details", status: "implemented", notificationType: "placement_joined" },
      { event: "Payment/payout released", recipient: "Scout/partner", status: "implemented", notificationType: "payout_released" },
      { event: "Protection window expiring (30 days)", recipient: "Admin", status: "implemented", notificationType: "cron/headhunting-alerts" },
      { event: "Replacement triggered", recipient: "Client + assignment team + scout", status: "implemented", notificationType: "replacement_triggered" },
      // Collab partners
      { event: "Partner status changed", recipient: "Partner + account manager", status: "implemented", notificationType: "mandate_status_changed" },
    ],
  },
  {
    id: "jobs",
    name: "Job Search & Alerts",
    icon: Search,
    priority: "critical",
    events: [
      { event: "Job alert created", recipient: "User (confirmation)", status: "implemented", notificationType: "job_alert_created" },
      { event: "New jobs match alert filters (digest)", recipient: "User (daily/weekly)", status: "implemented", notificationType: "cron/job-alerts" },
      { event: "Saved job approaching deadline", recipient: "User (reminder)", status: "implemented", notificationType: "cron/job-alerts" },
      { event: "Weekly AI job recommendations", recipient: "User (personalized)", status: "implemented", notificationType: "cron/job-alerts (Fri)" },
      { event: "High-match job found", recipient: "User (instant)", status: "implemented", notificationType: "cron/job-alerts/high-match" },
    ],
  },
  {
    id: "experts",
    name: "Expert & Consultation",
    icon: UserCheck,
    priority: "high",
    events: [
      { event: "Expert application received", recipient: "Applicant + admin", status: "implemented", notificationType: "expert_application_submitted" },
      { event: "Expert application status update", recipient: "Applicant", status: "implemented", notificationType: "expert_status_updated" },
      { event: "Expert profile published", recipient: "Expert", status: "implemented", notificationType: "expert_profile_published" },
      { event: "Expert badge awarded", recipient: "Expert", status: "implemented", notificationType: "expert_badge_awarded" },
      { event: "Expert assigned to consultation", recipient: "Expert", status: "implemented", notificationType: "consultation_connected" },
      { event: "Consultation request created", recipient: "Requester + admin", status: "implemented", notificationType: "consultation_created" },
      { event: "Consultation connected", recipient: "Requester (with expert contact)", status: "implemented", notificationType: "consultation_connected" },
      { event: "Consultation completed", recipient: "Requester (feedback request)", status: "implemented", notificationType: "consultation_completed" },
    ],
  },
  {
    id: "services",
    name: "Services & Requests",
    icon: Briefcase,
    priority: "high",
    events: [
      { event: "Service request created", recipient: "Requester + admin", status: "implemented", notificationType: "service_request_created" },
      { event: "Service request status change", recipient: "User (each stage)", status: "implemented", notificationType: "service_status_updated" },
      { event: "Service ready/completed", recipient: "User", status: "implemented", notificationType: "service_status_updated" },
      { event: "Service completion feedback request", recipient: "User", status: "implemented", notificationType: "service_status_updated" },
    ],
  },
  {
    id: "blog",
    name: "Blog & Content",
    icon: Newspaper,
    priority: "medium",
    events: [
      { event: "Blog post submitted for review", recipient: "Admin", status: "implemented", notificationType: "blog_submitted_for_review" },
      { event: "Blog post approved/published", recipient: "Author", status: "implemented", notificationType: "blog_post_published" },
      { event: "New post in interest category (digest)", recipient: "Subscribers", status: "pending" },
      { event: "Blog post comment added", recipient: "Author", status: "pending" },
    ],
  },
  {
    id: "profiles",
    name: "Professional Profiles & CV",
    icon: User,
    priority: "medium",
    events: [
      { event: "Profile completed", recipient: "User (congratulations)", status: "implemented", notificationType: "profile_completed" },
      { event: "Profile completion milestones (50%, 75%)", recipient: "User (encouragement)", status: "implemented", notificationType: "profile_milestone" },
      { event: "CV enhanced/generated", recipient: "User (download link)", status: "implemented", notificationType: "cv_generated" },
      { event: "Profile improvement suggestions", recipient: "User", status: "pending" },
    ],
  },
  {
    id: "approvals",
    name: "Approval Workflows",
    icon: ShieldCheck,
    priority: "medium",
    events: [
      { event: "Approval request created", recipient: "Assigned reviewer", status: "implemented", notificationType: "blog_submitted_for_review" },
      { event: "Approval decision made", recipient: "Requester", status: "implemented", notificationType: "blog_post_published" },
      { event: "Approval overdue", recipient: "Escalation to admin", status: "implemented", notificationType: "cron/overdue-alerts" },
    ],
  },
  {
    id: "onboarding",
    name: "Onboarding & Auth",
    icon: LogIn,
    priority: "medium",
    events: [
      { event: "User signs up", recipient: "New user (welcome)", status: "implemented", notificationType: "welcome" },
      { event: "User role changed (admin/expert/scout)", recipient: "User (role-specific)", status: "implemented", notificationType: "webhooks/clerk" },
      { event: "Inactive user (30+ days)", recipient: "User (re-engagement)", status: "implemented", notificationType: "cron/overdue-alerts" },
      { event: "Profile first completed", recipient: "User (feature intro)", status: "implemented", notificationType: "profile_completed" },
    ],
  },
  {
    id: "resources",
    name: "Resource Centre",
    icon: Library,
    priority: "low",
    events: [
      { event: "Resource published", recipient: "Admin notification", status: "implemented", notificationType: "resource_published" },
      { event: "Resource updated", recipient: "Users who bookmarked", status: "pending" },
      { event: "New resource recommendation", recipient: "User", status: "pending" },
    ],
  },
  {
    id: "sharing",
    name: "Sharing & Export",
    icon: Share2,
    priority: "low",
    events: [
      { event: "Shared link expiring", recipient: "Sharer (pre-expiry)", status: "pending" },
      { event: "PDF document exported", recipient: "User (download link)", status: "pending" },
    ],
  },
  {
    id: "digest",
    name: "Notification Digest",
    icon: Bell,
    priority: "low",
    events: [
      { event: "Daily/weekly unread notification digest", recipient: "Users with email pref", status: "pending" },
      { event: "Notification threshold exceeded", recipient: "User (summary)", status: "pending" },
    ],
  },
];

const priorityColors: Record<Priority, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const statusColors: Record<Status, string> = {
  implemented: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export default function EmailNotificationsDocsPage() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(featureAreas.map((a) => a.id))
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Calculate stats
  const totalEvents = featureAreas.reduce((s, a) => s + a.events.length, 0);
  const implementedEvents = featureAreas.reduce(
    (s, a) => s + a.events.filter((e) => e.status === "implemented").length,
    0
  );
  const inProgressEvents = featureAreas.reduce(
    (s, a) => s + a.events.filter((e) => e.status === "in_progress").length,
    0
  );
  const pendingEvents = totalEvents - implementedEvents - inProgressEvents;

  return (
    <MotionConfig reducedMotion="user">
      {/* Hero */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ 5.1</span>
          Admin · Docs · Email notifications
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
            display: "flex",
            alignItems: "center",
            gap: "var(--s-3)",
            flexWrap: "wrap",
          }}
        >
          <Mail size={36} style={{ color: "var(--accent-blue)" }} />
          Email notification <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>system.</em>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: "60ch" }}
        >
          Clause-numbered registry of every email notification opportunity across the LLP Universe platform, with implementation status per event.
        </motion.p>
      </motion.section>

      {/* Stats — hairline 4-up */}
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
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1px",
            background: "var(--glass-border)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--r-lg)",
            overflow: "hidden",
          }}
        >
          {[
            { label: "Total events", value: totalEvents, color: "var(--ink)" },
            { label: "Implemented", value: implementedEvents, color: "var(--emerald)" },
            { label: "In progress", value: inProgressEvents, color: "var(--accent-blue)" },
            { label: "Pending", value: pendingEvents, color: "var(--ink-4)" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--glass-bg)",
                padding: "var(--s-4)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-2)",
              }}
            >
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
                  color: s.color,
                }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.section>

      {/* Progress bar */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-6)" }}
      >
        <motion.div
          variants={fadeUp}
          className="lf-card"
          style={{ padding: "var(--s-4)" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "var(--s-2)",
            }}
          >
            <span className="lf-meta" style={{ textTransform: "uppercase" }}>
              Implementation progress
            </span>
            <span
              className="lf-meta"
              style={{ fontFamily: "var(--lf-mono)", color: "var(--ink)" }}
            >
              {Math.round((implementedEvents / totalEvents) * 100)}%
            </span>
          </div>
          <div
            style={{
              height: 10,
              background: "var(--paper-inner)",
              borderRadius: 999,
              overflow: "hidden",
              display: "flex",
              border: "1px solid var(--line-1)",
            }}
          >
            <div
              style={{
                background: "var(--emerald)",
                width: `${(implementedEvents / totalEvents) * 100}%`,
                transition: "width 200ms cubic-bezier(0.16,1,0.3,1)",
              }}
            />
            <div
              style={{
                background: "var(--accent-blue)",
                width: `${(inProgressEvents / totalEvents) * 100}%`,
                transition: "width 200ms cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          </div>
        </motion.div>
      </motion.section>

      {/* Summary table */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-6)" }}
      >
        <motion.div
          variants={fadeUp}
          className="lf-section-header"
          style={{ marginBottom: "var(--s-4)" }}
        >
          <div className="lf-kicker">
            <span className="lf-kicker-mark">§ 5.1.1</span>
            Per-area summary
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            By <em>feature area.</em>
          </h2>
        </motion.div>
        <motion.div
          variants={fadeUp}
          className="lf-card"
          style={{ overflow: "hidden", padding: 0 }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature Area</TableHead>
                <TableHead className="text-center">Priority</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Done</TableHead>
                <TableHead className="text-center">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {featureAreas.map((area) => {
                const done = area.events.filter((e) => e.status === "implemented").length;
                const pending = area.events.length - done;
                return (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <area.icon className="size-4 text-muted-foreground" />
                        {area.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-[10px]", priorityColors[area.priority])}>
                        {area.priority.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{area.events.length}</TableCell>
                    <TableCell className="text-center text-emerald-600 font-medium">{done}</TableCell>
                    <TableCell className="text-center text-gray-400">{pending}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>
      </motion.section>

      {/* Detailed sections */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-6)" }}
      >
        <motion.div
          variants={fadeUp}
          className="lf-section-header"
          style={{ marginBottom: "var(--s-4)" }}
        >
          <div className="lf-kicker">
            <span className="lf-kicker-mark">§ 5.1.2</span>
            Per-event detail
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            By <em>event.</em>
          </h2>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
          {featureAreas.map((area) => {
            const expanded = expandedSections.has(area.id);
            return (
              <motion.div
                key={area.id}
                variants={fadeUp}
                className="lf-card"
                style={{ overflow: "hidden", padding: 0 }}
              >
                <button
                  onClick={() => toggleSection(area.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--s-3)",
                    padding: "var(--s-4)",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 200ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--glass-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {expanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                  <area.icon className="size-5" style={{ color: "var(--accent-blue)" }} />
                  <span
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontSize: 16,
                      color: "var(--ink)",
                      flex: 1,
                    }}
                  >
                    {area.name}
                  </span>
                  <Badge className={cn("text-[10px]", priorityColors[area.priority])}>
                    {area.priority.toUpperCase()}
                  </Badge>
                  <span
                    className="lf-meta"
                    style={{ marginLeft: "var(--s-2)", fontFamily: "var(--lf-mono)" }}
                  >
                    {area.events.filter((e) => e.status === "implemented").length}/{area.events.length}
                  </span>
                </button>
                {expanded && (
                  <div style={{ borderTop: "1px solid var(--line-1)" }}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Recipient</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead>Notification Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {area.events.map((evt, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{evt.event}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {evt.recipient}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={cn("text-[10px]", statusColors[evt.status])}>
                                {evt.status === "in_progress"
                                  ? "IN PROGRESS"
                                  : evt.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {evt.notificationType || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Implementation notes — editorial pull-quote style */}
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
          Implementation architecture
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-2)",
            fontFamily: "var(--lf-body)",
            fontSize: 14,
            color: "var(--ink-2)",
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Email Provider:</strong> AWS SES via{" "}
            <code
              style={{
                fontFamily: "var(--lf-mono)",
                fontSize: 12,
                background: "var(--paper-inner)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              src/lib/email.ts
            </code>
          </p>
          <p style={{ margin: 0 }}>
            <strong>Notification Dispatcher:</strong>{" "}
            <code
              style={{
                fontFamily: "var(--lf-mono)",
                fontSize: 12,
                background: "var(--paper-inner)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              /api/notifications (POST)
            </code>
          </p>
          <p style={{ margin: 0 }}>
            <strong>Trigger Pattern:</strong> Frontend calls{" "}
            <code
              style={{
                fontFamily: "var(--lf-mono)",
                fontSize: 12,
                background: "var(--paper-inner)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              fetch(&quot;/api/notifications&quot;, &#123; type, ...data &#125;)
            </code>{" "}
            after Convex mutations succeed.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Templates:</strong> All email templates live in{" "}
            <code
              style={{
                fontFamily: "var(--lf-mono)",
                fontSize: 12,
                background: "var(--paper-inner)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              src/lib/email.ts
            </code>{" "}
            with branded HTML layout, info boxes, and CTA buttons.
          </p>
        </div>
      </motion.div>
    </MotionConfig>
  );
}
