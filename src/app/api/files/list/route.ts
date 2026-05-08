import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listUserFiles, rowToClientFile } from "@/lib/generated-files";

// GET /api/files/list
// Returns the signed-in user's most recent files (max 50, newest first).
// Enforces Clerk auth + server-side tenant isolation via `user_id` filter.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // Optional limit query param — clamp to [1, 100].
  const limitRaw = req.nextUrl.searchParams.get("limit");
  let limit = 50;
  if (limitRaw) {
    const n = parseInt(limitRaw, 10);
    if (Number.isFinite(n)) {
      limit = Math.max(1, Math.min(100, n));
    }
  }

  try {
    const rows = await listUserFiles(userId, limit);
    return NextResponse.json(
      { files: rows.map(rowToClientFile) },
      {
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Check for the specific "table does not exist" error from Postgres
    // (code 42P01) so the client can surface a nicer message while the
    // migration is pending.
    const tableMissing =
      /relation .+ does not exist/i.test(msg) ||
      /(42P01)/.test(msg) ||
      /Could not find the table/i.test(msg);
    if (tableMissing) {
      return NextResponse.json(
        {
          error: "files_table_missing",
          message:
            "The generated_files table has not been created yet. Apply the migration from docs/migrations/2026-04-18-generated-files.sql.",
        },
        { status: 503 }
      );
    }
    console.error("[/api/files/list] failed:", msg);
    return NextResponse.json(
      { error: "list_failed", message: msg.slice(0, 200) },
      { status: 500 }
    );
  }
}
