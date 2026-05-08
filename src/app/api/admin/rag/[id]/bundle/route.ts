import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import JSZip from "jszip";
import { getPdfBuffer } from "@/lib/pdf-files";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function safeFileName(s: string) {
  return s.replace(/[^A-Za-z0-9._-]+/g, "_");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr)
    return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const { id: rawId } = await params;
  const id = rawId.toUpperCase();
  if (!/^DOC-\d{3}$/.test(id)) {
    return NextResponse.json({ error: "Invalid doc id" }, { status: 400 });
  }

  const fs = await import("fs");
  const path = await import("path");

  const zip = new JSZip();
  const folder = zip.folder(id)!;
  const manifest: string[] = [`# ${id} bundle`, ""];

  const [enPdf, bnPdf] = await Promise.all([
    getPdfBuffer(id, "en"),
    getPdfBuffer(id, "bn"),
  ]);

  const pdfFolder = folder.folder("pdfs")!;
  if (enPdf) {
    pdfFolder.file(`${id}_en.pdf`, enPdf);
    manifest.push(`- pdfs/${id}_en.pdf (${enPdf.byteLength.toLocaleString()} bytes)`);
  }
  if (bnPdf) {
    pdfFolder.file(`${id}_bn.pdf`, bnPdf);
    manifest.push(`- pdfs/${id}_bn.pdf (${bnPdf.byteLength.toLocaleString()} bytes)`);
  }

  const textFolder = folder.folder("text")!;
  let textCount = 0;

  const extractedDir = path.join(process.cwd(), "docs", "extracted");
  if (fs.existsSync(extractedDir)) {
    const entries = fs
      .readdirSync(extractedDir)
      .filter((f) => f.startsWith(`${id}_`))
      .filter((f) => {
        const full = path.join(extractedDir, f);
        return fs.statSync(full).isFile();
      });

    for (const name of entries) {
      const full = path.join(extractedDir, name);
      const buf = fs.readFileSync(full);
      textFolder.file(name, buf);
      manifest.push(`- text/${name} (${buf.byteLength.toLocaleString()} bytes)`);
      textCount++;
    }
  }

  const supabase = createServerClient();
  const { data: docTexts } = await supabase
    .from("document_texts")
    .select("language, content, updated_at")
    .eq("document_id", id);

  for (const row of docTexts ?? []) {
    if (!row.content) continue;
    const name = `${id}_${row.language}.md`;
    textFolder.file(name, row.content);
    manifest.push(
      `- text/${name} (${row.content.length.toLocaleString()} chars, document_texts updated ${row.updated_at})`
    );
    textCount++;
  }

  if (textCount === 0) {
    const { data: chunks } = await supabase
      .from("chunks")
      .select("section, chapter, content")
      .eq("document_id", id)
      .order("id", { ascending: true });

    if (chunks?.length) {
      const md = chunks
        .map((c) => {
          const head = [c.chapter, c.section].filter(Boolean).join(" · ");
          return head ? `## ${head}\n\n${c.content}` : c.content;
        })
        .join("\n\n---\n\n");
      const name = `${id}_chunks.md`;
      textFolder.file(name, md);
      manifest.push(
        `- text/${name} (${md.length.toLocaleString()} chars, assembled from ${chunks.length} chunks)`
      );
      textCount++;
    }
  }

  if (manifest.length === 2) {
    return NextResponse.json(
      { error: "No files found for this document" },
      { status: 404 }
    );
  }

  manifest.push("", `Generated: ${new Date().toISOString()}`);
  folder.file("MANIFEST.txt", manifest.join("\n"));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  const fileName = safeFileName(`${id}_bundle.zip`);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
