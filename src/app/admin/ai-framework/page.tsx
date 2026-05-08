"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X as XIcon,
  Activity,
  FileText,
  MessageSquare,
  Zap,
  Database,
} from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { ChatRecordsTab } from "@/components/admin/ai-framework/chat-records-tab";
import { CacheManagementTab } from "@/components/admin/ai-framework/cache-management-tab";
import { AnalyticsTab } from "@/components/admin/ai-framework/analytics-tab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

// ── Tier Config Tab ────────────────────────────────────────────
// Single source of truth for the chat product: gating + pricing.
// Replaces the deprecated Supabase `tier_config` table.

interface TierEditState {
  label: string;
  tierType: "free" | "paid";
  requiresAccount: boolean;
  dailyRequestLimit: number;
  rateLimit: number;
  fileUploadAllowed: boolean;
  crossDomainAllowed: boolean;
  advisoryAllowed: boolean;
  price: number;
  stripeProductId: string;
  isActive: boolean;
}

function TierConfigTab() {
  const configs = useQuery(api.tierConfig.list);
  const upsert = useMutation(api.tierConfig.upsert);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [edit, setEdit] = useState<TierEditState | null>(null);
  const [saving, setSaving] = useState(false);

  if (!configs) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const startEdit = (config: (typeof configs)[number]) => {
    setEditingTier(config.tier);
    setEdit({
      label: config.label,
      tierType: config.tierType ?? (config.tier === "mini" || config.tier === "max" ? "paid" : "free"),
      requiresAccount: config.requiresAccount ?? config.tier !== "free_guest",
      dailyRequestLimit: config.dailyRequestLimit,
      rateLimit: config.rateLimit,
      fileUploadAllowed: config.fileUploadAllowed,
      crossDomainAllowed: config.crossDomainAllowed,
      advisoryAllowed: config.advisoryAllowed,
      price: config.price ?? 0,
      stripeProductId: config.stripeProductId ?? "",
      isActive: config.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingTier(null);
    setEdit(null);
  };

  const saveEdit = async (config: (typeof configs)[number]) => {
    if (!edit) return;
    setSaving(true);
    try {
      await upsert({
        tier: config.tier,
        label: edit.label,
        tierType: edit.tierType,
        requiresAccount: edit.requiresAccount,
        allowedIntents: config.allowedIntents,
        dailyRequestLimit: Number(edit.dailyRequestLimit),
        rateLimit: Number(edit.rateLimit),
        fileUploadAllowed: edit.fileUploadAllowed,
        crossDomainAllowed: edit.crossDomainAllowed,
        advisoryAllowed: edit.advisoryAllowed,
        price: edit.tierType === "paid" ? Number(edit.price) : undefined,
        stripeProductId: edit.stripeProductId.trim() || null,
        isActive: edit.isActive,
      });
      cancelEdit();
    } finally {
      setSaving(false);
    }
  };

  const tierOrder = ["free_guest", "free_subscribed", "mini", "max"];
  const sorted = [...configs].sort(
    (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  );

  return (
    <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tier</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Account?</TableHead>
            <TableHead className="text-right">Daily</TableHead>
            <TableHead className="text-right">RPM</TableHead>
            <TableHead>Intents</TableHead>
            <TableHead className="text-center">Files</TableHead>
            <TableHead className="text-right">Price (৳/mo)</TableHead>
            <TableHead>Stripe ID</TableHead>
            <TableHead className="text-center">Active</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((config) => {
            const isEditing = editingTier === config.tier;
            const draft = isEditing && edit ? edit : null;
            const tierType = config.tierType ?? (config.tier === "mini" || config.tier === "max" ? "paid" : "free");
            const requiresAccount = config.requiresAccount ?? config.tier !== "free_guest";
            return (
              <TableRow key={config._id}>
                <TableCell>
                  {draft ? (
                    <Input
                      value={draft.label}
                      onChange={(e) => setEdit({ ...draft, label: e.target.value })}
                      className="h-7 text-sm"
                    />
                  ) : (
                    <p className="font-medium text-sm">{config.label}</p>
                  )}
                </TableCell>
                <TableCell>
                  {draft ? (
                    <select
                      value={draft.tierType}
                      onChange={(e) =>
                        setEdit({ ...draft, tierType: e.target.value as "free" | "paid" })
                      }
                      className="h-7 text-xs rounded border bg-background px-1"
                    >
                      <option value="free">free</option>
                      <option value="paid">paid</option>
                    </select>
                  ) : (
                    <Badge
                      variant={tierType === "paid" ? "default" : "secondary"}
                      className="text-[10px] uppercase tracking-wider"
                    >
                      {tierType}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {draft ? (
                    <BoolToggle
                      value={draft.requiresAccount}
                      onChange={(v) => setEdit({ ...draft, requiresAccount: v })}
                    />
                  ) : (
                    <BoolPill value={requiresAccount} />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {draft ? (
                    <Input
                      type="number"
                      value={draft.dailyRequestLimit}
                      onChange={(e) =>
                        setEdit({ ...draft, dailyRequestLimit: Number(e.target.value) || 0 })
                      }
                      className="w-20 h-7 text-xs text-right ml-auto"
                    />
                  ) : (
                    <span className="text-sm font-jetbrains tabular-nums">
                      {config.dailyRequestLimit === -1 ? "∞" : config.dailyRequestLimit}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {draft ? (
                    <Input
                      type="number"
                      value={draft.rateLimit}
                      onChange={(e) =>
                        setEdit({ ...draft, rateLimit: Number(e.target.value) || 0 })
                      }
                      className="w-16 h-7 text-xs text-right ml-auto"
                    />
                  ) : (
                    <span className="text-sm font-jetbrains tabular-nums">{config.rateLimit}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {config.allowedIntents.map((intent) => (
                      <Badge
                        key={intent}
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0"
                      >
                        {intent}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {draft ? (
                    <BoolToggle
                      value={draft.fileUploadAllowed}
                      onChange={(v) => setEdit({ ...draft, fileUploadAllowed: v })}
                    />
                  ) : (
                    <BoolPill value={config.fileUploadAllowed} />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {draft ? (
                    <Input
                      type="number"
                      min={0}
                      value={draft.price}
                      onChange={(e) =>
                        setEdit({ ...draft, price: Number(e.target.value) || 0 })
                      }
                      className="w-20 h-7 text-xs text-right ml-auto"
                      disabled={draft.tierType === "free"}
                    />
                  ) : (
                    <span className="text-sm font-jetbrains tabular-nums">
                      {config.price ? config.price : "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {draft ? (
                    <Input
                      value={draft.stripeProductId}
                      placeholder="—"
                      onChange={(e) => setEdit({ ...draft, stripeProductId: e.target.value })}
                      className="h-7 text-xs font-jetbrains"
                    />
                  ) : (
                    <span className="text-xs font-jetbrains text-muted-foreground">
                      {config.stripeProductId ?? "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {draft ? (
                    <BoolToggle
                      value={draft.isActive}
                      onChange={(v) => setEdit({ ...draft, isActive: v })}
                    />
                  ) : (
                    <BoolPill value={config.isActive} />
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        disabled={saving}
                        onClick={() => saveEdit(config)}
                        aria-label="Save"
                      >
                        <Save className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={cancelEdit}
                        aria-label="Cancel"
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 ml-auto"
                      onClick={() => startEdit(config)}
                      aria-label="Edit"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function BoolPill({ value }: { value: boolean }) {
  return (
    <span
      className={
        "inline-block h-2 w-2 rounded-full " +
        (value ? "bg-emerald-500" : "bg-zinc-400/50")
      }
      aria-label={value ? "yes" : "no"}
    />
  );
}

function BoolToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={
        "inline-flex h-5 w-9 items-center rounded-full transition-colors " +
        (value ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700")
      }
    >
      <span
        className={
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform " +
          (value ? "translate-x-4" : "translate-x-0.5")
        }
      />
    </button>
  );
}

// ── Templates Tab ──────────────────────────────────────────────

function TemplatesTab() {
  const templates = useQuery(api.templates.list, {});
  const createTemplate = useMutation(api.templates.create);
  const updateTemplate = useMutation(api.templates.update);
  const removeTemplate = useMutation(api.templates.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"templates"> | null>(null);
  const [form, setForm] = useState({
    domain: "",
    docType: "",
    title: "",
    titleBn: "",
    content: "",
    version: "1.0",
    reviewedBy: "",
  });

  const resetForm = () => {
    setForm({ domain: "", docType: "", title: "", titleBn: "", content: "", version: "1.0", reviewedBy: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.domain || !form.docType || !form.title || !form.content) return;
    if (editingId) {
      await updateTemplate({ id: editingId, ...form });
    } else {
      await createTemplate(form);
    }
    resetForm();
  };

  const startEdit = (t: NonNullable<typeof templates>[number]) => {
    setEditingId(t._id);
    setForm({
      domain: t.domain,
      docType: t.docType,
      title: t.title,
      titleBn: t.titleBn || "",
      content: t.content,
      version: t.version,
      reviewedBy: t.reviewedBy,
    });
    setShowForm(true);
  };

  if (!templates) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
        <Button
          size="sm"
          className="rounded-full gap-1.5"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="size-3.5" />
          New Template
        </Button>
      </div>

      {showForm && (
        <div className="lf-card" style={{ padding: "var(--s-4)" }}>
          <p
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: 16,
              fontWeight: 500,
              color: "var(--ink)",
              marginBottom: "var(--s-3)",
            }}
          >
            {editingId ? "Edit Template" : "New Template"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Domain (e.g., termination)"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
            />
            <Input
              placeholder="Doc Type (e.g., policy, notice)"
              value={form.docType}
              onChange={(e) => setForm({ ...form, docType: e.target.value })}
            />
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              placeholder="Version"
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
            />
          </div>
          <Input
            placeholder="Reviewed By"
            value={form.reviewedBy}
            onChange={(e) => setForm({ ...form, reviewedBy: e.target.value })}
          />
          <Textarea
            placeholder="Template content (Markdown)"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="min-h-[200px] font-mono text-xs"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={resetForm}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              {editingId ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      )}

      <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
        {templates.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No templates yet. Create one to speed up drafting responses.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t._id}>
                  <TableCell className="font-medium text-sm">{t.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {t.domain}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.docType}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    v{t.version}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        t.isActive
                          ? "bg-emerald-500/10 text-emerald-600 text-[10px]"
                          : "bg-gray-100 text-gray-500 text-[10px]"
                      }
                    >
                      {t.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => startEdit(t)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive"
                        onClick={() => removeTemplate({ id: t._id })}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function AIFrameworkPage() {
  const [activeTab, setActiveTab] = useState("tiers");

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-5xl space-y-3 sm:space-y-6 relative">
        {/* Hero */}
        <motion.section
          variants={heroStagger}
          initial="hidden"
          animate="show"
          style={{ paddingBottom: "var(--s-3)" }}
        >
          <motion.div variants={fadeUp} className="lf-kicker">
            <span className="lf-kicker-mark">§ 3.2</span>
            Admin · AI Framework
          </motion.div>
          <motion.h1
            variants={fadeUp}
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              margin: "var(--s-3) 0 var(--s-3)",
            }}
          >
            Model orchestration{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
              spec.
            </em>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="lf-section-deck"
            style={{ maxWidth: 640 }}
          >
            Tier configuration, prompt templates, cache policy, chat records, and
            delivery analytics — one clause book for the AI layer.
          </motion.p>
        </motion.section>

        <div className="-mx-4 px-4 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="tiers">
                <Zap className="size-3.5 mr-1.5" />
                Tier Config
              </TabsTrigger>
              <TabsTrigger value="chat-records">
                <MessageSquare className="size-3.5 mr-1.5" />
                Chat Records
              </TabsTrigger>
              <TabsTrigger value="cache">
                <Database className="size-3.5 mr-1.5" />
                Cache
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <Activity className="size-3.5 mr-1.5" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="templates">
                <FileText className="size-3.5 mr-1.5" />
                Templates
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
        >
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "tiers" && <TierConfigTab />}
          {activeTab === "templates" && <TemplatesTab />}
          {activeTab === "chat-records" && <ChatRecordsTab />}
          {activeTab === "cache" && <CacheManagementTab />}
        </motion.div>
      </div>
    </MotionConfig>
  );
}
