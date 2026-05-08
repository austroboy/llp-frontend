import { NextRequest, NextResponse } from "next/server";
import { parseDocumentBilingual, findSectionById } from "@/lib/documents";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const docId = searchParams.get("docId");
  const sectionAnchor = searchParams.get("sectionAnchor");
  const lang = (searchParams.get("lang") as "en" | "bn") || "en";

  if (!docId || !sectionAnchor) {
    return NextResponse.json(
      { error: "Missing required parameters: docId and sectionAnchor" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();
    const chunkResult = await findInChunks(supabase, docId, sectionAnchor, lang);
    if (chunkResult) return NextResponse.json(chunkResult);

    // Fallback: parse from static text files
    const parsed = await parseDocumentBilingual(docId);
    if (parsed) {
      const primary = lang === "bn" ? parsed.bn : parsed.en;
      const fallback = lang === "bn" ? parsed.en : parsed.bn;
      const found =
        (primary ? findSectionById(primary.sections, sectionAnchor) : null) ||
        (fallback ? findSectionById(fallback.sections, sectionAnchor) : null);
      if (found) {
        return NextResponse.json({
          documentTitle: parsed.meta.title,
          documentId: docId,
          section: found.section.id,
          sectionTitle: found.section.title,
          content: found.section.content,
          chapter: found.chapter,
          language: primary && findSectionById(primary.sections, sectionAnchor) ? lang : lang === "bn" ? "en" : "bn",
        });
      }
    }

    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  } catch (error) {
    console.error("Reference API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Extract the bare section number from any anchor format.
 * Handles: "section-264", "section-2641" (mangled from 264(1)),
 *          "section-55-part-1", "rule-29", "preamble", etc.
 */
function extractSectionNumber(anchor: string): string | null {
  if (anchor === "preamble") return null;

  // "section-55-part-1" → "55"
  const partMatch = anchor.match(/^(?:section|rule)-(\d+[a-z]?)-part-\d+$/i);
  if (partMatch) return partMatch[1];

  // "section-264" or "rule-29" → "264" or "29"
  const simpleMatch = anchor.match(/^(?:section|rule)-(\d+[a-z]?)$/i);
  if (simpleMatch) return simpleMatch[1];

  // "section-2641" (mangled from "264(1)") → try to extract base
  const mangledMatch = anchor.match(/^(?:section|rule)-(\d+)$/i);
  if (mangledMatch) return mangledMatch[1];

  // Generic: extract any number
  const numMatch = anchor.match(/(\d+)/);
  return numMatch ? numMatch[1] : null;
}

/**
 * Robust chunk finder — single ILIKE query across all docs,
 * no document_id trust, no N+1 queries.
 */
async function findInChunks(
  supabase: ReturnType<typeof createServerClient>,
  docId: string,
  sectionAnchor: string,
  lang: string,
): Promise<{ documentTitle: string; documentId: string; section: string; sectionTitle: string; content: string; chapter: string | null; language: string } | null> {
  if (sectionAnchor === "preamble") {
    return queryAndReturn(supabase, docId, "Preamble", sectionAnchor, lang);
  }

  const secNum = extractSectionNumber(sectionAnchor);
  if (!secNum) return null;

  // Single query: find ALL chunks where section contains this number.
  // Use ILIKE pattern to match "Section 264", "Section 264 (Part 1)", "Rule 264", etc.
  const pattern = `%${secNum}%`;
  const { data: chunks } = await supabase
    .from("chunks")
    .select("document_id, section, chapter, content, metadata")
    .ilike("section", pattern)
    .limit(50);

  if (!chunks || chunks.length === 0) return null;

  // Score and rank matches
  const scored = chunks
    .map((chunk) => {
      const chunkSecNum = extractBareNumber(chunk.section);
      // Must be exact number match (not "1264" matching "264")
      if (chunkSecNum !== secNum.toUpperCase()) return null;

      let score = 0;

      // Prefer requested document
      if (chunk.document_id === docId) score += 100;
      // Prefer DOC-001/DOC-010 (base act) — most comprehensive
      if (chunk.document_id === "DOC-001" || chunk.document_id === "DOC-010") score += 30;
      // Prefer DOC-006 (latest amendment) for amendment doc requests
      if (docId.startsWith("DOC-00") && chunk.document_id === "DOC-006") score += 50;
      // Prefer DOC-007 for rules
      if (sectionAnchor.startsWith("rule-") && chunk.document_id === "DOC-007") score += 80;
      // Prefer Part 1 over Part 2 (Part 1 usually has the main provision)
      if (chunk.section.includes("Part 1")) score += 10;
      if (chunk.section.includes("Part 2")) score += 5;
      // Prefer exact "Section X" over "Section X (Part N)"
      if (chunk.section === `Section ${secNum}` || chunk.section === `Section ${secNum.toUpperCase()}`) score += 20;
      // Prefer longer content (more substance)
      score += Math.min(chunk.content.length / 100, 10);

      return { chunk, score };
    })
    .filter(Boolean) as Array<{ chunk: typeof chunks[0]; score: number }>;

  if (scored.length === 0) {
    // Number match failed — might be mangled. Try truncating: "2641" → "264"
    if (secNum.length >= 4) {
      for (let trim = 1; trim <= 2; trim++) {
        const truncated = secNum.slice(0, -trim);
        const result = await findInChunks(supabase, docId, `section-${truncated}`, lang);
        if (result) return result;
      }
    }
    return null;
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].chunk;
  const meta = typeof best.metadata === "string" ? JSON.parse(best.metadata) : (best.metadata || {});

  return {
    documentTitle: meta.document_title || best.document_id,
    documentId: best.document_id,
    section: sectionAnchor,
    sectionTitle: best.section,
    content: best.content,
    chapter: best.chapter || null,
    language: meta.language || lang,
  };
}

/** Extract bare number from section label: "Section 264 (Part 1)" → "264" */
function extractBareNumber(section: string): string {
  const m = section.match(/(?:Section|Rule)\s+(\d+[A-Za-z]?)/i);
  return m ? m[1].toUpperCase() : "";
}

/** Simple exact-label query helper */
async function queryAndReturn(
  supabase: ReturnType<typeof createServerClient>,
  docId: string,
  label: string,
  sectionAnchor: string,
  lang: string,
) {
  // Try specific doc first, then any doc
  for (const filter of [{ document_id: docId }, {}]) {
    let query = supabase
      .from("chunks")
      .select("document_id, section, chapter, content, metadata")
      .eq("section", label)
      .limit(1);
    if ("document_id" in filter && filter.document_id) {
      query = query.eq("document_id", filter.document_id);
    }
    const { data } = await query;
    if (data && data.length > 0) {
      const chunk = data[0];
      const chunkMeta = typeof chunk.metadata === "string" ? JSON.parse(chunk.metadata) : (chunk.metadata || {});
      return {
        documentTitle: chunkMeta.document_title || chunk.document_id,
        documentId: chunk.document_id,
        section: sectionAnchor,
        sectionTitle: chunk.section,
        content: chunk.content,
        chapter: chunk.chapter || null,
        language: chunkMeta.language || lang,
      };
    }
  }
  return null;
}
