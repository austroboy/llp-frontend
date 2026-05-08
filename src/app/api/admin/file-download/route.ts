import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const isAdmin = (user?.publicMetadata as Record<string, unknown>)?.role === "admin";
  if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const conversationId = req.nextUrl.searchParams.get("conversation_id");
  const fileName = req.nextUrl.searchParams.get("fileName");
  if (!conversationId || !fileName) {
    return NextResponse.json({ error: "conversation_id and fileName required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get the user_id from the conversation to build the storage path
  const { data: conv } = await supabase
    .from("conversations")
    .select("user_id")
    .eq("id", conversationId)
    .limit(1);

  if (!conv || conv.length === 0) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const convUserId = conv[0].user_id;

  // List files in the user's folder and find the matching one
  const { data: files } = await supabase.storage
    .from("chat-uploads")
    .list(convUserId, { limit: 100 });

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files found" }, { status: 404 });
  }

  // Find file matching the name (stored as {timestamp}-{sanitized_name}).
  // Anchor to the storage convention with `-{sanitized}` suffix to prevent
  // accidental matches across users/files when one filename is a substring
  // of another. Exact equality is also accepted as a fallback for legacy
  // entries that were stored without a timestamp prefix.
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const match = files.find(
    (f) => f.name === sanitizedName || f.name === fileName || f.name.endsWith(`-${sanitizedName}`)
  );

  if (!match) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
  }

  // Generate signed URL (valid for 1 hour)
  const { data: signed } = await supabase.storage
    .from("chat-uploads")
    .createSignedUrl(`${convUserId}/${match.name}`, 3600);

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, fileName: match.name });
}
