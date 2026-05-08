/**
 * Fit Scorer for headhunting screening.
 * Scores each match point from the blueprint against the candidate's CV.
 */

import type { ParsedCV } from "./cv-parser";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export interface FitScoreResult {
  overallScore: number; // 0-100
  criticalMatches: Array<{
    point: string;
    met: boolean;
    score: number; // 0-100
    reason: string;
  }>;
  generalMatches: Array<{
    point: string;
    score: number; // 0-100
    reason: string;
  }>;
}

/**
 * Score a candidate's fit against blueprint match points.
 * Critical points are weighted 2x.
 */
export async function scoreFit(
  parsedCV: ParsedCV,
  blueprint: {
    title: string;
    mustHaves: string[];
    criticalMatchPoints: string[];
    generalMatchPoints?: string[];
    function?: string;
    seniority?: string;
  }
): Promise<FitScoreResult> {
  const prompt = `You are a headhunting fit-scoring engine. Score how well this candidate matches each requirement.

CANDIDATE:
${JSON.stringify(parsedCV, null, 2)}

ROLE: ${blueprint.title} (${blueprint.function || ""} / ${blueprint.seniority || ""})

Score each match point 0-100 based on evidence in the CV.

CRITICAL MATCH POINTS (high weight):
${blueprint.criticalMatchPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

GENERAL MATCH POINTS (lower weight):
${(blueprint.generalMatchPoints || []).map((p, i) => `${i + 1}. ${p}`).join("\n") || "None"}

Return JSON:
{
  "criticalMatches": [
    {"point": "exact match point text", "met": true/false, "score": 85, "reason": "Brief evidence from CV"}
  ],
  "generalMatches": [
    {"point": "exact match point text", "score": 70, "reason": "Brief evidence"}
  ]
}

Rules:
- Score 80+ means clearly met with strong evidence
- Score 50-79 means partially met or indirect evidence
- Score below 50 means not met or no evidence
- "met" is true if score >= 60
- Be honest — if no evidence exists, score low
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
    throw new Error(`Fit scoring error: ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let jsonStr = text;
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  const result = JSON.parse(jsonStr);

  // Calculate weighted overall score
  const criticalScores = (result.criticalMatches || []).map(
    (m: { score: number }) => m.score
  );
  const generalScores = (result.generalMatches || []).map(
    (m: { score: number }) => m.score
  );

  const criticalWeight = 2;
  const generalWeight = 1;
  const totalWeight =
    criticalScores.length * criticalWeight +
    generalScores.length * generalWeight;

  const weightedSum =
    criticalScores.reduce((s: number, v: number) => s + v * criticalWeight, 0) +
    generalScores.reduce((s: number, v: number) => s + v * generalWeight, 0);

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    overallScore,
    criticalMatches: result.criticalMatches || [],
    generalMatches: result.generalMatches || [],
  };
}
