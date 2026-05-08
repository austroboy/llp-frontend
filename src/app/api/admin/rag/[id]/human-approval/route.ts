import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

interface PublicMetadata {
  role?: string;
}

/**
 * GET — Read past human-approval decisions for a document.
 *
 * 2026-04-22: POST removed as part of admin ingest deprecation. New approvals
 * are now recorded via the CLI audit pipeline. This route returns the
 * read-only history pulled from audit_logs where operation = 'human-approval'.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (user.publicMetadata as PublicMetadata)?.role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, result, result_message, user_id, user_email, created_at")
    .eq("document_id", id)
    .eq("operation", "human-approval")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Parse signature + comments from legacy result_message shape:
  //   `[Signed: <signature>] <comments>`
  const approvals = (data ?? []).map((row) => {
    const msg = row.result_message ?? "";
    const sigMatch = msg.match(/^\[Signed:\s*([^\]]+)\]\s*(.*)$/);
    return {
      id: row.id,
      decision: row.result ?? "",
      signature: sigMatch?.[1]?.trim() || undefined,
      comments: sigMatch ? sigMatch[2]?.trim() || undefined : msg || undefined,
      user_id: row.user_id,
      user_email: row.user_email,
      created_at: row.created_at,
    };
  });

  return NextResponse.json({ approvals });
}
