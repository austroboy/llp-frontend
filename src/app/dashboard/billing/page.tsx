"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { CreditCard, FileText } from "lucide-react";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  draft: { fg: "var(--ink-4)", bg: "color-mix(in oklab, var(--ink) 6%, transparent)" },
  sent: { fg: "var(--accent-blue)", bg: "var(--accent-blue-ghost)" },
  paid: { fg: "var(--emerald)", bg: "color-mix(in oklab, var(--emerald) 12%, transparent)" },
  overdue: { fg: "var(--rust)", bg: "var(--rust-ghost)" },
  cancelled: { fg: "var(--ink-4)", bg: "color-mix(in oklab, var(--ink) 6%, transparent)" },
};

export default function BillingPage() {
  const { t } = useLanguage();
  const { user } = useUser();

  const summary = useQuery(
    api.invoices.getSummaryByUser,
    user?.id ? { userId: user.id } : "skip"
  );

  const invoices = useQuery(
    api.invoices.listByUser,
    user?.id ? { userId: user.id, limit: 10 } : "skip"
  );

  return (
    <>
      <DashboardBackNav />

      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">Personal Desk · Billing</div>
          <h1 className="dash-hello-title">
            <em>{t("dashboard.nav.billing")}</em>
          </h1>
          <p className="dash-hello-sub">
            Your subscription and billing overview.
          </p>
        </div>
      </div>

      {/* ── Summary 4-up ────────────────────────────────────── */}
      <div className="dash-summary">
        <div className="dash-sum-card">
          <span className="dash-sum-label">
            {t("dashboard.home.billing.outstanding")}
          </span>
          <span className="dash-sum-value">
            ৳{summary?.outstanding ?? 0}
            <span className="unit">due</span>
          </span>
          <p className="dash-sum-note">
            {summary && summary.outstanding > 0 ? (
              <>
                <strong>Action required.</strong> Settle to keep services active.
              </>
            ) : (
              <>No invoices outstanding right now.</>
            )}
          </p>
        </div>
        <div className="dash-sum-card">
          <span className="dash-sum-label">
            {t("dashboard.home.billing.latestInvoice")}
          </span>
          <span className="dash-sum-value">
            {summary?.latestInvoice ? (
              <>
                <span style={{ fontSize: 18 }}>
                  {summary.latestInvoice.invoiceNumber}
                </span>
              </>
            ) : (
              "—"
            )}
          </span>
          <p className="dash-sum-note">
            {summary?.latestInvoice
              ? "Most recent invoice on file."
              : "No invoices yet."}
          </p>
        </div>
        <div className="dash-sum-card">
          <span className="dash-sum-label">
            {t("dashboard.home.billing.paidInvoices")}
          </span>
          <span className="dash-sum-value">
            {summary?.paidCount ?? 0}
            <span className="unit">paid</span>
          </span>
          <p className="dash-sum-note">
            Lifetime <strong>cleared</strong> invoices.
          </p>
        </div>
        <div className="dash-sum-card">
          <span className="dash-sum-label">Plan</span>
          <span className="dash-sum-value">
            Member<span className="unit">tier</span>
          </span>
          <p className="dash-sum-note">
            Manage entitlements with your <strong>account manager</strong>.
          </p>
        </div>
      </div>

      {/* ── Invoices ────────────────────────────────────────── */}
      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Invoices</h2>
          <span className="dash-section-meta">
            {invoices ? `${invoices.length} on file` : "Loading"}
          </span>
        </div>

        {!invoices || invoices.length === 0 ? (
          <div className="dash-empty">
            <div
              aria-hidden
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--accent-blue-ghost)",
                border: "0.5px solid var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-blue)",
              }}
            >
              <CreditCard className="size-5" />
            </div>
            <p className="dash-empty-title">{t("empty.billing")}</p>
            <p className="dash-empty-body">
              Invoices issued by LLP appear here once your first engagement begins.
            </p>
          </div>
        ) : (
          <div className="dash-table-wrap">
            <div style={{ overflowX: "auto" }}>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const colors =
                      STATUS_COLORS[inv.status] ?? STATUS_COLORS.draft;
                    return (
                      <tr key={inv._id}>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              fontWeight: 500,
                              color: "var(--ink)",
                            }}
                          >
                            <FileText className="size-3.5" />
                            {inv.invoiceNumber}
                          </span>
                        </td>
                        <td>৳{inv.total.toLocaleString()}</td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "3px 10px",
                              borderRadius: 999,
                              fontFamily: "var(--lf-mono)",
                              fontSize: 10,
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              fontWeight: 500,
                              color: colors.fg,
                              background: colors.bg,
                              border: `0.5px solid ${colors.fg}`,
                            }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ color: "var(--ink-4)" }}>
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
