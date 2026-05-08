"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Crosshair,
  MapPin,
  Banknote,
  Building2,
  ArrowRight,
  Sparkles,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";

type FilterTab = "all" | "pending" | "responded";

const statusToneMap: Record<string, "active" | "idle" | "not-started"> = {
  pending: "idle",
  interested: "active",
  declined: "not-started",
  shared: "active",
  withdrawn: "not-started",
};

export default function OpportunitiesPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const userId = user?.id;
  const [tab, setTab] = useState<FilterTab>("all");

  const allOpportunities = useQuery(
    api.headhunting.opportunities.getByUser,
    userId ? { userId } : "skip"
  );

  const filtered = allOpportunities?.filter((opp) => {
    if (tab === "pending") return opp.status === "pending";
    if (tab === "responded") return opp.status !== "pending";
    return true;
  });

  const allCount = allOpportunities?.length ?? 0;
  const pendingCount = allOpportunities?.filter((o) => o.status === "pending").length ?? 0;
  const respondedCount = allCount - pendingCount;

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: t("opportunities.tab.all"), count: allCount },
    { key: "pending", label: t("opportunities.tab.pending"), count: pendingCount },
    { key: "responded", label: t("opportunities.tab.responded"), count: respondedCount },
  ];

  return (
    <>
      <DashboardBackNav />

      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">Career · Opportunities</div>
          <h1 className="dash-hello-title">
            {t("opportunities.title")}<em>.</em>
          </h1>
          <p className="dash-hello-sub">{t("opportunities.subtitle")}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <section className="dash-section">
        <div className="lf-tabs" role="tablist">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.key}
              type="button"
              role="tab"
              aria-selected={tab === tabItem.key}
              className={`lf-tab ${tab === tabItem.key ? "lf-tab--active" : ""}`}
              onClick={() => setTab(tabItem.key)}
            >
              {tabItem.label}
              {allOpportunities && (
                <span className="lf-tab-count">{tabItem.count}</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* List */}
      {!allOpportunities ? (
        <section className="dash-section">
          <div className="dash-modules">
            {[1, 2, 3].map((i) => (
              <div key={i} className="lf-card lf-card--feature dash-module" style={{ opacity: 0.6 }}>
                <div className="dash-module-head">
                  <h3 className="dash-module-title">Loading…</h3>
                </div>
                <p className="lf-meta">Fetching opportunities</p>
              </div>
            ))}
          </div>
        </section>
      ) : filtered && filtered.length === 0 ? (
        <div className="dash-empty">
          <Crosshair className="mx-auto size-8" style={{ color: "var(--ink-4)", marginBottom: "var(--s-2)" }} />
          <div className="dash-empty-title">
            {tab === "all" ? "No opportunities yet." : "Nothing in this view."}
          </div>
          <p className="dash-empty-body">
            {tab === "all" ? t("opportunities.empty") : t("opportunities.emptyFiltered")}
          </p>
        </div>
      ) : (
        <section className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">Inbox</h2>
            <span className="dash-section-meta">{filtered?.length ?? 0} shown</span>
          </div>
          <div className="dash-modules">
            {filtered?.map((opp) => {
              const tone = statusToneMap[opp.status] ?? "idle";
              return (
                <Link
                  key={opp._id}
                  href={`/dashboard/opportunities/${opp._id}`}
                  className="lf-card lf-card--feature lf-card--hover dash-module"
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <div className="dash-module-head">
                    <h3 className="dash-module-title">{opp.roleTitle}</h3>
                    <span className={`dash-module-status ${tone}`}>
                      {t(`opportunities.status.${opp.status}`)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: "var(--s-2)" }}>
                    {opp.companyHint && (
                      <span className="lf-meta" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Building2 className="size-3" /> {opp.companyHint}
                      </span>
                    )}
                    {opp.location && (
                      <span className="lf-meta" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <MapPin className="size-3" /> {opp.location}
                      </span>
                    )}
                    {opp.salaryRange && (
                      <span className="lf-meta" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Banknote className="size-3" /> {opp.salaryRange}
                      </span>
                    )}
                    <span className="lf-meta" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Clock className="size-3" /> {new Date(opp.createdAt).toLocaleDateString()}
                    </span>
                    {opp.matchScore != null && opp.matchScore > 0 && (
                      <span className="lf-tag lf-tag--skill" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Sparkles className="size-3" /> {opp.matchScore}%
                      </span>
                    )}
                  </div>

                  {opp.matchReasons && opp.matchReasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5" style={{ marginBottom: "var(--s-3)" }}>
                      {opp.matchReasons.slice(0, 3).map((reason, i) => (
                        <span key={i} className="lf-tag">{reason}</span>
                      ))}
                      {opp.matchReasons.length > 3 && (
                        <span className="lf-tag lf-tag--more">+{opp.matchReasons.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="dash-module-foot">
                    <span className="dash-module-cta">
                      {opp.status === "pending" ? t("opportunities.respond") : "View detail"}
                      {opp.status === "pending" && <ArrowRight className="size-3 inline ml-1" />}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
