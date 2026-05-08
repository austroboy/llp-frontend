"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface PostTocProps {
  headings: Heading[];
  className?: string;
}

export function PostToc({ headings, className }: PostTocProps) {
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const headingElements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];

    if (headingElements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the first visible heading
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          setActiveId(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    );

    headingElements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [headings]);

  if (headings.length === 0) return null;

  const handleClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Desktop sidebar TOC */}
      <nav className={cn("hidden lg:block", className)}>
        <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
          <p className="mb-3 text-sm font-semibold">Table of Contents</p>
          <ul className="space-y-1.5 text-sm">
            {headings.map((heading) => (
              <li key={heading.id}>
                <button
                  onClick={() => handleClick(heading.id)}
                  className={cn(
                    "text-left w-full transition-colors hover:text-foreground",
                    heading.level === 3 && "pl-4",
                    activeId === heading.id
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile collapsible TOC */}
      <MobileToc
        headings={headings}
        activeId={activeId}
        onClickHeading={handleClick}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile accordion                                                   */
/* ------------------------------------------------------------------ */

function MobileToc({
  headings,
  activeId,
  onClickHeading,
}: {
  headings: Heading[];
  activeId: string;
  onClickHeading: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (headings.length === 0) return null;

  return (
    <div className="lg:hidden rounded-xl border border-border bg-card mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
      >
        Table of Contents
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <ul className="space-y-1.5 px-4 pb-4 text-sm">
          {headings.map((heading) => (
            <li key={heading.id}>
              <button
                onClick={() => {
                  onClickHeading(heading.id);
                  setOpen(false);
                }}
                className={cn(
                  "text-left w-full transition-colors hover:text-foreground",
                  heading.level === 3 && "pl-4",
                  activeId === heading.id
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
