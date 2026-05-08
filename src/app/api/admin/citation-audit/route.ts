import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { assertSameOrigin } from "@/lib/admin-csrf";
import { writeAuditLog } from "@/lib/admin-audit";
import { rateGuard } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user || (user.publicMetadata as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") || "health";

  try {
    if (tab === "health") {
      // Citation confidence scores + stats
      const { data: confidence, error: confError } = await supabase
        .from("citation_confidence")
        .select("*")
        .order("confidence_score", { ascending: true })
        .limit(200);

      if (confError) throw confError;

      // Hallucination patterns
      const { data: patterns, error: patError } = await supabase
        .from("hallucination_patterns")
        .select("*")
        .eq("status", "active")
        .order("occurrence_count", { ascending: false })
        .limit(50);

      if (patError) throw patError;

      // Summary stats
      const total = confidence?.length || 0;
      const scores = (confidence || []).map((c) => c.confidence_score);
      const avgScore = total > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / total : 0;
      const lowCount = scores.filter((s: number) => s < 0.5).length;
      const blacklistCount = scores.filter((s: number) => s < 0.2).length;

      return NextResponse.json({
        confidence: confidence || [],
        patterns: patterns || [],
        stats: {
          totalTracked: total,
          avgConfidence: Math.round(avgScore * 100) / 100,
          lowConfidence: lowCount,
          blacklisted: blacklistCount,
        },
      });
    }

    if (tab === "log") {
      const page = parseInt(searchParams.get("page") || "1");
      const limit = 30;
      const offset = (page - 1) * limit;
      const verdict = searchParams.get("verdict") || "";
      const section = searchParams.get("section") || "";

      let query = supabase
        .from("citation_verification_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (verdict) query = query.eq("verdict", verdict);
      if (section) query = query.ilike("section", `%${section}%`);

      const { data, error, count } = await query;
      if (error) throw error;

      return NextResponse.json({
        logs: data || [],
        total: count || 0,
        page,
        limit,
      });
    }

    if (tab === "blacklist") {
      const { data, error } = await supabase
        .from("citation_confidence")
        .select("*")
        .lt("confidence_score", 0.5)
        .gt("times_cited", 0)
        .order("confidence_score", { ascending: true })
        .limit(100);

      if (error) throw error;

      return NextResponse.json({ blacklist: data || [] });
    }

    if (tab === "tree") {
      // Fetch documents
      const { data: docs, error: docsErr } = await supabase
        .from("documents")
        .select("id, title, instrument_type")
        .order("id");
      if (docsErr) throw docsErr;

      // Fetch chunks (exclude embedding column)
      const { data: chunks, error: chunksErr } = await supabase
        .from("chunks")
        .select("id, document_id, section, chapter, content, content_tokens")
        .order("id");
      if (chunksErr) throw chunksErr;

      // Fetch citation confidence
      const { data: confidence, error: confErr } = await supabase
        .from("citation_confidence")
        .select("*");
      if (confErr) throw confErr;

      // Fetch active corrections
      const { data: corrections, error: corrErr } = await supabase
        .from("admin_corrections")
        .select("*")
        .eq("is_active", true);
      if (corrErr) throw corrErr;

      // Build confidence lookup: "docId::sectionNumber" -> data
      const confMap = new Map<string, typeof confidence[0]>();
      for (const c of confidence || []) {
        confMap.set(`${c.document_id}::${c.section_number}`, c);
      }

      // Build corrections lookup: "docId::sectionNumber" -> true
      const corrMap = new Set<string>();
      for (const c of corrections || []) {
        corrMap.add(`${c.document_id}::${c.section_number}`);
      }

      // Group chunks by document -> chapter -> sections
      const tree = (docs || []).map((doc) => {
        const docChunks = (chunks || []).filter((c) => c.document_id === doc.id);

        // Group by chapter
        const chapterMap = new Map<string, typeof docChunks>();
        for (const chunk of docChunks) {
          const chapterName = chunk.chapter || "(Ungrouped)";
          if (!chapterMap.has(chapterName)) chapterMap.set(chapterName, []);
          chapterMap.get(chapterName)!.push(chunk);
        }

        const chapters = Array.from(chapterMap.entries()).map(([name, secs]) => ({
          name,
          sections: secs.map((s) => {
            const key = `${doc.id}::${s.section || ""}`;
            const conf = confMap.get(key);
            const hasFabricated = conf && conf.times_verified_fabricated > 0;
            const hasMisquoted = conf && conf.times_verified_misquoted > 0;
            return {
              chunk_id: s.id,
              section: s.section || "(untitled)",
              section_number: s.section || "",
              content_preview: (s.content || "").slice(0, 200),
              content_tokens: s.content_tokens,
              confidence_score: conf ? conf.confidence_score : null,
              times_cited: conf?.times_cited || 0,
              times_verified_correct: conf?.times_verified_correct || 0,
              times_verified_fabricated: conf?.times_verified_fabricated || 0,
              times_verified_misquoted: conf?.times_verified_misquoted || 0,
              has_correction: corrMap.has(key),
              has_warning: !!(hasFabricated || hasMisquoted),
              warning_type: hasFabricated ? "fabricated" as const : hasMisquoted ? "misquoted" as const : null,
            };
          }),
        }));

        // Aggregate confidence
        const allScores = chapters
          .flatMap((ch) => ch.sections)
          .filter((s) => s.confidence_score !== null)
          .map((s) => s.confidence_score!);
        const avgConfidence = allScores.length > 0
          ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100
          : null;

        return {
          id: doc.id,
          title: doc.title,
          instrument_type: doc.instrument_type,
          avg_confidence: avgConfidence,
          chapters,
          total_sections: docChunks.length,
        };
      });

      return NextResponse.json({ tree });
    }

    if (tab === "section-detail") {
      const chunkId = searchParams.get("chunkId");
      if (!chunkId) {
        return NextResponse.json({ error: "chunkId required" }, { status: 400 });
      }

      // Fetch chunk
      const { data: chunk, error: chunkErr } = await supabase
        .from("chunks")
        .select("id, document_id, section, chapter, content, content_tokens")
        .eq("id", parseInt(chunkId))
        .single();
      if (chunkErr) throw chunkErr;

      // Fetch confidence for this section
      const { data: confRows } = await supabase
        .from("citation_confidence")
        .select("confidence_score, times_cited, times_verified_correct, times_verified_misquoted, times_verified_fabricated, times_verified_partial")
        .eq("document_id", chunk.document_id)
        .eq("section_number", chunk.section || "")
        .limit(1);

      // Fetch existing correction
      const { data: corrRows } = await supabase
        .from("admin_corrections")
        .select("id, corrected_content, correction_note, corrected_by_email, created_at")
        .eq("document_id", chunk.document_id)
        .eq("section_number", chunk.section || "")
        .eq("is_active", true)
        .limit(1);

      // Fetch last 5 verification logs for this section
      const { data: logs } = await supabase
        .from("citation_verification_log")
        .select("id, query_text, document_id, section, verdict, confidence, explanation, verifier_model, created_at")
        .eq("document_id", chunk.document_id)
        .eq("section", chunk.section || "")
        .order("created_at", { ascending: false })
        .limit(5);

      return NextResponse.json({
        chunk,
        confidence: confRows && confRows.length > 0 ? confRows[0] : null,
        correction: corrRows && corrRows.length > 0 ? corrRows[0] : null,
        recent_logs: logs || [],
      });
    }

    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  } catch (err) {
    console.error("[admin/citation-audit] Error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// PATCH — update confidence score override (blacklist manager)
export async function PATCH(req: NextRequest) {
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
    const { id, confidence_score } = await req.json();

    if (!id || typeof confidence_score !== "number") {
      return NextResponse.json({ error: "id and confidence_score required" }, { status: 400 });
    }

    const newScore = Math.max(0, Math.min(1, confidence_score));
    const { error } = await supabase
      .from("citation_confidence")
      .update({
        confidence_score: newScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    await writeAuditLog({
      actorClerkId: user.id,
      op: "citation-audit.confidence-update",
      targetId: String(id),
      after: { confidence_score: newScore },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/citation-audit] PATCH error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// POST — Create/update admin correction (with scope restriction v3.1)
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || (user.publicMetadata as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createServerClient();

  try {
    const { document_id, section, section_number, chunk_id, original_content, corrected_content, correction_note } = await req.json();

    if (!document_id || !corrected_content) {
      return NextResponse.json({ error: "document_id and corrected_content required" }, { status: 400 });
    }

    // ── v3.1 Scope Restriction: Check if correction conflicts with operative law ──
    // Admin corrections may address INTERPRETATION only, not contradict operative law text.
    let legalConflictFlag = false;
    let legalConflictDetails: string | null = null;
    let correctionType = "interpretation";
    let reviewStatus = "active";

    if (original_content && corrected_content) {
      // Simple heuristic: if the correction changes numbers, amounts, thresholds,
      // or dates that appear in the original legal text, flag for legal review
      const numberPattern = /\b(\d+(?:,\d{3})*(?:\.\d+)?)\b/g;
      const originalNumbers = new Set<string>();
      let match: RegExpExecArray | null;
      while ((match = numberPattern.exec(original_content as string)) !== null) {
        originalNumbers.add(match[1]);
      }
      const correctedNumbers = new Set<string>();
      const numberPattern2 = /\b(\d+(?:,\d{3})*(?:\.\d+)?)\b/g;
      while ((match = numberPattern2.exec(corrected_content)) !== null) {
        correctedNumbers.add(match[1]);
      }

      // Check if correction introduces new numbers not in original
      const newNumbers: string[] = [];
      correctedNumbers.forEach((n) => { if (!originalNumbers.has(n)) newNumbers.push(n); });
      if (newNumbers.length > 0) {
        legalConflictFlag = true;
        legalConflictDetails = `Correction introduces numeric values (${newNumbers.join(", ")}) not present in operative text. This may contradict the law — legal review required.`;
        correctionType = "pending_legal_review";
        reviewStatus = "pending_legal_review";
      }
    }

    const { error } = await supabase
      .from("admin_corrections")
      .upsert(
        {
          document_id,
          section: section || "",
          section_number: section_number || "",
          chunk_id: chunk_id || null,
          original_content: original_content || null,
          corrected_content,
          correction_note: correction_note || null,
          corrected_by: user.id,
          corrected_by_email: user.emailAddresses?.[0]?.emailAddress || null,
          is_active: !legalConflictFlag, // Don't activate if flagged for legal review
          correction_type: correctionType,
          legal_conflict_flag: legalConflictFlag,
          legal_conflict_details: legalConflictDetails,
          review_status: reviewStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "document_id,section_number" },
      );

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      legal_conflict: legalConflictFlag,
      legal_conflict_details: legalConflictDetails,
    });
  } catch (err) {
    console.error("[admin/citation-audit] POST error:", err);
    return NextResponse.json({ error: "Save correction failed" }, { status: 500 });
  }
}

// DELETE — Soft-delete admin correction
export async function DELETE(req: NextRequest) {
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
    const { correction_id } = await req.json();

    if (!correction_id) {
      return NextResponse.json({ error: "correction_id required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("admin_corrections")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", correction_id);

    if (error) throw error;

    await writeAuditLog({
      actorClerkId: user.id,
      op: "citation-audit.correction-soft-delete",
      targetId: String(correction_id),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/citation-audit] DELETE error:", err);
    return NextResponse.json({ error: "Remove correction failed" }, { status: 500 });
  }
}
