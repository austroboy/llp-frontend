"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Crosshair,
  MapPin,
  Banknote,
  Building2,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  ThumbsUp,
  ThumbsDown,
  FileText,
  User,
} from "lucide-react";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";

const statusToneMap: Record<string, "active" | "idle" | "not-started"> = {
  pending: "idle",
  interested: "active",
  declined: "not-started",
  shared: "active",
  withdrawn: "not-started",
};

export default function OpportunityDetailPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const params = useParams();
  const id = params.id as string;

  const opportunity = useQuery(
    api.headhunting.opportunities.getById,
    { id: id as Id<"htOpportunities"> }
  );
  const respond = useMutation(api.headhunting.opportunities.respond);

  const [shareProfile, setShareProfile] = useState(true);
  const [shareCv, setShareCv] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  if (opportunity === undefined) {
    return (
      <>
        <DashboardBackNav backHref="/dashboard/opportunities" backLabel="Back to Opportunities" />
        <div className="dash-empty">
          <div className="dash-empty-title">{t("admin.loading")}</div>
        </div>
      </>
    );
  }

  if (!opportunity) {
    return (
      <>
        <DashboardBackNav backHref="/dashboard/opportunities" backLabel="Back to Opportunities" />
        <div className="dash-empty">
          <div className="dash-empty-title">Opportunity not found.</div>
          <Link href="/dashboard/opportunities" className="lf-cta lf-cta--ghost" style={{ marginTop: "var(--s-3)" }}>
            {t("opportunities.backToList")}
          </Link>
        </div>
      </>
    );
  }

  const isPending = opportunity.status === "pending";
  const tone = statusToneMap[opportunity.status] ?? "idle";

  const handleExpressInterest = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await respond({
        id: opportunity._id,
        userId: user.id,
        interested: true,
        message: message.trim() || undefined,
        shareProfile,
        shareCv,
      });
      toast.success(t("opportunities.submitted"));
    } catch {
      toast.error("Failed to respond");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await respond({
        id: opportunity._id,
        userId: user.id,
        interested: false,
        message: message.trim() || undefined,
      });
      toast.success(t("opportunities.submitted"));
      setShowDeclineConfirm(false);
    } catch {
      toast.error("Failed to respond");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DashboardBackNav backHref="/dashboard/opportunities" backLabel="Back to Opportunities" />

      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">Career · Opportunity</div>
          <h1 className="dash-hello-title">
            {opportunity.roleTitle}<em>.</em>
          </h1>
          <p className="dash-hello-sub">
            <span className={`dash-module-status ${tone}`} style={{ marginRight: 8 }}>
              {t(`opportunities.status.${opportunity.status}`)}
            </span>
            {opportunity.matchScore != null && opportunity.matchScore > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Sparkles className="size-3.5" />
                {t("opportunities.matchScore")}: {opportunity.matchScore}%
              </span>
            )}
          </p>
        </div>
        <div className="dash-header-right">
          <Crosshair className="size-7" style={{ color: "var(--accent-blue)" }} />
        </div>
      </div>

      {/* Details */}
      <section className="dash-section">
        <div className="dash-summary">
          {opportunity.companyHint && (
            <div className="dash-sum-card">
              <span className="dash-sum-label">
                <Building2 className="size-3 inline mr-1" />
                {t("opportunities.company")}
              </span>
              <span className="dash-sum-value" style={{ fontSize: "1rem" }}>{opportunity.companyHint}</span>
            </div>
          )}
          {opportunity.location && (
            <div className="dash-sum-card">
              <span className="dash-sum-label">
                <MapPin className="size-3 inline mr-1" />
                {t("opportunities.location")}
              </span>
              <span className="dash-sum-value" style={{ fontSize: "1rem" }}>{opportunity.location}</span>
            </div>
          )}
          {opportunity.salaryRange && (
            <div className="dash-sum-card">
              <span className="dash-sum-label">
                <Banknote className="size-3 inline mr-1" />
                {t("opportunities.salary")}
              </span>
              <span className="dash-sum-value" style={{ fontSize: "1rem" }}>{opportunity.salaryRange}</span>
            </div>
          )}
          <div className="dash-sum-card">
            <span className="dash-sum-label">
              <Clock className="size-3 inline mr-1" />
              {t("opportunities.received")}
            </span>
            <span className="dash-sum-value" style={{ fontSize: "1rem" }}>
              {new Date(opportunity.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </section>

      {/* Match reasons */}
      {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
        <>
          <hr className="lf-rule" />
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">{t("opportunities.matchReasons")}</h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {opportunity.matchReasons.map((reason, i) => (
                <span key={i} className="lf-tag">{reason}</span>
              ))}
            </div>
          </section>
        </>
      )}

      {opportunity.expiresAt && (
        <p className="lf-meta" style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: "var(--s-2) 0" }}>
          <Clock className="size-3" />
          {t("opportunities.expires")}: {new Date(opportunity.expiresAt).toLocaleDateString()}
        </p>
      )}

      {/* Response section */}
      <hr className="lf-rule" />
      {isPending ? (
        <section className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">{t("opportunities.respond")}</h2>
          </div>

          <div className="lf-card lf-card--feature">
            {/* Consent checkboxes */}
            <div className="space-y-3" style={{ marginBottom: "var(--s-4)" }}>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={shareProfile}
                  onChange={(e) => setShareProfile(e.target.checked)}
                  className="mt-0.5 size-4"
                  style={{ accentColor: "var(--accent-blue)" }}
                />
                <span className="lf-body" style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0 }}>
                  <User className="size-3.5" />
                  {t("opportunities.shareProfile")}
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={shareCv}
                  onChange={(e) => setShareCv(e.target.checked)}
                  className="mt-0.5 size-4"
                  style={{ accentColor: "var(--accent-blue)" }}
                />
                <span className="lf-body" style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0 }}>
                  <FileText className="size-3.5" />
                  {t("opportunities.shareCv")}
                </span>
              </label>
            </div>

            {/* Optional message */}
            <div className="space-y-1.5" style={{ marginBottom: "var(--s-3)" }}>
              <Label className="lf-field-label">{t("opportunities.message")}</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("opportunities.messagePlaceholder")}
                rows={3}
              />
            </div>

            {/* Consent note */}
            <div className="lf-card" style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: "var(--s-4)" }}>
              <Shield className="size-4 shrink-0" style={{ color: "var(--accent-blue)", marginTop: 2 }} />
              <p className="lf-meta" style={{ margin: 0 }}>
                {t("opportunities.consentNote")}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {!showDeclineConfirm ? (
                <button
                  type="button"
                  className="lf-cta lf-cta--ghost"
                  onClick={() => setShowDeclineConfirm(true)}
                  disabled={submitting}
                >
                  <ThumbsDown className="size-3.5" />
                  {t("opportunities.decline")}
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="lf-meta" style={{ color: "var(--rust)", margin: 0 }}>{t("opportunities.declineConfirm")}</p>
                  <button
                    type="button"
                    className="lf-cta lf-cta--primary"
                    onClick={handleDecline}
                    disabled={submitting}
                  >
                    {t("opportunities.decline")}
                  </button>
                  <button
                    type="button"
                    className="lf-cta lf-cta--ghost"
                    onClick={() => setShowDeclineConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
              <button
                type="button"
                className="lf-cta lf-cta--primary"
                onClick={handleExpressInterest}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Sending...
                  </span>
                ) : (
                  <>
                    <ThumbsUp className="size-3.5" />
                    {t("opportunities.expressInterest")}
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* Already responded */
        <section className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {opportunity.status === "interested" || opportunity.status === "shared" ? (
                <CheckCircle2 className="size-5" style={{ color: "var(--emerald)" }} />
              ) : (
                <XCircle className="size-5" style={{ color: "var(--ink-4)" }} />
              )}
              {t("opportunities.yourResponse")}
            </h2>
          </div>
          <div className="lf-card lf-card--feature">
            <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: "var(--s-3)" }}>
              <span className={`dash-module-status ${tone}`}>
                {t(`opportunities.status.${opportunity.status}`)}
              </span>
              {opportunity.candidateResponse && (
                <span className="lf-meta">
                  {t("opportunities.respondedOn")}{" "}
                  {opportunity.candidateResponse.sharedProfileAt
                    ? new Date(opportunity.candidateResponse.sharedProfileAt).toLocaleDateString()
                    : new Date(opportunity.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {opportunity.candidateResponse?.message && (
              <div className="lf-card" style={{ marginBottom: "var(--s-3)" }}>
                <p className="lf-meta" style={{ marginBottom: 4 }}>{t("opportunities.message")}</p>
                <p className="lf-body" style={{ margin: 0 }}>{opportunity.candidateResponse.message}</p>
              </div>
            )}
            {(opportunity.candidateResponse?.sharedProfileAt || opportunity.candidateResponse?.sharedCvAt) && (
              <div className="flex gap-1.5 flex-wrap">
                {opportunity.candidateResponse.sharedProfileAt && (
                  <span className="lf-tag" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <User className="size-3" />
                    {t("opportunities.shareProfile")}
                  </span>
                )}
                {opportunity.candidateResponse.sharedCvAt && (
                  <span className="lf-tag" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <FileText className="size-3" />
                    {t("opportunities.shareCv")}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
