import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { assertSameOrigin } from "@/lib/admin-csrf";
import { writeAuditLog } from "@/lib/admin-audit";
import { rateGuard } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const isAdmin = (user?.publicMetadata as Record<string, unknown>)?.role === "admin";
  if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const supabase = createServerClient();

  // Single conversation detail — fetch all messages
  const conversationId = req.nextUrl.searchParams.get("conversation_id");
  if (conversationId) {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, role, content, citations, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[admin/chat-records] messages query error:", error);
      return NextResponse.json({ messages: [], error: error.message });
    }
    return NextResponse.json({ messages: messages || [] });
  }

  // List conversations
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const hasVotesOnly = req.nextUrl.searchParams.get("hasVotes") === "true";
  const hasCommentsOnly = req.nextUrl.searchParams.get("hasComments") === "true";
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data: records, error } = await supabase
    .from("conversations")
    .select("id, user_id, title, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve user emails from Clerk (batch)
  const userIds = Array.from(new Set((records || []).map(r => r.user_id).filter(Boolean)));
  const emailMap: Record<string, string> = {};
  // Resolve emails via Clerk REST API (more reliable than SDK in route handlers)
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (clerkSecretKey && userIds.length > 0) {
    try {
      const params = userIds.slice(0, 20).map(id => `user_id=${id}`).join("&");
      const res = await fetch(`https://api.clerk.com/v1/users?${params}&limit=20`, {
        headers: { Authorization: `Bearer ${clerkSecretKey}` },
      });
      if (res.ok) {
        const users = await res.json();
        for (const u of users) {
          emailMap[u.id] = u.email_addresses?.[0]?.email_address || u.first_name || u.id.slice(0, 14) + "...";
        }
      }
    } catch {}
  }
  // Fallback for any unresolved
  for (const uid of userIds) {
    if (!emailMap[uid]) emailMap[uid] = uid.slice(0, 14) + "...";
  }

  // Enrich each conversation
  const enriched = await Promise.all((records || []).map(async (conv) => {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    const messageIds = (messages || []).map(m => m.id);
    let votes = { upvotes: 0, downvotes: 0, comments: [] as any[] };

    if (messageIds.length > 0) {
      const { data: voteData } = await supabase
        .from("message_votes")
        .select("vote, comment, user_id, created_at")
        .in("message_id", messageIds);

      if (voteData) {
        votes.upvotes = voteData.filter(v => v.vote === "up").length;
        votes.downvotes = voteData.filter(v => v.vote === "down").length;
        votes.comments = voteData.filter(v => v.comment).map(v => ({
          vote: v.vote,
          comment: v.comment,
          user_id: v.user_id,
          created_at: v.created_at,
        }));
      }
    }

    const userMsg = (messages || []).find(m => m.role === "user");
    const aiMsg = (messages || []).find(m => m.role === "assistant");

    return {
      id: conv.id,
      user_id: conv.user_id,
      user_email: emailMap[conv.user_id] || conv.user_id?.slice(0, 12) + "...",
      title: conv.title,
      query_preview: userMsg?.content?.slice(0, 150) || "",
      response_preview: aiMsg?.content?.slice(0, 300) || "",
      message_count: (messages || []).length,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      votes,
    };
  }));

  let filtered = enriched;
  if (hasVotesOnly) filtered = filtered.filter(r => r.votes.upvotes > 0 || r.votes.downvotes > 0);
  if (hasCommentsOnly) filtered = filtered.filter(r => r.votes.comments.length > 0);

  const { count } = await supabase.from("conversations").select("*", { count: "exact", head: true });

  return NextResponse.json({
    records: filtered,
    total: count || 0,
    page,
    pages: Math.ceil((count || 0) / limit),
  });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const isAdmin = (user?.publicMetadata as Record<string, unknown>)?.role === "admin";
  if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const csrf = assertSameOrigin(req);
  if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const blocked = await rateGuard(req, 5);
  if (blocked) return blocked;

  const { ids } = await req.json();
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Delete messages first (foreign key), then conversations
  for (const id of ids) {
    await supabase.from("message_votes").delete().eq("conversation_id", id);
    await supabase.from("messages").delete().eq("conversation_id", id);
    await supabase.from("conversations").delete().eq("id", id);
  }

  await writeAuditLog({
    actorClerkId: userId,
    op: "chat-records.delete",
    metadata: { count: ids.length, conversation_ids: ids },
  });

  return NextResponse.json({ deleted: ids.length });
}
