"use client";

import { useLanguage } from "@/hooks/use-language";
import { GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";

export default function AcademyPage() {
  const { t } = useLanguage();

  return (
    <>
      <DashboardBackNav />

      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">Personal Desk · Academy</div>
          <h1 className="dash-hello-title">
            <em>{t("dashboard.nav.academy")}</em>
          </h1>
          <p className="dash-hello-sub">
            Practical compliance learning and HR certification.
          </p>
        </div>
      </div>

      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Path & courses</h2>
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
            <GraduationCap className="size-5" />
          </div>
          <p className="dash-empty-title">{t("empty.academy")}</p>
          <p className="dash-empty-body">
            Browse the public Academy while we wire your member dashboard sessions
            and certification tracking.
          </p>
          <Link href="/academy" className="lf-cta lf-cta--primary">
            Browse Academy
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}
