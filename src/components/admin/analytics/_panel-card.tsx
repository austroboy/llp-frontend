"use client";

import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { HoverLift } from "@/components/admin/analytics/_motion";

interface PanelCardProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "default" | "ambient";
  noPadding?: boolean;
}

/**
 * PanelCard — canonical wrapper for every analytics chart card.
 * Migrated 2026-04-26 to the lf-* surface language. The shadcn `Card`
 * primitive is preserved so the compat shim styles still work; we add
 * `lf-card` (or `lf-card--feature` for ambient) so the editorial
 * glass surface, hairline border, and Fraunces title align with the
 * canonical dashboard design language.
 */
export function PanelCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  variant = "default",
  noPadding = false,
}: PanelCardProps) {
  return (
    <HoverLift>
      <Card
        className={cn(
          "relative h-full overflow-hidden",
          "lf-card lf-card--hover",
          variant === "ambient" && "lf-card--feature",
          className,
        )}
        style={{ padding: 0 }}
      >
        {(title || action) && (
          <CardHeader
            className={cn(
              "relative z-[1] flex flex-row items-start justify-between gap-3 space-y-0",
            )}
            style={{
              padding: "var(--s-4) var(--s-5) var(--s-2)",
              borderBottom: "1px solid var(--line-1)",
            }}
          >
            <div className="flex flex-col gap-1">
              {title ? (
                <CardTitle
                  className="lf-h3"
                  style={{
                    fontSize: 18,
                    margin: 0,
                  }}
                >
                  {title}
                </CardTitle>
              ) : null}
              {description ? (
                <CardDescription
                  className="lf-meta"
                  style={{ textTransform: "uppercase" }}
                >
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </CardHeader>
        )}
        <CardContent
          className={cn(
            "relative z-[1]",
            contentClassName,
          )}
          style={{
            padding: noPadding ? 0 : "var(--s-4) var(--s-5) var(--s-5)",
          }}
        >
          {children}
        </CardContent>
      </Card>
    </HoverLift>
  );
}
