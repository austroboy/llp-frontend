import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  isResponseSchemaLike,
  type ResponseSchema,
} from "@/lib/documents/response-schema";
import {
  emitDocx,
  emitPdf,
  emitPptx,
  emitXlsx,
  draftHasBangla,
  MIME_BY_FORMAT,
  XlsxSheetsMissingError,
  type EmitFormat,
} from "@/lib/emitters";
import {
  uploadGeneratedFile,
  type GeneratedFileFormat,
} from "@/lib/generated-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ALLOWED_FORMATS: ReadonlySet<EmitFormat> = new Set<EmitFormat>([
  "docx",
  "pdf",
  "pptx",
  "xlsx",
]);

function isFormat(value: unknown): value is EmitFormat {
  return (
    typeof value === "string" && ALLOWED_FORMATS.has(value as EmitFormat)
  );
}

function safeFilename(draft: ResponseSchema, format: EmitFormat): string {
  const base = (draft.document_type || draft.title || "document")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "document";
  return `${base}.${format}`;
}

async function dispatch(
  format: EmitFormat,
  draft: ResponseSchema,
): Promise<Buffer> {
  switch (format) {
    case "docx":
      return emitDocx(draft);
    case "pdf":
      return emitPdf(draft);
    case "pptx":
      return emitPptx(draft);
    case "xlsx":
      return emitXlsx(draft);
  }
}

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_PHASE2_EMITTER !== "1") {
    return NextResponse.json(
      { error: "phase2_emitter_disabled" },
      { status: 501 },
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  const obj = (body ?? {}) as Record<string, unknown>;
  const format = obj.format;
  const editedJson = obj.editedJson;

  if (!isFormat(format)) {
    return NextResponse.json(
      { error: "invalid_format", allowed: Array.from(ALLOWED_FORMATS) },
      { status: 400 },
    );
  }
  if (!isResponseSchemaLike(editedJson)) {
    return NextResponse.json(
      { error: "invalid_edited_json" },
      { status: 400 },
    );
  }

  const draft = editedJson;

  const warnings: string[] = [];
  if (format === "pptx" && draftHasBangla(draft)) {
    warnings.push("pptx_bangla_gap");
  }

  const started = Date.now();
  let bytes: Buffer;
  try {
    bytes = await dispatch(format, draft);
  } catch (err) {
    const message =
      err instanceof XlsxSheetsMissingError
        ? "xlsx_emit_requires_sheets"
        : err instanceof Error
          ? err.message
          : "emit_failed";
    const status = err instanceof XlsxSheetsMissingError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
  const duration = Date.now() - started;

  const filename = safeFilename(draft, format);

  // Persist to generated_files with the draft JSON so the files-sidebar
  // "Edit" action can rehydrate this file into the canvas later.
  // Upload failures are non-fatal — the user still gets the bytes for
  // immediate download, just without a sidebar row.
  const responseHeaders: Record<string, string> = {
    "Content-Type": MIME_BY_FORMAT[format],
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": String(bytes.byteLength),
    "X-Emit-Warnings": JSON.stringify(warnings),
    "X-Emit-Duration-Ms": String(duration),
    "Cache-Control": "no-store",
  };

  try {
    const row = await uploadGeneratedFile({
      userId,
      conversationId: null,
      fileName: filename,
      format: format as GeneratedFileFormat,
      kind: "generated",
      docType: draft.document_type || null,
      bytes: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
      contentType: MIME_BY_FORMAT[format],
      draftJson: draft,
    });
    responseHeaders["X-File-Id"] = row.id;
    responseHeaders["X-File-Name"] = encodeURIComponent(row.file_name);
    responseHeaders["X-File-Format"] = row.format;
    responseHeaders["X-File-Size"] = String(row.size_bytes);
    responseHeaders["X-File-Created-At"] = row.created_at;
    responseHeaders["X-File-Storage-Path"] = row.storage_path;
    if (row.doc_type) responseHeaders["X-File-Doc-Type"] = row.doc_type;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[emit] persistence failed (non-fatal): ${msg}`);
    responseHeaders["X-File-Persist-Error"] = msg.slice(0, 200);
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: responseHeaders,
  });
}
