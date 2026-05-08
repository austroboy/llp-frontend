"use client"

import * as React from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { PanelCard } from "@/components/admin/analytics/_panel-card"

interface ApiTopic {
  topic: string
  count: number
  examples: string[]
}

interface ApiResponse {
  topics?: ApiTopic[]
  computed_at?: string | null
  window_days?: number | null
  stale?: boolean
  error?: string
}

const STALE_HOURS = 48
const NUMBER = new Intl.NumberFormat("en-US")
const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

/**
 * Top Search Topics panel (W7). Reads `/api/admin/analytics/topics`
 * for the latest cached cluster and POSTs to
 * `/api/admin/analytics/topic-cluster` to refresh.
 *
 * Empty state when the cache row is older than 48 h or missing —
 * the panel exposes a "Refresh now" button so the admin can run the
 * job on demand. Gemini failures never break the panel surface.
 */
export function TopicCloud({ className }: { className?: string }) {
  const [topics, setTopics] = React.useState<ApiTopic[]>([])
  const [computedAt, setComputedAt] = React.useState<string | null>(null)
  const [stale, setStale] = React.useState(true)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchTopics = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/analytics/topics", {
        cache: "no-store",
      })
      const json = (await res.json()) as ApiResponse
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }
      setTopics(json.topics ?? [])
      setComputedAt(json.computed_at ?? null)
      setStale(Boolean(json.stale))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "load failed")
      setTopics([])
      setComputedAt(null)
      setStale(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshTopics = React.useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/analytics/topic-cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windowDays: 7 }),
      })
      const json = (await res.json()) as ApiResponse
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }
      setTopics(json.topics ?? [])
      setComputedAt(json.computed_at ?? null)
      setStale(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "refresh failed")
    } finally {
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void fetchTopics()
  }, [fetchTopics])

  const peak = topics.reduce((m, t) => (t.count > m ? t.count : m), 0)
  const reduced = useReducedMotion()

  return (
    <PanelCard
      title="Top search topics"
      description={
        computedAt
          ? `Last refreshed ${formatRelative(computedAt)}`
          : "Never refreshed"
      }
      className={className}
      variant="ambient"
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() => void refreshTopics()}
          disabled={refreshing || loading}
          className="gap-2"
          aria-label="Refresh topics"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="font-jetbrains uppercase text-[10px] tracking-[0.14em]">
            Refresh
          </span>
        </Button>
      }
    >
      {loading ? (
        <Skeleton className="h-[180px] w-full rounded-lg" />
      ) : error ? (
        <div className="font-jetbrains text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {error.includes("failed") ? error : `Refresh failed: ${error}`}
        </div>
      ) : topics.length === 0 ? (
        <div className="font-jetbrains text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          No topic cache yet — click refresh to cluster the last 7 days.
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {topics.map((t, i) => {
            const ratio = peak > 0 ? t.count / peak : 0
            const fontSize = 13 + Math.round(ratio * 14) // 13 → 27 px
            const opacity = 0.6 + ratio * 0.4
            return (
              <motion.li
                key={`${t.topic}-${i}`}
                initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity, scale: 1 }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.025,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ scale: 1.04 }}
                className="group rounded-md border bg-background/60 px-3 py-1.5 transition-colors duration-200 hover:border-foreground/40 hover:bg-background/90"
                title={t.examples.slice(0, 3).join(" · ")}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-fraunces tracking-tight text-foreground"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {t.topic}
                  </span>
                  <span className="font-jetbrains text-[10px] tabular-nums text-muted-foreground">
                    {NUMBER.format(t.count)}
                  </span>
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}
      {stale && topics.length > 0 ? (
        <p className="mt-3 font-jetbrains text-[10px] uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
          Stale cache (&gt;{STALE_HOURS}h). Refresh recommended.
        </p>
      ) : null}
    </PanelCard>
  )
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return "—"
  const diffMs = then - Date.now()
  const diffMins = Math.round(diffMs / 60_000)
  const absMins = Math.abs(diffMins)
  if (absMins < 60) return RELATIVE.format(diffMins, "minute")
  const diffHrs = Math.round(diffMs / 3_600_000)
  const absHrs = Math.abs(diffHrs)
  if (absHrs < 48) return RELATIVE.format(diffHrs, "hour")
  const diffDays = Math.round(diffMs / 86_400_000)
  return RELATIVE.format(diffDays, "day")
}
