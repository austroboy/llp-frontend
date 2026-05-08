"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { OrderStatusView } from "./order-status-view";

interface OrderLookupFormProps {
  initialOrderNumber?: string;
}

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

export function OrderLookupForm({ initialOrderNumber = "" }: OrderLookupFormProps) {
  const { t } = useLanguage();

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const queryArgs =
    submitted && orderNumber && email
      ? { orderNumber: orderNumber.toUpperCase(), email }
      : "skip";

  const result = useQuery(
    api.serviceRequests.getByOrderNumber,
    queryArgs === "skip" ? "skip" : queryArgs,
  );

  const isLoading = submitted && result === undefined;
  const notFound = submitted && result === null;
  const found = submitted && result && result !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
  };

  if (found) {
    return <OrderStatusView data={result} onBack={handleReset} />;
  }

  return (
    <section
      className="lf-section"
      style={{ paddingTop: "calc(var(--s-7) + 48px)" }}
    >
      <motion.div
        className="lf-section-header"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginInline: "auto", textAlign: "center" }}
      >
        <motion.div variants={fadeUp}>
          <div
            className="lf-section-eyebrow"
            style={{ justifyContent: "center" }}
          >
            <span className="lf-section-eyebrow-rule" />
            <span className="lf-meta lf-meta--accent">§ Track</span>
            <span className="lf-meta">Service request status</span>
          </div>
        </motion.div>
        <motion.h1 variants={fadeUp} className="lf-h2" style={{ marginTop: 12 }}>
          {t("track.title")}
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ marginTop: 12 }}
        >
          {t("track.subtitle")}
        </motion.p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="lf-card lf-card--feature"
        style={{
          maxWidth: 520,
          marginInline: "auto",
          padding: "clamp(24px, 3vw, 36px)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="lf-field-label" htmlFor="track-order-number">
              {t("track.orderNumber")}
            </label>
            <input
              id="track-order-number"
              className="lf-input"
              value={orderNumber}
              onChange={(e) => {
                setOrderNumber(e.target.value.toUpperCase());
                if (submitted) setSubmitted(false);
              }}
              placeholder={t("track.orderNumberPlaceholder")}
              style={{
                fontFamily: "var(--lf-mono)",
                textTransform: "uppercase",
              }}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="lf-field-label" htmlFor="track-email">
              {t("track.email")}
            </label>
            <input
              id="track-email"
              type="email"
              className="lf-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (submitted) setSubmitted(false);
              }}
              placeholder={t("track.emailPlaceholder")}
              autoComplete="email"
            />
          </div>

          {notFound && (
            <div
              className="lf-card"
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                padding: "12px 14px",
                borderColor:
                  "color-mix(in oklab, var(--rust) 36%, var(--glass-border))",
                color: "var(--rust)",
                fontFamily: "var(--lf-body)",
                fontSize: 13,
              }}
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t("track.notFound")}</span>
            </div>
          )}

          <button
            type="submit"
            className="lf-cta lf-cta--primary lf-glow"
            disabled={!orderNumber.trim() || !email.trim() || isLoading}
            style={{
              justifyContent: "center",
              opacity:
                !orderNumber.trim() || !email.trim() || isLoading ? 0.6 : 1,
              cursor:
                !orderNumber.trim() || !email.trim() || isLoading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("track.loading")}</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>{t("track.submit")}</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </section>
  );
}
