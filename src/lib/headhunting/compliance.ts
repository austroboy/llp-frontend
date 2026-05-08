/**
 * Compliance Integration for Headhunting.
 * Queries the RAG engine (Supabase pgvector) for applicable labour law provisions
 * based on role blueprint parameters.
 */

import { createServerClient } from "@/lib/supabase";
import { getEmbeddingProvider } from "@/lib/ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export interface ComplianceBrief {
  applicableSections: Array<{
    section: string;
    document: string;
    summary: string;
    relevance: "high" | "medium" | "low";
  }>;
  keyObligations: string[];
  riskAreas: string[];
  contractClauses: string[];
}

/**
 * Sections to always check for any headhunting placement in Bangladesh.
 */
const CORE_QUERIES = [
  "termination procedures and notice period requirements",
  "probation period conditions and rules",
  "overtime payment and working hours limits",
  "maternity benefits and leave entitlements",
  "provident fund EPF and gratuity obligations",
  "appointment letter and employment contract requirements",
  "wages payment and deduction rules",
];

/**
 * Generate a compliance brief for a role blueprint.
 * Queries the RAG engine for relevant labour law provisions.
 */
export async function generateComplianceBrief(
  blueprint: {
    title: string;
    function?: string;
    seniority?: string;
    location?: string;
    mustHaves?: string[];
  }
): Promise<ComplianceBrief> {
  const supabase = createServerClient();
  const embeddingProvider = getEmbeddingProvider();

  // Build role-specific queries
  const roleQueries = [
    ...CORE_QUERIES,
    `${blueprint.title} employment requirements Bangladesh`,
    blueprint.seniority
      ? `${blueprint.seniority} level management employment rules`
      : "",
    blueprint.function
      ? `${blueprint.function} department specific labour requirements`
      : "",
  ].filter(Boolean);

  // Fetch relevant chunks from RAG
  const allChunks: Array<{
    section: string;
    document_title: string;
    content: string;
    similarity: number;
  }> = [];

  // Query in parallel (batches of 3 to avoid rate limits)
  for (let i = 0; i < roleQueries.length; i += 3) {
    const batch = roleQueries.slice(i, i + 3);
    const results = await Promise.all(
      batch.map(async (q) => {
        try {
          const embedding = await embeddingProvider.getEmbedding(q);
          const { data } = await supabase.rpc("match_chunks", {
            query_embedding: embedding,
            match_threshold: 0.3,
            match_count: 3,
          });
          return data || [];
        } catch {
          return [];
        }
      })
    );
    for (const chunks of results) {
      for (const chunk of chunks) {
        // Deduplicate by section
        if (!allChunks.some((c) => c.section === chunk.section)) {
          allChunks.push(chunk);
        }
      }
    }
  }

  // Sort by relevance
  allChunks.sort((a, b) => b.similarity - a.similarity);
  const topChunks = allChunks.slice(0, 15);

  if (topChunks.length === 0) {
    return {
      applicableSections: [],
      keyObligations: ["No relevant provisions found in current Universe dataset."],
      riskAreas: [],
      contractClauses: [],
    };
  }

  // Use Gemini to synthesize a compliance brief
  const context = topChunks
    .map((c) => `[${c.document_title} — ${c.section}]\n${c.content}`)
    .join("\n\n---\n\n");

  const prompt = `You are a Bangladesh labour law compliance specialist for a headhunting firm.

ROLE BEING FILLED:
- Title: ${blueprint.title}
- Function: ${blueprint.function || "General"}
- Seniority: ${blueprint.seniority || "Not specified"}
- Location: ${blueprint.location || "Bangladesh"}

RELEVANT LEGAL PROVISIONS:
${context}

Based on the above legal provisions, generate a compliance brief for this placement. Return JSON:

{
  "applicableSections": [
    {"section": "Section 26 — Termination", "document": "Labour Act 2006", "summary": "Brief summary of what applies", "relevance": "high"}
  ],
  "keyObligations": ["Specific obligation for this placement — one per item"],
  "riskAreas": ["Potential compliance risks for this role — one per item"],
  "contractClauses": ["Suggested contract clauses to include — one per item"]
}

Rules:
- Only cite sections that actually appear in the provided context
- Relevance: "high" = directly applicable, "medium" = generally applicable, "low" = tangentially related
- For contract clauses, be specific and practical
- If the 2025 Ordinance amends a provision, note the latest version
- Return ONLY valid JSON`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Compliance check error: ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let jsonStr = text;
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(jsonStr);
}
