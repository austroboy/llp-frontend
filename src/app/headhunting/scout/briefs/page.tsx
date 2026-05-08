"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ArrowRight, MapPin, Crosshair, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";

export default function ScoutBriefsPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const userId = user?.id;

  const briefs = useQuery(
    api.headhunting.scouts.getMyBriefs,
    userId ? { scoutId: userId } : "skip"
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crosshair className="size-6 text-primary" />
          {t("scout.briefs.title")}
        </h1>
      </div>

      {/* Nav */}
      <div className="flex gap-2">
        <Link href="/headhunting/scout">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">{t("scout.nav.dashboard")}</Badge>
        </Link>
        <Badge variant="default" className="px-3 py-1">{t("scout.nav.briefs")}</Badge>
        <Link href="/headhunting/scout/submissions">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">{t("scout.nav.submissions")}</Badge>
        </Link>
        <Link href="/headhunting/scout/earnings">
          <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">Earnings</Badge>
        </Link>
      </div>

      {!briefs ? (
        <div className="py-12 text-center text-sm text-muted-foreground">{t("admin.loading")}</div>
      ) : briefs.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">{t("scout.briefs.empty")}</div>
      ) : (
        <div className="space-y-3">
          {briefs.map((brief) => {
            // Determine link based on source type
            const href =
              brief.source === "blueprint"
                ? `/headhunting/scout/briefs/new/${brief._id}`
                : `/headhunting/scout/briefs/${brief._id}`;

            return (
              <Link
                key={brief._id}
                href={href}
                className="block rounded-lg border border-border bg-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{brief.blueprint?.title ?? "—"}</h3>
                      {brief.source === "blueprint" && (
                        <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600">New</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {brief.blueprint?.function && <span>{brief.blueprint.function}</span>}
                      {brief.blueprint?.seniority && <Badge variant="outline" className="text-[10px]">{brief.blueprint.seniority}</Badge>}
                      {brief.blueprint?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />{brief.blueprint.location}
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {t(`admin.headhunting.blueprint.compensationMode.${brief.blueprint?.compensationMode ?? "revenue_share"}`)}
                      </Badge>
                    </div>
                    {brief.blueprint?.mustHaves && brief.blueprint.mustHaves.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {brief.blueprint.mustHaves.slice(0, 4).map((mh, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] font-normal">{mh}</Badge>
                        ))}
                        {brief.blueprint.mustHaves.length > 4 && (
                          <Badge variant="secondary" className="text-[10px]">+{brief.blueprint.mustHaves.length - 4}</Badge>
                        )}
                      </div>
                    )}
                    {/* Slot usage indicator */}
                    {brief.slotsAllocated != null && (
                      <div className="flex items-center gap-2 mt-2">
                        <BarChart3 className="size-3 text-muted-foreground" />
                        {(brief.slotsUsed ?? 0) >= brief.slotsAllocated ? (
                          <Badge variant="destructive" className="text-[10px]">Full</Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {brief.slotsUsed ?? 0}/{brief.slotsAllocated} slots used
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 text-xs shrink-0">
                    {t("scout.briefs.viewBrief")}
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
