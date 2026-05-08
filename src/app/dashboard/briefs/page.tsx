"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ArrowRight, MapPin } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";

export default function DashboardBriefsPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const userId = user?.id;

  const briefs = useQuery(
    api.headhunting.scouts.getMyBriefs,
    userId ? { scoutId: userId } : "skip"
  );

  return (
    <>
      <DashboardBackNav />

      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">
            Personal Desk · <strong>Briefs</strong>
          </div>
          <h1 className="dash-hello-title">
            {t("scout.briefs.title")} <em>· released to you.</em>
          </h1>
          <p className="dash-hello-sub">
            Mandates curated to your declared scope. Open one to read the brief, then submit a candidate.
          </p>
        </div>
      </div>

      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Active briefs</h2>
          <span className="dash-section-meta">
            {briefs ? `${briefs.length} released` : "Loading…"}
          </span>
        </div>

        {!briefs ? (
          <div className="dash-empty">
            <div className="dash-empty-title">{t("admin.loading")}</div>
          </div>
        ) : briefs.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-title">No briefs released yet.</div>
            <p className="dash-empty-body">{t("scout.briefs.empty")}</p>
          </div>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Mandate</th>
                  <th>Function</th>
                  <th>Seniority</th>
                  <th>Location</th>
                  <th>Compensation</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {briefs.map((brief) => (
                  <tr key={brief._id}>
                    <td>
                      <Link
                        href={`/dashboard/briefs/${brief._id}`}
                        style={{
                          fontFamily: "var(--lf-display)",
                          fontWeight: 500,
                          color: "var(--ink)",
                          textDecoration: "none",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        {brief.blueprint?.title ?? "—"}
                      </Link>
                      {brief.blueprint?.mustHaves &&
                        brief.blueprint.mustHaves.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 4,
                              marginTop: 6,
                            }}
                          >
                            {brief.blueprint.mustHaves.slice(0, 3).map((mh, i) => (
                              <span key={i} className="lf-tag lf-tag--skill">
                                {mh}
                              </span>
                            ))}
                            {brief.blueprint.mustHaves.length > 3 && (
                              <span className="lf-tag lf-tag--more">
                                +{brief.blueprint.mustHaves.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                    </td>
                    <td>{brief.blueprint?.function ?? "—"}</td>
                    <td>
                      {brief.blueprint?.seniority ? (
                        <span className="lf-tag">{brief.blueprint.seniority}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {brief.blueprint?.location ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: "var(--ink-3)",
                          }}
                        >
                          <MapPin className="size-3" />
                          {brief.blueprint.location}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "var(--lf-mono)",
                          fontSize: 10,
                          letterSpacing: "0.08em",
                          color: "var(--ink-3)",
                          textTransform: "uppercase",
                        }}
                      >
                        {t(
                          `admin.headhunting.blueprint.compensationMode.${brief.blueprint?.compensationMode ?? "revenue_share"}`
                        )}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/dashboard/briefs/${brief._id}`}
                        className="lf-cta lf-cta--ghost"
                        style={{ padding: "8px 14px", fontSize: 10.5 }}
                      >
                        {t("scout.briefs.viewBrief")}
                        <ArrowRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="dash-stamp">
        <span>
          Briefs are released to you based on your declared scope.
          Confidentiality and scope rules apply per mandate.
        </span>
        <div className="dash-stamp-right">
          <span>Foundation v1.9</span>
          <span>Headhunting · Scout</span>
        </div>
      </div>
    </>
  );
}
