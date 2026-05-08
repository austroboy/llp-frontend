import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getDocumentById, getBilingualFlags } from "@/lib/documents";
import { getDocumentText, getDocumentTextSize } from "@/lib/document-storage";
import { runStaticChecks } from "@/lib/audit/static-checks";
import { runStalenessCheck } from "@/lib/audit/staleness-check";
import { runPdfAlignmentCheck } from "@/lib/audit/pdf-alignment-check";
import { runAIQualityCheck } from "@/lib/audit/ai-quality-check";
import { writeAuditLog } from "@/lib/audit/log-writer";
import { TokenTracker } from "@/lib/audit/token-tracker";
import { QUALITY_MODE_META } from "@/lib/audit/types";
import type { AuditEvent, AuditFinding, AuditSummary, QualityMode } from "@/lib/audit/types";

interface PublicMetadata {
  role?: string;
}

async function requireAdmin() {
  const user = await currentUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  const role = (user.publicMetadata as PublicMetadata)?.role;
  if (role !== "admin") return { error: "Forbidden", status: 403 };
  return null;
}

function encodeEvent(event: AuditEvent): string {
  return JSON.stringify(event) + "\n";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) {
    return new Response(JSON.stringify({ error: authErr.error }), {
      status: authErr.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;
  const doc = await getDocumentById(id);
  if (!doc) {
    return new Response(JSON.stringify({ error: "Document not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Read mode and language from request body
  let mode: QualityMode = "standard";
  let targetLang: "en" | "bn" = "en";
  try {
    const body = await request.json();
    if (body.mode === "premium") mode = "premium";
    if (body.language === "bn") targetLang = "bn";
  } catch {
    // No body or invalid JSON — use defaults
  }

  const startTime = Date.now();

  // Load the targeted language's text from Supabase
  // Also load the other language if needed for translation quality comparison
  const flags = await getBilingualFlags(id);
  let enText: string | null = null;
  let bnText: string | null = null;
  let enFileSize: number | null = null;
  let bnFileSize: number | null = null;

  if (targetLang === "en" || flags.bnTranslated) {
    enText = await getDocumentText(id, "en");
    if (targetLang === "en") enFileSize = await getDocumentTextSize(id, "en");
  }
  if (targetLang === "bn" || flags.enTranslated) {
    bnText = await getDocumentText(id, "bn");
    if (targetLang === "bn") bnFileSize = await getDocumentTextSize(id, "bn");
  }

  // Determine if the targeted language is an AI translation
  const isTranslated =
    (targetLang === "en" && flags.enTranslated) ||
    (targetLang === "bn" && flags.bnTranslated);

  const allFindings: AuditFinding[] = [];
  const tracker = new TokenTracker();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AuditEvent) => {
        controller.enqueue(new TextEncoder().encode(encodeEvent(event)));
        if (event.type === "finding") allFindings.push(event.finding);
      };

      try {
        if (isTranslated) {
          // ── Reduced audit for translated docs ──
          // Only run staleness + basic integrity (garbled text, AI preamble).
          // Skip section counts, file size, PDF alignment, AI quality — these are
          // either irrelevant or handled by the dedicated Verify button.

          emit({ type: "progress", tier: "static", message: `Running basic integrity checks (${targetLang.toUpperCase()}, translated)...` });
          const staticFindings = runStaticChecks(
            id,
            { id: doc.id, pages: doc.pages, language: doc.language, is_parent: doc.is_parent, amends: doc.amends },
            enText,
            bnText,
            enFileSize,
            bnFileSize,
            true // translatedMode — skip section counts, file size, section gaps
          );
          for (const f of staticFindings) emit({ type: "finding", finding: f });

          emit({ type: "progress", tier: "staleness", message: "Checking chunk freshness..." });
          const stalenessFindings = await runStalenessCheck(id);
          for (const f of stalenessFindings) emit({ type: "finding", finding: f });

        } else {
          // ── Full audit for original docs ──

          // ── Tier 1: Static checks ──
          emit({ type: "progress", tier: "static", message: `Running static analysis (${targetLang.toUpperCase()})...` });
          const staticFindings = runStaticChecks(
            id,
            { id: doc.id, pages: doc.pages, language: doc.language, is_parent: doc.is_parent, amends: doc.amends },
            enText,
            bnText,
            enFileSize,
            bnFileSize
          );
          for (const f of staticFindings) emit({ type: "finding", finding: f });

          // ── Tier 2: Staleness check ──
          emit({ type: "progress", tier: "staleness", message: "Checking chunk freshness..." });
          const stalenessFindings = await runStalenessCheck(id);
          for (const f of stalenessFindings) emit({ type: "finding", finding: f });

          // ── Tier 3: PDF alignment ──
          emit({ type: "progress", tier: "pdf-alignment", message: `Checking PDF-text alignment (${targetLang.toUpperCase()}, Mistral OCR)...` });
          const pdfFindings = await runPdfAlignmentCheck(id, targetLang, tracker);
          for (const f of pdfFindings) emit({ type: "finding", finding: f });

          // ── Tier 4: AI quality ──
          const aiModelLabel = mode === "premium" ? "Gemini 2.5 Pro" : "Gemini 2.5 Flash";
          emit({ type: "progress", tier: "ai-quality", message: `Running AI quality analysis (${aiModelLabel})...` });
          const aiFindings = await runAIQualityCheck(id, enText, bnText, mode, tracker);
          for (const f of aiFindings) emit({ type: "finding", finding: f });
        }

        // ── Summary ──
        const errors = allFindings.filter((f) => f.severity === "error").length;
        const warnings = allFindings.filter((f) => f.severity === "warning").length;
        const infos = allFindings.filter((f) => f.severity === "info").length;

        // Health score: start at 100, deduct 20/error, 8/warning
        const rawScore = 100 - errors * 20 - warnings * 8;
        const healthScore = Math.max(0, Math.min(100, rawScore));

        const summary: AuditSummary = {
          documentId: id,
          totalFindings: allFindings.length,
          errors,
          warnings,
          infos,
          healthScore,
          health: healthScore >= 70 ? "good" : healthScore >= 40 ? "fair" : "poor",
          auditedAt: new Date().toISOString(),
          duration: Date.now() - startTime,
        };

        emit({ type: "done", summary });

        // Log to audit_logs
        const user = await currentUser();
        const aiModel = isTranslated ? undefined : QUALITY_MODE_META[mode]?.auditModel;
        writeAuditLog({
          operation: "audit",
          document_id: id,
          document_title: doc.title,
          language: targetLang,
          user_id: user?.id ?? "unknown",
          user_email: user?.emailAddresses?.[0]?.emailAddress,
          quality_mode: mode,
          ai_model: aiModel,
          health_score: summary.healthScore,
          health: summary.health,
          total_findings: summary.totalFindings,
          errors: summary.errors,
          warnings: summary.warnings,
          infos: summary.infos,
          duration_ms: summary.duration,
          tokens: tracker.getUsage(),
          cost_usd: tracker.calculateCost(),
        }).catch(console.error);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          new TextEncoder().encode(
            JSON.stringify({ type: "error", message: errorMsg }) + "\n"
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
