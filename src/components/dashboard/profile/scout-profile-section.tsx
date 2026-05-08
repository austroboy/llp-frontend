"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Save, Lock, Pencil, Loader2, MapPin, Globe, Briefcase } from "lucide-react";

/**
 * Scout Network Profile Section (Unified Profile v3.1)
 */
export function ScoutProfileSection({ scoutProfile }: { scoutProfile: Record<string, unknown> }) {
  const { user } = useUser();
  const upsert = useMutation(api.headhunting.scoutProfiles.upsert);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [mobile, setMobile] = useState((scoutProfile.mobile as string) || "");
  const [linkedin, setLinkedin] = useState((scoutProfile.linkedin as string) || "");
  const [visibility, setVisibility] = useState(
    (scoutProfile.visibility as string) || "internal_only"
  );
  const [activeScouting, setActiveScouting] = useState(
    (scoutProfile.activeScouting as boolean) ?? true
  );
  const [identityMode, setIdentityMode] = useState(
    (scoutProfile.identityMode as string) || "anonymous"
  );

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await upsert({
        clerkId: user.id,
        mobile,
        linkedin,
        visibility: visibility as "internal_only" | "public_listed" | "limited_public" | "employer_via_llp",
        activeScouting,
        identityMode: identityMode as "anonymous" | "credited" | "selective_reveal",
      });
      setEditing(false);
    } catch (err) {
      console.error("Failed to update scout profile:", err);
    } finally {
      setSaving(false);
    }
  };

  // Read-only data
  const status = scoutProfile.status as string;
  const profileId = scoutProfile.profileId as string | undefined;
  const fullName = scoutProfile.fullName as string | undefined;
  const currentTitle = scoutProfile.currentTitle as string | undefined;
  const currentCompany = scoutProfile.currentCompany as string | undefined;
  const location = scoutProfile.location as string | undefined;
  const functionPrimary = (scoutProfile.functionPrimary as string[]) || [];
  const functionSecondary = (scoutProfile.functionSecondary as string[]) || [];
  const industryPrimary = (scoutProfile.industryPrimary as string[]) || [];
  const industrySecondary = (scoutProfile.industrySecondary as string[]) || [];
  const roleLevelReach = (scoutProfile.roleLevelReach as string[]) || [];
  const countriesSupported = (scoutProfile.countriesSupported as string[]) || [];
  const mandateTypeStrengths = (scoutProfile.mandateTypeStrengths as string[]) || [];
  const networkFreshness = scoutProfile.networkFreshness as string | undefined;
  const hiringExperienceTypes = (scoutProfile.hiringExperienceTypes as string[]) || [];

  const visibilityLabels: Record<string, string> = {
    internal_only: "Internal Only",
    public_listed: "Public Listed",
    limited_public: "Limited Public",
    employer_via_llp: "Employer Contact via LLP",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--s-3)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: 16,
              fontWeight: 500,
              color: "var(--ink)",
            }}
          >
            {fullName}
          </span>
          {currentTitle && (
            <span
              style={{
                fontFamily: "var(--lf-display)",
                fontStyle: "italic",
                fontSize: 13,
                color: "var(--ink-3)",
              }}
            >
              {currentTitle}
              {currentCompany && ` at ${currentCompany}`}
            </span>
          )}
          {profileId && <span className="lf-tag">{profileId}</span>}
        </div>
        <button
          type="button"
          onClick={() => (editing ? handleSave() : setEditing(true))}
          disabled={saving}
          className={editing ? "lf-cta lf-cta--primary" : "lf-cta lf-cta--ghost"}
        >
          {saving ? (
            <Loader2 className="size-3 animate-spin" />
          ) : editing ? (
            <Save className="size-3" />
          ) : (
            <Pencil className="size-3" />
          )}
          {editing ? "Save Changes" : "Edit Profile"}
        </button>
      </div>

      {/* Scout Status callout */}
      {status === "draft" && (
        <div
          style={{
            padding: "var(--s-3)",
            background: "var(--bronze-ghost)",
            border: "0.5px solid var(--bronze)",
            borderLeft: "2px solid var(--bronze)",
            borderRadius: "0 var(--r-md) var(--r-md) 0",
            fontFamily: "var(--lf-display)",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.5,
          }}
        >
          Your scout application is still in draft. Complete and submit it to join
          the network.
        </div>
      )}

      {/* Editable Fields */}
      <div className="dash-section" style={{ marginBottom: 0 }}>
        <div className="dash-section-header">
          <h3 className="dash-section-title">Working preferences</h3>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--s-3)",
          }}
        >
          <div>
            <span className="lf-field-label">Mobile</span>
            {editing ? (
              <Input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="lf-input"
                placeholder="+880..."
              />
            ) : (
              <p
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 14,
                  color: mobile ? "var(--ink-2)" : "var(--ink-4)",
                  fontStyle: mobile ? "normal" : "italic",
                  margin: 0,
                }}
              >
                {mobile || "Not set"}
              </p>
            )}
          </div>

          <div>
            <span className="lf-field-label">LinkedIn</span>
            {editing ? (
              <Input
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className="lf-input"
                placeholder="https://linkedin.com/in/..."
              />
            ) : (
              <p
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 14,
                  color: linkedin ? "var(--ink-2)" : "var(--ink-4)",
                  fontStyle: linkedin ? "normal" : "italic",
                  margin: 0,
                }}
              >
                {linkedin || "Not set"}
              </p>
            )}
          </div>

          <div>
            <span className="lf-field-label">Visibility</span>
            {editing ? (
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="lf-select-trigger"
              >
                <option value="internal_only">Internal Only</option>
                <option value="public_listed">Public Listed</option>
                <option value="limited_public">Limited Public</option>
                <option value="employer_via_llp">Employer Contact via LLP</option>
              </select>
            ) : (
              <span className="lf-tag" style={{ marginTop: 4 }}>
                {visibilityLabels[visibility] || visibility}
              </span>
            )}
          </div>

          <div>
            <span className="lf-field-label">Active Scouting</span>
            {editing ? (
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  marginTop: 4,
                }}
              >
                <input
                  type="checkbox"
                  checked={activeScouting}
                  onChange={(e) => setActiveScouting(e.target.checked)}
                  style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                />
                <span
                  className={`lf-check ${activeScouting ? "lf-check--on" : ""}`}
                >
                  {activeScouting && (
                    <svg viewBox="0 0 16 16" fill="none" width="10" height="10">
                      <path
                        d="M3 8l3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontSize: 13,
                    color: "var(--ink-2)",
                  }}
                >
                  Actively looking for mandates
                </span>
              </label>
            ) : (
              <span
                className={`lf-status ${
                  activeScouting ? "lf-status--live" : "lf-status--off"
                }`}
                style={{ marginTop: 4 }}
              >
                <span className="lf-status-dot" />
                {activeScouting ? "Active" : "Paused"}
              </span>
            )}
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <span className="lf-field-label">Identity Privacy</span>
            {editing ? (
              <select
                value={identityMode}
                onChange={(e) => setIdentityMode(e.target.value)}
                className="lf-select-trigger"
              >
                <option value="anonymous">Anonymous (default) — name never shown to clients</option>
                <option value="credited">Credited — name shown on successful placements</option>
                <option value="selective_reveal">Selective — choose per mandate</option>
              </select>
            ) : (
              <div style={{ marginTop: 4 }}>
                <span className="lf-tag">
                  {identityMode === "anonymous"
                    ? "Anonymous"
                    : identityMode === "credited"
                      ? "Credited"
                      : "Selective Reveal"}
                </span>
                <p
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontStyle: "italic",
                    fontSize: 12,
                    color: "var(--ink-3)",
                    marginTop: 6,
                    lineHeight: 1.4,
                  }}
                >
                  {identityMode === "anonymous"
                    ? "Your identity stays private. Clients never see your name."
                    : identityMode === "credited"
                      ? "Your name will be shown on successful placements."
                      : "You choose whether to reveal your identity per mandate."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Privacy Note */}
      <div
        style={{
          padding: "var(--s-3)",
          background: "var(--accent-blue-ghost)",
          border: "0.5px solid var(--accent-blue)",
          borderLeft: "2px solid var(--accent-blue)",
          borderRadius: "0 var(--r-md) var(--r-md) 0",
          fontFamily: "var(--lf-display)",
          fontStyle: "italic",
          fontSize: 13,
          color: "var(--ink-2)",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "var(--ink)", fontWeight: 500, fontStyle: "normal" }}>
          Scout identity is anonymous by default.
        </strong>{" "}
        Your name and personal details are never shared with clients unless you
        explicitly choose to reveal them. LLP protects your privacy at every stage.
      </div>

      {/* Non-Editable Fields (LLP Review Required) */}
      <div className="lf-card" style={{ padding: "var(--s-4)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: "var(--s-3)",
          }}
        >
          <Lock className="size-3" style={{ color: "var(--ink-4)" }} />
          <span
            style={{
              fontFamily: "var(--lf-mono)",
              fontSize: 10,
              color: "var(--ink-4)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Under LLP Review — Contact admin to update
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-3)",
          }}
        >
          {functionPrimary.length > 0 && (
            <div>
              <span className="lf-field-label">
                <Briefcase className="size-3" style={{ display: "inline", marginRight: 4 }} />
                Function Specialization
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {functionPrimary.map((f) => (
                  <span key={f} className="lf-tag lf-tag--skill">
                    {f}
                  </span>
                ))}
                {functionSecondary.map((f) => (
                  <span key={f} className="lf-tag">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {industryPrimary.length > 0 && (
            <div>
              <span className="lf-field-label">
                <Briefcase className="size-3" style={{ display: "inline", marginRight: 4 }} />
                Industry Specialization
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {industryPrimary.map((i) => (
                  <span key={i} className="lf-tag lf-tag--skill">
                    {i}
                  </span>
                ))}
                {industrySecondary.map((i) => (
                  <span key={i} className="lf-tag">
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}

          {roleLevelReach.length > 0 && (
            <div>
              <span className="lf-field-label">Role Level Reach</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {roleLevelReach.map((r) => (
                  <span key={r} className="lf-tag">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {countriesSupported.length > 0 && (
            <div>
              <span className="lf-field-label">
                <Globe className="size-3" style={{ display: "inline", marginRight: 4 }} />
                Countries
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {countriesSupported.map((c) => (
                  <span key={c} className="lf-tag lf-tag--sector">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {location && (
            <div>
              <span className="lf-field-label">
                <MapPin className="size-3" style={{ display: "inline", marginRight: 4 }} />
                Location
              </span>
              <p
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 14,
                  color: "var(--ink-2)",
                  margin: 0,
                  marginTop: 4,
                }}
              >
                {location}
              </p>
            </div>
          )}

          {mandateTypeStrengths.length > 0 && (
            <div>
              <span className="lf-field-label">Mandate Strengths</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {mandateTypeStrengths.map((m) => (
                  <span key={m} className="lf-tag">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hiringExperienceTypes.length > 0 && (
            <div>
              <span className="lf-field-label">Hiring Experience</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {hiringExperienceTypes.map((h) => (
                  <span key={h} className="lf-tag">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {networkFreshness && (
            <div>
              <span className="lf-field-label">Network Freshness</span>
              <span className="lf-tag" style={{ display: "inline-flex", marginTop: 4 }}>
                {networkFreshness}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
