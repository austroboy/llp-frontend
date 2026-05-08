// Parse llp-chat-verify's batch output into one verdict per input claim.
//
// Input shape Opus emits (per `buildVerifyUserMessage` directive):
//   {"verdicts":[{"id":"c0","verdict":"agree","section":"DOC-010 §264",
//                "section_corrected":null,"result_summary":"..."}, ...]}
//
// Robustness:
// - If Opus wraps the JSON in markdown/prose, scan for the outermost `{`
//   through matching `}` and parse that span.
// - If a claim id is missing from the response, emit a `not_verifiable`
//   placeholder rather than dropping it silently.
// - If the response is unparseable, return not_verifiable for every
//   claim so the UI still renders a full row.

import type { VerifyClaim } from "./build-user-message";

export type VerifyVerdict = "agree" | "disagree" | "partial" | "not_verifiable";

export interface BatchVerdict {
  id: string;
  verdict: VerifyVerdict;
  section: string | null;
  section_corrected: string | null;
  result_summary: string;
}

function classifyVerdict(raw: unknown): VerifyVerdict {
  if (typeof raw !== "string") return "not_verifiable";
  const v = raw.toLowerCase().trim();
  if (v === "agree" || v === "disagree" || v === "partial" || v === "not_verifiable")
    return v as VerifyVerdict;
  return "not_verifiable";
}

function extractJsonSpan(text: string): string | null {
  const first = text.indexOf("{");
  if (first < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = first; i < text.length; i++) {
    const c = text[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === "\\") {
      esc = true;
      continue;
    }
    if (c === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(first, i + 1);
    }
  }
  return null;
}

function fallback(claims: VerifyClaim[], reason: string): BatchVerdict[] {
  return claims.map((c) => ({
    id: c.id,
    verdict: "not_verifiable" as const,
    section: c.expected_section || null,
    section_corrected: null,
    result_summary: reason.slice(0, 200),
  }));
}

export function parseVerifyBatch(
  content: string,
  claims: VerifyClaim[],
): BatchVerdict[] {
  if (typeof content !== "string" || !content.trim()) {
    return fallback(claims, "verify returned empty content");
  }

  const span = extractJsonSpan(content);
  if (!span) {
    return fallback(claims, "verify returned no JSON object");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(span);
  } catch {
    return fallback(claims, "verify JSON did not parse");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as { verdicts?: unknown }).verdicts)
  ) {
    return fallback(claims, "verify missing verdicts[] array");
  }

  const arr = (parsed as { verdicts: unknown[] }).verdicts;
  const byId = new Map<string, Record<string, unknown>>();
  for (const entry of arr) {
    if (entry && typeof entry === "object") {
      const rec = entry as Record<string, unknown>;
      const id = typeof rec.id === "string" ? rec.id : "";
      if (id) byId.set(id, rec);
    }
  }

  return claims.map((c): BatchVerdict => {
    const v = byId.get(c.id);
    if (!v) {
      return {
        id: c.id,
        verdict: "not_verifiable",
        section: c.expected_section || null,
        section_corrected: null,
        result_summary: "verify omitted this claim",
      };
    }
    return {
      id: c.id,
      verdict: classifyVerdict(v.verdict),
      section:
        typeof v.section === "string" && v.section
          ? v.section
          : c.expected_section || null,
      section_corrected:
        typeof v.section_corrected === "string" && v.section_corrected
          ? v.section_corrected
          : null,
      result_summary:
        typeof v.result_summary === "string"
          ? v.result_summary.slice(0, 400)
          : "",
    };
  });
}
