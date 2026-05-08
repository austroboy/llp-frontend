import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  uploadGeneratedFile,
  rowToClientFile,
  type GeneratedFileFormat,
  type GeneratedFileKind,
} from "@/lib/generated-files";

// POST /api/files/upload
// Accepts multipart formData with:
//   - `file`            (Blob, required)
//   - `conversationId`  (string, optional)
//   - `kind`            ("uploaded" | "generated", default "uploaded")
//   - `docType`         (string, optional)
//
// Validates size (<10 MB) + extension, uploads to Supabase Storage,
// inserts a `generated_files` row, returns the client-shaped row.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_FORMATS: GeneratedFileFormat[] = [
  "docx",
  "pdf",
  "pptx",
  "xlsx",
  "jpg",
  "png",
  "txt",
];

/**
 * Magic-byte MIME sniff (H-9). Returns a normalized format name or null
 * if the leading bytes don't match any allowlist entry. txt has no magic
 * so we scan the leading window for printable / UTF-8 bytes.
 */
function sniffFormat(buf: Uint8Array): GeneratedFileFormat | null {
  if (buf.length < 8) return null;
  // PDF: %PDF-
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) return "pdf";
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  // ZIP (OOXML — docx/xlsx/pptx)
  if (
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07) &&
    (buf[3] === 0x04 || buf[3] === 0x06 || buf[3] === 0x08)
  ) {
    return "docx"; // zip-class; caller verifies subtype against extension
  }
  // txt fallback — scan for printable bytes only
  const len = Math.min(buf.length, 512);
  for (let i = 0; i < len; i++) {
    const b = buf[i];
    if (b === 0x09 || b === 0x0a || b === 0x0d) continue;
    if (b >= 0x20 && b <= 0x7e) continue;
    if (b >= 0x80) continue;
    return null;
  }
  return "txt";
}

/**
 * Cross-check sniff result vs declared format from filename/mime.
 * docx/xlsx/pptx all sniff as "docx" (zip) so they collapse to a single
 * zip class for verification purposes.
 */
function sniffMatches(detected: GeneratedFileFormat, declared: GeneratedFileFormat): boolean {
  if (detected === declared) return true;
  const zipFamily: GeneratedFileFormat[] = ["docx", "xlsx", "pptx"];
  if (detected === "docx" && zipFamily.includes(declared)) return true;
  return false;
}

function detectFormat(
  fileName: string,
  mimeType: string
): GeneratedFileFormat | null {
  const name = fileName.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  if ((ALLOWED_FORMATS as string[]).includes(ext)) {
    return (ext === "jpeg" ? "jpg" : ext) as GeneratedFileFormat;
  }
  // Fallback to mime
  if (mimeType.includes("wordprocessingml")) return "docx";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("spreadsheetml")) return "xlsx";
  if (mimeType.includes("presentationml")) return "pptx";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType.startsWith("text/")) return "txt";
  return null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_form_data" },
      { status: 400 }
    );
  }

  const fileEntry = form.get("file");
  if (!(fileEntry instanceof Blob)) {
    return NextResponse.json(
      { error: "missing_file", message: "`file` is required" },
      { status: 400 }
    );
  }

  const fileName =
    (fileEntry instanceof File ? fileEntry.name : "upload") || "upload";
  const mimeType = fileEntry.type || "application/octet-stream";

  if (fileEntry.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: "file_too_large",
        message: `File exceeds 10 MB limit (${Math.round(
          fileEntry.size / 1024 / 1024
        )} MB).`,
      },
      { status: 413 }
    );
  }

  const format = detectFormat(fileName, mimeType);
  if (!format) {
    return NextResponse.json(
      {
        error: "unsupported_format",
        message: `Supported: ${ALLOWED_FORMATS.join(", ")}`,
      },
      { status: 415 }
    );
  }

  const conversationIdRaw = form.get("conversationId");
  const conversationId =
    typeof conversationIdRaw === "string" && conversationIdRaw.length > 0
      ? conversationIdRaw
      : null;

  const kindRaw = form.get("kind");
  const kind: GeneratedFileKind =
    kindRaw === "generated" ? "generated" : "uploaded";

  const docTypeRaw = form.get("docType");
  const docType =
    typeof docTypeRaw === "string" && docTypeRaw.length > 0
      ? docTypeRaw
      : null;

  try {
    const bytes = await fileEntry.arrayBuffer();

    // H-9 magic-byte sniff — reject mismatches between declared format
    // (filename ext / mime header) and actual leading bytes.
    const detected = sniffFormat(new Uint8Array(bytes));
    if (!detected || !sniffMatches(detected, format)) {
      return NextResponse.json(
        {
          error: "format_mismatch",
          message: "File contents do not match declared type.",
        },
        { status: 400 }
      );
    }

    const row = await uploadGeneratedFile({
      userId,
      conversationId,
      fileName,
      format,
      kind,
      docType,
      bytes,
      contentType: mimeType,
    });
    return NextResponse.json(
      { file: rowToClientFile(row) },
      {
        status: 201,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[/api/files/upload] failed:", msg);
    const tableMissing = /does not exist/i.test(msg) || /Bucket not found/i.test(msg);
    if (tableMissing) {
      return NextResponse.json(
        {
          error: "files_infra_missing",
          message:
            "Storage bucket or generated_files table not provisioned. See docs/migrations/2026-04-18-*.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "upload_failed", message: msg.slice(0, 200) },
      { status: 500 }
    );
  }
}
