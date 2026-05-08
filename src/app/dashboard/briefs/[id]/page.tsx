"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  MapPin,
  Building2,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Send,
  FileText,
} from "lucide-react";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";

const submissionStatusMap: Record<string, string> = {
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

export default function BriefDetailPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const params = useParams();
  const releaseId = params.id as string;
  const userId = user?.id;

  const data = useQuery(
    api.headhunting.scouts.getBriefDetail,
    userId ? { releaseId: releaseId as Id<"htBriefReleases">, scoutId: userId } : "skip"
  );
  const markViewed = useMutation(api.headhunting.scouts.markBriefViewed);
  const submitCandidate = useMutation(api.headhunting.scouts.submitCandidate);

  // Mark viewed on first load
  useEffect(() => {
    if (data && userId && !data.release.viewedAt) {
      markViewed({ releaseId: releaseId as Id<"htBriefReleases">, scoutId: userId });
    }
  }, [data, userId, releaseId, markViewed]);

  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [form, setForm] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    confidence: "3",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  if (data === undefined) {
    return (
      <div className="dash-empty" style={{ marginTop: "var(--s-5)" }}>
        <div className="dash-empty-title">{t("admin.loading")}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="dash-empty" style={{ marginTop: "var(--s-5)" }}>
        <div className="dash-empty-title">Brief not found.</div>
      </div>
    );
  }

  const { blueprint, release, clientHint, mySubmissions } = data;

  const handleSubmit = async () => {
    if (!userId || !form.candidateName.trim() || !form.candidateEmail.trim()) return;
    setSubmitting(true);
    try {
      await submitCandidate({
        mandateId: release.mandateId,
        scoutId: userId,
        candidateName: form.candidateName,
        candidateEmail: form.candidateEmail,
        candidatePhone: form.candidatePhone || undefined,
        scoutConfidence: Number(form.confidence) || undefined,
        notes: form.notes || undefined,
      });
      toast.success(t("scout.briefs.submitted"));
      setForm({ candidateName: "", candidateEmail: "", candidatePhone: "", confidence: "3", notes: "" });
      setShowSubmitForm(false);
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DashboardBackNav backHref="/dashboard/briefs" backLabel="Back to Briefs" />

      {/* Header */}
      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">
            Personal Desk · <strong>Brief detail</strong>
          </div>
          <h1 className="dash-hello-title">
            {blueprint?.title ?? "—"}
          </h1>
          <p className="dash-hello-sub">
            {blueprint?.environmentDescription ?? "Confidential mandate detail. Submit a candidate when you have a fit."}
          </p>
        </div>
        <div className="dash-header-right">
          <button
            type="button"
            onClick={() => setShowSubmitForm(!showSubmitForm)}
            className="lf-cta lf-cta--primary"
          >
            <Send className="size-4" />
            {t("scout.briefs.submitCandidate")}
          </button>
        </div>
      </div>

      {/* Mandate card — feature glass */}
      <div className="lf-card lf-card--feature" style={{ marginBottom: "var(--s-5)" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--s-3)",
            alignItems: "center",
          }}
        >
          {clientHint ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--lf-display)",
                fontStyle: "italic",
                fontSize: 13,
                color: "var(--ink-3)",
              }}
            >
              <Building2 className="size-3.5" />
              {release.disclosureLevel === "disclosed"
                ? clientHint
                : `${t("scout.company.hint")}: ${clientHint}`}
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--lf-display)",
                fontStyle: "italic",
                fontSize: 13,
                color: "var(--ink-3)",
              }}
            >
              <Shield className="size-3.5" />
              {t("scout.company.masked")}
            </span>
          )}
          {blueprint?.location && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--lf-display)",
                fontStyle: "italic",
                fontSize: 13,
                color: "var(--ink-3)",
              }}
            >
              <MapPin className="size-3.5" />
              {blueprint.location}
            </span>
          )}
          {blueprint?.seniority && (
            <span className="lf-tag">{blueprint.seniority}</span>
          )}
          {blueprint?.function && (
            <span className="lf-tag lf-tag--skill">{blueprint.function}</span>
          )}
        </div>

        {release.disclosureLevel === "disclosed" &&
          (blueprint?.department || blueprint?.reportingLine) && (
            <div
              style={{
                display: "flex",
                gap: "var(--s-4)",
                marginTop: "var(--s-3)",
                paddingTop: "var(--s-3)",
                borderTop: "0.5px solid var(--line-1)",
                fontFamily: "var(--lf-mono)",
                fontSize: 11,
                color: "var(--ink-4)",
                letterSpacing: "0.04em",
                flexWrap: "wrap",
              }}
            >
              {blueprint.department && <span>Dept · {blueprint.department}</span>}
              {blueprint.reportingLine && <span>Reports to · {blueprint.reportingLine}</span>}
            </div>
          )}
      </div>

      {/* Requirements grid */}
      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Requirements</h2>
          <span className="dash-section-meta">Brief contract</span>
        </div>
        <div className="dash-modules">
          {/* Must-Haves */}
          {blueprint?.mustHaves && blueprint.mustHaves.length > 0 && (
            <div className="dash-module">
              <div className="dash-module-head">
                <h3
                  className="dash-module-title"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <CheckCircle2 className="size-4" style={{ color: "var(--accent-blue)" }} />
                  {t("scout.briefs.mustHaves")}
                </h3>
                <span className="dash-module-status active">
                  {blueprint.mustHaves.length}
                </span>
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {blueprint.mustHaves.map((mh, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontSize: 13.5,
                      color: "var(--ink-2)",
                      lineHeight: 1.5,
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <span style={{ color: "var(--accent-blue)" }}>—</span>
                    {mh}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Deal Breakers */}
          {blueprint?.dealBreakers && blueprint.dealBreakers.length > 0 && (
            <div
              className="dash-module"
              style={{ borderColor: "var(--rust-ghost)" }}
            >
              <div className="dash-module-head">
                <h3
                  className="dash-module-title"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--rust)",
                  }}
                >
                  <AlertTriangle className="size-4" />
                  {t("scout.briefs.dealBreakers")}
                </h3>
                <span
                  className="dash-module-status"
                  style={{
                    color: "var(--rust)",
                    border: "0.5px solid var(--rust)",
                  }}
                >
                  {blueprint.dealBreakers.length}
                </span>
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {blueprint.dealBreakers.map((db, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontSize: 13.5,
                      color: "var(--ink-2)",
                      lineHeight: 1.5,
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <span style={{ color: "var(--rust)" }}>×</span>
                    {db}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Critical Match */}
          {blueprint?.criticalMatchPoints && blueprint.criticalMatchPoints.length > 0 && (
            <div className="dash-module">
              <div className="dash-module-head">
                <h3 className="dash-module-title">{t("scout.briefs.criticalMatch")}</h3>
                <span className="dash-module-status active">
                  {blueprint.criticalMatchPoints.length}
                </span>
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {blueprint.criticalMatchPoints.map((cp, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontStyle: "italic",
                      fontSize: 13,
                      color: "var(--ink-3)",
                      lineHeight: 1.5,
                    }}
                  >
                    — {cp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* General Match */}
          {blueprint?.generalMatchPoints && blueprint.generalMatchPoints.length > 0 && (
            <div className="dash-module">
              <div className="dash-module-head">
                <h3 className="dash-module-title">{t("scout.briefs.generalMatch")}</h3>
                <span className="dash-module-status idle">
                  {blueprint.generalMatchPoints.length}
                </span>
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {blueprint.generalMatchPoints.map((gp, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontStyle: "italic",
                      fontSize: 13,
                      color: "var(--ink-3)",
                      lineHeight: 1.5,
                    }}
                  >
                    — {gp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Meta bar */}
      <div
        className="dash-from-llp"
        style={{
          background: "var(--paper-inner)",
          borderLeftColor: "var(--bronze)",
        }}
      >
        <span
          className="dash-from-llp-label"
          style={{ color: "var(--bronze)" }}
        >
          Brief meta
        </span>
        <p className="dash-from-llp-text">
          {blueprint?.targetSectors && blueprint.targetSectors.length > 0 && (
            <>
              {t("scout.briefs.targetSectors")}: <strong>{blueprint.targetSectors.join(", ")}</strong>{" · "}
            </>
          )}
          {t("scout.briefs.shortlistRange")}:{" "}
          <strong>
            {blueprint?.shortlistMin ?? 6}–{blueprint?.shortlistMax ?? 10}
          </strong>
          {" · "}
          {t("scout.briefs.compensation")}:{" "}
          <strong>
            {t(
              `admin.headhunting.blueprint.compensationMode.${blueprint?.compensationMode ?? "revenue_share"}`
            )}
          </strong>
        </p>
      </div>

      {/* Submit form */}
      {showSubmitForm && (
        <div
          className="lf-card lf-card--feature"
          style={{ marginBottom: "var(--s-5)" }}
        >
          <div className="dash-section-header" style={{ marginBottom: "var(--s-3)" }}>
            <h2 className="dash-section-title">{t("scout.briefs.submitCandidate")}</h2>
            <span className="dash-section-meta">Required *</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--s-3)",
              marginBottom: "var(--s-3)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label className="lf-field-label">{t("scout.briefs.candidateName")} *</Label>
              <Input
                className="lf-input"
                value={form.candidateName}
                onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label className="lf-field-label">{t("scout.briefs.candidateEmail")} *</Label>
              <Input
                className="lf-input"
                type="email"
                value={form.candidateEmail}
                onChange={(e) => setForm((f) => ({ ...f, candidateEmail: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label className="lf-field-label">{t("scout.briefs.candidatePhone")}</Label>
              <Input
                className="lf-input"
                value={form.candidatePhone}
                onChange={(e) => setForm((f) => ({ ...f, candidatePhone: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label className="lf-field-label">{t("scout.briefs.confidence")}</Label>
              <Input
                className="lf-input"
                type="number"
                min="1"
                max="5"
                value={form.confidence}
                onChange={(e) => setForm((f) => ({ ...f, confidence: e.target.value }))}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: "var(--s-3)",
            }}
          >
            <Label className="lf-field-label">{t("scout.briefs.submitNotes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--r-md)",
                fontFamily: "var(--lf-body)",
                fontSize: 13.5,
                color: "var(--ink)",
                padding: "10px 14px",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              type="button"
              className="lf-cta lf-cta--ghost"
              onClick={() => setShowSubmitForm(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                submitting ||
                !form.candidateName.trim() ||
                !form.candidateEmail.trim()
              }
              className="lf-cta lf-cta--primary"
              style={{
                opacity:
                  submitting || !form.candidateName.trim() || !form.candidateEmail.trim()
                    ? 0.5
                    : 1,
                cursor:
                  submitting || !form.candidateName.trim() || !form.candidateEmail.trim()
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              <Send className="size-3.5" />
              {submitting ? "Submitting…" : t("scout.briefs.submit")}
            </button>
          </div>
        </div>
      )}

      {/* My submissions for this mandate */}
      {mySubmissions && mySubmissions.length > 0 && (
        <section className="dash-section">
          <div className="dash-section-header">
            <h3
              className="dash-section-title"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FileText className="size-4" />
              {t("scout.briefs.mySubmissions")}
            </h3>
            <span className="dash-section-meta">
              {mySubmissions.length} entr{mySubmissions.length === 1 ? "y" : "ies"}
            </span>
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th style={{ textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {mySubmissions.map((sub) => (
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
                    <td style={{ textAlign: "right" }}>
                      <span
                        className={`dash-module-status ${submissionStatusMap[sub.status] ?? "idle"}`}
                      >
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="dash-stamp">
        <span>
          Information shared in this brief is confidential. Sharing outside scout scope is grounds for de-listing.
        </span>
        <div className="dash-stamp-right">
          <span>Foundation v1.9</span>
          <span>Headhunting · Scout</span>
        </div>
      </div>
    </>
  );
}
