"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface RelatedPostsProps {
  postId: Id<"blogPosts">;
  category: string;
  tags?: string[];
}

function RelatedPostCard({
  post,
}: {
  post: {
    _id: Id<"blogPosts">;
    slug: string;
    title: string;
    coverImageId?: Id<"_storage">;
    authorName: string;
    publishedAt?: number;
  };
}) {
  const coverUrl = useQuery(
    api.files.getUrl,
    post.coverImageId ? { storageId: post.coverImageId } : "skip"
  );

  const isLoadingCover = !!post.coverImageId && coverUrl === undefined;
  const imageUrl = coverUrl || "https://placehold.co/640x360?text=LLP+Blog";

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="rounded-xl border border-border overflow-hidden group hover:shadow-md transition-shadow"
    >
      {isLoadingCover ? (
        <div
          className="w-full bg-muted animate-pulse"
          style={{ aspectRatio: "16/9" }}
        />
      ) : (
        <div className="overflow-hidden">
          <img
            src={imageUrl}
            alt={post.title}
            className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ aspectRatio: "16/9" }}
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{post.authorName}</span>
          {post.publishedAt && (
            <>
              <span className="size-1 rounded-full bg-muted-foreground inline-block" />
              <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export function RelatedPosts({ postId, category, tags }: RelatedPostsProps) {
  const related = useQuery(api.blogPosts.getRelated, {
    postId,
    category,
    tags,
    limit: 3,
  });

  if (!related || related.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-semibold mb-6">Related Articles</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {related.map((post) => (
          <RelatedPostCard key={post._id} post={post} />
        ))}
      </div>
    </section>
  );
}
