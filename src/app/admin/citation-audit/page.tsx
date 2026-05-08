"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  ScrollText,
  Ban,
  Activity,
  TrendingDown,
  SearchIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  GitBranch,
  Info,
} from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import DecisionTreeTab from "./decision-tree-tab";
import BranchesTab from "./branches-tab";
import {
  type ConfidenceEntry,
  type HallucinationPattern,
  type VerificationLog,
  type HealthStats,
  confidenceColor,
  confidenceBg,
  verdictBadge,
  timeAgo,
} from "./helpers";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

// ── Page Component ───────────────────────────────────────────────────

export default function CitationAuditPage() {
  const [activeTab, setActiveTab] = useState("health");

  return (
    <MotionConfig reducedMotion="user">
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Hero */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-3)" }}
      >
        <motion.div
          variants={fadeUp}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--s-3)",
            flexWrap: "wrap",
          }}
        >
          <div className="lf-kicker">
            <span className="lf-kicker-mark">§ 3.4</span>
            Admin · Citation Audit
          </div>
          <span
            className="lf-status lf-status--live"
            style={{ flexShrink: 0 }}
          >
            <span className="lf-status-dot" />
            GLM-5-Turbo · Active
          </span>
        </motion.div>
        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: "clamp(26px, 4vw, 36px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "var(--s-3) 0 var(--s-3)",
          }}
        >
          Every citation,{" "}
          <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
            under folio.
          </em>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: "60ch" }}
        >
          Verification log, confidence scores, and hallucination patterns filed
          against each response.
        </motion.p>
      </motion.section>

      {/* Migration notice */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.2 }}
        className="lf-card"
        style={{
          padding: "var(--s-4)",
          background: "var(--accent-blue-ghost)",
          borderLeft: "2px solid var(--accent-blue)",
          borderRadius: "var(--r-md)",
          display: "flex",
          gap: "var(--s-3)",
        }}
        role="status"
      >
        <Info
          size={18}
          style={{ color: "var(--accent-blue)", flexShrink: 0, marginTop: 2 }}
        />
        <div>
          <div
            className="lf-meta lf-meta--accent"
            style={{ textTransform: "uppercase", marginBottom: 4 }}
          >
            Registrar&rsquo;s Note
          </div>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            Citations are verified by the hr-verifier agent (GLM-5-Turbo) after
            each chat response. New verification data will appear as users
            interact with /chat.
          </p>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="health" className="gap-1.5 text-xs sm:text-sm">
            <Activity className="size-3.5 sm:size-4" />
            <span className="hidden sm:inline">Citation Health</span>
            <span className="sm:hidden">Health</span>
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5 text-xs sm:text-sm">
            <ScrollText className="size-3.5 sm:size-4" />
            <span className="hidden sm:inline">Verification Log</span>
            <span className="sm:hidden">Log</span>
          </TabsTrigger>
          <TabsTrigger value="blacklist" className="gap-1.5 text-xs sm:text-sm">
            <Ban className="size-3.5 sm:size-4" />
            Blacklist
          </TabsTrigger>
          <TabsTrigger value="tree" className="gap-1.5 text-xs sm:text-sm">
            <GitBranch className="size-3.5 sm:size-4" />
            <span className="hidden sm:inline">Decision Tree</span>
            <span className="sm:hidden">Tree</span>
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-1.5 text-xs sm:text-sm">
            <ShieldCheck className="size-3.5 sm:size-4" />
            <span className="hidden sm:inline">Branches & Review</span>
            <span className="sm:hidden">Branches</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="mt-4">
          <HealthTab />
        </TabsContent>
        <TabsContent value="log" className="mt-4">
          <LogTab />
        </TabsContent>
        <TabsContent value="blacklist" className="mt-4">
          <BlacklistTab />
        </TabsContent>
        <TabsContent value="tree" className="mt-4">
          <DecisionTreeTab />
        </TabsContent>
        <TabsContent value="branches" className="mt-4">
          <BranchesTab />
        </TabsContent>
      </Tabs>
    </div>
    </MotionConfig>
  );
}

// ── Tab 1: Citation Health ───────────────────────────────────────────

function HealthTab() {
  const [data, setData] = useState<{
    confidence: ConfidenceEntry[];
    patterns: HallucinationPattern[];
    stats: HealthStats;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/citation-audit?tab=health");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingSkeleton rows={6} />;
  if (!data) return <EmptyState text="Failed to load citation health data" />;

  const { confidence, patterns, stats } = data;

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="Tracked Sections" value={stats.totalTracked} />
        <StatCard
          icon={ShieldCheck}
          label="Avg Confidence"
          value={`${Math.round(stats.avgConfidence * 100)}%`}
          valueColor={confidenceColor(stats.avgConfidence)}
        />
        <StatCard icon={TrendingDown} label="Low Confidence" value={stats.lowConfidence} valueColor="text-amber-600 dark:text-amber-400" />
        <StatCard icon={Ban} label="Blacklisted" value={stats.blacklisted} valueColor="text-red-500 dark:text-red-400" />
      </div>

      {/* Confidence table */}
      <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="p-3.5 sm:p-5 border-b border-border">
          <h3 className="text-sm font-semibold">Section Confidence Scores</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Sorted by lowest confidence first</p>
        </div>

        {confidence.length === 0 ? (
          <EmptyState text="No verification data yet. Confidence scores will appear after citations are verified." />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-border/50 sm:hidden p-3.5">
              {confidence.slice(0, 30).map((c) => (
                <div key={c.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{c.section}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{c.document_id}</p>
                    </div>
                    <Badge variant="secondary" className={cn("text-[11px] px-2 py-0.5 font-mono shrink-0", confidenceColor(c.confidence_score), confidenceBg(c.confidence_score))}>
                      {Math.round(c.confidence_score * 100)}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>Cited {c.times_cited}x</span>
                    <span className="text-green-600">{c.times_verified_correct} correct</span>
                    <span className="text-red-500">{c.times_verified_fabricated} fabricated</span>
                    <span>{timeAgo(c.last_verified_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Cited</TableHead>
                  <TableHead className="text-center">Correct</TableHead>
                  <TableHead className="text-center">Misquoted</TableHead>
                  <TableHead className="text-center">Fabricated</TableHead>
                  <TableHead className="text-center">Partial</TableHead>
                  <TableHead className="text-center">Invalid</TableHead>
                  <TableHead className="text-right">Last Verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confidence.slice(0, 50).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.section}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.document_id}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={cn("font-mono text-[11px]", confidenceColor(c.confidence_score), confidenceBg(c.confidence_score))}>
                        {Math.round(c.confidence_score * 100)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">{c.times_cited}</TableCell>
                    <TableCell className="text-center text-sm text-green-600 dark:text-green-400">{c.times_verified_correct}</TableCell>
                    <TableCell className="text-center text-sm text-amber-600 dark:text-amber-400">{c.times_verified_misquoted}</TableCell>
                    <TableCell className="text-center text-sm text-red-500 dark:text-red-400">{c.times_verified_fabricated}</TableCell>
                    <TableCell className="text-center text-sm text-blue-600 dark:text-blue-400">{c.times_verified_partial}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{c.times_regex_invalid}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{timeAgo(c.last_verified_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {/* Hallucination patterns */}
      {patterns.length > 0 && (
        <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="p-3.5 sm:p-5 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Hallucination Patterns
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Recurring fabrication/misquote patterns detected</p>
          </div>
          <div className="divide-y divide-border/50 p-3.5 sm:p-5">
            {patterns.map((p) => (
              <div key={p.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className={cn("text-[10px] shrink-0", p.pattern_type === "fabricated" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")}>
                      {p.pattern_type}
                    </Badge>
                    <span className="text-sm font-medium truncate">
                      {p.section_number ? `Section ${p.section_number}` : "Unknown"} — {p.document_id || "N/A"}
                    </span>
                  </div>
                  {p.query_domain && (
                    <Badge variant="outline" className="text-[10px] shrink-0">{p.query_domain}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground shrink-0">{p.occurrence_count}x</span>
                </div>
                {p.example_query && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Example: &ldquo;{p.example_query}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Verification Log ──────────────────────────────────────────

function LogTab() {
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [verdict, setVerdict] = useState("");
  const [section, setSection] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab: "log", page: page.toString() });
      if (verdict) params.set("verdict", verdict);
      if (section) params.set("section", section);

      const res = await fetch(`/api/admin/citation-audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, verdict, section]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Filter by section..."
            value={section}
            onChange={(e) => { setSection(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={verdict} onValueChange={(v) => { setVerdict(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All verdicts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All verdicts</SelectItem>
            <SelectItem value="correct">Correct</SelectItem>
            <SelectItem value="misquoted">Misquoted</SelectItem>
            <SelectItem value="fabricated">Fabricated</SelectItem>
            <SelectItem value="partially_correct">Partially correct</SelectItem>
            <SelectItem value="regex_invalid">Regex invalid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <LoadingSkeleton rows={8} />
        ) : logs.length === 0 ? (
          <EmptyState text="No verification logs found. Logs appear after citations are verified." />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-border/50 sm:hidden p-3.5">
              {logs.map((log) => {
                const vb = verdictBadge(log.verdict);
                const VIcon = vb.icon;
                return (
                  <div key={log.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium">{log.section}</span>
                      <Badge variant="secondary" className={cn("text-[10px] gap-1 shrink-0", vb.color)}>
                        <VIcon className="size-2.5" />
                        {log.verdict}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">{log.document_id}</p>
                    {log.explanation && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{log.explanation}</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {log.confidence !== null && <span>{Math.round(log.confidence * 100)}%</span>}
                      <span>{timeAgo(log.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead className="text-center">Confidence</TableHead>
                  <TableHead className="max-w-[300px]">Explanation</TableHead>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const vb = verdictBadge(log.verdict);
                  const VIcon = vb.icon;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-sm">{log.section}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.document_id}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[11px] gap-1", vb.color)}>
                          <VIcon className="size-3" />
                          {log.verdict}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {log.confidence !== null ? `${Math.round(log.confidence * 100)}%` : "—"}
                      </TableCell>
                      <TableCell className="max-w-[300px] text-xs text-muted-foreground truncate">
                        {log.explanation || "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] text-xs text-muted-foreground truncate">
                        {log.query_text?.slice(0, 60) || "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo(log.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {total} total entries
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm tabular-nums">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Blacklist Manager ─────────────────────────────────────────

function BlacklistTab() {
  const [entries, setEntries] = useState<ConfidenceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/citation-audit?tab=blacklist");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.blacklist);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOverride = async (id: number, newScore: number) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/admin/citation-audit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, confidence_score: newScore }),
      });
      if (res.ok) {
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, confidence_score: newScore } : e))
        );
      }
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-4">
      <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="p-3.5 sm:p-5 border-b border-border">
          <h3 className="text-sm font-semibold">Low Confidence Sections</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sections below 50% confidence. Below 20% are auto-injected into system prompt as warnings.
            Override scores manually if needed.
          </p>
        </div>

        {entries.length === 0 ? (
          <EmptyState text="No low-confidence sections. All tracked citations are above 50% confidence." />
        ) : (
          <>
            {/* Mobile */}
            <div className="divide-y divide-border/50 sm:hidden p-3.5">
              {entries.map((e) => (
                <div key={e.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{e.section}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{e.document_id}</p>
                    </div>
                    <Badge variant="secondary" className={cn("text-[11px] px-2 py-0.5 font-mono shrink-0", confidenceColor(e.confidence_score), confidenceBg(e.confidence_score))}>
                      {Math.round(e.confidence_score * 100)}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[11px] h-7"
                      disabled={updating === e.id}
                      onClick={() => handleOverride(e.id, 0.5)}
                    >
                      {updating === e.id ? <Loader2 className="size-3 animate-spin" /> : "Reset to 50%"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[11px] h-7"
                      disabled={updating === e.id}
                      onClick={() => handleOverride(e.id, 0.8)}
                    >
                      Trust (80%)
                    </Button>
                    {e.confidence_score >= 0.2 ? null : (
                      <Badge variant="destructive" className="text-[10px] ml-auto">Blacklisted</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Cited</TableHead>
                  <TableHead className="text-center">Correct</TableHead>
                  <TableHead className="text-center">Fabricated</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">{e.section}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{e.document_id}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={cn("font-mono text-[11px]", confidenceColor(e.confidence_score), confidenceBg(e.confidence_score))}>
                        {Math.round(e.confidence_score * 100)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">{e.times_cited}</TableCell>
                    <TableCell className="text-center text-sm text-green-600">{e.times_verified_correct}</TableCell>
                    <TableCell className="text-center text-sm text-red-500">{e.times_verified_fabricated}</TableCell>
                    <TableCell className="text-center">
                      {e.confidence_score < 0.2 ? (
                        <Badge variant="destructive" className="text-[10px]">Blacklisted</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Low</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={updating === e.id}
                          onClick={() => handleOverride(e.id, 0.5)}
                        >
                          {updating === e.id ? <Loader2 className="size-3 animate-spin" /> : "Reset 50%"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={updating === e.id}
                          onClick={() => handleOverride(e.id, 0.8)}
                        >
                          Trust 80%
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </div>
  );
}

// ── Shared Components ────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <div
      className="lf-card"
      style={{
        padding: "var(--s-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-2)",
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4" style={{ color: "var(--ink-3)" }} />
        <span className="lf-meta" style={{ textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <p
        className={cn("tabular-nums", valueColor)}
        style={{
          fontFamily: "var(--lf-display)",
          fontSize: 28,
          fontWeight: 400,
          lineHeight: 1.05,
          color: valueColor ? undefined : "var(--ink)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function LoadingSkeleton({ rows }: { rows: number }) {
  return (
    <div className="lf-card space-y-3" style={{ padding: "var(--s-4)" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">{text}</div>
  );
}
