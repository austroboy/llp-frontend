import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSignedUrl } from "@/lib/generated-files";

// GET /api/files/signed-url/[id]
// Returns `{ url, expiresAt, file }` for the given file id, provided the
// caller owns it. TTL is 1 hour.

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  try {
    const result = await getSignedUrl(id, userId, 3600);
    if (!result) {
      return NextResponse.json(
        { error: "not_found", message: "File not found or access denied." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        url: result.url,
        expiresAt: result.expiresAt,
        file: {
          id: result.file.id,
          fileName: result.file.file_name,
          format: result.file.format,
          sizeBytes: result.file.size_bytes,
        },
      },
      {
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[/api/files/signed-url/${id}] failed:`, msg);
    const tableMissing = /does not exist/i.test(msg) || /Bucket not found/i.test(msg);
    if (tableMissing) {
      return NextResponse.json(
        {
          error: "files_infra_missing",
          message:
            "Storage bucket or generated_files table not provisioned.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "sign_failed", message: msg.slice(0, 200) },
      { status: 500 }
    );
  }
}
