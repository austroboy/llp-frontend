"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { useAccountType } from "@/components/providers/account-context";
import "./site-top-nav.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const iconSwap = {
  initial: { opacity: 0, rotate: -45, scale: 0.6 },
  animate: { opacity: 1, rotate: 0, scale: 1 },
  exit: { opacity: 0, rotate: 45, scale: 0.6 },
  transition: { duration: 0.26, ease: EASE_OUT },
};

const textSwap = {
  initial: { opacity: 0, y: 4, filter: "blur(2px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -4, filter: "blur(2px)" },
  transition: { duration: 0.2, ease: EASE_OUT },
};

const NAV_ITEMS = [
  { roman: "I", label: "Research Lab", href: "/research" },
  { roman: "II", label: "Services Desk", href: "/services" },
  { roman: "III", label: "Academy", href: "/academy" },
  { roman: "IV", label: "Headhunting", href: "/headhunting" },
  { roman: "V", label: "Blog", href: "/blog" },
];

export function SiteTopNav() {
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useUser();
  const { isOrgUser } = useAccountType();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const meta = user?.publicMetadata as
    | { role?: string; analytics_role?: string }
    | undefined;
  const isAdmin =
    meta?.role === "admin" ||
    meta?.analytics_role === "super_admin" ||
    meta?.analytics_role === "growth_admin" ||
    meta?.analytics_role === "tech_admin" ||
    meta?.analytics_role === "read_only";
  const myDeskHref = isAdmin ? "/admin" : isOrgUser ? "/org" : "/dashboard";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (!actionsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActionsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [actionsOpen]);

  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  return (
    <MotionConfig reducedMotion="user">
    <div
      className="lf-nav-scope"
      data-theme={themeAttr}
      suppressHydrationWarning
    >
      <motion.nav
        className="lf-topnav"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <div className="lf-topnav-inner">
          <a href="/" className="lf-topnav-brand">
            <BrandMark size={28} />
            <span className="lf-topnav-name">Labor Law Partner</span>
          </a>

          <div className="lf-topnav-items">
            {NAV_ITEMS.map((n) => (
              <a key={n.label} className="lf-topnav-item" href={n.href}>
                <span className="lf-topnav-roman">{n.roman}</span>
                <span>{n.label}</span>
              </a>
            ))}
          </div>

          <div className="lf-topnav-right">
            <button
              type="button"
              className="lf-topnav-actions-toggle"
              onClick={() => setActionsOpen((v) => !v)}
              aria-label={actionsOpen ? "Hide quick actions" : "Show quick actions"}
              aria-expanded={actionsOpen}
              aria-controls="lf-topnav-actions"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={actionsOpen ? "chev" : "dots"}
                  initial={iconSwap.initial}
                  animate={iconSwap.animate}
                  exit={iconSwap.exit}
                  transition={iconSwap.transition}
                  style={{ display: "inline-flex" }}
                >
                  {actionsOpen ? <ChevronRightIcon /> : <DotsIcon />}
                </motion.span>
              </AnimatePresence>
            </button>

            <div
              id="lf-topnav-actions"
              className="lf-topnav-actions"
              data-open={actionsOpen ? "true" : "false"}
            >
              <button
                type="button"
                className="lf-topnav-theme"
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
                aria-label="Toggle theme"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={!mounted ? "stub" : resolvedTheme === "dark" ? "moon" : "sun"}
                    initial={iconSwap.initial}
                    animate={iconSwap.animate}
                    exit={iconSwap.exit}
                    transition={iconSwap.transition}
                    style={{ display: "inline-flex" }}
                  >
                    {!mounted ? (
                      <SunIcon />
                    ) : resolvedTheme === "dark" ? (
                      <MoonIcon />
                    ) : (
                      <SunIcon />
                    )}
                  </motion.span>
                </AnimatePresence>
              </button>

              <a
                href={myDeskHref}
                className="lf-topnav-desk"
                onClick={() => setActionsOpen(false)}
              >
                <DeskGlyph />
                <span className="lf-topnav-desk-text">My Desk</span>
              </a>

              <a
                href="/audit"
                className="lf-topnav-audit lf-glow"
                aria-label="Run Audit"
                onClick={() => setActionsOpen(false)}
              >
                <span className="lf-topnav-audit-dot" />
                <span className="lf-topnav-audit-text">Run Audit</span>
              </a>
            </div>

            <SignedOut>
              <a href="/sign-in" className="lf-topnav-signin">
                <span>Sign in</span>
                <span aria-hidden>→</span>
              </a>
            </SignedOut>

            <SignedIn>
              <div className="lf-topnav-user">
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{ elements: { avatarBox: "lf-clerk-avatar" } }}
                />
              </div>
            </SignedIn>

            <button
              type="button"
              className="lf-topnav-menu"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="lf-topnav-drawer"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={mobileOpen ? "close" : "menu"}
                  initial={iconSwap.initial}
                  animate={iconSwap.animate}
                  exit={iconSwap.exit}
                  transition={iconSwap.transition}
                  style={{ display: "inline-flex" }}
                >
                  {mobileOpen ? <CloseIcon /> : <MenuIcon />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.button
                key="scrim"
                type="button"
                className="lf-topnav-scrim"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                style={{ animation: "none" }}
              />
              <motion.div
                key="drawer"
                id="lf-topnav-drawer"
                className="lf-topnav-drawer"
                role="dialog"
                aria-label="Primary navigation"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
                style={{ animation: "none" }}
              >
                <div className="lf-topnav-drawer-head">
                  <span className="lf-topnav-drawer-eyebrow">§ INDEX</span>
                  <div className="lf-topnav-drawer-head-actions">
                    <button
                      type="button"
                      className="lf-topnav-drawer-theme"
                      onClick={() =>
                        setTheme(resolvedTheme === "dark" ? "light" : "dark")
                      }
                      aria-label="Toggle theme"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={!mounted ? "stub" : resolvedTheme === "dark" ? "moon" : "sun"}
                          initial={iconSwap.initial}
                          animate={iconSwap.animate}
                          exit={iconSwap.exit}
                          transition={iconSwap.transition}
                          style={{ display: "inline-flex" }}
                        >
                          {!mounted ? (
                            <SunIcon />
                          ) : resolvedTheme === "dark" ? (
                            <MoonIcon />
                          ) : (
                            <SunIcon />
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </button>
                    <button
                      type="button"
                      className="lf-topnav-drawer-close"
                      onClick={() => setMobileOpen(false)}
                      aria-label="Close menu"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>
                <motion.nav
                  className="lf-topnav-drawer-list"
                  aria-label="Primary"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
                  }}
                >
                  {NAV_ITEMS.map((n) => (
                    <motion.a
                      key={n.label}
                      href={n.href}
                      className="lf-topnav-drawer-item"
                      onClick={() => setMobileOpen(false)}
                      variants={{
                        hidden: { opacity: 0, x: -8 },
                        show: {
                          opacity: 1,
                          x: 0,
                          transition: { duration: 0.32, ease: EASE_OUT },
                        },
                      }}
                    >
                      <span className="lf-topnav-drawer-roman">{n.roman}</span>
                      <span className="lf-topnav-drawer-label">{n.label}</span>
                      <span aria-hidden>→</span>
                    </motion.a>
                  ))}
                </motion.nav>
                <motion.div
                  className="lf-topnav-drawer-actions"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32, duration: 0.3, ease: EASE_OUT }}
                >
                  <a
                    href={myDeskHref}
                    className="lf-topnav-drawer-pill"
                    onClick={() => setMobileOpen(false)}
                  >
                    <DeskGlyph />
                    <span>My Desk</span>
                  </a>
                  <SignedOut>
                    <a
                      href="/sign-in"
                      className="lf-topnav-drawer-pill lf-topnav-drawer-pill--ink"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign in →
                    </a>
                  </SignedOut>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
    </MotionConfig>
  );
}

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Labor Law Partner"
    >
      <rect x="8" y="8" width="26" height="84" fill="#1e3a5f" />
      <rect x="42" y="8" width="50" height="38" fill="#b85a1f" />
      <rect x="42" y="52" width="50" height="18" fill="#141413" />
      <rect x="42" y="76" width="50" height="16" fill="#1e3a5f" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function DeskGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
