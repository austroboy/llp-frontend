import { NextRequest, NextResponse } from "next/server";
import { rateGuard } from "@/lib/rate-limit";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Walk TipTap JSON and collect all translatable text nodes with paths
function collectTexts(
  node: any,
  path: number[] = []
): { path: number[]; text: string }[] {
  const results: { path: number[]; text: string }[] = [];

  // Skip code blocks — don't translate code
  if (node.type === "codeBlock") return results;

  if (node.text && typeof node.text === "string") {
    results.push({ path: [...path], text: node.text });
  }
  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((child: any, i: number) => {
      results.push(...collectTexts(child, [...path, i]));
    });
  }
  return results;
}

// Set text at a given path in a deep-cloned TipTap JSON
function setTextAtPath(doc: any, path: number[], text: string) {
  let current = doc;
  for (const idx of path) {
    current = current.content[idx];
  }
  current.text = text;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function POST(req: NextRequest) {
  const blocked = await rateGuard(req, 10);
  if (blocked) return blocked;

  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Gemini API key not configured" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { title, excerpt, content } = body as {
    title?: string;
    excerpt?: string;
    content?: string; // TipTap JSON string
  };

  // Collect all texts to translate
  const parts: { key: string; text: string }[] = [];
  let contentTexts: { path: number[]; text: string }[] = [];

  if (title) parts.push({ key: "TITLE", text: title });
  if (excerpt) parts.push({ key: "EXCERPT", text: excerpt });

  if (content) {
    try {
      const doc = JSON.parse(content);
      contentTexts = collectTexts(doc);
      contentTexts.forEach((t, i) => {
        parts.push({ key: `CONTENT_${i}`, text: t.text });
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid content JSON" },
        { status: 400 }
      );
    }
  }

  if (parts.length === 0) {
    return NextResponse.json({ titleBn: "", excerptBn: "", contentBn: "" });
  }

  // Build numbered list for Gemini
  const numberedList = parts
    .map((p, i) => `[${i}] ${p.text}`)
    .join("\n");

  const prompt = `You are a professional English-to-Bangla translator specializing in Bangladesh labour law, HR, and business content.

Translate each numbered line below from English to Bangla. Preserve the true meaning, intent, and tone. Use natural Bangla that reads fluently — not word-by-word translation. Keep legal/technical terms accurate.

RULES:
- Output ONLY the translations, one per line, with the same [number] prefix
- Do NOT add explanations or notes
- Do NOT translate code, URLs, or proper nouns (company names, product names)
- Keep markdown-like formatting if present (bold markers, etc.)
- If a line is already in Bangla, keep it as-is

INPUT:
${numberedList}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini API error:", err);
      return NextResponse.json(
        { error: "Translation API failed" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const responseText =
      data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text ??
      "";

    // Parse numbered responses
    const translations = new Map<number, string>();
    const lines = responseText.split("\n");
    for (const line of lines) {
      const match = line.match(/^\[(\d+)\]\s*(.+)/);
      if (match) {
        translations.set(parseInt(match[1]), match[2].trim());
      }
    }

    // Build results
    let titleBn = "";
    let excerptBn = "";
    let contentBn = "";

    let idx = 0;
    if (title) {
      titleBn = translations.get(idx) ?? title;
      idx++;
    }
    if (excerpt) {
      excerptBn = translations.get(idx) ?? excerpt;
      idx++;
    }

    if (content && contentTexts.length > 0) {
      const doc = deepClone(JSON.parse(content));
      for (let i = 0; i < contentTexts.length; i++) {
        const translated = translations.get(idx + i);
        if (translated) {
          setTextAtPath(doc, contentTexts[i].path, translated);
        }
      }
      contentBn = JSON.stringify(doc);
    }

    return NextResponse.json({ titleBn, excerptBn, contentBn });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
