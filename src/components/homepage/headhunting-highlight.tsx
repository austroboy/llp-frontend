"use client";

import { useRef } from "react";
import { LockableLink } from "@/components/ui/lockable-link";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import {
  ArrowRight, Users, Target, Handshake, MapPin, ShieldCheck,
  Building2, Briefcase, FileText, Crown, UserRound, Radar, Scale,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const valueProps = [
  { n: "i",   icon: Users,       key: "home.headhuntingHl.v1" },
  { n: "ii",  icon: Target,      key: "home.headhuntingHl.v2" },
  { n: "iii", icon: Handshake,   key: "home.headhuntingHl.v3" },
  { n: "iv",  icon: MapPin,      key: "home.headhuntingHl.v4" },
] as const;

export function HeadhuntingHighlight() {
  const { t } = useLanguage();
  const beamContainerRef = useRef<HTMLDivElement>(null);
  const llpRef = useRef<HTMLDivElement>(null);
  const scoutRef = useRef<HTMLDivElement>(null);
  const leftEmployerRef  = useRef<HTMLDivElement>(null);
  const leftBriefRef     = useRef<HTMLDivElement>(null);
  const leftIndustryRef  = useRef<HTMLDivElement>(null);
  const rightLeaderRef   = useRef<HTMLDivElement>(null);
  const rightSpecialistRef = useRef<HTMLDivElement>(null);
  const rightManagerRef  = useRef<HTMLDivElement>(null);

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6 lg:py-24">
        <div className="hp-marker mb-10 hp-reveal">
          <span className="hp-marker-rule" />
          <span className="hp-marker-section">§ 07</span>
          <span className="hp-marker-label">— The Network</span>
          <span className="hp-marker-tail" />
        </div>

        {/* Row 1 — Two columns: value props (left) | copy + coverage + CTAs (right) */}
        <div className="grid gap-10 lg:grid-cols-2 mb-12">
          {/* Left — How The Network Operates */}
          <div className="hp-reveal hp-reveal-1 order-2 lg:order-1">
            <div className="flex items-center gap-3 mb-4">
              <span style={{
                fontFamily: "var(--hp-mono)", fontSize: 10, letterSpacing: "0.22em",
                textTransform: "uppercase", color: "var(--hp-rust)", fontWeight: 600
              }}>
                How The Network Operates
              </span>
              <span className="flex-1 h-px" style={{ background: "var(--hp-rule)" }} />
            </div>
            <div className="hp-panel">
              {valueProps.map(({ n, icon: Icon, key }) => (
                <div key={key} className="flex items-start gap-4 px-6 py-4 border-b last:border-b-0" style={{ borderColor: "var(--hp-rule)" }}>
                  <span style={{
                    fontFamily: "var(--hp-display)", fontStyle: "italic",
                    fontSize: "1rem", color: "var(--hp-rust)", minWidth: 22,
                    fontVariationSettings: '"opsz" 28, "SOFT" 100'
                  }}>
                    {n}.
                  </span>
                  <div className="flex size-8 shrink-0 items-center justify-center border" style={{
                    borderColor: "var(--hp-rule-strong)",
                    background: "var(--hp-rust-soft)"
                  }}>
                    <Icon style={{ width: 14, height: 14, color: "var(--hp-rust)" }} />
                  </div>
                  <p className="text-sm leading-relaxed pt-0.5" style={{ color: "var(--hp-ink)" }}>
                    {t(key)}
                  </p>
                </div>
              ))}
            </div>

            {/* CTAs under value props */}
            <div className="mt-8 flex flex-wrap gap-3">
              <LockableLink href="/headhunting/connect" className="hp-btn hp-btn--rust group">
                <span>{t("home.headhuntingHl.cta1")}</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </LockableLink>
              <LockableLink href="/headhunting/scout/join" className="hp-btn hp-btn--ghost">
                <span>{t("home.headhuntingHl.cta2")}</span>
              </LockableLink>
            </div>
          </div>

          {/* Right — Title + desc, Coverage, CTAs (stacked) */}
          <div className="hp-reveal hp-reveal-2 order-1 lg:order-2">
            {/* Title + description */}
            <h2 className="hp-h2 mb-5">
              {t("home.headhuntingHl.title")}
            </h2>
            <p className="hp-standfirst max-w-[52ch] mb-10">
              {t("home.headhuntingHl.desc")}
            </p>

            {/* Coverage */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span style={{
                  fontFamily: "var(--hp-mono)", fontSize: 10, letterSpacing: "0.22em",
                  textTransform: "uppercase", color: "var(--hp-rust)", fontWeight: 600
                }}>
                  Coverage
                </span>
                <span className="hp-micro" style={{ letterSpacing: "0.18em" }}>
                  Industries
                </span>
                <span className="flex-1 h-px" style={{ background: "var(--hp-rule)" }} />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-6">
                {["RMG & Textiles", "Manufacturing", "Fintech", "Pharma", "Hospitality", "IT & Software", "Logistics", "FMCG"].map((tag) => (
                  <span key={tag} className="hp-chip hp-chip--rust">{tag}</span>
                ))}
              </div>

              <p className="hp-micro mb-3" style={{ letterSpacing: "0.18em" }}>
                Role Seniority
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  { label: "C-Suite & CXO", sub: "CEO · COO · CFO · CHRO" },
                  { label: "Head of Function", sub: "HR · Finance · Ops · Plant" },
                  { label: "Senior Manager", sub: "Compliance · Legal · Factory" },
                  { label: "Specialist", sub: "Labour law · Audit · Payroll" },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline gap-2 py-1.5" style={{ borderBottom: "1px dashed var(--hp-rule)" }}>
                    <span className="inline-block" style={{
                      width: 4, height: 4,
                      transform: "rotate(45deg)",
                      background: "var(--hp-rust)",
                      marginRight: 2
                    }} />
                    <span className="text-sm" style={{ color: "var(--hp-ink)", fontWeight: 500 }}>{row.label}</span>
                    <span className="text-xs ml-auto" style={{ color: "var(--hp-ink-faint)" }}>{row.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 — Full-width network diagram */}
        <div className="hp-reveal hp-reveal-3 hp-panel">
          <div className="relative px-6 pt-10 pb-14 overflow-hidden" style={{
            background: "linear-gradient(135deg, #1a0f08 0%, #2e1a0a 50%, #1a0f08 100%)",
          }}>
            <div ref={beamContainerRef} className="relative w-full mx-auto" style={{ height: 320, maxWidth: 960 }}>
              {/* Left column — client intake */}
              <NetworkNode nodeRef={leftEmployerRef} icon={Building2} label="Employer" tone="rust"
                style={{ left: 0, top: 0 }} />
              <NetworkNode nodeRef={leftIndustryRef} icon={Briefcase} label="Industry" tone="rust"
                style={{ left: 0, top: "50%", transform: "translate(0, -50%)" }} />
              <NetworkNode nodeRef={leftBriefRef} icon={FileText} label="Brief" tone="rust"
                style={{ left: 0, bottom: 0 }} />

              {/* Center-left hub — LLP */}
              <div className="hp-llp absolute" style={{ left: "38%", top: "50%", transform: "translate(-50%, -50%)" }}>
                <div ref={llpRef} className="hp-orb flex items-center justify-center rounded-full" style={{
                  background: "radial-gradient(circle at 32% 28%, #f3c77a 0%, #d99547 55%, #a8651f 100%)",
                  boxShadow:
                    "0 0 0 1px rgba(255,232,190,0.3) inset, " +
                    "0 0 0 8px rgba(217,149,71,0.14), " +
                    "0 0 44px rgba(217,149,71,0.55)",
                }}>
                  <Scale className="hp-ico" style={{ color: "#fdf6e8", opacity: 0.96 }} />
                </div>
                <span className="hp-hub-label absolute left-1/2 -translate-x-1/2" style={{
                  fontFamily: "var(--hp-mono)", letterSpacing: "0.3em",
                  textTransform: "uppercase", color: "#fdf6e8", opacity: 0.95,
                  fontWeight: 700, whiteSpace: "nowrap",
                }}>
                  LLP
                </span>
              </div>

              {/* Center-right hub — Scout */}
              <div className="hp-scout absolute" style={{ left: "62%", top: "50%", transform: "translate(-50%, -50%)" }}>
                <div ref={scoutRef} className="hp-orb flex items-center justify-center rounded-full" style={{
                  background: "radial-gradient(circle at 32% 28%, #d38044 0%, #b25c22 55%, #8a4416 100%)",
                  boxShadow:
                    "0 0 0 1px rgba(255,220,180,0.22) inset, " +
                    "0 0 0 6px rgba(178,92,34,0.14), " +
                    "0 0 32px rgba(178,92,34,0.55)",
                }}>
                  <Radar className="hp-ico" style={{ color: "#fdf6e8", opacity: 0.94 }} />
                </div>
                <span className="hp-hub-label absolute left-1/2 -translate-x-1/2" style={{
                  fontFamily: "var(--hp-mono)", letterSpacing: "0.26em",
                  textTransform: "uppercase", color: "#f0e8d8", opacity: 0.9,
                  fontWeight: 700, whiteSpace: "nowrap",
                }}>
                  Scout
                </span>
              </div>

              {/* Right column — talent tiers */}
              <NetworkNode nodeRef={rightLeaderRef} icon={Crown} label="C-Suite" tone="amber"
                style={{ right: 0, top: 0 }} align="right" />
              <NetworkNode nodeRef={rightManagerRef} icon={UserRound} label="Manager" tone="amber"
                style={{ right: 0, top: "50%", transform: "translate(0, -50%)" }} align="right" />
              <NetworkNode nodeRef={rightSpecialistRef} icon={ShieldCheck} label="Specialist" tone="amber"
                style={{ right: 0, bottom: 0 }} align="right" />

              {/* Beams: clients → LLP */}
              <AnimatedBeam containerRef={beamContainerRef} fromRef={leftEmployerRef} toRef={llpRef}
                curvature={-32} pathColor="#d99547" pathOpacity={0.22}
                gradientStartColor="#ffd28a" gradientStopColor="#d99547"
                duration={4} delay={0} />
              <AnimatedBeam containerRef={beamContainerRef} fromRef={leftIndustryRef} toRef={llpRef}
                pathColor="#d99547" pathOpacity={0.22}
                gradientStartColor="#ffd28a" gradientStopColor="#d99547"
                duration={4} delay={0.4} />
              <AnimatedBeam containerRef={beamContainerRef} fromRef={leftBriefRef} toRef={llpRef}
                curvature={32} pathColor="#d99547" pathOpacity={0.22}
                gradientStartColor="#ffd28a" gradientStopColor="#d99547"
                duration={4} delay={0.8} />

              {/* Beams: LLP ⇄ Scout (twin-hub, bidirectional) */}
              <AnimatedBeam containerRef={beamContainerRef} fromRef={llpRef} toRef={scoutRef}
                curvature={-14} pathColor="#e8a36a" pathOpacity={0.4}
                gradientStartColor="#ffd28a" gradientStopColor="#d38044"
                duration={3.2} delay={1.2} />
              <AnimatedBeam containerRef={beamContainerRef} fromRef={llpRef} toRef={scoutRef}
                curvature={14} pathColor="#e8a36a" pathOpacity={0.4}
                gradientStartColor="#d38044" gradientStopColor="#ffd28a"
                duration={3.2} delay={2.0} reverse />

              {/* Beams: Scout → talent */}
              <AnimatedBeam containerRef={beamContainerRef} fromRef={scoutRef} toRef={rightLeaderRef}
                curvature={-32} pathColor="#d38044" pathOpacity={0.24}
                gradientStartColor="#d38044" gradientStopColor="#fbbf24"
                duration={4} delay={2.4} />
              <AnimatedBeam containerRef={beamContainerRef} fromRef={scoutRef} toRef={rightManagerRef}
                pathColor="#d38044" pathOpacity={0.24}
                gradientStartColor="#d38044" gradientStopColor="#fbbf24"
                duration={4} delay={2.8} />
              <AnimatedBeam containerRef={beamContainerRef} fromRef={scoutRef} toRef={rightSpecialistRef}
                curvature={32} pathColor="#d38044" pathOpacity={0.24}
                gradientStartColor="#d38044" gradientStopColor="#fbbf24"
                duration={4} delay={3.2} />
            </div>

            {/* Lane labels under diagram */}
            <div className="mt-8 mx-auto grid grid-cols-3" style={{ maxWidth: 960 }}>
              <span className="hp-diagram-lane text-left">Client Intake</span>
              <span className="hp-diagram-lane text-center">LLP ⇄ Scout · Governance & Sourcing</span>
              <span className="hp-diagram-lane text-right">Talent Delivery</span>
            </div>
            <style>{`
              .hp-diagram-lane {
                font-family: var(--hp-mono);
                font-size: 9px;
                letter-spacing: 0.24em;
                text-transform: uppercase;
                color: #d38044;
                font-weight: 600;
                opacity: 0.88;
              }
              /* Hub orbs — mobile-first small, scaled up at sm+ */
              .hp-llp .hp-orb { width: 54px; height: 54px; }
              .hp-llp .hp-ico { width: 22px; height: 22px; }
              .hp-scout .hp-orb { width: 46px; height: 46px; }
              .hp-scout .hp-ico { width: 18px; height: 18px; }
              .hp-hub-label { font-size: 9px; bottom: -22px; }
              @media (min-width: 640px) {
                .hp-llp .hp-orb { width: 86px; height: 86px; }
                .hp-llp .hp-ico { width: 34px; height: 34px; }
                .hp-scout .hp-orb { width: 72px; height: 72px; }
                .hp-scout .hp-ico { width: 28px; height: 28px; }
                .hp-llp .hp-hub-label { font-size: 11px; bottom: -28px; }
                .hp-scout .hp-hub-label { font-size: 10px; bottom: -28px; }
              }
            `}</style>
          </div>
        </div>
      </div>
    </section>
  );
}

type Align = "left" | "right";
type NetworkNodeProps = {
  nodeRef: React.RefObject<HTMLDivElement | null>;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  tone: "rust" | "amber";
  align?: Align;
  style?: React.CSSProperties;
};

function NetworkNode({ nodeRef, icon: Icon, label, tone, align = "left", style }: NetworkNodeProps) {
  const isRust = tone === "rust";
  const ring   = isRust ? "rgba(178,92,34,0.55)" : "rgba(251,191,36,0.55)";
  const glow   = isRust
    ? "0 0 0 4px rgba(178,92,34,0.12), 0 0 18px rgba(178,92,34,0.35)"
    : "0 0 0 4px rgba(251,191,36,0.12), 0 0 18px rgba(251,191,36,0.4)";
  const iconColor = isRust ? "#e28a4a" : "#fbbf24";

  return (
    <div className="absolute flex items-center gap-2.5" style={{
      flexDirection: align === "right" ? "row-reverse" : "row",
      ...style,
    }}>
      <div
        ref={nodeRef}
        className="flex items-center justify-center rounded-full shrink-0"
        style={{
          width: 44, height: 44,
          background: "linear-gradient(135deg, #181109 0%, #24180d 100%)",
          border: `1px solid ${ring}`,
          boxShadow: glow,
        }}
      >
        <Icon style={{ width: 18, height: 18, color: iconColor }} />
      </div>
      <span style={{
        fontFamily: "var(--hp-mono)", fontSize: 9, letterSpacing: "0.22em",
        textTransform: "uppercase", color: "#f0e8d8", opacity: 0.78,
        fontWeight: 600, whiteSpace: "nowrap",
      }}>
        {label}
      </span>
    </div>
  );
}
