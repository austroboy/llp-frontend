/**
 * Staleness check — compares chunk timestamps against document text update times.
 */
import { createClient } from "@supabase/supabase-js";
import { getBilingualFlags } from "@/lib/registry";
import type { AuditFinding } from "./types";

export async function runStalenessCheck(docId: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  let idx = 0;
  const fid = () => `stale-${idx++}`;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    findings.push({
      id: fid(),
      category: "staleness",
      severity: "warning",
      title: "Cannot check staleness",
      description: "Supabase credentials not configured.",
    });
    return findings;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get chunk count and latest created_at
  const { count: chunkCount, error: countErr } = await supabase
    .from("chunks")
    .select("id", { count: "exact", head: true })
    .eq("document_id", docId);

  if (countErr) {
    findings.push({
      id: fid(),
      category: "staleness",
      severity: "warning",
      title: "Database query failed",
      description: `Could not query chunks: ${countErr.message}`,
    });
    return findings;
  }

  // No chunks at all
  if (!chunkCount || chunkCount === 0) {
    findings.push({
      id: fid(),
      category: "staleness",
      severity: "error",
      title: "Never RAG'd",
      description: "This document has no chunks in the database. It won't appear in search results.",
      action: {
        type: "re-rag",
        label: "RAG Now",
        description: "Run chunking + embedding pipeline for this document",
      },
    });
    return findings;
  }

  // Get latest chunk timestamp
  const { data: latestChunk } = await supabase
    .from("chunks")
    .select("created_at")
    .eq("document_id", docId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const latestChunkDate = latestChunk?.created_at
    ? new Date(latestChunk.created_at)
    : null;

  // Check null embeddings
  const { count: nullEmbeddings } = await supabase
    .from("chunks")
    .select("id", { count: "exact", head: true })
    .eq("document_id", docId)
    .is("embedding", null);

  if (nullEmbeddings && nullEmbeddings > 0) {
    findings.push({
      id: fid(),
      category: "staleness",
      severity: "error",
      title: "Missing embeddings",
      description: `${nullEmbeddings} of ${chunkCount} chunks have no embedding. They won't appear in search.`,
      action: {
        type: "re-rag",
        label: "Re-embed",
        description: "Re-generate embeddings for chunks with missing vectors",
      },
    });
  }

  // Compare document text update time against chunk timestamp
  const flags = await getBilingualFlags(docId);
  const langsToCheck: ("en" | "bn")[] = [];
  if (flags.hasEn) langsToCheck.push("en");
  if (flags.hasBn) langsToCheck.push("bn");

  let textModified = false;
  for (const lang of langsToCheck) {
    // Query document_texts updated_at for this doc/lang
    const { data: textRow } = await supabase
      .from("document_texts")
      .select("updated_at")
      .eq("document_id", docId)
      .eq("language", lang)
      .single();

    if (!textRow?.updated_at) continue;
    const textUpdated = new Date(textRow.updated_at);

    if (latestChunkDate && textUpdated > latestChunkDate) {
      textModified = true;
      findings.push({
        id: fid(),
        category: "staleness",
        severity: "error",
        title: "Text newer than chunks",
        description: `${lang.toUpperCase()} text was updated on ${textUpdated.toLocaleDateString()} but chunks are from ${latestChunkDate.toLocaleDateString()}. Chunks are stale.`,
        language: lang,
        action: {
          type: "re-rag",
          label: "Re-RAG",
          description: "Re-chunk and re-embed to match updated text",
        },
      });
    }
  }

  if (!textModified && latestChunkDate) {
    findings.push({
      id: fid(),
      category: "staleness",
      severity: "info",
      title: "RAG is current",
      description: `${chunkCount} chunks, last indexed ${latestChunkDate.toLocaleDateString()}.${nullEmbeddings === 0 ? " All chunks have embeddings." : ""}`,
    });
  }

  return findings;
}
