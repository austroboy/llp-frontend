import { NextRequest, NextResponse } from "next/server";
import { rateGuard } from "@/lib/rate-limit";
import { auth } from "@clerk/nextjs/server";
import mammoth from "mammoth";

export const maxDuration = 120;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
if (!MISTRAL_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn("[experts/parse-cv] MISTRAL_API_KEY not set; PDF photo extraction will fail.");
}

/**
 * Extract the first image from a PDF using Mistral OCR.
 */
async function extractPdfPhoto(base64Pdf: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: {
          type: "document_url",
          document_url: `data:application/pdf;base64,${base64Pdf}`,
        },
        include_image_base64: true,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    // Find the first image across all pages
    for (const page of data.pages || []) {
      for (const img of page.images || []) {
        if (img.image_base64) {
          // Mistral may return with or without data URL prefix
          if (img.image_base64.startsWith("data:")) {
            return img.image_base64;
          }
          const mime = img.id?.endsWith(".png") ? "image/png" : "image/jpeg";
          return `data:${mime};base64,${img.image_base64}`;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

const EXTRACTION_PROMPT = `You are an expert CV/resume parser. Analyze this document and extract structured information for a professional expert profile application.

Return a JSON object with these fields (use null for any field you cannot determine):

{
  "name": "Full name",
  "designation": "Current job title / designation",
  "organization": "Current company/organization",
  "city": "City, Country",
  "linkedin": "LinkedIn URL if found",
  "portfolio": "Portfolio or personal website URL if found (not LinkedIn)",
  "bio": "A 2-3 sentence professional summary based on their background",
  "sectors": ["Array of industry sectors they work in - pick from: RMG / Apparel, Pharmaceuticals, Manufacturing (non-RMG), Telecom / Technology, FMCG / Consumer Goods, Banking / Financial Services, Construction / Real Estate, Education / Training, Healthcare / Hospitals, Logistics / Transportation, Retail / E-commerce, Agriculture / Agro-processing, Energy / Utilities, Hospitality / Tourism, Other"],
  "skills": [
    {
      "name": "Skill name - use predefined if matching: PF Fund Setup, GF Compliance, WPPF Administration, Audit Preparation, Termination Handling, Work Permits, Policy Drafting. Otherwise use a descriptive custom name (e.g. 'Web Development', 'Marketing Strategy', 'Graphic Design') — NEVER use 'Other' as the name",
      "level": 1-4 (1=Awareness, 2=Working, 3=Practitioner, 4=Expert - estimate from their experience),
      "evidence": "Brief evidence of this skill from their CV"
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "org": "Issuing organization",
      "year": "Year obtained"
    }
  ],
  "experiences": [
    {
      "title": "Job title / project name",
      "company": "Company/organization name",
      "location": "City, Country if mentioned",
      "workMode": "on-site | remote | hybrid (if mentioned, otherwise omit)",
      "duration": "e.g., 2019-2023 or 3 years",
      "scope": "Brief description of what they did",
      "role": "Their role/responsibilities"
    }
  ],
  "education": [
    {
      "degree": "Degree name",
      "institution": "University/institution name",
      "fieldOfStudy": "Field of study if mentioned",
      "year": "Year of completion"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "client": "Client name if mentioned",
      "description": "Brief project description",
      "duration": "Duration or timeframe",
      "outcome": "Results or impact"
    }
  ],
  "languages": [
    {
      "name": "Language name",
      "proficiency": "native | fluent | advanced | intermediate | basic"
    }
  ],
  "affiliations": [
    {
      "name": "Organization/association name",
      "role": "Role or position if mentioned",
      "since": "Year joined if mentioned"
    }
  ],
  "sessionLengths": [30, 60, 90],
  "headhunting": {
    "ctcRange": "Salary range if mentioned",
    "preferredLocations": ["Locations if mentioned"],
    "noticePeriod": "Notice period if mentioned"
  }
}

IMPORTANT:
- For skills: use predefined names when they match, otherwise use a clear descriptive name (e.g. "Web Development", "Supply Chain Management"). NEVER use "Other" as the skill name.
- For sectors, only use the predefined options listed above
- Estimate skill levels conservatively based on years of experience and evidence
- Keep the bio concise and professional
- If the CV is in Bangla, still extract in English
- Return ONLY valid JSON, no markdown or explanation`;

export async function POST(request: NextRequest) {
  const blocked = await rateGuard(request, 5);
  if (blocked) return blocked;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, DOC, DOCX, JPG, or PNG." },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Max size is 10 MB." },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword" ||
      file.name.endsWith(".docx") ||
      file.name.endsWith(".doc");

    // Build Gemini request parts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];
    let docxPhotoBase64: string | null = null;
    let docxPhotoMime: string | null = null;
    let pdfPhotoPromise: Promise<string | null> | null = null;

    if (isDocx) {
      // Extract text from DOCX — Gemini can't parse DOCX binary
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      const text = result.value.trim();
      if (!text || text.length < 30) {
        return NextResponse.json(
          { error: "Could not extract text from document. Try PDF instead." },
          { status: 422 }
        );
      }

      // Extract first embedded image (likely profile photo)
      try {
        const htmlResult = await mammoth.convertToHtml(
          { buffer: Buffer.from(bytes) },
          {
            convertImage: mammoth.images.imgElement((image) => {
              return image.read("base64").then((imageBase64) => {
                if (!docxPhotoBase64 && image.contentType?.startsWith("image/")) {
                  docxPhotoBase64 = imageBase64;
                  docxPhotoMime = image.contentType;
                }
                return { src: "" };
              });
            }),
          }
        );
        // Trigger image extraction by accessing the result
        void htmlResult;
      } catch {
        // Image extraction is best-effort
      }

      // If we got an embedded image, send it alongside text to Gemini
      if (docxPhotoBase64 && docxPhotoMime) {
        parts.push({
          inline_data: {
            mime_type: docxPhotoMime,
            data: docxPhotoBase64,
          },
        });
        parts.push({ text: `The image above was embedded in the CV document.\n\n--- CV CONTENT ---\n${text}\n--- END ---\n\n${EXTRACTION_PROMPT}` });
      } else {
        parts.push({ text: `--- CV CONTENT ---\n${text}\n--- END ---\n\n${EXTRACTION_PROMPT}` });
      }
    } else {
      // PDF and images — send as inline binary
      const base64 = Buffer.from(bytes).toString("base64");
      parts.push({
        inline_data: {
          mime_type: file.type,
          data: base64,
        },
      });
      parts.push({ text: EXTRACTION_PROMPT });

      // For PDFs, extract photo via Mistral OCR in parallel with Gemini
      if (file.type === "application/pdf") {
        pdfPhotoPromise = extractPdfPhoto(base64);
      }
    }

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
    const text =
      geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "AI returned empty response. Try a different file." },
        { status: 422 }
      );
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Fix common LLM JSON issues
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
    jsonStr = jsonStr.replace(/:\s*,/g, ": null,");
    jsonStr = jsonStr.replace(/:\s*}/g, ": null}");

    const parsed = JSON.parse(jsonStr);

    // Include extracted photo as base64 data URL for client-side upload
    if (docxPhotoBase64 && docxPhotoMime && !parsed.profilePhotoUrl) {
      parsed.embeddedPhoto = `data:${docxPhotoMime};base64,${docxPhotoBase64}`;
    }

    // Wait for PDF photo extraction (ran in parallel with Gemini)
    if (pdfPhotoPromise && !parsed.embeddedPhoto && !parsed.profilePhotoUrl) {
      const pdfPhoto = await pdfPhotoPromise;
      if (pdfPhoto) {
        parsed.embeddedPhoto = pdfPhoto;
      }
    }

    return NextResponse.json({ data: parsed });
  } catch (error) {
    console.error("CV parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse CV. Please try again." },
      { status: 500 }
    );
  }
}
