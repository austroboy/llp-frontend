"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Database,
  BrainCircuit,
  Bot,
  Globe,
  ScrollText,
  MoreVertical,
  ClipboardCheck,
  Download,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
  Info,
} from "lucide-react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AuditLogsTab } from "@/components/admin/rag/audit-logs-tab";
import { HumanApprovalModal } from "@/components/admin/rag/human-approval-modal";

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

interface DocumentMeta {
  id: string;
  title: string;
  instrument_type: string;
  date_enacted: string;
  language: string;
  pages: number;
  status: string;
  is_parent: boolean;
  amends: string | null;
}

interface RegistryData {
  documents: DocumentMeta[];
}

interface ApprovalInfo {
  status: string;
  by: string;
  at: string;
}

interface RagStats {
  chunkCounts: Record<string, number>;
  embeddedCounts: Record<string, number>;
  approvals: Record<string, ApprovalInfo>;
}

interface TranslationFlags {
  enTranslated?: boolean;
  bnTranslated?: boolean;
  hasEn?: boolean;
  hasBn?: boolean;
}

const typeColors: Record<string, string> = {
  Act: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Amendment Act":
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Rules: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Amendment Rules":
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  Ordinance:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "International Standard":
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

function LanguageBadges({ flags }: { flags?: TranslationFlags }) {
  if (!flags) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {flags.hasEn && (
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] sm:text-[11px] whitespace-nowrap w-fit px-1.5 py-0",
            flags.enTranslated
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          )}
        >
          {flags.enTranslated ? <Bot className="size-3 mr-0.5" /> : <Globe className="size-3 mr-0.5" />}
          EN
        </Badge>
      )}
      {flags.hasBn && (
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] sm:text-[11px] whitespace-nowrap w-fit px-1.5 py-0",
            flags.bnTranslated
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          )}
        >
          {flags.bnTranslated ? <Bot className="size-3 mr-0.5" /> : <Globe className="size-3 mr-0.5" />}
          BN
        </Badge>
      )}
    </div>
  );
}

function RagStatusBadge({ chunks, embedded, t }: { chunks: number; embedded: number; t: (k: string) => string }) {
  const isRagged = chunks > 0 && embedded > 0;
  const partial = chunks > 0 && embedded < chunks;

  if (isRagged && !partial) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] sm:text-[11px] px-1.5 py-0">
        <CheckCircle2 className="size-3 mr-0.5" />
        {t("admin.rag.active")}
      </Badge>
    );
  }
  if (partial) {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] sm:text-[11px] px-1.5 py-0">
        <AlertCircle className="size-3 mr-0.5" />
        {t("admin.rag.partial")}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px] sm:text-[11px] px-1.5 py-0">
      {t("admin.rag.notIndexed")}
    </Badge>
  );
}

function ApprovalBadge({ approval }: { approval?: ApprovalInfo }) {
  if (!approval) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-[10px] sm:text-[11px] px-1.5 py-0 text-muted-foreground border-dashed cursor-default">
            <ShieldQuestion className="size-3 mr-0.5" />
            Pending
          </Badge>
        </TooltipTrigger>
        <TooltipContent>No approval review yet</TooltipContent>
      </Tooltip>
    );
  }

  const config = {
    approved: {
      label: "Approved",
      icon: ShieldCheck,
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    "needs-improvements": {
      label: "Improve",
      icon: ShieldAlert,
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    declined: {
      label: "Declined",
      icon: ShieldX,
      cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
  }[approval.status] ?? {
    label: approval.status,
    icon: ShieldQuestion,
    cls: "",
  };

  const Icon = config.icon;
  const date = new Date(approval.at).toLocaleDateString();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className={cn("text-[10px] sm:text-[11px] px-1.5 py-0 cursor-default", config.cls)}>
          <Icon className="size-3 mr-0.5" />
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{approval.by}</p>
        <p className="text-[10px] opacity-70">{date}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function DocumentsTab() {
  const { t } = useLanguage();
  const [registry, setRegistry] = useState<RegistryData | null>(null);
  const [ragStats, setRagStats] = useState<RagStats | null>(null);
  const [translationFlags, setTranslationFlags] = useState<Record<string, TranslationFlags>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<{ id: string; title: string } | null>(null);

  const fetchData = async () => {
      try {
        const regRes = await fetch("/api/documents/registry");
        if (!regRes.ok) throw new Error("Failed to load document registry");
        const regData = await regRes.json();

        const ragRes = await fetch("/api/admin/rag");
        if (!ragRes.ok) throw new Error("Failed to load RAG stats");
        const ragData = await ragRes.json();

        setRegistry(regData);
        setRagStats(ragData);
        setTranslationFlags(regData.translationFlags ?? {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchData();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 text-destructive">
        <AlertCircle className="size-5 mr-2" />
        {error}
      </div>
    );
  }

  const documents = registry?.documents ?? [];
  const chunkCounts = ragStats?.chunkCounts ?? {};
  const embeddedCounts = ragStats?.embeddedCounts ?? {};
  const approvals = ragStats?.approvals ?? {};

  const totalChunks = Object.values(chunkCounts).reduce((a, b) => a + b, 0);
  const totalEmbedded = Object.values(embeddedCounts).reduce((a, b) => a + b, 0);
  const raggedDocs = documents.filter((d) => (chunkCounts[d.id] ?? 0) > 0);
  const unraggedDocs = documents.filter((d) => !chunkCounts[d.id]);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5 sm:space-y-8"
    >
      {/* Stats — hairline 4-up */}
      <motion.div
        variants={fadeUp}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1px",
          background: "var(--glass-border)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{ background: "var(--glass-bg)", padding: "var(--s-4)" }}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <Skeleton className="size-9 sm:size-10 rounded-xl" />
                <Skeleton className="h-6 w-8" />
              </div>
              <Skeleton className="h-3.5 w-20 mb-1" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          ))
        ) : (
          <>
            {[
              {
                Icon: FileText,
                value: documents.length,
                label: t("admin.rag.totalDocs"),
                note: t("admin.rag.inRegistry"),
                color: "var(--accent-blue)",
              },
              {
                Icon: CheckCircle2,
                value: raggedDocs.length,
                label: t("admin.rag.raggedDocs"),
                note: `${unraggedDocs.length} ${t("admin.rag.unragged")}`,
                color: "var(--emerald)",
              },
              {
                Icon: Database,
                value: totalChunks,
                label: t("admin.rag.totalChunks"),
                note: t("admin.rag.acrossAllDocs"),
                color: "var(--accent-blue)",
              },
              {
                Icon: BrainCircuit,
                value: totalEmbedded,
                label: t("admin.rag.embedded"),
                note:
                  totalChunks > 0
                    ? `${Math.round((totalEmbedded / totalChunks) * 100)}% ${t("admin.rag.coverage")}`
                    : t("admin.rag.noChunks"),
                color: "var(--bronze)",
              },
            ].map(({ Icon, value, label, note, color }) => (
              <div
                key={label}
                style={{
                  background: "var(--glass-bg)",
                  padding: "var(--s-4)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-2)",
                }}
              >
                <div className="flex items-center justify-between">
                  <Icon size={16} style={{ color }} />
                  <span
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontSize: 28,
                      fontWeight: 400,
                      lineHeight: 1.05,
                      letterSpacing: "-0.02em",
                      color: "var(--ink)",
                    }}
                  >
                    {value}
                  </span>
                </div>
                <span
                  className="lf-meta"
                  style={{ textTransform: "uppercase" }}
                >
                  {label}
                </span>
                <span
                  className="lf-body"
                  style={{ fontSize: 12, color: "var(--ink-3)" }}
                >
                  {note}
                </span>
              </div>
            ))}
          </>
        )}
      </motion.div>

      {/* Documents list */}
      <motion.div
        variants={fadeUp}
        className="lf-card"
        style={{ padding: "var(--s-5)" }}
      >
        <h3
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: 20,
            fontWeight: 400,
            color: "var(--ink)",
            marginBottom: "var(--s-4)",
          }}
        >
          {t("admin.rag.documentStatus")}
        </h3>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-border/50 sm:hidden">
              {documents.map((doc) => {
                const chunks = chunkCounts[doc.id] ?? 0;
                const embedded = embeddedCounts[doc.id] ?? 0;
                const approval = approvals[doc.id];

                return (
                  <div key={doc.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/rag/${doc.id}`}>
                          <p className="text-[13px] font-medium leading-snug">{doc.title}</p>
                        </Link>
                        {doc.amends && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">Amends {doc.amends}</p>
                        )}
                        {/* Badges */}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px] px-1.5 py-0", typeColors[doc.instrument_type] ?? "")}
                          >
                            {doc.instrument_type}
                          </Badge>
                          <LanguageBadges flags={translationFlags[doc.id]} />
                          <RagStatusBadge chunks={chunks} embedded={embedded} t={t} />
                          <ApprovalBadge approval={approval} />
                        </div>
                        {/* Chunk stats */}
                        {chunks > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                            {chunks} chunks · {embedded} embedded
                          </p>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground font-mono">{doc.id}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="mt-1 p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                              <MoreVertical className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/rag/${doc.id}`}>
                                <Pencil className="size-3.5" />
                                {t("admin.rag.edit")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a
                                href={`/api/admin/rag/${doc.id}/bundle`}
                                download={`${doc.id}_bundle.zip`}
                              >
                                <Download className="size-3.5" />
                                Download bundle
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setApprovalTarget({ id: doc.id, title: doc.title })}>
                              <ClipboardCheck className="size-3.5" />
                              Human Approval
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">{t("admin.rag.id")}</TableHead>
                  <TableHead>{t("admin.table.title")}</TableHead>
                  <TableHead>{t("admin.rag.type")}</TableHead>
                  <TableHead>{t("admin.rag.language")}</TableHead>
                  <TableHead className="text-center">{t("admin.rag.chunks")}</TableHead>
                  <TableHead className="text-center">{t("admin.rag.embeddings")}</TableHead>
                  <TableHead className="text-center">{t("admin.rag.ragStatus")}</TableHead>
                  <TableHead className="text-center">Approval</TableHead>
                  <TableHead className="text-right">{t("admin.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const chunks = chunkCounts[doc.id] ?? 0;
                  const embedded = embeddedCounts[doc.id] ?? 0;
                  const approval = approvals[doc.id];

                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {doc.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm leading-tight">{doc.title}</span>
                          {doc.amends && (
                            <span className="text-xs text-muted-foreground mt-0.5">Amends {doc.amends}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("text-[11px] whitespace-nowrap", typeColors[doc.instrument_type] ?? "")}
                        >
                          {doc.instrument_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <LanguageBadges flags={translationFlags[doc.id]} />
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">{chunks}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{embedded}</TableCell>
                      <TableCell className="text-center">
                        <RagStatusBadge chunks={chunks} embedded={embedded} t={t} />
                      </TableCell>
                      <TableCell className="text-center">
                        <ApprovalBadge approval={approval} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors mx-auto">
                              <MoreVertical className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/rag/${doc.id}`}>
                                <Pencil className="size-3.5" />
                                {t("admin.rag.edit")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a
                                href={`/api/admin/rag/${doc.id}/bundle`}
                                download={`${doc.id}_bundle.zip`}
                              >
                                <Download className="size-3.5" />
                                Download bundle
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setApprovalTarget({ id: doc.id, title: doc.title })}>
                              <ClipboardCheck className="size-3.5" />
                              Human Approval
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </motion.div>

      {approvalTarget && (
        <HumanApprovalModal
          open={!!approvalTarget}
          onOpenChange={(open) => { if (!open) setApprovalTarget(null); }}
          docId={approvalTarget.id}
          docTitle={approvalTarget.title}
          onSubmitted={fetchData}
        />
      )}
    </motion.div>
  );
}

export default function AdminRagPage() {
  const { t } = useLanguage();

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        {/* Hero */}
        <motion.section
          variants={heroStagger}
          initial="hidden"
          animate="show"
          style={{ paddingBottom: "var(--s-4)" }}
        >
          <motion.div variants={fadeUp} className="lf-kicker">
            <span className="lf-kicker-mark">§ 3.1</span>
            Admin · RAG Inspector
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
            Document corpus,{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>
              under registry.
            </em>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="lf-section-deck"
            style={{ maxWidth: 640 }}
          >
            Read-only inspection of indexed documents, chunks, embeddings, and
            human approvals.
          </motion.p>
        </motion.section>

        {/* Read-only inspector banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.2 }}
          className="lf-card"
          style={{
            padding: "var(--s-3) var(--s-4)",
            background: "var(--accent-blue-ghost)",
            borderLeft: "2px solid var(--accent-blue)",
            borderRadius: "var(--r-md)",
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--s-3)",
          }}
        >
          <Info size={16} style={{ color: "var(--accent-blue)", flexShrink: 0, marginTop: 2 }} />
          <div className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>
              Corpus ingestion is CLI-only.
            </span>{" "}
            See <code className="px-1 py-0.5 rounded bg-background border text-[11px]">docs/data-accuracy-plan/INGEST-*.md</code> for playbooks.
            This panel is read-only.
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="documents">
          <div className="-mx-4 px-4 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible">
            <TabsList>
              <TabsTrigger value="documents" className="gap-1.5">
                <FileText className="size-4" />
                {t("admin.rag.tab.documents")}
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-1.5">
                <ScrollText className="size-4" />
                {t("admin.rag.tab.logs")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="documents">
            <DocumentsTab />
          </TabsContent>

          <TabsContent value="logs">
            <AuditLogsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MotionConfig>
  );
}
