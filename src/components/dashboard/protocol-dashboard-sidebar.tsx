"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useAccountType } from "@/components/providers/account-context";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  LayoutDashboard,
  Search,
  FileText,
  Crosshair,
  Award,
  GraduationCap,
  Download,
  Bookmark,
  BookOpen,
  CreditCard,
  UserCircle,
  Send,
  Trophy,
  Building2,
  ChevronDown,
  Check,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence, MotionConfig, type Variants } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

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
  hiddenForOrg?: boolean;
}

const baseGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard.nav.dashboard", exact: true },
    ],
  },
  {
    label: "Practice",
    hiddenForOrg: true,
    items: [
      { href: "/chat", icon: Search, labelKey: "dashboard.nav.aiSearch" },
      { href: "/dashboard/headhunting", icon: Crosshair, labelKey: "dashboard.nav.headhunting" },
      { href: "/dashboard/expert", icon: Award, labelKey: "dashboard.nav.expertNetwork" },
    ],
  },
  {
    label: "Engagements",
    items: [
      { href: "/dashboard/requests", icon: FileText, labelKey: "dashboard.nav.myRequests" },
      { href: "/dashboard/saved", icon: Bookmark, labelKey: "dashboard.nav.savedItems" },
    ],
  },
  {
    label: "Learning",
    items: [
      { href: "/dashboard/academy", icon: GraduationCap, labelKey: "dashboard.nav.academy" },
      { href: "/dashboard/resources", icon: Download, labelKey: "dashboard.nav.resources" },
      { href: "/blog", icon: BookOpen, labelKey: "dashboard.nav.blog" },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/dashboard/billing", icon: CreditCard, labelKey: "dashboard.nav.billing" },
      { href: "/dashboard/profile", icon: UserCircle, labelKey: "dashboard.nav.profile" },
    ],
  },
];

const scoutSubItems: NavItem[] = [
  { href: "/dashboard/briefs", icon: FileText, labelKey: "scout.nav.briefs" },
  { href: "/dashboard/submissions", icon: Send, labelKey: "scout.nav.submissions" },
  { href: "/dashboard/earnings", icon: Trophy, labelKey: "member.nav.earnings" },
];

const employerItems: NavItem[] = [
  { href: "/dashboard/mandates", icon: Building2, labelKey: "member.nav.mandates" },
];

/* -- Mobile bottom-nav exports preserved for MobileBottomNav consumer -- */
const homeNavItem = {
  href: "/",
  icon: LayoutDashboard,
  labelKey: "home.nav.home",
  clause: "§ 0.0",
  exact: true,
};

const flat = baseGroups.flatMap((g) =>
  g.items.map((it) => ({ ...it, clause: "§" }))
);

export const protocolMobileNavItems = [
  homeNavItem,
  { ...flat[0], clause: "§ 1.0" },
  { ...flat[1], clause: "§ 2.1" },
  { ...flat[2], clause: "§ 2.2" },
  { ...flat[flat.length - 1], clause: "§ 5.2" },
];

export const protocolMobileMoreItems = [
  { ...flat[3], clause: "§ 2.3" },
  { ...flat[4], clause: "§ 3.1" },
  { ...flat[5], clause: "§ 3.2" },
  { ...flat[6], clause: "§ 4.1" },
  { ...flat[7], clause: "§ 4.2" },
  { ...flat[8], clause: "§ 4.3" },
  { ...flat[9], clause: "§ 5.1" },
];

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

const ctxIconStyle = (variant: "personal" | "org"): CSSProperties => ({
  width: 36,
  height: 36,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--lf-mono)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  color: variant === "personal" ? "var(--accent-blue)" : "var(--bronze)",
  background:
    variant === "personal"
      ? "var(--accent-blue-ghost)"
      : "var(--bronze-ghost)",
  border: "1px solid var(--line-2)",
  flexShrink: 0,
});

export function ProtocolDashboardSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useUser();
  const { isOrgUser } = useAccountType();
  const userId = user?.id;

  const expert = useQuery(
    api.experts.getByClerkId,
    userId ? { clerkId: userId } : "skip"
  );
  const metadata = user?.publicMetadata as { role?: string } | undefined;
  const role = metadata?.role;
  const isScout = role === "scout" || expert?.scoutStatus === "active";
  const isEmployer = role === "employer";

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
    "Member";
  const userInitials = initials(displayName);
  const userMeta =
    role && role !== "member"
      ? `${role[0].toUpperCase()}${role.slice(1)}`
      : user?.primaryEmailAddress?.emailAddress ?? "";

  const groups: NavGroup[] = baseGroups
    .filter((g) => !(g.hiddenForOrg && isOrgUser))
    .map((g) => {
      if (g.label === "Practice" && isScout && !isOrgUser) {
        return { ...g, items: [...g.items, ...scoutSubItems] };
      }
      if (g.label === "Engagements" && isEmployer && !isOrgUser) {
        return { ...g, items: [...g.items, ...employerItems] };
      }
      return g;
    });

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <MotionConfig reducedMotion="user">
      <aside
        className="dash-sidebar"
        aria-label="Member dashboard navigation"
      >
        {/* -- Account context switcher --------------------------- */}
        <div
          ref={ctxRef}
          style={{
            position: "relative",
            margin: "0 var(--s-3) var(--s-3)",
          }}
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
              gap: 10,
              padding: "10px 12px",
              borderRadius: "var(--r-md)",
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              backdropFilter: "blur(14px) saturate(130%)",
              WebkitBackdropFilter: "blur(14px) saturate(130%)",
              cursor: "pointer",
              textAlign: "left",
              transition:
                "background 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms cubic-bezier(0.16,1,0.3,1)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.5) inset",
            }}
          >
            <div style={ctxIconStyle(isOrgUser ? "org" : "personal")}>
              {userInitials}
            </div>
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
                {isOrgUser ? "Organization" : "Personal Desk"}
              </div>
              <div
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: 2,
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
                }}
              >
                {[
                  {
                    href: "/dashboard",
                    type: "Personal",
                    name: displayName,
                    icon: <span>{userInitials}</span>,
                    variant: "personal" as const,
                    selected: !isOrgUser,
                  },
                  {
                    href: "/org",
                    type: "Organization",
                    name: "Switch to Organization",
                    icon: <span>OR</span>,
                    variant: "org" as const,
                    selected: isOrgUser,
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
            margin: "0 var(--s-4) var(--s-2)",
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
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={navItemStyle(active)}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background =
                            "var(--glass-bg)";
                          e.currentTarget.style.color = "var(--ink)";
                          e.currentTarget.style.transform =
                            "translateX(2px)";
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
                      {item.badge && (
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

        {/* -- Foot · user pill + Clerk UserButton --------------- */}
        <div
          style={{
            margin: "var(--s-3)",
            marginTop: "var(--s-4)",
            paddingTop: "var(--s-3)",
            borderTop: "1px solid var(--line-1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: "var(--r-md)",
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              backdropFilter: "blur(14px) saturate(130%)",
              WebkitBackdropFilter: "blur(14px) saturate(130%)",
            }}
          >
            <div style={ctxIconStyle("personal")}>{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontFamily: "var(--lf-mono)",
                  fontSize: 9,
                  letterSpacing: "0.04em",
                  color: "var(--ink-5)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: 2,
                }}
              >
                {userMeta}
              </div>
            </div>
            <UserButton
              afterSignOutUrl="/"
              userProfileUrl="/dashboard/profile"
              userProfileMode="navigation"
            />
          </div>
        </div>
      </aside>
    </MotionConfig>
  );
}
