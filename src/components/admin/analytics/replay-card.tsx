"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  FileText,
  Flag,
  Flame,
  Play,
  Users,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type ReplayCardIcon = "play" | "flame" | "survey" | "users" | "flag"

export interface ReplayCardProps {
  title: string
  description: string
  href: string
  count?: number
  icon?: ReplayCardIcon
  className?: string
}

const ICONS: Record<ReplayCardIcon, LucideIcon> = {
  play: Play,
  flame: Flame,
  survey: FileText,
  users: Users,
  flag: Flag,
}

export function ReplayCard({
  title,
  description,
  href,
  count,
  icon = "play",
  className,
}: ReplayCardProps) {
  const Icon = ICONS[icon]
  const isExternal = href.startsWith("http")
  const linkProps = isExternal
    ? { target: "_blank" as const, rel: "noopener noreferrer" as const }
    : {}

  return (
    <Link href={href} {...linkProps} className="block h-full">
      <Card
        className={cn(
          "group relative h-full overflow-hidden border bg-card/80 backdrop-blur-sm shadow-none",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md",
          className,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in oklab, var(--chart-1) 10%, transparent),transparent_55%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <CardHeader className="relative z-[1]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/30 transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-primary/10"
                aria-hidden
              >
                <Icon
                  className="h-4 w-4 text-foreground"
                  data-icon
                  strokeWidth={1.5}
                />
              </span>
              <CardTitle className="font-fraunces font-light text-xl tracking-tight">
                {title}
              </CardTitle>
            </div>
            <ArrowUpRight
              className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
              aria-hidden
              strokeWidth={1.5}
            />
          </div>
          <CardDescription className="text-xs">{description}</CardDescription>
        </CardHeader>
        {typeof count === "number" ? (
          <CardContent className="relative z-[1]">
            <Badge
              variant="outline"
              className="font-jetbrains tabular-nums uppercase text-[11px] tracking-[0.16em]"
            >
              {count.toLocaleString("en-US")}
            </Badge>
          </CardContent>
        ) : null}
      </Card>
    </Link>
  )
}
