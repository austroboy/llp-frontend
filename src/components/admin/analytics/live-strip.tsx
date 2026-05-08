"use client"

import * as React from "react"

import { Marquee } from "@/components/ui/marquee"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type LiveEvent = {
  id: string
  event: string
  path?: string
  user?: string
  ts: string
}

export interface LiveStripProps {
  events: LiveEvent[]
  className?: string
}

const EVENT_COLOR: Record<string, string> = {
  $pageview: "var(--chart-2)",
  $pageleave: "var(--chart-2)",
  $autocapture: "var(--chart-3)",
  $identify: "var(--chart-4)",
  $exception: "var(--destructive)",
  chat_query_sent: "var(--chart-1)",
  chat_answer_received: "var(--chart-1)",
  chat_clarify_shown: "var(--chart-5)",
  chat_summarize_clicked: "var(--chart-5)",
  chat_export_clicked: "var(--chart-5)",
  chat_jump_back_clicked: "var(--chart-1)",
  signup_completed: "var(--chart-3)",
  doc_viewed: "var(--chart-4)",
  cv_pdf_downloaded: "var(--chart-4)",
  expert_profile_viewed: "var(--chart-4)",
  paywall_shown: "var(--destructive)",
}

const FALLBACK_COLOR = "var(--chart-2)"

const LABEL_CLS =
  "font-jetbrains uppercase text-[11px] tracking-[0.16em] text-muted-foreground"

function relativeTime(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return "—"
  const diff = Math.max(0, Math.floor((now - t) / 1000))
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function truncate(text: string, max = 32): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

interface EventChipProps {
  event: LiveEvent
}

function EventChip({ event }: EventChipProps) {
  const color = EVENT_COLOR[event.event] ?? FALLBACK_COLOR
  const tail = event.path ?? event.user ?? ""

  return (
    <Card className="flex flex-row items-center gap-3 rounded-md border bg-card/80 px-3 py-2 shadow-none transition-colors duration-200 ease-out hover:border-primary">
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="font-jetbrains text-xs text-foreground">
        {event.event}
      </span>
      {tail ? (
        <span className={cn(LABEL_CLS, "max-w-[180px] truncate normal-case")}>
          {truncate(tail)}
        </span>
      ) : null}
      <span className={cn(LABEL_CLS, "tabular-nums")}>
        {relativeTime(event.ts)}
      </span>
    </Card>
  )
}

export function LiveStrip({ events, className }: LiveStripProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border bg-card/80 backdrop-blur-sm",
        "transition-colors duration-300 hover:border-foreground/30",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in oklab, var(--chart-2) 8%, transparent),transparent_55%)]"
      />
      <div className="relative z-[1] flex items-center gap-3 border-b border-border/60 bg-background/40 px-4 py-2">
        <span className="relative inline-flex h-2 w-2">
          <span
            aria-hidden
            className="absolute inline-flex h-full w-full animate-ping rounded-full"
            style={{ backgroundColor: "var(--chart-2)", opacity: 0.6 }}
          />
          <span
            aria-hidden
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--chart-2)" }}
          />
        </span>
        <span className="font-jetbrains uppercase text-[10px] tracking-[0.18em] text-muted-foreground">
          Live event stream
        </span>
        <span className="ml-auto font-jetbrains tabular-nums text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {events.length} recent
        </span>
      </div>
      <div className="relative z-[1]">
        <Marquee pauseOnHover className="[--duration:40s] [--gap:0.75rem] py-3">
          {events.map((e) => (
            <EventChip key={e.id} event={e} />
          ))}
        </Marquee>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-card to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-card to-transparent"
        />
      </div>
    </div>
  );
}
