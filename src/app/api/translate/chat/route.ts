import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

export const maxDuration = 30;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const SUPPORTED_LANGUAGES: Record<string, string> = {
  bn: "Bangla (বাংলা)",
  hi: "Hindi (हिन्दी)",
  zh: "Chinese (中文)",
  ko: "Korean (한국어)",
  ja: "Japanese (日本語)",
  ar: "Arabic (العربية)",
  ur: "Urdu (اردو)",
  ms: "Malay (Bahasa Melayu)",
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { message_id, text, language } = await req.json();
  if (!text || !language)
    return NextResponse.json(
      { error: "text and language required" },
      { status: 400 }
    );
  if (!SUPPORTED_LANGUAGES[language])
    return NextResponse.json(
      { error: "Unsupported language" },
      { status: 400 }
    );

  const supabase = createServerClient();

  // Check cache first
  if (message_id) {
    const { data: cached } = await supabase
      .from("message_translations")
      .select("translated_content")
      .eq("message_id", message_id)
      .eq("language", language)
      .limit(1);
    if (cached && cached.length > 0) {
      return NextResponse.json({
        translated: cached[0].translated_content,
        cached: true,
      });
    }
  }

  // Translate via Gemini 2.5 Flash
  try {
    const langName = SUPPORTED_LANGUAGES[language];
    const prompt = `Translate the following Bangladesh labour law response to ${langName}.
Preserve all section numbers (e.g., Section 26, ধারা ২৬) in both English and target language.
Preserve legal terms in English where no standard translation exists.
Preserve markdown formatting (bold, headers, lists, tables).
Do NOT add or remove any legal content — translate exactly.

Text to translate:
${text}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Translation service unavailable" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const translated =
      data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text ||
      "";
    if (!translated) {
      return NextResponse.json(
        { error: "Translation failed" },
        { status: 500 }
      );
    }

    // Cache the translation (fire-and-forget, ignore errors)
    if (message_id) {
      try {
        await supabase
          .from("message_translations")
          .upsert(
            {
              message_id,
              language,
              translated_content: translated,
            },
            { onConflict: "message_id,language" }
          );
      } catch {
        // Cache failure is non-critical — translation still returned
      }
    }

    return NextResponse.json({ translated, cached: false });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Translation failed" },
      { status: 500 }
    );
  }
}
