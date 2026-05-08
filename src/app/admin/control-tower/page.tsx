"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, MotionConfig, type Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};
import {
  BarChart3,
  Target,
  Milestone as MilestoneIcon,
  CheckSquare,
  Users,
  AlertTriangle,
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
} from "lucide-react";

export default function ControlTowerPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const overview = useQuery(api.controlTower.getOverview);
  const workstreams = useQuery(api.controlTower.listWorkstreams, { activeOnly: true });
  const seedWorkstreams = useMutation(api.controlTower.seedWorkstreams);

  // Seed workstreams if empty
  const handleSeed = async () => {
    await seedWorkstreams();
  };

  return (
    <MotionConfig reducedMotion="user">
      {/* -- Hero ------------------------------------------------ */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-5)" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "var(--s-4)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <motion.div variants={fadeUp} className="lf-kicker">
              <span className="lf-kicker-mark">§ 1.1</span>
              Admin · Control Tower
            </motion.div>
            <motion.h1
              variants={fadeUp}
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: "clamp(32px, 4.4vw, 48px)",
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                margin: "var(--s-3) 0 var(--s-3)",
              }}
            >
              Operating <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>dossier.</em>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="lf-section-deck"
              style={{ maxWidth: "60ch" }}
            >
              Objectives, KPIs, milestones, tasks, team capacity, and AI risk — one operating board, filed and timestamped.
            </motion.p>
          </div>
          {workstreams && workstreams.length === 0 && (
            <motion.div variants={fadeUp}>
              <button onClick={handleSeed} className="lf-cta lf-cta--primary">
                <Zap size={14} style={{ marginRight: 6 }} />
                Initialize Workstreams
              </button>
            </motion.div>
          )}
        </div>
      </motion.section>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="objectives" className="gap-1.5 text-xs">
            <Target className="size-3.5" /> Objectives
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <BarChart3 className="size-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="kpis" className="gap-1.5 text-xs">
            <Target className="size-3.5" /> KPIs
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-1.5 text-xs">
            <MilestoneIcon className="size-3.5" /> Milestones
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 text-xs">
            <CheckSquare className="size-3.5" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5 text-xs">
            <Users className="size-3.5" /> Team
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-1.5 text-xs">
            <AlertTriangle className="size-3.5" /> AI Risk
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs">
            <Zap className="size-3.5" /> Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="objectives"><ObjectivesTab /></TabsContent>
        <TabsContent value="overview"><OverviewTab overview={overview} /></TabsContent>
        <TabsContent value="kpis"><KpisTab /></TabsContent>
        <TabsContent value="milestones"><MilestonesTab /></TabsContent>
        <TabsContent value="tasks"><TasksTab /></TabsContent>
        <TabsContent value="team"><TeamTab /></TabsContent>
        <TabsContent value="risk"><RiskTab /></TabsContent>
        <TabsContent value="activity"><ActivityTab /></TabsContent>
      </Tabs>
    </MotionConfig>
  );
}

// ── Tab 0: Objectives ──

function ObjectivesTab() {
  const objectives = useQuery(api.controlTower.listObjectives);
  const staff = useQuery(api.controlTower.listTeamMembers, { activeOnly: true });
  const createObjective = useMutation(api.controlTower.createObjective);
  const updateObjective = useMutation(api.controlTower.updateObjective);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", successStatement: "", executiveOwnerId: "", executiveOwnerName: "", targetPhase: "" });

  if (!objectives) return <Loading />;
  const canAdd = objectives.length < 5;

  const CT_STATUSES = ["not_started","in_progress","awaiting_input","awaiting_review","blocked","completed","dropped"] as const;
  const statusColors: Record<string, string> = {
    not_started: "bg-gray-100 text-gray-600",
    in_progress: "bg-blue-100 text-blue-700",
    awaiting_input: "bg-yellow-100 text-yellow-700",
    awaiting_review: "bg-purple-100 text-purple-700",
    blocked: "bg-red-100 text-red-700",
    completed: "bg-green-100 text-green-700",
    dropped: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Launch Objectives ({objectives.length}/5)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Top of the hierarchy. Every KPI, Milestone, and Task traces back to an objective.</p>
        </div>
        {canAdd && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="size-3 mr-1" /> Add Objective
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Objective name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Target phase (e.g. Phase 1 — Pre-Launch) *" value={form.targetPhase} onChange={e => setForm(f => ({ ...f, targetPhase: e.target.value }))} />
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-muted-foreground">Success statement — what does achieving this look like?</label>
              <Textarea placeholder="e.g. Scout network is live with 20+ verified scouts and first mandate placed" value={form.successStatement} onChange={e => setForm(f => ({ ...f, successStatement: e.target.value }))} rows={2} className="text-xs" />
            </div>
            <Select value={form.executiveOwnerId} onValueChange={v => {
              const m = staff?.find(s => s.clerkId === v);
              setForm(f => ({ ...f, executiveOwnerId: v, executiveOwnerName: m?.name || "" }));
            }}>
              <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Executive owner" /></SelectTrigger>
              <SelectContent>
                {(staff ?? []).map(m => <SelectItem key={m.clerkId} value={m.clerkId} className="text-xs">{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={async () => {
            if (!form.name || !form.targetPhase) { toast.error("Name and phase required"); return; }
            await createObjective({ name: form.name, successStatement: form.successStatement, targetPhase: form.targetPhase, executiveOwnerId: form.executiveOwnerId || undefined, executiveOwnerName: form.executiveOwnerName || undefined });
            setForm({ name: "", successStatement: "", executiveOwnerId: "", executiveOwnerName: "", targetPhase: "" });
            setShowForm(false);
            toast.success("Objective created");
          }}>Create Objective</Button>
        </div>
      )}

      <div className="space-y-3">
        {objectives.map((obj, idx) => (
          <div key={obj._id} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{obj.name}</p>
                  {obj.successStatement && <p className="text-xs text-muted-foreground mt-0.5">{obj.successStatement}</p>}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{obj.targetPhase}</Badge>
                    {obj.executiveOwnerName && <span className="text-[10px] text-muted-foreground">Owner: {obj.executiveOwnerName}</span>}
                  </div>
                </div>
              </div>
              <Select value={obj.status} onValueChange={v => updateObjective({ id: obj._id, status: v as typeof CT_STATUSES[number] })}>
                <SelectTrigger className={cn("h-7 text-[10px] w-36 shrink-0", statusColors[obj.status])}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CT_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {objectives.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No objectives yet. Add your first launch objective above.<br />
            <span className="text-xs">Everything — KPIs, milestones, tasks — traces back to an objective.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab 1: Overview ──

function OverviewTab({ overview }: { overview: Record<string, number> | null | undefined }) {
  if (!overview) return <Loading />;
  const o = overview;

  const cards = [
    { label: "Workstreams", value: o.workstreamCount, color: "" },
    { label: "KPIs", value: o.kpiCount, color: "" },
    { label: "Milestones", value: `${o.completedMilestones}/${o.totalMilestones}`, color: "" },
    { label: "Tasks Done", value: `${o.completedTasks}/${o.totalTasks}`, color: "" },
    { label: "Overdue Tasks", value: o.overdueTasks, color: o.overdueTasks > 0 ? "text-red-600" : "text-green-600" },
    { label: "Blocked", value: o.blockedTasks, color: o.blockedTasks > 0 ? "text-amber-600" : "text-green-600" },
    { label: "Critical KPIs", value: o.criticalKpis, color: o.criticalKpis > 0 ? "text-red-600" : "text-green-600" },
    { label: "Stale Tasks", value: o.staleTasks, color: o.staleTasks > 0 ? "text-amber-600" : "" },
    { label: "Team", value: o.teamCount, color: "" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border p-3 text-center">
          <div className={cn("text-2xl font-bold", c.color)}>{c.value}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Tab 2: KPIs ──

function KpisTab() {
  const kpis = useQuery(api.controlTower.listKpis, {});
  const workstreams = useQuery(api.controlTower.listWorkstreams, { activeOnly: true });
  const objectives = useQuery(api.controlTower.listObjectives);
  const createKpi = useMutation(api.controlTower.createKpi);
  const updateKpi = useMutation(api.controlTower.updateKpi);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ objectiveId: "", workstreamId: "", title: "", metric: "", kpiType: "readiness", targetValue: "", actualValue: "0", unit: "", period: "monthly", targetDate: "", cadence: "", sourceOfTruth: "", ownerName: "" });

  if (!kpis || !workstreams) return <Loading />;

  const handleCreate = async () => {
    if (!form.workstreamId || !form.title || !form.metric || !form.targetValue) return;
    await createKpi({
      objectiveId: form.objectiveId ? form.objectiveId as Id<"ctLaunchObjectives"> : undefined,
      workstreamId: form.workstreamId as Id<"ctWorkstreams">,
      title: form.title,
      metric: form.metric,
      kpiType: (form.kpiType || "readiness") as "readiness" | "outcome",
      targetValue: Number(form.targetValue),
      actualValue: Number(form.actualValue) || 0,
      unit: form.unit || undefined,
      period: form.period as "weekly" | "monthly" | "quarterly",
      targetDate: form.targetDate ? new Date(form.targetDate).getTime() : undefined,
      cadence: form.cadence || undefined,
      sourceOfTruth: form.sourceOfTruth || undefined,
      ownerName: form.ownerName || undefined,
    });
    setForm({ objectiveId: "", workstreamId: "", title: "", metric: "", kpiType: "readiness", targetValue: "", actualValue: "0", unit: "", period: "monthly", targetDate: "", cadence: "", sourceOfTruth: "", ownerName: "" });
    setShowForm(false);
  };

  const riskColors: Record<string, string> = {
    on_track: "bg-green-100 text-green-700",
    at_risk: "bg-amber-100 text-amber-700",
    behind: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between">
        <h3 className="text-sm font-medium">{kpis.length} KPIs</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="size-3 mr-1" /> Add KPI
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <div className="grid sm:grid-cols-2 gap-3">
            <Select value={form.objectiveId} onValueChange={v => setForm(f => ({ ...f, objectiveId: v }))}>
              <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Link to Objective (recommended)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">No objective</SelectItem>
                {(objectives ?? []).map(o => <SelectItem key={o._id} value={o._id} className="text-xs">{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.workstreamId} onValueChange={(v) => setForm((f) => ({ ...f, workstreamId: v }))}>
              <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Workstream *" /></SelectTrigger>
              <SelectContent>
                {workstreams.map((w) => <SelectItem key={w._id} value={w._id} className="text-xs">{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.kpiType} onValueChange={v => setForm(f => ({ ...f, kpiType: v }))}>
              <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="readiness" className="text-xs">Readiness KPI</SelectItem>
                <SelectItem value="outcome" className="text-xs">Outcome KPI</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="KPI Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Input placeholder="Metric (e.g. Scouts onboarded)" value={form.metric} onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))} />
            <Input placeholder="Target value *" type="number" value={form.targetValue} onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))} />
            <Input placeholder="Unit (e.g. count, %, BDT)" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
            <Input placeholder="Owner name" value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} />
            <Input placeholder="Cadence (e.g. Weekly Friday review)" value={form.cadence} onChange={(e) => setForm((f) => ({ ...f, cadence: e.target.value }))} />
            <Input placeholder="Source of truth (e.g. Convex dashboard)" value={form.sourceOfTruth} onChange={(e) => setForm((f) => ({ ...f, sourceOfTruth: e.target.value }))} />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Target Date</label>
              <Input type="date" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} />
            </div>
          </div>
          <Button size="sm" onClick={handleCreate}>Create KPI</Button>
        </div>
      )}

      <div className="space-y-2">
        {kpis.map((kpi) => {
          const pct = kpi.targetValue > 0 ? Math.round((kpi.actualValue / kpi.targetValue) * 100) : 0;
          const ws = workstreams.find((w) => w._id === kpi.workstreamId);
          return (
            <div key={kpi._id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium">{kpi.title}</span>
                  {ws && <Badge variant="outline" className="text-[10px] ml-2" style={{ borderColor: ws.color || undefined }}>{ws.name}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  {kpi.trend === "up" && <TrendingUp className="size-3.5 text-green-600" />}
                  {kpi.trend === "down" && <TrendingDown className="size-3.5 text-red-600" />}
                  {kpi.trend === "flat" && <Minus className="size-3.5 text-gray-500" />}
                  <Badge variant="outline" className={cn("text-[10px]", riskColors[kpi.riskFlag || "on_track"])}>
                    {(kpi.riskFlag || "on_track").replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="text-muted-foreground">{kpi.metric}</span>
                <span className="font-mono font-bold">{kpi.actualValue}{kpi.unit ? ` ${kpi.unit}` : ""}</span>
                <span className="text-muted-foreground">/ {kpi.targetValue}{kpi.unit ? ` ${kpi.unit}` : ""}</span>
                <span className={cn("font-medium", pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600")}>{pct}%</span>
                {typeof (kpi as Record<string, unknown>).targetDate === "number" && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    🎯 by {new Date((kpi as Record<string, unknown>).targetDate as number).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 3: Milestones ──

function MilestonesTab() {
  const milestones = useQuery(api.controlTower.listMilestones, {});
  const workstreams = useQuery(api.controlTower.listWorkstreams, { activeOnly: true });
  const kpis = useQuery(api.controlTower.listKpis, {});
  const staff = useQuery(api.controlTower.listTeamMembers, { activeOnly: true });
  const { user } = useUser();
  const createMilestone = useMutation(api.controlTower.createMilestone);
  const updateMilestone = useMutation(api.controlTower.updateMilestone);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ workstreamId: "", kpiId: "", title: "", dueDate: "", ownerId: "", ownerName: "" });

  if (!milestones || !workstreams || !kpis) return <Loading />;

  // Filter KPIs by selected workstream
  const filteredKpis = form.workstreamId ? kpis.filter(k => k.workstreamId === form.workstreamId) : kpis;

  const handleCreate = async () => {
    if (!form.kpiId || !form.title || !form.dueDate) {
      toast.error("KPI, title and due date are required");
      return;
    }
    const kpi = kpis.find(k => k._id === form.kpiId);
    await createMilestone({
      workstreamId: (kpi?.workstreamId || form.workstreamId) as Id<"ctWorkstreams">,
      kpiId: form.kpiId as Id<"ctKpis">,
      title: form.title,
      dueDate: new Date(form.dueDate).getTime(),
      ownerId: form.ownerId || undefined,
      ownerName: form.ownerName || undefined,
      actorId: user?.id,
      actorName: user?.fullName || user?.firstName || "Admin",
    });
    setForm({ workstreamId: "", kpiId: "", title: "", dueDate: "", ownerId: "", ownerName: "" });
    setShowForm(false);
    toast.success("Milestone created");
  };

  const statusColors: Record<string, string> = {
    not_started: "bg-gray-100 text-gray-600",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    blocked: "bg-red-100 text-red-700",
    overdue: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between">
        <h3 className="text-sm font-medium">{milestones.length} Milestones</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="size-3 mr-1" /> Add Milestone
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <p className="text-xs text-muted-foreground font-medium">Milestones must be linked to a KPI</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Select value={form.workstreamId} onValueChange={(v) => setForm((f) => ({ ...f, workstreamId: v, kpiId: "" }))}>
              <SelectTrigger><SelectValue placeholder="1. Select Workstream" /></SelectTrigger>
              <SelectContent>
                {workstreams.map((w) => <SelectItem key={w._id} value={w._id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.kpiId} onValueChange={(v) => setForm((f) => ({ ...f, kpiId: v }))}>
              <SelectTrigger><SelectValue placeholder="2. Select KPI *" /></SelectTrigger>
              <SelectContent>
                {filteredKpis.map((k) => <SelectItem key={k._id} value={k._id}>{k.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Milestone title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            <Select value={form.ownerId} onValueChange={(v) => {
              const m = staff?.find(s => s.clerkId === v);
              setForm(f => ({ ...f, ownerId: v, ownerName: m?.name || "" }));
            }}>
              <SelectTrigger><SelectValue placeholder="Assign owner (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {(staff ?? []).map(m => <SelectItem key={m.clerkId} value={m.clerkId}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleCreate}>Create Milestone</Button>
        </div>
      )}

      <div className="space-y-2">
        {milestones.map((ms) => {
          const ws = workstreams.find((w) => w._id === ms.workstreamId);
          const kpi = kpis?.find((k) => k._id === ms.kpiId);
          const isOverdue = ms.dueDate < Date.now() && ms.status !== "completed";
          return (
            <div key={ms._id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{ms.title}</span>
                  {ws && <Badge variant="outline" className="text-[10px]" style={{ borderColor: ws.color || undefined }}>{ws.name}</Badge>}
                  {kpi && <Badge variant="outline" className="text-[10px] text-primary border-primary/40">KPI: {kpi.title}</Badge>}
                  <Badge variant="outline" className={cn("text-[10px]", statusColors[isOverdue ? "overdue" : ms.status])}>
                    {isOverdue ? "overdue" : ms.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted-foreground">Due: {new Date(ms.dueDate).toLocaleDateString()}</div>
                  {ms.ownerName && <div className="text-[10px] text-muted-foreground">Owner: {ms.ownerName}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${ms.progressPercent}%` }} />
                </div>
                <span className="text-xs font-medium w-10 text-right">{ms.progressPercent}%</span>
              </div>
              {ms.blockerFlag && (
                <div className="mt-2 text-xs text-red-600">⛔ {ms.lastUpdate || "Blocked"}</div>
              )}
              <div className="flex gap-1 mt-2">
                {ms.status !== "completed" && (
                  <>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]"
                      onClick={() => updateMilestone({ id: ms._id, progressPercent: Math.min(ms.progressPercent + 10, 100), status: ms.progressPercent >= 90 ? "completed" : "in_progress", actorId: user?.id, actorName: user?.fullName || "Admin" })}>
                      +10%
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-green-600"
                      onClick={() => updateMilestone({ id: ms._id, status: "completed", progressPercent: 100, actorId: user?.id, actorName: user?.fullName || "Admin" })}>
                      Complete
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-600"
                      onClick={() => updateMilestone({ id: ms._id, status: "blocked", actorId: user?.id, actorName: user?.fullName || "Admin" })}>
                      Block
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 4: Tasks ──

function TasksTab() {
  const tasks = useQuery(api.controlTower.listTasks, {});
  const workstreams = useQuery(api.controlTower.listWorkstreams, { activeOnly: true });
  const milestones = useQuery(api.controlTower.listMilestones, {});
  const kpis = useQuery(api.controlTower.listKpis, {});
  const staff = useQuery(api.controlTower.listTeamMembers, { activeOnly: true });
  const { user } = useUser();
  const createTask = useMutation(api.controlTower.createTask);
  const updateTask = useMutation(api.controlTower.updateTask);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ workstreamId: "", milestoneId: "", title: "", priority: "medium", assigneeId: "", assigneeName: "", dueDate: "" });

  if (!tasks || !workstreams || !milestones) return <Loading />;

  const filteredMilestones = form.workstreamId
    ? milestones.filter(m => m.workstreamId === form.workstreamId && m.status !== "completed")
    : milestones.filter(m => m.status !== "completed");

  const handleCreate = async () => {
    if (!form.milestoneId || !form.title) {
      toast.error("Milestone and title are required");
      return;
    }
    const ms = milestones.find(m => m._id === form.milestoneId);
    await createTask({
      workstreamId: (ms?.workstreamId || form.workstreamId) as Id<"ctWorkstreams">,
      milestoneId: form.milestoneId as Id<"ctMilestones">,
      title: form.title,
      priority: form.priority as "low" | "medium" | "high" | "critical",
      assigneeId: form.assigneeId && form.assigneeId !== "unassigned" ? form.assigneeId : undefined,
      assigneeName: form.assigneeName || undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
      actorId: user?.id,
      actorName: user?.fullName || user?.firstName || "Admin",
    });

    // Send email notification
    if (form.assigneeId && form.assigneeId !== "unassigned" && form.assigneeName) {
      const member = staff?.find(m => m.clerkId === form.assigneeId);
      if (member?.email) {
        const ws = workstreams.find(w => w._id === (ms?.workstreamId || form.workstreamId));
        fetch("/api/control-tower/notify-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assigneeName: member.name,
            assigneeEmail: member.email,
            taskTitle: form.title,
            workstreamName: ws?.name || "",
            priority: form.priority,
            dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
          }),
        }).catch(() => {});
      }
    }

    setForm({ workstreamId: "", milestoneId: "", title: "", priority: "medium", assigneeId: "", assigneeName: "", dueDate: "" });
    setShowForm(false);
    toast.success("Task created");
  };

  const columns = ["not_started", "in_progress", "blocked", "completed"] as const;
  const columnLabels: Record<string, string> = { not_started: "Not Started", in_progress: "In Progress", blocked: "Blocked", completed: "Completed" };
  const columnColors: Record<string, string> = { not_started: "border-gray-300", in_progress: "border-blue-400", blocked: "border-red-400", completed: "border-green-400" };
  const priorityColors: Record<string, string> = { low: "text-gray-500", medium: "text-blue-600", high: "text-orange-600", critical: "text-red-600" };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between">
        <h3 className="text-sm font-medium">{tasks.length} Tasks</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="size-3 mr-1" /> Add Task
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <p className="text-xs text-muted-foreground font-medium">Tasks must be linked to a Milestone → KPI chain</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Select value={form.workstreamId} onValueChange={(v) => setForm((f) => ({ ...f, workstreamId: v, milestoneId: "" }))}>
              <SelectTrigger><SelectValue placeholder="1. Filter by Workstream (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workstreams</SelectItem>
                {workstreams.map((w) => <SelectItem key={w._id} value={w._id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.milestoneId} onValueChange={(v) => setForm((f) => ({ ...f, milestoneId: v }))}>
              <SelectTrigger><SelectValue placeholder="2. Select Milestone *" /></SelectTrigger>
              <SelectContent>
                {filteredMilestones.map((m) => {
                  const kpi = kpis?.find(k => k._id === m.kpiId);
                  return <SelectItem key={m._id} value={m._id}>{m.title} {kpi ? `(${kpi.title})` : ""}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Input placeholder="Task title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Select
              value={form.assigneeId}
              onValueChange={(v) => {
                const member = staff?.find(m => m.clerkId === v);
                setForm(f => ({ ...f, assigneeId: v, assigneeName: member?.name || "" }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Assign to (LLP Staff)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {(staff ?? []).map(m => <SelectItem key={m.clerkId} value={m.clerkId}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Due Date</label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <Button size="sm" onClick={handleCreate}>Create Task</Button>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col);
          return (
            <div key={col} className={cn("rounded-lg border-t-2 bg-muted/20 p-2", columnColors[col])}>
              <h4 className="text-xs font-medium mb-2 flex items-center justify-between">
                {columnLabels[col]}
                <Badge variant="outline" className="text-[10px]">{colTasks.length}</Badge>
              </h4>
              <div className="space-y-1.5">
                {colTasks.map((t) => (
                  <div key={t._id} className="rounded-md border bg-card p-2 text-xs">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={cn("text-[10px] font-medium", priorityColors[t.priority])}>{t.priority}</span>
                      {t.assigneeName && <span className="text-[10px] text-muted-foreground">{t.assigneeName}</span>}
                    </div>
                    {col !== "completed" && (
                      <div className="flex gap-1 mt-1.5">
                        {col === "not_started" && <button className="text-[10px] text-blue-600 hover:underline" onClick={() => updateTask({ id: t._id, status: "in_progress" })}>Start</button>}
                        {col === "in_progress" && <button className="text-[10px] text-green-600 hover:underline" onClick={() => updateTask({ id: t._id, status: "completed" })}>Done</button>}
                        {col === "blocked" && <button className="text-[10px] text-blue-600 hover:underline" onClick={() => updateTask({ id: t._id, status: "in_progress" })}>Unblock</button>}
                        {col !== "blocked" && <button className="text-[10px] text-red-600 hover:underline" onClick={() => updateTask({ id: t._id, status: "blocked" })}>Block</button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 5: Team ──

function TeamTab() {
  const members = useQuery(api.controlTower.listTeamMembers, { activeOnly: true });
  const workstreams = useQuery(api.controlTower.listWorkstreams, { activeOnly: true });
  const upsert = useMutation(api.controlTower.upsertTeamMember);
  const updateMember = useMutation(api.controlTower.updateTeamMember);
  const removeMember = useMutation(api.controlTower.removeTeamMember);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "contributor", workstreamId: "" });
  const [form, setForm] = useState({ clerkId: "", name: "", email: "", role: "contributor", workstreamId: "" });

  if (!members || !workstreams) return <Loading />;

  const startEdit = (m: typeof members[0]) => {
    setEditingId(m._id);
    setEditForm({ name: m.name, email: m.email || "", role: m.dashboardRole, workstreamId: m.workstreamId || "" });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    await updateMember({
      id: editingId as Id<"ctTeamMembers">,
      name: editForm.name || undefined,
      email: editForm.email || undefined,
      dashboardRole: editForm.role as "super_admin" | "workstream_owner" | "contributor" | "viewer",
      workstreamId: editForm.workstreamId ? editForm.workstreamId as Id<"ctWorkstreams"> : undefined,
    });
    setEditingId(null);
    toast.success("Member updated");
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    await removeMember({ id: id as Id<"ctTeamMembers"> });
    toast.success(`${name} removed`);
  };

  const handleCreate = async () => {
    if (!form.clerkId || !form.name) return;
    await upsert({
      clerkId: form.clerkId,
      name: form.name,
      email: form.email || undefined,
      dashboardRole: form.role as "super_admin" | "workstream_owner" | "contributor" | "viewer",
      workstreamId: form.workstreamId ? form.workstreamId as Id<"ctWorkstreams"> : undefined,
    });
    setForm({ clerkId: "", name: "", email: "", role: "contributor", workstreamId: "" });
    setShowForm(false);
  };

  const roleColors: Record<string, string> = {
    super_admin: "bg-purple-100 text-purple-700",
    workstream_owner: "bg-blue-100 text-blue-700",
    contributor: "bg-green-100 text-green-700",
    viewer: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between">
        <h3 className="text-sm font-medium">{members.length} Team Members</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="size-3 mr-1" /> Add Member
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Clerk User ID" value={form.clerkId} onChange={(e) => setForm((f) => ({ ...f, clerkId: e.target.value }))} />
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="workstream_owner">Workstream Owner</SelectItem>
                <SelectItem value="contributor">Contributor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleCreate}>Add Member</Button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((m) => {
          const ws = m.workstreamId ? workstreams.find((w) => w._id === m.workstreamId) : null;
          const isEditing = editingId === m._id;
          return (
            <div key={m._id} className="rounded-lg border p-3 space-y-2">
              {isEditing ? (
                <div className="space-y-2">
                  <Input className="h-7 text-xs" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" />
                  <Input className="h-7 text-xs" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" />
                  <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin" className="text-xs">Super Admin</SelectItem>
                      <SelectItem value="workstream_owner" className="text-xs">Workstream Owner</SelectItem>
                      <SelectItem value="contributor" className="text-xs">Contributor</SelectItem>
                      <SelectItem value="viewer" className="text-xs">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={editForm.workstreamId} onValueChange={v => setEditForm(f => ({ ...f, workstreamId: v }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Workstream (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">No workstream</SelectItem>
                      {workstreams.map(w => <SelectItem key={w._id} value={w._id} className="text-xs">{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-[10px]" onClick={handleUpdate}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{m.name}</span>
                    <Badge variant="outline" className={cn("text-[10px]", roleColors[m.dashboardRole])}>
                      {m.dashboardRole.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                  {ws && <Badge variant="outline" className="text-[10px]" style={{ borderColor: ws.color || undefined }}>{ws.name}</Badge>}
                  {m.reportingToName && <p className="text-[10px] text-muted-foreground">Reports to: {m.reportingToName}</p>}
                  <div className="flex gap-1 pt-1">
                    <button className="text-[10px] text-blue-600 hover:underline" onClick={() => startEdit(m)}>Edit</button>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <button className="text-[10px] text-red-600 hover:underline" onClick={() => handleRemove(m._id, m.name)}>Remove</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 6: AI Risk Summary ──

function RiskTab() {
  const overview = useQuery(api.controlTower.getOverview);
  const kpis = useQuery(api.controlTower.listKpis, {});
  const overdueTasks = useQuery(api.controlTower.getOverdueTasks);

  if (!overview || !kpis || !overdueTasks) return <Loading />;

  const criticalKpis = kpis.filter((k) => k.riskFlag === "critical" || k.riskFlag === "behind");
  const o = overview as Record<string, number>;

  const risks = [
    {
      type: "Pace Risk",
      severity: o.overdueTasks > 5 ? "high" : o.overdueTasks > 0 ? "medium" : "low",
      detail: `${o.overdueTasks} overdue tasks, ${o.overdueMilestones} overdue milestones`,
    },
    {
      type: "Blocker Concentration",
      severity: o.blockedTasks > 3 ? "high" : o.blockedTasks > 0 ? "medium" : "low",
      detail: `${o.blockedTasks} blocked tasks across workstreams`,
    },
    {
      type: "KPI Risk",
      severity: criticalKpis.length > 2 ? "high" : criticalKpis.length > 0 ? "medium" : "low",
      detail: `${criticalKpis.length} KPIs behind or critical`,
    },
    {
      type: "Missing Updates",
      severity: o.staleTasks > 5 ? "high" : o.staleTasks > 0 ? "medium" : "low",
      detail: `${o.staleTasks} tasks with no update in 7+ days`,
    },
  ];

  const severityColors: Record<string, string> = {
    low: "border-green-300 bg-green-50 dark:bg-green-900/10",
    medium: "border-amber-300 bg-amber-50 dark:bg-amber-900/10",
    high: "border-red-300 bg-red-50 dark:bg-red-900/10",
  };
  const severityBadge: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-sm font-medium">AI Risk Assessment</h3>
      <p className="text-xs text-muted-foreground">Automated risk flags based on milestone/task progress against KPIs.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {risks.map((r) => (
          <div key={r.type} className={cn("rounded-lg border p-4", severityColors[r.severity])}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{r.type}</span>
              <Badge variant="outline" className={cn("text-[10px]", severityBadge[r.severity])}>{r.severity}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{r.detail}</p>
          </div>
        ))}
      </div>

      {criticalKpis.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Critical KPIs</h4>
          {criticalKpis.map((k) => (
            <div key={k._id} className="text-sm py-1">
              <span className="font-medium text-red-600">{k.title}</span>
              <span className="text-muted-foreground"> — {k.actualValue}/{k.targetValue} {k.unit || ""}</span>
              {k.riskNote && <span className="text-xs text-muted-foreground block">{k.riskNote}</span>}
            </div>
          ))}
        </div>
      )}

      {overdueTasks.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Overdue Tasks ({overdueTasks.length})</h4>
          <div className="space-y-1">
            {overdueTasks.slice(0, 10).map((t) => (
              <div key={t._id} className="text-xs flex justify-between">
                <span>{t.title}</span>
                <span className="text-red-600">{t.dueDate ? `${Math.ceil((Date.now() - t.dueDate) / 86400000)}d overdue` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 7: Activity Log ──

function ActivityTab() {
  const [filterActor, setFilterActor] = useState("");
  const [filterWorkstream, setFilterWorkstream] = useState("");
  const workstreams = useQuery(api.controlTower.listWorkstreams, { activeOnly: true });
  const staff = useQuery(api.controlTower.listTeamMembers, { activeOnly: true });
  const logs = useQuery(api.controlTower.listActivityLog, {
    actorId: filterActor || undefined,
    workstreamId: filterWorkstream ? filterWorkstream as Id<"ctWorkstreams"> : undefined,
    limit: 100,
  });

  if (!logs) return <Loading />;

  const actionIcon: Record<string, string> = {
    created: "🟢",
    updated: "✏️",
    status_changed: "🔄",
    assigned: "👤",
    completed: "✅",
    blocked: "⛔",
    unblocked: "🔓",
    progress_updated: "📊",
    commented: "💬",
    deleted: "🗑️",
  };

  const entityBadge: Record<string, string> = {
    kpi: "bg-purple-100 text-purple-700",
    milestone: "bg-blue-100 text-blue-700",
    task: "bg-green-100 text-green-700",
    workstream: "bg-orange-100 text-orange-700",
    team_member: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-sm font-medium">Activity Log</h3>
        <Select value={filterActor} onValueChange={setFilterActor}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All users" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All users</SelectItem>
            {(staff ?? []).map(m => <SelectItem key={m.clerkId} value={m.clerkId} className="text-xs">{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterWorkstream} onValueChange={setFilterWorkstream}>
          <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="All workstreams" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All workstreams</SelectItem>
            {(workstreams ?? []).map(w => <SelectItem key={w._id} value={w._id} className="text-xs">{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterActor || filterWorkstream) && (
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setFilterActor(""); setFilterWorkstream(""); }}>
            Clear filters
          </Button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No activity recorded yet. Actions will appear here as your team works.
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => (
            <div key={log._id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
              <span className="text-base shrink-0 mt-0.5">{actionIcon[log.action] || "•"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium">{log.actorName}</span>
                  <span className="text-xs text-muted-foreground">{log.action.replace(/_/g, " ")}</span>
                  <Badge className={cn("text-[10px] px-1.5 py-0", entityBadge[log.entityType] || "")}>
                    {log.entityType}
                  </Badge>
                  <span className="text-xs font-medium truncate max-w-[200px]">{log.entityTitle}</span>
                </div>
                {log.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{log.detail}</p>}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Loading ──

function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
