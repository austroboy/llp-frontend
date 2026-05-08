"use client";

import Link from "next/link";
import { forwardRef, type ComponentProps, type MouseEvent } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePreLaunchLock } from "@/lib/pre-launch";

type Props = ComponentProps<typeof Link> & {
  /** Override the toast message shown when clicking the locked link. */
  lockedMessage?: string;
  /** Force the locked state regardless of launch date (rare). */
  forceLocked?: boolean;
};

const DEFAULT_MESSAGE = "Launching May 1, 2026 — this section opens then.";

/**
 * Drop-in replacement for `next/link` that is *visually identical* to
 * the original link but becomes inert until the launch date
 * (see `src/lib/pre-launch.ts`).
 *
 * When locked: click is cancelled, a small toast explains the date,
 * and the element gets `aria-disabled` + muted styling.
 */
export const LockableLink = forwardRef<HTMLAnchorElement, Props>(
  function LockableLink(
    { href, onClick, className, lockedMessage, forceLocked, children, ...rest },
    ref,
  ) {
    const locked = usePreLaunchLock() || !!forceLocked;

    function handleClick(e: MouseEvent<HTMLAnchorElement>) {
      if (locked) {
        e.preventDefault();
        e.stopPropagation();
        toast.info(lockedMessage ?? DEFAULT_MESSAGE);
        return;
      }
      onClick?.(e);
    }

    return (
      <Link
        ref={ref}
        href={locked ? "#" : href}
        aria-disabled={locked || undefined}
        tabIndex={locked ? -1 : undefined}
        onClick={handleClick}
        className={cn(
          className,
          locked && "opacity-60 cursor-not-allowed",
        )}
        {...rest}
      >
        {children}
      </Link>
    );
  },
);
