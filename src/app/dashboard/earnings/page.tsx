"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";

const payoutModuleMap: Record<string, string> = {
  held: "idle",
  eligible: "active",
  released: "active",
  exception: "idle",
};

export default function DashboardEarningsPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const userId = user?.id;

  const payouts = useQuery(
    api.headhunting.placements.getPayoutsByContributor,
    userId ? { contributorId: userId } : "skip"
  );

  const totalEarned =
    payouts?.filter((p) => p.status === "released").reduce((s, p) => s + (p.rewardAmount ?? 0), 0) ?? 0;
  const totalPending =
    payouts?.filter((p) => ["held", "eligible"].includes(p.status)).reduce((s, p) => s + (p.rewardAmount ?? 0), 0) ?? 0;
  const totalCount = payouts?.length ?? 0;
  const releasedCount = payouts?.filter((p) => p.status === "released").length ?? 0;

  return (
    <>
      <DashboardBackNav />

      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">
            Personal Desk · <strong>Earnings</strong>
          </div>
          <h1 className="dash-hello-title">
            {t("member.nav.earnings")} <em>· placement rewards.</em>
          </h1>
          <p className="dash-hello-sub">
            Earnings released after candidates join and pass holdback windows.
          </p>
        </div>
      </div>

      <div className="dash-summary">
        <div className="dash-sum-card">
          <span className="dash-sum-label">Total earned</span>
          <span className="dash-sum-value">
            ৳{totalEarned.toLocaleString()}
          </span>
          <p className="dash-sum-note">
            Across <strong>{releasedCount}</strong> released payout{releasedCount === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="dash-sum-card">
          <span className="dash-sum-label">Pending / Held</span>
          <span className="dash-sum-value">
            ৳{totalPending.toLocaleString()}
          </span>
          <p className="dash-sum-note">
            <strong>Eligible</strong> or in holdback.
          </p>
        </div>
        <div className="dash-sum-card">
          <span className="dash-sum-label">Payout records</span>
          <span className="dash-sum-value">{totalCount}</span>
          <p className="dash-sum-note">All time, all mandates.</p>
        </div>
        <div className="dash-sum-card">
          <span className="dash-sum-label">Currency</span>
          <span className="dash-sum-value">
            BDT<span className="unit">৳</span>
          </span>
          <p className="dash-sum-note">Bangladeshi Taka.</p>
        </div>
      </div>

      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Payout ledger</h2>
          <span className="dash-section-meta">
            {payouts ? `${totalCount} records` : "Loading…"}
          </span>
        </div>

        {!payouts ? (
          <div className="dash-empty">
            <div className="dash-empty-title">{t("admin.loading")}</div>
          </div>
        ) : payouts.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-title">No earnings yet.</div>
            <p className="dash-empty-body">
              Place candidates to earn rewards.
            </p>
          </div>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p._id}>
                    <td
                      style={{
                        fontFamily: "var(--lf-display)",
                        fontWeight: 500,
                        color: "var(--ink)",
                      }}
                    >
                      {p.candidateName}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--lf-display)",
                        fontWeight: 500,
                        color: "var(--ink)",
                      }}
                    >
                      {p.rewardAmount ? `৳${p.rewardAmount.toLocaleString()}` : "—"}
                    </td>
                    <td>
                      <span
                        className={`dash-module-status ${payoutModuleMap[p.status] ?? "idle"}`}
                      >
                        {p.status}
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
                      {new Date(p.createdAt).toLocaleDateString()}
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
          Held payouts are released after the candidate&apos;s holdback window ends.
          Exception statuses route to LLP for review.
        </span>
        <div className="dash-stamp-right">
          <span>Foundation v1.9</span>
          <span>Headhunting · Scout</span>
        </div>
      </div>
    </>
  );
}
