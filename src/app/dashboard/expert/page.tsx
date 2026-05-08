"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { useAccountType } from "@/components/providers/account-context";
import { Award, ArrowRight } from "lucide-react";
import Link from "next/link";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";

export default function ExpertNetworkPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const { isOrgUser } = useAccountType();
  const router = useRouter();
  const userId = user?.id;

  if (isOrgUser) { router.replace("/dashboard"); return null; }

  const expert = useQuery(
    api.experts.getByClerkId,
    userId ? { clerkId: userId } : "skip"
  );

  const hasProfile = !!expert;
  const status = expert?.status ?? "not_started";

  const statusBadge: Record<
    string,
    { label: string; variant: "live" | "busy" | "off" }
  > = {
    draft: { label: "Draft", variant: "off" },
    pending: { label: "Under Review", variant: "busy" },
    published: { label: "Confirmed", variant: "live" },
    rejected: { label: "Not Confirmed", variant: "busy" },
    not_started: { label: "Not Started", variant: "off" },
  };

  const badge = statusBadge[status] ?? statusBadge.not_started;

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
            Personal Desk · {today} · <strong>Expert Network</strong>
          </div>
          <h1 className="dash-hello-title">
            {t("dashboard.nav.expertNetwork")} <em>profile.</em>
          </h1>
          <p className="dash-hello-sub">
            Manage your expert profile and marketplace presence.
          </p>
        </div>
      </div>

      {/* ── Profile card ────────────────────────────────────── */}
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
              <Award className="size-5" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                className="lf-h3"
                style={{ fontSize: 15, marginBottom: 6 }}
              >
                Expert Profile
              </p>
              <span className={`lf-status lf-status--${badge.variant}`}>
                <span className="lf-status-dot" />
                {badge.label}
              </span>
              {expert?.bio && (
                <p
                  className="lf-body"
                  style={{
                    fontSize: 12,
                    marginTop: 6,
                    color: "var(--ink-3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {expert.bio}
                </p>
              )}
            </div>
          </div>
          <Link
            href={hasProfile ? "/dashboard/profile" : "/experts/apply"}
            className="lf-cta lf-cta--ghost"
          >
            {hasProfile ? "Manage Profile" : "Get Started"}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Pending actions ─────────────────────────────────── */}
      {hasProfile && (
        <section className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">Pending Actions</h2>
          </div>
          <div className="dash-empty">
            <p className="dash-empty-body">
              No pending actions at this time.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
