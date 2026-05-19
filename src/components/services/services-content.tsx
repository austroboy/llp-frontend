"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { api } from "@convex/_generated/api";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { useLanguage } from "@/hooks/use-language";
import { ServiceRequestDialog } from "@/components/services/service-request-dialog";
import "@/components/landing/landing.css";
import "./services-styles.css";

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

const categoryConfig = {
  expatriate: {
    catNo: "I",
    id: "expat",
    deskLabel: "Expatriate Mobility",
    descShort: "Visas, work permits, security clearance, expatriate tax.",
    kickerKey: "services.expatriate.kicker",
    titleKey: "services.expatriate.title",
    subtitleKey: "services.expatriate.subtitle",
  },
  hr: {
    catNo: "III",
    id: "hr",
    deskLabel: "HR Ops & Compliance",
    descShort: "Advisory, audits, benchmarking, custom scoping.",
    kickerKey: "services.hr.kicker",
    titleKey: "services.hr.title",
    subtitleKey: "services.hr.subtitle",
  },
  licensing: {
    catNo: "IV",
    id: "lic",
    deskLabel: "Licensing & Registrations",
    descShort: "Trade, factory, fire, environmental, RJSC, VAT.",
    kickerKey: "services.licensing.kicker",
    titleKey: "services.licensing.title",
    subtitleKey: "services.licensing.subtitle",
  },
} as const;

type CategoryKey = keyof typeof categoryConfig;
const CATEGORY_KEYS: readonly CategoryKey[] = ["expatriate", "hr", "licensing"] as const;

export function ServicesContent() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const [dialog, setDialog] = useState<{ open: boolean; service: any }>({
    open: false,
    service: null,
  });
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const services = useQuery(api.serviceProducts.getActive, {});

  const autoOpenHandled = useRef(false);
  useEffect(() => {
    if (autoOpenHandled.current) return;
    const requestCategory = searchParams.get("request") ?? searchParams.get("service");
    if (!requestCategory || !services?.length) return;
    const matchingService =
      services.find((s) => s._id === (requestCategory as any)) ||
      services.find((s) => s.category === requestCategory);
    if (matchingService) {
      autoOpenHandled.current = true;
      const timer = setTimeout(() => {
        setDialog({ open: true, service: matchingService });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, services]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    const timer = setTimeout(() => {
      const target = document.querySelector(hash);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const allServices = services ?? [];
  const filteredServices = allServices.filter((s) => {
    const matchesCat = activeFilter === "all" || s.category === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q) ||
      (s.workflow ?? "").toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const countByCat = (cat: CategoryKey) =>
    allServices.filter((s) => s.category === cat).length;

  const totalCount = allServices.length;

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr}>
        <SiteTopNav />

        <main>
          {/* ── HERO ─────────────────────────────────────────────── */}
          <section className="sv2-hero">
            <div className="sv2-wrap">
              <motion.div variants={stagger} initial="hidden" animate="show">
                <motion.div variants={fadeUp} className="sv2-hero-meta">
                  <span className="sv2-eyebrow">Services Desk · v2026.05</span>
                  <span className="sv2-chip">
                    <span className="sv2-chip-dot" />
                    <span className="sv2-chip-label">Engagements open · Q2 to Q3</span>
                  </span>
                </motion.div>

                <div className="sv2-hero-grid">
                  <motion.h1 variants={fadeUp} className="sv2-h-display">
                    Bangladesh
                    <br />
                    <em>compliance,</em>
                    <br />
                    <span className="sv2-stroke">filed.</span> Cleanly.
                  </motion.h1>

                  <motion.aside variants={fadeUp} className="sv2-hero-aside">
                    <p>
                      A statutory services desk for Bangladesh. Expatriate mobility,
                      licensing, HR compliance, and amendments. Lawyer led, platform
                      tracked. The queries, validity windows, and committee cycles are
                      handled inside the fee.
                    </p>
                    <dl className="sv2-meta-row">
                      <div><dt>Jurisdiction</dt><dd>Bangladesh</dd></div>
                      <div><dt>Delivery</dt><dd>Fixed scope · written</dd></div>
                      <div><dt>Terms</dt><dd>50% advance · 50% on completion</dd></div>
                      <div><dt>Catalog</dt><dd>{totalCount || "—"} service tracks</dd></div>
                    </dl>
                  </motion.aside>
                </div>

                <motion.div variants={fadeUp} className="sv2-hero-foot">
                  <div className="sv2-stat">
                    <span className="sv2-stat-n">{totalCount || "—"}</span>
                    <span className="sv2-stat-l">Service tracks live</span>
                  </div>
                  <div className="sv2-stat">
                    <span className="sv2-stat-n">3</span>
                    <span className="sv2-stat-l">Practice categories</span>
                  </div>
                  <div className="sv2-stat">
                    <span className="sv2-stat-n">20+</span>
                    <span className="sv2-stat-l">Government authorities</span>
                  </div>
                  <span className="sv2-scroll-hint">Scroll · Index</span>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ── PROMISE BAND ─────────────────────────────────────── */}
          <section className="sv2-promise">
            <div className="sv2-wrap sv2-promise-grid">
              {[
                { n: "01", title: "Scope before estimate", desc: "Every engagement begins with a written scope listing what we file, what we coordinate, and what's billed at actual." },
                { n: "02", title: "Queries absorbed", desc: "Validity refreshes, committee re-schedules, and one to two rounds of officer queries are baked into the fee." },
                { n: "03", title: "Authority cited", desc: "Each filing names the office, wing, portal, and the Act & latest amendment it sits under." },
                { n: "04", title: "Two-track payment", desc: "50% advance, 50% on completion. Government fees at actual, billed separately, with the challan attached." },
              ].map((item) => (
                <div className="sv2-promise-item" key={item.n}>
                  <span className="sv2-promise-num">{item.n}</span>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CATEGORY NAV ─────────────────────────────────────── */}
          <motion.section
            className="sv2-catnav"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            <div className="sv2-wrap">
              <div className="sv2-catnav-grid">
                {CATEGORY_KEYS.map((catKey) => {
                  const cfg = categoryConfig[catKey];
                  const count = countByCat(catKey);
                  return (
                    <motion.button
                      key={catKey}
                      variants={fadeUp}
                      className="sv2-catnav-card"
                      type="button"
                      onClick={() => jumpTo(cfg.id)}
                    >
                      <div className="sv2-catnav-top">
                        <span className="sv2-catnav-catno">Category {cfg.catNo}</span>
                        <span className="sv2-catnav-count">{count}</span>
                      </div>
                      <span className="sv2-catnav-title">{cfg.deskLabel}</span>
                      <span className="sv2-catnav-desc">{cfg.descShort}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.section>

          {/* ── FILTER + SEARCH ───────────────────────────────────── */}
          <section className="sv2-filter-section">
            <div className="sv2-wrap">
              <motion.div
                className="sv2-section-head"
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
              >
                <motion.div variants={fadeUp}>
                  <span className="sv2-eyebrow">§ Services Index · 2026</span>
                  <h2 className="sv2-section-h2">
                    {totalCount ? `${totalCount} engagements,` : "All engagements,"}{" "}
                    <em>one</em> delivery standard.
                  </h2>
                </motion.div>
                <motion.span variants={fadeUp} className="sv2-counter">
                  Showing {filteredServices.length} of {totalCount}
                </motion.span>
              </motion.div>

              <div className="sv2-chips">
                {([
                  { id: "all", label: "All", count: totalCount },
                  { id: "expatriate", label: "Expatriate Mobility", count: countByCat("expatriate") },
                  { id: "hr", label: "HR Ops & Compliance", count: countByCat("hr") },
                  { id: "licensing", label: "Licensing & Registrations", count: countByCat("licensing") },
                ] as const).map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className={`sv2-chip-btn${activeFilter === chip.id ? " is-active" : ""}`}
                    onClick={() => setActiveFilter(chip.id)}
                  >
                    {chip.label} <span className="sv2-chip-ct">{chip.count}</span>
                  </button>
                ))}
              </div>

              <div className="sv2-search">
                <span className="sv2-eyebrow" style={{ letterSpacing: "0.18em" }}>Search</span>
                <input
                  type="text"
                  className="sv2-search-input"
                  placeholder="e.g. work permit, fire license, ECC, RJSC, TIN, amendment…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="sv2-kbd">↵</span>
              </div>
            </div>
          </section>

          {/* ── SERVICE LIST ──────────────────────────────────────── */}
          <section className="sv2-services">
            <div className="sv2-wrap">
              {services === undefined ? (
                <div className="sv2-loading">Loading services…</div>
              ) : filteredServices.length === 0 ? (
                <div className="sv2-empty">No services match your filter or search.</div>
              ) : (
                (() => {
                  const grouped: { catKey: CategoryKey; items: typeof filteredServices }[] = [];
                  for (const catKey of CATEGORY_KEYS) {
                    const items = filteredServices.filter((s) => s.category === catKey);
                    if (items.length > 0) grouped.push({ catKey, items });
                  }
                  return grouped.map(({ catKey, items }) => {
                    const cfg = categoryConfig[catKey];
                    const catAll = allServices.filter((s) => s.category === catKey);
                    return (
                      <div key={catKey} id={cfg.id} className="sv2-cat-group">
                        {/* Category header */}
                        <div className="sv2-cat-header">
                          <div className="sv2-cat-header-left">
                            <span className="sv2-cat-header-kicker">
                              CATEGORY {cfg.catNo} · {catAll.length} SERVICES
                            </span>
                            <h2 className="sv2-cat-header-h2">{cfg.deskLabel}</h2>
                          </div>
                          <span className="sv2-cat-header-meta">
                            {cfg.catNo.toUpperCase()} · {catAll.length}
                          </span>
                        </div>

                        {/* Service rows */}
                        {items.map((svc, i) => {
                          const globalIdx = catAll.findIndex((s) => s._id === svc._id);
                          const ref = `${cfg.catNo}.${globalIdx + 1}`;
                          const title = language === "bn" && svc.titleBn ? svc.titleBn : svc.title;

                          return (
                            <motion.button
                              type="button"
                              key={svc._id}
                              className="sv2-svc-row"
                              onClick={() => setDialog({ open: true, service: svc })}
                              initial={{ opacity: 0, y: 8 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={inViewOnce}
                              transition={{ duration: 0.45, delay: i * 0.04, ease: EASE_OUT }}
                            >
                              <span className="sv2-svc-idx">{ref}</span>

                              <div className="sv2-svc-name">
                                <span className="sv2-svc-title">{title}</span>
                                <span className="sv2-svc-kind">
                                  {svc.workflow ?? "Application coordination"}
                                </span>
                              </div>

                              <div className="sv2-svc-authority sv2-col-hide-md">
                                <span className="sv2-svc-lab">Authority</span>
                                <span>{svc.notes ?? "—"}</span>
                              </div>

                              <div className="sv2-svc-duration sv2-col-hide-md">
                                <span className="sv2-svc-lab">Duration</span>
                                <span>{svc.deliveryTimeline ?? "Scoped per job"}</span>
                              </div>

                              <div className="sv2-svc-fee">
                                <span className="sv2-svc-lab">Fee</span>
                                <span className="sv2-svc-fee-val">{svc.price ?? "—"}</span>
                              </div>

                              <div className="sv2-svc-arrow" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                  <path
                                    d="M3.5 9H14.5M14.5 9L9.5 4M14.5 9L9.5 14"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </section>

          {/* ── PROCESS ──────────────────────────────────────────── */}
          <section className="sv2-process">
            <div className="sv2-wrap sv2-process-grid">
              <div>
                <span className="sv2-eyebrow">§ How we work</span>
                <h2 className="sv2-process-h2">
                  A delivery<br /><em>system,</em> not a thread.
                </h2>
                <p className="sv2-process-lead">
                  Every engagement runs the same five stages. The work is predictable,
                  the artefacts are reviewable, and you always know what is pending where.
                </p>
              </div>
              <div className="sv2-steps">
                {[
                  { n: "01", t: "Scoping and intake", d: "A written scope memo. We confirm what is in, what is out, and what depends on what. Prerequisite licences and validity windows included.", time: "≤ 48h" },
                  { n: "02", t: "Document & pre-validation", d: "Document collection, pre-validation against authority checklists, and refresh of anything inside its validity window.", time: "3–5 d" },
                  { n: "03", t: "Filing & coordination", d: "Submission via the right portal or wing, with officer-query handling, committee scheduling, and parallel-agency coordination.", time: "Authority-bound" },
                  { n: "04", t: "Issuance & verification", d: "Original collection or e-issuance, line-by-line check against the application, and rectification before hand-off if anything is off.", time: "≤ 48h" },
                  { n: "05", t: "Hand-off & calendar", d: "Original + soft copies in your LLP workspace, the next renewal placed on calendar, and a 30-day post-delivery support window.", time: "D-day" },
                ].map((step) => (
                  <div className="sv2-step" key={step.n}>
                    <span className="sv2-step-n">{step.n}</span>
                    <div>
                      <div className="sv2-step-t">{step.t}</div>
                      <div className="sv2-step-d">{step.d}</div>
                    </div>
                    <span className="sv2-step-time">{step.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA ──────────────────────────────────────────────── */}
          <div className="sv2-wrap">
            <div className="sv2-cta">
              <div className="sv2-cta-inner">
                <div>
                  <h3 className="sv2-cta-h3">
                    Not sure where to start?<br />Send us your <em>filing list.</em>
                  </h3>
                  <div className="sv2-cta-meta">
                    <span>Free 30-min scoping call</span>
                    <span>Written scope &amp; fee</span>
                    <span>No obligation</span>
                  </div>
                </div>
                <div>
                  <p className="sv2-cta-body">
                    Share the licences, registrations, or filings on your plate.
                    We&apos;ll come back with the right service tracks, the dependency
                    map, and a fixed-fee scope.
                  </p>
                  <a className="sv2-cta-btn" href="mailto:desk@laborlawpartner.com">
                    Request a scope <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ── STAMP ────────────────────────────────────────────── */}
          <div className="sv2-wrap">
            <div className="sv2-stamp">
              <span>Services Desk · {totalCount || "—"} service tracks</span>
              <span>v2026.05</span>
            </div>
          </div>
        </main>

        <HomepageFooter />

        <ServiceRequestDialog
          open={dialog.open}
          onOpenChange={(open) =>
            setDialog((prev) => ({ ...prev, open, service: open ? prev.service : null }))
          }
          service={dialog.service}
        />
      </div>
    </MotionConfig>
  );
}