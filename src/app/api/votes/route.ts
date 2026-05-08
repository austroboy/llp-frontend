import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { promoteToCacheIfReady, invalidateCacheIfNeeded } from "@/lib/ai/response-cache";
import { rateGuard } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const guard = await rateGuard(req, 30);
  if (guard) return guard;

  const { message_id, conversation_id, vote, comment } = await req.json();

  if (!message_id || !vote || !["up", "down"].includes(vote)) {
    return NextResponse.json({ error: "message_id and vote (up/down) required" }, { status: 400 });
  }

  // Allow comments for both upvotes and downvotes
  const voteComment = comment || null;

  const supabase = createServerClient();

  // Upsert vote (one per user per message)
  const { error } = await supabase.from("message_votes").upsert(
    {
      user_id: userId,
      message_id,
      conversation_id: conversation_id || null,
      vote,
      comment: voteComment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,message_id" }
  );

  if (error) {
    console.error("[votes] Upsert error:", error);
    return NextResponse.json({ error: "Failed to save vote" }, { status: 500 });
  }

  // Get updated counts
  const [{ count: upvotes }, { count: downvotes }] = await Promise.all([
    supabase.from("message_votes").select("*", { count: "exact", head: true }).eq("message_id", message_id).eq("vote", "up"),
    supabase.from("message_votes").select("*", { count: "exact", head: true }).eq("message_id", message_id).eq("vote", "down"),
  ]);

  // Cache promotion/invalidation (fire-and-forget)
  if (vote === "up") {
    promoteToCacheIfReady(message_id).catch(() => {});
  } else {
    invalidateCacheIfNeeded(message_id).catch(() => {});
  }

  return NextResponse.json({
    vote,
    upvotes: upvotes || 0,
    downvotes: downvotes || 0,
  });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const messageId = req.nextUrl.searchParams.get("message_id");

  if (!messageId) return NextResponse.json({ error: "message_id required" }, { status: 400 });

  const guard = await rateGuard(req, 30);
  if (guard) return guard;

  const supabase = createServerClient();

  // Get counts
  const [{ count: upvotes }, { count: downvotes }] = await Promise.all([
    supabase.from("message_votes").select("*", { count: "exact", head: true }).eq("message_id", messageId).eq("vote", "up"),
    supabase.from("message_votes").select("*", { count: "exact", head: true }).eq("message_id", messageId).eq("vote", "down"),
  ]);

  // Get current user's vote
  let userVote = null;
  if (userId) {
    const { data } = await supabase
      .from("message_votes")
      .select("vote")
      .eq("message_id", messageId)
      .eq("user_id", userId)
      .limit(1);
    if (data && data.length > 0) userVote = data[0].vote;
  }

  return NextResponse.json({
    upvotes: upvotes || 0,
    downvotes: downvotes || 0,
    userVote,
  });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const messageId = req.nextUrl.searchParams.get("message_id");
  if (!messageId) return NextResponse.json({ error: "message_id required" }, { status: 400 });

  const guard = await rateGuard(req, 30);
  if (guard) return guard;

  const supabase = createServerClient();
  await supabase.from("message_votes").delete().eq("user_id", userId).eq("message_id", messageId);

  return NextResponse.json({ ok: true });
}
