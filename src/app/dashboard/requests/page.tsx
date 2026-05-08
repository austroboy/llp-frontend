"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { Plus } from "lucide-react";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";

const statusVariant: Record<string, "live" | "busy" | "off"> = {
  submitted: "busy",
  under_review: "busy",
  awaiting_input: "busy",
  in_progress: "busy",
  delivered: "live",
  closed: "off",
};

const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  awaiting_input: "Awaiting Input",
  in_progress: "In Progress",
  delivered: "Delivered",
  closed: "Closed",
};

export default function RequestsPage() {
  const { t } = useLanguage();
  const { user } = useUser();

  const requests = useQuery(
    api.personalServiceRequests?.listByUser,
    user?.id ? { userId: user.id } : "skip"
  );

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
            Personal Desk · {today} · <strong>My Requests</strong>
          </div>
          <h1 className="dash-hello-title">
            {t("dashboard.nav.myRequests")} <em>tracker.</em>
          </h1>
          <p className="dash-hello-sub">
            Track your personal service requests with LLP.
          </p>
        </div>
        <div className="dash-header-right">
          <button type="button" className="lf-cta lf-cta--primary">
            <Plus className="size-3.5" />
            New Request
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      {!requests || requests.length === 0 ? (
        <div className="dash-empty">
          <div className="dash-empty-title">No requests yet</div>
          <p className="dash-empty-body">{t("empty.requests")}</p>
        </div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const variant = statusVariant[req.status] ?? "off";
                return (
                  <tr key={req._id}>
                    <td>{req.category}</td>
                    <td style={{ color: "var(--ink)", fontWeight: 500 }}>
                      {req.subject}
                    </td>
                    <td>
                      <span className={`lf-status lf-status--${variant}`}>
                        <span className="lf-status-dot" />
                        {statusLabels[req.status] ?? req.status}
                      </span>
                    </td>
                    <td>{new Date(req.updatedAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
