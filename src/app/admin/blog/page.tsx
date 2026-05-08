"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Plus,
  Pencil,
  Trash2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { fireNotification } from "@/lib/notify";
import { BlogPostDialog } from "@/components/admin/blog/blog-post-dialog";
import { BlogDeleteDialog } from "@/components/admin/blog/blog-delete-dialog";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};
const inViewOnce = { once: true, margin: "-72px 0px" } as const;

const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  draft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

type StatusFilter = "all" | "draft" | "published" | "archived";

export default function AdminBlogPage() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Id<"blogPosts"> | null>(null);
  const [deletePost, setDeletePost] = useState<{ id: Id<"blogPosts">; title: string } | null>(null);

  const posts = useQuery(
    api.blogPosts.list,
    statusFilter === "all" ? {} : { status: statusFilter }
  );
  const publishMutation = useMutation(api.blogPosts.publish);

  const handlePublish = async (post: { _id: Id<"blogPosts">; title: string; authorName: string; slug: string; createdBy?: string }) => {
    await publishMutation({ id: post._id });
    fireNotification("blog_post_published", {
      authorName: post.authorName,
      authorEmail: "", // resolved if createdBy has email
      postTitle: post.title,
      slug: post.slug,
    });
  };

  const handleEdit = (id: Id<"blogPosts">) => {
    setEditingPost(id);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingPost(null);
    setDialogOpen(true);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* -- Hero ------------------------------------------------ */}
        <motion.section
          variants={heroStagger}
          initial="hidden"
          animate="show"
          style={{ paddingBottom: "var(--s-4)" }}
        >
          <motion.div variants={fadeUp} className="lf-kicker">
            <span className="lf-kicker-mark">§ 5</span>
            Admin · Editorial Desk
          </motion.div>
          <motion.h1
            variants={fadeUp}
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: "clamp(32px, 4.5vw, 48px)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              margin: "var(--s-3) 0 var(--s-3)",
            }}
          >
            Steer the{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
              public voice.
            </em>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="lf-section-deck"
            style={{ maxWidth: 640, fontStyle: "italic" }}
          >
            Draft, publish, and archive blog posts that anchor LLP's editorial
            position on Bangladesh labour-law practice.
          </motion.p>
        </motion.section>

        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={inViewOnce}
        >
          <motion.div
            variants={fadeUp}
            className="flex items-center justify-between"
            style={{ marginBottom: "var(--s-4)" }}
          >
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <TabsList>
                <TabsTrigger value="all">{t("admin.filter.all")}</TabsTrigger>
                <TabsTrigger value="draft">{t("admin.filter.draft")}</TabsTrigger>
                <TabsTrigger value="published">{t("admin.filter.published")}</TabsTrigger>
                <TabsTrigger value="archived">{t("admin.filter.archived")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={handleNew} className="rounded-full shrink-0 text-xs sm:text-sm h-8 sm:h-9">
              <Plus className="size-3.5 sm:size-4 mr-1 sm:mr-1.5" />
              {t("admin.blog.newPost")}
            </Button>
          </motion.div>

          <motion.div variants={fadeUp} className="lf-card lf-card--hover" style={{ padding: 0, overflow: "hidden" }}>
            {!posts ? (
              <div className="p-3.5 sm:p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="py-16 text-center text-sm" style={{ color: "var(--ink-4)" }}>
                {t("admin.empty.posts")}
              </div>
            ) : (
              <>
                {/* Mobile: card list */}
                <div className="sm:hidden p-3.5">
                  {posts.map((post, idx) => (
                    <div
                      key={post._id}
                      className="py-3 first:pt-0 last:pb-0"
                      style={{
                        borderTop: idx === 0 ? "none" : "1px solid var(--line-1)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => handleEdit(post._id)}
                          className="text-left min-w-0 flex-1"
                        >
                          <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--ink)" }}>{post.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {post.category}
                            </Badge>
                            <span className="text-[11px]" style={{ color: "var(--ink-4)" }}>
                              {post.authorName}
                            </span>
                            <span className="text-[11px]" style={{ color: "var(--ink-4)" }}>
                              {new Date(post.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px] mr-1", statusColors[post.status])}
                          >
                            {post.status}
                          </Badge>
                          {post.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => handlePublish(post)}
                              title="Publish"
                            >
                              <Send className="size-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive"
                            onClick={() =>
                              setDeletePost({ id: post._id, title: post.title })
                            }
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop: table */}
                <Table className="hidden sm:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.table.title")}</TableHead>
                      <TableHead>{t("admin.table.category")}</TableHead>
                      <TableHead>{t("admin.table.status")}</TableHead>
                      <TableHead>{t("admin.table.author")}</TableHead>
                      <TableHead>{t("admin.table.date")}</TableHead>
                      <TableHead className="text-right">{t("admin.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post._id}>
                        <TableCell className="font-medium max-w-[300px] truncate">
                          {post.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px]">
                            {post.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("text-[11px]", statusColors[post.status])}
                          >
                            {post.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "var(--ink-4)" }}>
                          {post.authorName}
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "var(--ink-4)" }}>
                          {new Date(post.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {post.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => handlePublish(post)}
                                title="Publish"
                              >
                                <Send className="size-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => handleEdit(post._id)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive"
                              onClick={() =>
                                setDeletePost({ id: post._id, title: post.title })
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </motion.div>
        </motion.section>

        <BlogPostDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editId={editingPost}
        />

        {deletePost && (
          <BlogDeleteDialog
            open={!!deletePost}
            onOpenChange={(open) => !open && setDeletePost(null)}
            postId={deletePost.id}
            postTitle={deletePost.title}
          />
        )}
      </div>
    </MotionConfig>
  );
}
