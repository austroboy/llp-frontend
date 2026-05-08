"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { useImageUpload } from "@/components/editor/image-upload";
import { TiptapRenderer, extractHeadings } from "@/components/blog/tiptap-renderer";
import { cn } from "@/lib/utils";
import { fireNotification } from "@/lib/notify";
import { Clock, Eye, EyeOff, ImagePlus, Languages, Loader2, X } from "lucide-react";

function extractTextFromJson(jsonStr: string): string {
  try {
    const doc = JSON.parse(jsonStr);
    const texts: string[] = [];
    const walk = (node: any) => {
      if (node.text) texts.push(node.text);
      if (node.content) node.content.forEach(walk);
    };
    walk(doc);
    return texts.join(" ");
  } catch {
    return jsonStr; // fallback: treat as plain text
  }
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

interface BlogPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: Id<"blogPosts"> | null;
  memberMode?: boolean;
}

export function BlogPostDialog({ open, onOpenChange, editId, memberMode }: BlogPostDialogProps) {
  const { t } = useLanguage();
  const { user } = useUser();
  const existingPost = useQuery(
    api.blogPosts.list,
    editId ? {} : "skip"
  );
  const createPost = useMutation(api.blogPosts.create);
  const updatePost = useMutation(api.blogPosts.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const removeFile = useMutation(api.files.remove);
  const { uploadImage } = useImageUpload();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [titleBn, setTitleBn] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [excerptBn, setExcerptBn] = useState("");
  const [content, setContent] = useState("");
  const [contentBn, setContentBn] = useState("");
  const [category, setCategory] = useState<"official" | "community">("official");
  const [status, setStatus] = useState<"draft" | "pending_review" | "published" | "archived">("draft");
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [authorInitials, setAuthorInitials] = useState("");
  const [tags, setTags] = useState("");
  const [coverImageId, setCoverImageId] = useState<Id<"_storage"> | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [needsRetranslation, setNeedsRetranslation] = useState(false);

  const previewReadTime = useMemo(() => {
    const text = extractTextFromJson(content);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [content]);

  const previewHeadings = useMemo(() => {
    if (!content) return [];
    return extractHeadings(content);
  }, [content]);

  // Resolve cover image URL from storage ID
  const coverImageUrl = useQuery(
    api.files.getUrl,
    coverImageId ? { storageId: coverImageId } : "skip"
  );

  // Load existing post data when editing
  useEffect(() => {
    if (editId && existingPost) {
      const post = existingPost.find((p) => p._id === editId);
      if (post) {
        setTitle(post.title);
        setTitleBn(post.titleBn ?? "");
        setSlug(post.slug);
        setExcerpt(post.excerpt);
        setExcerptBn(post.excerptBn ?? "");
        setContent(post.content);
        setContentBn(post.contentBn ?? "");
        setCategory(post.category);
        setStatus(post.status);
        setAuthorName(post.authorName);
        setAuthorRole(post.authorRole ?? "");
        setAuthorInitials(post.authorInitials);
        setTags(post.tags?.join(", ") ?? "");
        setCoverImageId(post.coverImageId ?? null);
        setCoverPreview(null);
      }
    } else if (!editId) {
      setTitle("");
      setTitleBn("");
      setSlug("");
      setExcerpt("");
      setExcerptBn("");
      setContent("");
      setContentBn("");
      setCategory("official");
      setStatus("draft");
      setAuthorName(user?.fullName ?? "");
      setAuthorRole("");
      setAuthorInitials(
        user?.fullName
          ? user.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
          : "AD"
      );
      setTags("");
      setCoverImageId(null);
      setCoverPreview(null);
    }
  }, [editId, existingPost, user]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!editId) {
      setSlug(slugify(title));
    }
  }, [title, editId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) return;
    // Max 5MB
    if (file.size > 5 * 1024 * 1024) return;

    setUploading(true);
    try {
      // Show local preview immediately
      const localUrl = URL.createObjectURL(file);
      setCoverPreview(localUrl);

      // Upload to Convex storage
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      setCoverImageId(storageId);
    } catch (err) {
      console.error("Upload failed:", err);
      setCoverPreview(null);
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    if (coverImageId) {
      try {
        await removeFile({ storageId: coverImageId });
      } catch {
        // Ignore — might have already been deleted
      }
    }
    setCoverImageId(null);
    setCoverPreview(null);
  };

  const handleTranslate = async () => {
    if (!content && !title && !excerpt) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          excerpt: excerpt || undefined,
          content: content || undefined,
        }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      if (data.titleBn) setTitleBn(data.titleBn);
      if (data.excerptBn) setExcerptBn(data.excerptBn);
      if (data.contentBn) setContentBn(data.contentBn);
      setNeedsRetranslation(false);
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  const displayImageUrl = coverPreview || coverImageUrl || null;

  const handleSave = async () => {
    if (!title || !excerpt || !content) return;
    setSaving(true);
    const effectiveStatus = memberMode ? "draft" as const : status;
    try {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const textContent = extractTextFromJson(content);
      const wordCount = textContent.split(/\s+/).filter(Boolean).length;
      const calculatedReadTime = Math.max(1, Math.ceil(wordCount / 200));

      if (editId) {
        await updatePost({
          id: editId,
          title,
          titleBn: titleBn || undefined,
          slug,
          excerpt,
          excerptBn: excerptBn || undefined,
          content,
          contentBn: contentBn || undefined,
          category,
          status: effectiveStatus,
          authorName,
          authorRole: authorRole || undefined,
          authorInitials,
          coverImageId: coverImageId ?? undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          readTimeMinutes: calculatedReadTime,
        });
      } else {
        await createPost({
          title,
          titleBn: titleBn || undefined,
          slug,
          excerpt,
          excerptBn: excerptBn || undefined,
          content,
          contentBn: contentBn || undefined,
          category,
          status: effectiveStatus,
          authorName,
          authorRole: authorRole || undefined,
          authorInitials,
          coverImageId: coverImageId ?? undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          readTimeMinutes: calculatedReadTime,
          createdBy: user?.id ?? "unknown",
        });
      }
      // Notify when post is published
      if (effectiveStatus === "published") {
        fireNotification("blog_post_published", {
          authorName,
          authorEmail: "",
          postTitle: title,
          slug,
        });
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "flex flex-col overflow-hidden transition-all duration-300",
        showPreview ? "max-w-[96vw] h-[95vh]" : "max-w-5xl max-h-[90vh]"
      )}>
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>
              {editId ? t("admin.blog.editPost") : t("admin.blog.newPost")}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="h-7 gap-1.5 text-xs"
            >
              {showPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {showPreview ? t("admin.blog.write") : t("admin.blog.preview")}
            </Button>
          </div>
        </DialogHeader>

        <div className={cn("flex-1 min-h-0 flex", showPreview && "gap-6")}>
          {/* Left: Editor form */}
          <div className={cn(
            "overflow-y-auto pr-2 -mr-2",
            showPreview ? "w-1/2 shrink-0" : "w-full"
          )}>
          <div className="space-y-6 pb-4">
            {/* Cover Image Upload */}
            <div>
              <Label>{t("admin.blog.coverImage")}</Label>
              <div className="mt-2">
                {displayImageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
                    <img
                      src={displayImageUrl}
                      alt="Cover preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-sm text-white font-medium">{t("admin.blog.uploading")}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-36 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
                  >
                    <ImagePlus className="size-8" />
                    <span className="text-sm font-medium">{t("admin.blog.uploadImage")}</span>
                    <span className="text-xs">{t("admin.blog.imageHint")}</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Title EN/BN */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("admin.blog.titleEn")}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article title..."
                />
              </div>
              <div>
                <Label>{t("admin.blog.titleBn")}</Label>
                <Input
                  value={titleBn}
                  onChange={(e) => setTitleBn(e.target.value)}
                  placeholder="শিরোনাম..."
                />
              </div>
            </div>

            {/* Slug */}
            <div>
              <Label>{t("admin.blog.slug")}</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="article-slug"
              />
            </div>

            {/* Category + Status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("admin.blog.category")}</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as "official" | "community")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="official">Official</option>
                  <option value="community">Community</option>
                </select>
              </div>
              {!memberMode && (
              <div>
                <Label>{t("admin.blog.status")}</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "draft" | "published" | "archived")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              )}
            </div>

            {/* Excerpt EN/BN */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("admin.blog.excerptEn")}</Label>
                <Textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief summary..."
                  rows={2}
                />
              </div>
              <div>
                <Label>{t("admin.blog.excerptBn")}</Label>
                <Textarea
                  value={excerptBn}
                  onChange={(e) => setExcerptBn(e.target.value)}
                  placeholder="সংক্ষেপ..."
                  rows={2}
                />
              </div>
            </div>

            {/* Content EN — Rich Editor */}
            <div>
              <Label>{t("admin.blog.contentEn")}</Label>
              <div className="mt-2">
                <TiptapEditor
                  content={content}
                  onChange={(val) => {
                    setContent(val);
                    if (contentBn) setNeedsRetranslation(true);
                  }}
                  onImageUpload={uploadImage}
                  placeholder="Start writing your article..."
                />
              </div>
            </div>

            {/* Content BN — Rich Editor */}
            <div>
              <div className="flex items-center justify-between">
                <Label>{t("admin.blog.contentBn")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTranslate}
                  disabled={translating || (!content && !title && !excerpt)}
                  className={cn(
                    "h-7 gap-1.5 text-xs transition-all",
                    needsRetranslation && !translating &&
                      "border-orange-400 bg-orange-50 text-orange-700 shadow-[0_0_10px_rgba(251,146,60,0.5)] hover:bg-orange-100 hover:border-orange-500 dark:border-orange-500 dark:bg-orange-900/30 dark:text-orange-300 dark:shadow-[0_0_10px_rgba(251,146,60,0.4)] dark:hover:bg-orange-900/50"
                  )}
                >
                  {translating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Languages className="size-3.5" />
                  )}
                  {translating ? "Translating..." : "Translate to Bangla"}
                </Button>
              </div>
              <div className="mt-2">
                <TiptapEditor
                  content={contentBn}
                  onChange={setContentBn}
                  onImageUpload={uploadImage}
                  placeholder="বাংলায় লিখুন..."
                />
              </div>
            </div>

            {/* Author info */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>{t("admin.blog.authorName")}</Label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("admin.blog.authorRole")}</Label>
                <Input
                  value={authorRole}
                  onChange={(e) => setAuthorRole(e.target.value)}
                  placeholder="Legal Analyst"
                />
              </div>
              <div>
                <Label>{t("admin.blog.authorInitials")}</Label>
                <Input
                  value={authorInitials}
                  onChange={(e) => setAuthorInitials(e.target.value)}
                  placeholder="LLP"
                  maxLength={3}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>{t("admin.blog.tags")}</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="labour-law, compliance, ..."
              />
              <p className="text-xs text-muted-foreground mt-1">{t("admin.blog.tagsHint")}</p>
            </div>
          </div>
          </div>

          {/* Right: Live preview */}
          {showPreview && (
            <div className="w-1/2 overflow-y-auto border-l border-border pl-6">
              <BlogPreviewPanel
                title={title}
                content={content}
                coverImageUrl={displayImageUrl}
                category={category}
                readTime={previewReadTime}
                authorName={authorName}
                authorRole={authorRole}
                authorInitials={authorInitials}
                tags={tags}
                headings={previewHeadings}
              />
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-between gap-3 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            {!memberMode && (
              <>
                {/* Status quick toggle */}
                <span className="text-xs text-muted-foreground mr-1">{t("admin.blog.status")}:</span>
                {(["draft", "published"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      status === s
                        ? s === "published"
                          ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {s === "draft" ? t("admin.filter.draft") : t("admin.filter.published")}
                  </button>
                ))}
              </>
            )}
            {memberMode && (
              <span className="text-xs text-muted-foreground">{t("member.blog.savedAsDraft")}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("admin.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading || !title || !excerpt || !content}>
              {saving
                ? t("admin.saving")
                : memberMode
                  ? t("admin.blog.saveDraft")
                  : status === "published"
                    ? t("admin.blog.publish")
                    : editId
                      ? t("admin.save")
                      : t("admin.blog.saveDraft")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  BlogPreviewPanel                                                   */
/* ------------------------------------------------------------------ */

interface BlogPreviewPanelProps {
  title: string;
  content: string;
  coverImageUrl: string | null;
  category: string;
  readTime: number;
  authorName: string;
  authorRole: string;
  authorInitials: string;
  tags: string;
  headings: { id: string; text: string; level: number }[];
}

function BlogPreviewPanel({
  title,
  content,
  coverImageUrl,
  category,
  readTime,
  authorName,
  authorRole,
  authorInitials,
  tags,
  headings,
}: BlogPreviewPanelProps) {
  const tagsArray = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const hasContent = content && content !== '{"type":"doc","content":[{"type":"paragraph"}]}';

  return (
    <div className="py-2">
      {/* Cover image */}
      {coverImageUrl && (
        <div className="w-full h-48 overflow-hidden rounded-xl mb-6">
          <img
            src={coverImageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Category + read time */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Badge variant="outline" className="capitalize">
          {category}
        </Badge>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="size-3.5" />
          {readTime} min read
        </span>
      </div>

      {/* Title */}
      {title ? (
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
          {title}
        </h1>
      ) : (
        <p className="text-2xl text-muted-foreground/40 italic">Untitled post</p>
      )}

      {/* Author */}
      {authorName && (
        <div className="flex items-center gap-3 mt-6 pb-6 border-b border-border">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {authorInitials || "?"}
          </div>
          <div>
            <p className="text-sm font-medium">{authorName}</p>
            {authorRole && (
              <p className="text-xs text-muted-foreground">{authorRole}</p>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {tagsArray.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {tagsArray.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Mini TOC */}
      {headings.length > 0 && (
        <nav className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Table of Contents
          </p>
          <ul className="space-y-1">
            {headings.map((h) => (
              <li
                key={h.id}
                className={cn(
                  "text-sm text-muted-foreground",
                  h.level === 3 && "ml-4"
                )}
              >
                {h.text}
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Rendered content */}
      {hasContent ? (
        <div className="mt-8 prose prose-lg dark:prose-invert max-w-none">
          <TiptapRenderer content={content} />
        </div>
      ) : (
        <div className="mt-12 text-center text-muted-foreground/50">
          <p className="text-lg">Start writing to see a preview...</p>
        </div>
      )}
    </div>
  );
}
