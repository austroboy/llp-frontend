"use client";

import { useUser } from "@clerk/nextjs";
import { useAccountType } from "@/components/providers/account-context";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { Crosshair, ArrowRight } from "lucide-react";
import Link from "next/link";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";

export default function HeadhuntingHubPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const router = useRouter();
  const { isOrgUser } = useAccountType();
  const userId = user?.id;

  // Org users should use the full hiring request form, not the scout hub
  useEffect(() => {
    if (isOrgUser) router.replace("/headhunting/connect");
  }, [isOrgUser, router]);

  const scoutProfile = useQuery(
    api.headhunting.scoutProfiles.getByUser,
    userId ? { clerkId: userId } : "skip"
  );

  const hasScoutProfile = !!scoutProfile;
  const scoutStatus = scoutProfile?.status ?? "not_started";

  const statusBadge: Record<
    string,
    { label: string; variant: "live" | "busy" | "off" }
  > = {
    draft: { label: "Draft", variant: "off" },
    submitted: { label: "Under Review", variant: "busy" },
    under_review: { label: "Under Review", variant: "busy" },
    approved: { label: "Confirmed", variant: "live" },
    rejected: { label: "Not Confirmed", variant: "busy" },
    not_started: { label: "Not Started", variant: "off" },
  };

  const badge = statusBadge[scoutStatus] ?? statusBadge.not_started;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <DashboardBackNav />

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">
            Personal Desk · {today} · <strong>Headhunting</strong>
          </div>
          <h1 className="dash-hello-title">
            {t("dashboard.nav.headhunting")} <em>scout hub.</em>
          </h1>
          <p className="dash-hello-sub">
            Your scout activity hub — track your profile, opportunities, and
            referrals.
          </p>
        </div>
      </div>

      {/* ── Scout Profile Status ────────────────────────────── */}
      <div
        className="lf-card"
        style={{ padding: "var(--s-4)", marginBottom: "var(--s-3)" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              className="lf-avatar"
              aria-hidden
              style={{ width: 44, height: 44 }}
            >
              <Crosshair className="size-5" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                className="lf-h3"
                style={{ fontSize: 15, marginBottom: 6 }}
              >
                Scout Profile
              </p>
              <span className={`lf-status lf-status--${badge.variant}`}>
                <span className="lf-status-dot" />
                {badge.label}
              </span>
            </div>
          </div>
          <Link
            href={
              hasScoutProfile
                ? "/dashboard/profile"
                : "/headhunting/scout/join"
            }
            className="lf-cta lf-cta--ghost"
          >
            {hasScoutProfile ? "View Profile" : "Join as Scout"}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Recommended Opportunities ───────────────────────── */}
      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Recommended Opportunities</h2>
        </div>
        <div className="dash-empty">
          <p className="dash-empty-body">
            Opportunities matching your profile will appear here once
            role-based matching is enabled.
          </p>
        </div>
      </section>

      {/* ── Referral Activity ───────────────────────────────── */}
      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Referral Activity</h2>
        </div>
        <div className="dash-empty">
          <p className="dash-empty-body">
            Referral activity will appear here once role sharing and tracked
            candidate applications are enabled.
          </p>
        </div>
      </section>

      {/* ── Quick links ─────────────────────────────────────── */}
      {hasScoutProfile && (
        <section className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">Scout workspace</h2>
          </div>
          <div className="dash-next-grid">
            {[
              { href: "/dashboard/briefs", label: "My Briefs" },
              { href: "/dashboard/submissions", label: "Submissions" },
              { href: "/dashboard/earnings", label: "Earnings" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="dash-next-card">
                <span className="dash-next-kicker">Scout</span>
                <h3 className="dash-next-title">{label}</h3>
                <span className="dash-next-meta">
                  Open <strong>→</strong>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
