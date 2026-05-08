"use client";

import { useLanguage } from "@/hooks/use-language";
import { Check, Sparkles } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  fullName: string;
  headline: string;
  bio?: string;
  photo?: string;
  linkedin?: string;
  cvFileId?: string;
  skills: Array<{ name: string; yearsOfExperience?: number }>;
  experiences: Array<{ title: string; company: string }>;
  education: Array<{ degree: string; institution: string }>;
  completionPercentage: number;
}

interface ProfileCompletionCardProps {
  profile: Profile;
  onScrollToSection: (section: string) => void;
  onGenerateCv?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileCompletionCard({
  profile,
  onScrollToSection,
  onGenerateCv,
}: ProfileCompletionCardProps) {
  const { t } = useLanguage();

  const pct = profile.completionPercentage;

  // Derive missing items
  const suggestions: { key: string; section: string }[] = [];
  if (!profile.headline)
    suggestions.push({
      key: "profile.completion.addHeadline",
      section: "basicInfo",
    });
  if (!profile.bio || profile.bio.length < 50)
    suggestions.push({
      key: "profile.completion.addBio",
      section: "basicInfo",
    });
  if (profile.skills.length === 0)
    suggestions.push({
      key: "profile.completion.addSkills",
      section: "skills",
    });
  if (profile.experiences.length === 0)
    suggestions.push({
      key: "profile.completion.addExperience",
      section: "experience",
    });
  if (profile.education.length === 0)
    suggestions.push({
      key: "profile.completion.addEducation",
      section: "education",
    });
  if (!profile.photo)
    suggestions.push({
      key: "profile.completion.addPhoto",
      section: "basicInfo",
    });
  if (!profile.linkedin)
    suggestions.push({
      key: "profile.completion.addLinkedin",
      section: "languages",
    });
  if (!profile.cvFileId)
    suggestions.push({
      key: "profile.completion.addCv",
      section: "settings",
    });

  // SVG ring (matches dmf-progress-ring pattern from My Desk)
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const ringColor =
    pct < 50
      ? "var(--rust)"
      : pct < 80
        ? "var(--bronze)"
        : "var(--emerald)";

  return (
    <div className="lf-card" style={{ padding: "var(--s-4)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--s-4)",
          flexWrap: "wrap",
        }}
      >
        {/* Progress ring */}
        <div
          className="dmf-progress-ring"
          style={{ width: 60, height: 60, flexShrink: 0 }}
        >
          <svg viewBox="0 0 60 60" width="60" height="60">
            <circle
              cx="30"
              cy="30"
              r={radius}
              fill="none"
              stroke="var(--line-2)"
              strokeWidth={3}
            />
            <circle
              cx="30"
              cy="30"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={3}
              strokeDasharray={`${circumference - offset} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 30 30)"
              style={{ transition: "stroke-dasharray 500ms ease" }}
            />
          </svg>
          <div
            className="dmf-progress-num"
            style={{ color: ringColor }}
          >
            {pct}
            <span>%</span>
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: 16,
              fontWeight: 500,
              color: "var(--ink)",
              margin: 0,
              marginBottom: 4,
            }}
          >
            {t("profile.completion.title")}
          </h3>

          {suggestions.length === 0 ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 4,
                color: "var(--emerald)",
                fontFamily: "var(--lf-display)",
                fontStyle: "italic",
                fontSize: 13,
              }}
            >
              <Check className="size-4" />
              {t("profile.completion.complete")}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 8,
              }}
            >
              {suggestions.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onScrollToSection(s.section)}
                  className="lf-tag"
                  style={{ cursor: "pointer", border: "0.5px solid var(--line-2)" }}
                >
                  {t(s.key)}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onGenerateCv}
            className="lf-cta lf-cta--primary"
            style={{ marginTop: "var(--s-3)" }}
          >
            <Sparkles className="size-3.5" />
            {t("profile.editor.generateCv")}
          </button>
        </div>
      </div>
    </div>
  );
}
