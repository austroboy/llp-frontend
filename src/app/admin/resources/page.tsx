"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  FileText,
  FolderOpen,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";

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

interface Category {
  id: number;
  name: string;
  name_bn: string | null;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface ResourceFile {
  id: number;
  category_id: number;
  title: string;
  file_name: string;
  storage_path: string;
  public_url: string | null;
  language: string;
  file_size_display: string | null;
  sort_order: number;
  resource_categories?: { name: string; slug: string };
}

interface Chapter {
  id: number;
  parent_law: string;
  chapter_number: string;
  title: string;
  title_bn: string | null;
  sections_range: string | null;
  is_active: boolean;
}

export default function AdminResourcesPage() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [files, setFiles] = useState<ResourceFile[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Form state
  const [catForm, setCatForm] = useState({ name: "", name_bn: "", slug: "", description: "" });
  const [fileForm, setFileForm] = useState({ title: "", category_id: "", language: "en", file: null as File | null });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [catRes, fileRes, chRes] = await Promise.all([
      fetch("/api/admin/resources").then((r) => r.json()),
      fetch("/api/admin/resources/files").then((r) => r.json()),
      fetch("/api/resources/chapters").then((r) => r.json()),
    ]);
    setCategories(catRes.categories || []);
    setFiles(fileRes.files || []);
    setChapters(chRes.chapters || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // === Category CRUD ===
  const openNewCategory = () => {
    setEditingCat(null);
    setCatForm({ name: "", name_bn: "", slug: "", description: "" });
    setCatDialogOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      name_bn: cat.name_bn || "",
      slug: cat.slug,
      description: cat.description || "",
    });
    setCatDialogOpen(true);
  };

  const saveCategory = async () => {
    const method = editingCat ? "PATCH" : "POST";
    const body = editingCat ? { id: editingCat.id, ...catForm } : catForm;

    const res = await fetch("/api/admin/resources", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(editingCat ? "Category updated" : "Category created");
      setCatDialogOpen(false);
      loadData();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed");
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm("Delete this category and all its files?")) return;
    const res = await fetch("/api/admin/resources", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success("Category deleted");
      loadData();
    } else {
      toast.error("Failed to delete category");
    }
  };

  // === File Upload ===
  const uploadFile = async () => {
    if (!fileForm.file || !fileForm.title || !fileForm.category_id) {
      toast.error("Fill all fields and select a file");
      return;
    }

    const cat = categories.find((c) => c.id === parseInt(fileForm.category_id));
    const formData = new FormData();
    formData.append("file", fileForm.file);
    formData.append("title", fileForm.title);
    formData.append("category_id", fileForm.category_id);
    formData.append("language", fileForm.language);
    formData.append("category_slug", cat?.slug || "uploads");

    const res = await fetch("/api/admin/resources/files", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      toast.success("File uploaded");
      setFileDialogOpen(false);
      setFileForm({ title: "", category_id: "", language: "en", file: null });
      loadData();
    } else {
      const err = await res.json();
      toast.error(err.error || "Upload failed");
    }
  };

  const deleteFile = async (id: number) => {
    if (!confirm("Delete this file?")) return;
    const res = await fetch("/api/admin/resources/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success("File deleted");
      loadData();
    } else {
      toast.error("Failed to delete");
    }
  };

  // === Chapter Toggle ===
  const toggleChapter = async (ch: Chapter) => {
    const res = await fetch(`/api/admin/resources/chapters/${ch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !ch.is_active }),
    });
    if (res.ok) {
      toast.success(ch.is_active ? "Chapter hidden" : "Chapter visible");
      loadData();
    }
  };

  if (loading) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6 p-4 sm:p-6">
        {/* -- Hero ------------------------------------------------ */}
        <motion.section
          variants={heroStagger}
          initial="hidden"
          animate="show"
          style={{ paddingBottom: "var(--s-3)" }}
        >
          <motion.div variants={fadeUp} className="lf-kicker">
            <span className="lf-kicker-mark">§ 4</span>
            Admin · Resource Centre
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
            Curate the{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
              public library.
            </em>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="lf-section-deck"
            style={{ maxWidth: 640, fontStyle: "italic" }}
          >
            Categories, downloadable PDFs, and the public chapter index — what
            members and visitors see in {t("admin.nav.resources")}.
          </motion.p>
        </motion.section>

        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Tabs defaultValue="categories">
            <TabsList>
              <TabsTrigger value="categories">
                <FolderOpen className="mr-1.5 size-4" />
                {t("resources.admin.categories")} ({categories.length})
              </TabsTrigger>
              <TabsTrigger value="files">
                <FileText className="mr-1.5 size-4" />
                {t("resources.admin.files")} ({files.length})
              </TabsTrigger>
              <TabsTrigger value="chapters">
                <BookOpen className="mr-1.5 size-4" />
                {t("resources.admin.chapters")} ({chapters.length})
              </TabsTrigger>
            </TabsList>

            {/* ====== CATEGORIES TAB ====== */}
            <TabsContent value="categories" className="mt-4">
              <motion.section
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
              >
                <motion.div variants={fadeUp} className="mb-4 flex items-center justify-between">
                  <p className="text-sm" style={{ color: "var(--ink-4)" }}>
                    {t("resources.admin.categoriesDesc")}
                  </p>
                  <Button size="sm" onClick={openNewCategory}>
                    <Plus className="mr-1.5 size-4" />
                    {t("resources.admin.newCategory")}
                  </Button>
                </motion.div>
                <motion.div variants={fadeUp} className="lf-card lf-card--hover" style={{ padding: 0, overflow: "hidden" }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.table.title")}</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Files</TableHead>
                        <TableHead className="text-right">{t("admin.table.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell style={{ color: "var(--ink-4)" }}>{cat.slug}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {files.filter((f) => f.category_id === cat.id).length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => openEditCategory(cat)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteCategory(cat.id)}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {categories.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center" style={{ color: "var(--ink-4)" }}>
                            No categories yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </motion.div>
              </motion.section>
            </TabsContent>

            {/* ====== FILES TAB ====== */}
            <TabsContent value="files" className="mt-4">
              <motion.section
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
              >
                <motion.div variants={fadeUp} className="mb-4 flex items-center justify-between">
                  <p className="text-sm" style={{ color: "var(--ink-4)" }}>
                    {t("resources.admin.filesDesc")}
                  </p>
                  <Button size="sm" onClick={() => setFileDialogOpen(true)}>
                    <Upload className="mr-1.5 size-4" />
                    {t("resources.admin.uploadFile")}
                  </Button>
                </motion.div>
                <motion.div variants={fadeUp} className="lf-card lf-card--hover" style={{ padding: 0, overflow: "hidden" }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.table.title")}</TableHead>
                        <TableHead>{t("resources.table.language")}</TableHead>
                        <TableHead>{t("admin.table.category")}</TableHead>
                        <TableHead>{t("resources.table.size")}</TableHead>
                        <TableHead className="text-right">{t("admin.table.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="max-w-xs truncate font-medium">
                            {file.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs uppercase">
                              {file.language}
                            </Badge>
                          </TableCell>
                          <TableCell style={{ color: "var(--ink-4)" }}>
                            {file.resource_categories?.name || "—"}
                          </TableCell>
                          <TableCell style={{ color: "var(--ink-4)" }}>
                            {file.file_size_display || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => deleteFile(file.id)}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {files.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center" style={{ color: "var(--ink-4)" }}>
                            No files uploaded yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </motion.div>
              </motion.section>
            </TabsContent>

            {/* ====== CHAPTERS TAB ====== */}
            <TabsContent value="chapters" className="mt-4">
              <motion.section
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
              >
                <motion.p variants={fadeUp} className="mb-4 text-sm" style={{ color: "var(--ink-4)" }}>
                  {t("resources.admin.chaptersDesc")}
                </motion.p>
                <motion.div variants={fadeUp} className="lf-card lf-card--hover" style={{ padding: 0, overflow: "hidden" }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ch</TableHead>
                        <TableHead>{t("admin.table.title")}</TableHead>
                        <TableHead>Law</TableHead>
                        <TableHead>Sections</TableHead>
                        <TableHead>{t("admin.table.status")}</TableHead>
                        <TableHead className="text-right">{t("admin.table.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chapters.map((ch) => (
                        <TableRow key={ch.id}>
                          <TableCell className="font-mono">{ch.chapter_number}</TableCell>
                          <TableCell className="font-medium">{ch.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {ch.parent_law === "act" ? "Act" : "Rules"}
                            </Badge>
                          </TableCell>
                          <TableCell style={{ color: "var(--ink-4)" }}>
                            {ch.sections_range || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                ch.is_active
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              }
                            >
                              {ch.is_active ? "Visible" : "Hidden"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => toggleChapter(ch)}>
                              {ch.is_active ? "Hide" : "Show"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </motion.div>
              </motion.section>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* ====== Category Dialog ====== */}
        <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "var(--lf-display)", fontWeight: 400 }}>
                {editingCat ? "Edit Category" : "New Category"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Name (EN)</label>
                <Input
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. Minimum Wage"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Name (BN)</label>
                <Input
                  value={catForm.name_bn}
                  onChange={(e) => setCatForm({ ...catForm, name_bn: e.target.value })}
                  placeholder="e.g. ন্যূনতম মজুরি"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Slug</label>
                <Input
                  value={catForm.slug}
                  onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                  placeholder="e.g. minimum-wage"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <Input
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                />
              </div>
              <Button onClick={saveCategory} className="w-full">
                {editingCat ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ====== File Upload Dialog ====== */}
        <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "var(--lf-display)", fontWeight: 400 }}>Upload PDF</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Title</label>
                <Input
                  value={fileForm.title}
                  onChange={(e) => setFileForm({ ...fileForm, title: e.target.value })}
                  placeholder="Document title"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Category</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={fileForm.category_id}
                  onChange={(e) => setFileForm({ ...fileForm, category_id: e.target.value })}
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Language</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={fileForm.language}
                  onChange={(e) => setFileForm({ ...fileForm, language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="bn">Bangla</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">PDF File</label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) =>
                    setFileForm({ ...fileForm, file: e.target.files?.[0] || null })
                  }
                />
              </div>
              <Button onClick={uploadFile} className="w-full">
                <Upload className="mr-1.5 size-4" />
                Upload
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MotionConfig>
  );
}
