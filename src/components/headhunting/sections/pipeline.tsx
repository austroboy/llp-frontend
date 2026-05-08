"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { LayoutDashboard, Users, CheckSquare } from "lucide-react";
import { REG_EASE } from "./_shared";

const stages = [
  { label: "Scoped", state: "completed", note: "d+0" },
  { label: "Activated", state: "completed", note: "d+1" },
  { label: "Sourcing", state: "active", note: "d+7" },
  { label: "Screening", state: "pending", note: "d+14" },
  { label: "Shortlisted", state: "pending", note: "d+21" },
  { label: "Review", state: "pending", note: "d+30" },
  { label: "Closed", state: "pending", note: "d+45" },
] as const;

const activeIndex = stages.findIndex((s) => s.state === "active");

const footnotes = [
  {
    icon: LayoutDashboard,
    party: "Employers",
    text: "See mandate status, shortlist movement, and review outcomes — without chasing anyone for updates.",
  },
  {
    icon: Users,
    party: "Scouts",
    text: "See scoped briefs, submission feedback, and placement updates within their access tier.",
  },
  {
    icon: CheckSquare,
    party: "LLP",
    text: "Controls every stage transition and approval checkpoint. Nothing moves without validation.",
  },
];

export function Pipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="reg-section--services-paper relative border-b border-[color:var(--reg-rule)] py-24 sm:py-32 lg:py-40">
      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <motion.header
          ref={ref}
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: REG_EASE }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="reg-marker justify-center">
            <span className="reg-marker-rule" />
            <span className="reg-marker-num">§ VI</span>
            <span>The Ledger</span>
          </div>
          <h2 className="reg-display mt-7 text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.04] font-normal">
            You should never have to ask{" "}
            <span className="reg-display-italic" style={{ color: "var(--reg-emerald)" }}>
              &ldquo;what&apos;s happening?&rdquo;
            </span>
          </h2>
          <p className="reg-prose mt-6 mx-auto max-w-[54ch] text-[15.5px] sm:text-[16px]">
            Hiring processes go dark because there&apos;s no system behind them. Every LLP mandate moves through visible, controlled stages — so you always know where things stand.
          </p>
        </motion.header>

        {/* Timeline ledger */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.15, ease: REG_EASE }}
          className="mt-16 reg-card-raised overflow-x-auto"
        >
          <div className="min-w-[820px] px-6 py-8 sm:px-8 sm:py-10 lg:px-14 lg:py-14 relative">
            {/* Header row */}
            <div className="flex items-center justify-between mb-10">
              <span className="reg-micro">Ledger · Mandate Progress</span>
              <span className="reg-coord">
                mandate #12·087 · stage {activeIndex + 1} of {stages.length}
              </span>
            </div>

            {/* Base rule */}
            <div className="relative mx-auto">
              <div
                className="absolute top-[11px] left-0 right-0 h-px"
                style={{ background: "var(--reg-rule)" }}
              />
              {/* Emerald progress rule */}
              <div
                className="absolute top-[11px] left-0 h-px"
                style={{
                  width: `${(activeIndex / (stages.length - 1)) * 100}%`,
                  background: "var(--reg-emerald)",
                }}
              />

              <div className="relative z-10 flex items-start justify-between">
                {stages.map((stage, i) => (
                  <div
                    key={stage.label}
                    className="flex flex-col items-center gap-2.5 px-2 flex-1"
                  >
                    {/* Node — diamond shape */}
                    {stage.state === "completed" && (
                      <div
                        className="w-[18px] h-[18px] mt-[2px]"
                        style={{
                          background: "var(--reg-emerald)",
                          transform: "rotate(45deg)",
                        }}
                      />
                    )}
                    {stage.state === "active" && (
                      <div className="relative w-[22px] h-[22px] mt-0">
                        <span
                          className="absolute inset-0"
                          style={{
                            background: "var(--reg-paper)",
                            border: "2px solid var(--reg-emerald)",
                            transform: "rotate(45deg)",
                          }}
                        />
                        <span
                          className="absolute inset-[5px]"
                          style={{
                            background: "var(--reg-emerald)",
                            transform: "rotate(45deg)",
                            animation: "reg-pulse-ring 2.4s ease-in-out infinite",
                          }}
                        />
                      </div>
                    )}
                    {stage.state === "pending" && (
                      <div
                        className="w-[16px] h-[16px] mt-[3px]"
                        style={{
                          border: "1px solid var(--reg-ink-whisper)",
                          transform: "rotate(45deg)",
                        }}
                      />
                    )}

                    {/* Label */}
                    <span
                      className="reg-numeral text-xs mt-1"
                      style={{
                        color:
                          stage.state === "pending"
                            ? "var(--reg-ink-faint)"
                            : "var(--reg-ink)",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="text-[12px] font-medium"
                      style={{
                        color:
                          stage.state === "pending"
                            ? "var(--reg-ink-muted)"
                            : stage.state === "active"
                              ? "var(--reg-emerald)"
                              : "var(--reg-ink)",
                      }}
                    >
                      {stage.label}
                    </span>
                    <span className="reg-coord" style={{ fontSize: "9px" }}>
                      {stage.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer ribbon */}
            <div className="mt-10 pt-6 border-t border-[color:var(--reg-rule)] grid sm:grid-cols-3 gap-6">
              {footnotes.map(({ icon: Icon, party, text }) => (
                <div key={party} className="flex gap-3">
                  <Icon
                    className="size-4 shrink-0 mt-0.5"
                    style={{ color: "var(--reg-emerald)" }}
                  />
                  <div>
                    <p className="reg-micro" style={{ fontSize: "9.5px" }}>
                      {party}
                    </p>
                    <p className="mt-1 reg-prose text-[12.5px] leading-relaxed">
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
