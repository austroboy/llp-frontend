/**
 * CV Parser for headhunting screening.
 * Uses Gemini multimodal to extract structured candidate data from CVs.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export interface ParsedCV {
  name: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  yearsExperience: number | null;
  skills: string[];
  education: Array<{
    degree?: string;
    institution?: string;
    year?: string;
  }>;
  experience: Array<{
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;
  salary: string | null;
  location: string | null;
  noticePeriod: string | null;
  summary: string;
}

const CV_PARSE_PROMPT = `You are an expert CV/resume parser for a headhunting firm. Extract structured candidate data from this CV.

Return a JSON object:

{
  "name": "Full name",
  "currentTitle": "Most recent job title",
  "currentCompany": "Most recent employer",
  "yearsExperience": 8,
  "skills": ["Skill 1", "Skill 2", ...],
  "education": [
    {"degree": "MBA", "institution": "University", "year": "2020"}
  ],
  "experience": [
    {"title": "Director HR", "company": "Acme Corp", "duration": "2020-Present", "description": "Led team of 15..."}
  ],
  "salary": "Expected or current salary if mentioned",
  "location": "Current city/country",
  "noticePeriod": "Notice period if mentioned",
  "summary": "2-3 sentence executive summary highlighting key qualifications and career trajectory"
}

IMPORTANT:
- Extract ALL work experience entries, not just the most recent
- Skills should be specific and actionable (not generic like "leadership")
- If something isn't in the CV, use null
- Return ONLY valid JSON`;

/**
 * Parse a CV file (PDF, DOCX as text, or image) and extract structured data.
 */
export async function parseCVFromBase64(
  base64Data: string,
  mimeType: string
): Promise<ParsedCV> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [
    { inline_data: { mime_type: mimeType, data: base64Data } },
    { text: CV_PARSE_PROMPT },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini CV parse error: ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let jsonStr = text;
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(jsonStr);
}

/**
 * Parse a CV from plain text (for DOCX pre-extracted text).
 */
export async function parseCVFromText(text: string): Promise<ParsedCV> {
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
              { text: `--- CV CONTENT ---\n${text.slice(0, 15000)}\n--- END ---\n\n${CV_PARSE_PROMPT}` },
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
    throw new Error(`Gemini CV parse error: ${res.status}`);
  }

  const data = await res.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let jsonStr = responseText;
  const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(jsonStr);
}
