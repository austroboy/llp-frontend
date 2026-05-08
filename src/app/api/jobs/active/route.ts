import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

// Hydration endpoint for the sidebar job strip.
//
// Returns the authenticated user's chat_jobs rows that are either
// still running OR have completed in the last 10 minutes, so a page
// reload mid-flight restores the running badge and newly-finished
// jobs still show the "ready" / "error" state briefly.
//
// Stale-running rows (started > 10 minutes ago) are transparently
// flipped to state='error' with error='timed_out' at read time — that
// covers the case where the server process crashed mid-work.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const RECENT_WINDOW_MS = 10 * 60 * 1000; // keep done/error visible 10 min

interface ChatJobRow {
  id: string;
  kind: "verify" | "filegen";
  state: "running" | "done" | "error";
  label: string;
  conversation_id: string | null;
  message_id: string | null;
  result: unknown;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createServerClient();
  const now = Date.now();
  const recentCutoff = new Date(now - RECENT_WINDOW_MS).toISOString();
  const staleCutoff = new Date(now - STALE_THRESHOLD_MS).toISOString();

  // Sweep stale-running rows first. Best-effort — if the update fails
  // we still return the raw rows and let the client display them.
  try {
    await supabase
      .from("chat_jobs")
      .update({
        state: "error",
        error: "timed_out",
        completed_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("state", "running")
      .lt("started_at", staleCutoff);
  } catch (err) {
    console.warn("[jobs/active] stale sweep failed:", err);
  }

  // Pull running + recently-completed rows, newest first.
  const { data, error } = await supabase
    .from("chat_jobs")
    .select(
      "id, kind, state, label, conversation_id, message_id, result, error, started_at, completed_at",
    )
    .eq("user_id", userId)
    .or(`state.eq.running,started_at.gte.${recentCutoff}`)
    .order("started_at", { ascending: false })
    .limit(25);

  if (error) {
    console.warn("[jobs/active] select failed:", error.message);
    return NextResponse.json({ jobs: [] });
  }

  const rows = (data ?? []) as ChatJobRow[];
  return NextResponse.json({
    jobs: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      state: r.state,
      label: r.label,
      conversationId: r.conversation_id,
      messageId: r.message_id,
      result: r.result,
      error: r.error,
      startedAt: Date.parse(r.started_at),
      completedAt: r.completed_at ? Date.parse(r.completed_at) : null,
    })),
  });
}
