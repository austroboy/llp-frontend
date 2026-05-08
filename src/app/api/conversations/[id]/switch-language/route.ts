import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { translateChunk } from "@/lib/ai/translate-stream";
import { isSupportedLanguage } from "@/lib/languages";
import {
  type Tier,
  type ClerkTierMetadata,
  resolveTier,
  CTA_MESSAGES,
} from "@/lib/ai/framework-types";
import { checkDailyRequestLimitAsync } from "@/lib/ai/tier-middleware";

export const maxDuration = 120;
export const runtime = "nodejs";

interface ClarifyOption {
  title: string;
  role: string;
  blurb: string;
  scenario_query: string;
}

interface MessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  content_en: string | null;
  language: string | null;
  citations: unknown;
  followups: unknown;
  clarify_options: ClarifyOption[] | null;
  clarify_reason: string | null;
  clarify_options_en: ClarifyOption[] | null;
  clarify_reason_en: string | null;
  created_at: string;
}

/**
 * Mid-session language switch.
 *
 * Costs 1 chat usage tick (tracked in Convex `tokenUsage`).
 *
 * Steps:
 *   1. Auth + ownership check.
 *   2. Validate target language.
 *   3. Check daily quota — reject 429 if exhausted.
 *   4. Fetch every assistant message in this conversation. For each that
 *      lacks `content_en` (because it was originally generated in English),
 *      treat `content` as the English source. Translate the source to the
 *      target language and update the row.
 *   4b. Retranslate clarify cards (title/blurb/scenario_query + reason)
 *      from `clarify_options_en` pivot, falling back to `clarify_options`
 *      for legacy rows. `role` stays English.
 *   5. Update `conversations.language`.
 *   6. Track usage (1 request, billed against assistant message volume so
 *      the cost scales roughly with thread length).
 *   7. Return the refreshed message list.
 *
 * Failures: if a single message translation fails, that message stays in
 * its prior language (logged but not fatal). The endpoint reports back the
 * full list as it stands.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const targetLang = body?.language;

  if (!isSupportedLanguage(targetLang)) {
    return NextResponse.json(
      { error: "Unsupported language" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // 1. Verify conversation ownership
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select("id, user_id, language")
    .eq("id", id)
    .single();

  if (convErr || !conv || conv.user_id !== userId) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // No-op if already on target language — return current messages.
  if (conv.language === targetLang) {
    const { data: messagesNoop } = await supabase
      .from("messages")
      .select("id, role, content, content_en, language, citations, followups, clarify_options, clarify_reason, clarify_options_en, clarify_reason_en, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    return NextResponse.json({
      conversation: { id: conv.id, language: targetLang },
      messages: messagesNoop ?? [],
    });
  }

  // 2. Resolve tier + quota
  let tier: Tier = "free_subscribed";
  try {
    const user = await currentUser();
    const metadata = user?.publicMetadata as ClerkTierMetadata | undefined;
    if (metadata?.tier) tier = resolveTier(metadata);
  } catch { /* default tier */ }

  let dailyUsage = { requestCount: 0 };
  try {
    const { ConvexHttpClient } = await import("convex/browser");
    const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const { api: convexApi } = await import("../../../../../../convex/_generated/api");
    const usage = await convexClient.query(convexApi.tokenUsage.getToday, { userId });
    if (usage) dailyUsage = { requestCount: usage.requestCount };
  } catch { /* assume zero — fail-open on Convex glitches */ }

  const limitCheck = await checkDailyRequestLimitAsync(tier, dailyUsage.requestCount);
  if (!limitCheck.allowed) {
    const ctaMsg = tier !== "max" ? CTA_MESSAGES[tier as Exclude<Tier, "max">] : null;
    return NextResponse.json(
      {
        error: "quota_exceeded",
        message: `Daily limit reached (${limitCheck.limit}). Switching languages costs 1 chat usage.`,
        cta: ctaMsg?.text,
      },
      { status: 429 },
    );
  }

  // 3. Fetch all messages
  const { data: messages, error: msgErr } = await supabase
    .from("messages")
    .select("id, role, content, content_en, language, citations, followups, clarify_options, clarify_reason, clarify_options_en, clarify_reason_en, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (msgErr || !messages) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  const typed = messages as MessageRow[];

  // 4. Retranslate assistant messages from English source-of-truth.
  //    User messages stay as-is — they're the user's original input.
  let translatedCount = 0;
  let totalEnglishChars = 0;

  for (const m of typed) {
    if (m.role !== "assistant") continue;
    // English source: content_en if present (was previously translated), else
    // content (was previously English).
    const englishSource = m.content_en ?? m.content;
    if (!englishSource) continue;
    totalEnglishChars += englishSource.length;

    if (targetLang === "en") {
      // Switching to English — restore from content_en if it exists.
      if (m.content_en && m.content !== m.content_en) {
        await supabase
          .from("messages")
          .update({ content: m.content_en, content_en: null, language: "en" })
          .eq("id", m.id);
        m.content = m.content_en;
        m.content_en = null;
        m.language = "en";
        translatedCount++;
      } else if (!m.language || m.language !== "en") {
        await supabase.from("messages").update({ language: "en" }).eq("id", m.id);
        m.language = "en";
      }
      continue;
    }

    // Cache check first. Discard rows that lost their paragraph structure
    // (pre-fix translations where Gemini collapsed `\n\n` into spaces — the
    // markdown parser then renders them as a wall of text with raw `**`
    // markers leaking through).
    const { data: cached } = await supabase
      .from("message_translations")
      .select("translated_content")
      .eq("message_id", m.id)
      .eq("language", targetLang)
      .maybeSingle();

    const sourceHasParagraphs = /\n\s*\n/.test(englishSource);
    const cachedIsFlattened =
      !!cached?.translated_content &&
      sourceHasParagraphs &&
      !/\n\s*\n/.test(cached.translated_content);

    let translated: string;
    if (cached?.translated_content && !cachedIsFlattened) {
      translated = cached.translated_content;
    } else {
      try {
        translated = await translateChunk(englishSource, { language: targetLang });
      } catch (err) {
        console.warn(
          `[switch-language] message ${m.id} translation failed:`,
          err instanceof Error ? err.message : err,
        );
        continue;
      }
      // Warm cache
      try {
        await supabase
          .from("message_translations")
          .upsert(
            {
              message_id: m.id,
              language: targetLang,
              translated_content: translated,
            },
            { onConflict: "message_id,language" },
          );
      } catch { /* non-fatal */ }
    }

    await supabase
      .from("messages")
      .update({
        content: translated,
        content_en: englishSource,
        language: targetLang,
      })
      .eq("id", m.id);

    m.content = translated;
    m.content_en = englishSource;
    m.language = targetLang;
    translatedCount++;
  }

  // 4b. Retranslate clarify cards (title / blurb / scenario_query + reason).
  //     Uses `clarify_options_en` as the English pivot when present; falls
  //     back to `clarify_options` for legacy rows written before that
  //     column existed. `role` stays English by design (mirrors the chat
  //     emit path — UseCaseCards prints it uppercased as a tag).
  for (const m of typed) {
    if (m.role !== "assistant") continue;
    const hasCards = Array.isArray(m.clarify_options) && m.clarify_options.length > 0;
    if (!hasCards) continue;

    const englishOptions = (m.clarify_options_en && m.clarify_options_en.length > 0
      ? m.clarify_options_en
      : m.clarify_options) as ClarifyOption[];
    const englishReason = m.clarify_reason_en ?? m.clarify_reason ?? "";

    if (targetLang === "en") {
      // Restore English source if one is preserved; else current clarify_options
      // is already whatever source we have. Null out _en mirrors.
      await supabase
        .from("messages")
        .update({
          clarify_options: englishOptions,
          clarify_reason: englishReason || null,
          clarify_options_en: null,
          clarify_reason_en: null,
        })
        .eq("id", m.id);
      m.clarify_options = englishOptions;
      m.clarify_reason = englishReason || null;
      m.clarify_options_en = null;
      m.clarify_reason_en = null;
      continue;
    }

    try {
      const translatedOptions: ClarifyOption[] = await Promise.all(
        englishOptions.map(async (o) => {
          const [title, blurb, scenario_query] = await Promise.all([
            o.title ? translateChunk(o.title, { language: targetLang }) : Promise.resolve(""),
            o.blurb ? translateChunk(o.blurb, { language: targetLang }) : Promise.resolve(""),
            o.scenario_query
              ? translateChunk(o.scenario_query, { language: targetLang })
              : Promise.resolve(""),
          ]);
          return { title, role: o.role ?? "general", blurb, scenario_query };
        }),
      );
      const translatedReason = englishReason
        ? await translateChunk(englishReason, { language: targetLang })
        : "";

      await supabase
        .from("messages")
        .update({
          clarify_options: translatedOptions,
          clarify_reason: translatedReason || null,
          clarify_options_en: englishOptions,
          clarify_reason_en: englishReason || null,
        })
        .eq("id", m.id);

      m.clarify_options = translatedOptions;
      m.clarify_reason = translatedReason || null;
      m.clarify_options_en = englishOptions;
      m.clarify_reason_en = englishReason || null;
    } catch (err) {
      console.warn(
        `[switch-language] clarify translate failed for message ${m.id}:`,
        err instanceof Error ? err.message : err,
      );
      // Leave card text as-is — better stale than blank.
    }
  }

  // 5. Also flip user messages' language tag (content stays original).
  await supabase
    .from("messages")
    .update({ language: targetLang })
    .eq("conversation_id", id)
    .eq("role", "user");

  // 6. Update conversation
  await supabase
    .from("conversations")
    .update({ language: targetLang, updated_at: new Date().toISOString() })
    .eq("id", id);

  // 7. Track 1 quota tick — Gemini Flash BN-bridge translate (LLP-paid, stream 1).
  // chars/4 floored placeholder (P4 will wire real usage).
  try {
    const { ConvexHttpClient } = await import("convex/browser");
    const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const { api: convexApi } = await import("../../../../../../convex/_generated/api");
    const outputTokens = Math.max(1, Math.floor(totalEnglishChars / 4));
    await convexClient.mutation(convexApi.tokenUsage.track, {
      userId,
      tier,
      inputTokens: 0,
      outputTokens,
      model: "gemini-2.5-flash",
      agentSlug: "gemini-bn-bridge",
      turn: 1,
      stream: 1,
    });
  } catch { /* non-fatal — switch already applied */ }

  return NextResponse.json({
    conversation: { id, language: targetLang },
    messages: typed.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      content_en: m.content_en,
      language: m.language,
      citations: m.citations,
      followups: m.followups,
      clarify_options: m.clarify_options,
      clarify_reason: m.clarify_reason,
      created_at: m.created_at,
    })),
    translatedCount,
  });
}
