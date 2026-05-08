"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { REG_EASE } from "./_shared";

const plates = [
  {
    plate: "I",
    code: "bd",
    market: "Bangladesh",
    role: "Origin Hub",
    coord: "23.81°N · 90.41°E",
    sectors: ["RMG", "Pharma", "BFSI", "Technology"],
    scoutTier: "L1 – L3",
    stat: "Core",
    note: "Home corridor. Deepest scout coverage.",
  },
  {
    plate: "II",
    code: "in",
    market: "India",
    role: "Connected Network",
    coord: "20.59°N · 78.96°E",
    sectors: ["IT / ITES", "Manufacturing", "Compliance"],
    scoutTier: "L2 – L3",
    stat: "Active",
    note: "Cross-border mobility pipeline.",
  },
  {
    plate: "III",
    code: "ae",
    market: "United Arab Emirates",
    role: "Demand Corridor",
    coord: "23.42°N · 53.85°E",
    sectors: ["Construction", "Finance", "Legal", "Oil & Gas"],
    scoutTier: "L2 – L3",
    stat: "Growing",
    note: "High-trust placement gateway.",
  },
];

function Plate({ item, index }: { item: (typeof plates)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.9,
        delay: index * 0.12,
        ease: REG_EASE,
      }}
      className="reg-card-raised relative p-8 sm:p-10 group"
    >
      {/* Plate number as watermark */}
      <div
        aria-hidden
        className="absolute top-6 right-6 reg-numeral text-[88px] sm:text-[104px] leading-none pointer-events-none"
        style={{ color: "var(--reg-ink-whisper)", opacity: 0.7 }}
      >
        {item.plate}
      </div>

      {/* Status dot */}
      <div className="flex items-center gap-2.5">
        <span className="reg-pulse" />
        <span className="reg-micro reg-micro-emerald">{item.stat}</span>
      </div>

      {/* Header */}
      <div className="mt-7">
        <span className="reg-micro">Plate {item.plate}</span>
        <h3 className="reg-display mt-2 text-[24px] sm:text-[28px] leading-tight font-normal">
          {item.market}
        </h3>
        <p className="reg-display-italic mt-1 text-[15px]" style={{ color: "var(--reg-emerald)" }}>
          {item.role}
        </p>
      </div>

      {/* Flag + coordinate */}
      <div className="mt-6 flex items-center gap-3 border-y border-[color:var(--reg-rule)] py-3">
        <img
          src={`https://flagcdn.com/w80/${item.code}.png`}
          srcSet={`https://flagcdn.com/w160/${item.code}.png 2x`}
          alt={`${item.market} flag`}
          className="h-4 w-auto opacity-90"
          loading="lazy"
        />
        <span className="reg-coord">{item.coord}</span>
      </div>

      {/* Attributes */}
      <dl className="mt-6 space-y-4">
        <div className="grid grid-cols-[110px_1fr] gap-4 items-baseline">
          <dt className="reg-micro" style={{ fontSize: "9.5px" }}>
            Sectors
          </dt>
          <dd className="reg-prose text-[13.5px]">
            {item.sectors.join(" · ")}
          </dd>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-4 items-baseline">
          <dt className="reg-micro" style={{ fontSize: "9.5px" }}>
            Scout Access
          </dt>
          <dd className="reg-prose text-[13.5px] font-medium text-[color:var(--reg-ink)]">
            {item.scoutTier}
          </dd>
        </div>
      </dl>

      {/* Footnote */}
      <p className="mt-7 pt-5 border-t border-[color:var(--reg-rule)] reg-coord italic">
        {item.note}
      </p>
    </motion.div>
  );
}

export function Network() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative border-b border-[color:var(--reg-rule)] py-24 sm:py-32 lg:py-40">
      {/* Subtle map dots — decorative, not literal */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--reg-ink-whisper) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <motion.header
          ref={ref}
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: REG_EASE }}
          className="max-w-3xl"
        >
          <div className="reg-marker">
            <span className="reg-marker-rule" />
            <span className="reg-marker-num">§ V</span>
            <span>The Cartogram</span>
          </div>
          <h2 className="reg-display mt-7 text-[36px] sm:text-[46px] lg:text-[56px] leading-[1.02] font-normal max-w-[22ch]">
            Why we don&apos;t claim{" "}
            <span className="reg-display-italic" style={{ color: "var(--reg-emerald)" }}>
              global coverage.
            </span>
          </h2>
          <p className="reg-prose mt-6 max-w-[58ch] text-[15.5px] sm:text-[16px]">
            Most headhunting firms promise reach they can&apos;t prove. We only publish corridors where we have verified scouts with domain expertise on the ground. Everything else is honest expansion, not marketing coverage.
          </p>
        </motion.header>

        {/* Coordinate banner */}
        <div className="mt-12 mb-8 flex items-center justify-between border-y border-[color:var(--reg-rule)] py-3">
          <span className="reg-micro">Three plates · iii corridors</span>
          <span className="reg-coord hidden md:inline">
            BD · 23.81°N 90.41°E &nbsp;·&nbsp; IN · 20.59°N 78.96°E &nbsp;·&nbsp; AE · 23.42°N 53.85°E
          </span>
        </div>

        {/* 3 plates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {plates.map((p, i) => (
            <Plate key={p.market} item={p} index={i} />
          ))}
        </div>

        <div className="mt-10 reg-divider">
          <span className="reg-diamond" />
        </div>
        <p className="mt-6 text-center reg-coord">
          Additional markets accessible via scout and partner expansion — not speculative coverage claims.
        </p>
      </div>
    </section>
  );
}
