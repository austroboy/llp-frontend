"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";

const statusModuleMap: Record<string, string> = {
  submitted: "active",
  screening: "active",
  shortlisted: "active",
  interview: "active",
  selected: "active",
  offer: "active",
  joined: "active",
  rejected: "idle",
  withdrawn: "idle",
};

export default function DashboardSubmissionsPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const userId = user?.id;

  const submissions = useQuery(
    api.headhunting.scouts.getMySubmissions,
    userId ? { scoutId: userId } : "skip"
  );

  const total = submissions?.length ?? 0;
  const live =
    submissions?.filter((s) =>
      ["submitted", "screening", "shortlisted", "interview", "selected", "offer"].includes(s.status)
    ).length ?? 0;
  const placed = submissions?.filter((s) => s.status === "joined").length ?? 0;
  const closed =
    submissions?.filter((s) => ["rejected", "withdrawn"].includes(s.status)).length ?? 0;

  return (
    <>
      <DashboardBackNav />

      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">
            Personal Desk · <strong>Submissions</strong>
          </div>
          <h1 className="dash-hello-title">
            {t("scout.submissions.title")} <em>· your candidate ledger.</em>
          </h1>
          <p className="dash-hello-sub">
            Every candidate you have submitted, with current pipeline status.
          </p>
        </div>
      </div>

      <div className="dash-summary">
        <div className="dash-sum-card">
          <span className="dash-sum-label">Total submissions</span>
          <span className="dash-sum-value">{total}</span>
          <p className="dash-sum-note">All time, all mandates.</p>
        </div>
        <div className="dash-sum-card">
          <span className="dash-sum-label">In pipeline</span>
          <span className="dash-sum-value">{live}</span>
          <p className="dash-sum-note">
            <strong>Active</strong> through interview / offer.
          </p>
        </div>
        <div className="dash-sum-card">
          <span className="dash-sum-label">Joined</span>
          <span className="dash-sum-value">{placed}</span>
          <p className="dash-sum-note">Confirmed placements.</p>
        </div>
        <div className="dash-sum-card">
          <span className="dash-sum-label">Closed</span>
          <span className="dash-sum-value">{closed}</span>
          <p className="dash-sum-note">Rejected or withdrawn.</p>
        </div>
      </div>

      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Candidate ledger</h2>
          <span className="dash-section-meta">
            {submissions ? `${total} entries` : "Loading…"}
          </span>
        </div>

        {!submissions ? (
          <div className="dash-empty">
            <div className="dash-empty-title">{t("admin.loading")}</div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-title">No submissions yet.</div>
            <p className="dash-empty-body">{t("scout.submissions.empty")}</p>
          </div>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Mandate</th>
                  <th>{t("scout.submissions.status")}</th>
                  <th style={{ textAlign: "right" }}>{t("admin.table.date")}</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub._id}>
                    <td
                      style={{
                        fontFamily: "var(--lf-display)",
                        fontWeight: 500,
                        color: "var(--ink)",
                      }}
                    >
                      {sub.candidateName}
                    </td>
                    <td style={{ color: "var(--ink-3)" }}>{sub.mandateTitle}</td>
                    <td>
                      <span
                        className={`dash-module-status ${statusModuleMap[sub.status] ?? "idle"}`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--lf-mono)",
                        fontSize: 10.5,
                        color: "var(--ink-4)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {new Date(sub.createdAt).toLocaleDateString()}
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
          Submissions remain visible until the mandate closes. Status updates flow from the client review.
        </span>
        <div className="dash-stamp-right">
          <span>Foundation v1.9</span>
          <span>Headhunting · Scout</span>
        </div>
      </div>
    </>
  );
}
