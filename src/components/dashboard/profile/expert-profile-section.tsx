"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Lock, Pencil, Loader2 } from "lucide-react";

/**
 * Expert / Marketplace Profile Section (Unified Profile v3.1)
 *
 * Editable: bio, portfolio, availability, keywords
 * Non-editable (under LLP review): skills, certifications, sectors
 * Terminology: "Confirmed" / "Under Review" / "Changes Pending Review"
 */
export function ExpertProfileSection({ expert }: { expert: Record<string, unknown> }) {
  const { user } = useUser();
  const selfUpdate = useMutation(api.experts.selfUpdate);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [bio, setBio] = useState((expert.bio as string) || "");
  const [portfolio, setPortfolio] = useState((expert.portfolio as string) || "");
  const [availabilityStatus, setAvailabilityStatus] = useState(
    (expert.availabilityStatus as string) || "available"
  );
  const [keywords, setKeywords] = useState(
    ((expert.keywords as string[]) || []).join(", ")
  );

  const handleSave = async () => {
    if (!expert._id || !user?.id) return;
    setSaving(true);
    try {
      await selfUpdate({
        id: expert._id as Id<"experts">,
        clerkId: user.id,
        bio,
        portfolio: portfolio || undefined,
        availabilityStatus: availabilityStatus as "available" | "busy" | "on_leave",
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      });
      setEditing(false);
    } catch (err) {
      console.error("Failed to update expert profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const sectors = (expert.sectors as string[]) || [];
  const skills = (expert.skills as Array<{ name: string; level: number }>) || [];
  const certifications = (expert.certifications as Array<{ name: string; org?: string }>) || [];
  const experiences = (expert.experiences as Array<{ title: string; company?: string; duration?: string }>) || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      {/* Header with edit toggle */}
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
            {expert.name as string}
          </span>
          <span
            style={{
              fontFamily: "var(--lf-display)",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--ink-3)",
            }}
          >
            {expert.designation as string}
          </span>
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

      {/* Editable Fields */}
      <div
        className="dash-section"
        style={{ marginBottom: 0, display: "flex", flexDirection: "column", gap: "var(--s-3)" }}
      >
        <div className="dash-section-header">
          <h3 className="dash-section-title">My details</h3>
        </div>

        <div>
          <span className="lf-field-label">Bio</span>
          {editing ? (
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="lf-input"
              style={{ height: "auto", borderRadius: 12, padding: "10px 14px" }}
              placeholder="Your professional bio..."
            />
          ) : (
            <p
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 14,
                lineHeight: 1.55,
                color: bio ? "var(--ink-2)" : "var(--ink-4)",
                fontStyle: bio ? "normal" : "italic",
                margin: 0,
              }}
            >
              {bio || "No bio set"}
            </p>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--s-3)",
          }}
        >
          <div>
            <span className="lf-field-label">Portfolio URL</span>
            {editing ? (
              <Input
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
                className="lf-input"
                placeholder="https://..."
              />
            ) : (
              <p
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 14,
                  color: portfolio ? "var(--ink-2)" : "var(--ink-4)",
                  fontStyle: portfolio ? "normal" : "italic",
                  margin: 0,
                }}
              >
                {portfolio || "Not set"}
              </p>
            )}
          </div>

          <div>
            <span className="lf-field-label">Availability</span>
            {editing ? (
              <select
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value)}
                className="lf-select-trigger"
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="on_leave">On Leave</option>
              </select>
            ) : (
              <span
                className={`lf-status lf-status--${
                  availabilityStatus === "available"
                    ? "live"
                    : availabilityStatus === "busy"
                      ? "busy"
                      : "off"
                }`}
              >
                <span className="lf-status-dot" />
                {availabilityStatus === "available"
                  ? "Available"
                  : availabilityStatus === "busy"
                    ? "Busy"
                    : "On Leave"}
              </span>
            )}
          </div>
        </div>

        <div>
          <span className="lf-field-label">Keywords</span>
          {editing ? (
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="lf-input"
              placeholder="labour law, compliance, HR policy..."
            />
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {keywords ? (
                keywords
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean)
                  .map((k) => (
                    <span key={k} className="lf-tag lf-tag--skill">
                      {k}
                    </span>
                  ))
              ) : (
                <span
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontStyle: "italic",
                    fontSize: 13,
                    color: "var(--ink-4)",
                  }}
                >
                  No keywords
                </span>
              )}
            </div>
          )}
        </div>
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

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
          <div>
            <span className="lf-field-label">Sectors</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {sectors.map((s) => (
                <span key={s} className="lf-tag lf-tag--sector">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="lf-field-label">Skills</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {skills.map((s) => (
                <span key={s.name} className="lf-tag lf-tag--skill">
                  {s.name}
                  <span className="lf-tag-suffix">L{s.level}</span>
                </span>
              ))}
            </div>
          </div>

          {certifications.length > 0 && (
            <div>
              <span className="lf-field-label">Certifications</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {certifications.map((c) => (
                  <span key={c.name} className="lf-tag">
                    {c.name}
                    {c.org ? ` · ${c.org}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {experiences.length > 0 && (
            <div>
              <span className="lf-field-label">Experience</span>
              <ul className="lf-runlist" style={{ marginTop: 4 }}>
                {experiences.slice(0, 3).map((e, i) => (
                  <li key={i}>
                    <span className="lf-runlist-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="lf-runlist-text">
                      <strong style={{ color: "var(--ink)", fontWeight: 500 }}>
                        {e.title}
                      </strong>
                      {e.company && (
                        <span style={{ color: "var(--ink-3)" }}> at {e.company}</span>
                      )}
                      {e.duration && (
                        <span style={{ color: "var(--ink-4)" }}> · {e.duration}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {experiences.length > 3 && (
                <p
                  style={{
                    fontFamily: "var(--lf-mono)",
                    fontSize: 10,
                    color: "var(--ink-4)",
                    marginTop: 4,
                    letterSpacing: "0.06em",
                  }}
                >
                  + {experiences.length - 3} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
