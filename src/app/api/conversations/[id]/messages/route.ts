import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { rateGuard } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await rateGuard(request, 60);
  if (guard) return guard;

  const { id } = await params;

  const supabase = createServerClient();

  // Verify conversation belongs to the authenticated user
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, language")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Fetch messages for this conversation
  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("id, role, content, content_en, language, citations, followups, clarify_options, clarify_reason, verify_report, summary, citations_audit, matched_services, expert_suggestions, cta, delegation_status, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  return NextResponse.json({
    conversation: { id: conversation.id, language: conversation.language ?? "en" },
    messages: messages ?? [],
  });
}
