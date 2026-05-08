"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Cpu, Users, ShieldCheck } from "lucide-react";
import { REG_EASE } from "./_shared";

const scoutCountries = [
  { code: "bd", alt: "Bangladesh", coord: "23.81°N" },
  { code: "in", alt: "India", coord: "20.59°N" },
  { code: "ae", alt: "UAE", coord: "23.42°N" },
];

const pipelineStats = [
  { label: "Sourced", value: "18" },
  { label: "Screened", value: "07" },
  { label: "Shortlist", value: "03" },
  { label: "Review", value: "03" },
];

function CommissionDocket() {
  return (
    <div className="reg-card-raised relative">
      {/* Corner trim marks */}
      <span className="reg-trim reg-trim--tl" />
      <span className="reg-trim reg-trim--tr" />
      <span className="reg-trim reg-trim--bl" />
      <span className="reg-trim reg-trim--br" />

      {/* Top ribbon: folio + status */}
      <div className="flex items-center justify-between border-b border-[color:var(--reg-rule)] px-6 py-3">
        <span className="reg-micro">Folio 12·087 / Live</span>
        <div className="inline-flex items-center gap-2.5">
          <span className="reg-pulse" />
          <span className="reg-micro reg-micro-emerald">Active Mandate</span>
        </div>
      </div>

      <div className="px-7 pb-7 pt-6">
        {/* Role display */}
        <p className="reg-micro">Commission</p>
        <h3 className="reg-display mt-2 text-[26px] leading-[1.1] font-normal">
          Head of Compliance
        </h3>
        <div className="mt-2 flex items-center gap-2 reg-coord">
          <span>Dhaka · BD</span>
          <span className="text-[color:var(--reg-ink-whisper)]">/</span>
          <span>23.8103°N 90.4125°E</span>
        </div>

        {/* Attributes */}
        <div className="mt-6 space-y-3.5 border-t border-[color:var(--reg-rule)] pt-6">
          <div className="flex items-start gap-3">
            <Cpu className="mt-0.5 size-3.5 shrink-0 text-[color:var(--reg-emerald)]" />
            <p className="text-[12.5px] leading-relaxed text-[color:var(--reg-ink-2)]">
              <span className="reg-micro" style={{ fontSize: "10px" }}>Blueprint</span>
              <br />
              AI-structured · human-verified
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 size-3.5 shrink-0 text-[color:var(--reg-emerald)]" />
            <div className="flex-1">
              <span className="reg-micro" style={{ fontSize: "10px" }}>Scouts Assigned · 03</span>
              <div className="mt-1.5 flex items-center gap-3">
                {scoutCountries.map(({ code, alt, coord }) => (
                  <div key={code} className="flex items-center gap-1.5">
                    <img
                      src={`https://flagcdn.com/w40/${code}.png`}
                      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
                      alt={alt}
                      width={16}
                      height={12}
                      className="h-3 w-auto"
                      loading="eager"
                      decoding="async"
                    />
                    <span className="reg-coord" style={{ fontSize: "8.5px" }}>{coord}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[color:var(--reg-emerald)]" />
            <p className="text-[12.5px] leading-relaxed text-[color:var(--reg-ink-2)]">
              <span className="reg-micro" style={{ fontSize: "10px" }}>Sensitivity</span>
              <br />
              Controlled disclosure
            </p>
          </div>
        </div>

        {/* Pipeline stats with ledger columns */}
        <div className="mt-6 border-t border-[color:var(--reg-rule)] pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {pipelineStats.map(({ label, value }, i) => {
              const isMobileRowStart = i % 2 === 0;
              const isMobileSecondRow = i >= 2;
              const borderL = isMobileRowStart ? (i > 0 ? "sm:border-l" : "") : "border-l";
              const borderT = isMobileSecondRow ? "border-t sm:border-t-0" : "";
              return (
                <div
                  key={label}
                  className={`px-1 py-3 sm:py-0 text-center ${borderL} ${borderT} border-[color:var(--reg-rule)]`}
                >
                  <p className="reg-numeral text-3xl text-[color:var(--reg-ink)]">{value}</p>
                  <p
                    className="mt-1 text-[9.5px] tracking-[0.22em] uppercase text-[color:var(--reg-ink-muted)]"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Progress ledger — diamond markers filled to current */}
          <div className="mt-5 flex items-center gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="flex-1 h-[3px]"
                style={{
                  background:
                    i < 9
                      ? "var(--reg-emerald)"
                      : "var(--reg-rule)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Activity footer */}
        <p className="mt-5 reg-coord">
          Updated 02h ago · Submission received · IN corridor
        </p>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      className="reg-vault relative overflow-hidden isolate"
      style={{ background: "transparent" }}
    >
      {/* ─────────────────────────────────────────────────────────────── */}
      {/*  Layered executive-forest backdrop                              */}
      {/* ─────────────────────────────────────────────────────────────── */}

      {/* Base deep-forest mesh */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 72% 55% at 18% 28%, rgba(42,110,72,0.62) 0%, transparent 60%),
            radial-gradient(ellipse 55% 48% at 82% 18%, rgba(178,92,34,0.15) 0%, transparent 55%),
            radial-gradient(ellipse 90% 70% at 50% 118%, rgba(8,28,20,0.85) 0%, transparent 55%),
            linear-gradient(168deg, #061609 0%, #0d2a1a 28%, #0a2315 62%, #07180d 100%)
          `,
        }}
      />

      {/* Topographic contour lines */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'%3E%3Cg fill='none' stroke='%239ddbb8' stroke-width='0.5'%3E%3Cpath d='M0 180 Q 200 100 400 180 T 800 180'/%3E%3Cpath d='M0 240 Q 180 160 400 240 T 800 240'/%3E%3Cpath d='M0 320 Q 220 240 400 320 T 800 320'/%3E%3Cpath d='M0 400 Q 200 320 400 400 T 800 400'/%3E%3Cpath d='M0 480 Q 240 400 400 480 T 800 480'/%3E%3Cpath d='M0 560 Q 190 480 400 560 T 800 560'/%3E%3Cpath d='M0 640 Q 220 560 400 640 T 800 640'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "1100px 1100px",
          backgroundPosition: "center",
        }}
      />

      {/* Drafting ledger grid */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.045]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(248,241,228,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(248,241,228,0.45) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Grain overlay */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "240px 240px",
        }}
      />

      {/* Aurora orbs */}
      <div
        aria-hidden
        className="absolute top-32 -left-20 -z-10 hidden sm:block rounded-full blur-3xl"
        style={{
          width: 460,
          height: 460,
          background: "radial-gradient(circle, rgba(61,138,99,0.32) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-10 -z-10 rounded-full blur-3xl"
        style={{
          right: "18%",
          width: 340,
          height: 340,
          background: "radial-gradient(circle, rgba(74,222,128,0.10) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -z-10 rounded-full blur-3xl"
        style={{
          bottom: "8%",
          right: "-5%",
          width: 360,
          height: 360,
          background: "radial-gradient(circle, rgba(211,128,68,0.14) 0%, transparent 70%)",
        }}
      />

      {/* Left margin rule — legal ledger */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 -z-10 hidden md:block"
        style={{
          left: "min(7vw, 56px)",
          width: 1,
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(178,92,34,0.34) 12%, rgba(178,92,34,0.34) 88%, transparent 100%)",
        }}
      />

      {/* Horizon glow — emerald sunrise strip at top */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] -z-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(157,219,184,0.45) 20%, rgba(157,219,184,0.45) 80%, transparent 100%)",
          filter: "blur(0.5px)",
        }}
      />

      {/* Bottom fade into next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 -z-10"
        style={{
          background:
            "linear-gradient(to top, var(--background), transparent)",
        }}
      />

      {/* ─────────────────────────────────────────────────────────────── */}
      {/*  Content                                                        */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 pt-24 sm:pt-28 lg:pt-32 pb-20 sm:pb-24 lg:pb-28">

        {/* Section meta bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: REG_EASE }}
          className="flex items-center justify-between gap-6"
        >
          <div className="reg-marker">
            <span className="reg-marker-rule" />
            <span className="reg-marker-num">§ I</span>
            <span>The Commission</span>
          </div>
          <div className="reg-coord hidden sm:block">
            Registry · LLP Headhunting · Cartogram BD · IN · AE
          </div>
        </motion.div>

        {/* Live status pill — cross-border / human-verified / scout-led */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: REG_EASE }}
          className="mt-10 inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(12px)",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: "0.68rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(240,232,216,0.7)",
          }}
        >
          <span className="relative flex size-1.5">
            <span
              className="absolute inline-flex size-full animate-ping rounded-full opacity-75"
              style={{ background: "#4ade80" }}
            />
            <span
              className="relative inline-flex size-1.5 rounded-full"
              style={{ background: "#4ade80" }}
            />
          </span>
          Cross-border · scout-led · human-verified
        </motion.div>

        {/* Editorial spread */}
        <div className="mt-8 grid lg:grid-cols-[1fr_460px] xl:grid-cols-[1fr_480px] gap-12 lg:gap-20 items-end">
          {/* Left: display headline */}
          <div className="relative">
            {/* Oversized watermark numeral */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-14 -left-8 select-none"
              style={{
                fontFamily: "var(--hp-italic)",
                fontStyle: "italic",
                fontSize: "clamp(260px, 34vw, 440px)",
                lineHeight: 1,
                letterSpacing: "-0.06em",
                color: "rgba(157,219,184,0.05)",
                fontVariationSettings: '"opsz" 144, "SOFT" 100',
              }}
            >
              I
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: REG_EASE }}
              className="relative"
            >
              <h1
                className="mt-4 font-normal max-w-[18ch]"
                style={{
                  fontFamily: "var(--hp-display)",
                  fontSize: "clamp(2.75rem, 6.4vw, 5.5rem)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.025em",
                  color: "#f3ebdb",
                  fontVariationSettings: '"opsz" 96, "SOFT" 30',
                }}
              >
                The search{" "}
                <span className="relative inline-block">
                  <em
                    style={{
                      fontStyle: "italic",
                      color: "#9ddbb8",
                      fontFamily: "var(--hp-italic)",
                      fontVariationSettings: '"opsz" 144, "SOFT" 100',
                    }}
                  >
                    begins
                  </em>
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 -bottom-1 h-[2px] origin-left animate-[regSweep_2s_cubic-bezier(0.16,1,0.3,1)_0.5s_forwards] scale-x-0"
                    style={{
                      background:
                        "linear-gradient(to right, rgba(157,219,184,0.8), rgba(157,219,184,0.15))",
                    }}
                  />
                </span>
                <br />
                at the brief,
                <br />
                not the résumé.
              </h1>

              <p
                className="mt-7 max-w-[52ch]"
                style={{
                  fontFamily: "var(--hp-body)",
                  fontSize: "clamp(0.98rem, 1.1vw, 1.08rem)",
                  lineHeight: 1.65,
                  color: "rgba(240,232,216,0.66)",
                }}
              >
                Most hires fail before the first candidate is ever seen —
                because the brief was never truly understood. We don&apos;t
                start searching until the role is decomposed, scored, and
                confirmed. Then we activate a network of verified scouts
                across three corridors, under sensitivity controls.
              </p>

              {/* Cartogram mini-band — scout corridors */}
              <div
                className="mt-8 inline-flex items-center gap-5 px-4 py-2.5"
                style={{
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(240,232,216,0.5)",
                  }}
                >
                  Corridors
                </span>
                {scoutCountries.map(({ code, alt, coord }, i) => (
                  <div
                    key={code}
                    className="inline-flex items-center gap-1.5"
                    style={{ opacity: i === 1 ? 1 : 0.85 }}
                  >
                    <img
                      src={`https://flagcdn.com/w40/${code}.png`}
                      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
                      alt={alt}
                      width={16}
                      height={12}
                      className="h-3 w-auto"
                      loading="eager"
                      decoding="async"
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        color: "rgba(157,219,184,0.7)",
                        fontWeight: 600,
                      }}
                    >
                      {code.toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 9.5,
                        letterSpacing: "0.12em",
                        color: "rgba(240,232,216,0.36)",
                      }}
                    >
                      {coord}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/headhunting/connect" className="reg-btn-primary group">
                  <span>Commission a Search</span>
                  <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
                <Link href="/headhunting/scout/join" className="reg-btn-ghost">
                  Apply as Scout
                </Link>
              </div>

              <div
                className="mt-6"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  color: "rgba(240,232,216,0.42)",
                }}
              >
                Partner or expert?{" "}
                <Link
                  href="/headhunting/collab"
                  className="transition-colors"
                  style={{
                    textDecoration: "underline",
                    textDecorationColor: "rgba(157,219,184,0.55)",
                    textDecorationStyle: "dotted",
                    textUnderlineOffset: 4,
                    color: "rgba(240,232,216,0.68)",
                  }}
                >
                  Explore collaboration →
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Right: docket */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: REG_EASE }}
            className="relative"
          >
            {/* Glow behind docket */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-4 -z-10 blur-2xl"
              style={{
                background:
                  "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(157,219,184,0.12) 0%, transparent 70%)",
              }}
            />
            <CommissionDocket />

            {/* Floating metric badge */}
            <div
              className="hidden lg:flex absolute -bottom-6 -left-3 items-center gap-2.5 px-3.5 py-2"
              style={{
                background: "rgba(8,24,16,0.94)",
                border: "1px solid rgba(157,219,184,0.22)",
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.6)",
                backdropFilter: "blur(10px)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--hp-italic)",
                  fontStyle: "italic",
                  fontSize: "0.98rem",
                  color: "#f0e8d8",
                  fontWeight: 600,
                  fontVariationSettings: '"opsz" 24, "SOFT" 100',
                }}
              >
                3 corridors
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 9.5,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(240,232,216,0.55)",
                }}
              >
                active now
              </span>
            </div>
          </motion.div>
        </div>

        {/* Bottom meta ribbon */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="mt-24 pt-5 flex flex-wrap items-center justify-between gap-x-10 gap-y-3"
          style={{ borderTop: "1px solid rgba(240,232,216,0.1)" }}
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-block"
              style={{
                width: 8,
                height: 8,
                transform: "rotate(45deg)",
                border: "1px solid #d38044",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(240,232,216,0.56)",
              }}
            >
              Est · 2020 · Dhaka
            </span>
          </div>

          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "rgba(240,232,216,0.42)",
            }}
          >
            Active corridors · BD 23.81°N · IN 20.59°N · AE 23.42°N
          </span>
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(240,232,216,0.4)",
            }}
          >
            Scroll to · § II The Protocol
          </span>
        </motion.div>
      </div>
    </section>
  );
}
