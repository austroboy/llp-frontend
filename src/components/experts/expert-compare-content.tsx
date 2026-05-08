"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  Star,
  Users,
  MapPin,
  Calendar,
} from "lucide-react";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type AvailabilityStatus = "available" | "busy" | "on_leave";

interface Expert {
  _id: Id<"experts">;
  name: string;
  slug: string;
  initials: string;
  designation: string;
  organization: string;
  bio: string;
  photoId?: Id<"_storage">;
  sectors: string[];
  skills: Array<{ name: string; level: 1 | 2 | 3 | 4; evidence: string; verifiedAt?: number }>;
  certifications: Array<{ name: string; org?: string; year?: string }>;
  stats: { rating: number; reviewCount: number; sessionCount: number };
  availabilityStatus: AvailabilityStatus;
  isFeatured: boolean;
}

/* ------------------------------------------------------------------ */
/*  Availability config                                                 */
/* ------------------------------------------------------------------ */
const AVAILABILITY_CONFIG: Record<
  AvailabilityStatus,
  { label: string; color: string; dotClass: string; labelKey: string }
> = {
  available: {
    label: "Available",
    color: "text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
    labelKey: "experts.card.available",
  },
  busy: {
    label: "Busy",
    color: "text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
    labelKey: "experts.card.busy",
  },
  on_leave: {
    label: "On Leave",
    color: "text-red-600 dark:text-red-400",
    dotClass: "bg-red-500",
    labelKey: "experts.card.onLeave",
  },
};

/* ------------------------------------------------------------------ */
/*  ExpertPhoto — internal helper that queries photo URL               */
/* ------------------------------------------------------------------ */
function ExpertPhoto({
  expert,
  className,
}: {
  expert: Expert;
  className?: string;
}) {
  const photoUrl = useQuery(
    api.experts.getPhotoUrl,
    expert.photoId ? { photoId: expert.photoId } : "skip"
  );

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={expert.name}
        className={cn("rounded-2xl object-cover", className ?? "size-16")}
      />
    );
  }

  return (
    <div className={cn("flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/90 to-primary/80 text-white font-semibold text-lg shrink-0", className ?? "size-16")}>
      {expert.initials}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SkillDots — filled/empty dots representing level 1-4               */
/* ------------------------------------------------------------------ */
function SkillDots({ level }: { level: 1 | 2 | 3 | 4 }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block size-2.5 rounded-full",
            i < level ? "bg-primary" : "bg-muted"
          )}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Compare Card — stacked layout for each expert               */
/* ------------------------------------------------------------------ */
function MobileCompareCard({ expert, allSkillNames, t }: { expert: Expert; allSkillNames: string[]; t: (key: string) => string }) {
  const avail = AVAILABILITY_CONFIG[expert.availabilityStatus] || AVAILABILITY_CONFIG.available;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3 flex items-center gap-3">
        <ExpertPhoto expert={expert} className="size-14" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/experts/${expert.slug}`}
            className="font-semibold text-sm hover:text-primary transition-colors leading-tight"
          >
            {expert.name}
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">{expert.designation}</p>
          <p className="text-[11px] text-muted-foreground/70">{expert.organization}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn("size-2 rounded-full", avail.dotClass)} />
            <span className={cn("text-[11px] font-medium", avail.color)}>{t(avail.labelKey)}</span>
          </div>
        </div>
        {expert.isFeatured && (
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white shrink-0">
            {t("experts.card.featured")}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center divide-x divide-border border-t border-border bg-muted/30">
        <div className="flex-1 text-center py-2.5">
          <div className="flex items-center justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "size-3",
                  i < Math.round(expert.stats.rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                )}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {expert.stats.rating.toFixed(1)} · {expert.stats.reviewCount} {t("experts.compare.reviews")}
          </p>
        </div>
        <div className="flex-1 text-center py-2.5">
          <p className="text-sm font-semibold">{expert.stats.sessionCount}</p>
          <p className="text-[10px] text-muted-foreground">{t("experts.compare.sessions")}</p>
        </div>
      </div>

      {/* Sectors */}
      {expert.sectors.length > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{t("experts.compare.sectors")}</p>
          <div className="flex flex-wrap gap-1">
            {expert.sectors.map((sector) => (
              <span key={sector} className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary/70">
                {sector}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {allSkillNames.length > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("experts.compare.skills")}</p>
          <div className="space-y-1.5">
            {allSkillNames.map((skillName) => {
              const skill = expert.skills.find((s) => s.name === skillName);
              return (
                <div key={skillName} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate mr-2">{skillName}</span>
                  {skill ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <SkillDots level={skill.level} />
                      <span className="text-[10px] text-muted-foreground">L{skill.level}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/40 shrink-0">{t("experts.compare.notApplicable")}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Certifications */}
      {expert.certifications.length > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{t("experts.compare.certifications")}</p>
          <ul className="space-y-1">
            {expert.certifications.map((cert, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-foreground/80">{cert.name}</span>
                {(cert.org || cert.year) && (
                  <span className="text-muted-foreground"> · {[cert.org, cert.year].filter(Boolean).join(" · ")}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <div className="p-4 pt-3 border-t border-border">
        <Button asChild size="sm" className="rounded-full w-full">
          <Link href={`/experts/${expert.slug}`}>
            <Calendar className="size-3.5 mr-1.5" />
            {t("experts.compare.requestConsultation")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row label component for left-side labels (desktop table)           */
/* ------------------------------------------------------------------ */
function RowLabel({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        "sticky left-0 z-10 flex items-start px-3 py-4 bg-muted/30 border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[100px] sm:min-w-[120px]",
        className
      )}
    >
      {label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CompareTable — desktop table + mobile cards                        */
/* ------------------------------------------------------------------ */
function CompareTable({ experts }: { experts: Expert[] }) {
  const { t } = useLanguage();

  const allSkillNames = Array.from(
    new Set(experts.flatMap((e) => e.skills.map((s) => s.name)))
  ).sort();

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-4 sm:hidden">
        {experts.map((expert) => (
          <MobileCompareCard key={expert._id} expert={expert} allSkillNames={allSkillNames} t={t} />
        ))}
      </div>

      {/* Desktop: horizontal table */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-card px-3 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left border-r border-border min-w-[120px]">
                {t("experts.compare.identity")}
              </th>
              {experts.map((expert) => (
                <td key={expert._id} className="px-4 py-4 text-center border-r border-border last:border-r-0 min-w-[160px]">
                  <div className="flex flex-col items-center gap-2">
                    <ExpertPhoto expert={expert} />
                    <Link
                      href={`/experts/${expert.slug}`}
                      className="font-semibold text-sm hover:text-primary transition-colors text-center leading-tight"
                    >
                      {expert.name}
                    </Link>
                    <div className="text-xs text-muted-foreground text-center leading-tight">
                      {expert.designation}
                    </div>
                    <div className="text-[11px] text-muted-foreground/70 text-center">
                      {expert.organization}
                    </div>
                    {expert.isFeatured && (
                      <span className="inline-block rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {t("experts.card.featured")}
                      </span>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Availability */}
            <tr className="border-b border-border">
              <td className="sticky left-0 z-10 bg-card px-3 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-r border-border">
                {t("experts.compare.availability")}
              </td>
              {experts.map((expert) => {
                const avail = AVAILABILITY_CONFIG[expert.availabilityStatus] || AVAILABILITY_CONFIG.available;
                return (
                  <td key={expert._id} className="px-4 py-4 text-center border-r border-border last:border-r-0">
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      <span className={cn("size-2 rounded-full", avail.dotClass)} />
                      <span className={cn("text-xs font-medium", avail.color)}>{t(avail.labelKey)}</span>
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Stats */}
            <tr className="border-b border-border bg-muted/10">
              <td className="sticky left-0 z-10 bg-card px-3 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-r border-border">
                {t("experts.compare.stats")}
              </td>
              {experts.map((expert) => (
                <td key={expert._id} className="px-4 py-4 text-center border-r border-border last:border-r-0">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "size-3",
                            i < Math.round(expert.stats.rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {expert.stats.rating.toFixed(1)} · {expert.stats.reviewCount} {t("experts.compare.reviews")}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {expert.stats.sessionCount} {t("experts.compare.sessions")}
                    </span>
                  </div>
                </td>
              ))}
            </tr>

            {/* Sectors */}
            <tr className="border-b border-border">
              <td className="sticky left-0 z-10 bg-card px-3 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-r border-border">
                {t("experts.compare.sectors")}
              </td>
              {experts.map((expert) => (
                <td key={expert._id} className="px-4 py-4 text-center align-top border-r border-border last:border-r-0">
                  {expert.sectors.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {expert.sectors.map((sector) => (
                        <span key={sector} className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary/70">
                          {sector}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("experts.compare.notApplicable")}</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Skills header */}
            {allSkillNames.length > 0 && (
              <tr className="border-b border-border bg-muted/20">
                <td colSpan={experts.length + 1} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("experts.compare.skills")}
                </td>
              </tr>
            )}

            {/* Skill rows */}
            {allSkillNames.map((skillName, skillIdx) => (
              <tr key={skillName} className={cn("border-b border-border", skillIdx % 2 === 1 && "bg-muted/5")}>
                <td className="sticky left-0 z-10 bg-inherit px-3 py-3 text-xs text-muted-foreground border-r border-border max-w-[140px] truncate">
                  {skillName}
                </td>
                {experts.map((expert) => {
                  const skill = expert.skills.find((s) => s.name === skillName);
                  return (
                    <td key={expert._id} className="px-4 py-3 text-center border-r border-border last:border-r-0">
                      {skill ? (
                        <div className="flex flex-col items-center gap-1">
                          <SkillDots level={skill.level} />
                          <span className="text-[10px] text-muted-foreground">L{skill.level}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">{t("experts.compare.notApplicable")}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Certifications */}
            <tr className="border-b border-border">
              <td className="sticky left-0 z-10 bg-card px-3 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-r border-border">
                {t("experts.compare.certifications")}
              </td>
              {experts.map((expert) => (
                <td key={expert._id} className="px-4 py-4 align-top border-r border-border last:border-r-0">
                  {expert.certifications.length > 0 ? (
                    <ul className="space-y-1.5">
                      {expert.certifications.map((cert, i) => (
                        <li key={i} className="text-[11px] text-center">
                          <div className="font-medium text-foreground/80 leading-snug">{cert.name}</div>
                          {(cert.org || cert.year) && (
                            <div className="text-muted-foreground">{[cert.org, cert.year].filter(Boolean).join(" · ")}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground">{t("experts.compare.notApplicable")}</div>
                  )}
                </td>
              ))}
            </tr>

            {/* Action row */}
            <tr>
              <td className="sticky left-0 z-10 bg-card px-3 py-4 border-r border-border" />
              {experts.map((expert) => (
                <td key={expert._id} className="px-4 py-4 text-center border-r border-border last:border-r-0">
                  <Button asChild size="sm" className="rounded-full w-full">
                    <Link href={`/experts/${expert.slug}`}>
                      {t("experts.compare.requestConsultation")}
                    </Link>
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function CompareSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card animate-pulse">
      <div className="p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-8 w-28 rounded bg-muted shrink-0" />
            <div className="h-8 flex-1 rounded bg-muted" />
            <div className="h-8 flex-1 rounded bg-muted" />
            <div className="h-8 flex-1 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inner component (uses useSearchParams, must be in Suspense)        */
/* ------------------------------------------------------------------ */
function ComparePageInner() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  const rawIds = searchParams.get("ids") ?? "";
  const parsedIds = rawIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean) as Id<"experts">[];

  const experts = useQuery(
    api.experts.getByIds,
    parsedIds.length >= 2 ? { ids: parsedIds } : "skip"
  );

  const isLoading = parsedIds.length >= 2 && experts === undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteTopNav />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-6 lg:px-6 lg:pt-24">
          <Link
            href="/experts"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 py-1"
          >
            <ArrowLeft className="size-4" />
            {t("experts.compare.back")}
          </Link>

          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("experts.compare.title")}
          </h1>
          {parsedIds.length >= 2 && (
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              {parsedIds.length}{" "}
              {parsedIds.length === 1
                ? t("experts.compare.identity")
                : t("experts.hero.metric1l")}
            </p>
          )}
        </div>

        <section className="mx-auto max-w-6xl px-4 pb-20 lg:px-6">
          {parsedIds.length < 2 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 sm:p-16 text-center">
              <Users className="size-10 sm:size-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium text-base sm:text-lg">
                {t("experts.compare.noEnough")}
              </p>
              <Button variant="outline" size="sm" className="rounded-full mt-6" asChild>
                <Link href="/experts">
                  <ArrowLeft className="size-4 mr-1.5" />
                  {t("experts.compare.back")}
                </Link>
              </Button>
            </div>
          ) : isLoading ? (
            <CompareSkeleton />
          ) : !experts || experts.length < 2 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 sm:p-16 text-center">
              <Users className="size-10 sm:size-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium">
                {t("experts.compare.noEnough")}
              </p>
              <Button variant="outline" size="sm" className="rounded-full mt-6" asChild>
                <Link href="/experts">
                  <ArrowLeft className="size-4 mr-1.5" />
                  {t("experts.compare.back")}
                </Link>
              </Button>
            </div>
          ) : (
            <CompareTable experts={experts as Expert[]} />
          )}
        </section>
      </main>

      <HomepageFooter />
    </div>
  );
}

/* ================================================================== */
/*  Exported component — wraps inner in Suspense (for useSearchParams) */
/* ================================================================== */
export function ExpertCompareContent() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-background">
          <SiteTopNav />
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 pt-20 pb-6 lg:px-6 lg:pt-24">
              <div className="h-4 w-32 rounded bg-muted animate-pulse mb-6" />
              <div className="h-8 w-64 rounded bg-muted animate-pulse" />
            </div>
            <div className="mx-auto max-w-6xl px-4 pb-20 lg:px-6">
              <CompareSkeleton />
            </div>
          </main>
          <HomepageFooter />
        </div>
      }
    >
      <ComparePageInner />
    </Suspense>
  );
}
