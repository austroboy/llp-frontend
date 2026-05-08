"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { PanelCard } from "@/components/admin/analytics/_panel-card";

export interface CalendarHeatmapDatum {
  dow: number;
  hour: number;
  value: number;
}

export interface CalendarHeatmapProps {
  title: string;
  description?: string;
  data: CalendarHeatmapDatum[];
  className?: string;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const FULL = new Intl.NumberFormat("en-US");

function dowIndex(dow: number): number {
  return Math.max(0, Math.min(6, dow - 1));
}

export function CalendarHeatmap({
  title,
  description,
  data,
  className,
}: CalendarHeatmapProps) {
  const reduced = useReducedMotion();

  const { matrix, max } = React.useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => 0),
    );
    let m = 0;
    for (const d of data) {
      const r = dowIndex(d.dow);
      const c = Math.max(0, Math.min(23, d.hour));
      grid[r][c] = d.value;
      if (d.value > m) m = d.value;
    }
    return { matrix: grid, max: m };
  }, [data]);

  return (
    <PanelCard
      title={title}
      description={description}
      className={className}
      variant="ambient"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[460px]">
          <div className="flex">
            <div className="flex w-10 shrink-0 flex-col gap-1 pr-2">
              {DAY_LABELS.map((d) => (
                <span
                  key={d}
                  className="flex h-5 items-center justify-end font-jetbrains uppercase text-[9px] tracking-[0.14em] text-muted-foreground"
                >
                  {d}
                </span>
              ))}
            </div>
            <div
              className="grid flex-1 gap-[3px]"
              style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
            >
              {matrix.flatMap((row, r) =>
                row.map((value, h) => {
                  const ratio = max > 0 ? value / max : 0;
                  const opacity = value === 0 ? 0.06 : 0.18 + ratio * 0.82;
                  const delay = reduced ? 0 : (r + h) * 0.005;
                  return (
                    <HoverCard
                      key={`${r}-${h}`}
                      openDelay={80}
                      closeDelay={40}
                    >
                      <HoverCardTrigger asChild>
                        <motion.div
                          initial={
                            reduced ? false : { opacity: 0, scale: 0.6 }
                          }
                          animate={{ opacity, scale: 1 }}
                          transition={{
                            duration: 0.4,
                            delay,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          whileHover={{ scale: 1.15 }}
                          className="h-5 w-full rounded-sm cursor-default"
                          style={{
                            backgroundColor: "var(--p-blue)",
                          }}
                          aria-label={`${DAY_LABELS[r]} ${h}:00 — ${value} hits`}
                        />
                      </HoverCardTrigger>
                      <HoverCardContent
                        side="top"
                        className="w-auto p-2 font-jetbrains text-xs tabular-nums"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="uppercase text-[10px] tracking-[0.14em] text-muted-foreground">
                            {DAY_LABELS[r]} ·{" "}
                            {String(h).padStart(2, "0")}:00
                          </span>
                          <span className="text-foreground">
                            {FULL.format(value)} hits
                          </span>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                }),
              )}
            </div>
          </div>
          <div
            className="ml-10 mt-2 grid"
            style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
          >
            {HOURS.map((h) => (
              <span
                key={h}
                className={cn(
                  "text-center font-jetbrains uppercase text-[9px] tracking-[0.12em] text-muted-foreground",
                  h % 3 !== 0 && "opacity-0",
                )}
              >
                {String(h).padStart(2, "0")}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <span className="font-jetbrains uppercase text-[9px] tracking-[0.16em] text-muted-foreground">
              Less
            </span>
            <div className="flex gap-[3px]">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((o) => (
                <div
                  key={o}
                  className="h-3 w-4 rounded-sm"
                  style={{
                    backgroundColor: "var(--p-blue)",
                    opacity: o,
                  }}
                />
              ))}
            </div>
            <span className="font-jetbrains uppercase text-[9px] tracking-[0.16em] text-muted-foreground">
              More
            </span>
          </div>
        </div>
      </div>
    </PanelCard>
  );
}
