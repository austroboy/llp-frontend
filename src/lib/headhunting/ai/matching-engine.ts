/**
 * LLP Headhunting — Per-Requirement AI Matching Engine
 *
 * Evaluates a candidate CV against each requirement in a mandate matrix.
 * AI evaluates in one call but assesses each requirement independently.
 * Scoring math is deterministic — not AI.
 */

import type { ParsedCV } from "../cv-parser";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export type MatchLevel =
  | "Matched"
  | "Partially Matched"
  | "Not Clearly Evident"
  | "Not Matched"
  | "Potential Red Flag";

export type Confidence = "High" | "Medium" | "Low";

export interface RequirementEvaluation {
  requirementId: string;
  matchLevel: MatchLevel;
  confidence: Confidence;
  evidence: string;        // What in the CV supports this
  missingEvidence: string; // What wasn't found
  concern?: string;        // Red flag or concern (optional)
}

export interface AggregateScores {
  overallMatchPct: number;      // 0-100, all requirements weighted
  mandatoryMatchPct: number;    // 0-100 (primary filter — must_have only)
  goodToHaveMatchPct: number;   // 0-100 (differentiation — nice_to_have only)
  riskFlagCount: number;        // Potential Red Flag + mandatory Not Matched
  recommendation: "Strong" | "Moderate" | "Weak" | "Not Recommended";
}

export interface MatchingResult {
  evaluations: RequirementEvaluation[];
  aggregate: AggregateScores;
}

export interface Requirement {
  id: string;
  label: string;
  description?: string;
  priority: "must_have" | "strong_preference" | "nice_to_have";
  weight: number; // 1-10
  category: string;
  sourceField?: string;
}

export interface MandateContext {
  title: string;
  function?: string;
  seniority?: string;
  industry?: string;
  summary?: string;
}

// Match level → numeric score for weighted calculation
function matchLevelToScore(level: MatchLevel): number {
  switch (level) {
    case "Matched":              return 1.0;
    case "Partially Matched":    return 0.6;
    case "Not Clearly Evident":  return 0.3;
    case "Not Matched":          return 0.0;
    case "Potential Red Flag":   return 0.0;
  }
}

// Compute aggregate scores deterministically from evaluations — no AI involved
function computeAggregates(
  evaluations: RequirementEvaluation[],
  requirements: Requirement[]
): AggregateScores {
  const reqMap = new Map(requirements.map(r => [r.id, r]));

  let weightedScoreSum = 0;
  let weightSum = 0;
  let mandatoryWeightedSum = 0;
  let mandatoryWeightSum = 0;
  let gthWeightedSum = 0;
  let gthWeightSum = 0;
  let riskFlagCount = 0;

  for (const ev of evaluations) {
    const req = reqMap.get(ev.requirementId);
    if (!req) continue;

    const score = matchLevelToScore(ev.matchLevel);
    const weighted = score * req.weight;

    // Overall
    weightedScoreSum += weighted;
    weightSum += req.weight;

    // Mandatory only
    if (req.priority === "must_have") {
      mandatoryWeightedSum += weighted;
      mandatoryWeightSum += req.weight;
    }

    // Good to have only
    if (req.priority === "nice_to_have") {
      gthWeightedSum += weighted;
      gthWeightSum += req.weight;
    }

    // Risk flags: Red Flag OR mandatory Not Matched
    if (
      ev.matchLevel === "Potential Red Flag" ||
      (ev.matchLevel === "Not Matched" && req.priority === "must_have")
    ) {
      riskFlagCount++;
    }
  }

  const overallMatchPct = weightSum > 0
    ? Math.round((weightedScoreSum / weightSum) * 100) : 0;

  const mandatoryMatchPct = mandatoryWeightSum > 0
    ? Math.round((mandatoryWeightedSum / mandatoryWeightSum) * 100) : 0;

  const goodToHaveMatchPct = gthWeightSum > 0
    ? Math.round((gthWeightedSum / gthWeightSum) * 100) : 0;

  // Recommendation thresholds
  const hasRedFlag = evaluations.some(e => e.matchLevel === "Potential Red Flag");

  let recommendation: AggregateScores["recommendation"];

  if (!hasRedFlag && mandatoryMatchPct >= 80 && overallMatchPct >= 70 && riskFlagCount === 0) {
    recommendation = "Strong";
  } else if (mandatoryMatchPct >= 60 && overallMatchPct >= 55) {
    recommendation = "Moderate";
  } else if (mandatoryMatchPct >= 40 && overallMatchPct >= 40) {
    recommendation = "Weak";
  } else {
    recommendation = "Not Recommended";
  }

  // Red flag caps at Weak — high overall cannot mask a disqualifier
  if (hasRedFlag && recommendation !== "Not Recommended" && recommendation !== "Weak") {
    recommendation = "Weak";
  }

  return {
    overallMatchPct,
    mandatoryMatchPct,
    goodToHaveMatchPct,
    riskFlagCount,
    recommendation,
  };
}

/**
 * Main evaluation function.
 * One Gemini call, per-requirement isolation enforced by prompt.
 * Aggregate scoring is deterministic — not AI.
 */
export async function evaluateCandidateAgainstMatrix(
  parsedCV: ParsedCV,
  rawCVText: string,
  requirements: Requirement[],
  mandateContext: MandateContext
): Promise<MatchingResult> {
  const systemPrompt = `You are an expert headhunting evaluation engine for LLP (Labor Law Partner), a professional recruitment platform.

Your task: evaluate a candidate CV against a structured requirement matrix for a specific role.

## EVALUATION RULES

1. **Evaluate each requirement in complete isolation.** Do NOT let a candidate's strength in one area influence your assessment of another.
2. **Be evidence-based.** Every match level must be supported by specific text from the CV. If you cannot cite evidence, use "Not Clearly Evident" — not "Not Matched".
3. **"Not Clearly Evident" vs "Not Matched":**
   - "Not Clearly Evident" = the requirement MAY be met, but the CV does not clearly show it
   - "Not Matched" = there is clear evidence the requirement is NOT met, or it is definitively absent
4. **"Potential Red Flag"** = use ONLY for Disqualifier-type requirements where the disqualifying condition IS present in the CV.
5. **Confidence reflects your certainty:**
   - High = strong, direct evidence in CV
   - Medium = indirect evidence or reasonable inference
   - Low = uncertain, ambiguous, or very limited information
6. **evidence field**: Quote or paraphrase specific CV content that supports your assessment.
7. **missingEvidence field**: Describe what you could NOT find that would confirm this requirement.
8. **concern field**: OPTIONAL. Use only for genuine red flags, career gaps, or notable concerns. Leave empty string if none.
9. **Do NOT compensate.** A candidate with 5 exceptional strengths and 1 mandatory miss is still a mandatory miss. Score that miss honestly.`;

  const reqList = requirements
    .map((r, i) => {
      const priorityLabel =
        r.priority === "must_have" ? "🔴 MANDATORY" :
        r.priority === "strong_preference" ? "🟡 IMPORTANT" :
        "🟢 GOOD TO HAVE";
      return `[${r.id}]
Priority: ${priorityLabel} | Weight: ${r.weight}/10 | Category: ${r.category}
Requirement: ${r.label}${r.description ? `\nDetail: ${r.description}` : ""}`;
    })
    .join("\n\n");

  const userPrompt = `## ROLE CONTEXT
Title: ${mandateContext.title}
Function: ${mandateContext.function || "Not specified"}
Seniority: ${mandateContext.seniority || "Not specified"}
Industry: ${mandateContext.industry || "Not specified"}
${mandateContext.summary ? `Context: ${mandateContext.summary}` : ""}

## REQUIREMENT MATRIX (${requirements.length} requirements)
${reqList}

## CANDIDATE CV — STRUCTURED DATA
${JSON.stringify(parsedCV, null, 2)}

## CANDIDATE CV — RAW TEXT
${rawCVText}

---

## YOUR TASK
Evaluate this candidate against EVERY requirement listed above.
Return a JSON array with exactly ${requirements.length} objects — one per requirement.

[
  {
    "requirementId": "REQ-001",
    "matchLevel": "Matched" | "Partially Matched" | "Not Clearly Evident" | "Not Matched" | "Potential Red Flag",
    "confidence": "High" | "Medium" | "Low",
    "evidence": "Specific text from CV that supports this assessment",
    "missingEvidence": "What was not found or unclear",
    "concern": ""
  }
]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI matching engine error: ${res.status} — ${errText}`);
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Parse JSON — handle both raw and markdown-wrapped responses
  let jsonStr = text.trim();
  const mdMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) jsonStr = mdMatch[1].trim();
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1"); // strip trailing commas

  const rawEvaluations = JSON.parse(jsonStr) as Array<{
    requirementId: string;
    matchLevel: string;
    confidence: string;
    evidence: string;
    missingEvidence: string;
    concern?: string;
  }>;

  // Validate and normalize
  const validMatchLevels = new Set<string>([
    "Matched",
    "Partially Matched",
    "Not Clearly Evident",
    "Not Matched",
    "Potential Red Flag",
  ]);
  const validConfidence = new Set<string>(["High", "Medium", "Low"]);

  const evaluations: RequirementEvaluation[] = rawEvaluations.map(ev => ({
    requirementId: ev.requirementId,
    matchLevel: validMatchLevels.has(ev.matchLevel)
      ? (ev.matchLevel as MatchLevel)
      : "Not Clearly Evident",
    confidence: validConfidence.has(ev.confidence)
      ? (ev.confidence as Confidence)
      : "Medium",
    evidence: ev.evidence || "",
    missingEvidence: ev.missingEvidence || "",
    concern: ev.concern || undefined,
  }));

  const aggregate = computeAggregates(evaluations, requirements);

  return { evaluations, aggregate };
}
