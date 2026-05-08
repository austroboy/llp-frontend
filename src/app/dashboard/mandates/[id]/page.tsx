"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";
import { useLanguage } from "@/hooks/use-language";
import { ClarificationThread } from "@/components/headhunting/clarification-thread";

export default function DashboardMandateDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const mandateId = params.id as string;

  const mandate = useQuery(api.headhunting.mandates.getById, { id: mandateId as Id<"htMandates"> });
  const blueprint = useQuery(api.headhunting.blueprints.getLatestByMandate, { mandateId: mandateId as Id<"htMandates"> });

  if (!mandate) {
    return (
      <div className="dash-empty">
        <div className="dash-empty-title">{t("admin.loading")}</div>
      </div>
    );
  }

  return (
    <>
      <DashboardBackNav backHref="/dashboard/mandates" backLabel="Back to Mandates" />

      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">
            {mandate.client?.companyName ?? "Mandate"} ·{" "}
            <strong>{mandate.status.replace(/_/g, " ")}</strong>
          </div>
          <h1 className="dash-hello-title">
            {mandate.rawTitle}<em>.</em>
          </h1>
          <p className="dash-hello-sub">
            Opened {new Date(mandate.createdAt).toLocaleDateString()} · {mandate.submissionCount} candidate{mandate.submissionCount === 1 ? "" : "s"} submitted.
          </p>
        </div>
      </div>

      {mandate.rawDescription && (
        <section className="dash-section">
          <div className="lf-card lf-card--feature">
            <p className="lf-body" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {mandate.rawDescription}
            </p>
          </div>
        </section>
      )}

      <div className="dash-summary">
        <div className="dash-sum-card">
          <span className="dash-sum-label">Candidates</span>
          <span className="dash-sum-value">{mandate.submissionCount}</span>
          <p className="dash-sum-note">Submitted to date</p>
        </div>
        <div className="dash-sum-card">
          <span className="dash-sum-label">Shortlisted</span>
          <span className="dash-sum-value">{mandate.submissionsByStatus?.shortlisted ?? 0}</span>
          <p className="dash-sum-note">Cleared screening</p>
        </div>
        <div className="dash-sum-card">
          <span className="dash-sum-label">Interviewing</span>
          <span className="dash-sum-value">{mandate.submissionsByStatus?.interview ?? 0}</span>
          <p className="dash-sum-note">In active rounds</p>
        </div>
      </div>

      {blueprint && (
        <>
          <hr className="lf-rule" />
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Role Blueprint</h2>
              <span className="dash-section-meta">v{blueprint.version}</span>
            </div>
            <div className="lf-card lf-card--feature">
              <div className="grid grid-cols-2 gap-3" style={{ marginBottom: "var(--s-3)" }}>
                {blueprint.function && (
                  <p className="lf-meta">Function · <strong>{blueprint.function}</strong></p>
                )}
                {blueprint.seniority && (
                  <p className="lf-meta">Seniority · <strong>{blueprint.seniority}</strong></p>
                )}
                {blueprint.location && (
                  <p className="lf-meta">Location · <strong>{blueprint.location}</strong></p>
                )}
                {blueprint.department && (
                  <p className="lf-meta">Department · <strong>{blueprint.department}</strong></p>
                )}
              </div>
              {blueprint.mustHaves.length > 0 && (
                <div style={{ marginBottom: "var(--s-3)" }}>
                  <p className="lf-meta lf-meta--accent" style={{ marginBottom: "var(--s-2)" }}>Must-haves</p>
                  <div className="flex flex-wrap gap-1.5">
                    {blueprint.mustHaves.map((mh, i) => (
                      <span key={i} className="lf-tag lf-tag--skill">{mh}</span>
                    ))}
                  </div>
                </div>
              )}
              <span className="lf-status lf-status--live">
                <span className="lf-status-dot" />
                {blueprint.status === "client_approved"
                  ? "Client Approved"
                  : blueprint.status === "released"
                    ? "Active — Scouts Sourcing"
                    : blueprint.status.replace(/_/g, " ")}
              </span>
            </div>
          </section>
        </>
      )}

      {/* Offline Mandate Confirmation Banner */}
      <MandateConfirmationBanner mandate={mandate} mandateId={mandateId as Id<"htMandates">} />

      {/* Communication Policy Stage */}
      {mandate.communicationStage && (
        <>
          <hr className="lf-rule" />
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Communication policy</h2>
              <span className="dash-section-meta">{mandate.communicationStage.replace(/_/g, " ")}</span>
            </div>
            <div className="lf-card">
              <p className="lf-body" style={{ margin: 0 }}>
                {mandate.communicationStage === "pre_shortlist" && "No direct candidate contact at this stage. All communication through LLP."}
                {mandate.communicationStage === "shortlisted" && "Candidates have been shortlisted. Communication through LLP only."}
                {mandate.communicationStage === "interview" && "Interview stage — LLP may enable direct scheduling with candidates."}
                {mandate.communicationStage === "offer" && "Offer stage — direct communication with candidates may be facilitated by LLP."}
              </p>
            </div>
          </section>
        </>
      )}

      {/* Clarification Requests */}
      <hr className="lf-rule" />
      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Clarifications</h2>
          <span className="dash-section-meta">Mandate thread</span>
        </div>
        <div className="lf-card lf-card--feature">
          <ClarificationThread mandateId={mandateId as Id<"htMandates">} />
        </div>
      </section>
    </>
  );
}

/** Banner for offline mandates needing client confirmation */
function MandateConfirmationBanner({
  mandate,
  mandateId,
}: {
  mandate: Record<string, unknown>;
  mandateId: Id<"htMandates">;
}) {
  const clientConfirm = useMutation(api.headhunting.mandates.clientConfirm);
  const [confirming, setConfirming] = useState(false);

  // Show banner only for offline-originated mandates not yet confirmed
  const source = mandate.source as string;
  const isOffline = source === "email" || source === "internal";
  const isConfirmed = mandate.clientConfirmed as boolean;

  if (!isOffline || isConfirmed) return null;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await clientConfirm({ id: mandateId });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section className="dash-section">
      <div className="lf-card lf-card--feature" style={{ display: "flex", alignItems: "flex-start", gap: "var(--s-3)" }}>
        <AlertTriangle className="size-5 shrink-0" style={{ color: "var(--bronze)", marginTop: 4 }} />
        <div style={{ flex: 1 }}>
          <h3 className="lf-h3" style={{ marginBottom: "var(--s-1)" }}>Review and confirmation required</h3>
          <p className="lf-body" style={{ margin: 0 }}>
            This mandate was created by LLP on your behalf. Please review the details above and confirm to proceed with the search.
          </p>
        </div>
        <button
          type="button"
          className="lf-cta lf-cta--primary"
          onClick={handleConfirm}
          disabled={confirming}
          style={{ alignSelf: "center" }}
        >
          {confirming ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          Confirm
        </button>
      </div>
    </section>
  );
}
