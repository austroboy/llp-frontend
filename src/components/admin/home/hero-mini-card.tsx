"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

/**
 * Reusable small card for the hero board.
 * - Wraps full area in <Link> so click target = whole card.
 * - Optional `errored` prop adds amber dot top-right with tooltip.
 */
export function HeroMiniCard({
  label,
  subtitle,
  value,
  trend,
  contextRow,
  href,
  errored,
  errorMessage,
  children,
}: {
  label: string;
  subtitle: string;
  value?: ReactNode;
  trend?: { pct: number | null } | null;
  contextRow?: ReactNode;
  href: string;
  errored?: boolean;
  errorMessage?: string;
  children?: ReactNode;
}) {
  const trendNode = trend ? <TrendBadge pct={trend.pct} /> : null;

  return (
    <motion.div variants={fadeUp} style={{ position: "relative" }}>
      <Link
        href={href}
        className="lf-card"
        style={{
          display: "block",
          padding: "var(--s-4)",
          textDecoration: "none",
          color: "inherit",
          cursor: "pointer",
          height: "100%",
          transition: "background 0.18s ease, transform 0.18s ease",
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
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "var(--ink-3, var(--muted-foreground))",
            }}
          >
            {label}
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

        {children !== undefined ? (
          <div style={{ marginTop: "var(--s-2)" }}>{children}</div>
        ) : (
          <div
            style={{
              marginTop: "var(--s-2)",
              display: "flex",
              alignItems: "baseline",
              gap: "var(--s-1)",
              flexWrap: "wrap",
            }}
          >
            <span
              className="tabular-nums"
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: "clamp(22px, 2.8vw, 28px)",
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: "var(--ink, inherit)",
              }}
            >
              {value ?? "—"}
            </span>
            {trendNode}
          </div>
        )}

        <p
          style={{
            marginTop: "var(--s-2)",
            fontSize: 12,
            lineHeight: 1.35,
            color: "var(--ink-3, var(--muted-foreground))",
          }}
        >
          {subtitle}
        </p>

        {contextRow && (
          <div
            style={{
              marginTop: "var(--s-2)",
              fontSize: 11,
              color: "var(--ink-3, var(--muted-foreground))",
              fontFeatureSettings: "'tnum' 1",
            }}
          >
            {contextRow}
          </div>
        )}
      </Link>
    </motion.div>
  );
}

export function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) {
    return (
      <span
        style={{
          fontSize: 12,
          marginLeft: 6,
          color: "var(--ink-3, var(--muted-foreground))",
        }}
      >
        —
      </span>
    );
  }
  const positive = pct >= 0;
  const color = positive ? "rgb(5, 150, 105)" : "rgb(217, 119, 6)";
  const arrow = positive ? "▲" : "▼";
  const sign = positive ? "+" : "";
  return (
    <span
      className="tabular-nums"
      style={{
        fontSize: 12,
        marginLeft: 6,
        color,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {arrow} {sign}
      {pct.toFixed(0)}%
    </span>
  );
}
