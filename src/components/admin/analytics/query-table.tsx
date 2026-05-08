"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { PanelCard } from "@/components/admin/analytics/_panel-card";

export type QueryColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Render an inline horizontal bar in this numeric column. */
  bar?: boolean;
};

export type QueryRow = Record<string, string | number>;

export interface QueryTableProps {
  title: string;
  description?: string;
  columns: QueryColumn[];
  rows: QueryRow[];
  rowHref?: (row: QueryRow) => string | null;
  pageSize?: number;
  className?: string;
}

const HEAD_CLS =
  "font-jetbrains uppercase text-[10px] tracking-[0.16em] text-muted-foreground";

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function QueryTable({
  title,
  description,
  columns,
  rows,
  rowHref,
  pageSize = 10,
  className,
}: QueryTableProps) {
  const reduced = useReducedMotion();
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = rows.slice(start, start + pageSize);
  const showPager = rows.length > pageSize;

  const colMaxes = React.useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of columns) {
      if (!c.bar) continue;
      let max = 0;
      for (const r of rows) {
        const v = r[c.key];
        if (typeof v === "number" && v > max) max = v;
      }
      out[c.key] = max;
    }
    return out;
  }, [columns, rows]);

  const goTo = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
  };

  return (
    <PanelCard
      title={title}
      description={description}
      className={cn("overflow-hidden", className)}
      contentClassName="px-0"
    >
      <div className="max-h-[520px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={cn(
                    HEAD_CLS,
                    "border-b",
                    c.align === "right" && "text-right",
                  )}
                >
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, idx) => {
              const href = rowHref ? rowHref(row) : null;
              const onClick = href
                ? () => {
                    if (typeof window === "undefined") return;
                    window.location.href = href;
                  }
                : undefined;
              return (
                <motion.tr
                  key={`${start + idx}`}
                  initial={reduced ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: idx * 0.02,
                    ease: "easeOut",
                  }}
                  onClick={onClick}
                  className={cn(
                    "border-b transition-colors",
                    "data-[state=selected]:bg-muted hover:bg-muted/50",
                    href && "cursor-pointer",
                  )}
                >
                  {columns.map((c) => {
                    const v = row[c.key];
                    const isNumeric =
                      c.align === "right" || typeof v === "number";
                    const showBar =
                      c.bar &&
                      typeof v === "number" &&
                      (colMaxes[c.key] ?? 0) > 0;
                    const ratio = showBar
                      ? (v as number) / (colMaxes[c.key] ?? 1)
                      : 0;
                    const cell = showBar ? (
                      <span className="relative inline-flex items-center justify-end gap-2">
                        <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <span
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{
                              width: `${Math.max(2, ratio * 100)}%`,
                              backgroundColor: "var(--p-blue)",
                              opacity: 0.6 + ratio * 0.4,
                            }}
                          />
                        </span>
                        <span className="font-jetbrains tabular-nums text-foreground">
                          {COMPACT.format(v as number)}
                        </span>
                      </span>
                    ) : (
                      <span
                        className={cn(
                          isNumeric &&
                            "font-jetbrains tabular-nums text-foreground",
                        )}
                      >
                        {v ?? ""}
                      </span>
                    );
                    return (
                      <TableCell
                        key={c.key}
                        className={cn(
                          "text-sm",
                          isNumeric && "text-right",
                        )}
                      >
                        {href ? (
                          <Link
                            href={href}
                            className="block w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cell}
                          </Link>
                        ) : (
                          cell
                        )}
                      </TableCell>
                    );
                  })}
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {showPager ? (
        <div className="border-t px-4 py-3">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goTo(safePage - 1);
                  }}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1;
                return (
                  <PaginationItem key={n}>
                    <PaginationLink
                      href="#"
                      isActive={n === safePage}
                      onClick={(e) => {
                        e.preventDefault();
                        goTo(n);
                      }}
                    >
                      {n}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goTo(safePage + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </PanelCard>
  );
}
