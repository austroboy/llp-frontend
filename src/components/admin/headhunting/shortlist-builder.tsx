"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  CheckCircle2,
  FileDown,
  ListChecks,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ShortlistBuilderProps {
  mandateId: string;
  mandateTitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submissions: any[];
}

export function ShortlistBuilder({ mandateId, mandateTitle, submissions }: ShortlistBuilderProps) {
  const createPack = useMutation(api.headhunting.screening.createShortlistPack);
  const sendToClient = useMutation(api.headhunting.screening.sendShortlistToClient);
  const existingPack = useQuery(api.headhunting.screening.getShortlistByMandate, {
    mandateId: mandateId as Id<"htMandates">,
  });

  const [generating, setGenerating] = useState(false);

  const shortlisted = submissions.filter((s) => s.status === "shortlisted");

  const handleCreatePack = async () => {
    if (shortlisted.length === 0) {
      toast.error("No shortlisted candidates to build pack from");
      return;
    }
    try {
      await createPack({
        mandateId: mandateId as Id<"htMandates">,
        submissionIds: shortlisted.map((s) => s._id) as Id<"htSubmissions">[],
      });
      toast.success("Shortlist pack created");
    } catch (e) {
      toast.error("Failed to create shortlist pack");
    }
  };

  const handleSendToClient = async () => {
    if (!existingPack) return;
    try {
      await sendToClient({ id: existingPack._id });
      toast.success("Shortlist sent to client");
    } catch {
      toast.error("Failed to send");
    }
  };

  const handleGenerateTopsheets = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/headhunting/generate-topsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mandateTitle,
          candidates: shortlisted.map((s) => ({
            name: s.candidateName,
            email: s.candidateEmail,
            summary: s.aiCvSummary || "",
            currentTitle: s.aiParsedData?.currentTitle || "",
            currentCompany: s.aiParsedData?.currentCompany || "",
            yearsExperience: s.aiParsedData?.yearsExperience,
            skills: s.aiParsedData?.skills || [],
            fitScore: s.aiFitScore,
            strengths: s.aiFitDetails?.strengths || [],
            gaps: s.aiFitDetails?.gaps || [],
            complianceFlags: s.aiFitDetails?.complianceFlags || [],
          })),
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      // Download as file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${mandateTitle.replace(/\s+/g, "-")}-Topsheet.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Topsheet downloaded");
    } catch (e) {
      toast.error("Failed to generate topsheet");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="lf-card"
      style={{
        padding: "var(--s-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-4)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: 16,
            fontWeight: 500,
            color: "var(--ink)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ListChecks size={16} style={{ color: "var(--accent-blue)" }} />
          Shortlist Pack
        </h3>
        {existingPack && (
          <Badge variant="secondary" className="text-[10px]">
            v{existingPack.version} — {existingPack.status}
          </Badge>
        )}
      </div>

      {/* Shortlisted candidates summary */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {shortlisted.length} candidate{shortlisted.length !== 1 ? "s" : ""} shortlisted
        </p>
        {shortlisted.map((s) => (
          <div key={s._id} className="flex items-center justify-between rounded border border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <User className="size-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">{s.candidateName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {s.aiParsedData?.currentTitle || s.candidateEmail}
                </p>
              </div>
            </div>
            {s.aiFitScore != null && (
              <Badge variant="outline" className={cn("text-[10px]",
                s.aiFitScore >= 70 ? "text-green-700 border-green-300" :
                s.aiFitScore >= 50 ? "text-yellow-700 border-yellow-300" :
                "text-red-600 border-red-300"
              )}>
                {s.aiFitScore}% fit
              </Badge>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {!existingPack && shortlisted.length > 0 && (
          <Button size="sm" onClick={handleCreatePack} className="text-xs gap-1.5">
            <CheckCircle2 className="size-3.5" />
            Create Pack
          </Button>
        )}
        {existingPack && existingPack.status === "draft" && (
          <Button size="sm" onClick={handleSendToClient} className="text-xs gap-1.5">
            <Send className="size-3.5" />
            Send to Client
          </Button>
        )}
        {shortlisted.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateTopsheets}
            disabled={generating}
            className="text-xs gap-1.5"
          >
            <FileDown className="size-3.5" />
            {generating ? "Generating..." : "Download Topsheet"}
          </Button>
        )}
      </div>

      {/* Client feedback */}
      {existingPack?.clientFeedback && (
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <p className="text-xs font-medium mb-1">Client Feedback</p>
          <p className="text-xs text-muted-foreground">{existingPack.clientFeedback}</p>
        </div>
      )}
    </div>
  );
}
