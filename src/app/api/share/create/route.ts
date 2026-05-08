import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { nanoid } from "nanoid";
import { rateGuard } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const blocked = await rateGuard(request, 10);
  if (blocked) return blocked;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    conversation_id,
    scope = "conversation",
    message_id,
    message_summaries,
    message_verify_reports,
  } = body;

  const UUID_RE_OVERLAY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Client-provided summary overlay (Summarize button output is ephemeral
  // in the UI, so the client carries it forward at share time).
  const summariesMap: Record<string, { summary: string; example_scenario?: string; cited_sections?: string[] }> = {};
  if (message_summaries && typeof message_summaries === "object") {
    for (const [id, payload] of Object.entries(message_summaries)) {
      if (!UUID_RE_OVERLAY.test(id)) continue;
      if (!payload || typeof (payload as { summary?: unknown }).summary !== "string") continue;
      const p = payload as { summary: string; example_scenario?: string; cited_sections?: string[] };
      summariesMap[id] = {
        summary: p.summary,
        example_scenario: typeof p.example_scenario === "string" ? p.example_scenario : undefined,
        cited_sections: Array.isArray(p.cited_sections) ? p.cited_sections.filter((x) => typeof x === "string") : undefined,
      };
    }
  }

  // Client-provided Verify Citations overlay — same rationale.
  const verifyMap: Record<string, Record<string, unknown>> = {};
  if (message_verify_reports && typeof message_verify_reports === "object") {
    for (const [id, payload] of Object.entries(message_verify_reports)) {
      if (!UUID_RE_OVERLAY.test(id)) continue;
      if (!payload || typeof payload !== "object") continue;
      verifyMap[id] = payload as Record<string, unknown>;
    }
  }

  // Always project `verify_report` (DB column written by Deep-Search +
  // future Verify-persistence) onto `verify` — the print page + shared
  // view already render off `pair.a.verify`. Client-provided overlays
  // (fresh Verify button click) still override the DB row because
  // verifyMap is applied after the projection. For assistant rows with
  // no verify source on either side, we still write `verify: null` so
  // the share-refresh gate (`hasStaleVerify`) can distinguish
  // "processed but empty" from "pre-migration snapshot missing the
  // field entirely".
  function attachOverlays<T extends { id: string; role?: string; verify_report?: unknown }>(
    list: T[],
  ): T[] {
    return list.map((m) => {
      const extra: Record<string, unknown> = {};
      if (m.verify_report && typeof m.verify_report === "object") {
        extra.verify = m.verify_report;
      }
      if (summariesMap[m.id]) extra.summary = summariesMap[m.id];
      if (verifyMap[m.id]) extra.verify = verifyMap[m.id];
      if (m.role === "assistant" && extra.verify === undefined) {
        extra.verify = null;
      }
      return Object.keys(extra).length > 0 ? { ...m, ...extra } : m;
    });
  }

  if (!conversation_id) {
    return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
  }
  if (scope === "message" && !message_id) {
    return NextResponse.json({ error: "message_id required for message scope" }, { status: 400 });
  }

  // Reject non-UUID message_id early — temp client ids like "temp-xxx-ai"
  // would otherwise fail at insert time with a Postgres 22P02 error.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (scope === "message" && message_id && !UUID_RE.test(message_id)) {
    return NextResponse.json(
      { error: "Message not yet saved. Try again in a moment." },
      { status: 409 }
    );
  }

  const supabase = createServerClient();

  // Verify user owns the conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, title")
    .eq("id", conversation_id)
    .eq("user_id", userId)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Check for existing share
  let query = supabase
    .from("shared_conversations")
    .select("public_id")
    .eq("conversation_id", conversation_id)
    .eq("scope", scope)
    .eq("is_active", true);

  if (scope === "message" && message_id) {
    query = query.eq("message_id", message_id);
  } else {
    query = query.is("message_id", null);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    // Refresh snapshot when client is attaching new overlays (summary /
    // verify) — the stored snapshot predates the button click and would
    // otherwise ship an out-of-date copy into the PDF.
    const hasOverlays =
      Object.keys(summariesMap).length > 0 ||
      Object.keys(verifyMap).length > 0;
    // Also refresh when the stored snapshot is stale wrt clarify data:
    // pre-2026-04-21 snapshots were saved without clarify_options, so any
    // turn-1 disambiguation message appears as a blank bubble in the PDF.
    // Detect by scanning for an assistant message with empty content AND
    // no clarify_options — if found, pull fresh rows so the clarify block
    // gets hydrated.
    const { data: existingSnap } = await supabase
      .from("shared_conversations")
      .select("snapshot_messages")
      .eq("public_id", existing.public_id)
      .single();
    const snapMsgs = (existingSnap?.snapshot_messages || []) as Array<{
      role?: string;
      content?: string;
      clarify_options?: unknown;
      verify?: unknown;
    }>;
    const hasStaleClarify = snapMsgs.some(
      (m) =>
        m.role === "assistant" &&
        (!m.content || m.content.trim() === "") &&
        !m.clarify_options
    );
    // Snapshots created before the messages.verify_report migration /
    // share-projection were saved without a `verify` field on any
    // assistant row. Refresh once so the PDF export sees the audit card.
    // Subsequent reads still fall through when the refresh itself left
    // `verify` null (i.e. nothing in DB either) — Postgres UPDATE cost
    // here is negligible and avoids a bespoke version marker.
    const hasStaleVerify = snapMsgs.some(
      (m) => m.role === "assistant" && m.verify === undefined,
    );
    if (hasOverlays || hasStaleClarify || hasStaleVerify) {
      const { data: refreshed } = await supabase
        .from("messages")
        .select("id, role, content, content_en, language, citations, clarify_options, clarify_reason, verify_report, summary, citations_audit, matched_services, expert_suggestions, cta, delegation_status, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: true });
      const refreshedMsgs = refreshed || [];
      let snapshotMsgs = refreshedMsgs;
      if (scope === "message" && message_id) {
        const idx = refreshedMsgs.findIndex((m) => m.id === message_id);
        snapshotMsgs =
          idx > 0 && refreshedMsgs[idx - 1].role === "user"
            ? [refreshedMsgs[idx - 1], refreshedMsgs[idx]]
            : idx >= 0
              ? [refreshedMsgs[idx]]
              : refreshedMsgs.slice(0, 2);
      }
      await supabase
        .from("shared_conversations")
        .update({ snapshot_messages: attachOverlays(snapshotMsgs) })
        .eq("public_id", existing.public_id);
    }
    const url = `${getBaseUrl(request)}/shared/${existing.public_id}`;
    return NextResponse.json({ public_id: existing.public_id, url, created: false });
  }

  // Fetch messages for snapshot
  const { data: allMessages } = await supabase
    .from("messages")
    .select("id, role, content, content_en, language, citations, clarify_options, clarify_reason, verify_report, summary, citations_audit, matched_services, expert_suggestions, cta, delegation_status, created_at")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true });

  const msgs = allMessages || [];

  if (scope === "message" && message_id) {
    const targetIdx = msgs.findIndex((m) => m.id === message_id);
    const snapshotMsgs =
      targetIdx > 0 && msgs[targetIdx - 1].role === "user"
        ? [msgs[targetIdx - 1], msgs[targetIdx]]
        : targetIdx >= 0
          ? [msgs[targetIdx]]
          : msgs.slice(0, 2);

    const publicId = nanoid(24);
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase
      .from("shared_conversations")
      .insert({
        conversation_id,
        user_id: userId,
        public_id: publicId,
        scope,
        message_id,
        snapshot_title: conversation.title,
        snapshot_messages: attachOverlays(snapshotMsgs),
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("[share/create] insert failed", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });
      return NextResponse.json(
        { error: "Failed to create share", detail: insertError.message },
        { status: 500 }
      );
    }

    const url = `${getBaseUrl(request)}/shared/${publicId}`;
    return NextResponse.json({ public_id: publicId, url, created: true });
  }

  // Full conversation snapshot
  const publicId = nanoid(24);
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error: insertError } = await supabase
    .from("shared_conversations")
    .insert({
      conversation_id,
      user_id: userId,
      public_id: publicId,
      scope,
      snapshot_title: conversation.title,
      snapshot_messages: attachOverlays(msgs),
      expires_at: expiresAt,
    });

  if (insertError) {
    return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
  }

  const url = `${getBaseUrl(request)}/shared/${publicId}`;
  return NextResponse.json({ public_id: publicId, url, created: true });
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}
