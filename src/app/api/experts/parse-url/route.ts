import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateGuard } from "@/lib/rate-limit";

export const maxDuration = 120;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const ALLOWED_PORTS = new Set(["", "80", "443"]);

const EXTRACTION_PROMPT = `You are an expert profile analyzer. Analyze this professional's online profile and extract structured information for an expert profile application.

Return a JSON object with these fields (use null for any field you cannot determine):

{
  "name": "Full name",
  "designation": "Current job title / designation",
  "organization": "Current company/organization",
  "city": "City, Country",
  "linkedin": "LinkedIn URL if found or if this is a LinkedIn page",
  "portfolio": "Portfolio or personal website URL if found (not LinkedIn)",
  "profilePhotoUrl": "Profile photo URL if available",
  "bio": "A 2-3 sentence professional summary based on their background",
  "sectors": ["Array of industry sectors they work in - pick from: RMG / Apparel, Pharmaceuticals, Manufacturing (non-RMG), Telecom / Technology, FMCG / Consumer Goods, Banking / Financial Services, Construction / Real Estate, Education / Training, Healthcare / Hospitals, Logistics / Transportation, Retail / E-commerce, Agriculture / Agro-processing, Energy / Utilities, Hospitality / Tourism, Other"],
  "skills": [
    {
      "name": "Skill name - use predefined if matching: PF Fund Setup, GF Compliance, WPPF Administration, Audit Preparation, Termination Handling, Work Permits, Policy Drafting. Otherwise use a descriptive custom name (e.g. 'Web Development', 'Marketing Strategy', 'Graphic Design') — NEVER use 'Other' as the name",
      "level": 1-4 (1=Awareness, 2=Working, 3=Practitioner, 4=Expert - estimate from their experience),
      "evidence": "Brief evidence of this skill from their profile"
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
    "ctcRange": null,
    "preferredLocations": ["Locations if mentioned"],
    "noticePeriod": null
  }
}

IMPORTANT:
- For skills: use predefined names when they match, otherwise use a clear descriptive name (e.g. "Web Development", "Supply Chain Management"). NEVER use "Other" as the skill name.
- For sectors, only use the predefined options listed above
- Estimate skill levels conservatively based on years of experience and evidence
- Keep the bio concise and professional
- If content is in Bangla, still extract in English
- Return ONLY valid JSON, no markdown or explanation`;

/* ------------------------------------------------------------------ */
/*  LinkedIn via RapidAPI (Fresh LinkedIn Profile Data)               */
/* ------------------------------------------------------------------ */

function extractLinkedInUsername(url: string): string | null {
  // Handle: linkedin.com/in/username, linkedin.com/in/username/, etc.
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/);
  return match ? match[1] : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface LinkedInProfile { [key: string]: any }

async function fetchLinkedInViaRapidAPI(
  linkedinUrl: string
): Promise<LinkedInProfile | null> {
  if (!RAPIDAPI_KEY) return null;

  try {
    const params = new URLSearchParams({
      linkedin_url: linkedinUrl,
      include_skills: "true",
      include_certifications: "true",
      include_publications: "false",
      include_honors: "true",
      include_volunteers: "true",
      include_projects: "true",
      include_patents: "false",
      include_courses: "true",
      include_organizations: "true",
      include_profile_status: "false",
      include_company_public_url: "false",
    });

    const res = await fetch(
      `https://fresh-linkedin-profile-data.p.rapidapi.com/enrich-lead?${params}`,
      {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": "fresh-linkedin-profile-data.p.rapidapi.com",
        },
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!res.ok) {
      console.error("RapidAPI LinkedIn error:", res.status, await res.text());
      return null;
    }

    const json = await res.json();
    console.log("RapidAPI LinkedIn response keys:", Object.keys(json?.data ?? json));
    return json?.data ?? json;
  } catch (err) {
    console.error("RapidAPI LinkedIn fetch error:", err);
    return null;
  }
}

/**
 * Convert raw RapidAPI LinkedIn profile to a text summary
 * that Gemini can analyze for structured extraction.
 */
function linkedInProfileToText(profile: LinkedInProfile, url: string): string {
  const lines: string[] = [];

  lines.push(`LinkedIn Profile URL: ${url}`);
  if (profile.profile_image_url) lines.push(`Profile Photo URL: ${profile.profile_image_url}`);
  if (profile.full_name) lines.push(`Name: ${profile.full_name}`);
  if (profile.headline) lines.push(`Headline: ${profile.headline}`);
  if (profile.job_title) lines.push(`Current Title: ${profile.job_title}`);
  if (profile.company) lines.push(`Current Company: ${profile.company}`);
  if (profile.about) lines.push(`About: ${profile.about}`);
  if (profile.location) lines.push(`Location: ${profile.location}`);
  if (profile.city) lines.push(`City: ${profile.city}`);
  if (profile.state) lines.push(`State: ${profile.state}`);
  if (profile.country) lines.push(`Country: ${profile.country}`);

  if (profile.experiences?.length) {
    lines.push("\n--- WORK EXPERIENCE ---");
    for (const exp of profile.experiences) {
      const header = [exp.title, exp.company, exp.date_range || exp.duration, exp.location].filter(Boolean).join(" | ");
      lines.push(`• ${header}`);
      if (exp.description) lines.push(`  ${exp.description}`);
    }
  }

  if (profile.educations?.length) {
    lines.push("\n--- EDUCATION ---");
    for (const edu of profile.educations) {
      const parts = [edu.school, edu.degree, edu.field_of_study, edu.date_range].filter(Boolean);
      lines.push(`• ${parts.join(" | ")}`);
    }
  }

  if (profile.skills) {
    lines.push("\n--- SKILLS ---");
    const skillStr = typeof profile.skills === "string"
      ? profile.skills
      : Array.isArray(profile.skills)
        ? profile.skills.map((s: string | { name: string }) => typeof s === "string" ? s : s.name).join(", ")
        : "";
    if (skillStr) lines.push(skillStr);
  }

  if (profile.certifications?.length) {
    lines.push("\n--- CERTIFICATIONS ---");
    for (const cert of profile.certifications) {
      const parts = [cert.name, cert.authority, cert.display_source].filter(Boolean);
      lines.push(`• ${parts.join(" | ")}`);
    }
  }

  if (profile.languages?.length) {
    lines.push("\n--- LANGUAGES ---");
    for (const lang of profile.languages) {
      if (typeof lang === "string") {
        lines.push(`• ${lang}`);
      } else {
        const parts = [lang.name, lang.proficiency].filter(Boolean);
        lines.push(`• ${parts.join(" — ")}`);
      }
    }
  }

  if (profile.projects?.length) {
    lines.push("\n--- PROJECTS ---");
    for (const proj of profile.projects) {
      const parts = [proj.title, proj.description, proj.date_range].filter(Boolean);
      lines.push(`• ${parts.join(" | ")}`);
    }
  }

  if (profile.honors?.length) {
    lines.push("\n--- HONORS & AWARDS ---");
    for (const honor of profile.honors) {
      const parts = [honor.title, honor.issuer, honor.issued_on].filter(Boolean);
      lines.push(`• ${parts.join(" | ")}`);
    }
  }

  if (profile.volunteers?.length) {
    lines.push("\n--- VOLUNTEER EXPERIENCE ---");
    for (const vol of profile.volunteers) {
      const parts = [vol.title, vol.company, vol.date_range].filter(Boolean);
      lines.push(`• ${parts.join(" | ")}`);
      if (vol.description) lines.push(`  ${vol.description}`);
    }
  }

  if (profile.courses?.length) {
    lines.push("\n--- COURSES ---");
    for (const course of profile.courses) {
      const parts = [course.name, course.number].filter(Boolean);
      lines.push(`• ${parts.join(" | ")}`);
    }
  }

  if (profile.organizations?.length) {
    lines.push("\n--- ORGANIZATIONS ---");
    for (const org of profile.organizations) {
      const parts = [org.name, org.title, org.date_range].filter(Boolean);
      lines.push(`• ${parts.join(" | ")}`);
    }
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Generic page scraping                                             */
/* ------------------------------------------------------------------ */

/**
 * Extract og:image, twitter:image, or favicon from raw HTML.
 */
function extractSiteImage(html: string, baseUrl: string): string | null {
  // Try og:image first
  const ogMatch = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  ) ?? html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
  );
  if (ogMatch?.[1]) return resolveUrl(ogMatch[1], baseUrl);

  // Try twitter:image
  const twMatch = html.match(
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
  ) ?? html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
  );
  if (twMatch?.[1]) return resolveUrl(twMatch[1], baseUrl);

  // Try apple-touch-icon (high-res favicon)
  const appleIcon = html.match(
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i
  );
  if (appleIcon?.[1]) return resolveUrl(appleIcon[1], baseUrl);

  // Try favicon
  const favicon = html.match(
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i
  );
  if (favicon?.[1]) return resolveUrl(favicon[1], baseUrl);

  return null;
}

function resolveUrl(url: string, base: string): string {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  const ipv4Match = normalized.match(/^(\d{1,3})(?:\.(\d{1,3})){3}$/);
  if (!ipv4Match) return false;

  const octets = normalized.split(".").map((part) => Number(part));
  if (octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function isSafeRemoteUrl(url: URL): boolean {
  if (!["http:", "https:"].includes(url.protocol)) return false;
  if (!ALLOWED_PORTS.has(url.port)) return false;
  if (isPrivateHostname(url.hostname)) return false;
  return true;
}

async function scrapePageText(url: string): Promise<{ text: string | null; siteImage: string | null }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { text: null, siteImage: null };

    const html = await res.text();

    // Extract site image before stripping HTML
    const siteImage = extractSiteImage(html, url);

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      text: text.length >= 50 ? text.slice(0, 15000) : null,
      siteImage,
    };
  } catch {
    return { text: null, siteImage: null };
  }
}

/* ------------------------------------------------------------------ */
/*  Gemini helpers                                                    */
/* ------------------------------------------------------------------ */

async function callGeminiWithText(
  prompt: string,
  url: string,
  pageText: string
) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Profile URL: ${url}\n\n--- PAGE CONTENT ---\n${pageText}\n--- END ---\n\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );
}

async function callGeminiWithUrlContext(prompt: string, url: string) {
  const searchPrompt = `Use Google Search to find information about the professional whose profile is at: ${url}

Search for this person's name, job title, company, skills, experience, and any other professional details available online.

Once you have gathered information about this person from search results, ${prompt}`;

  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: searchPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
        },
        tools: [{ googleSearch: {} }, { urlContext: {} }],
      }),
    }
  );
}

function extractJson(text: string) {
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
  jsonStr = jsonStr.replace(/:\s*,/g, ": null,");
  jsonStr = jsonStr.replace(/:\s*}/g, ": null}");

  return JSON.parse(jsonStr);
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                      */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const blocked = await rateGuard(request, 5);
    if (blocked) return blocked;

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Invalid URL protocol" },
        { status: 400 }
      );
    }
    if (!isSafeRemoteUrl(parsedUrl)) {
      return NextResponse.json(
        { error: "URL is not allowed" },
        { status: 400 }
      );
    }

    const isLinkedIn = parsedUrl.hostname.includes("linkedin.com");
    let geminiRes: Response;
    let linkedInPhotoUrl: string | null = null;
    let scrapedSiteImage: string | null = null;

    if (isLinkedIn) {
      // --- LinkedIn strategy ---
      const username = extractLinkedInUsername(url);

      if (!username) {
        return NextResponse.json(
          { error: "Could not extract LinkedIn username from URL." },
          { status: 400 }
        );
      }

      // Strategy 1: RapidAPI LinkedIn scraper (best for LinkedIn)
      const linkedInData = await fetchLinkedInViaRapidAPI(url);
      if (linkedInData?.profile_image_url) {
        linkedInPhotoUrl = linkedInData.profile_image_url;
      }

      if (linkedInData) {
        const profileText = linkedInProfileToText(linkedInData, url);
        console.log(
          `LinkedIn: got RapidAPI data (${profileText.length} chars)`
        );
        geminiRes = await callGeminiWithText(EXTRACTION_PROMPT, url, profileText);
      } else {
        // Strategy 2: Gemini with Google Search + URL Context grounding
        console.log(
          RAPIDAPI_KEY
            ? "LinkedIn: RapidAPI failed, falling back to Gemini grounding"
            : "LinkedIn: no RAPIDAPI_KEY, using Gemini grounding"
        );
        geminiRes = await callGeminiWithUrlContext(EXTRACTION_PROMPT, url);
      }
    } else {
      // --- Non-LinkedIn strategy ---
      const { text: pageText, siteImage } = await scrapePageText(url);

      if (pageText) {
        console.log(
          `URL parse: using direct scraping (${pageText.length} chars)`
        );
        geminiRes = await callGeminiWithText(EXTRACTION_PROMPT, url, pageText);
      } else {
        console.log("URL parse: scraping failed, using Gemini grounding");
        geminiRes = await callGeminiWithUrlContext(EXTRACTION_PROMPT, url);
      }

      // Use site og:image / favicon as profile photo fallback for portfolio sites
      if (siteImage) {
        scrapedSiteImage = siteImage;
      }
    }

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errBody);
      return NextResponse.json(
        { error: "AI analysis failed. Please try again." },
        { status: 502 }
      );
    }

    const geminiResponse = await geminiRes.json();
    const text =
      geminiResponse.candidates?.[0]?.content?.parts
        ?.filter((p: { text?: string }) => p.text)
        .map((p: { text: string }) => p.text)
        .join("") ?? "";

    if (!text) {
      const msg = isLinkedIn
        ? "LinkedIn blocks automated profile access. Please export your LinkedIn profile as PDF (Profile → More → Save to PDF) and use the CV uploader instead."
        : "Could not extract profile information. Try uploading your CV instead.";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    const parsed = extractJson(text);

    // Ensure LinkedIn URL is set if this is a LinkedIn page
    if (isLinkedIn && !parsed.linkedin) {
      parsed.linkedin = url;
    }

    // Set portfolio URL if this is a non-LinkedIn page
    if (!isLinkedIn && !parsed.portfolio) {
      parsed.portfolio = url;
    }

    // Download LinkedIn photo server-side and return as base64 data URL
    // (LinkedIn CDN blocks client-side hotlinking / CORS)
    const photoUrl = linkedInPhotoUrl || parsed.profilePhotoUrl || scrapedSiteImage;
    if (photoUrl && !parsed.embeddedPhoto) {
      try {
        const parsedPhotoUrl = new URL(photoUrl);
        if (!isSafeRemoteUrl(parsedPhotoUrl)) {
          throw new Error("unsafe_photo_url");
        }
        const photoRes = await fetch(parsedPhotoUrl, {
          signal: AbortSignal.timeout(10000),
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (photoRes.ok) {
          const contentType = photoRes.headers.get("content-type") || "image/jpeg";
          if (contentType.startsWith("image/")) {
            const buf = Buffer.from(await photoRes.arrayBuffer());
            parsed.embeddedPhoto = `data:${contentType};base64,${buf.toString("base64")}`;
          }
        }
      } catch {
        // Fallback: keep raw URL (may work for non-LinkedIn sites)
        if (photoUrl && !parsed.profilePhotoUrl) {
          parsed.profilePhotoUrl = photoUrl;
        }
      }
    }
    // Still set profilePhotoUrl as metadata (client will replace with Convex URL after upload)
    if (linkedInPhotoUrl && !parsed.profilePhotoUrl) {
      parsed.profilePhotoUrl = linkedInPhotoUrl;
    }
    if (scrapedSiteImage && !parsed.profilePhotoUrl) {
      parsed.profilePhotoUrl = scrapedSiteImage;
    }

    console.log("Parsed URL data:", JSON.stringify(parsed, null, 2));

    // Check if we got any meaningful data
    const hasData =
      parsed.name ||
      parsed.designation ||
      parsed.organization ||
      parsed.bio ||
      (parsed.skills?.length && parsed.skills.length > 0) ||
      (parsed.experiences?.length && parsed.experiences.length > 0) ||
      (parsed.education?.length && parsed.education.length > 0) ||
      (parsed.projects?.length && parsed.projects.length > 0);

    if (!hasData) {
      const msg = isLinkedIn
        ? "LinkedIn blocks automated profile access. Please export your LinkedIn profile as PDF (Profile → More → Save to PDF) and use the CV uploader instead."
        : "Could not extract meaningful profile data. The site may block automated access. Try uploading a CV/resume instead.";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    return NextResponse.json({ data: parsed });
  } catch (error) {
    console.error("URL parse error:", error);
    return NextResponse.json(
      { error: "Failed to analyze the profile. Please try again." },
      { status: 500 }
    );
  }
}
