"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, MotionConfig, type Variants } from "framer-motion";

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

interface Task {
  number: number;
  description: string;
  status: string;
}

interface PendingItem {
  title: string;
  lines: string[];
  status: string;
}

interface OpData {
  round1: Task[];
  round2: Task[];
  round3: Task[];
  pending: PendingItem[];
  lastRead: string;
  error?: string;
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();

  if (s.includes("done") || s.includes("complet")) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 shrink-0">
        Done
      </Badge>
    );
  }
  if (
    s.includes("in_progress") ||
    s.includes("in progress") ||
    s.includes("active") ||
    s.includes("ongoing")
  ) {
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0 shrink-0">
        Active
      </Badge>
    );
  }
  if (s.includes("blocked")) {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0 shrink-0">
        Blocked
      </Badge>
    );
  }
  if (s.includes("review") || s.includes("pending") || s.includes("needs")) {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0 shrink-0">
        Pending
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground shrink-0">
      Planned
    </Badge>
  );
}

function TaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-[11px] text-muted-foreground w-5 shrink-0 mt-0.5 font-mono tabular-nums">
        {task.number}
      </span>
      <p className="flex-1 text-sm leading-snug">{task.description}</p>
      <StatusBadge status={task.status} />
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="space-y-1 pt-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
        >
          <Skeleton className="h-3.5 w-4 shrink-0" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-5 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-[15px] font-semibold">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          {count !== undefined && (
            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
              {count}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

export default function OpPage() {
  const [data, setData] = useState<OpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/op/tasks", { cache: "no-store" });
      if (!res.ok) throw new Error("Server error");
      const json: OpData = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setFetchError(null);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "–";
    }
  };

  const totalActive =
    data?.round1.filter(
      (t) => !t.status.includes("done") && !t.status.includes("complet")
    ).length ?? 0;
  const totalPending = data?.pending.length ?? 0;
  const totalPlanned = (data?.round2.length ?? 0) + (data?.round3.length ?? 0);

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
              <span className="lf-kicker-mark">§ 1.4</span>
              Admin · Operations
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
              Operations <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>desk.</em>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="lf-section-deck"
              style={{ maxWidth: "60ch" }}
            >
              Live view of ongoing, pending, and planned work.
            </motion.p>
          </div>
          <motion.div
            variants={fadeUp}
            style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", flexShrink: 0 }}
          >
            {data?.lastRead && !loading && (
              <span className="lf-meta" style={{ display: "none" }} aria-hidden>
                Updated {formatTime(data.lastRead)}
              </span>
            )}
            {data?.lastRead && !loading && (
              <span className="lf-meta hidden sm:inline">
                Updated {formatTime(data.lastRead)}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="gap-1.5 h-8 text-xs"
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Stat cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="grid grid-cols-3 gap-3"
        style={{ marginBottom: "var(--s-4)" }}
      >
        {[
          {
            label: "Active Tasks",
            value: loading ? "–" : totalActive,
            icon: Circle,
            color: "text-blue-500",
          },
          {
            label: "Pending Review",
            value: loading ? "–" : totalPending,
            icon: Clock,
            color: "text-amber-500",
          },
          {
            label: "Planned",
            value: loading ? "–" : totalPlanned,
            icon: CheckCircle2,
            color: "text-muted-foreground",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div key={label} variants={fadeUp}>
            <Card className="p-3.5 sm:p-4">
              <div className="flex items-center gap-2.5">
                <Icon className={cn("size-4 shrink-0", color)} />
                <div>
                  <p className="text-xl font-semibold leading-none">{value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {label}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Error banner */}
      {fetchError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {fetchError}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5 text-xs">
            <Circle className="size-3.5" />
            Active
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5 text-xs">
            <Clock className="size-3.5" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="planned" className="gap-1.5 text-xs">
            <FileText className="size-3.5" />
            Planned
          </TabsTrigger>
        </TabsList>

        {/* Active — Round 1 */}
        <TabsContent value="active" className="mt-4">
          <SectionCard
            title="Pre-Launch & Polish"
            subtitle="Round 1 — tasks executable without a live domain"
            count={data?.round1.length}
          >
            {loading ? (
              <TaskSkeleton />
            ) : !data?.round1.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No active tasks found.
              </p>
            ) : (
              data.round1.map((task) => (
                <TaskRow key={task.number} task={task} />
              ))
            )}
          </SectionCard>
        </TabsContent>

        {/* Pending */}
        <TabsContent value="pending" className="mt-4">
          <div className="space-y-3">
            {loading ? (
              <SectionCard title="Pending Items" subtitle="Awaiting action or review">
                <TaskSkeleton />
              </SectionCard>
            ) : !data?.pending.length ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No pending items — queue is clear.
                </p>
              </Card>
            ) : (
              data.pending.map((item) => (
                <SectionCard
                  key={item.title}
                  title={item.title}
                  subtitle="Pending review or action"
                >
                  <div className="space-y-1.5 pt-1">
                    {item.lines.map((line, i) => (
                      <p
                        key={i}
                        className="text-sm text-muted-foreground leading-relaxed"
                      >
                        {line}
                      </p>
                    ))}
                    <div className="pt-2">
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                </SectionCard>
              ))
            )}
          </div>
        </TabsContent>

        {/* Planned — Round 2 + Round 3 */}
        <TabsContent value="planned" className="mt-4 space-y-4">
          <SectionCard
            title="Domain Day — Launch Sequence"
            subtitle="Round 2 — one-shot deployment tasks on go-live day"
            count={data?.round2.length}
          >
            {loading ? (
              <TaskSkeleton />
            ) : !data?.round2.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No tasks found.
              </p>
            ) : (
              data.round2.map((task) => (
                <TaskRow key={task.number} task={task} />
              ))
            )}
          </SectionCard>

          <SectionCard
            title="Post-Launch Roadmap"
            subtitle="Round 3 — ongoing after launch"
            count={data?.round3.length}
          >
            {loading ? (
              <TaskSkeleton />
            ) : !data?.round3.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No tasks found.
              </p>
            ) : (
              data.round3.map((task) => (
                <TaskRow key={task.number} task={task} />
              ))
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </MotionConfig>
  );
}
