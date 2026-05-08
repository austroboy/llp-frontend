"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useLanguage } from "@/hooks/use-language";
import { EXPERIENCE_LEVELS, getLabel } from "@/lib/profile/constants";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import "@/components/landing/landing.css";
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Linkedin,
  ExternalLink,
  Lock,
  User,
  Clock,
  Languages,
  Building2,
  Calendar,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Motion constants (per project_design_language.md)                  */
/* ------------------------------------------------------------------ */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const inViewOnce = { once: true, margin: "-72px 0px" } as const;

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface PublicProfileContentProps {
  slug: string;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function PublicProfileContent({ slug }: PublicProfileContentProps) {
  const { t, language } = useLanguage();
  const lang = language as "en" | "bn";

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const profile = useQuery(api.professionalProfiles.getBySlug, { slug });

  const photoUrl = useQuery(
    api.professionalProfiles.getPhotoUrl,
    profile?.photo
      ? { photoId: profile.photo as Id<"_storage"> }
      : "skip"
  );

  // Loading state
  if (profile === undefined) {
    return <LoadingSkeleton themeAttr={themeAttr} />;
  }

  // Not found
  if (profile === null) {
    return (
      <EmptyState
        themeAttr={themeAttr}
        icon={<User className="size-12" style={{ color: "var(--ink-4)" }} />}
        title={t("profile.notFound")}
        description={
          lang === "bn"
            ? "আপনি যে প্রোফাইলটি খুঁজছেন তা পাওয়া যায়নি বা সরানো হয়েছে।"
            : "The profile you are looking for does not exist or has been removed."
        }
      />
    );
  }

  // Private profile
  if (!profile.isPublic) {
    return (
      <EmptyState
        themeAttr={themeAttr}
        icon={<Lock className="size-12" style={{ color: "var(--ink-4)" }} />}
        title={lang === "bn" ? "ব্যক্তিগত প্রোফাইল" : "Private Profile"}
        description={
          lang === "bn"
            ? "এই প্রোফাইলটি ব্যক্তিগত এবং দেখার জন্য উপলব্ধ নয়।"
            : "This profile is private and not available for viewing."
        }
      />
    );
  }

  const initials = profile.fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const locationParts = [profile.city, profile.division].filter(Boolean);
  const locationStr = locationParts.join(", ");

  const heroPhoto = photoUrl || profile.photoUrl;

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
        <SiteTopNav />

        {/* ---- Identity hero ---- */}
        <section
          className="lf-section"
          style={{ paddingTop: "calc(var(--s-7) + 48px)" }}
        >
          <motion.div
            className="mx-auto"
            style={{ maxWidth: 1100 }}
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={fadeUp} className="lf-kicker">
              <span className="lf-kicker-mark">§ 01</span>
              <span>
                {lang === "bn" ? "প্রোফেশনাল প্রোফাইল" : "Professional Profile"}
              </span>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="lf-card lf-card--feature"
              style={{ marginTop: "var(--s-5)" }}
            >
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                {/* Photo / initials */}
                {heroPhoto ? (
                  <img
                    src={heroPhoto}
                    alt={profile.fullName}
                    className="shrink-0 rounded-full object-cover"
                    style={{
                      width: 96,
                      height: 96,
                      border: "1px solid var(--glass-border)",
                      boxShadow:
                        "0 1px 0 rgba(255,255,255,0.5) inset, 0 12px 36px -16px rgba(15,23,42,0.18)",
                    }}
                  />
                ) : (
                  <span
                    className="lf-avatar shrink-0"
                    style={{ width: 96, height: 96, fontSize: 28 }}
                  >
                    {initials}
                  </span>
                )}

                <div className="flex-1 text-center sm:text-left">
                  <h1 className="lf-h2" style={{ marginBottom: 6 }}>
                    {profile.fullName}
                  </h1>
                  {profile.headline && (
                    <p className="lf-section-deck" style={{ marginBottom: 10 }}>
                      {profile.headline}
                    </p>
                  )}

                  {/* Designation @ Org */}
                  {(profile.currentDesignation || profile.currentOrganization) && (
                    <p
                      className="lf-meta inline-flex items-center justify-center gap-1.5 sm:justify-start"
                      style={{ marginTop: 6 }}
                    >
                      <Building2 className="size-3.5 shrink-0" />
                      {[profile.currentDesignation, profile.currentOrganization]
                        .filter(Boolean)
                        .join(" @ ")}
                    </p>
                  )}

                  {/* Location */}
                  {locationStr && (
                    <p
                      className="lf-meta inline-flex items-center justify-center gap-1.5 sm:justify-start"
                      style={{ marginTop: 4, marginLeft: profile.currentDesignation || profile.currentOrganization ? 12 : 0 }}
                    >
                      <MapPin className="size-3.5 shrink-0" />
                      {locationStr}
                    </p>
                  )}

                  {/* Status pills */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {profile.isOpenToOpportunities && (
                      <span className="lf-status lf-status--live inline-flex">
                        <span className="lf-status-dot" />
                        <Briefcase className="size-3" />
                        {lang === "bn" ? "কাজের জন্য উন্মুক্ত" : "Open to Work"}
                      </span>
                    )}
                    {profile.openToRemote && (
                      <span className="lf-tag lf-tag--skill inline-flex items-center gap-1">
                        <Globe className="size-3" />
                        {lang === "bn" ? "রিমোটে আগ্রহী" : "Open to Remote"}
                      </span>
                    )}
                    {profile.willingToRelocate && (
                      <span className="lf-tag lf-tag--more inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {lang === "bn" ? "স্থানান্তরে ইচ্ছুক" : "Willing to Relocate"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ---- Body grid ---- */}
        <section className="lf-section" style={{ paddingTop: 0 }}>
          <motion.div
            className="mx-auto grid grid-cols-1 lg:grid-cols-3"
            style={{ maxWidth: 1100, gap: "var(--s-5)" }}
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            {/* Left column 2/3 */}
            <div className="space-y-6 lg:col-span-2">
              {/* About */}
              {profile.bio && (
                <motion.div
                  variants={fadeUp}
                  className="lf-card"
                  style={{ padding: "var(--s-5)" }}
                >
                  <SectionTitle icon={<User className="size-4" />}>
                    {t("profile.aboutTitle")}
                  </SectionTitle>
                  <p
                    className="lf-body whitespace-pre-wrap"
                    style={{ marginTop: "var(--s-3)" }}
                  >
                    {profile.bio}
                  </p>
                </motion.div>
              )}

              {/* Work Experience */}
              {profile.experiences && profile.experiences.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  className="lf-card"
                  style={{ padding: "var(--s-5)" }}
                >
                  <SectionTitle icon={<Briefcase className="size-4" />}>
                    {t("profile.section.experience")}
                  </SectionTitle>
                  <div
                    className="relative"
                    style={{ marginTop: "var(--s-3)" }}
                  >
                    {profile.experiences.map(
                      (
                        exp: {
                          title: string;
                          company: string;
                          location?: string;
                          startDate?: string;
                          endDate?: string;
                          isCurrent: boolean;
                          description?: string;
                        },
                        i: number
                      ) => (
                        <div
                          key={i}
                          className="relative flex gap-4"
                          style={{ paddingBottom: i < profile.experiences.length - 1 ? "var(--s-4)" : 0 }}
                        >
                          {/* Timeline marker */}
                          <div className="flex flex-col items-center">
                            <div
                              className="mt-1.5 size-3 shrink-0 rounded-full"
                              style={{
                                background: "var(--paper)",
                                border: "2px solid var(--accent-blue)",
                                boxShadow:
                                  "0 0 0 3px color-mix(in oklab, var(--accent-blue) 14%, transparent)",
                              }}
                            />
                            {i < profile.experiences.length - 1 && (
                              <div
                                className="w-px flex-1"
                                style={{ background: "var(--line-2)" }}
                              />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 pb-1">
                            <h4
                              className="lf-h3"
                              style={{ fontSize: 17, marginBottom: 2 }}
                            >
                              {exp.title}
                            </h4>
                            <p className="lf-body" style={{ fontSize: 14 }}>
                              {exp.company}
                              {exp.location && ` \u00b7 ${exp.location}`}
                            </p>
                            <p className="lf-meta inline-flex items-center gap-1" style={{ marginTop: 4 }}>
                              <Calendar className="size-3" />
                              {exp.startDate || "?"}
                              {" \u2013 "}
                              {exp.isCurrent
                                ? lang === "bn"
                                  ? "বর্তমান"
                                  : "Present"
                                : exp.endDate || "?"}
                            </p>
                            {exp.description && (
                              <p
                                className="lf-body whitespace-pre-wrap"
                                style={{ fontSize: 14, marginTop: "var(--s-2)" }}
                              >
                                {exp.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </motion.div>
              )}

              {/* Education */}
              {profile.education && profile.education.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  className="lf-card"
                  style={{ padding: "var(--s-5)" }}
                >
                  <SectionTitle icon={<GraduationCap className="size-4" />}>
                    {t("profile.education")}
                  </SectionTitle>
                  <div className="space-y-4" style={{ marginTop: "var(--s-3)" }}>
                    {profile.education.map(
                      (
                        edu: {
                          degree: string;
                          institution: string;
                          fieldOfStudy?: string;
                          year?: string;
                        },
                        i: number
                      ) => (
                        <div
                          key={i}
                          style={{
                            paddingTop: i > 0 ? "var(--s-3)" : 0,
                            borderTop: i > 0 ? "1px solid var(--line-2)" : "none",
                          }}
                        >
                          <h4 className="lf-h3" style={{ fontSize: 16, marginBottom: 2 }}>
                            {edu.degree}
                          </h4>
                          <p className="lf-body" style={{ fontSize: 14 }}>
                            {edu.institution}
                          </p>
                          <div className="lf-meta inline-flex items-center gap-2" style={{ marginTop: 4 }}>
                            {edu.fieldOfStudy && <span>{edu.fieldOfStudy}</span>}
                            {edu.fieldOfStudy && edu.year && <span>·</span>}
                            {edu.year && <span>{edu.year}</span>}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </motion.div>
              )}

              {/* Certifications */}
              {profile.certifications && profile.certifications.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  className="lf-card"
                  style={{ padding: "var(--s-5)" }}
                >
                  <SectionTitle icon={<Award className="size-4" />}>
                    {lang === "bn" ? "সনদপত্র" : "Certifications"}
                  </SectionTitle>
                  <div className="space-y-3" style={{ marginTop: "var(--s-3)" }}>
                    {profile.certifications.map(
                      (
                        cert: { name: string; org?: string; year?: string },
                        i: number
                      ) => (
                        <div
                          key={i}
                          className="flex items-start gap-3"
                          style={{
                            paddingTop: i > 0 ? "var(--s-3)" : 0,
                            borderTop: i > 0 ? "1px solid var(--line-2)" : "none",
                          }}
                        >
                          <Award
                            className="mt-0.5 size-4 shrink-0"
                            style={{ color: "var(--accent-blue)" }}
                          />
                          <div>
                            <h4 className="lf-h3" style={{ fontSize: 15, marginBottom: 2 }}>
                              {cert.name}
                            </h4>
                            <div className="lf-meta inline-flex items-center gap-2">
                              {cert.org && <span>{cert.org}</span>}
                              {cert.org && cert.year && <span>·</span>}
                              {cert.year && <span>{cert.year}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </motion.div>
              )}

              {/* Skills */}
              {profile.skills && profile.skills.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  className="lf-card"
                  style={{ padding: "var(--s-5)" }}
                >
                  <SectionTitle icon={<Briefcase className="size-4" />}>
                    {t("profile.section.skills")}
                  </SectionTitle>
                  <div
                    className="flex flex-wrap gap-2"
                    style={{ marginTop: "var(--s-3)" }}
                  >
                    {profile.skills.map(
                      (
                        skill: { name: string; yearsOfExperience?: number },
                        i: number
                      ) => (
                        <span key={i} className="lf-tag lf-tag--skill">
                          {skill.name}
                          {skill.yearsOfExperience != null && (
                            <span style={{ marginLeft: 6, opacity: 0.7 }}>
                              ({skill.yearsOfExperience}
                              {lang === "bn" ? " বছর" : "yr"})
                            </span>
                          )}
                        </span>
                      )
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right column 1/3 */}
            <div className="space-y-6">
              {/* Quick Info */}
              <motion.div
                variants={fadeUp}
                className="lf-card"
                style={{ padding: "var(--s-5)" }}
              >
                <SectionTitle>
                  {lang === "bn" ? "সংক্ষিপ্ত তথ্য" : "Quick Info"}
                </SectionTitle>
                <div
                  className="space-y-4"
                  style={{ marginTop: "var(--s-3)" }}
                >
                  {/* Experience Level */}
                  {profile.experienceLevel && (
                    <QuickInfoRow
                      icon={<Briefcase className="size-4" />}
                      label={lang === "bn" ? "অভিজ্ঞতার স্তর" : "Experience Level"}
                      value={getLabel(EXPERIENCE_LEVELS, profile.experienceLevel, lang)}
                    />
                  )}

                  {/* Total Years */}
                  {profile.totalExperienceYears != null && (
                    <QuickInfoRow
                      icon={<Clock className="size-4" />}
                      label={t("profile.field.totalExperience")}
                      value={`${profile.totalExperienceYears} ${lang === "bn" ? "বছর" : "years"}`}
                    />
                  )}

                  {/* Location */}
                  {locationStr && (
                    <QuickInfoRow
                      icon={<MapPin className="size-4" />}
                      label={lang === "bn" ? "অবস্থান" : "Location"}
                      value={locationStr}
                    />
                  )}

                  {/* Languages */}
                  {profile.languages && profile.languages.length > 0 && (
                    <>
                      <div
                        className="lf-rule"
                        style={{ margin: "var(--s-3) 0" }}
                      />
                      <div className="flex items-start gap-3">
                        <Languages
                          className="mt-0.5 size-4 shrink-0"
                          style={{ color: "var(--ink-4)" }}
                        />
                        <div className="flex-1">
                          <p className="lf-meta" style={{ marginBottom: 6 }}>
                            {t("profile.section.languages")}
                          </p>
                          <div className="space-y-1">
                            {profile.languages.map(
                              (
                                l: { name: string; proficiency?: string },
                                i: number
                              ) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between"
                                  style={{ fontSize: 14 }}
                                >
                                  <span
                                    className="lf-body"
                                    style={{ fontWeight: 500, fontSize: 14 }}
                                  >
                                    {l.name}
                                  </span>
                                  {l.proficiency && (
                                    <span className="lf-meta">
                                      {l.proficiency}
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Links */}
              {(profile.linkedin ||
                profile.portfolio ||
                (profile.socialProfiles && profile.socialProfiles.length > 0)) && (
                <motion.div
                  variants={fadeUp}
                  className="lf-card"
                  style={{ padding: "var(--s-5)" }}
                >
                  <SectionTitle>{lang === "bn" ? "লিংক" : "Links"}</SectionTitle>
                  <div
                    className="space-y-3"
                    style={{ marginTop: "var(--s-3)" }}
                  >
                    {profile.linkedin && (
                      <ProfileLink
                        href={profile.linkedin}
                        icon={<Linkedin className="size-4 shrink-0" />}
                        label="LinkedIn"
                      />
                    )}
                    {profile.portfolio && (
                      <ProfileLink
                        href={profile.portfolio}
                        icon={<Globe className="size-4 shrink-0" />}
                        label={lang === "bn" ? "পোর্টফোলিও" : "Portfolio"}
                      />
                    )}
                    {profile.socialProfiles?.map(
                      (
                        sp: { platform: string; url: string },
                        i: number
                      ) => (
                        <ProfileLink
                          key={i}
                          href={sp.url}
                          icon={<Globe className="size-4 shrink-0" />}
                          label={sp.platform}
                        />
                      )
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </section>

        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                      */
/* ------------------------------------------------------------------ */
function SectionTitle({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h3
      className="lf-h3 inline-flex items-center gap-2"
      style={{ fontSize: 18 }}
    >
      {icon && (
        <span style={{ color: "var(--accent-blue)" }} aria-hidden>
          {icon}
        </span>
      )}
      {children}
    </h3>
  );
}

function QuickInfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 shrink-0"
        style={{ color: "var(--ink-4)" }}
        aria-hidden
      >
        {icon}
      </span>
      <div>
        <p className="lf-meta" style={{ marginBottom: 2 }}>
          {label}
        </p>
        <p className="lf-body" style={{ fontSize: 14, fontWeight: 500 }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function ProfileLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="lf-cta lf-cta--ghost lf-glow"
      style={{
        width: "100%",
        justifyContent: "flex-start",
        textTransform: "none",
        fontSize: 13,
        letterSpacing: 0,
      }}
    >
      {icon}
      <span className="truncate flex-1 text-left">{label}</span>
      <ExternalLink className="size-3 shrink-0 opacity-60" />
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */
function EmptyState({
  themeAttr,
  icon,
  title,
  description,
}: {
  themeAttr: "light" | "dark";
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
        <SiteTopNav />
        <section
          className="lf-section"
          style={{ paddingTop: "calc(var(--s-7) + 48px)" }}
        >
          <div
            className="mx-auto lf-card lf-card--feature flex flex-col items-center text-center"
            style={{ maxWidth: 560, padding: "var(--s-6)" }}
          >
            <span
              className="lf-avatar"
              style={{ width: 80, height: 80, marginBottom: "var(--s-4)" }}
            >
              {icon}
            </span>
            <h1 className="lf-h2" style={{ marginBottom: "var(--s-2)" }}>
              {title}
            </h1>
            <p className="lf-body" style={{ maxWidth: 420 }}>
              {description}
            </p>
          </div>
        </section>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */
function LoadingSkeleton({ themeAttr }: { themeAttr: "light" | "dark" }) {
  const bar = (w: string | number, h = 14) => (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 6,
        background:
          "linear-gradient(90deg, var(--glass-bg) 0%, var(--glass-bg-strong) 50%, var(--glass-bg) 100%)",
        border: "1px solid var(--glass-border)",
      }}
    />
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
        <SiteTopNav />
        <section
          className="lf-section"
          style={{ paddingTop: "calc(var(--s-7) + 48px)" }}
        >
          <div
            className="mx-auto lf-card lf-card--feature"
            style={{ maxWidth: 1100 }}
          >
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div
                className="shrink-0 rounded-full"
                style={{
                  width: 96,
                  height: 96,
                  background: "var(--glass-bg-strong)",
                  border: "1px solid var(--glass-border)",
                }}
              />
              <div className="flex-1 space-y-3 text-center sm:text-left">
                {bar(220, 24)}
                {bar(280, 18)}
                {bar(180, 14)}
                <div className="flex justify-center gap-2 sm:justify-start">
                  {bar(120, 24)}
                  {bar(140, 24)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lf-section" style={{ paddingTop: 0 }}>
          <div
            className="mx-auto grid grid-cols-1 lg:grid-cols-3"
            style={{ maxWidth: 1100, gap: "var(--s-5)" }}
          >
            <div className="space-y-6 lg:col-span-2">
              <div className="lf-card" style={{ padding: "var(--s-5)" }}>
                {bar(120, 18)}
                <div style={{ marginTop: 16 }}>{bar("100%", 12)}</div>
                <div style={{ marginTop: 8 }}>{bar("100%", 12)}</div>
                <div style={{ marginTop: 8 }}>{bar("75%", 12)}</div>
              </div>
              <div className="lf-card" style={{ padding: "var(--s-5)" }}>
                {bar(160, 18)}
                <div className="space-y-4" style={{ marginTop: 16 }}>
                  {[1, 2].map((n) => (
                    <div key={n} className="flex gap-4">
                      <div
                        className="shrink-0 rounded-full"
                        style={{
                          width: 12,
                          height: 12,
                          marginTop: 6,
                          background: "var(--glass-bg-strong)",
                          border: "1px solid var(--glass-border)",
                        }}
                      />
                      <div className="flex-1 space-y-2">
                        {bar(220, 14)}
                        {bar(160, 12)}
                        {bar(110, 12)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lf-card" style={{ padding: "var(--s-5)" }}>
                {bar(100, 18)}
                <div
                  className="flex flex-wrap gap-2"
                  style={{ marginTop: 16 }}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n}>{bar(80, 22)}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="lf-card" style={{ padding: "var(--s-5)" }}>
                {bar(140, 18)}
                <div className="space-y-4" style={{ marginTop: 16 }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex gap-3">
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          background: "var(--glass-bg-strong)",
                          border: "1px solid var(--glass-border)",
                          borderRadius: 4,
                        }}
                      />
                      <div className="space-y-1 flex-1">
                        {bar(100, 12)}
                        {bar(140, 14)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
