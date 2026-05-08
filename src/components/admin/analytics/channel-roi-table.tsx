"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { PanelCard } from "@/components/admin/analytics/_panel-card"

export interface ChannelROIDatum {
  utm_source: string
  sessions: number
  signups: number
  activated: number
}

export interface ChannelROITableProps {
  title: string
  description?: string
  data: ChannelROIDatum[]
  className?: string
}

/**
 * Whitelist of well-known channels — every row is rendered even when
 * the channel produced zero sessions in the window, so the table acts
 * as a UTM scaffolding cue for marketing. Unknown sources fall back
 * into a single "Other" row at the bottom.
 *
 * Direct = no `$utm_source` set. Channel ROI is NOT revenue — that
 * lives in the Tier-6 Revenue placeholder tab.
 */
const KNOWN_SOURCES: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: "whatsapp", label: "WhatsApp" },
  { slug: "linkedin", label: "LinkedIn" },
  { slug: "facebook", label: "Facebook" },
  { slug: "instagram", label: "Instagram" },
  { slug: "email", label: "Email" },
  { slug: "referral", label: "Referral" },
  { slug: "google", label: "Google" },
  { slug: "direct", label: "Direct" },
]

const NUMBER = new Intl.NumberFormat("en-US")

const HEAD_CLS =
  "font-jetbrains uppercase text-[11px] tracking-[0.16em] text-muted-foreground"

function num(v: unknown): number {
  if (typeof v === "number") return v
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function ChannelROITable({
  title,
  description,
  data,
  className,
}: ChannelROITableProps) {
  const rows = React.useMemo(() => {
    const lookup = new Map<string, ChannelROIDatum>()
    let otherSessions = 0
    let otherSignups = 0
    let otherActivated = 0

    const knownSlugs = new Set(KNOWN_SOURCES.map((s) => s.slug))
    for (const row of data) {
      const slug = row.utm_source.trim().toLowerCase()
      if (knownSlugs.has(slug)) {
        const existing = lookup.get(slug)
        if (existing) {
          existing.sessions += num(row.sessions)
          existing.signups += num(row.signups)
          existing.activated += num(row.activated)
        } else {
          lookup.set(slug, {
            utm_source: slug,
            sessions: num(row.sessions),
            signups: num(row.signups),
            activated: num(row.activated),
          })
        }
      } else {
        otherSessions += num(row.sessions)
        otherSignups += num(row.signups)
        otherActivated += num(row.activated)
      }
    }

    const result = KNOWN_SOURCES.map((s) => {
      const r = lookup.get(s.slug)
      return {
        slug: s.slug,
        label: s.label,
        sessions: r?.sessions ?? 0,
        signups: r?.signups ?? 0,
        activated: r?.activated ?? 0,
      }
    })

    if (otherSessions > 0 || otherSignups > 0 || otherActivated > 0) {
      result.push({
        slug: "other",
        label: "Other",
        sessions: otherSessions,
        signups: otherSignups,
        activated: otherActivated,
      })
    }

    return result
  }, [data])

  const totalSessions = rows.reduce((acc, r) => acc + r.sessions, 0)
  const peakSessions = rows.reduce((m, r) => Math.max(m, r.sessions), 0)
  const allEmpty = totalSessions === 0
  const reduced = useReducedMotion()

  return (
    <PanelCard
      title={title}
      description={description}
      className={className}
      contentClassName="px-0"
    >
      {allEmpty ? (
        <div className="px-6 pb-6 font-jetbrains text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          No UTM-tagged traffic in this range
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(HEAD_CLS, "border-b")}>Channel</TableHead>
              <TableHead className={cn(HEAD_CLS, "border-b text-right")}>Sessions</TableHead>
              <TableHead className={cn(HEAD_CLS, "border-b text-right")}>Signups</TableHead>
              <TableHead className={cn(HEAD_CLS, "border-b text-right")}>Activated</TableHead>
              <TableHead className={cn(HEAD_CLS, "border-b text-right")}>Conv %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => {
              const conv =
                r.sessions > 0
                  ? ((r.signups / r.sessions) * 100).toFixed(1)
                  : "—"
              const ratio = peakSessions > 0 ? r.sessions / peakSessions : 0
              return (
                <motion.tr
                  key={r.slug}
                  initial={reduced ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="border-b transition-colors hover:bg-muted/40"
                >
                  <TableCell className="text-sm">{r.label}</TableCell>
                  <TableCell className="text-right text-sm">
                    <span className="inline-flex items-center justify-end gap-2">
                      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <motion.span
                          className="absolute inset-y-0 left-0 rounded-full"
                          initial={reduced ? false : { width: 0 }}
                          animate={{ width: `${Math.max(2, ratio * 100)}%` }}
                          transition={{ duration: 0.7, delay: 0.1 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                          style={{
                            backgroundColor: "var(--p-blue)",
                            opacity: 0.6 + ratio * 0.4,
                          }}
                        />
                      </span>
                      <span className="font-jetbrains tabular-nums">
                        {NUMBER.format(r.sessions)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-jetbrains tabular-nums">
                    {NUMBER.format(r.signups)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-jetbrains tabular-nums">
                    {NUMBER.format(r.activated)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-jetbrains tabular-nums text-muted-foreground">
                    {conv === "—" ? "—" : `${conv}%`}
                  </TableCell>
                </motion.tr>
              )
            })}
          </TableBody>
        </Table>
      )}
    </PanelCard>
  )
}
