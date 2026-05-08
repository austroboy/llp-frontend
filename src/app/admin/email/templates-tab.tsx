"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Mail,
  ShieldAlert,
  Search,
  RefreshCw,
  RotateCcw,
  Monitor,
  Smartphone,
  Columns2,
  Code2,
  ChevronRight,
  FileCode2,
  Send,
  Loader2,
  Inbox,
  Eye,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { readJson } from "@/lib/http";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  recipient: "user" | "admin" | "both";
  subject: string;
  from: string;
  fileLocation: string;
  description?: string;
}

interface TemplateCategory {
  id: string;
  label: string;
  count: number;
}

type ViewMode = "desktop" | "mobile" | "split" | "source";

interface SourceData {
  html: string | null;
  tsSource: string | null;
  filePath: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  consultation: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  service: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  onboarding: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  expert: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  headhunting: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  job: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  blog: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  system: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [sampleData, setSampleData] = useState<Record<string, unknown>>({});
  const [defaultSampleData, setDefaultSampleData] = useState<Record<string, unknown>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const [sourceData, setSourceData] = useState<SourceData | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);

  // Accordion state — tracks which categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchTemplates = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/admin/email-templates?action=list");
      const data = await readJson<{ error?: string; templates?: EmailTemplate[]; categories?: TemplateCategory[] }>(res);
      if (data.error) throw new Error(data.error);
      setTemplates(data.templates || []);
      setCategories(data.categories || []);
      // Expand all categories by default
      if (data.categories) {
        setExpandedCategories(new Set(data.categories.map((c: TemplateCategory) => c.id)));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load templates";
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const fetchPreview = useCallback(async (template: EmailTemplate, data?: Record<string, unknown>) => {
    setPreviewLoading(true);
    try {
      if (data) {
        // POST with custom sample data
        const res = await fetch("/api/admin/email-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "preview", id: template.id, data }),
        });
        const result = await readJson<{ error?: string; html?: string }>(res);
        if (result.error) throw new Error(result.error);
        setPreviewHtml(result.html || "");
      } else {
        // GET default preview
        const res = await fetch(`/api/admin/email-templates?action=preview&id=${template.id}`);
        const result = await readJson<{ error?: string; html?: string }>(res);
        if (result.error) throw new Error(result.error);
        setPreviewHtml(result.html || "");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load preview";
      toast.error(msg);
      setPreviewHtml("");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const fetchSource = useCallback(async (template: EmailTemplate) => {
    setSourceLoading(true);
    try {
      const res = await fetch(`/api/admin/email-templates?action=source&id=${template.id}`);
      const result = await readJson<{ error?: string; html?: string; tsSource?: string; filePath?: string }>(res);
      if (result.error) throw new Error(result.error);
      setSourceData({
        html: result.html ?? null,
        tsSource: result.tsSource ?? null,
        filePath: result.filePath ?? "",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load source";
      toast.error(msg);
      setSourceData(null);
    } finally {
      setSourceLoading(false);
    }
  }, []);

  const fetchSampleData = useCallback(async (template: EmailTemplate) => {
    try {
      const res = await fetch(`/api/admin/email-templates?action=sample&id=${template.id}`);
      const data = await readJson<{ error?: string; sample?: Record<string, unknown> }>(res);
      if (data.error) throw new Error(data.error);
      setSampleData(data.sample || {});
      setDefaultSampleData(data.sample || {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load sample data";
      toast.error(msg);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSelectTemplate = useCallback(
    (template: EmailTemplate) => {
      setSelectedTemplate(template);
      setPreviewHtml("");
      setSampleData({});
      setDefaultSampleData({});
      setSourceData(null);
      fetchPreview(template);
      fetchSampleData(template);
    },
    [fetchPreview, fetchSampleData]
  );

  // Lazy-load TS source the first time the user switches to the Source tab
  useEffect(() => {
    if (viewMode === "source" && selectedTemplate && !sourceData && !sourceLoading) {
      fetchSource(selectedTemplate);
    }
  }, [viewMode, selectedTemplate, sourceData, sourceLoading, fetchSource]);

  const handleRefreshPreview = useCallback(() => {
    if (!selectedTemplate) return;
    fetchPreview(selectedTemplate, sampleData);
  }, [selectedTemplate, sampleData, fetchPreview]);

  const handleResetSampleData = useCallback(() => {
    setSampleData({ ...defaultSampleData });
  }, [defaultSampleData]);

  const handleSendTest = useCallback(async () => {
    if (!selectedTemplate) return;
    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-test",
          id: selectedTemplate.id,
          data: sampleData,
        }),
      });
      const result = await readJson<{ error?: string; sentTo?: string }>(res);
      if (result.error) throw new Error(result.error);
      toast.success(`Test email sent to ${result.sentTo || "admin"}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send test email";
      toast.error(msg);
    } finally {
      setSendingTest(false);
    }
  }, [selectedTemplate, sampleData]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [templates, categoryFilter, search]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, EmailTemplate[]> = {};
    for (const t of filteredTemplates) {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    }
    return groups;
  }, [filteredTemplates]);

  // ---------------------------------------------------------------------------
  // Sample data field updater
  // ---------------------------------------------------------------------------

  const updateSampleField = useCallback((key: string, value: unknown) => {
    setSampleData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const categoryBadgeClass = (cat: string) =>
    CATEGORY_COLORS[cat] || CATEGORY_COLORS.system;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {templates.length} templates
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchTemplates(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Search + Filter row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" size="sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.label} ({cat.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main content area */}
      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-xl border border-border bg-card">
          <Inbox className="mb-3 size-10 opacity-20" />
          <p className="text-sm">No email templates found</p>
          <p className="text-xs mt-1">
            Templates are registered in the email-templates API
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            selectedTemplate
              ? "grid-cols-1 lg:grid-cols-[280px_1fr_300px]"
              : "grid-cols-1"
          }`}
        >
          {/* Left sidebar — Template list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
              <div className="p-2">
                {Object.keys(groupedTemplates).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Search className="mb-2 size-6 opacity-20" />
                    <p className="text-xs">No templates match your search</p>
                  </div>
                ) : (
                  Object.entries(groupedTemplates).map(([category, items]) => (
                    <div key={category} className="mb-1">
                      {/* Category header */}
                      <button
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted/50 rounded-md transition-colors"
                        onClick={() => toggleCategory(category)}
                      >
                        <ChevronRight
                          className={`size-3.5 text-muted-foreground transition-transform ${
                            expandedCategories.has(category) ? "rotate-90" : ""
                          }`}
                        />
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${categoryBadgeClass(category)}`}
                        >
                          {category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {items.length}
                        </span>
                      </button>
                      {/* Template items */}
                      {expandedCategories.has(category) && (
                        <div className="ml-3 border-l border-border pl-2 space-y-0.5 mb-1">
                          {items.map((template) => (
                            <button
                              key={template.id}
                              className={`flex items-center gap-2 w-full px-2 py-1.5 text-left rounded-md transition-colors text-sm ${
                                selectedTemplate?.id === template.id
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "hover:bg-muted/50 text-foreground/80"
                              }`}
                              onClick={() => handleSelectTemplate(template)}
                            >
                              {template.recipient === "admin" ? (
                                <ShieldAlert className="size-3.5 shrink-0 text-amber-500" />
                              ) : (
                                <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                              )}
                              <span className="truncate text-xs">{template.name}</span>
                              {template.recipient === "admin" && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1 py-0 ml-auto shrink-0 bg-amber-500/10 text-amber-600"
                                >
                                  admin
                                </Badge>
                              )}
                              {template.recipient === "both" && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1 py-0 ml-auto shrink-0 bg-blue-500/10 text-blue-600"
                                >
                                  both
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Center — Preview panel */}
          {selectedTemplate && (
            <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
              {/* Preview toolbar */}
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <h3 className="text-sm font-medium truncate">
                  {selectedTemplate.name}
                </h3>
                <div className="flex items-center gap-2">
                  {/* View mode tabs */}
                  <Tabs
                    value={viewMode}
                    onValueChange={(v) => setViewMode(v as ViewMode)}
                  >
                    <TabsList className="h-7">
                      <TabsTrigger value="desktop" className="h-6 px-2 text-xs gap-1">
                        <Monitor className="size-3" />
                        <span className="hidden sm:inline">Desktop</span>
                      </TabsTrigger>
                      <TabsTrigger value="mobile" className="h-6 px-2 text-xs gap-1">
                        <Smartphone className="size-3" />
                        <span className="hidden sm:inline">Mobile</span>
                      </TabsTrigger>
                      <TabsTrigger value="split" className="h-6 px-2 text-xs gap-1">
                        <Columns2 className="size-3" />
                        <span className="hidden sm:inline">Split</span>
                      </TabsTrigger>
                      <TabsTrigger value="source" className="h-6 px-2 text-xs gap-1">
                        <Code2 className="size-3" />
                        <span className="hidden sm:inline">Source</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {/* Edit link */}
                  <Link
                    href={`/admin/email-templates/${encodeURIComponent(selectedTemplate.id)}/edit`}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                    >
                      <Pencil className="mr-1 size-3" />
                      Edit
                    </Button>
                  </Link>
                  {/* Refresh preview */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={handleRefreshPreview}
                    disabled={previewLoading}
                  >
                    {previewLoading ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 size-3" />
                    )}
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Preview frames */}
              <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-900/50 p-4">
                {viewMode === "source" ? (
                  sourceLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !sourceData ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <Code2 className="mb-2 size-8 opacity-20" />
                      <p className="text-sm">Source not available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sourceData.tsSource && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              TypeScript · renderTemplate() case block
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px]"
                              onClick={() => {
                                navigator.clipboard.writeText(sourceData.tsSource!);
                                toast.success("TS source copied");
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                          <pre className="rounded-lg border border-border bg-zinc-950 text-zinc-100 p-3 text-[11px] leading-relaxed overflow-auto max-h-[360px] font-mono">
                            <code>{sourceData.tsSource}</code>
                          </pre>
                        </div>
                      )}
                      {sourceData.html && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              Rendered HTML (sample data)
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px]"
                              onClick={() => {
                                navigator.clipboard.writeText(sourceData.html!);
                                toast.success("HTML copied");
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                          <pre className="rounded-lg border border-border bg-white dark:bg-zinc-950 p-3 text-[11px] leading-relaxed overflow-auto max-h-[360px] font-mono whitespace-pre-wrap break-all">
                            <code>{sourceData.html}</code>
                          </pre>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        File:{" "}
                        <span className="font-mono">{sourceData.filePath}</span>
                      </p>
                    </div>
                  )
                ) : previewLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !previewHtml ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Eye className="mb-2 size-8 opacity-20" />
                    <p className="text-sm">Preview not available</p>
                  </div>
                ) : (
                  <div
                    className={`flex gap-4 justify-center ${
                      viewMode === "split" ? "flex-wrap" : ""
                    }`}
                  >
                    {/* Desktop preview */}
                    {(viewMode === "desktop" || viewMode === "split") && (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">
                          Desktop (600px)
                        </span>
                        <div className="w-[600px] max-w-full bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-border overflow-hidden">
                          <iframe
                            srcDoc={previewHtml}
                            title="Email preview — desktop"
                            className="w-full border-0"
                            style={{ height: "500px" }}
                            sandbox="allow-same-origin"
                          />
                        </div>
                      </div>
                    )}
                    {/* Mobile preview */}
                    {(viewMode === "mobile" || viewMode === "split") && (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">
                          Mobile (375px)
                        </span>
                        <div className="w-[375px] bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-border overflow-hidden">
                          <iframe
                            srcDoc={previewHtml}
                            title="Email preview — mobile"
                            className="w-full border-0"
                            style={{ height: "500px" }}
                            sandbox="allow-same-origin"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Template metadata */}
              <div className="border-t border-border px-3 py-2 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">Subject:</span>
                  <span className="truncate">{selectedTemplate.subject}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">From:</span>
                  <span>{selectedTemplate.from}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileCode2 className="size-3 shrink-0" />
                  <span className="font-mono truncate">
                    {selectedTemplate.fileLocation}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Right sidebar — Sample data editor */}
          {selectedTemplate && (
            <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <h3 className="text-sm font-medium">Sample Data</h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Reset to default"
                    onClick={handleResetSampleData}
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={handleSendTest}
                    disabled={sendingTest}
                  >
                    {sendingTest ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <Send className="mr-1 size-3" />
                    )}
                    {sendingTest ? "Sending..." : "Send Test"}
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 h-[calc(100vh-420px)] min-h-[300px]">
                <div className="p-3 space-y-3">
                  {Object.keys(sampleData).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No sample data available
                    </p>
                  ) : (
                    Object.entries(sampleData).map(([key, value]) => (
                      <SampleField
                        key={key}
                        fieldKey={key}
                        value={value}
                        onChange={updateSampleField}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* No template selected — prompt */}
          {!selectedTemplate && (
            <div className="lg:col-span-1" />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sample data field component
// ---------------------------------------------------------------------------

function SampleField({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: string;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}) {
  // Humanize the field key
  const label = fieldKey
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();

  // Determine field type from key name and value
  const isEnum = isEnumField(fieldKey, value);
  const isArray = Array.isArray(value);
  const isObject = typeof value === "object" && value !== null && !isArray;
  const isBoolean = typeof value === "boolean";

  if (isEnum) {
    const options = getEnumOptions(fieldKey);
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          {label}
        </label>
        <Select
          value={String(value)}
          onValueChange={(v) => onChange(fieldKey, v)}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isBoolean) {
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          {label}
        </label>
        <Select
          value={String(value)}
          onValueChange={(v) => onChange(fieldKey, v === "true")}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isArray || isObject) {
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          {label}
          <span className="ml-1 text-[10px] opacity-60">
            ({isArray ? "array" : "object"})
          </span>
        </label>
        <Textarea
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onChange(fieldKey, JSON.parse(e.target.value));
            } catch {
              // Allow invalid JSON while typing — will be validated on refresh
            }
          }}
          className="font-mono text-xs min-h-[80px]"
          rows={4}
        />
      </div>
    );
  }

  // Default: text input
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        {label}
      </label>
      <Input
        value={String(value ?? "")}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="h-8 text-xs"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enum detection helpers
// ---------------------------------------------------------------------------

const ENUM_FIELDS: Record<string, string[]> = {
  urgency: ["normal", "urgent", "critical"],
  status: ["approved", "rejected", "pending", "in_review"],
  priority: ["low", "normal", "high", "urgent"],
  type: ["consultation", "service", "general", "complaint"],
  role: ["worker", "employer", "hr", "general"],
  language: ["en", "bn"],
  frequency: ["daily", "weekly", "monthly"],
  plan: ["free", "basic", "premium", "enterprise"],
};

function isEnumField(key: string, value: unknown): boolean {
  if (typeof value !== "string") return false;
  const lowerKey = key.toLowerCase();
  return Object.keys(ENUM_FIELDS).some((enumKey) => lowerKey.includes(enumKey));
}

function getEnumOptions(key: string): string[] {
  const lowerKey = key.toLowerCase();
  for (const [enumKey, options] of Object.entries(ENUM_FIELDS)) {
    if (lowerKey.includes(enumKey)) return options;
  }
  return [];
}
