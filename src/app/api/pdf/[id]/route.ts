import { NextRequest, NextResponse } from "next/server";
import { getPdfBuffer, getPdfLanguagesAsync } from "@/lib/pdf-files";

export { getPdfLanguages } from "@/lib/pdf-files";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docId = id.toUpperCase();
  if (!/^DOC-\d{3}$/.test(docId)) {
    return NextResponse.json({ error: "invalid_doc_id" }, { status: 400 });
  }
  const lang = (request.nextUrl.searchParams.get("lang") === "bn" ? "bn" : "en") as "en" | "bn";

  // Discover what PDFs are actually available (filesystem + Supabase Storage).
  const availability = await getPdfLanguagesAsync(docId);
  if (!availability.en && !availability.bn) {
    return NextResponse.json({ error: "PDF not available" }, { status: 404 });
  }

  // Pick requested lang if present, else fall back to the other available one.
  const servedLang: "en" | "bn" = availability[lang] ? lang : (lang === "bn" ? "en" : "bn");
  const isFallback = servedLang !== lang;

  const buffer = await getPdfBuffer(docId, servedLang);
  if (!buffer) {
    return NextResponse.json({ error: "PDF file not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${docId}_${servedLang}.pdf"`,
      "Cache-Control": "public, max-age=86400",
      "X-PDF-Lang": servedLang,
      "X-PDF-Fallback": isFallback ? "true" : "false",
    },
  });
}
