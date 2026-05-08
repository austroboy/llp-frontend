import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { rateGuard } from "@/lib/rate-limit";

export const maxDuration = 60;

// ─── Types ──────────────────────────────────────────────────────

interface ExtractionFieldResult {
  value: unknown;
  state: "extracted" | "inferred" | "missing";
  confidence: number;
  sourceQuote?: string | null;
  reasoning?: string | null;
}

interface ExtractionResponse {
  fields: Record<string, ExtractionFieldResult>;
}

// ─── Gemini Config ──────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=`;

// ─── Extraction Prompt ──────────────────────────────────────────

function buildExtractionPrompt(sourceText: string): string {
  return `You are a role architect assistant for LLP, a professional headhunting firm in Bangladesh.

Given the following job description / hiring brief, extract structured information for a Role Blueprint.

## Source Material
${sourceText}

## Instructions
For each field below, provide:
- value: the extracted or suggested value
- state: "extracted" (clearly found in text), "inferred" (reasonably deduced), or "missing" (not found)
- confidence: 0-100 integer
- source_quote: the relevant text passage if extracted, or null
- reasoning: brief explanation for inferred values, or null

## Fields to Extract (look for these in the text)
1. title - The job/role title
2. department - Department or business unit
3. reportingLine - Who this role reports to
4. location - Work location (city, country)
5. mandatoryEducation - Required education/qualifications
6. minimumExperience - Required years of experience (return as { "years": number, "note": "context" })
7. mustHaves - List of must-have requirements (return as array of strings)
8. dealBreakers - List of deal-breaker criteria (return as array of strings)
9. licensesOrCertifications - Required licenses or certifications (array of strings)
10. travelMobilityRequirement - Travel or mobility requirements
11. languageRequirement - Required languages (array of strings)
12. criticalMatchPoints - Key criteria that drive candidate fit (array of strings)

## Fields to Suggest (use context clues and professional judgment)
13. roleBand - "entry_junior" (up to Asst Manager), "management_functional" (Asst Manager to Director), or "executive_clevel" (CXO/MD/Country Head)
14. businessStage - One of: "Greenfield / New Setup", "Early Build / Foundation Stage", "Growth / Scale-Up", "Mature / Stable Operations", "Transformation / Change Phase", "Turnaround / Recovery", "Restructuring / Post-Merger / Reorganization", "Project Phase / Construction Phase", "Market Entry / New Geography Expansion", "Confidential / Not yet disclosed"
15. primaryMissionArchetype - "builder" (create from scratch), "stabilizer" (bring order), "maintainer" (keep running), "transformer" (lead change), "scaler" (expand)
16. whyRoleExists - Brief explanation of why this position exists
17. whyNow - Why is this hire happening now (if inferable, otherwise state: "missing")
18. searchGeography - Where to search for candidates
19. function - The functional area (e.g., "Human Resources", "Finance", "Engineering")

Return a valid JSON object with a "fields" key containing all 19 fields.
Each field should have: value, state, confidence, source_quote, reasoning.
Return ONLY valid JSON, no markdown wrapping.`;
}

// ─── Simplified retry prompt ────────────────────────────────────

function buildSimplePrompt(sourceText: string): string {
  return `Extract job description data into JSON. Return ONLY valid JSON, no markdown.

Source text:
${sourceText}

Return this exact structure:
{
  "fields": {
    "title": { "value": "...", "state": "extracted", "confidence": 90, "source_quote": null, "reasoning": null },
    "department": { "value": "...", "state": "extracted", "confidence": 80, "source_quote": null, "reasoning": null },
    "reportingLine": { "value": "...", "state": "missing", "confidence": 0, "source_quote": null, "reasoning": null },
    "location": { "value": "...", "state": "extracted", "confidence": 85, "source_quote": null, "reasoning": null },
    "mandatoryEducation": { "value": "...", "state": "extracted", "confidence": 80, "source_quote": null, "reasoning": null },
    "minimumExperience": { "value": { "years": 0, "note": "" }, "state": "missing", "confidence": 0, "source_quote": null, "reasoning": null },
    "mustHaves": { "value": [], "state": "missing", "confidence": 0, "source_quote": null, "reasoning": null },
    "dealBreakers": { "value": [], "state": "missing", "confidence": 0, "source_quote": null, "reasoning": null },
    "licensesOrCertifications": { "value": [], "state": "missing", "confidence": 0, "source_quote": null, "reasoning": null },
    "travelMobilityRequirement": { "value": "", "state": "missing", "confidence": 0, "source_quote": null, "reasoning": null },
    "languageRequirement": { "value": [], "state": "missing", "confidence": 0, "source_quote": null, "reasoning": null },
    "criticalMatchPoints": { "value": [], "state": "missing", "confidence": 0, "source_quote": null, "reasoning": null },
    "roleBand": { "value": "management_functional", "state": "inferred", "confidence": 60, "source_quote": null, "reasoning": "..." },
    "businessStage": { "value": "Mature / Stable Operations", "state": "inferred", "confidence": 50, "source_quote": null, "reasoning": "..." },
    "primaryMissionArchetype": { "value": "maintainer", "state": "inferred", "confidence": 50, "source_quote": null, "reasoning": "..." },
    "whyRoleExists": { "value": "...", "state": "inferred", "confidence": 50, "source_quote": null, "reasoning": "..." },
    "whyNow": { "value": null, "state": "missing", "confidence": 0, "source_quote": null, "reasoning": null },
    "searchGeography": { "value": "...", "state": "inferred", "confidence": 60, "source_quote": null, "reasoning": "..." },
    "function": { "value": "...", "state": "inferred", "confidence": 70, "source_quote": null, "reasoning": "..." }
  }
}

Fill in actual extracted values from the source text. Set state="extracted" for fields found in text, "inferred" for deduced fields, "missing" for fields not found.`;
}

// ─── Gemini Call ────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[blueprint/extract] Gemini API error:", res.status, errBody.slice(0, 500));
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const geminiResponse = await res.json();
  const responseText =
    geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!responseText) {
    throw new Error("Gemini returned empty response");
  }

  return responseText;
}

// ─── JSON Parsing ───────────────────────────────────────────────

function parseExtractionJSON(raw: string): ExtractionResponse {
  let jsonStr = raw.trim();

  // Strip markdown code fence if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Fix trailing commas
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  const parsed = JSON.parse(jsonStr);

  // Validate structure
  if (!parsed.fields || typeof parsed.fields !== "object") {
    throw new Error("Response missing 'fields' key");
  }

  // Normalize each field to ensure consistent shape
  const ALL_FIELDS = [
    "title", "department", "reportingLine", "location",
    "mandatoryEducation", "minimumExperience", "mustHaves",
    "dealBreakers", "licensesOrCertifications", "travelMobilityRequirement",
    "languageRequirement", "criticalMatchPoints", "roleBand",
    "businessStage", "primaryMissionArchetype", "whyRoleExists",
    "whyNow", "searchGeography", "function",
  ];

  const normalized: Record<string, ExtractionFieldResult> = {};

  for (const fieldName of ALL_FIELDS) {
    const raw = parsed.fields[fieldName];
    if (raw && typeof raw === "object" && "value" in raw && "state" in raw) {
      normalized[fieldName] = {
        value: raw.value,
        state: validateState(raw.state),
        confidence: clampConfidence(raw.confidence),
        sourceQuote: raw.source_quote ?? raw.sourceQuote ?? null,
        reasoning: raw.reasoning ?? null,
      };
    } else {
      // Field missing from response — mark as missing
      normalized[fieldName] = {
        value: null,
        state: "missing",
        confidence: 0,
        sourceQuote: null,
        reasoning: null,
      };
    }
  }

  return { fields: normalized };
}

function validateState(state: unknown): "extracted" | "inferred" | "missing" {
  if (state === "extracted" || state === "inferred" || state === "missing") {
    return state;
  }
  return "missing";
}

function clampConfidence(conf: unknown): number {
  if (typeof conf !== "number") return 0;
  return Math.max(0, Math.min(100, Math.round(conf)));
}

// ─── Route Handler ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests/minute
  const blocked = await rateGuard(request, 10);
  if (blocked) return blocked;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const meta = user?.publicMetadata as
      | { role?: string; contributor?: boolean }
      | undefined;
    if (meta?.role !== "admin" && meta?.contributor !== true) {
      return NextResponse.json(
        { error: "Admin or contributor access required" },
        { status: 403 }
      );
    }

    // Validate content type
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

    const body = await request.json();
    const { sourceText } = body as { sourceText?: string; existingData?: Record<string, unknown> };

    // Validate sourceText
    if (!sourceText || typeof sourceText !== "string") {
      return NextResponse.json(
        { error: "sourceText is required and must be a string" },
        { status: 400 }
      );
    }

    if (sourceText.trim().length < 50) {
      return NextResponse.json(
        { error: "sourceText must be at least 50 characters. Provide a meaningful job description." },
        { status: 400 }
      );
    }

    if (sourceText.length > 50000) {
      return NextResponse.json(
        { error: "sourceText exceeds maximum length of 50,000 characters" },
        { status: 400 }
      );
    }

    // Truncate to a safe size for the prompt (keep first 15k chars to stay within token limits)
    const truncatedText = sourceText.slice(0, 15000);

    // Attempt extraction
    let result: ExtractionResponse;

    try {
      const prompt = buildExtractionPrompt(truncatedText);
      const rawResponse = await callGemini(prompt);
      result = parseExtractionJSON(rawResponse);
    } catch (firstError) {
      console.warn("[blueprint/extract] First attempt failed, retrying with simple prompt:", firstError);

      // Retry with simplified prompt
      try {
        const simplePrompt = buildSimplePrompt(truncatedText);
        const rawResponse = await callGemini(simplePrompt);
        result = parseExtractionJSON(rawResponse);
      } catch (retryError) {
        console.error("[blueprint/extract] Retry also failed:", retryError);
        return NextResponse.json(
          { error: "AI extraction failed after retry. Please try again or fill in fields manually." },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[blueprint/extract] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to extract blueprint data" },
      { status: 500 }
    );
  }
}
