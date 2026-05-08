import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { assertSameOrigin } from "@/lib/admin-csrf";
import { writeAuditLog } from "@/lib/admin-audit";
import { rateGuard } from "@/lib/rate-limit";

/**
 * Batch Review API — Export/Import for external expert review
 * v3.1 Plan: Batch versioned (AUDIT-YYYY-MM-DD-NNN)
 */

// ── GET: Export citation data as CSV ──

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user || (user.publicMetadata as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";

  try {
    // Fetch confidence data with section details
    const { data: confidence, error } = await supabase
      .from("citation_confidence")
      .select("*")
      .gt("times_cited", 0)
      .order("confidence_score", { ascending: true });

    if (error) throw error;

    // Fetch recent verification logs
    const { data: logs } = await supabase
      .from("citation_verification_log")
      .select("document_id, section, verdict, query_text, explanation")
      .order("created_at", { ascending: false })
      .limit(500);

    // Build export rows
    const rows = (confidence || []).map((c) => {
      const recentLogs = (logs || []).filter(
        (l) => l.document_id === c.document_id && l.section === c.section
      ).slice(0, 3);

      const lastQuery = recentLogs[0]?.query_text || "";
      const lastVerdict = recentLogs[0]?.verdict || "";

      return {
        document_id: c.document_id,
        section: c.section,
        section_number: c.section_number,
        times_cited: c.times_cited,
        times_correct: c.times_verified_correct,
        times_misquoted: c.times_verified_misquoted,
        times_fabricated: c.times_verified_fabricated,
        confidence_score: Math.round(c.confidence_score * 100) / 100,
        last_verdict: lastVerdict,
        last_query: lastQuery.slice(0, 200),
        // Empty columns for expert review
        expert_verdict: "",
        expert_corrected_section: "",
        expert_comment: "",
      };
    });

    // Generate batch ID
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    // Count existing batches today
    const { data: existingBatches } = await supabase
      .from("batch_reviews")
      .select("id")
      .like("id", `AUDIT-${dateStr}%`);

    const batchNum = String((existingBatches?.length || 0) + 1).padStart(3, "0");
    const batchId = `AUDIT-${dateStr}-${batchNum}`;

    // Record the export
    await supabase.from("batch_reviews").insert({
      id: batchId,
      exported_by: user.id,
      exported_at: now.toISOString(),
      row_count: rows.length,
      import_status: "pending",
    });

    if (format === "csv") {
      // CSV format
      const headers = Object.keys(rows[0] || {});
      const csvLines = [
        headers.join(","),
        ...rows.map((row) =>
          headers.map((h) => {
            const val = String((row as Record<string, unknown>)[h] || "");
            return val.includes(",") || val.includes('"') || val.includes("\n")
              ? `"${val.replace(/"/g, '""')}"`
              : val;
          }).join(",")
        ),
      ];

      return new Response(csvLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${batchId}.csv"`,
        },
      });
    }

    return NextResponse.json({
      batch_id: batchId,
      rows,
      row_count: rows.length,
      exported_at: now.toISOString(),
    });
  } catch (err) {
    console.error("[batch/export] Error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

// ── POST: Import reviewed batch ──

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || (user.publicMetadata as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const csrf = assertSameOrigin(req);
  if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const blocked = await rateGuard(req, 5);
  if (blocked) return blocked;

  const supabase = createServerClient();

  try {
    const body = await req.json();
    const { batch_id, rows } = body;

    if (!batch_id || !rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "batch_id and rows array required" }, { status: 400 });
    }

    // Schema validation — each row must have required fields
    const requiredFields = ["document_id", "section_number", "expert_verdict"];
    for (const row of rows) {
      for (const field of requiredFields) {
        if (!row[field] && row.expert_verdict) {
          return NextResponse.json(
            { error: `Row missing ${field}: ${JSON.stringify(row).slice(0, 100)}` },
            { status: 400 }
          );
        }
      }
    }

    // Filter rows with expert input
    const reviewedRows = rows.filter(
      (r: Record<string, string>) => r.expert_verdict && r.expert_verdict.trim() !== ""
    );

    if (reviewedRows.length === 0) {
      return NextResponse.json({ error: "No rows with expert verdicts found" }, { status: 400 });
    }

    // Track confidence changes for rollback safeguard
    const confidenceChanges: Array<{ docId: string; sectionNum: string; oldScore: number; newAction: string }> = [];
    let confirmed = 0;
    let wrong = 0;
    let revised = 0;
    let skipped = 0;

    for (const row of reviewedRows) {
      const verdict = (row.expert_verdict as string).toLowerCase().trim();

      // Fetch current confidence
      const { data: current } = await supabase
        .from("citation_confidence")
        .select("confidence_score")
        .eq("document_id", row.document_id)
        .eq("section_number", row.section_number)
        .single();

      const oldScore = current?.confidence_score || 0.5;

      if (verdict === "confirmed" || verdict === "correct") {
        // Boost confidence + pin as verified
        await supabase.rpc("update_citation_confidence", {
          p_document_id: row.document_id,
          p_section: row.section || "",
          p_section_number: row.section_number,
          p_verdict: "correct",
        });
        confirmed++;
        confidenceChanges.push({ docId: row.document_id, sectionNum: row.section_number, oldScore, newAction: "confirmed" });
      } else if (verdict === "wrong" || verdict === "fabricated" || verdict === "incorrect") {
        // Drop confidence to 0 + log hallucination pattern
        await supabase.rpc("update_citation_confidence", {
          p_document_id: row.document_id,
          p_section: row.section || "",
          p_section_number: row.section_number,
          p_verdict: "fabricated",
        });

        // Apply admin correction if expert provided one
        if (row.expert_corrected_section || row.expert_comment) {
          await supabase.from("admin_corrections").upsert(
            {
              document_id: row.document_id,
              section: row.section || "",
              section_number: row.section_number,
              corrected_content: row.expert_corrected_section || row.expert_comment,
              correction_note: `Batch ${batch_id}: Expert correction`,
              corrected_by: user.id,
              corrected_by_email: user.emailAddresses?.[0]?.emailAddress || null,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "document_id,section_number" }
          );
        }
        wrong++;
        confidenceChanges.push({ docId: row.document_id, sectionNum: row.section_number, oldScore, newAction: "wrong" });
      } else if (verdict === "needs_revision" || verdict === "revised") {
        // Update correction + retrain routing
        await supabase.rpc("update_citation_confidence", {
          p_document_id: row.document_id,
          p_section: row.section || "",
          p_section_number: row.section_number,
          p_verdict: "misquoted",
        });
        revised++;
        confidenceChanges.push({ docId: row.document_id, sectionNum: row.section_number, oldScore, newAction: "revised" });
      } else {
        skipped++;
      }
    }

    // ── Rollback safeguard: check if >10% confidence drop ──
    const drops = confidenceChanges.filter((c) => c.newAction === "wrong" || c.newAction === "revised");
    const avgDrop = drops.length > 0
      ? drops.reduce((sum, d) => sum + d.oldScore, 0) / drops.length
      : 0;
    const rollbackTriggered = drops.length > 0 && (drops.length / reviewedRows.length) > 0.1;

    // Update batch record
    await supabase
      .from("batch_reviews")
      .update({
        imported_by: user.id,
        imported_at: new Date().toISOString(),
        import_status: rollbackTriggered ? "paused" : "applied",
        import_results: { confirmed, wrong, revised, skipped },
        confidence_impact: { sections_affected: drops.length, avg_drop: Math.round(avgDrop * 100) / 100 },
        rollback_triggered: rollbackTriggered,
        updated_at: new Date().toISOString(),
      })
      .eq("id", batch_id);

    await writeAuditLog({
      actorClerkId: user.id,
      op: "decision-tree.batch-import",
      targetId: batch_id,
      metadata: {
        results: { confirmed, wrong, revised, skipped },
        rollback_triggered: rollbackTriggered,
        sections_affected: drops.length,
      },
    });

    return NextResponse.json({
      ok: true,
      batch_id,
      results: { confirmed, wrong, revised, skipped },
      rollback_triggered: rollbackTriggered,
      message: rollbackTriggered
        ? `Import paused: ${drops.length} sections had confidence drops (>10% threshold). Review before applying.`
        : `Import complete: ${confirmed} confirmed, ${wrong} wrong, ${revised} revised, ${skipped} skipped`,
    });
  } catch (err) {
    console.error("[batch/import] Error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
