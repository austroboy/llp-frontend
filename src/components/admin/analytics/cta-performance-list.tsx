"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"

import { PanelCard } from "@/components/admin/analytics/_panel-card"

export interface CTARow {
  /** $autocapture el_text — primary CTA copy. */
  text: string
  /** Path the click happened on. */
  path: string
  /** Click count in window. */
  clicks: number
}

export interface CTAPerformanceListProps {
  title: string
  description?: string
  rows: CTARow[]
  /** Max rows rendered after CTA filtering. Default 12. */
  max?: number
  className?: string
}

const NUMBER = new Intl.NumberFormat("en-US")

/**
 * CTA-keyword set used to filter `topClickedElements` rows when
 * autocapture has not been wired with a `data-cta-id` attribute.
 *
 * The plan asked for a `data-cta-id` filter, but PostHog autocapture
 * does not always surface custom data-* attributes — it does always
 * surface `$el_text`. This filter is a best-effort heuristic over
 * the visible button copy; it is intentionally narrow (English copy
 * for known CTAs) so it does not over-match incidental clicks.
 *
 * Add new CTAs here as products ship. Lowercase substring match
 * keeps the test cheap.
 */
const CTA_KEYWORDS: ReadonlyArray<string> = [
  "sign up",
  "sign-up",
  "signup",
  "sign in",
  "log in",
  "login",
  "continue",
  "get started",
  "upgrade",
  "subscribe",
  "talk to",
  "book ",
  "apply",
  "send",
  "ask ",
  "ask a",
  "search",
  "consult",
  "download",
  "export",
  "summarize",
  "summarise",
  "next",
]

function isCTA(text: string): boolean {
  const lower = text.toLowerCase()
  return CTA_KEYWORDS.some((kw) => lower.includes(kw))
}

export function CTAPerformanceList({
  title,
  description,
  rows,
  max = 12,
  className,
}: CTAPerformanceListProps) {
  const filtered = React.useMemo(() => {
    const seen = new Set<string>()
    const out: CTARow[] = []
    for (const r of rows) {
      const text = (r.text ?? "").trim()
      if (text.length === 0) continue
      if (!isCTA(text)) continue
      const key = `${text.toLowerCase()}|${r.path}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ text, path: r.path, clicks: r.clicks })
      if (out.length >= max) break
    }
    return out
  }, [rows, max])

  const peak = filtered.reduce((m, r) => (r.clicks > m ? r.clicks : m), 0)
  const reduced = useReducedMotion()

  return (
    <PanelCard
      title={title}
      description={description}
      className={className}
    >
      {filtered.length === 0 ? (
        <div className="font-jetbrains text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          No CTA clicks recorded
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {filtered.map((r, i) => {
            const pct = peak > 0 ? (r.clicks / peak) * 100 : 0
            return (
              <motion.li
                key={`${r.text}-${r.path}-${i}`}
                initial={reduced ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04, ease: "easeOut" }}
                className="group"
              >
                <div className="flex items-center gap-3 rounded-md py-1.5 px-3 transition-colors duration-200 hover:bg-muted/50">
                  <div className="relative flex-1 min-w-0">
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 rounded-sm bg-primary/10"
                      initial={reduced ? false : { width: 0 }}
                      animate={{ width: `${Math.max(pct, 1.5)}%` }}
                      transition={{ duration: 0.7, delay: 0.1 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 rounded-sm bg-primary/30"
                      initial={reduced ? false : { width: 0 }}
                      animate={{ width: `${Math.max(pct * 0.5, 1)}%` }}
                      transition={{ duration: 0.7, delay: 0.15 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <div className="relative flex flex-col gap-0.5 py-0.5">
                      <span className="truncate text-sm text-foreground">{r.text}</span>
                      <span className="truncate font-jetbrains text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {r.path}
                      </span>
                    </div>
                  </div>
                  <span className="font-jetbrains shrink-0 text-right text-sm tabular-nums text-foreground">
                    {NUMBER.format(r.clicks)}
                  </span>
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}
    </PanelCard>
  )
}
