"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  UserPlus,
  Briefcase,
  Headphones,
  Award,
  Search,
  GraduationCap,
  Download,
  BookOpen,
  FolderOpen,
  CreditCard,
  Building2,
  ChevronDown,
  Check,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence, MotionConfig, type Variants } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";

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

const baseGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/org", icon: LayoutDashboard, labelKey: "org.nav.dashboard", exact: true },
    ],
  },
  {
    label: "Engagements",
    items: [
      { href: "/org/hiring", icon: UserPlus, labelKey: "org.nav.hiringRequests" },
      { href: "/org/mandates", icon: Briefcase, labelKey: "org.nav.mandates" },
      { href: "/org/services", icon: Headphones, labelKey: "org.nav.serviceDesk" },
      { href: "/org/experts", icon: Award, labelKey: "org.nav.expertConsultation" },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { href: "/chat", icon: Search, labelKey: "org.nav.aiSearch" },
      { href: "/org/academy", icon: GraduationCap, labelKey: "org.nav.academy" },
      { href: "/org/resources", icon: Download, labelKey: "org.nav.resources" },
      { href: "/blog", icon: BookOpen, labelKey: "dashboard.nav.blog" },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/org/documents", icon: FolderOpen, labelKey: "org.nav.documents" },
      { href: "/org/billing", icon: CreditCard, labelKey: "org.nav.billing" },
      { href: "/org/profile", icon: Building2, labelKey: "org.nav.orgProfile" },
    ],
  },
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

export const orgMobileNavItems = [
  homeNavItem,
  { ...flat[0], clause: "§ 1.0" }, // /org
  { ...flat[1], clause: "§ 2.1" }, // /org/hiring
  { ...flat[2], clause: "§ 2.2" }, // /org/mandates
  { ...flat[flat.length - 1], clause: "§ 5.3" }, // /org/profile (last)
];

export const orgMobileMoreItems = [
  { ...flat[3], clause: "§ 2.3" }, // /org/services
  { ...flat[4], clause: "§ 2.4" }, // /org/experts
  { ...flat[5], clause: "§ 3.1" }, // /chat
  { ...flat[6], clause: "§ 3.2" }, // /org/academy
  { ...flat[7], clause: "§ 3.3" }, // /org/resources
  { ...flat[8], clause: "§ 3.4" }, // /blog
  { ...flat[9], clause: "§ 4.1" }, // /org/documents
  { ...flat[10], clause: "§ 4.2" }, // /org/billing
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

export function OrgSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useUser();

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
  const metadata = user?.publicMetadata as { role?: string } | undefined;
  const role = metadata?.role;
  const userMeta =
    role && role !== "member"
      ? `${role[0].toUpperCase()}${role.slice(1)}`
      : user?.primaryEmailAddress?.emailAddress ?? "";

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <MotionConfig reducedMotion="user">
      <aside
        className="dash-sidebar"
        aria-label="Organization dashboard navigation"
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
            <div style={ctxIconStyle("org")}>{userInitials}</div>
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
                Organization
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
                    selected: false,
                  },
                  {
                    href: "/org",
                    type: "Organization",
                    name: "Your organization desk",
                    icon: <span>OR</span>,
                    variant: "org" as const,
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
          {baseGroups.map((group, gi) => (
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
            <div style={ctxIconStyle("org")}>{userInitials}</div>
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
