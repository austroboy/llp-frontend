"use client";

import { useLanguage } from "@/hooks/use-language";
import { Download } from "lucide-react";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";

export default function ResourcesPage() {
  const { t } = useLanguage();

  return (
    <>
      <DashboardBackNav />

      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">Personal Desk · Resources</div>
          <h1 className="dash-hello-title">
            <em>{t("dashboard.nav.resources")}</em>
          </h1>
          <p className="dash-hello-sub">
            Download templates, SOPs, checklists, and compliance resources.
          </p>
        </div>
      </div>

      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Library</h2>
          <span className="dash-section-meta">Coming soon</span>
        </div>

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
            <Download className="size-5" />
          </div>
          <p className="dash-empty-title">{t("empty.resources")}</p>
          <p className="dash-empty-body">
            Templates, SOPs, and policy checklists will appear here as the resource
            centre is published.
          </p>
        </div>
      </section>
    </>
  );
}
