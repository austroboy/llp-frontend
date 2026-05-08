"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { fireNotification } from "@/lib/notify";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Plus, Pencil, Trash2, SendHorizonal, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardBackNav } from "@/components/shared/dashboard-back-nav";
import { useLanguage } from "@/hooks/use-language";
import { BlogPostDialog } from "@/components/admin/blog/blog-post-dialog";
import { BlogDeleteDialog } from "@/components/admin/blog/blog-delete-dialog";

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  published: { fg: "var(--emerald)", bg: "color-mix(in oklab, var(--emerald) 12%, transparent)" },
  draft: { fg: "var(--bronze)", bg: "var(--bronze-ghost)" },
  pending_review: { fg: "var(--accent-blue)", bg: "var(--accent-blue-ghost)" },
  archived: { fg: "var(--ink-4)", bg: "color-mix(in oklab, var(--ink) 6%, transparent)" },
};

const statusLabels: Record<string, string> = {
  draft: "admin.filter.draft",
  pending_review: "member.status.pendingReview",
  published: "admin.filter.published",
  archived: "admin.filter.archived",
};

type StatusFilter = "all" | "draft" | "pending_review" | "published" | "archived";

export default function MemberBlogPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const userId = user?.id;
  const searchParams = useSearchParams();

  // Gate: only admin or published experts can access blog
  const expert = useQuery(
    api.experts.getByClerkId,
    userId ? { clerkId: userId } : "skip"
  );
  const metadata = user?.publicMetadata as { role?: string } | undefined;
  const isAdmin = metadata?.role === "admin";
  const isPublishedExpert = expert?.status === "published";
  if (expert !== undefined && !isAdmin && !isPublishedExpert) {
    return (
      <>
        <DashboardBackNav />
        <div className="dash-empty" style={{ marginTop: "var(--s-5)" }}>
          <p className="dash-empty-title">Restricted</p>
          <p className="dash-empty-body">
            Blog access is restricted to approved experts and admins.
          </p>
        </div>
      </>
    );
  }

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Auto-open new post dialog when arriving via ?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditingPost(null);
      setDialogOpen(true);
    }
  }, [searchParams]);
  const [editingPost, setEditingPost] = useState<Id<"blogPosts"> | null>(null);
  const [deletePost, setDeletePost] = useState<{ id: Id<"blogPosts">; title: string } | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const posts = useQuery(
    api.blogPosts.listByUser,
    userId
      ? statusFilter === "all"
        ? { userId }
        : { userId, status: statusFilter }
      : "skip"
  );
  const submitForReview = useMutation(api.blogPosts.update);
  const createApproval = useMutation(api.approvalRequests.create);

  const handleEdit = (id: Id<"blogPosts">) => {
    setEditingPost(id);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingPost(null);
    setDialogOpen(true);
  };

  const handleSubmitForReview = async (post: { _id: Id<"blogPosts">; title: string }) => {
    if (!userId || !user) return;
    setSubmitting(post._id);
    try {
      await submitForReview({ id: post._id, status: "pending_review" });
      await createApproval({
        type: "blog_post",
        resourceId: post._id,
        title: post.title,
        requestedBy: userId,
        requesterName: user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Member",
      });
      fireNotification("blog_submitted_for_review", {
        authorName: user.fullName ?? "Member",
        postTitle: post.title,
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <>
      <DashboardBackNav />

      <div className="dash-header">
        <div>
          <div className="dash-hello-kicker">Personal Desk · Authoring</div>
          <h1 className="dash-hello-title">
            <em>{t("member.blog.title")}</em>
          </h1>
          <p className="dash-hello-sub">{t("member.blog.subtitle")}</p>
        </div>
        <div className="dash-header-right">
          <button
            type="button"
            onClick={handleNew}
            className="lf-cta lf-cta--primary"
          >
            <Plus className="size-3.5" />
            {t("admin.blog.newPost")}
          </button>
        </div>
      </div>

      {/* ── Filter tabs (shadcn Tabs kept for keyboard a11y) ── */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
      >
        <TabsList
          style={{
            background: "transparent",
            border: 0,
            padding: 0,
            height: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--s-3)",
            borderBottom: "0.5px solid var(--line-2)",
            marginBottom: "var(--s-4)",
            borderRadius: 0,
          }}
        >
          <TabsTrigger value="all" className="lf-tab data-[state=active]:lf-tab--active">
            {t("admin.filter.all")}
          </TabsTrigger>
          <TabsTrigger value="draft" className="lf-tab data-[state=active]:lf-tab--active">
            {t("admin.filter.draft")}
          </TabsTrigger>
          <TabsTrigger value="pending_review" className="lf-tab data-[state=active]:lf-tab--active">
            {t("member.status.pendingReview")}
          </TabsTrigger>
          <TabsTrigger value="published" className="lf-tab data-[state=active]:lf-tab--active">
            {t("admin.filter.published")}
          </TabsTrigger>
          <TabsTrigger value="archived" className="lf-tab data-[state=active]:lf-tab--active">
            {t("admin.filter.archived")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <section className="dash-section">
        {!posts ? (
          <div className="dash-empty">
            <p className="dash-empty-body">{t("admin.loading")}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="dash-empty">
            <p className="dash-empty-title">No posts yet</p>
            <p className="dash-empty-body">{t("member.empty.posts")}</p>
          </div>
        ) : (
          <div className="dash-table-wrap">
            <div style={{ overflowX: "auto" }}>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>{t("admin.table.title")}</th>
                    <th>{t("admin.table.category")}</th>
                    <th>{t("admin.table.status")}</th>
                    <th>{t("admin.table.date")}</th>
                    <th style={{ textAlign: "right" }}>
                      {t("admin.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => {
                    const colors =
                      STATUS_COLORS[post.status] ?? STATUS_COLORS.draft;
                    return (
                      <tr key={post._id}>
                        <td
                          style={{
                            fontWeight: 500,
                            color: "var(--ink)",
                            maxWidth: 320,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {post.title}
                        </td>
                        <td>
                          <span className="lf-tag">{post.category}</span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "3px 10px",
                              borderRadius: 999,
                              fontFamily: "var(--lf-mono)",
                              fontSize: 10,
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              fontWeight: 500,
                              color: colors.fg,
                              background: colors.bg,
                              border: `0.5px solid ${colors.fg}`,
                            }}
                          >
                            {post.status === "pending_review" && (
                              <Clock className="size-3" />
                            )}
                            {t(statusLabels[post.status] ?? post.status)}
                          </span>
                        </td>
                        <td style={{ color: "var(--ink-4)" }}>
                          {new Date(post.updatedAt).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              gap: 4,
                              justifyContent: "flex-end",
                            }}
                          >
                            {post.status === "draft" && (
                              <button
                                type="button"
                                className="lf-icon-btn"
                                onClick={() => handleSubmitForReview(post)}
                                disabled={submitting === post._id}
                                title={t("member.blog.submitForReview")}
                                style={{ color: "var(--accent-blue)" }}
                              >
                                <SendHorizonal className="size-3.5" />
                              </button>
                            )}
                            {(post.status === "draft" ||
                              post.status === "published") && (
                              <button
                                type="button"
                                className="lf-icon-btn"
                                onClick={() => handleEdit(post._id)}
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            )}
                            {post.status !== "pending_review" && (
                              <button
                                type="button"
                                className="lf-icon-btn"
                                onClick={() =>
                                  setDeletePost({
                                    id: post._id,
                                    title: post.title,
                                  })
                                }
                                style={{ color: "var(--rust)" }}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <BlogPostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editId={editingPost}
        memberMode
      />

      {deletePost && (
        <BlogDeleteDialog
          open={!!deletePost}
          onOpenChange={(open) => !open && setDeletePost(null)}
          postId={deletePost.id}
          postTitle={deletePost.title}
        />
      )}
    </>
  );
}
