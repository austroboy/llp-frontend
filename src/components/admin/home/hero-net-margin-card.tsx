"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import type { MarginBucket } from "@/app/admin/dashboard-overview/types";
import { TrendBadge } from "./hero-mini-card";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

/**
 * The dominant left card on Row 1 — Today's Profit.
 * Larger padding + bigger type per spec.
 */
export function HeroNetMarginCard({
  today,
  week,
  month,
  errored,
  errorMessage,
  unreachable,
}: {
  today: MarginBucket;
  week: MarginBucket;
  month: MarginBucket;
  errored?: boolean;
  errorMessage?: string;
  unreachable?: boolean;
}) {
  if (unreachable) {
    return (
      <motion.div variants={fadeUp} style={{ position: "relative" }}>
        <div
          className="lf-card"
          style={{
            display: "block",
            padding: "var(--s-5)",
            height: "100%",
          }}
        >
          <span
            className="lf-meta"
            style={{
              textTransform: "uppercase",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "var(--ink-3, var(--muted-foreground))",
            }}
          >
            Today's profit
          </span>
          <p
            style={{
              marginTop: "var(--s-3)",
              fontSize: 15,
              color: "var(--ink-2, var(--muted-foreground))",
              lineHeight: 1.4,
            }}
          >
            Couldn't load — refresh in a minute.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeUp} style={{ position: "relative", height: "100%" }}>
      <Link
        href="/admin/cost-calculator"
        className="lf-card"
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "var(--s-5)",
          textDecoration: "none",
          color: "inherit",
          cursor: "pointer",
          height: "100%",
          transition: "background 0.18s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "color-mix(in oklab, var(--card) 80%, transparent)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "";
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "var(--s-2)",
          }}
        >
          <span
            className="lf-meta"
            style={{
              textTransform: "uppercase",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--ink-3, var(--muted-foreground))",
            }}
          >
            Today's profit
          </span>
          {errored && (
            <span
              title={errorMessage || "Couldn't load — refresh in a minute."}
              aria-label={errorMessage || "Data error"}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "var(--amber-500, #f59e0b)",
                flexShrink: 0,
                marginTop: 2,
              }}
            />
          )}
        </div>

        <div
          style={{
            marginTop: "var(--s-3)",
            display: "flex",
            alignItems: "baseline",
            gap: "var(--s-2)",
            flexWrap: "wrap",
          }}
        >
          <span
            className="tabular-nums"
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: "clamp(36px, 5vw, 56px)",
              fontStyle: "italic",
              fontWeight: 400,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "var(--accent-blue, #2563eb)",
            }}
          >
            {fmtUsd(today.netMarginUsd)}
          </span>
          <TrendBadge pct={today.deltaPctVsPrior} />
        </div>

        <div
          style={{
            marginTop: "var(--s-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-1)",
            fontSize: 13,
            color: "var(--ink-2, var(--muted-foreground))",
            fontFeatureSettings: "'tnum' 1",
          }}
        >
          <span>
            This week: <strong style={{ color: "var(--ink, inherit)" }}>{fmtUsd(week.netMarginUsd)}</strong>
          </span>
          <span>
            This month: <strong style={{ color: "var(--ink, inherit)" }}>{fmtUsd(month.netMarginUsd)}</strong>
          </span>
        </div>

        <div
          style={{
            marginTop: "auto",
            paddingTop: "var(--s-4)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            color: "var(--accent-blue, #2563eb)",
            fontWeight: 500,
          }}
        >
          Open cost calculator <ArrowRight size={12} />
        </div>
      </Link>
    </motion.div>
  );
}
