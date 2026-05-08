"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

import { PanelCard } from "@/components/admin/analytics/_panel-card"

export interface TopListDatum {
  label: string
  value: number
  href?: string
}

export interface TopListProps {
  title: string
  data: TopListDatum[]
  max?: number
  className?: string
}

const NUMBER = new Intl.NumberFormat("en-US")

interface RowProps {
  label: string
  value: number
  pct: number
  href?: string
  index: number
  reduced: boolean
}

function Row({ label, value, pct, href, index, reduced }: RowProps) {
  const content = (
    <>
      <div className="relative min-w-0 flex-1">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 rounded-md bg-primary/10"
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${Math.max(pct, 1.5)}%` }}
          transition={{ duration: 0.7, delay: 0.08 + index * 0.04, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 rounded-md bg-primary/30"
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${Math.max(pct * 0.6, 1)}%` }}
          transition={{ duration: 0.7, delay: 0.12 + index * 0.04, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="relative flex items-center gap-2 px-3 py-2">
          <span className="truncate text-sm text-foreground">{label}</span>
          {href ? (
            <ArrowUpRight
              aria-hidden
              className="size-3.5 shrink-0 text-muted-foreground transition-colors duration-200 ease-out group-hover:text-foreground"
            />
          ) : null}
        </div>
      </div>
      <span className="font-jetbrains shrink-0 text-right text-sm tabular-nums text-foreground">
        {NUMBER.format(value)}
      </span>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-4 rounded-md transition-colors duration-200 ease-out",
          "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
        )}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-4 rounded-md transition-colors duration-200 ease-out hover:bg-muted/50">
      {content}
    </div>
  )
}

export function TopList({
  title,
  data,
  max,
  className,
}: TopListProps) {
  const reduced = useReducedMotion()
  const limited = React.useMemo(
    () => (typeof max === "number" ? data.slice(0, max) : data),
    [data, max],
  )

  const peak = React.useMemo(() => {
    let m = 0
    for (const d of limited) {
      if (Number.isFinite(d.value) && d.value > m) m = d.value
    }
    return m
  }, [limited])

  return (
    <PanelCard title={title} className={className}>
      {limited.length === 0 ? (
        <div className="font-jetbrains text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          No data
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {limited.map((d, i) => {
            const pct = peak > 0 ? (d.value / peak) * 100 : 0
            return (
              <motion.li
                key={`${d.label}-${i}`}
                initial={reduced ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
              >
                <Row
                  label={d.label}
                  value={d.value}
                  pct={pct}
                  href={d.href}
                  index={i}
                  reduced={!!reduced}
                />
              </motion.li>
            )
          })}
        </ul>
      )}
    </PanelCard>
  )
}
