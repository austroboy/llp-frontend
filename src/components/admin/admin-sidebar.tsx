"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  LayoutDashboard,
  Newspaper,
  Briefcase,
  MessageSquare,
  Users,
  UserCheck,
  BrainCircuit,
  ShieldCheck,
  Sparkles,
  BarChart3,
  ShieldAlert,
  Crosshair,
  Gauge,
  Lightbulb,
  Library,
  Mail,
  MailPlus,
  UserPlus,
  Send,
  FlaskConical,
  Calculator,
  ChevronDown,
  Check,
  BookOpen,
  Network,
  DollarSign,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence, MotionConfig, type Variants } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { isMasterAdmin } from "@/lib/auth";

interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: string;
  exact?: boolean;
  badge?: { value: string | number; tone?: "default" | "muted" | "warn" };
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const MASTER_ONLY_HREFS = new Set(["/admin/email"]);

/* ──────────────────────────────────────────────────────────────────
 * Cabinet groups — derived from existing navItems in legacy admin
 * sidebar, then flattened (children under headhunting promoted to
 * top-level entries within the Headhunting group). Submenu pattern
 * may return in a follow-up after migration is stable.
 * ────────────────────────────────────────────────────────────── */
const baseGroups: NavGroup[] = [
  {
    label: "Oversight",
    items: [
      { href: "/admin", icon: LayoutDashboard, labelKey: "admin.nav.dashboard", exact: true },
      { href: "/admin/control-tower", icon: Gauge, labelKey: "admin.nav.controlTower" },
      { href: "/admin/approvals", icon: ShieldCheck, labelKey: "admin.nav.approvals" },
      { href: "/admin/users", icon: Users, labelKey: "admin.nav.users" },
      { href: "/admin/op", icon: Briefcase, labelKey: "admin.nav.op" },
      { href: "/admin/analytics", icon: BarChart3, labelKey: "admin.nav.analytics" },
    ],
  },
  {
    label: "Registry",
    items: [
      { href: "/admin/experts", icon: UserCheck, labelKey: "admin.nav.experts" },
      { href: "/admin/services", icon: Briefcase, labelKey: "admin.nav.services" },
      { href: "/admin/consultations", icon: MessageSquare, labelKey: "admin.nav.consultations" },
      { href: "/admin/resources", icon: Library, labelKey: "admin.nav.resources" },
      { href: "/admin/blog", icon: Newspaper, labelKey: "admin.nav.blog" },
    ],
  },
  {
    label: "Headhunting",
    items: [
      { href: "/admin/headhunting", icon: Crosshair, labelKey: "admin.nav.headhunting", exact: true },
      { href: "/admin/headhunting/blueprints", icon: Library, labelKey: "admin.nav.headhunting.blueprints" },
      { href: "/admin/headhunting/scout-groups", icon: UserPlus, labelKey: "admin.nav.headhunting.scoutGroups" },
      { href: "/admin/headhunting/collabs", icon: Network, labelKey: "admin.nav.headhunting.collabs" },
      { href: "/admin/headhunting/revenue", icon: DollarSign, labelKey: "admin.nav.headhunting.revenue" },
      { href: "/admin/headhunting/config", icon: Settings, labelKey: "admin.nav.headhunting.config" },
      { href: "/admin/headhunting/analytics", icon: BarChart3, labelKey: "admin.nav.headhunting.analytics" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/admin/rag", icon: BrainCircuit, labelKey: "admin.nav.rag" },
      { href: "/admin/ai-framework", icon: Sparkles, labelKey: "admin.nav.aiFramework" },
      { href: "/admin/chat-usage", icon: BarChart3, labelKey: "admin.nav.chatUsage" },
      { href: "/admin/citation-audit", icon: ShieldAlert, labelKey: "admin.nav.citationAudit" },
      { href: "/admin/chat-test", icon: FlaskConical, labelKey: "admin.nav.chatTest" },
      { href: "/admin/cost-calculator", icon: Calculator, labelKey: "admin.nav.costCalculator" },
    ],
  },
  {
    label: "Communications",
    items: [
      { href: "/admin/email", icon: Mail, labelKey: "admin.nav.email" },
      { href: "/admin/email-templates", icon: MailPlus, labelKey: "admin.nav.emailTemplates" },
      { href: "/admin/subscribers", icon: UserPlus, labelKey: "admin.nav.subscribers" },
      { href: "/admin/campaigns", icon: Send, labelKey: "admin.nav.campaigns" },
      { href: "/admin/suggestions", icon: Lightbulb, labelKey: "admin.nav.suggestions" },
      { href: "/admin/docs/email-notifications", icon: BookOpen, labelKey: "admin.nav.emailNotifications" },
    ],
  },
];

/* ──────────────────────────────────────────────────────────────────
 * Mobile dock exports — preserved names so admin-layout-client.tsx
 * import contract doesn't change. MobileBottomNav consumer expects
 * { href, icon, labelKey, clause, exact? }.
 * ────────────────────────────────────────────────────────────── */
export const primaryDockItems = [
  { href: "/admin", icon: LayoutDashboard, labelKey: "admin.nav.dashboard", clause: "§ 1.0", exact: true },
  { href: "/admin/blog", icon: Newspaper, labelKey: "admin.nav.blog", clause: "§ 2.5" },
  { href: "/admin/users", icon: Users, labelKey: "admin.nav.users", clause: "§ 1.3" },
  { href: "/admin/experts", icon: UserCheck, labelKey: "admin.nav.experts", clause: "§ 2.1" },
  { href: "/admin/rag", icon: BrainCircuit, labelKey: "admin.nav.rag", clause: "§ 3.1" },
];

export const moreDockItems = [
  { href: "/admin/control-tower", icon: Gauge, labelKey: "admin.nav.controlTower", clause: "§ 1.1" },
  { href: "/admin/approvals", icon: ShieldCheck, labelKey: "admin.nav.approvals", clause: "§ 1.2" },
  { href: "/admin/op", icon: Briefcase, labelKey: "admin.nav.op", clause: "§ 1.5" },
  { href: "/admin/analytics", icon: BarChart3, labelKey: "admin.nav.analytics", clause: "§ 1.4" },
  { href: "/admin/services", icon: Briefcase, labelKey: "admin.nav.services", clause: "§ 2.2" },
  { href: "/admin/consultations", icon: MessageSquare, labelKey: "admin.nav.consultations", clause: "§ 2.3" },
  { href: "/admin/resources", icon: Library, labelKey: "admin.nav.resources", clause: "§ 2.4" },
  { href: "/admin/headhunting", icon: Crosshair, labelKey: "admin.nav.headhunting", clause: "§ 2.6" },
  { href: "/admin/headhunting/blueprints", icon: Library, labelKey: "admin.nav.headhunting.blueprints", clause: "§ 2.6.1" },
  { href: "/admin/headhunting/scout-groups", icon: UserPlus, labelKey: "admin.nav.headhunting.scoutGroups", clause: "§ 2.6.2" },
  { href: "/admin/headhunting/collabs", icon: Network, labelKey: "admin.nav.headhunting.collabs", clause: "§ 2.6.3" },
  { href: "/admin/headhunting/revenue", icon: DollarSign, labelKey: "admin.nav.headhunting.revenue", clause: "§ 2.6.4" },
  { href: "/admin/headhunting/config", icon: Settings, labelKey: "admin.nav.headhunting.config", clause: "§ 2.6.5" },
  { href: "/admin/headhunting/analytics", icon: BarChart3, labelKey: "admin.nav.headhunting.analytics", clause: "§ 2.6.6" },
  { href: "/admin/ai-framework", icon: Sparkles, labelKey: "admin.nav.aiFramework", clause: "§ 3.2" },
  { href: "/admin/chat-usage", icon: BarChart3, labelKey: "admin.nav.chatUsage", clause: "§ 3.3" },
  { href: "/admin/citation-audit", icon: ShieldAlert, labelKey: "admin.nav.citationAudit", clause: "§ 3.4" },
  { href: "/admin/chat-test", icon: FlaskConical, labelKey: "admin.nav.chatTest", clause: "§ 3.5" },
  { href: "/admin/cost-calculator", icon: Calculator, labelKey: "admin.nav.costCalculator", clause: "§ 3.6" },
  { href: "/admin/email", icon: Mail, labelKey: "admin.nav.email", clause: "§ 4.1" },
  { href: "/admin/email-templates", icon: MailPlus, labelKey: "admin.nav.emailTemplates", clause: "§ 4.2" },
  { href: "/admin/subscribers", icon: UserPlus, labelKey: "admin.nav.subscribers", clause: "§ 4.3" },
  { href: "/admin/campaigns", icon: Send, labelKey: "admin.nav.campaigns", clause: "§ 4.4" },
  { href: "/admin/suggestions", icon: Lightbulb, labelKey: "admin.nav.suggestions", clause: "§ 4.5" },
  { href: "/admin/docs/email-notifications", icon: BookOpen, labelKey: "admin.nav.emailNotifications", clause: "§ 4.7" },
];

/* ──────────────────────────────────────────────────────────────────
 * Style helpers — mirror protocol-dashboard-sidebar.tsx
 * ────────────────────────────────────────────────────────────── */
function initials(name?: string | null) {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const fadeIn: Variants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};

const sectionLabelStyle: CSSProperties = {
  display: "block",
  padding: "0 var(--s-4)",
  marginTop: "var(--s-4)",
  marginBottom: "var(--s-2)",
  fontFamily: "var(--lf-mono)",
  fontSize: 9,
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-5)",
};

const navItemStyle = (active: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  margin: "0 var(--s-3)",
  padding: "8px 12px",
  borderRadius: 999,
  fontFamily: "var(--lf-display)",
  fontSize: 13.5,
  fontWeight: active ? 500 : 400,
  letterSpacing: "-0.005em",
  color: active ? "var(--accent-blue)" : "var(--ink-2)",
  textDecoration: "none",
  background: active ? "var(--accent-blue-ghost)" : "transparent",
  borderLeft: active
    ? "2px solid var(--accent-blue)"
    : "2px solid transparent",
  transition:
    "background 220ms cubic-bezier(0.16,1,0.3,1), color 220ms cubic-bezier(0.16,1,0.3,1), transform 220ms cubic-bezier(0.16,1,0.3,1)",
});

const ctxIconStyle = (variant: "personal" | "org" | "admin"): CSSProperties => ({
  width: 28,
  height: 28,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--lf-mono)",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.04em",
  color:
    variant === "personal"
      ? "var(--accent-blue)"
      : variant === "org"
        ? "var(--bronze)"
        : "var(--rust)",
  background:
    variant === "personal"
      ? "var(--accent-blue-ghost)"
      : variant === "org"
        ? "var(--bronze-ghost)"
        : "var(--rust-ghost)",
  border: "1px solid var(--line-2)",
  flexShrink: 0,
});

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useUser();
  const master = isMasterAdmin(user);

  const blogPendingCount = useQuery(api.approvalRequests.getPendingCount) ?? 0;
  const expertPendingCount = useQuery(api.expertApplications.getPendingCount) ?? 0;
  const totalPendingCount = blogPendingCount + expertPendingCount;

  const [ctxOpen, setCtxOpen] = useState(false);
  const ctxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ctxOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!ctxRef.current?.contains(e.target as Node)) setCtxOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ctxOpen]);

  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Admin";
  const userInitials = initials(displayName);
  const userMeta = master
    ? "Master Admin"
    : user?.primaryEmailAddress?.emailAddress ?? "Admin";

  const groups: NavGroup[] = master
    ? baseGroups
    : baseGroups.map((g) => ({
        ...g,
        items: g.items.filter((i) => !MASTER_ONLY_HREFS.has(i.href)),
      }));

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <MotionConfig reducedMotion="user">
      <aside className="dash-sidebar" aria-label="Admin cabinet navigation">
        {/* -- Account context switcher --------------------------- */}
        <div
          ref={ctxRef}
          style={{ position: "relative", margin: "0 var(--s-3) var(--s-2)" }}
        >
          <button
            type="button"
            aria-label="Switch account context"
            aria-expanded={ctxOpen}
            onClick={() => setCtxOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: "var(--r-md)",
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border, var(--line-2))",
              backdropFilter: "blur(14px) saturate(130%)",
              WebkitBackdropFilter: "blur(14px) saturate(130%)",
              cursor: "pointer",
              textAlign: "left",
              transition:
                "background 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms cubic-bezier(0.16,1,0.3,1)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.5) inset",
            }}
          >
            <div style={ctxIconStyle("admin")}>{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--lf-mono)",
                  fontSize: 8,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: master ? "var(--rust)" : "var(--ink-5)",
                  fontWeight: master ? 600 : undefined,
                  lineHeight: 1.1,
                }}
              >
                {master ? "Master Admin" : "Admin Cabinet"}
              </div>
              <div
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "var(--ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.2,
                  marginTop: 1,
                }}
              >
                {displayName}
              </div>
            </div>
            <motion.span
              animate={{ rotate: ctxOpen ? 180 : 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              style={{
                color: "var(--ink-4)",
                display: "flex",
                flexShrink: 0,
              }}
              aria-hidden
            >
              <ChevronDown size={14} />
            </motion.span>
          </button>

          <AnimatePresence>
            {ctxOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="lf-dropdown"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  padding: "var(--s-2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  background: "var(--paper)",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md)",
                  boxShadow: "0 8px 24px rgba(20,20,19,0.12)",
                }}
              >
                {[
                  {
                    href: "/dashboard",
                    type: "Personal",
                    name: "Personal Desk",
                    icon: <span>{userInitials}</span>,
                    variant: "personal" as const,
                    selected: false,
                  },
                  {
                    href: "/org",
                    type: "Organization",
                    name: "Organization",
                    icon: <span>OR</span>,
                    variant: "org" as const,
                    selected: false,
                  },
                  {
                    href: "/admin",
                    type: master ? "Master Admin" : "Admin",
                    name: "Admin Cabinet",
                    icon: <span>AD</span>,
                    variant: "admin" as const,
                    selected: true,
                  },
                ].map((opt) => (
                  <Link
                    key={opt.href}
                    href={opt.href}
                    onClick={() => setCtxOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: "var(--r-sm)",
                      background: opt.selected
                        ? "var(--accent-blue-ghost)"
                        : "transparent",
                      textDecoration: "none",
                      transition: "background 180ms",
                    }}
                  >
                    <div style={ctxIconStyle(opt.variant)}>{opt.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--lf-mono)",
                          fontSize: 9,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--ink-5)",
                        }}
                      >
                        {opt.type}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--lf-display)",
                          fontSize: 13,
                          color: "var(--ink)",
                          marginTop: 2,
                        }}
                      >
                        {opt.name}
                      </div>
                    </div>
                    {opt.selected && (
                      <Check size={14} style={{ color: "var(--accent-blue)" }} />
                    )}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* -- Hairline divider ----------------------------------- */}
        <div
          style={{
            height: 1,
            background: "var(--line-1)",
            margin: "0 var(--s-4) var(--s-1)",
          }}
        />

        {/* -- Nav groups ----------------------------------------- */}
        <motion.nav
          variants={stagger}
          initial="hidden"
          animate="show"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 0,
            overflowY: "auto",
          }}
        >
          {groups.map((group, gi) => (
            <motion.div key={group.label} variants={fadeIn}>
              <div
                style={{
                  ...sectionLabelStyle,
                  marginTop: gi === 0 ? "var(--s-2)" : "var(--s-4)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 1,
                    background: "var(--accent-blue)",
                    opacity: 0.6,
                  }}
                />
                {group.label}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.exact);
                  const showApprovalsBadge =
                    item.href === "/admin/approvals" && totalPendingCount > 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={navItemStyle(active)}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = "var(--glass-bg)";
                          e.currentTarget.style.color = "var(--ink)";
                          e.currentTarget.style.transform = "translateX(2px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--ink-2)";
                          e.currentTarget.style.transform = "translateX(0)";
                        }
                      }}
                    >
                      <Icon size={14} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{t(item.labelKey)}</span>
                      {showApprovalsBadge && (
                        <span
                          style={{
                            fontFamily: "var(--lf-mono)",
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            padding: "2px 7px",
                            borderRadius: 999,
                            color: "#fafaf5",
                            background: "var(--rust)",
                          }}
                          aria-label={`${totalPendingCount} pending`}
                        >
                          {totalPendingCount > 9 ? "9+" : totalPendingCount}
                        </span>
                      )}
                      {item.badge && !showApprovalsBadge && (
                        <span
                          style={{
                            fontFamily: "var(--lf-mono)",
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            padding: "2px 7px",
                            borderRadius: 999,
                            color:
                              item.badge.tone === "warn"
                                ? "#fafaf5"
                                : item.badge.tone === "muted"
                                  ? "var(--ink-5)"
                                  : "var(--accent-blue)",
                            background:
                              item.badge.tone === "warn"
                                ? "var(--rust)"
                                : item.badge.tone === "muted"
                                  ? "transparent"
                                  : "var(--accent-blue-ghost)",
                            border:
                              item.badge.tone === "muted"
                                ? "1px solid var(--line-2)"
                                : "none",
                          }}
                        >
                          {item.badge.value}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </motion.nav>

      </aside>
    </MotionConfig>
  );
}
