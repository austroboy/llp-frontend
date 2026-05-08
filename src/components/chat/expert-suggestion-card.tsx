"use client";

import Link from "next/link";
import { useLanguage } from "@/hooks/use-language";
import { UserCheck, Star, ArrowRight } from "lucide-react";

interface ExpertSuggestion {
  id: string;
  name: string;
  slug: string;
  designation: string;
  initials: string;
  topSkill: string;
  rating: number;
}

export function ExpertSuggestionCard({
  experts,
}: {
  experts: ExpertSuggestion[];
}) {
  const { t } = useLanguage();

  return (
    <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <UserCheck className="w-4 h-4 text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          {t("experts.handoff.title")}
        </span>
      </div>
      <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-3">
        {t("experts.handoff.desc")}
      </p>
      <div className="flex flex-wrap gap-2">
        {experts.map((expert) => (
          <Link
            key={expert.id}
            href={`/experts/${expert.slug}`}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg px-3 py-2 hover:shadow-sm transition"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-xs">
              {expert.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{expert.name}</div>
              <div className="text-[10px] text-slate-500 truncate">
                {expert.topSkill}
              </div>
            </div>
            {expert.rating > 0 && (
              <div className="flex items-center gap-0.5 text-[10px]">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                {expert.rating}
              </div>
            )}
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
