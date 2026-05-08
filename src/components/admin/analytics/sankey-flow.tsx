"use client"

import * as React from "react"
import { ResponsiveContainer, Sankey, Tooltip } from "recharts"

import { PanelCard } from "@/components/admin/analytics/_panel-card"

export type SankeyNode = { name: string }
export type SankeyLink = { source: number; target: number; value: number }

export interface SankeyFlowProps {
  title: string
  nodes: SankeyNode[]
  links: SankeyLink[]
  className?: string
}

type SankeyNodeShapeProps = {
  x: number
  y: number
  width: number
  height: number
  index: number
  payload: { name: string }
}

function SankeyNodeShape({ x, y, width, height, payload }: SankeyNodeShapeProps) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="var(--p-blue)"
        fillOpacity={hovered ? 1 : 0.6}
        stroke="var(--border)"
        style={{ transition: "fill-opacity 200ms ease-out" }}
      />
      <text
        x={x + width + 6}
        y={y + height / 2}
        dominantBaseline="middle"
        className="fill-foreground"
        style={{
          fontFamily: "var(--font-jetbrains-mono, ui-monospace)",
          fontSize: 11,
          letterSpacing: "0.08em",
        }}
      >
        {payload.name}
      </text>
    </g>
  )
}

type SankeyLinkShapeProps = {
  sourceX: number
  targetX: number
  sourceY: number
  targetY: number
  sourceControlX: number
  targetControlX: number
  linkWidth: number
  index: number
}

function SankeyLinkShape({
  sourceX,
  targetX,
  sourceY,
  targetY,
  sourceControlX,
  targetControlX,
  linkWidth,
}: SankeyLinkShapeProps) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke="var(--p-blue)"
      strokeOpacity={hovered ? 0.4 : 0.15}
      strokeWidth={linkWidth}
      style={{ transition: "stroke-opacity 200ms ease-out" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    />
  )
}

export function SankeyFlow({
  title,
  nodes,
  links,
  className,
}: SankeyFlowProps) {
  const data = React.useMemo(
    () => ({ nodes: nodes.map((n) => ({ ...n })), links: links.map((l) => ({ ...l })) }),
    [nodes, links]
  )

  return (
    <PanelCard title={title} className={className} variant="ambient">
      <div style={{ width: "100%", height: 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={data}
              nodePadding={24}
              nodeWidth={12}
              margin={{ top: 12, right: 120, bottom: 12, left: 12 }}
              link={<SankeyLinkShape {...({} as SankeyLinkShapeProps)} />}
              node={<SankeyNodeShape {...({} as SankeyNodeShapeProps)} />}
            >
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily: "var(--font-jetbrains-mono, ui-monospace)",
                  color: "var(--popover-foreground)",
                }}
              />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  )
}
