import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import {
  isSupportedLanguage,
  DEFAULT_CHAT_LANGUAGE,
} from "@/lib/languages";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("preferred_chat_language")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    preferred_chat_language:
      data?.preferred_chat_language ?? DEFAULT_CHAT_LANGUAGE,
  });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const lang = body?.preferred_chat_language;

  if (!isSupportedLanguage(lang)) {
    return NextResponse.json(
      { error: "Unsupported language code" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: userId, preferred_chat_language: lang },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferred_chat_language: lang });
}
