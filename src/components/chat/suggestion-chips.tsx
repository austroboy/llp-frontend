"use client";

import { useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { suggestions } from "@/lib/suggestions";
import { ScaleIcon, BriefcaseIcon, PlaneIcon, UsersIcon, BuildingIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestionChipsProps {
  onSuggestionClick: (text: string) => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  expatriate: PlaneIcon,
  hr: UsersIcon,
  licensing: BuildingIcon,
};

function ChipButton({
  icon: Icon,
  text,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="size-4 text-muted-foreground" />
      <span>{text}</span>
    </button>
  );
}

function useDragRow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);

  const setAnimPaused = (paused: boolean) => {
    if (animRef.current)
      animRef.current.style.animationPlayState = paused ? "paused" : "running";
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      isDragging.current = true;
      hasMoved.current = false;
      startX.current = e.clientX;
      scrollStart.current = el.scrollLeft;
      setAnimPaused(true);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const dx = e.clientX - startX.current;
      if (Math.abs(dx) > 3) hasMoved.current = true;
      containerRef.current.scrollLeft = scrollStart.current - dx;
    },
    onPointerUp: () => {
      isDragging.current = false;
      setAnimPaused(false);
    },
    onPointerLeave: () => {
      if (isDragging.current) {
        isDragging.current = false;
        setAnimPaused(false);
      }
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (hasMoved.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };

  return { containerRef, animRef, handlers };
}

type Tab = "legal" | "services";

export function SuggestionChips({ onSuggestionClick }: SuggestionChipsProps) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("legal");
  const row1Drag = useDragRow();
  const row2Drag = useDragRow();

  // Fetch live services from Convex for the Services tab
  const activeServices = useQuery(api.serviceProducts.getActive, {});

  // Build chip data based on active tab
  let chipItems: Array<{ id: string; text: string; icon: React.ComponentType<{ className?: string }> }> = [];

  if (activeTab === "legal") {
    chipItems = suggestions.map((s) => ({
      id: s.id,
      text: t(s.translationKey),
      icon: s.icon,
    }));
  } else if (activeServices) {
    chipItems = activeServices.map((s) => ({
      id: s._id,
      text: language === "bn" && s.titleBn ? s.titleBn : s.title,
      icon: categoryIcons[s.category] || BriefcaseIcon,
    }));
  }

  const mid = Math.ceil(chipItems.length / 2);
  const row1 = chipItems.slice(0, mid);
  const row2 = chipItems.slice(mid);

  // Scale animation duration by item count so both tabs scroll at the same pixel speed
  const baseSpeed = 25;
  const row1Duration = `${Math.max(baseSpeed, (row1.length / 3) * baseSpeed)}s`;
  const row2Duration = `${Math.max(baseSpeed, (row2.length / 3) * baseSpeed)}s`;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setActiveTab("legal")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            activeTab === "legal"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-emerald-300 dark:border-muted"
          )}
        >
          <ScaleIcon className="size-3.5" />
          {t("suggestion.tab.legal")}
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            activeTab === "services"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-emerald-300 dark:border-muted"
          )}
        >
          <BriefcaseIcon className="size-3.5" />
          {t("suggestion.tab.services")}
        </button>
      </div>

      {/* Chips */}
      <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex flex-col gap-3">
          {/* Row 1 */}
          <div
            ref={row1Drag.containerRef}
            className="flex gap-3 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none touch-pan-x"
            {...row1Drag.handlers}
          >
            <div
              ref={row1Drag.animRef}
              className="flex gap-3 animate-marquee-right"
              style={{ animationDuration: row1Duration }}
            >
              {[...row1, ...row1].map((s, i) => (
                <ChipButton
                  key={`r1-${activeTab}-${s.id}-${i}`}
                  icon={s.icon}
                  text={s.text}
                  onClick={() => onSuggestionClick(s.text)}
                />
              ))}
            </div>
          </div>

          {/* Row 2 */}
          {row2.length > 0 && (
            <div
              ref={row2Drag.containerRef}
              className="flex gap-3 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none touch-pan-x"
              {...row2Drag.handlers}
            >
              <div
                ref={row2Drag.animRef}
                className="flex gap-3 animate-marquee-left"
                style={{ animationDuration: row2Duration }}
              >
                {[...row2, ...row2].map((s, i) => (
                  <ChipButton
                    key={`r2-${activeTab}-${s.id}-${i}`}
                    icon={s.icon}
                    text={s.text}
                    onClick={() => onSuggestionClick(s.text)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
