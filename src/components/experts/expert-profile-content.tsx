"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import {
  ArrowLeft,
  MapPin,
  Star,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  Share2,
  Briefcase,
  MessageCircle,
  Calendar,
  Globe,
  Pencil,
  GraduationCap,
  FolderOpen,
  Building2,
} from "lucide-react";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { getBadgeDisplay, getBadgeIcon } from "@/lib/badge-utils";
import { ConsultationRequestDialog } from "@/components/experts/consultation-request-dialog";
import { QuickQuestionDialog } from "@/components/experts/quick-question-dialog";
import { ExpertSelfEditSheet } from "@/components/experts/expert-self-edit-sheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { track } from "@/lib/posthog/events";

/* ------------------------------------------------------------------ */
/*  Social platform icons (inline SVG for brand accuracy)              */
/* ------------------------------------------------------------------ */
const SOCIAL_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  github: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
    color: "hover:text-[#333] dark:hover:text-white",
  },
  facebook: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: "hover:text-[#1877F2]",
  },
  x: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: "hover:text-[#000] dark:hover:text-white",
  },
  twitter: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: "hover:text-[#000] dark:hover:text-white",
  },
  youtube: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
        <path fill="white" d="M9.545 15.568V8.432L15.818 12z" />
      </svg>
    ),
    color: "hover:text-[#FF0000]",
  },
  linkedin: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    color: "hover:text-[#0A66C2]",
  },
  instagram: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z" />
      </svg>
    ),
    color: "hover:text-[#E4405F]",
  },
  dribbble: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308a10.174 10.174 0 004.392-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4a10.05 10.05 0 006.12 2.068c1.47 0 2.874-.31 4.176-.718zM5.034 20.54c.23-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 13.747 1.347 13.657.968 13.65v.354a10.1 10.1 0 004.066 6.536zm-4.033-8.9c.39.006 5.333.03 10.666-1.455-1.905-3.39-3.967-6.24-4.275-6.645A10.15 10.15 0 001.001 11.64zm7.652-9.22c.324.42 2.412 3.255 4.29 6.705 4.086-1.53 5.817-3.863 5.982-4.095A10.1 10.1 0 0012.002 1.93a10 10 0 00-3.349.49zm11.142 3.89c-.21.27-2.118 2.715-6.36 4.413.226.465.444.94.649 1.41.073.165.143.33.214.493 3.39-.425 6.75.26 7.086.33-.03-2.475-.88-4.755-2.389-6.646z" />
      </svg>
    ),
    color: "hover:text-[#EA4C89]",
  },
  behance: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.502 1.22.906.26 1.576.72 2.022 1.37.448.66.665 1.45.665 2.36 0 .75-.13 1.39-.41 1.93-.28.55-.67 1-1.16 1.35-.48.348-1.05.6-1.67.767-.62.165-1.287.254-2.007.254H0V4.51h6.938v-.007zM6.545 10.16c.575 0 1.053-.148 1.434-.437.382-.29.572-.735.572-1.338 0-.344-.065-.625-.196-.853-.13-.228-.308-.41-.534-.538-.225-.13-.484-.22-.78-.274-.296-.053-.617-.08-.96-.08H3.472v3.52h3.073zm.2 5.47c.394 0 .76-.045 1.095-.136.336-.09.623-.226.87-.406.244-.18.434-.417.57-.71.135-.293.2-.65.2-1.077 0-.855-.247-1.463-.74-1.825-.494-.36-1.15-.54-1.97-.54H3.47v4.693h3.275zM14.898 4.507h6.654V6.2h-6.654V4.507zm3.262 2.697c.706 0 1.32.122 1.845.372.525.25.962.585 1.31 1.005.35.42.61.9.79 1.44.175.54.265 1.1.265 1.68 0 .21-.015.385-.05.533H15.05c.023.645.213 1.18.577 1.59.363.41.866.62 1.51.62.464 0 .862-.12 1.2-.356.336-.235.573-.51.71-.83h2.36c-.342 1.09-.9 1.9-1.67 2.43-.766.532-1.693.79-2.78.79-.727 0-1.39-.12-1.99-.36-.596-.24-1.106-.58-1.533-1.02-.424-.443-.752-.972-.984-1.59-.232-.617-.348-1.296-.348-2.04 0-.718.12-1.38.36-1.988.243-.61.577-1.136 1.004-1.577.427-.44.94-.783 1.54-1.024.6-.244 1.258-.365 1.975-.365zm2.33 3.895c-.06-.576-.27-1.044-.623-1.405-.358-.362-.862-.543-1.52-.543-.396 0-.73.068-1.003.205-.275.14-.498.316-.672.53-.175.213-.302.444-.383.693-.08.25-.132.475-.153.682h4.353z" />
      </svg>
    ),
    color: "hover:text-[#1769FF]",
  },
};

function getSocialIcon(platform: string) {
  const key = platform.toLowerCase().trim();
  return SOCIAL_ICONS[key] || null;
}

/* ------------------------------------------------------------------ */
/*  Badge config — shared from src/lib/badge-utils.tsx                 */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Skill level config                                                  */
/* ------------------------------------------------------------------ */
const SKILL_LEVEL_COLORS: Record<number, { border: string; badge: string }> = {
  4: {
    border: "border-emerald-300 dark:border-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  3: {
    border: "border-purple-300 dark:border-purple-700",
    badge: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  2: {
    border: "border-blue-300 dark:border-blue-700",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  1: {
    border: "border-slate-300 dark:border-slate-600",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

function LevelBadge({ level }: { level: number }) {
  const config = SKILL_LEVEL_COLORS[level] || SKILL_LEVEL_COLORS[1];
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", config.badge)}>
      Level {level}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Availability config                                                 */
/* ------------------------------------------------------------------ */
const AVAILABILITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  available: {
    label: "Available",
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  busy: {
    label: "Busy",
    color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    dot: "bg-yellow-500",
  },
  on_leave: {
    label: "On Leave",
    color: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    dot: "bg-red-500",
  },
};

/* ------------------------------------------------------------------ */
/*  Skeleton component                                                  */
/* ------------------------------------------------------------------ */
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />
      <section className="mx-auto max-w-6xl px-4 pt-4 pb-6 sm:py-8 lg:px-6">
        <div className="h-4 w-32 rounded bg-muted animate-pulse mb-3" />
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8">
          <div className="flex items-start gap-3 sm:gap-5">
            <div className="size-14 sm:size-20 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
              <div className="h-3 w-24 sm:w-32 rounded bg-muted animate-pulse" />
              <div className="h-5 sm:h-6 w-40 sm:w-48 rounded bg-muted animate-pulse" />
              <div className="h-4 w-32 sm:w-36 rounded bg-muted animate-pulse" />
              <div className="h-3 w-20 sm:w-24 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-16 lg:px-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4 sm:space-y-6">
            <div className="h-28 sm:h-32 rounded-2xl bg-muted animate-pulse" />
            <div className="h-48 sm:h-64 rounded-2xl bg-muted animate-pulse" />
          </div>
          <div className="hidden lg:block h-48 rounded-2xl bg-muted animate-pulse" />
        </div>
      </section>
      <HomepageFooter />
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */
export function ExpertProfileContent({ slug }: { slug: string }) {
  const { t } = useLanguage();
  const { user } = useUser();
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [quickQuestionOpen, setQuickQuestionOpen] = useState(false);
  const [selfEditOpen, setSelfEditOpen] = useState(false);
  const [badgesExpanded, setBadgesExpanded] = useState(false);

  // --- Convex queries ---
  const expert = useQuery(api.experts.getBySlug, { slug });
  const myExpert = useQuery(
    api.experts.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const badges = useQuery(
    api.expertBadges.listByExpert,
    expert ? { expertId: expert._id } : "skip"
  );
  const photoUrl = useQuery(
    api.experts.getPhotoUrl,
    expert?.photoId ? { photoId: expert.photoId } : "skip"
  );
  const allExperts = useQuery(api.experts.listPublished);

  // PostHog: expert_profile_viewed once per loaded expert
  useEffect(() => {
    if (!expert?._id) return;
    void track("expert_profile_viewed", { expert_id: String(expert._id) });
  }, [expert?._id]);

  // --- Similar experts (sector/skill overlap) ---
  const similarExperts = useMemo(() => {
    if (!expert || !allExperts) return [];
    return allExperts
      .filter((e) => e._id !== expert._id)
      .map((e) => {
        const sectorScore = e.sectors.filter((s) => expert.sectors.includes(s)).length * 2;
        const skillScore = e.skills.filter((s) =>
          expert.skills.some((es) => es.name === s.name)
        ).length * 3;
        return { ...e, score: sectorScore + skillScore };
      })
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [expert, allExperts]);

  // --- Ticker keywords (custom + skills + sectors) ---
  const tickerKeywords = useMemo(() => {
    if (!expert) return [];
    const custom = expert.keywords ?? [];
    const skillNames = expert.skills.map((s) => s.name);
    const merged = [...custom, ...skillNames];
    return Array.from(new Set(merged));
  }, [expert]);

  // Derive unique companies from experiences
  const derivedCompanies = useMemo(() => {
    if (!expert) return [];
    const fromExperiences = expert.experiences
      .map((e) => e.company)
      .filter((c): c is string => !!c);
    const fromManual = expert.companiesWorked.map((c) => c.name);
    return Array.from(new Set([...fromExperiences, ...fromManual]));
  }, [expert]);

  // Derive unique locations with dominant work mode
  const derivedLocations = useMemo(() => {
    if (!expert) return [] as { location: string; workMode?: string }[];
    const locMap = new Map<string, string | undefined>();
    for (const exp of expert.experiences) {
      if (exp.location && !locMap.has(exp.location)) {
        locMap.set(exp.location, exp.workMode);
      }
    }
    for (const c of expert.countriesWorked) {
      if (!locMap.has(c)) locMap.set(c, undefined);
    }
    return Array.from(locMap.entries()).map(([location, workMode]) => ({ location, workMode }));
  }, [expert]);

  // --- Merged social profiles (auto-include LinkedIn if not already present) ---
  const mergedSocialProfiles = useMemo(() => {
    if (!expert) return [];
    const profiles = [...(expert.socialProfiles ?? [])];
    if (expert.linkedin) {
      const alreadyHas = profiles.some((sp) => sp.url === expert.linkedin || sp.platform.toLowerCase() === "linkedin");
      if (!alreadyHas) {
        profiles.unshift({ platform: "LinkedIn", url: expert.linkedin });
      }
    }
    return profiles;
  }, [expert]);

  // --- Specialty tagline from top 2 skills ---
  const specialtyTagline = useMemo(() => {
    if (!expert) return "";
    const topSkills = [...expert.skills]
      .sort((a, b) => b.level - a.level)
      .slice(0, 2)
      .map((s) => s.name);
    return topSkills.join(" | ") + " Specialist";
  }, [expert]);

  // --- Loading state ---
  if (expert === undefined) {
    return <ProfileSkeleton />;
  }

  // --- Not found ---
  if (expert === null) {
    return (
      <div className="min-h-screen bg-background">
        <SiteTopNav />
        <div className="mx-auto max-w-6xl px-4 pt-4 lg:px-6">
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <h1 className="text-2xl font-bold mb-2">{t("profile.notFound")}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t("profile.notFoundDesc")}
            </p>
            <Link href="/experts">
              <Button variant="outline" className="rounded-full">
                <ArrowLeft className="size-4 mr-1.5" />
                {t("profile.backToBrowse")}
              </Button>
            </Link>
          </div>
        </div>
        <HomepageFooter />
      </div>
    );
  }

  const isOwnProfile = !!(user?.id && myExpert && myExpert._id === expert._id);
  const availability = AVAILABILITY_CONFIG[expert.availabilityStatus] || AVAILABILITY_CONFIG.available;

  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />

      {/* ============================================================ */}
      {/*  Profile Header Band                                          */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-6xl px-4 pt-4 pb-6 sm:py-8 lg:px-6">
        <Link
          href="/experts"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 mb-3"
        >
          <ArrowLeft className="size-4" />
          {t("profile.backToBrowse")}
        </Link>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">

          {/* ---- Mobile: centered card layout ---- */}
          <div className="sm:hidden p-5 pb-0">
            {/* Avatar + Edit */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {(photoUrl || expert.profilePhotoUrl) ? (
                  <Image
                    src={(photoUrl || expert.profilePhotoUrl)!}
                    alt={expert.name}
                    width={80}
                    height={80}
                    className="size-20 rounded-full border-[3px] border-primary/20 shadow-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary border-[3px] border-primary/20 shadow-lg">
                    {expert.initials}
                  </div>
                )}
                {/* Availability dot on avatar */}
                <span className={cn("absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-card", availability.dot)} />
              </div>

              {/* Badges row */}
              <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <ShieldCheck className="size-3" />
                  {t("profile.assessedBadge")}
                </span>
                {badges && badges.length > 0 && (() => {
                  const limit = 2;
                  const visible = badgesExpanded ? badges : badges.slice(0, limit);
                  const hidden = badges.length - limit;
                  return (
                    <>
                      {visible.map((b) => {
                        const display = getBadgeDisplay(b.badge);
                        const IconComp = getBadgeIcon(b.badge, b.icon);
                        return (
                          <span
                            key={b._id}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              display.color
                            )}
                          >
                            {IconComp && <IconComp className="size-3" />}
                            {display.label}
                          </span>
                        );
                      })}
                      {!badgesExpanded && hidden > 0 && (
                        <button
                          type="button"
                          onClick={() => setBadgesExpanded(true)}
                          className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors"
                        >
                          +{hidden}
                        </button>
                      )}
                      {badgesExpanded && badges.length > limit && (
                        <button
                          type="button"
                          onClick={() => setBadgesExpanded(false)}
                          className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors"
                        >
                          −
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Name */}
              <h1 className="text-xl font-bold leading-tight mt-3 text-center">
                {expert.name}
              </h1>
              {expert.designation && (
                <p className="text-sm text-muted-foreground mt-0.5 text-center">{expert.designation}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1 text-center">{specialtyTagline}</p>
              {expert.organization && (
                <p className="text-xs text-muted-foreground text-center">{expert.organization}</p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {expert.city}
                </span>
                {expert.portfolio && (
                  <a
                    href={expert.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="size-3" />
                    Portfolio
                  </a>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    availability.color
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", availability.dot)} />
                  {availability.label}
                </span>
              </div>

              {/* Stats strip */}
              <div className="flex items-center justify-center divide-x divide-border mt-4 w-full rounded-xl bg-muted/50 py-2.5">
                <div className="flex-1 text-center">
                  <p className="text-sm font-semibold">{expert.skills.length}</p>
                  <p className="text-[10px] text-muted-foreground">{t("profile.assessedSkills")}</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-sm font-semibold">{expert.stats.sessionCount}</p>
                  <p className="text-[10px] text-muted-foreground">{t("profile.sessions")}</p>
                </div>
                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-sm font-semibold">{expert.stats.rating.toFixed(1)}</p>
                    <Star className="size-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">({expert.stats.reviewCount} {t("profile.reviews")})</p>
                </div>
              </div>

              {/* Edit button for own profile */}
              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full mt-3 text-xs"
                  onClick={() => setSelfEditOpen(true)}
                >
                  <Pencil className="size-3 mr-1.5" />
                  {t("profile.editProfile") || "Edit Profile"}
                </Button>
              )}
            </div>
          </div>

          {/* ---- Desktop: side-by-side layout ---- */}
          <div className="hidden sm:block p-6 lg:p-8 pb-0 lg:pb-0">
            <div className="flex items-start gap-5 min-w-0">
              {/* Avatar */}
              <div className="relative shrink-0">
                {(photoUrl || expert.profilePhotoUrl) ? (
                  <Image
                    src={(photoUrl || expert.profilePhotoUrl)!}
                    alt={expert.name}
                    width={96}
                    height={96}
                    className="size-20 lg:size-24 rounded-full border-4 border-primary/20 shadow-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex size-20 lg:size-24 items-center justify-center rounded-full bg-primary/10 text-2xl lg:text-3xl font-bold text-primary border-4 border-primary/20 shadow-lg">
                    {expert.initials}
                  </div>
                )}
                <span className={cn("absolute bottom-1 right-1 size-4 rounded-full border-2 border-card", availability.dot)} />
              </div>

              <div className="min-w-0 flex-1">
                {/* Badges row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                      <ShieldCheck className="size-3" />
                      {t("profile.assessedBadge")}
                    </span>
                    {badges && badges.length > 0 && (() => {
                      const limit = 3;
                      const visible = badgesExpanded ? badges : badges.slice(0, limit);
                      const hidden = badges.length - limit;
                      return (
                        <>
                          {visible.map((b) => {
                            const display = getBadgeDisplay(b.badge);
                            const IconComp = getBadgeIcon(b.badge, b.icon);
                            return (
                              <span
                                key={b._id}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                                  display.color
                                )}
                              >
                                {IconComp && <IconComp className="size-3" />}
                                {display.label}
                              </span>
                            );
                          })}
                          {!badgesExpanded && hidden > 0 && (
                            <button
                              type="button"
                              onClick={() => setBadgesExpanded(true)}
                              className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent transition-colors"
                            >
                              +{hidden}
                            </button>
                          )}
                          {badgesExpanded && badges.length > limit && (
                            <button
                              type="button"
                              onClick={() => setBadgesExpanded(false)}
                              className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent transition-colors"
                            >
                              −
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {isOwnProfile && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full size-8 shrink-0"
                      onClick={() => setSelfEditOpen(true)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </div>

                {/* Name */}
                <h1 className="text-2xl lg:text-3xl font-bold leading-tight">
                  {expert.name}
                </h1>
                {expert.designation && (
                  <p className="text-base text-muted-foreground mt-0.5">{expert.designation}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">{specialtyTagline}</p>
                {expert.organization && (
                  <p className="text-sm text-muted-foreground">{expert.organization}</p>
                )}

                {/* Meta row */}
                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {expert.city}
                  </span>
                  {expert.portfolio && (
                    <a
                      href={expert.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="size-3.5" />
                      Portfolio
                    </a>
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                      availability.color
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", availability.dot)} />
                    {availability.label}
                  </span>
                </div>

                {/* Quick stats */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>{expert.skills.length} {t("profile.assessedSkills")}</span>
                  <span>·</span>
                  <span>{expert.stats.sessionCount} {t("profile.sessions")}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    {expert.stats.rating.toFixed(1)}{" "}
                    <Star className="size-3 fill-yellow-400 text-yellow-400" />
                    ({expert.stats.reviewCount} {t("profile.reviews")})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Keyword ticker (shared) */}
          {tickerKeywords.length > 0 && (
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 pb-3 sm:pb-4 lg:pb-5 border-t border-border overflow-hidden">
              <div className="whitespace-nowrap animate-marquee-slow flex items-center gap-5 sm:gap-8">
                {[...tickerKeywords, ...tickerKeywords, ...tickerKeywords, ...tickerKeywords].map(
                  (kw, i) => (
                    <span
                      key={`${kw}-${i}`}
                      className="inline-flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground/60 shrink-0"
                    >
                      <span className="size-1 rounded-full bg-primary/40" />
                      {kw}
                    </span>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Mobile CTA strip (lg:hidden)                                  */}
      {/* ============================================================ */}
      <div className="mx-auto max-w-6xl px-4 lg:hidden -mt-2 mb-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 rounded-full text-[11px] whitespace-nowrap active:scale-95 transition-transform min-w-0"
            onClick={() => setConsultationOpen(true)}
          >
            <Calendar className="size-3.5 mr-1" />
            {t("profile.requestConsultation")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-full text-[11px] whitespace-nowrap active:scale-95 transition-transform min-w-0"
            onClick={() => setQuickQuestionOpen(true)}
          >
            <MessageCircle className="size-3.5 mr-1" />
            {t("profile.quickQuestion")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full size-8 shrink-0 active:scale-95 transition-transform"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: expert.name, url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          >
            <Share2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  2-column layout                                               */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-6xl px-4 pb-24 lg:pb-16 lg:px-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_280px]">

          {/* ---- Main Column ---- */}
          <div className="space-y-4 sm:space-y-6">
            {/* Mobile sectors horizontal scroll (lg:hidden) */}
            {expert.sectors.length > 0 && (
              <div className="lg:hidden -mx-4 px-4">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none no-scrollbar pb-1">
                  {expert.sectors.map((sector) => (
                    <span
                      key={sector}
                      className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] sm:text-[11px] font-medium text-foreground active:scale-95 transition-transform"
                    >
                      {sector}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* About */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">{t("profile.aboutTitle")}</h2>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-line break-words">
                {expert.bio}
              </p>
            </div>

            {/* LLP-Assessed Skills grid */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-1">{t("profile.skillsTitle")}</h2>
              <p className="text-xs text-muted-foreground mb-3 sm:mb-4">{t("profile.skillsSubtitle")}</p>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                {expert.skills.map((skill) => {
                  const levelConfig = SKILL_LEVEL_COLORS[skill.level] || SKILL_LEVEL_COLORS[1];
                  return (
                    <div
                      key={skill.name}
                      className={cn(
                        "rounded-xl border-2 p-3.5 sm:p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
                        levelConfig.border
                      )}
                    >
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <h3 className="text-sm font-semibold min-w-0">{skill.name}</h3>
                        <LevelBadge level={skill.level} />
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground line-clamp-3">
                        {skill.evidence}
                      </p>
                      {skill.verifiedAt && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-primary">
                          <CheckCircle className="size-3" />
                          Verified{" "}
                          {new Date(skill.verifiedAt).toLocaleDateString("en-GB", {
                            year: "numeric",
                            month: "short",
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Experience Highlights */}
            {expert.experiences.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t("profile.experienceTitle")}</h2>
                <div className="space-y-4">
                  {expert.experiences.map((exp, i) => (
                    <div key={`${exp.title}-${i}`} className="flex items-start gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                        <Briefcase className="size-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{exp.title}</h4>
                        {exp.company && (
                          <p className="text-xs font-medium text-muted-foreground">{exp.company}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                          {exp.duration && (
                            <span className="text-[11px] sm:text-xs text-muted-foreground/70">{exp.duration}</span>
                          )}
                          {exp.location && (
                            <span className="text-[11px] sm:text-xs text-muted-foreground/70">{exp.location}</span>
                          )}
                          {exp.workMode && (
                            <span className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              exp.workMode === "on-site" && "bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/30",
                              exp.workMode === "remote" && "bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/30",
                              exp.workMode === "hybrid" && "bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30",
                            )}>
                              {exp.workMode === "on-site" ? "On-site" : exp.workMode === "remote" ? "Remote" : "Hybrid"}
                            </span>
                          )}
                        </div>
                        {exp.scope && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {exp.scope}
                          </p>
                        )}
                        <span className="mt-2 inline-block rounded-xl bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary leading-relaxed">
                          {exp.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {expert.education && expert.education.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <GraduationCap className="size-5" />
                  {t("profile.education")}
                </h2>
                <div className="space-y-3">
                  {expert.education.map((edu: { degree: string; institution: string; fieldOfStudy?: string; year?: string }, i: number) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4">
                      <h3 className="font-semibold text-sm">{edu.degree}</h3>
                      <p className="text-sm text-muted-foreground">{edu.institution}</p>
                      {(edu.fieldOfStudy || edu.year) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {[edu.fieldOfStudy, edu.year].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {expert.projects && expert.projects.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FolderOpen className="size-5" />
                  {t("profile.projects")}
                </h2>
                <div className="space-y-3">
                  {expert.projects.map((proj: { name: string; client?: string; description?: string; duration?: string; outcome?: string }, i: number) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{proj.name}</h3>
                        {proj.duration && (
                          <span className="text-xs text-muted-foreground">{proj.duration}</span>
                        )}
                      </div>
                      {proj.client && (
                        <p className="text-xs text-muted-foreground mt-0.5">Client: {proj.client}</p>
                      )}
                      {proj.description && (
                        <p className="text-sm text-muted-foreground mt-2">{proj.description}</p>
                      )}
                      {proj.outcome && (
                        <p className="text-xs text-primary mt-1.5 font-medium">Outcome: {proj.outcome}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Ratings & Reviews */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t("profile.ratingsTitle")}</h2>
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <span className="text-3xl sm:text-4xl font-bold">{expert.stats.rating.toFixed(1)}</span>
                <div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-4",
                          i <= Math.round(expert.stats.rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {expert.stats.reviewCount} {t("profile.reviews")}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {expert.stats.sessionCount} {t("profile.sessions")} {t("profile.completed")}
              </div>
            </div>

            {/* Mobile Profile Highlights (lg:hidden) */}
            {(derivedCompanies.length > 0 || derivedLocations.length > 0 || expert.certifications.length > 0 || mergedSocialProfiles.length > 0 || (expert.languages && expert.languages.length > 0) || (expert.affiliations && expert.affiliations.length > 0)) && (
              <div className="lg:hidden rounded-2xl border border-border bg-card p-4 space-y-4">
                {derivedCompanies.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {t("profile.companiesWorked")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {derivedCompanies.map((name) => (
                        <span key={name} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px]">
                          <Briefcase className="size-3 text-muted-foreground" />
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {derivedLocations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {t("profile.countriesWorked")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {derivedLocations.map((item) => (
                        <span
                          key={item.location}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                            item.workMode === "on-site" && "bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/30",
                            item.workMode === "remote" && "bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/30",
                            item.workMode === "hybrid" && "bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30",
                            !item.workMode && "bg-primary/10 text-primary border-transparent",
                          )}
                        >
                          {item.location}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {mergedSocialProfiles.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {t("profile.socialProfiles")}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {mergedSocialProfiles.map((sp) => {
                        const social = getSocialIcon(sp.platform);
                        return (
                          <a
                            key={`m-${sp.platform}-${sp.url}`}
                            href={sp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={sp.platform}
                            className={cn(
                              "inline-flex items-center justify-center size-10 rounded-full border border-border text-muted-foreground transition-all active:scale-95 hover:border-transparent hover:shadow-md",
                              social ? social.color : "hover:text-primary"
                            )}
                          >
                            {social ? social.icon : <ExternalLink className="size-4" />}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
                {expert.certifications.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {t("profile.verifiedCerts")}
                    </h4>
                    <ul className="space-y-1.5">
                      {expert.certifications.map((cert) => (
                        <li key={cert.name} className="flex items-center gap-2 text-[11px]">
                          <CheckCircle className="size-3 text-primary shrink-0" />
                          {cert.name}
                          {cert.org && <span className="text-muted-foreground">({cert.org})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Languages (mobile) */}
                {expert.languages && expert.languages.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {t("profile.languages")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {expert.languages.map((lang: { name: string; proficiency?: string }, i: number) => {
                        const colors: Record<string, string> = {
                          native: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                          fluent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                          advanced: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                          intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                          basic: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                        };
                        const colorClass = lang.proficiency ? colors[lang.proficiency] || colors.basic : "bg-muted text-muted-foreground";
                        return (
                          <span key={i} className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", colorClass)}>
                            {lang.name}{lang.proficiency ? ` · ${lang.proficiency}` : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Affiliations (mobile) */}
                {expert.affiliations && expert.affiliations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {t("profile.affiliations")}
                    </h4>
                    <div className="space-y-2">
                      {expert.affiliations.map((aff: { name: string; role?: string; since?: string }, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <Building2 className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] font-medium">{aff.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {[aff.role, aff.since ? `Since ${aff.since}` : null].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Similar Experts horizontal scroll (lg:hidden) */}
            {similarExperts.length > 0 && (
              <div className="lg:hidden">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {t("profile.similarExperts")}
                </h4>
                <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
                  {similarExperts.map((sim) => (
                    <Link
                      key={sim._id}
                      href={`/experts/${sim.slug}`}
                      className="shrink-0 flex flex-col items-center gap-1.5 w-20 active:scale-95 transition-transform"
                    >
                      {sim.profilePhotoUrl ? (
                        <Image
                          src={sim.profilePhotoUrl}
                          alt={sim.name}
                          width={48}
                          height={48}
                          className="size-12 rounded-full object-cover border-2 border-background shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-xs font-bold border-2 border-background shadow-sm">
                          {sim.initials}
                        </div>
                      )}
                      <p className="text-[11px] font-medium text-center leading-tight line-clamp-2">{sim.name}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ---- Right Rail (desktop only) ---- */}
          <div className="hidden lg:block space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 sticky top-20">
              {/* Quick Question */}
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full mb-2"
                onClick={() => setQuickQuestionOpen(true)}
              >
                <MessageCircle className="size-3.5 mr-1.5" />
                {t("profile.quickQuestion")}
              </Button>

              {/* Request Consultation */}
              <Button
                size="sm"
                className="w-full rounded-full mb-2"
                onClick={() => setConsultationOpen(true)}
              >
                <Calendar className="size-3.5 mr-1.5" />
                {t("profile.requestConsultation")}
              </Button>

              {/* Share Profile */}
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full mb-4"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: expert.name,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
              >
                <Share2 className="size-3.5 mr-1.5" />
                {t("profile.shareProfile")}
              </Button>

              {/* Sectors */}
              {expert.sectors.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {t("profile.sectors")}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {expert.sectors.map((sector) => (
                      <span
                        key={sector}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                      >
                        {sector}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Experts */}
              {similarExperts.length > 0 && (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {t("profile.similarExperts")}
                  </h4>
                  <div className="space-y-3">
                    {similarExperts.map((sim) => (
                      <Link
                        key={sim._id}
                        href={`/experts/${sim.slug}`}
                        className="flex items-center gap-3 group"
                      >
                        {sim.profilePhotoUrl ? (
                          <Image
                            src={sim.profilePhotoUrl}
                            alt={sim.name}
                            width={32}
                            height={32}
                            className="size-8 rounded-full object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            {sim.initials}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">
                            {sim.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sim.designation}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              <Link
                href="/experts"
                className="mt-4 block text-center text-xs text-primary hover:underline"
              >
                {t("profile.viewAllExperts")}
              </Link>
            </div>

            {/* Profile Highlights card */}
            {(derivedCompanies.length > 0 || derivedLocations.length > 0 || expert.certifications.length > 0 || mergedSocialProfiles.length > 0) && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                {/* Companies worked with (derived from experiences + manual) */}
                {derivedCompanies.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {t("profile.companiesWorked")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {derivedCompanies.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px]"
                        >
                          <Briefcase className="size-3 text-muted-foreground" />
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Locations (derived from experiences + manual) */}
                {derivedLocations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {t("profile.countriesWorked")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {derivedLocations.map((item) => (
                        <span
                          key={item.location}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                            item.workMode === "on-site" && "bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/30",
                            item.workMode === "remote" && "bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/30",
                            item.workMode === "hybrid" && "bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30",
                            !item.workMode && "bg-primary/10 text-primary border-transparent",
                          )}
                        >
                          {item.location}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Profiles */}
                {mergedSocialProfiles.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {t("profile.socialProfiles")}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {mergedSocialProfiles.map((sp) => {
                        const social = getSocialIcon(sp.platform);
                        return (
                          <a
                            key={`${sp.platform}-${sp.url}`}
                            href={sp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={sp.platform}
                            className={cn(
                              "inline-flex items-center justify-center size-9 rounded-full border border-border text-muted-foreground transition-all hover:scale-110 hover:border-transparent hover:shadow-md",
                              social ? social.color : "hover:text-primary"
                            )}
                          >
                            {social ? social.icon : <ExternalLink className="size-4" />}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {expert.certifications.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {t("profile.verifiedCerts")}
                    </h4>
                    <ul className="space-y-1.5">
                      {expert.certifications.map((cert) => (
                        <li
                          key={cert.name}
                          className="flex items-center gap-2 text-[11px]"
                        >
                          <CheckCircle className="size-3 text-primary shrink-0" />
                          {cert.name}
                          {cert.org && (
                            <span className="text-muted-foreground">({cert.org})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Languages */}
            {expert.languages && expert.languages.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">{t("profile.languages")}</h3>
                <div className="flex flex-wrap gap-2">
                  {expert.languages.map((lang: { name: string; proficiency?: string }, i: number) => {
                    const colors: Record<string, string> = {
                      native: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                      fluent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      advanced: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                      intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                      basic: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                    };
                    const colorClass = lang.proficiency ? colors[lang.proficiency] || colors.basic : "bg-muted text-muted-foreground";
                    return (
                      <span key={i} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", colorClass)}>
                        {lang.name}{lang.proficiency ? ` · ${lang.proficiency}` : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Affiliations */}
            {expert.affiliations && expert.affiliations.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">{t("profile.affiliations")}</h3>
                <div className="space-y-2.5">
                  {expert.affiliations.map((aff: { name: string; role?: string; since?: string }, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <Building2 className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{aff.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[aff.role, aff.since ? `Since ${aff.since}` : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick question dialog */}
      <QuickQuestionDialog
        expertId={expert._id}
        expertName={expert.name}
        open={quickQuestionOpen}
        onOpenChange={setQuickQuestionOpen}
      />

      {/* Consultation dialog */}
      <ConsultationRequestDialog
        open={consultationOpen}
        onOpenChange={setConsultationOpen}
        expertId={expert._id}
        expertName={expert.name}
      />

      {/* Self-edit sheet (own profile only) */}
      {isOwnProfile && user?.id && (
        <ExpertSelfEditSheet
          open={selfEditOpen}
          onOpenChange={setSelfEditOpen}
          expertId={expert._id}
          clerkId={user.id}
        />
      )}

      <HomepageFooter />
    </div>
  );
}
