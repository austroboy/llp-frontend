"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  answered: {
    icon: CheckCircle2,
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  expired: {
    icon: XCircle,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  },
} as const;

export function QuestionsTab() {
  const { t } = useLanguage();
  const allQuestions = useQuery(api.quickQuestions.listAll);
  const answerMutation = useMutation(api.quickQuestions.answer);
  const expireMutation = useMutation(api.quickQuestions.markExpired);
  const removeMutation = useMutation(api.quickQuestions.remove);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expertFilter, setExpertFilter] = useState<string>("all");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  if (!allQuestions) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {t("admin.loading")}
      </div>
    );
  }

  // Unique experts for filter dropdown
  const expertNames = Array.from(new Set(allQuestions.map((q) => q.expertName))).sort();

  // Apply filters
  const filtered = allQuestions.filter((q) => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (expertFilter !== "all" && q.expertName !== expertFilter) return false;
    return true;
  });

  // Stats
  const pendingCount = allQuestions.filter((q) => q.status === "pending").length;
  const answeredCount = allQuestions.filter((q) => q.status === "answered").length;
  const expiredCount = allQuestions.filter((q) => q.status === "expired").length;

  const handleAnswer = async (qId: Id<"quickQuestions">) => {
    const answer = answers[qId]?.trim();
    if (!answer) return;
    setSubmitting(qId);
    try {
      await answerMutation({ id: qId, answer });
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
      setExpandedId(null);
    } catch (err) {
      console.error("Answer failed:", err);
    } finally {
      setSubmitting(null);
    }
  };

  const handleExpire = async (qId: Id<"quickQuestions">) => {
    try {
      await expireMutation({ id: qId });
    } catch (err) {
      console.error("Mark expired failed:", err);
    }
  };

  const handleDelete = async (qId: Id<"quickQuestions">) => {
    try {
      await removeMutation({ id: qId });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6 mt-3 sm:mt-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{t("admin.questions.pending")}</div>
        </div>
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{answeredCount}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{t("admin.questions.answered")}</div>
        </div>
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-muted-foreground">{expiredCount}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{t("admin.questions.expired")}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <Filter className="size-4 text-muted-foreground shrink-0 hidden sm:block" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] sm:w-[160px] text-xs sm:text-sm h-8 sm:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.questions.allStatuses")}</SelectItem>
            <SelectItem value="pending">{t("admin.questions.pending")}</SelectItem>
            <SelectItem value="answered">{t("admin.questions.answered")}</SelectItem>
            <SelectItem value="expired">{t("admin.questions.expired")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={expertFilter} onValueChange={setExpertFilter}>
          <SelectTrigger className="w-[140px] sm:w-[200px] text-xs sm:text-sm h-8 sm:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.questions.allExperts")}</SelectItem>
            {expertNames.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter !== "all" || expertFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={() => { setStatusFilter("all"); setExpertFilter("all"); }}
          >
            {t("admin.questions.clearFilters")}
          </Button>
        )}
        <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">
          {filtered.length} {t("admin.questions.results")}
        </span>
      </div>

      {/* Questions */}
      <div className="rounded-xl sm:rounded-2xl border border-border bg-card">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t("admin.questions.noQuestions")}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-border/50 sm:hidden p-3.5">
              {filtered.map((q) => {
                const cfg = STATUS_CONFIG[q.status];
                const StatusIcon = cfg.icon;
                const isExpanded = expandedId === q._id;
                return (
                  <div key={q._id} className={cn("py-3 first:pt-0 last:pb-0", q.status === "expired" && "opacity-50")}>
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 gap-1 shrink-0", cfg.color)}>
                        <StatusIcon className="size-2.5" />
                        {q.status}
                      </Badge>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {q.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => setExpandedId(isExpanded ? null : q._id)}
                          >
                            <MessageSquare className="size-3" />
                          </Button>
                        )}
                        {q.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-orange-600"
                            onClick={() => handleExpire(q._id)}
                          >
                            <XCircle className="size-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-red-600"
                          onClick={() => handleDelete(q._id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[13px] font-medium leading-snug mt-1.5">{q.question}</p>
                    {q.status === "answered" && q.answer && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {t("admin.questions.answerPrefix")}: {q.answer}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[11px] text-muted-foreground">
                        {q.askerName} &rarr; {q.expertName}
                      </p>
                      <p className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {new Date(q._creationTime).toLocaleDateString()}
                      </p>
                    </div>
                    {/* Inline answer area */}
                    {isExpanded && q.status === "pending" && (
                      <div className="mt-2.5 space-y-2">
                        <Textarea
                          value={answers[q._id] ?? ""}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [q._id]: e.target.value }))
                          }
                          placeholder={t("admin.questions.typeAnswer")}
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleAnswer(q._id)}
                            disabled={!answers[q._id]?.trim() || submitting === q._id}
                          >
                            <MessageSquare className="size-3 mr-1" />
                            {t("admin.questions.send")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7"
                            onClick={() => setExpandedId(null)}
                          >
                            {t("admin.questions.cancel")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Desktop: table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">{t("admin.questions.col.status")}</TableHead>
                  <TableHead>{t("admin.questions.col.question")}</TableHead>
                  <TableHead>{t("admin.questions.col.expert")}</TableHead>
                  <TableHead>{t("admin.questions.col.asker")}</TableHead>
                  <TableHead>{t("admin.questions.col.date")}</TableHead>
                  <TableHead className="text-right">{t("admin.questions.col.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => {
                  const cfg = STATUS_CONFIG[q.status];
                  const StatusIcon = cfg.icon;
                  const isExpanded = expandedId === q._id;
                  return (
                    <TableRow key={q._id} className={cn(q.status === "expired" && "opacity-50")}>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[11px] gap-1", cfg.color)}>
                          <StatusIcon className="size-3" />
                          {q.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <p className="text-sm font-medium truncate">{q.question}</p>
                        {q.status === "answered" && q.answer && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {t("admin.questions.answerPrefix")}: {q.answer}
                          </p>
                        )}
                        {isExpanded && q.status === "pending" && (
                          <div className="mt-2 space-y-2">
                            <Textarea
                              value={answers[q._id] ?? ""}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [q._id]: e.target.value }))
                              }
                              placeholder={t("admin.questions.typeAnswer")}
                              rows={2}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAnswer(q._id)}
                                disabled={!answers[q._id]?.trim() || submitting === q._id}
                              >
                                <MessageSquare className="size-3.5 mr-1" />
                                {t("admin.questions.send")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedId(null)}
                              >
                                {t("admin.questions.cancel")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{q.expertName}</TableCell>
                      <TableCell>
                        <div className="text-sm">{q.askerName}</div>
                        <div className="text-xs text-muted-foreground">{q.askerEmail}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(q._creationTime).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {q.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setExpandedId(isExpanded ? null : q._id)}
                              >
                                <MessageSquare className="size-3.5 mr-1" />
                                {t("admin.questions.answer")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleExpire(q._id)}
                              >
                                {t("admin.questions.markExpired")}
                              </Button>
                            </>
                          )}
                          {q.status === "answered" && q.answeredAt && (
                            <span className="text-xs text-muted-foreground mr-2 self-center">
                              {new Date(q.answeredAt).toLocaleDateString()}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleDelete(q._id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
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
