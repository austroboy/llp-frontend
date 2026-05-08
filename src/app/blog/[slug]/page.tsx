"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { TiptapRenderer, extractHeadings } from "@/components/blog/tiptap-renderer";
import { PostProgressBar } from "@/components/blog/post-progress-bar";
import { PostToc } from "@/components/blog/post-toc";
import { PostShare } from "@/components/blog/post-share";
import { PostNavigation } from "@/components/blog/post-navigation";
import { RelatedPosts } from "@/components/blog/related-posts";

/* ------------------------------------------------------------------ */
/*  CoverHero — full-width edge-to-edge hero image                     */
/* ------------------------------------------------------------------ */

function CoverHero({ storageId }: { storageId: Id<"_storage"> }) {
  const url = useQuery(api.files.getUrl, { storageId });
  if (!url)
    return <div className="w-full h-64 sm:h-80 lg:h-96 bg-muted animate-pulse" />;
  return (
    <div className="relative w-full h-64 sm:h-80 lg:h-96 overflow-hidden">
      <Image src={url} alt="" fill className="object-cover" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Blog Post Page                                                     */
/* ------------------------------------------------------------------ */

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { language } = useLanguage();
  const post = useQuery(api.blogPosts.getBySlug, { slug });

  // Page URL for sharing (resolved client-side)
  const [pageUrl, setPageUrl] = useState("");
  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  // Bilingual content resolution
  const title = post
    ? language === "bn" && post.titleBn
      ? post.titleBn
      : post.title
    : "";
  const content = post
    ? language === "bn" && post.contentBn
      ? post.contentBn
      : post.content
    : "";

  // Extract headings for TOC
  const headings = useMemo(() => {
    if (!content) return [];
    return extractHeadings(content);
  }, [content]);

  /* ----- Loading state ----- */
  if (post === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <SiteTopNav />
        <div className="w-full h-64 sm:h-80 lg:h-96 bg-muted animate-pulse" />
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-12">
          <div className="animate-pulse space-y-6 max-w-[720px] mx-auto">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-10 bg-muted rounded w-3/4" />
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-px bg-border" />
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-4/5" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          </div>
        </div>
        <HomepageFooter />
      </div>
    );
  }

  /* ----- Not found state ----- */
  if (post === null) {
    return (
      <div className="min-h-screen bg-background">
        <SiteTopNav />
        <div className="mx-auto max-w-3xl px-4 py-32 text-center">
          <h1 className="text-2xl font-semibold">Post not found</h1>
          <p className="mt-2 text-muted-foreground">
            This blog post doesn&apos;t exist or has been removed.
          </p>
          <Button asChild className="rounded-full mt-6">
            <Link href="/blog">
              <ArrowLeft className="size-4 mr-1.5" />
              Back to Blog
            </Link>
          </Button>
        </div>
        <HomepageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />
      <PostProgressBar />

      {/* Cover image hero — full width, edge-to-edge */}
      {post.coverImageId && <CoverHero storageId={post.coverImageId} />}

      {/* Back link */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 sm:pt-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5"
        >
          <ArrowLeft className="size-4" />
          Back to Blog
        </Link>
      </div>

      {/* 3-column layout */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-[60px_1fr_220px] gap-6 sm:gap-8">
        {/* Left: Share buttons (desktop only) */}
        <div className="hidden lg:block">
          <PostShare
            url={pageUrl}
            title={title}
            variant="vertical"
            className="sticky top-24"
          />
        </div>

        {/* Center: Article */}
        <article className="max-w-[720px] mx-auto w-full">
          {/* Mobile TOC (hidden on desktop — PostToc has internal lg:hidden logic) */}
          <div className="lg:hidden mb-8">
            <PostToc headings={headings} />
          </div>

          {/* Category badge + date + read time */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge variant="outline">{post.category}</Badge>
            {post.publishedAt && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="size-3.5" />
                {new Date(post.publishedAt).toLocaleDateString()}
              </span>
            )}
            {post.readTimeMinutes && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="size-3.5" />
                {post.readTimeMinutes} min read
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-tight">
            {title}
          </h1>

          {/* Author */}
          <div className="flex items-center gap-3 mt-6 pb-6 border-b border-border">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {post.authorInitials}
            </div>
            <div>
              <p className="text-sm font-medium">{post.authorName}</p>
              {post.authorRole && (
                <p className="text-xs text-muted-foreground">
                  {post.authorRole}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* TipTap rendered content */}
          <div className="mt-8 prose prose-lg dark:prose-invert max-w-none">
            <TiptapRenderer content={content} />
          </div>

          {/* Footer: Tags + Share (mobile) + Copy link */}
          <div className="border-t border-border mt-12 pt-6">
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <PostShare
              url={pageUrl}
              title={title}
              variant="horizontal"
              className="lg:hidden mt-4"
            />
          </div>
        </article>

        {/* Right: TOC sidebar (desktop only) */}
        <div className="hidden lg:block">
          <PostToc headings={headings} className="sticky top-24" />
        </div>
      </div>

      {/* Prev/Next Navigation */}
      {post.publishedAt && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <PostNavigation
            currentId={post._id}
            publishedAt={post.publishedAt}
          />
        </div>
      )}

      {/* Related Posts */}
      <div className="max-w-6xl mx-auto px-4 py-8 pb-16">
        <RelatedPosts
          postId={post._id}
          category={post.category}
          tags={post.tags}
        />
      </div>

      <HomepageFooter />
    </div>
  );
}
