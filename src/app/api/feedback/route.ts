import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { rateGuard } from "@/lib/rate-limit";

/**
 * Tier 5 — durable sink for negative-rating free-text reasons.
 *
 * The PostHog `search_result_rated` event is fired by vote-buttons.tsx
 * with no free-text payload. This route writes the same `query_id` plus
 * the user's reason text to the `search_feedback` Supabase table so the
 * legal-review queue can read it without crawling the conversation
 * message tree.
 *
 * Hard limits enforced server-side:
 * - reason_text trimmed and capped at 500 chars
 * - control characters stripped
 * - empty reason rejected (route returns 400; client should not POST)
 */

const MAX_REASON_LEN = 500;

// Strip ASCII control chars (except newline / tab) so the row stays
// safe for downstream rendering. The same sanitization runs before the
// length cap so escape sequences cannot inflate the byte count.
// HTML angle brackets are escaped server-side as defense-in-depth
// against future stored-XSS in any admin renderer that might forget
// to escape (M-7 in audit-2026-04-28.md).
function sanitizeReason(raw: string): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim()
    .slice(0, MAX_REASON_LEN);
}

interface FeedbackBody {
  query_id?: unknown;
  reason_text?: unknown;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await rateGuard(req, 20);
  if (guard) return guard;

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const queryId =
    typeof body.query_id === "string" ? body.query_id.trim() : "";
  if (!queryId) {
    return NextResponse.json(
      { error: "query_id is required" },
      { status: 400 },
    );
  }

  const rawReason =
    typeof body.reason_text === "string" ? body.reason_text : "";
  const reason = sanitizeReason(rawReason);
  if (!reason) {
    return NextResponse.json(
      { error: "reason_text is required" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("search_feedback").insert({
    user_id: userId,
    query_id: queryId,
    reason_text: reason,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
