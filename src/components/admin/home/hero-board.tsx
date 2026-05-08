"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DashboardOverviewError,
  DashboardOverviewResponse,
  SpendBucket,
} from "@/app/admin/dashboard-overview/types";
import { HeroNetMarginCard } from "./hero-net-margin-card";
import { HeroMiniCard } from "./hero-mini-card";
import { HeroSparkline } from "./hero-sparkline";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

// ── helpers ─────────────────────────────────────────────────────

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}
function fmtUsdShort(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}
function fmtCents(usd: number): string {
  return `${(usd * 100).toFixed(2)}¢`;
}
function fmtInt(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}
function truncate(s: string | null | undefined, max: number): string {
  if (!s) return "—";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** ISO 3166-1 alpha-2 → flag emoji. */
function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const cc = code.toUpperCase();
  const A = 0x41;
  const REGIONAL_INDICATOR_A = 0x1f1e6;
  const c1 = cc.charCodeAt(0) - A;
  const c2 = cc.charCodeAt(1) - A;
  if (c1 < 0 || c1 > 25 || c2 < 0 || c2 > 25) return "";
  return String.fromCodePoint(REGIONAL_INDICATOR_A + c1, REGIONAL_INDICATOR_A + c2);
}

function findError(
  errors: DashboardOverviewError[] | undefined,
  source: DashboardOverviewError["source"],
): DashboardOverviewError | null {
  if (!errors) return null;
  return errors.find((e) => e.source === source) ?? null;
}

// ── tier mix bar ────────────────────────────────────────────────

function TierMixBar({ tierMix }: { tierMix: SpendBucket["tierMix"] }) {
  const free = tierMix.free_guest + tierMix.free_subscribed;
  const mini = tierMix.mini;
  const max = tierMix.max;
  const total = free + mini + max;
  if (total === 0) {
    return (
      <span
        className="tabular-nums"
        style={{
          fontFamily: "var(--lf-display)",
          fontSize: "clamp(20px, 2.6vw, 26px)",
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: "var(--ink, inherit)",
        }}
      >
        —
      </span>
    );
  }
  const freePct = (free / total) * 100;
  const miniPct = (mini / total) * 100;
  const maxPct = (max / total) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
          background: "var(--glass-border, rgba(0,0,0,0.08))",
        }}
        aria-label={`Free ${freePct.toFixed(0)}%, Mini ${miniPct.toFixed(0)}%, Max ${maxPct.toFixed(0)}%`}
      >
        {freePct > 0 && (
          <div style={{ width: `${freePct}%`, background: "rgb(148, 163, 184)" }} />
        )}
        {miniPct > 0 && (
          <div style={{ width: `${miniPct}%`, background: "var(--accent-blue, #2563eb)" }} />
        )}
        {maxPct > 0 && (
          <div style={{ width: `${maxPct}%`, background: "rgb(217, 119, 6)" }} />
        )}
      </div>
      <div
        className="tabular-nums"
        style={{
          fontSize: 11,
          color: "var(--ink-2, var(--muted-foreground))",
          display: "flex",
          gap: "var(--s-2)",
          flexWrap: "wrap",
        }}
      >
        <span>Free {freePct.toFixed(0)}%</span>
        <span>Mini {miniPct.toFixed(0)}%</span>
        <span>Max {maxPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ── skeleton variants ───────────────────────────────────────────

function MiniCardSkeleton() {
  return (
    <div
      className="lf-card"
      style={{
        padding: "var(--s-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-2)",
        height: "100%",
      }}
    >
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="h-7 w-24 mt-1" />
      <Skeleton className="h-3 w-32 mt-1" />
      <Skeleton className="h-2.5 w-24 mt-1" />
    </div>
  );
}

function NetMarginSkeleton() {
  return (
    <div
      className="lf-card"
      style={{
        padding: "var(--s-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-3)",
        height: "100%",
      }}
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-12 w-40" />
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function WideCardSkeleton() {
  return (
    <div
      className="lf-card"
      style={{
        padding: "var(--s-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-2)",
        height: "100%",
      }}
    >
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-7 w-32 mt-1" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

// ── main component ──────────────────────────────────────────────

export function HeroBoard() {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreachable, setUnreachable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setUnreachable(false);
    try {
      const res = await fetch("/api/admin/dashboard/overview?tz=Asia/Dhaka", {
        cache: "no-store",
      });
      if (!res.ok) {
        setUnreachable(true);
        setData(null);
      } else {
        const json = (await res.json()) as DashboardOverviewResponse;
        setData(json);
      }
    } catch {
      setUnreachable(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ── derived ────────────────────────────────────────────────────
  const convexErr = findError(data?.errors, "convex");
  const calcErr = findError(data?.errors, "calc-engine");
  const phErr = findError(data?.errors, "posthog");
  const spendErrored = !!convexErr;
  const marginErrored = !!calcErr;
  const audienceErrored = !!phErr;
  const qualityErrored = !!phErr;

  const today = data?.spend.today;
  const week = data?.spend.week;
  const month = data?.spend.month;
  const audience = data?.audience;
  const quality = data?.quality;

  // ── render ─────────────────────────────────────────────────────

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ marginBottom: "var(--s-6)" }}
        aria-label="Admin overview"
      >
        {/* Section kicker + refresh */}
        <motion.div
          variants={fadeUp}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--s-3)",
            gap: "var(--s-2)",
          }}
        >
          <span
            className="lf-meta"
            style={{
              textTransform: "uppercase",
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "var(--ink-3, var(--muted-foreground))",
            }}
          >
            Today at a glance
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="lf-icon-btn"
            aria-label="Refresh dashboard data"
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              padding: "4px 8px",
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            <RefreshCw
              size={12}
              style={{
                animation: loading ? "spin 0.8s linear infinite" : undefined,
              }}
            />
            Refresh
          </button>
        </motion.div>

        {/* ── Row 1 — Money board ── */}
        <div
          className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-4"
          style={{ marginBottom: "var(--s-4)" }}
        >
          {/* Hero net margin card (lg:col-span-1, dominant) */}
          <div className="lg:col-span-1">
            {loading || (!data && !unreachable) ? (
              <NetMarginSkeleton />
            ) : (
              <HeroNetMarginCard
                today={data?.margin.today ?? { netMarginUsd: 0, deltaPctVsPrior: null }}
                week={data?.margin.week ?? { netMarginUsd: 0, deltaPctVsPrior: null }}
                month={data?.margin.month ?? { netMarginUsd: 0, deltaPctVsPrior: null }}
                errored={marginErrored}
                errorMessage={calcErr?.message}
                unreachable={unreachable}
              />
            )}
          </div>

          {/* 6 mini cards on the right (2x3 at lg+) */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {loading || (!data && !unreachable)
                ? Array.from({ length: 6 }).map((_, i) => (
                    <MiniCardSkeleton key={i} />
                  ))
                : (
                    <>
                      {/* 1. Users */}
                      <HeroMiniCard
                        label="Users"
                        subtitle="People who chatted today"
                        value={fmtInt(today?.users ?? 0)}
                        href="/admin/chat-usage"
                        errored={spendErrored}
                        errorMessage={convexErr?.message}
                        contextRow={
                          <>
                            Wk {fmtInt(week?.users ?? 0)} · Mo {fmtInt(month?.users ?? 0)}
                          </>
                        }
                      />
                      {/* 2. Chats */}
                      <HeroMiniCard
                        label="Chats"
                        subtitle="Conversations started today"
                        value={fmtInt(today?.chats ?? 0)}
                        href="/admin/chat-usage"
                        errored={spendErrored}
                        errorMessage={convexErr?.message}
                        contextRow={
                          <>
                            Wk {fmtInt(week?.chats ?? 0)} · Mo {fmtInt(month?.chats ?? 0)}
                          </>
                        }
                      />
                      {/* 3. Our cost */}
                      <HeroMiniCard
                        label="Our cost"
                        subtitle="Real money paid Grok + Gemini"
                        value={fmtUsd(today?.llpUsd ?? 0)}
                        href="/admin/chat-usage?tab=daily"
                        errored={spendErrored}
                        errorMessage={convexErr?.message}
                        contextRow={
                          <>
                            Wk {fmtUsdShort(week?.llpUsd ?? 0)} · Mo {fmtUsdShort(month?.llpUsd ?? 0)}
                          </>
                        }
                      />
                      {/* 4. Subscription savings */}
                      <HeroMiniCard
                        label="Subscription savings"
                        subtitle="Claude/GPT subs absorbed"
                        value={fmtUsd(today?.subsidyUsd ?? 0)}
                        href="/admin/chat-usage?tab=daily"
                        errored={spendErrored}
                        errorMessage={convexErr?.message}
                        contextRow={
                          <>
                            Wk {fmtUsdShort(week?.subsidyUsd ?? 0)} · Mo {fmtUsdShort(month?.subsidyUsd ?? 0)}
                          </>
                        }
                      />
                      {/* 5. Average per chat */}
                      <HeroMiniCard
                        label="Average per chat"
                        subtitle="Cost of one conversation"
                        value={fmtCents(today?.avgPerChatUsd ?? 0)}
                        href="/admin/cost-calculator"
                        errored={spendErrored}
                        errorMessage={convexErr?.message}
                        contextRow={
                          <>
                            Wk {fmtCents(week?.avgPerChatUsd ?? 0)} · Mo {fmtCents(month?.avgPerChatUsd ?? 0)}
                          </>
                        }
                      />
                      {/* 6. Who's using it (tier mix bar) */}
                      <HeroMiniCard
                        label="Who's using it"
                        subtitle="Free / Mini / Max breakdown"
                        href="/admin/users"
                        errored={spendErrored}
                        errorMessage={convexErr?.message}
                      >
                        <TierMixBar
                          tierMix={
                            today?.tierMix ?? {
                              free_guest: 0,
                              free_subscribed: 0,
                              mini: 0,
                              max: 0,
                            }
                          }
                        />
                      </HeroMiniCard>
                    </>
                  )}
            </div>
          </div>
        </div>

        {/* ── Row 2 — Audience pulse ── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
          style={{ marginBottom: "var(--s-4)" }}
        >
          {loading || (!data && !unreachable) ? (
            <>
              <WideCardSkeleton />
              <WideCardSkeleton />
              <WideCardSkeleton />
              <WideCardSkeleton />
            </>
          ) : (
            <>
              {/* Daily users — sparkline + today value */}
              <HeroMiniCard
                label="Daily users"
                subtitle="30-day visitor trend"
                href="/admin/analytics?tab=audience"
                errored={audienceErrored}
                errorMessage={phErr?.message}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                    {fmtInt(audience?.todayDau ?? 0)}
                  </span>
                  <HeroSparkline data={audience?.dauSparkline ?? []} />
                </div>
              </HeroMiniCard>

              {/* Most viewed page */}
              <HeroMiniCard
                label="Most viewed page"
                subtitle="Where people land"
                href="/admin/analytics?tab=engagement"
                errored={audienceErrored}
                errorMessage={phErr?.message}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontSize: 16,
                      fontWeight: 500,
                      lineHeight: 1.2,
                      color: "var(--ink, inherit)",
                      wordBreak: "break-all",
                    }}
                  >
                    {audience?.topPage?.path ?? "—"}
                  </span>
                  {audience?.topPage && (
                    <span
                      className="tabular-nums"
                      style={{ fontSize: 12, color: "var(--ink-3, var(--muted-foreground))" }}
                    >
                      {fmtInt(audience.topPage.views)} views
                    </span>
                  )}
                </div>
              </HeroMiniCard>

              {/* Most asked question */}
              <HeroMiniCard
                label="Most asked question"
                subtitle="What people want to know"
                href="/admin/analytics?tab=chat"
                errored={audienceErrored}
                errorMessage={phErr?.message}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontSize: 14,
                      fontWeight: 500,
                      lineHeight: 1.3,
                      color: "var(--ink, inherit)",
                    }}
                  >
                    {truncate(audience?.topQuery?.text, 60)}
                  </span>
                  {audience?.topQuery && (
                    <span
                      className="tabular-nums"
                      style={{ fontSize: 12, color: "var(--ink-3, var(--muted-foreground))" }}
                    >
                      {fmtInt(audience.topQuery.count)} asks
                    </span>
                  )}
                </div>
              </HeroMiniCard>

              {/* Top country */}
              <HeroMiniCard
                label="Top country"
                subtitle="Where users are based"
                href="/admin/analytics?tab=audience"
                errored={audienceErrored}
                errorMessage={phErr?.message}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--s-2)",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 28, lineHeight: 1 }}>
                    {flagEmoji(audience?.topCountry?.code) || "🌐"}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span
                      style={{
                        fontFamily: "var(--lf-display)",
                        fontSize: 18,
                        fontWeight: 500,
                        lineHeight: 1,
                        color: "var(--ink, inherit)",
                      }}
                    >
                      {audience?.topCountry?.name ?? "—"}
                    </span>
                    {audience?.topCountry && (
                      <span
                        className="tabular-nums"
                        style={{ fontSize: 12, color: "var(--ink-3, var(--muted-foreground))" }}
                      >
                        {audience.topCountry.pct.toFixed(0)}% of users
                      </span>
                    )}
                  </div>
                </div>
              </HeroMiniCard>
            </>
          )}
        </div>

        {/* ── Row 3 — Health ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {loading || (!data && !unreachable) ? (
            <>
              <WideCardSkeleton />
              <WideCardSkeleton />
            </>
          ) : (
            <>
              {/* Answers backed by law */}
              <HeroMiniCard
                label="Answers backed by law"
                subtitle="% of replies with verified citations"
                href="/admin/analytics?tab=quality"
                errored={qualityErrored}
                errorMessage={phErr?.message}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                    {quality?.citationHealthPct === null || quality?.citationHealthPct === undefined
                      ? "—"
                      : `${quality.citationHealthPct.toFixed(0)}%`}
                  </span>
                  <HeroSparkline data={quality?.citationTrend7d ?? []} />
                </div>
              </HeroMiniCard>

              {/* Most common error */}
              <HeroMiniCard
                label="Most common error"
                subtitle="Top issue users hit today"
                href="/admin/analytics?tab=quality"
                errored={qualityErrored}
                errorMessage={phErr?.message}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontSize: 14,
                      fontWeight: 500,
                      lineHeight: 1.3,
                      color: "var(--ink, inherit)",
                    }}
                  >
                    {truncate(quality?.topException?.message, 80)}
                  </span>
                  {quality?.topException && (
                    <span
                      className="tabular-nums"
                      style={{ fontSize: 12, color: "var(--ink-3, var(--muted-foreground))" }}
                    >
                      {fmtInt(quality.topException.count)} occurrences
                    </span>
                  )}
                  {!quality?.topException && data && (
                    <span style={{ fontSize: 12, color: "var(--ink-3, var(--muted-foreground))" }}>
                      No errors today — all clear.
                    </span>
                  )}
                </div>
              </HeroMiniCard>
            </>
          )}
        </div>

        {/* spinner keyframe (scoped, avoids global addition) */}
        <style jsx>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </motion.section>
    </MotionConfig>
  );
}
