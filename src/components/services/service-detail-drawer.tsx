"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Id } from "@convex/_generated/dataModel";

export interface ServiceDetail {
  _id: Id<"serviceProducts">;
  title: string;
  titleBn?: string;
  description: string;
  descriptionBn?: string;
  category: "expatriate" | "hr" | "licensing";
  kind?: string;
  authority?: string;
  legal?: string;
  engagementCovers?: string;
  workflow?: string;
  deliveryTimeline?: string;
  price?: string;
  paymentTerms?: string;
  notes?: string;
  deliverables?: string[];
}

interface Props {
  open: boolean;
  service: ServiceDetail | null;
  refLabel: string; // e.g. "I.3"
  catNo: string; // e.g. "I"
  catLabel: string; // e.g. "Expatriate Mobility"
  onClose: () => void;
  onRequestScope: () => void;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function ServiceDetailDrawer({
  open,
  service,
  refLabel,
  catNo,
  catLabel,
  onClose,
  onRequestScope,
}: Props) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Split process by → arrows for step rendering
  const processSteps = service?.workflow
    ? service.workflow
        .split(/→|->/)
        .map((s) => s.trim().replace(/\.$/, ""))
        .filter((s) => s.length > 1)
    : [];

  return (
    <AnimatePresence>
      {open && service ? (
        <>
          {/* Backdrop */}
          <motion.div
            key="sv2-drawer-backdrop"
            className="sv2-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            key="sv2-drawer-panel"
            className="sv2-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sv2-drawer-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            {/* Sticky header */}
            <header className="sv2-drawer-header">
              <span className="sv2-drawer-crumb">
                SERVICES · {catLabel.toUpperCase()} · {refLabel}
              </span>
              <button
                type="button"
                className="sv2-drawer-close"
                onClick={onClose}
                aria-label="Close detail panel"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 5L15 15M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>

            {/* Scrollable body */}
            <div className="sv2-drawer-body">
              <div className="sv2-drawer-eyebrow">
                CATEGORY {catNo} · {catLabel.toUpperCase()} · {refLabel}
              </div>
              <h2 className="sv2-drawer-title" id="sv2-drawer-title">
                {service.title}
              </h2>
              <p className="sv2-drawer-lead">{service.description}</p>

              {/* Tag chips */}
              <div className="sv2-drawer-tags">
                {service.kind ? <span className="sv2-drawer-tag">{service.kind}</span> : null}
                {service.deliveryTimeline ? (
                  <span className="sv2-drawer-tag">{service.deliveryTimeline}</span>
                ) : null}
                {service.paymentTerms ? (
                  <span className="sv2-drawer-tag">{service.paymentTerms}</span>
                ) : null}
              </div>

              {/* At a glance grid */}
              <section className="sv2-drawer-section">
                <h3 className="sv2-drawer-h3">At a glance</h3>
                <div className="sv2-drawer-glance">
                  <div className="sv2-drawer-glance-item">
                    <span className="sv2-drawer-lab">Service fee</span>
                    <span className="sv2-drawer-val">{service.price ?? "Scoped per job"}</span>
                  </div>
                  <div className="sv2-drawer-glance-item">
                    <span className="sv2-drawer-lab">Typical duration</span>
                    <span className="sv2-drawer-val">
                      {service.deliveryTimeline ?? "Scoped per job"}
                    </span>
                  </div>
                  <div className="sv2-drawer-glance-item">
                    <span className="sv2-drawer-lab">Anchor kind</span>
                    <span className="sv2-drawer-val">{service.kind ?? "—"}</span>
                  </div>
                  <div className="sv2-drawer-glance-item">
                    <span className="sv2-drawer-lab">Reference</span>
                    <span className="sv2-drawer-val">{refLabel}</span>
                  </div>
                </div>
              </section>

              {/* Process */}
              {processSteps.length > 0 ? (
                <section className="sv2-drawer-section">
                  <h3 className="sv2-drawer-h3">Process</h3>
                  <ol className="sv2-drawer-steps">
                    {processSteps.map((step, i) => (
                      <li className="sv2-drawer-step" key={i}>
                        <span className="sv2-drawer-step-n">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="sv2-drawer-step-t">{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {/* Engagement covers */}
              {service.engagementCovers ? (
                <section className="sv2-drawer-section">
                  <h3 className="sv2-drawer-h3">Engagement covers</h3>
                  <p className="sv2-drawer-prose">{service.engagementCovers}</p>
                </section>
              ) : null}

              {/* Authority & legal */}
              {(service.authority || service.legal) && (
                <section className="sv2-drawer-section">
                  <h3 className="sv2-drawer-h3">Authority &amp; legal basis</h3>
                  <dl className="sv2-drawer-dl">
                    {service.authority ? (
                      <div>
                        <dt>Authority</dt>
                        <dd>{service.authority}</dd>
                      </div>
                    ) : null}
                    {service.legal ? (
                      <div>
                        <dt>Legal basis</dt>
                        <dd>{service.legal}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>
              )}

              {/* Notes / caveats */}
              {service.notes ? (
                <section className="sv2-drawer-section">
                  <h3 className="sv2-drawer-h3">Notes</h3>
                  <p className="sv2-drawer-prose">{service.notes}</p>
                </section>
              ) : null}
            </div>

            {/* Sticky footer CTA */}
            <footer className="sv2-drawer-footer">
              <div className="sv2-drawer-foot-meta">
                <span className="sv2-drawer-foot-fee">{service.price ?? "—"}</span>
                <span className="sv2-drawer-foot-dur">
                  {service.deliveryTimeline ?? "Scoped per job"}
                </span>
              </div>
              <button type="button" className="sv2-drawer-cta" onClick={onRequestScope}>
                Request scope <span aria-hidden="true">→</span>
              </button>
            </footer>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}