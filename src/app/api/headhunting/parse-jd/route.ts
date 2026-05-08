import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateGuard } from "@/lib/rate-limit";

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const EXTRACTION_PROMPT = `You are an expert headhunting consultant. Analyze this job description / mandate brief and extract structured role requirements.

Return a JSON object with these fields (use empty string or empty array for fields you cannot determine):

{
  "title": "Role title",
  "function": "Department/function (e.g. Human Resources, Finance, Engineering)",
  "seniority": "Level (e.g. Director, VP, Manager, Senior, Mid-level)",
  "department": "Specific department if mentioned",
  "reportingLine": "Who this role reports to (e.g. Reports to CEO)",
  "location": "City/Country or Remote",
  "businessStage": "Company stage if mentioned (e.g. Growth, Startup, Turnaround, Mature)",
  "mustHaves": ["Array of absolute requirements — one per item"],
  "dealBreakers": ["Array of instant disqualifiers — one per item"],
  "criticalMatchPoints": ["Key criteria that strongly indicate fit — one per item"],
  "generalMatchPoints": ["Nice-to-have criteria — one per item"],
  "targetSectors": ["Industry sectors relevant to this role"],
  "compensationRange": "Salary/compensation range if mentioned",
  "environmentDescription": "Brief description of work environment, culture, or team dynamics"
}

IMPORTANT:
- Separate must-haves (non-negotiable) from nice-to-haves clearly
- For deal-breakers, include only absolute disqualifiers (e.g. "No experience in regulated industries")
- Critical match points should be the top 5-7 differentiators
- Keep each item concise (one line)
- Return ONLY valid JSON, no markdown or explanation`;

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await rateGuard(request, 10);
  if (blocked) return blocked;

  try {
    const { text: rawText } = await request.json();

    if (!rawText || typeof rawText !== "string" || rawText.trim().length < 20) {
      return NextResponse.json(
        { error: "Please provide a job description with at least 20 characters." },
        { status: 400 }
      );
    }

    if (rawText.length > 50_000) {
      return NextResponse.json(
        { error: "Job description exceeds 50,000 characters." },
        { status: 400 }
      );
    }

    const text = rawText.trim();

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: `--- JOB DESCRIPTION ---\n${text.slice(0, 10000)}\n--- END ---\n\n${EXTRACTION_PROMPT}` },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Gemini API error:", res.status, errBody);
      return NextResponse.json(
        { error: "AI analysis failed. Please try again." },
        { status: 502 }
      );
    }

    const geminiResponse = await res.json();
    const responseText =
      geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!responseText) {
      return NextResponse.json(
        { error: "AI returned empty response. Try again." },
        { status: 422 }
      );
    }

    // Extract JSON from response
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Fix common LLM JSON issues
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

    const parsed = JSON.parse(jsonStr);
    return NextResponse.json({ data: parsed });
  } catch (error) {
    console.error("JD parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse job description." },
      { status: 500 }
    );
  }
}
