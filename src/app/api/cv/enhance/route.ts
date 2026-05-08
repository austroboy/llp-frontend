import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { rateGuard } from "@/lib/rate-limit";

export const maxDuration = 120;

interface ProfilePayload {
  fullName: string;
  email: string;
  phone?: string;
  headline: string;
  bio?: string;
  city: string;
  country?: string;
  linkedin?: string;
  portfolio?: string;
  experiences: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent: boolean;
    description?: string;
  }>;
  skills: Array<{ name: string; yearsOfExperience?: number }>;
  education: Array<{
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    year?: string;
  }>;
  certifications: Array<{ name: string; org?: string; year?: string }>;
  languages?: Array<{ name: string; proficiency?: string }>;
}

interface RequestBody {
  profile: ProfilePayload;
  template: string;
  language: string;
}

function buildPrompt(profile: ProfilePayload, template: string, language: string): string {
  return `You are a professional CV/resume writer. Enhance the following profile data to create a polished, professional CV.

PROFILE DATA:
Name: ${profile.fullName}
Headline: ${profile.headline}
Bio: ${profile.bio || "Not provided"}
Location: ${[profile.city, profile.country].filter(Boolean).join(", ")}

EXPERIENCES:
${profile.experiences.map((e) => `- ${e.title} at ${e.company}${e.location ? ` (${e.location})` : ""}: ${e.description || "No description"}`).join("\n")}

SKILLS:
${profile.skills.map((s) => `- ${s.name}${s.yearsOfExperience ? ` (${s.yearsOfExperience} years)` : ""}`).join("\n")}

EDUCATION:
${profile.education.map((e) => `- ${e.degree} from ${e.institution}${e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ""}${e.year ? ` (${e.year})` : ""}`).join("\n")}

CERTIFICATIONS:
${profile.certifications.map((c) => `- ${c.name}${c.org ? ` by ${c.org}` : ""}${c.year ? ` (${c.year})` : ""}`).join("\n") || "None"}

LANGUAGES:
${profile.languages?.map((l) => `- ${l.name}${l.proficiency ? ` (${l.proficiency})` : ""}`).join("\n") || "Not specified"}

Template style: ${template}
Language: ${language}

INSTRUCTIONS:
1. Write a compelling professional summary (2-3 sentences)
2. Enhance each experience description to be achievement-oriented with action verbs. Keep them concise (2-3 bullet points worth of text per role).
3. Organize and prioritize skills
4. Keep all factual information (dates, company names, degrees) exactly as provided - only enhance descriptions

Respond with ONLY a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "summary": "Enhanced professional summary",
  "enhancedBio": "Enhanced bio text",
  "enhancedExperiences": [
    {
      "title": "exact title from input",
      "company": "exact company from input",
      "location": "exact location if provided",
      "startDate": "exact date if provided",
      "endDate": "exact date if provided",
      "isCurrent": true/false,
      "description": "Enhanced achievement-oriented description"
    }
  ],
  "enhancedSkills": [
    {
      "name": "skill name",
      "yearsOfExperience": number_or_null
    }
  ]
}`;
}

async function streamFromGemini(
  body: RequestBody,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    controller.enqueue(
      encoder.encode(
        JSON.stringify({ type: "error", message: "AI service unavailable" }) + "\n"
      )
    );
    return;
  }

  controller.enqueue(
    encoder.encode(
      JSON.stringify({ type: "progress", message: "Enhancing your profile with AI..." }) + "\n"
    )
  );

  const prompt = buildPrompt(body.profile, body.template, body.language);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                summary: { type: "STRING" },
                enhancedBio: { type: "STRING" },
                enhancedExperiences: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      title: { type: "STRING" },
                      company: { type: "STRING" },
                      location: { type: "STRING" },
                      startDate: { type: "STRING" },
                      endDate: { type: "STRING" },
                      isCurrent: { type: "BOOLEAN" },
                      description: { type: "STRING" },
                    },
                    required: ["title", "company", "isCurrent", "description"],
                  },
                },
                enhancedSkills: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      name: { type: "STRING" },
                      yearsOfExperience: { type: "NUMBER" },
                    },
                    required: ["name"],
                  },
                },
              },
              required: ["summary", "enhancedBio", "enhancedExperiences", "enhancedSkills"],
            },
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error: ${res.status} — ${errText.slice(0, 200)}`);
    }

    controller.enqueue(
      encoder.encode(
        JSON.stringify({ type: "progress", message: "Processing AI response..." }) + "\n"
      )
    );

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // responseSchema guarantees clean JSON, but add fallback extraction
    let enhanced;
    try {
      enhanced = JSON.parse(text);
    } catch {
      // Fallback: extract outermost { ... }
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        enhanced = JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    controller.enqueue(
      encoder.encode(
        JSON.stringify({ type: "result", data: enhanced }) + "\n"
      )
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Enhancement failed";
    controller.enqueue(
      encoder.encode(JSON.stringify({ type: "error", message }) + "\n")
    );
  }
}

export async function POST(request: NextRequest) {
  const blocked = await rateGuard(request, 5); // 5 RPM — expensive AI call
  if (blocked) return blocked;

  const user = await currentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.profile || !body.template) {
    return new Response(
      JSON.stringify({ error: "profile and template are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamFromGemini(body, controller, encoder);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Enhancement failed";
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "error", message }) + "\n")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
