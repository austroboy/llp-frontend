/**
 * Gap Detector for headhunting screening.
 * Compares parsed CV data against blueprint requirements to identify gaps.
 */

import type { ParsedCV } from "./cv-parser";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export interface GapAnalysis {
  gaps: string[];
  strengths: string[];
  risks: string[];
  complianceFlags: string[];
  clarificationQuestions: string[];
}

/**
 * Detect gaps between a candidate's CV and the role blueprint requirements.
 */
export async function detectGaps(
  parsedCV: ParsedCV,
  blueprint: {
    title: string;
    mustHaves: string[];
    dealBreakers?: string[];
    criticalMatchPoints: string[];
    generalMatchPoints?: string[];
    function?: string;
    seniority?: string;
    location?: string;
  }
): Promise<GapAnalysis> {
  const prompt = `You are a headhunting screening specialist. Compare this candidate's CV data against the role requirements and identify gaps, strengths, and risks.

CANDIDATE DATA:
${JSON.stringify(parsedCV, null, 2)}

ROLE REQUIREMENTS:
- Title: ${blueprint.title}
- Function: ${blueprint.function || "Not specified"}
- Seniority: ${blueprint.seniority || "Not specified"}
- Location: ${blueprint.location || "Not specified"}
- Must-Haves: ${blueprint.mustHaves.join("; ")}
- Deal Breakers: ${(blueprint.dealBreakers || []).join("; ") || "None specified"}
- Critical Match Points: ${blueprint.criticalMatchPoints.join("; ")}
- General Match Points: ${(blueprint.generalMatchPoints || []).join("; ") || "None specified"}

Return a JSON object:
{
  "gaps": ["Specific missing qualifications or experience — one per item"],
  "strengths": ["Where candidate exceeds requirements — one per item"],
  "risks": ["Potential concerns (e.g. short tenures, gaps, overqualified) — one per item"],
  "complianceFlags": ["Any labour law or regulatory concerns relevant to this role in Bangladesh context"],
  "clarificationQuestions": ["Questions the scout should ask the candidate to fill information gaps"]
}

Be specific and actionable. Reference actual CV data vs actual requirements. Return ONLY valid JSON.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gap detection error: ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let jsonStr = text;
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(jsonStr);
}
