"use client";

import { useRef, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/use-language";
import { ProfileWizard } from "./profile-wizard";
import { ProfileEditor } from "./profile-editor";
import { CvGeneratorSheet } from "./cv-generator-sheet";
import { EmployerProfileEditor } from "./employer-profile-editor";
import { ExpertProfileSection } from "./expert-profile-section";
import { ScoutProfileSection } from "./scout-profile-section";
import {
  User,
  Award,
  Search,
  Building2,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useAccountType } from "@/components/providers/account-context";

// ── Unified Profile Page ─────────────────────────────────────────────
// v3.1 Spec: Single profile page with segmented sections.
// User sees all their profiles in one place, updates what's editable,
// and sees status of items under review.

const STATUS_TONES: Record<string, { fg: string; bg: string }> = {
  Active: { fg: "var(--emerald)", bg: "color-mix(in oklab, var(--emerald) 12%, transparent)" },
  Confirmed: { fg: "var(--emerald)", bg: "color-mix(in oklab, var(--emerald) 12%, transparent)" },
  "Under Review": { fg: "var(--bronze)", bg: "var(--bronze-ghost)" },
  Draft: { fg: "var(--ink-4)", bg: "color-mix(in oklab, var(--ink) 6%, transparent)" },
  "Not Confirmed": { fg: "var(--rust)", bg: "var(--rust-ghost)" },
  Archived: { fg: "var(--ink-4)", bg: "color-mix(in oklab, var(--ink) 6%, transparent)" },
};

export function ProfilePageContent() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useUser();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t } = useLanguage();
  const { isOrgUser } = useAccountType();

  const role = (user?.publicMetadata as { role?: string })?.role;
  const isEmployer = role === "employer";

  // ── Data Queries ──
  const profile = useQuery(
    api.professionalProfiles.getByUserId,
    user?.id ? { userId: user.id } : "skip"
  );

  const expert = useQuery(
    api.experts.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const scoutProfile = useQuery(
    api.headhunting.scoutProfiles.getByUser,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const myClient = useQuery(
    api.headhunting.clients.getByClerkId,
    user?.id && isEmployer ? { clerkId: user.id } : "skip"
  );

  // ── Section State ──
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["general"]));
  const [cvSheetOpen, setCvSheetOpen] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const expandSectionRef = useRef<((id: string) => void) | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scrollToSection = useCallback((section: string) => {
    setExpandedSections((prev) => new Set(prev).add(section));
    expandSectionRef.current?.(section);
    requestAnimationFrame(() => {
      const el = sectionRefs.current[section];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  // ── Loading State ──
  const isLoading = profile === undefined || expert === undefined || scoutProfile === undefined;
  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)", maxWidth: 880, margin: "0 auto" }}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Determine which sections exist
  const hasProfile = profile !== null;
  const hasExpert = expert !== null;
  const hasScout = scoutProfile !== null;
  const hasClient = myClient !== null && myClient !== undefined;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* Page Header */}
      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">Personal Desk · Profile</div>
          <h1 className="dash-hello-title">
            <em>My profile.</em>
          </h1>
          <p className="dash-hello-sub">
            Manage all your LLP identities from one place.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
        {/* ── Section 1: General Identity ── */}
        <ProfileSection
          id="general"
          icon={<User className="size-4" />}
          title="General Identity"
          subtitle={user?.fullName || user?.primaryEmailAddress?.emailAddress || ""}
          expanded={expandedSections.has("general")}
          onToggle={() => toggleSection("general")}
        >
          {hasProfile ? (
            <ProfileEditor
              profile={profile as Parameters<typeof ProfileEditor>[0]["profile"]}
              sectionRefs={sectionRefs}
              expandSectionRef={expandSectionRef}
              onGenerateCv={() => setCvSheetOpen(true)}
            />
          ) : (
            <ProfileWizard />
          )}
        </ProfileSection>

        {/* ── Section 2: Employer / Client Profile ── */}
        {isEmployer && (
          <ProfileSection
            id="employer"
            icon={<Building2 className="size-4" />}
            title="Company Profile"
            subtitle={hasClient ? (myClient as { companyName?: string })?.companyName || "" : ""}
            badge={hasClient ? { label: "Active" } : undefined}
            expanded={expandedSections.has("employer")}
            onToggle={() => toggleSection("employer")}
          >
            {hasClient ? (
              <EmployerProfileEditor
                client={myClient}
                contact={(myClient as { contact?: unknown }).contact}
              />
            ) : (
              <div className="dash-empty">
                <p className="dash-empty-body">
                  Your employer account is not linked to a client profile yet.
                  Please contact LLP admin.
                </p>
              </div>
            )}
          </ProfileSection>
        )}

        {/* ── Section 3: Expert / Marketplace Profile (personal only) ── */}
        {!isOrgUser && (
          <ProfileSection
            id="expert"
            icon={<Award className="size-4" />}
            title="Expert / Marketplace Profile"
            subtitle={hasExpert ? (expert as { designation?: string })?.designation || "" : ""}
            badge={hasExpert ? getExpertBadge(expert as { status?: string }) : undefined}
            expanded={expandedSections.has("expert")}
            onToggle={() => toggleSection("expert")}
          >
            {hasExpert ? (
              <ExpertProfileSection expert={expert} />
            ) : (
              <InvitationCard
                title="Join the Expert Marketplace"
                description="Share what you know. Get discovered by those who need it. Earn through your expertise."
                what="The LLP Expert Marketplace is for professionals who have built real knowledge — in law, HR, compliance, business, or any field where their experience creates value for others. If you can help someone navigate a complex situation, make a better decision, or avoid a costly mistake, there is a place for you here."
                benefits={[
                  "Get discovered by organisations, teams, and individuals who need your kind of expertise",
                  "Receive consultation requests directly — you control your availability, terms, and how you engage",
                  "Build a credible professional presence on a platform built for serious practitioners",
                  "Earn through advisory sessions — your knowledge is an asset, not just a career credential",
                ]}
                href="/experts/apply"
                cta="Apply as Expert"
              />
            )}
          </ProfileSection>
        )}

        {/* ── Section 4: Scout Profile (personal only) ── */}
        {!isOrgUser && (
          <ProfileSection
            id="scout"
            icon={<Search className="size-4" />}
            title="Scout Network Profile"
            subtitle={hasScout ? (scoutProfile as { fullName?: string })?.fullName || "" : ""}
            badge={hasScout ? getScoutBadge(scoutProfile as { status?: string }) : undefined}
            expanded={expandedSections.has("scout")}
            onToggle={() => toggleSection("scout")}
          >
            {hasScout ? (
              <ScoutProfileSection scoutProfile={scoutProfile} />
            ) : (
              <InvitationCard
                title="Join the LLP Scout Network"
                description="Source talent for LLP's headhunting mandates. Earn per placement by connecting the right candidates with the right roles."
                what="LLP's Scout Network is a professional sourcing programme for HR specialists, recruiters, and talent practitioners. Scouts receive curated hiring mandates and earn a placement fee for every successful hire."
                benefits={[
                  "Receive mandates matched to your declared specialisation — no cold sourcing",
                  "Earn a share of the placement fee on every confirmed hire you contribute to",
                  "Your identity stays confidential — clients never know who sourced the candidate",
                  "Work at your own pace — accept or decline briefs, no fixed commitment",
                ]}
                href="/headhunting/scout"
                cta="Join as Scout"
              />
            )}
          </ProfileSection>
        )}
      </div>

    </div>
  );
}

// ── Collapsible Section Wrapper ──

function ProfileSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  id,
  icon,
  title,
  subtitle,
  badge,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: { label: string };
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const tone = badge ? STATUS_TONES[badge.label] ?? STATUS_TONES.Draft : null;
  return (
    <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "var(--s-3)",
          padding: "var(--s-3) var(--s-4)",
          textAlign: "left",
          background: "transparent",
          border: 0,
          cursor: "pointer",
          color: "inherit",
          fontFamily: "inherit",
        }}
      >
        {expanded ? (
          <ChevronDown className="size-4" style={{ color: "var(--ink-4)", flexShrink: 0 }} />
        ) : (
          <ChevronRight className="size-4" style={{ color: "var(--ink-4)", flexShrink: 0 }} />
        )}
        <div
          style={{
            flexShrink: 0,
            color: "var(--ink-3)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 15,
                fontWeight: 500,
                color: "var(--ink)",
              }}
            >
              {title}
            </span>
            {badge && tone && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 9px",
                  borderRadius: 999,
                  fontFamily: "var(--lf-mono)",
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  color: tone.fg,
                  background: tone.bg,
                  border: `0.5px solid ${tone.fg}`,
                }}
              >
                {badge.label}
              </span>
            )}
          </div>
          {subtitle && (
            <p
              style={{
                fontFamily: "var(--lf-display)",
                fontStyle: "italic",
                fontSize: 12.5,
                color: "var(--ink-3)",
                margin: 0,
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </button>
      {expanded && (
        <div
          style={{
            borderTop: "0.5px solid var(--line-1)",
            padding: "var(--s-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-3)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ── Invitation Card (empty state) ──

function InvitationCard({
  title,
  description,
  href,
  cta,
  what,
  benefits,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  what?: string;
  benefits?: string[];
}) {
  return (
    <div
      className="lf-card lf-card--feature"
      style={{
        padding: "var(--s-4)",
        borderColor: "color-mix(in oklab, var(--accent-blue) 32%, var(--glass-border))",
        background:
          "linear-gradient(180deg, var(--accent-blue-ghost), var(--glass-bg))",
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-3)",
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "var(--lf-mono)",
            fontSize: 9.5,
            color: "var(--accent-blue)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          What is this?
        </p>
        <h3
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "-0.012em",
            color: "var(--ink)",
            margin: 0,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: "var(--lf-display)",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--ink-3)",
            lineHeight: 1.55,
            margin: 0,
            marginTop: 6,
          }}
        >
          {what || description}
        </p>
      </div>

      {benefits && benefits.length > 0 && (
        <div>
          <p
            style={{
              fontFamily: "var(--lf-mono)",
              fontSize: 9.5,
              color: "var(--accent-blue)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            What&apos;s in it for you?
          </p>
          <ul className="lf-runlist">
            {benefits.map((b, i) => (
              <li key={i}>
                <span className="lf-runlist-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="lf-runlist-text">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href={href} className="lf-cta lf-cta--primary" style={{ alignSelf: "flex-start" }}>
        {cta}
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

// ── Badge Helpers ──

function getExpertBadge(expert: { status?: string }): { label: string } {
  if (expert.status === "published") return { label: "Confirmed" };
  if (expert.status === "draft") return { label: "Under Review" };
  return { label: "Archived" };
}

function getScoutBadge(scout: { status?: string }): { label: string } {
  if (scout.status === "submitted" || scout.status === "under_review")
    return { label: "Under Review" };
  if (scout.status === "approved") return { label: "Confirmed" };
  if (scout.status === "draft") return { label: "Draft" };
  if (scout.status === "rejected") return { label: "Not Confirmed" };
  return { label: scout.status || "Unknown" };
}
