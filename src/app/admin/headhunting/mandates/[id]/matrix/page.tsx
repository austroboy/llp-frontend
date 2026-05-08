"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  GripVertical,
  Save,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// --- Motion ---

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

// --- Types ---

type Category = "technical" | "experience" | "education" | "soft_skill" | "cultural" | "commercial" | "other";
type Priority = "must_have" | "strong_preference" | "nice_to_have";

interface Requirement {
  id: string;
  category: Category;
  label: string;
  description?: string;
  priority: Priority;
  weight: number;
  sourceField?: string;
}

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: "technical", label: "Technical", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "experience", label: "Experience", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "education", label: "Education", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "soft_skill", label: "Soft Skill", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "cultural", label: "Cultural", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  { value: "commercial", label: "Commercial", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
];

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: "must_have", label: "Must Have", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "strong_preference", label: "Strong Preference", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "nice_to_have", label: "Nice to Have", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
];

function getCategoryColor(cat: Category) {
  return CATEGORIES.find((c) => c.value === cat)?.color ?? "";
}

function getPriorityColor(pri: Priority) {
  return PRIORITIES.find((p) => p.value === pri)?.color ?? "";
}

// --- Main Page ---

export default function RequirementMatrixPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const params = useParams();
  const mandateId = params.id as string;

  const mandate = useQuery(
    api.headhunting.mandates.getById,
    { id: mandateId as Id<"htMandates"> }
  );
  const matrix = useQuery(
    api.headhunting.requirementMatrix.getByMandate,
    { mandateId: mandateId as Id<"htMandates"> }
  );
  const blueprint = useQuery(
    api.headhunting.blueprints.getLatestByMandate,
    { mandateId: mandateId as Id<"htMandates"> }
  );

  const createMatrix = useMutation(api.headhunting.requirementMatrix.create);
  const updateMatrix = useMutation(api.headhunting.requirementMatrix.update);
  const deleteMatrix = useMutation(api.headhunting.requirementMatrix.remove);
  const generateFromBlueprint = useMutation(api.headhunting.requirementMatrix.generateFromBlueprint);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  if (mandate === undefined || matrix === undefined) {
    return (
      <div
        style={{
          padding: "var(--s-7) var(--s-4)",
          textAlign: "center",
          fontFamily: "var(--lf-mono)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-4)",
        }}
      >
        {t("admin.loading")}
      </div>
    );
  }
  if (!mandate) {
    return (
      <div
        style={{
          padding: "var(--s-7) var(--s-4)",
          textAlign: "center",
          fontFamily: "var(--lf-mono)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-4)",
        }}
      >
        Mandate not found.
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!blueprint) {
      toast.error("No blueprint found for this mandate. Create a blueprint first.");
      return;
    }
    setGenerating(true);
    try {
      await generateFromBlueprint({
        mandateId: mandateId as Id<"htMandates">,
        blueprintId: blueprint._id,
        createdBy: user?.id ?? "unknown",
      });
      toast.success("Requirement matrix generated from blueprint");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to generate matrix");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      {/* -- Hero ---------------------------------------------- */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp}>
          <Link
            href={`/admin/headhunting/mandates/${mandateId}`}
            className="lf-meta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-4)",
              textDecoration: "none",
              marginBottom: "var(--s-3)",
            }}
          >
            <ArrowLeft className="size-3.5" />
            Back to Mandate
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ 2.2</span>
          Admin · Headhunting · Requirement Matrix
        </motion.div>

        <motion.div
          variants={fadeUp}
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "var(--s-4)",
            flexWrap: "wrap",
            marginTop: "var(--s-3)",
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: "clamp(34px, 4.4vw, 48px)",
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                margin: "0 0 var(--s-2)",
              }}
            >
              Requirement{" "}
              <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
                Matrix.
              </em>
            </h1>
            <p
              className="lf-section-deck"
              style={{ margin: 0, maxWidth: 640 }}
            >
              {mandate.rawTitle}
            </p>
          </div>
          {!matrix && blueprint && (
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="gap-1.5"
            >
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate from Blueprint
            </Button>
          )}
          {!matrix && !blueprint && (
            <CreateEmptyMatrix
              mandateId={mandateId as Id<"htMandates">}
              userId={user?.id ?? "unknown"}
              createMatrix={createMatrix}
            />
          )}
        </motion.div>
      </motion.section>

      {/* -- Matrix Editor ------------------------------------- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        {matrix ? (
          <motion.div variants={fadeUp}>
            <MatrixEditor
              matrix={matrix}
              updateMatrix={updateMatrix}
              deleteMatrix={deleteMatrix}
              userId={user?.id ?? "unknown"}
              saving={saving}
              setSaving={setSaving}
            />
          </motion.div>
        ) : (
          <motion.div
            variants={fadeUp}
            style={{
              background: "var(--glass-bg)",
              border: "1px dashed var(--glass-border)",
              borderRadius: "var(--r-lg)",
              padding: "var(--s-7) var(--s-4)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 16,
                color: "var(--ink-2)",
                margin: 0,
              }}
            >
              No requirement matrix yet.
            </p>
            <p
              className="lf-meta"
              style={{
                marginTop: 6,
                color: "var(--ink-4)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {blueprint
                ? "Click 'Generate from Blueprint' to auto-create requirements from the role blueprint."
                : "Create a blueprint first, or add an empty matrix to start from scratch."}
            </p>
          </motion.div>
        )}
      </motion.section>
    </MotionConfig>
  );
}

// --- Create Empty Matrix ---

function CreateEmptyMatrix({
  mandateId,
  userId,
  createMatrix,
}: {
  mandateId: Id<"htMandates">;
  userId: string;
  createMatrix: ReturnType<typeof useMutation>;
}) {
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createMatrix({
        mandateId,
        requirements: [],
        createdBy: userId,
      });
      toast.success("Empty matrix created");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create matrix");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleCreate} disabled={creating} className="gap-1.5">
      {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      Create Empty Matrix
    </Button>
  );
}

// --- Matrix Editor ---

function MatrixEditor({
  matrix,
  updateMatrix,
  deleteMatrix,
  userId,
  saving,
  setSaving,
}: {
  matrix: { _id: Id<"htRequirementMatrix">; requirements: Requirement[]; updatedAt: number };
  updateMatrix: ReturnType<typeof useMutation>;
  deleteMatrix: ReturnType<typeof useMutation>;
  userId: string;
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
  const [requirements, setRequirements] = useState<Requirement[]>(matrix.requirements);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const updateReqs = (newReqs: Requirement[]) => {
    setRequirements(newReqs);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMatrix({
        id: matrix._id,
        requirements,
        updatedBy: userId,
      });
      setHasChanges(false);
      toast.success("Matrix saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this requirement matrix? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteMatrix({ id: matrix._id });
      toast.success("Matrix deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveRequirement = (reqId: string) => {
    updateReqs(requirements.filter((r) => r.id !== reqId));
  };

  const handleUpdateRequirement = (reqId: string, updates: Partial<Requirement>) => {
    updateReqs(
      requirements.map((r) => (r.id === reqId ? { ...r, ...updates } : r))
    );
    setEditingId(null);
  };

  const handleAddRequirement = (req: Requirement) => {
    updateReqs([...requirements, req]);
    setShowAddDialog(false);
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const newReqs = [...requirements];
    [newReqs[idx - 1], newReqs[idx]] = [newReqs[idx], newReqs[idx - 1]];
    updateReqs(newReqs);
  };

  const handleMoveDown = (idx: number) => {
    if (idx === requirements.length - 1) return;
    const newReqs = [...requirements];
    [newReqs[idx], newReqs[idx + 1]] = [newReqs[idx + 1], newReqs[idx]];
    updateReqs(newReqs);
  };

  // Group by priority
  const mustHaves = requirements.filter((r) => r.priority === "must_have");
  const strongPrefs = requirements.filter((r) => r.priority === "strong_preference");
  const niceToHaves = requirements.filter((r) => r.priority === "nice_to_have");

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {requirements.length} requirements
          </Badge>
          <Badge variant="outline" className="text-xs">
            {mustHaves.length} must-have
          </Badge>
          <Badge variant="outline" className="text-xs">
            {strongPrefs.length} strong pref
          </Badge>
          <Badge variant="outline" className="text-xs">
            {niceToHaves.length} nice-to-have
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="gap-1 text-xs"
          >
            <Plus className="size-3.5" />
            Add Requirement
          </Button>
          {hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1 text-xs"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save Changes
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="gap-1 text-xs text-destructive hover:text-destructive"
          >
            {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Delete Matrix
          </Button>
        </div>
      </div>

      {/* Requirements grouped by priority */}
      {requirements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">No requirements yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {mustHaves.length > 0 && (
            <PriorityGroup
              title="Must Have"
              color="border-red-200 dark:border-red-900/50"
              titleColor="text-red-700 dark:text-red-400"
              requirements={mustHaves}
              allRequirements={requirements}
              editingId={editingId}
              setEditingId={setEditingId}
              onUpdate={handleUpdateRequirement}
              onRemove={handleRemoveRequirement}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          )}
          {strongPrefs.length > 0 && (
            <PriorityGroup
              title="Strong Preference"
              color="border-amber-200 dark:border-amber-900/50"
              titleColor="text-amber-700 dark:text-amber-400"
              requirements={strongPrefs}
              allRequirements={requirements}
              editingId={editingId}
              setEditingId={setEditingId}
              onUpdate={handleUpdateRequirement}
              onRemove={handleRemoveRequirement}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          )}
          {niceToHaves.length > 0 && (
            <PriorityGroup
              title="Nice to Have"
              color="border-green-200 dark:border-green-900/50"
              titleColor="text-green-700 dark:text-green-400"
              requirements={niceToHaves}
              allRequirements={requirements}
              editingId={editingId}
              setEditingId={setEditingId}
              onUpdate={handleUpdateRequirement}
              onRemove={handleRemoveRequirement}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          )}
        </div>
      )}

      {/* Add Requirement Dialog */}
      <AddRequirementDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddRequirement}
        existingIds={requirements.map((r) => r.id)}
      />
    </div>
  );
}

// --- Priority Group ---

function PriorityGroup({
  title,
  color,
  titleColor,
  requirements,
  allRequirements,
  editingId,
  setEditingId,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  title: string;
  color: string;
  titleColor: string;
  requirements: Requirement[];
  allRequirements: Requirement[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<Requirement>) => void;
  onRemove: (id: string) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
}) {
  return (
    <div className={cn("rounded-lg border bg-card", color)}>
      <div className="px-4 py-2.5 border-b border-inherit">
        <h3 className={cn("text-sm font-semibold", titleColor)}>{title}</h3>
      </div>
      <div className="divide-y divide-border">
        {requirements.map((req) => {
          const globalIdx = allRequirements.findIndex((r) => r.id === req.id);
          return editingId === req.id ? (
            <EditRequirementRow
              key={req.id}
              requirement={req}
              onSave={(updates) => onUpdate(req.id, updates)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <RequirementRow
              key={req.id}
              requirement={req}
              onEdit={() => setEditingId(req.id)}
              onRemove={() => onRemove(req.id)}
              onMoveUp={() => onMoveUp(globalIdx)}
              onMoveDown={() => onMoveDown(globalIdx)}
              isFirst={globalIdx === 0}
              isLast={globalIdx === allRequirements.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
}

// --- Requirement Row ---

function RequirementRow({
  requirement,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  requirement: Requirement;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 group hover:bg-muted/30 transition-colors">
      <div className="flex flex-col gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-opacity"
          aria-label="Move up"
        >
          <GripVertical className="size-3 rotate-180" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-opacity"
          aria-label="Move down"
        >
          <GripVertical className="size-3" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono text-muted-foreground">{requirement.id}</span>
          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", getCategoryColor(requirement.category))}>
            {CATEGORIES.find((c) => c.value === requirement.category)?.label}
          </Badge>
          {requirement.sourceField && (
            <span className="text-[10px] text-muted-foreground/60">
              from: {requirement.sourceField}
            </span>
          )}
        </div>
        <p className="text-sm font-medium truncate">{requirement.label}</p>
        {requirement.description && (
          <p className="text-xs text-muted-foreground truncate">{requirement.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Weight</p>
          <p className="text-sm font-bold">{requirement.weight}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Edit Requirement Row (inline) ---

function EditRequirementRow({
  requirement,
  onSave,
  onCancel,
}: {
  requirement: Requirement;
  onSave: (updates: Partial<Requirement>) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(requirement.label);
  const [description, setDescription] = useState(requirement.description ?? "");
  const [category, setCategory] = useState<Category>(requirement.category);
  const [priority, setPriority] = useState<Priority>(requirement.priority);
  const [weight, setWeight] = useState(String(requirement.weight));

  const handleSave = () => {
    const w = parseInt(weight, 10);
    if (!label.trim()) { toast.error("Label is required"); return; }
    if (isNaN(w) || w < 1 || w > 10) { toast.error("Weight must be 1-10"); return; }
    onSave({
      label: label.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      weight: w,
    });
  };

  return (
    <div className="px-4 py-3 bg-muted/20 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Label</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="text-sm h-8"
            autoFocus
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-sm min-h-[60px]"
            rows={2}
          />
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Weight (1-10)</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="text-sm h-8"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1 text-xs h-7">
          <X className="size-3" /> Cancel
        </Button>
        <Button size="sm" onClick={handleSave} className="gap-1 text-xs h-7">
          <Check className="size-3" /> Save
        </Button>
      </div>
    </div>
  );
}

// --- Add Requirement Dialog ---

function AddRequirementDialog({
  open,
  onClose,
  onAdd,
  existingIds,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (req: Requirement) => void;
  existingIds: string[];
}) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("experience");
  const [priority, setPriority] = useState<Priority>("must_have");
  const [weight, setWeight] = useState("7");

  const generateId = () => {
    let counter = existingIds.length + 1;
    let id = `REQ-${String(counter).padStart(3, "0")}`;
    while (existingIds.includes(id)) {
      counter++;
      id = `REQ-${String(counter).padStart(3, "0")}`;
    }
    return id;
  };

  const handleAdd = () => {
    const w = parseInt(weight, 10);
    if (!label.trim()) { toast.error("Label is required"); return; }
    if (isNaN(w) || w < 1 || w > 10) { toast.error("Weight must be 1-10"); return; }
    onAdd({
      id: generateId(),
      label: label.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      weight: w,
    });
    // Reset form
    setLabel("");
    setDescription("");
    setCategory("experience");
    setPriority("must_have");
    setWeight("7");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Add Requirement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. 10+ years plant commissioning"
              className="text-sm"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              className="text-sm"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Weight (1-10)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="text-sm w-24"
            />
            <p className="text-[10px] text-muted-foreground mt-1">10 = most important, 1 = minor</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleAdd} className="gap-1">
            <Plus className="size-3.5" /> Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
