"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  BookOpen,
  Hash,
  AlertTriangle,
  Pin,
  Loader2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  confidenceColor,
  confidenceBg,
  timeAgo,
  type VerificationLog,
} from "./helpers";

// ── Types ────────────────────────────────────────────────────────────

interface TreeSection {
  chunk_id: number;
  section: string;
  section_number: string;
  content_preview: string;
  content_tokens: number | null;
  confidence_score: number | null;
  times_cited: number;
  times_verified_correct: number;
  times_verified_fabricated: number;
  times_verified_misquoted: number;
  has_correction: boolean;
  has_warning: boolean;
  warning_type: "fabricated" | "misquoted" | null;
}

interface TreeChapter {
  name: string;
  sections: TreeSection[];
}

interface TreeDocument {
  id: string;
  title: string;
  instrument_type: string;
  avg_confidence: number | null;
  chapters: TreeChapter[];
  total_sections: number;
}

interface SectionDetail {
  chunk: {
    id: number;
    document_id: string;
    section: string;
    chapter: string | null;
    content: string;
    content_tokens: number | null;
  };
  confidence: {
    confidence_score: number;
    times_cited: number;
    times_verified_correct: number;
    times_verified_misquoted: number;
    times_verified_fabricated: number;
    times_verified_partial: number;
  } | null;
  correction: {
    id: number;
    corrected_content: string;
    correction_note: string | null;
    corrected_by_email: string | null;
    created_at: string;
  } | null;
  recent_logs: VerificationLog[];
}

// ── Component ────────────────────────────────────────────────────────

export default function DecisionTreeTab() {
  const [tree, setTree] = useState<TreeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [docFilter, setDocFilter] = useState("all");

  // Detail panel state
  const [selectedChunkId, setSelectedChunkId] = useState<number | null>(null);
  const [sectionDetail, setSectionDetail] = useState<SectionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Correction form
  const [correctionText, setCorrectionText] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Expand state
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/citation-audit?tab=tree");
      if (res.ok) {
        const data = await res.json();
        setTree(data.tree);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  const fetchSectionDetail = useCallback(async (chunkId: number) => {
    setDetailLoading(true);
    setSectionDetail(null);
    setCorrectionText("");
    setCorrectionNote("");
    try {
      const res = await fetch(`/api/admin/citation-audit?tab=section-detail&chunkId=${chunkId}`);
      if (res.ok) {
        const data = await res.json();
        setSectionDetail(data);
        if (data.correction) {
          setCorrectionText(data.correction.corrected_content);
          setCorrectionNote(data.correction.correction_note || "");
        }
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSectionClick = (chunkId: number) => {
    setSelectedChunkId(chunkId);
    fetchSectionDetail(chunkId);
  };

  const handleSaveCorrection = async () => {
    if (!sectionDetail || !correctionText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/citation-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: sectionDetail.chunk.document_id,
          section: sectionDetail.chunk.section,
          section_number: sectionDetail.chunk.section || "",
          chunk_id: sectionDetail.chunk.id,
          original_content: sectionDetail.chunk.content,
          corrected_content: correctionText,
          correction_note: correctionNote || null,
        }),
      });
      if (res.ok) {
        await fetchSectionDetail(sectionDetail.chunk.id);
        await fetchTree();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCorrection = async () => {
    if (!sectionDetail?.correction) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/citation-audit", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correction_id: sectionDetail.correction.id }),
      });
      if (res.ok) {
        await fetchSectionDetail(sectionDetail.chunk.id);
        await fetchTree();
      }
    } finally {
      setRemoving(false);
    }
  };

  const toggleDoc = (docId: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const toggleChapter = (key: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredTree = docFilter === "all"
    ? tree
    : tree.filter((d) => d.id === docFilter);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-3.5 sm:p-5 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No documents found. Import documents first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Select value={docFilter} onValueChange={setDocFilter}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Filter by document" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            {tree.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.id} — {d.title.slice(0, 40)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Side-by-side layout: Tree + Detail Panel */}
      <div className="flex gap-4">
      {/* Tree */}
      <div className={cn(
        "rounded-xl border border-border bg-card divide-y divide-border/50 overflow-y-auto transition-all",
        selectedChunkId ? "w-1/2 max-h-[75vh]" : "w-full"
      )}>
        {filteredTree.map((doc) => (
          <DocumentNode
            key={doc.id}
            doc={doc}
            expanded={expandedDocs.has(doc.id)}
            expandedChapters={expandedChapters}
            onToggle={() => toggleDoc(doc.id)}
            onToggleChapter={toggleChapter}
            onSectionClick={handleSectionClick}
          />
        ))}
      </div>

      {/* Inline Detail Panel */}
      {selectedChunkId && (
        <div className="w-1/2 rounded-xl border border-border bg-card overflow-y-auto max-h-[75vh] p-4 space-y-5 shrink-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">
                {sectionDetail?.chunk.section || "Section Detail"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {sectionDetail?.chunk.document_id}
                {sectionDetail?.chunk.chapter && ` — ${sectionDetail.chunk.chapter}`}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSelectedChunkId(null); setSectionDetail(null); }}>
              Close
            </Button>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : sectionDetail ? (
            <div className="space-y-5">
              {/* Confidence badge */}
              {sectionDetail.confidence && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "font-mono text-sm px-3 py-1",
                    confidenceColor(sectionDetail.confidence.confidence_score),
                    confidenceBg(sectionDetail.confidence.confidence_score),
                  )}
                >
                  {Math.round(sectionDetail.confidence.confidence_score * 100)}% confidence
                </Badge>
              )}

              {/* Original content */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Original Content</h4>
                <ScrollArea className="h-[50vh] rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {sectionDetail.chunk.content}
                  </p>
                </ScrollArea>
                {sectionDetail.chunk.content_tokens && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {sectionDetail.chunk.content_tokens} tokens
                  </p>
                )}
              </div>

              {/* Stats row */}
              {sectionDetail.confidence && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-lg font-bold tabular-nums">{sectionDetail.confidence.times_cited}</p>
                    <p className="text-[10px] text-muted-foreground">Cited</p>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-lg font-bold tabular-nums text-green-600">{sectionDetail.confidence.times_verified_correct}</p>
                    <p className="text-[10px] text-muted-foreground">Correct</p>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-lg font-bold tabular-nums text-red-500">{sectionDetail.confidence.times_verified_fabricated}</p>
                    <p className="text-[10px] text-muted-foreground">Fabricated</p>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-lg font-bold tabular-nums text-amber-600">{sectionDetail.confidence.times_verified_misquoted}</p>
                    <p className="text-[10px] text-muted-foreground">Misquoted</p>
                  </div>
                </div>
              )}

              {/* Existing correction */}
              {sectionDetail.correction && (
                <div className="rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pin className="size-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Pinned Correction</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-600 hover:text-red-700"
                      disabled={removing}
                      onClick={handleRemoveCorrection}
                    >
                      {removing ? <Loader2 className="size-3 animate-spin" /> : <><Trash2 className="size-3 mr-1" />Remove</>}
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{sectionDetail.correction.corrected_content}</p>
                  {sectionDetail.correction.correction_note && (
                    <p className="text-xs text-muted-foreground italic">Note: {sectionDetail.correction.correction_note}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    By {sectionDetail.correction.corrected_by_email || "admin"} — {timeAgo(sectionDetail.correction.created_at)}
                  </p>
                </div>
              )}

              {/* Correction form */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">
                  {sectionDetail.correction ? "Update Correction" : "Pin a Correction"}
                </h4>
                <Textarea
                  placeholder="Enter the corrected text for this section..."
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
                <Input
                  placeholder="Optional note (e.g. why this correction is needed)"
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  className="text-sm"
                />
                <Button
                  onClick={handleSaveCorrection}
                  disabled={saving || !correctionText.trim()}
                  className="w-full"
                >
                  {saving ? (
                    <><Loader2 className="size-4 animate-spin mr-2" />Saving...</>
                  ) : (
                    <><Pin className="size-4 mr-2" />Save Correction</>
                  )}
                </Button>
              </div>

              {/* Recent verifications */}
              {sectionDetail.recent_logs.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Recent Verifications</h4>
                  <div className="space-y-2">
                    {sectionDetail.recent_logs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg border border-border p-2.5 text-sm space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              log.verdict === "correct"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : log.verdict === "fabricated"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                            )}
                          >
                            {log.verdict}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(log.created_at)}</span>
                        </div>
                        {log.explanation && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{log.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Failed to load section details.
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

// ── Tree Node Components ─────────────────────────────────────────────

function DocumentNode({
  doc,
  expanded,
  expandedChapters,
  onToggle,
  onToggleChapter,
  onSectionClick,
}: {
  doc: TreeDocument;
  expanded: boolean;
  expandedChapters: Set<string>;
  onToggle: () => void;
  onToggleChapter: (key: string) => void;
  onSectionClick: (chunkId: number) => void;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-3 hover:bg-muted/50 transition-colors text-left"
      >
        <Chevron className="size-4 shrink-0 text-muted-foreground" />
        <FileText className="size-4 shrink-0 text-blue-500" />
        <span className="text-sm font-medium">{doc.id}</span>
        <span className="text-sm text-muted-foreground truncate flex-1">{doc.title}</span>
        <Badge variant="outline" className="text-[10px] shrink-0">{doc.instrument_type}</Badge>
        {doc.avg_confidence !== null && (
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] font-mono shrink-0",
              confidenceColor(doc.avg_confidence),
              confidenceBg(doc.avg_confidence),
            )}
          >
            {Math.round(doc.avg_confidence * 100)}%
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground shrink-0">{doc.total_sections} sections</span>
      </button>

      {expanded && (
        <div className="pl-6">
          {doc.chapters.map((chapter) => {
            const chapterKey = `${doc.id}::${chapter.name}`;
            return (
              <ChapterNode
                key={chapterKey}
                chapter={chapter}
                expanded={expandedChapters.has(chapterKey)}
                onToggle={() => onToggleChapter(chapterKey)}
                onSectionClick={onSectionClick}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChapterNode({
  chapter,
  expanded,
  onToggle,
  onSectionClick,
}: {
  chapter: TreeChapter;
  expanded: boolean;
  onToggle: () => void;
  onSectionClick: (chunkId: number) => void;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        <Chevron className="size-3.5 shrink-0 text-muted-foreground" />
        <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm text-muted-foreground truncate">{chapter.name}</span>
        <span className="text-[10px] text-muted-foreground/70 shrink-0">{chapter.sections.length}</span>
      </button>

      {expanded && (
        <div className="pl-6">
          {chapter.sections.map((section) => (
            <SectionNode
              key={section.chunk_id}
              section={section}
              onClick={() => onSectionClick(section.chunk_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionNode({
  section,
  onClick,
}: {
  section: TreeSection;
  onClick: () => void;
}) {
  const borderColor = section.confidence_score === null
    ? "border-l-gray-300 dark:border-l-gray-600"
    : section.confidence_score >= 0.8
      ? "border-l-green-500"
      : section.confidence_score >= 0.5
        ? "border-l-amber-500"
        : "border-l-red-500";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/20 transition-colors text-left border-l-4",
        borderColor,
      )}
    >
      <Hash className="size-3 shrink-0 text-muted-foreground/60" />
      <span className="text-sm truncate flex-1">{section.section || "(untitled)"}</span>

      {/* Warning flag */}
      {section.has_warning && (
        <AlertTriangle
          className={cn(
            "size-3.5 shrink-0",
            section.warning_type === "fabricated"
              ? "text-red-500"
              : "text-amber-500",
          )}
        />
      )}

      {/* Pin icon for corrections */}
      {section.has_correction && (
        <Pin className="size-3.5 shrink-0 text-blue-500" />
      )}

      {/* Confidence badge */}
      {section.confidence_score !== null && (
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] font-mono shrink-0 px-1.5",
            confidenceColor(section.confidence_score),
            confidenceBg(section.confidence_score),
          )}
        >
          {Math.round(section.confidence_score * 100)}%
        </Badge>
      )}
    </button>
  );
}
