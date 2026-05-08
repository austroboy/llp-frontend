import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

interface PublicMetadata {
  role?: string;
}

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (user.publicMetadata as PublicMetadata)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = createServerClient();

    // Use raw SQL to get accurate counts (Supabase .select() caps at 1000 rows)
    const { data, error } = await supabase.rpc("get_rag_stats");

    if (error) {
      // Fallback: paginate if RPC doesn't exist (select only document_id, never vectors)
      const paginatedCount = async (filter?: "has_embedding") => {
        const result: Record<string, number> = {};
        let offset = 0;
        const pageSize = 1000;

        while (true) {
          let query = supabase
            .from("chunks")
            .select("document_id")
            .not("document_id", "is", null);

          if (filter === "has_embedding") {
            query = query.not("embedding", "is", null);
          }

          const { data: page, error: pageErr } = await query.range(
            offset,
            offset + pageSize - 1
          );

          if (pageErr) throw pageErr;
          if (!page || page.length === 0) break;

          for (const row of page) {
            result[row.document_id] = (result[row.document_id] || 0) + 1;
          }

          if (page.length < pageSize) break;
          offset += pageSize;
        }
        return result;
      };

      const [counts, embCounts] = await Promise.all([
        paginatedCount(),
        paginatedCount("has_embedding"),
      ]);

      // Fetch latest human-approval per document (fallback path)
      const { data: approvalsFb } = await supabase
        .from("audit_logs")
        .select("document_id, result, result_message, user_email, created_at")
        .eq("operation", "human-approval")
        .order("created_at", { ascending: false });

      const approvalMapFb: Record<string, { status: string; by: string; at: string }> = {};
      for (const row of approvalsFb ?? []) {
        if (!approvalMapFb[row.document_id]) {
          const signedBy = row.result_message?.match(/^\[Signed: (.+?)\]/)?.[1];
          approvalMapFb[row.document_id] = {
            status: row.result,
            by: signedBy || row.user_email || "Admin",
            at: row.created_at,
          };
        }
      }

      return NextResponse.json({
        chunkCounts: counts,
        embeddedCounts: embCounts,
        approvals: approvalMapFb,
      });
    }

    // RPC returns rows: { document_id, chunk_count, embedded_count }
    const counts: Record<string, number> = {};
    const embeddedCounts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.document_id] = row.chunk_count;
      embeddedCounts[row.document_id] = row.embedded_count;
    }

    // Fetch latest human-approval per document
    const { data: approvals } = await supabase
      .from("audit_logs")
      .select("document_id, result, result_message, user_email, created_at")
      .eq("operation", "human-approval")
      .order("created_at", { ascending: false });

    const approvalMap: Record<string, { status: string; by: string; at: string }> = {};
    for (const row of approvals ?? []) {
      if (!approvalMap[row.document_id]) {
        const signedBy = row.result_message?.match(/^\[Signed: (.+?)\]/)?.[1];
        approvalMap[row.document_id] = {
          status: row.result,
          by: signedBy || row.user_email || "Admin",
          at: row.created_at,
        };
      }
    }

    return NextResponse.json({ chunkCounts: counts, embeddedCounts, approvals: approvalMap });
  } catch (err) {
    console.error("RAG stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch RAG stats" },
      { status: 500 }
    );
  }
}
