"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostNavigationProps {
  currentId: Id<"blogPosts">;
  publishedAt: number;
}

export function PostNavigation({ currentId, publishedAt }: PostNavigationProps) {
  const adjacent = useQuery(api.blogPosts.getAdjacentPosts, {
    publishedAt,
    currentId,
  });

  if (!adjacent) {
    // Loading skeleton
    return (
      <div className="grid gap-4 md:grid-cols-2 mt-12">
        <div className="h-24 rounded-xl border border-border bg-muted/30 animate-pulse" />
        <div className="h-24 rounded-xl border border-border bg-muted/30 animate-pulse" />
      </div>
    );
  }

  const { prev, next } = adjacent;

  if (!prev && !next) return null;

  return (
    <nav className="grid gap-4 md:grid-cols-2 mt-12">
      {/* Previous post */}
      {prev ? (
        <Link
          href={`/blog/${prev.slug}`}
          className="rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors group"
        >
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
            <ArrowLeft className="size-3.5" />
            <span>Previous</span>
          </div>
          <p className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {prev.title}
          </p>
        </Link>
      ) : (
        <div />
      )}

      {/* Next post */}
      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          className={cn(
            "rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors group text-right",
            !prev && "md:col-start-2"
          )}
        >
          <div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground mb-1">
            <span>Next</span>
            <ArrowRight className="size-3.5" />
          </div>
          <p className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {next.title}
          </p>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
