import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getDocumentById, getBilingualFlags } from "@/lib/documents";
import { getDocumentText } from "@/lib/document-storage";

interface PublicMetadata {
  role?: string;
}

async function requireAdmin() {
  const user = await currentUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  const role = (user.publicMetadata as PublicMetadata)?.role;
  if (role !== "admin") return { error: "Forbidden", status: 403 };
  return null;
}

/**
 * GET — Read document text for both EN and BN (read-only inspector).
 *
 * PUT/DELETE removed 2026-04-22 as part of admin ingest deprecation.
 * Corpus mutations are CLI-only via scripts/mineru-reingest.ts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const { id } = await params;
  const doc = await getDocumentById(id);
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Draft-key fetch (legacy AI-edit large-doc delivery — kept in case any read-only caller uses it)
  const draft = new URL(request.url).searchParams.get("draft");
  if (draft) {
    const content = await getDocumentText(id, draft as "en" | "bn");
    return NextResponse.json({ content });
  }

  const flags = await getBilingualFlags(id);

  const [en, bn] = await Promise.all([
    getDocumentText(id, "en"),
    getDocumentText(id, "bn"),
  ]);

  return NextResponse.json({
    document: doc,
    en,
    bn,
    enFile: flags.hasEn ? id + "-en" : null,
    bnFile: flags.hasBn ? id + "-bn" : null,
    enTranslated: flags.enTranslated,
    bnTranslated: flags.bnTranslated,
  });
}
