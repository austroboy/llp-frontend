"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  MessageSquare,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  Coins,
  HandCoins,
} from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { MODELS } from "@/app/admin/cost-calculator/models";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

// ── Pricing helper ─────────────────────────────────────────────
// Look up pricing from the canonical /admin/cost-calculator registry.
// Anything not in the registry costs $0 (so unknown models don't inflate
// the ledger). Token counts in convex are still chars/4 placeholder until
// P4 ships real Grok/Gemini token counts — labels say "Est." everywhere.
function costFor(
  model: string | undefined,
  input: number,
  output: number
): number {
  const m = model && MODELS[model];
  if (!m) return 0;
  return (input * m.inputPer1M + output * m.outputPer1M) / 1_000_000;
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

const TIER_STYLES: Record<string, string> = {
  free_guest: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  free_subscribed: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  mini: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  max: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

const TIER_LABELS: Record<string, string> = {
  free_guest: "Guest",
  free_subscribed: "Free",
  mini: "Mini",
  max: "Max",
};

// stream === 1 → LLP-paid (Grok / Gemini APIs).
// stream === 2 → redClaw subsidy (GPT-5.4, Claude Opus/Sonnet via subs).
const STREAM_STYLES: Record<number, string> = {
  1: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  2: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

const STREAM_LABELS: Record<number, string> = {
  1: "LLP",
  2: "Subsidy",
};

const STREAM_FULL_LABELS: Record<number, string> = {
  1: "S1 LLP",
  2: "S2 subsidy",
};

// Friendlier slugs — anything not in this map renders as the raw slug.
const AGENT_LABELS: Record<string, string> = {
  "chat-proxy-grok": "Grok T1",
  "gemini-intent": "Intent",
  "gemini-bn-bridge": "BN bridge",
  "gemini-embed": "Embed",
  "llp-chat-followup": "GPT-5.4 T2",
  "llp-chat-verify": "Verify",
  "llp-chat-recover": "Recover",
  "chat-proxy-deep": "Deep search",
};

function agentLabel(slug: string): string {
  return AGENT_LABELS[slug] ?? slug;
}

interface UserInfo {
  name: string;
  email: string;
  imageUrl: string;
}

interface PerAgentRow {
  agentSlug: string;
  totalInput: number;
  totalOutput: number;
  totalRequests: number;
  model?: string;
  stream: number;
}

// ── Main Page ──────────────────────────────────────────────────

export default function ChatUsagePage() {
  const [activeTab, setActiveTab] = useState<"users" | "daily">("users");

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full space-y-4 md:space-y-6">
        {/* Hero */}
        <motion.section
          variants={heroStagger}
          initial="hidden"
          animate="show"
          style={{ paddingBottom: "var(--s-3)" }}
        >
          <motion.div variants={fadeUp} className="lf-kicker">
            <span className="lf-kicker-mark">§ 3.3</span>
            Admin · Chat Usage
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
            Session{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
              ledger.
            </em>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="lf-section-deck"
            style={{ maxWidth: "62ch" }}
          >
            Per-agent token consumption split between the LLP-paid stream
            (Grok 4.1 Fast Reasoning + Gemini helpers) and the redClaw
            subsidy stream (GPT-5.4 / Claude Opus / Sonnet — $0 to LLP today
            but priced at retail for forecasting).
          </motion.p>
          <motion.p
            variants={fadeUp}
            className="lf-meta"
            style={{ marginTop: "var(--s-2)", color: "var(--ink-4)", fontSize: 11 }}
          >
            Estimated from char count; real Grok/Gemini token counts ship in P4.
          </motion.p>
        </motion.section>

        <div className="-mx-4 px-4 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "users" | "daily")}
          >
            <TabsList>
              <TabsTrigger value="users">
                <Users className="size-3.5 mr-1.5" />
                Per User
              </TabsTrigger>
              <TabsTrigger value="daily">
                <Calendar className="size-3.5 mr-1.5" />
                Daily Log
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
          {activeTab === "users" ? <PerUserTab /> : <DailyLogTab />}
        </motion.div>
      </div>
    </MotionConfig>
  );
}

// ── Stream-mix bar (shared, used in both tabs) ─────────────────

function StreamMixBar({
  llpCost,
  subsidyCost,
}: {
  llpCost: number;
  subsidyCost: number;
}) {
  const total = llpCost + subsidyCost;
  if (total === 0) {
    return (
      <div className="lf-card" style={{ padding: "var(--s-3)" }}>
        <p className="lf-meta" style={{ fontSize: 11, color: "var(--ink-4)" }}>
          No spend recorded — stream mix unavailable.
        </p>
      </div>
    );
  }
  const llpPct = (llpCost / total) * 100;
  const subsidyPct = 100 - llpPct;
  return (
    <div className="lf-card" style={{ padding: "var(--s-3)" }}>
      <div className="flex items-center justify-between mb-2">
        <span
          className="lf-meta"
          style={{ textTransform: "uppercase", fontSize: 10 }}
        >
          Stream mix · est. retail
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {formatCost(total)} total
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
        <div
          className="bg-amber-500/80 dark:bg-amber-400/70"
          style={{ width: `${llpPct}%` }}
          title={`LLP ${formatCost(llpCost)} (${llpPct.toFixed(1)}%)`}
        />
        <div
          className="bg-emerald-500/80 dark:bg-emerald-400/70"
          style={{ width: `${subsidyPct}%` }}
          title={`Subsidy ${formatCost(subsidyCost)} (${subsidyPct.toFixed(1)}%)`}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums">
        <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
          <span className="inline-block size-2 rounded-full bg-amber-500/80 dark:bg-amber-400/70" />
          LLP {formatCost(llpCost)} ({llpPct.toFixed(1)}%)
        </span>
        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <span className="inline-block size-2 rounded-full bg-emerald-500/80 dark:bg-emerald-400/70" />
          Subsidy {formatCost(subsidyCost)} ({subsidyPct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

// Tiny inline mix bar for table rows.
function MiniStreamMix({
  llpCost,
  subsidyCost,
}: {
  llpCost: number;
  subsidyCost: number;
}) {
  const total = llpCost + subsidyCost;
  if (total === 0) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  const llpPct = (llpCost / total) * 100;
  const subsidyPct = 100 - llpPct;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-1.5 w-16 overflow-hidden rounded-full bg-muted/40">
        {llpPct > 0 && (
          <div
            className="bg-amber-500/80 dark:bg-amber-400/70"
            style={{ width: `${llpPct}%` }}
          />
        )}
        {subsidyPct > 0 && (
          <div
            className="bg-emerald-500/80 dark:bg-emerald-400/70"
            style={{ width: `${subsidyPct}%` }}
          />
        )}
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">
        {llpPct.toFixed(0)}/{subsidyPct.toFixed(0)}
      </span>
    </div>
  );
}

// Aggregate cost helpers — given a list of per-agent rows, return
// the LLP (stream 1) and Subsidy (stream 2) cost split.
function streamSplit(perAgent: PerAgentRow[]): {
  llpCost: number;
  subsidyCost: number;
} {
  let llpCost = 0;
  let subsidyCost = 0;
  for (const r of perAgent) {
    const c = costFor(r.model, r.totalInput, r.totalOutput);
    if (r.stream === 2) subsidyCost += c;
    else llpCost += c;
  }
  return { llpCost, subsidyCost };
}

// ── Per User Aggregated View ───────────────────────────────────

function PerUserTab() {
  // Single source of truth: aggregateByUserAndAgent gives us per-user
  // totals AND per-agent breakdown. We derive the flat aggregateByUser
  // shape client-side so we don't double-query.
  const aggregatedNested = useQuery(api.tokenUsage.aggregateByUserAndAgent);
  const aggregatedFlat = useQuery(api.tokenUsage.aggregateByUser);

  const [userMap, setUserMap] = useState<Record<string, UserInfo>>({});
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "requests" | "tokens" | "llp" | "subsidy"
  >("requests");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Index nested aggregate by userId for cheap lookup.
  const perAgentByUser = useMemo(() => {
    const m = new Map<string, PerAgentRow[]>();
    for (const u of aggregatedNested ?? []) {
      m.set(u.userId, u.perAgent);
    }
    return m;
  }, [aggregatedNested]);

  // Resolve Clerk user IDs to names
  const resolveUsers = useCallback(
    async (userIds: string[]) => {
      const unresolvedIds = userIds.filter(
        (id) => !userMap[id] && !id.startsWith("anon_")
      );
      if (unresolvedIds.length === 0) return;
      try {
        const res = await fetch(
          `/api/admin/chat-usage?userIds=${unresolvedIds.join(",")}`
        );
        if (res.ok) {
          const data = await res.json();
          setUserMap((prev) => ({ ...prev, ...data.users }));
        }
      } catch (err) {
        console.error("Failed to resolve users:", err);
      }
    },
    [userMap]
  );

  useEffect(() => {
    if (aggregatedFlat && aggregatedFlat.length > 0) {
      resolveUsers(aggregatedFlat.map((u) => u.userId));
    }
  }, [aggregatedFlat, resolveUsers]);

  if (!aggregatedFlat || !aggregatedNested) {
    return (
      <div className="space-y-3">
        <SummaryCardsSkeleton />
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Summary stats — aggregate across ALL users using the nested data so
  // we get the stream split right.
  const totalUsers = aggregatedFlat.length;
  const totalRequests = aggregatedFlat.reduce(
    (s, u) => s + u.totalRequests,
    0
  );
  let allLlp = 0;
  let allSubsidy = 0;
  for (const u of aggregatedNested) {
    const { llpCost, subsidyCost } = streamSplit(u.perAgent);
    allLlp += llpCost;
    allSubsidy += subsidyCost;
  }
  const totalCost = allLlp + allSubsidy;

  // Sort
  const sorted = [...aggregatedFlat].sort((a, b) => {
    if (sortBy === "tokens")
      return b.totalInput + b.totalOutput - (a.totalInput + a.totalOutput);
    if (sortBy === "llp" || sortBy === "subsidy") {
      const aSplit = streamSplit(perAgentByUser.get(a.userId) ?? []);
      const bSplit = streamSplit(perAgentByUser.get(b.userId) ?? []);
      const aVal = sortBy === "llp" ? aSplit.llpCost : aSplit.subsidyCost;
      const bVal = sortBy === "llp" ? bSplit.llpCost : bSplit.subsidyCost;
      return bVal - aVal;
    }
    return b.totalRequests - a.totalRequests;
  });

  // Filter
  const filtered = search
    ? sorted.filter((u) => {
        const info = userMap[u.userId];
        const searchLower = search.toLowerCase();
        return (
          u.userId.toLowerCase().includes(searchLower) ||
          info?.name.toLowerCase().includes(searchLower) ||
          info?.email.toLowerCase().includes(searchLower)
        );
      })
    : sorted;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Active Users"
          value={totalUsers.toString()}
          color="text-blue-600"
        />
        <StatCard
          icon={MessageSquare}
          label="Total Chats"
          value={totalRequests.toLocaleString()}
          color="text-emerald-600"
        />
        <StatCard
          icon={DollarSign}
          label="LLP Spend (S1)"
          value={formatCost(allLlp)}
          sub="Grok + Gemini"
          color="text-amber-600"
        />
        <StatCard
          icon={HandCoins}
          label="Subsidy Burn (S2)"
          value={formatCost(allSubsidy)}
          sub="redClaw absorbed"
          color="text-emerald-600"
        />
      </div>

      {/* Stream-mix bar (totals across all users) */}
      <StreamMixBar llpCost={allLlp} subsidyCost={allSubsidy} />

      {/* Search + sort */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["requests", "tokens", "llp", "subsidy"] as const).map((s) => (
            <Button
              key={s}
              variant={sortBy === s ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs capitalize"
              onClick={() => setSortBy(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {aggregatedFlat.length === 0
              ? "No usage data yet. Chat usage will appear here once users start chatting."
              : "No users match your search."}
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="divide-y divide-border/50 sm:hidden p-3.5">
              {filtered.map((u) => {
                const info = userMap[u.userId];
                const perAgent = perAgentByUser.get(u.userId) ?? [];
                const { llpCost, subsidyCost } = streamSplit(perAgent);
                const isExpanded = expandedUser === u.userId;
                return (
                  <div key={u.userId} className="py-3 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedUser(isExpanded ? null : u.userId)
                      }
                      className="flex w-full items-center gap-2.5 text-left"
                    >
                      {info?.imageUrl ? (
                        <Image
                          src={info.imageUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="size-8 rounded-full shrink-0"
                        />
                      ) : (
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-medium text-muted-foreground shrink-0">
                          {u.userId.startsWith("anon_")
                            ? "?"
                            : u.userId.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-snug truncate">
                          {info?.name ||
                            (u.userId.startsWith("anon_")
                              ? "Anonymous"
                              : u.userId.slice(0, 16))}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {info?.email || u.userId}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0 shrink-0",
                          TIER_STYLES[u.tier] ?? TIER_STYLES.free_guest
                        )}
                      >
                        {TIER_LABELS[u.tier] ?? u.tier}
                      </Badge>
                    </button>
                    <div className="flex flex-wrap items-center gap-2 mt-2 ml-[42px] text-[11px] text-muted-foreground">
                      <span>{u.totalRequests} chats</span>
                      <span>
                        {Math.round((u.totalInput + u.totalOutput) / 1000)}K
                        tokens
                      </span>
                      <span className="text-amber-700 dark:text-amber-400">
                        S1 {formatCost(llpCost)}
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400">
                        S2 {formatCost(subsidyCost)}
                      </span>
                    </div>
                    <div className="mt-1.5 ml-[42px]">
                      <MiniStreamMix
                        llpCost={llpCost}
                        subsidyCost={subsidyCost}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Stream Mix</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Chats</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">Est. LLP $</TableHead>
                  <TableHead className="text-right">Est. Subsidy $</TableHead>
                  <TableHead className="text-right">Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const info = userMap[u.userId];
                  const perAgent = perAgentByUser.get(u.userId) ?? [];
                  const { llpCost, subsidyCost } = streamSplit(perAgent);
                  const isExpanded = expandedUser === u.userId;
                  return (
                    <TableRow
                      key={u.userId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        setExpandedUser(isExpanded ? null : u.userId)
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {info?.imageUrl ? (
                            <Image
                              src={info.imageUrl}
                              alt=""
                              width={28}
                              height={28}
                              className="size-7 rounded-full"
                            />
                          ) : (
                            <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                              {u.userId.startsWith("anon_")
                                ? "?"
                                : u.userId.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[180px]">
                              {info?.name ||
                                (u.userId.startsWith("anon_")
                                  ? "Anonymous"
                                  : u.userId.slice(0, 20))}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                              {info?.email || ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            TIER_STYLES[u.tier] ?? TIER_STYLES.free_guest
                          )}
                        >
                          {TIER_LABELS[u.tier] ?? u.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <MiniStreamMix
                          llpCost={llpCost}
                          subsidyCost={subsidyCost}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {u.model || "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {u.totalRequests.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {u.totalInput.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {u.totalOutput.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium text-amber-700 dark:text-amber-400">
                        {formatCost(llpCost)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                        {formatCost(subsidyCost)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        {u.lastDate}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {/* Expanded user detail */}
      {expandedUser && (
        <UserDetailPanel
          userId={expandedUser}
          userInfo={userMap[expandedUser]}
          perAgent={perAgentByUser.get(expandedUser) ?? []}
          onClose={() => setExpandedUser(null)}
        />
      )}
    </div>
  );
}

// ── User Detail Panel (expandable) ─────────────────────────────

function UserDetailPanel({
  userId,
  userInfo,
  perAgent,
  onClose,
}: {
  userId: string;
  userInfo?: UserInfo;
  perAgent: PerAgentRow[];
  onClose: () => void;
}) {
  const history = useQuery(api.tokenUsage.listByUser, {
    userId,
    limit: 30,
  });

  return (
    <div className="lf-card space-y-4" style={{ padding: "var(--s-4)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {userInfo?.imageUrl ? (
            <Image
              src={userInfo.imageUrl}
              alt=""
              width={32}
              height={32}
              className="size-8 rounded-full"
            />
          ) : (
            <div className="size-8 rounded-full bg-muted" />
          )}
          <div>
            <p className="text-sm font-medium">
              {userInfo?.name || userId.slice(0, 20)}
            </p>
            <p className="text-xs text-muted-foreground">
              {userInfo?.email || userId}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Per-agent breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Coins className="size-3.5" />
          Per-agent breakdown (all-time)
        </p>
        {perAgent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No per-agent data.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Input</TableHead>
                <TableHead className="text-right">Output</TableHead>
                <TableHead className="text-right">Est. Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perAgent.map((row) => {
                const cost = costFor(row.model, row.totalInput, row.totalOutput);
                return (
                  <TableRow key={row.agentSlug}>
                    <TableCell className="text-sm font-medium whitespace-nowrap">
                      {agentLabel(row.agentSlug)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.model || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          STREAM_STYLES[row.stream] ?? STREAM_STYLES[1]
                        )}
                      >
                        {STREAM_FULL_LABELS[row.stream] ??
                          STREAM_FULL_LABELS[1]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {row.totalRequests.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {row.totalInput.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {row.totalOutput.toLocaleString()}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-sm tabular-nums font-medium",
                        row.stream === 2
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-400"
                      )}
                    >
                      {formatCost(cost)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Daily history */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          Daily history (last 30 rows)
        </p>
        {!history ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No usage history.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Input</TableHead>
                <TableHead className="text-right">Output</TableHead>
                <TableHead className="text-right">Est. Cost</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead>Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((row) => {
                const cost = costFor(row.model, row.inputUsed, row.outputUsed);
                return (
                  <TableRow key={row._id}>
                    <TableCell className="text-sm">{row.date}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {agentLabel(row.agentSlug)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {row.requestCount}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {row.inputUsed.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {row.outputUsed.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-medium">
                      {formatCost(cost)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          STREAM_STYLES[row.stream] ?? STREAM_STYLES[1]
                        )}
                      >
                        {STREAM_LABELS[row.stream] ?? STREAM_LABELS[1]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          TIER_STYLES[row.tier] ?? TIER_STYLES.free_guest
                        )}
                      >
                        {TIER_LABELS[row.tier] ?? row.tier}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ── Daily Log Tab ──────────────────────────────────────────────

function DailyLogTab() {
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const usageForDate = useQuery(api.tokenUsage.listByDate, { date });
  const [userMap, setUserMap] = useState<Record<string, UserInfo>>({});

  const resolveUsers = useCallback(
    async (userIds: string[]) => {
      const unresolvedIds = Array.from(new Set(userIds)).filter(
        (id) => !userMap[id] && !id.startsWith("anon_")
      );
      if (unresolvedIds.length === 0) return;
      try {
        const res = await fetch(
          `/api/admin/chat-usage?userIds=${unresolvedIds.join(",")}`
        );
        if (res.ok) {
          const data = await res.json();
          setUserMap((prev) => ({ ...prev, ...data.users }));
        }
      } catch {}
    },
    [userMap]
  );

  useEffect(() => {
    if (usageForDate && usageForDate.length > 0) {
      resolveUsers(usageForDate.map((u) => u.userId));
    }
  }, [usageForDate, resolveUsers]);

  const goDay = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  };

  // Summary for this date — split by stream like Per-User tab.
  const totalRequests =
    usageForDate?.reduce((s, u) => s + u.requestCount, 0) ?? 0;
  let llpCost = 0;
  let subsidyCost = 0;
  for (const row of usageForDate ?? []) {
    const c = costFor(row.model, row.inputUsed, row.outputUsed);
    if (row.stream === 2) subsidyCost += c;
    else llpCost += c;
  }
  const distinctUsers = new Set((usageForDate ?? []).map((r) => r.userId)).size;

  // Sort: by requestCount desc, then by stream so S1 rows appear first.
  const sortedRows = [...(usageForDate ?? [])].sort((a, b) => {
    if (b.requestCount !== a.requestCount)
      return b.requestCount - a.requestCount;
    return a.stream - b.stream;
  });

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => goDay(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-40 text-center"
        />
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => goDay(1)}
          disabled={date >= new Date().toISOString().split("T")[0]}
        >
          <ChevronRight className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground ml-2">
          {distinctUsers} user{distinctUsers !== 1 ? "s" : ""} ·{" "}
          {usageForDate?.length ?? 0} agent rows
        </span>
      </div>

      {/* Day summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Users"
          value={distinctUsers.toString()}
          color="text-blue-600"
        />
        <StatCard
          icon={MessageSquare}
          label="Chats"
          value={totalRequests.toLocaleString()}
          color="text-emerald-600"
        />
        <StatCard
          icon={DollarSign}
          label="LLP $ (S1)"
          value={formatCost(llpCost)}
          color="text-amber-600"
        />
        <StatCard
          icon={HandCoins}
          label="Subsidy $ (S2)"
          value={formatCost(subsidyCost)}
          color="text-emerald-600"
        />
      </div>

      {/* Stream mix for the day */}
      <StreamMixBar llpCost={llpCost} subsidyCost={subsidyCost} />

      {/* Table */}
      <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
        {!usageForDate ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : usageForDate.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No usage on {date}.
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="divide-y divide-border/50 sm:hidden p-3.5">
              {sortedRows.map((row) => {
                const info = userMap[row.userId];
                const cost = costFor(row.model, row.inputUsed, row.outputUsed);
                return (
                  <div key={row._id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      {info?.imageUrl ? (
                        <Image
                          src={info.imageUrl}
                          alt=""
                          width={28}
                          height={28}
                          className="size-7 rounded-full shrink-0"
                        />
                      ) : (
                        <div className="size-7 rounded-full bg-muted shrink-0" />
                      )}
                      <p className="text-[13px] font-medium flex-1 truncate">
                        {info?.name ||
                          (row.userId.startsWith("anon_")
                            ? "Anonymous"
                            : row.userId.slice(0, 16))}
                      </p>
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          TIER_STYLES[row.tier] ?? TIER_STYLES.free_guest
                        )}
                      >
                        {TIER_LABELS[row.tier] ?? row.tier}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 ml-[38px] text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        {agentLabel(row.agentSlug)}
                      </span>
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          STREAM_STYLES[row.stream] ?? STREAM_STYLES[1]
                        )}
                      >
                        {STREAM_LABELS[row.stream] ?? STREAM_LABELS[1]}
                      </Badge>
                      <span>{row.requestCount} chats</span>
                      <span>
                        {(row.inputUsed + row.outputUsed).toLocaleString()} tok
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          row.stream === 2
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-amber-700 dark:text-amber-400"
                        )}
                      >
                        {formatCost(cost)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Stream</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">Est. Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => {
                  const info = userMap[row.userId];
                  const cost = costFor(
                    row.model,
                    row.inputUsed,
                    row.outputUsed
                  );
                  return (
                    <TableRow key={row._id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {info?.imageUrl ? (
                            <Image
                              src={info.imageUrl}
                              alt=""
                              width={28}
                              height={28}
                              className="size-7 rounded-full"
                            />
                          ) : (
                            <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                              {row.userId.startsWith("anon_")
                                ? "?"
                                : row.userId.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[180px]">
                              {info?.name ||
                                (row.userId.startsWith("anon_")
                                  ? "Anonymous"
                                  : row.userId.slice(0, 20))}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                              {info?.email || ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium whitespace-nowrap">
                        {agentLabel(row.agentSlug)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            STREAM_STYLES[row.stream] ?? STREAM_STYLES[1]
                          )}
                        >
                          {STREAM_LABELS[row.stream] ?? STREAM_LABELS[1]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            TIER_STYLES[row.tier] ?? TIER_STYLES.free_guest
                          )}
                        >
                          {TIER_LABELS[row.tier] ?? row.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {row.model || "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {row.requestCount}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {row.inputUsed.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {row.outputUsed.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-sm tabular-nums font-medium",
                          row.stream === 2
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-amber-700 dark:text-amber-400"
                        )}
                      >
                        {formatCost(cost)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </div>
  );
}

// ── Shared Components ──────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
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
        <Icon className={`size-4 ${color}`} />
        <span className="lf-meta" style={{ textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <p
        style={{
          fontFamily: "var(--lf-display)",
          fontSize: 24,
          fontWeight: 400,
          lineHeight: 1.05,
          color: "var(--ink)",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="lf-body"
          style={{ fontSize: 11, color: "var(--ink-4)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}
