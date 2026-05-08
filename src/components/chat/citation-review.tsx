"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Citation {
  document_id: string;
  document: string;
  section: string;
  text?: string;
}

interface CitationReviewProps {
  citations: Citation[];
  conversationId?: string;
  messageContent: string;
  userRole?: string; // from Clerk publicMetadata
}

interface CorrectionDraft {
  sectionIndex: number;
  correctedSection: string;
  correctedDocId: string;
  correctedContent: string;
  note: string;
}

/**
 * In-chat contributor review UI (v3.1)
 *
 * Collapsed "Review citations (N)" below each AI response.
 * Role-gated: only contributor/reviewer/admin roles see it.
 * Contributor can correct section number, document reference, wording + add note.
 * Submit goes to admin review queue.
 */
export function CitationReview({
  citations,
  conversationId,
  messageContent,
  userRole,
}: CitationReviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [corrections, setCorrections] = useState<Map<number, CorrectionDraft>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Role gate: only show for contributor, reviewer, or admin
  const allowedRoles = ["contributor", "reviewer", "admin"];
  if (!userRole || !allowedRoles.includes(userRole)) return null;
  if (!citations || citations.length === 0) return null;

  const activeCorrectionCount = corrections.size;

  const updateCorrection = (index: number, field: keyof CorrectionDraft, value: string) => {
    const current = corrections.get(index) || {
      sectionIndex: index,
      correctedSection: citations[index].section,
      correctedDocId: citations[index].document_id,
      correctedContent: "",
      note: "",
    };
    const updated = { ...current, [field]: value };
    const newMap = new Map(corrections);
    newMap.set(index, updated);
    setCorrections(newMap);
  };

  const removeCorrection = (index: number) => {
    const newMap = new Map(corrections);
    newMap.delete(index);
    setCorrections(newMap);
  };

  const handleSubmit = async () => {
    if (corrections.size === 0) return;
    setSubmitting(true);

    try {
      // Submit each correction to the contributor_corrections table via API
      const correctionArray = Array.from(corrections.values());
      for (const correction of correctionArray) {
        const citation = citations[correction.sectionIndex];
        await fetch("/api/chat/citation-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_id: citation.document_id,
            section_number: citation.section,
            section: citation.section,
            original_citation: citation.text || messageContent.slice(0, 500),
            query_text: messageContent.slice(0, 200),
            conversation_id: conversationId,
            corrected_section_number: correction.correctedSection !== citation.section ? correction.correctedSection : null,
            corrected_document_id: correction.correctedDocId !== citation.document_id ? correction.correctedDocId : null,
            corrected_content: correction.correctedContent || null,
            correction_note: correction.note || null,
          }),
        });
      }
      setSubmitted(true);
      setCorrections(new Map());
    } catch (err) {
      console.error("Failed to submit corrections:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-xs text-green-600 dark:text-green-400 px-3 py-1.5 bg-green-50 dark:bg-green-900/10 rounded-lg">
        Corrections submitted for admin review. Thank you!
      </div>
    );
  }

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5"
      >
        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        Review citations ({citations.length})
        {activeCorrectionCount > 0 && (
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            · {activeCorrectionCount} correction{activeCorrectionCount > 1 ? "s" : ""}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 border rounded-lg p-3 bg-muted/30">
          <p className="text-[10px] text-muted-foreground">
            Click a citation to correct it. Changes go to admin for review.
          </p>

          {citations.map((citation, idx) => {
            const hasCorrection = corrections.has(idx);
            const correction = corrections.get(idx);

            return (
              <div
                key={idx}
                className={cn(
                  "rounded-md border p-2 text-xs",
                  hasCorrection
                    ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10"
                    : "hover:bg-muted/50 cursor-pointer"
                )}
              >
                {/* Citation header */}
                <div
                  className="flex items-center gap-2"
                  onClick={() => !hasCorrection && updateCorrection(idx, "note", "")}
                >
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {citation.document_id}
                  </span>
                  <span className="font-medium">{citation.section}</span>
                  {!hasCorrection && (
                    <span className="ml-auto text-[10px] text-muted-foreground">click to correct</span>
                  )}
                </div>

                {/* Correction form */}
                {hasCorrection && correction && (
                  <div className="mt-2 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-muted-foreground block">Correct Section</label>
                        <input
                          type="text"
                          value={correction.correctedSection}
                          onChange={(e) => updateCorrection(idx, "correctedSection", e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs bg-background"
                          placeholder={citation.section}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block">Correct Doc ID</label>
                        <input
                          type="text"
                          value={correction.correctedDocId}
                          onChange={(e) => updateCorrection(idx, "correctedDocId", e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs bg-background"
                          placeholder={citation.document_id}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Corrected Content</label>
                      <textarea
                        value={correction.correctedContent}
                        onChange={(e) => updateCorrection(idx, "correctedContent", e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs bg-background resize-none"
                        rows={2}
                        placeholder="Correct wording or interpretation..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Note (optional)</label>
                      <input
                        type="text"
                        value={correction.note}
                        onChange={(e) => updateCorrection(idx, "note", e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs bg-background"
                        placeholder="Why this correction is needed..."
                      />
                    </div>
                    <button
                      onClick={() => removeCorrection(idx)}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      Remove correction
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit */}
          {activeCorrectionCount > 0 && (
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="size-3 mr-1.5 animate-spin" />
              ) : (
                <Send className="size-3 mr-1.5" />
              )}
              Submit {activeCorrectionCount} correction{activeCorrectionCount > 1 ? "s" : ""} for review
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
