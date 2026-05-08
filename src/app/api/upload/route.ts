import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const maxDuration = 30;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "text/plain",
];

/**
 * Magic-byte MIME sniff (H-9). Validates declared `file.type` against the
 * first bytes of the buffer so a client cannot send `application/pdf`
 * with a payload of arbitrary script. Returns the detected MIME or null
 * if the signature is unrecognized.
 *
 * docx is a ZIP container so we return the generic ZIP signature and
 * trust the declared MIME for the inner OOXML subtype (cross-checked
 * via mammoth which will error on a non-OOXML zip).
 *
 * `text/plain` has no magic bytes — accept iff every byte is printable
 * ASCII / common UTF-8 lead bytes for the leading sniff window.
 */
function sniffMime(buf: Uint8Array, declared: string): string | null {
  if (buf.length < 8) return null;
  // PDF: %PDF-
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) {
    return "application/pdf";
  }
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  // ZIP (docx/xlsx/pptx are ZIP containers): 50 4B 03 04 / 05 06 / 07 08
  if (
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07) &&
    (buf[3] === 0x04 || buf[3] === 0x06 || buf[3] === 0x08)
  ) {
    return "application/zip";
  }
  // text/plain — no magic; verify printable + scan-window heuristic
  if (declared === "text/plain") {
    const len = Math.min(buf.length, 512);
    for (let i = 0; i < len; i++) {
      const b = buf[i];
      // Allow tab/lf/cr + printable ASCII + UTF-8 continuation bytes.
      if (b === 0x09 || b === 0x0a || b === 0x0d) continue;
      if (b >= 0x20 && b <= 0x7e) continue;
      if (b >= 0x80) continue; // UTF-8 multi-byte
      return null;
    }
    return "text/plain";
  }
  return null;
}

function mimeMatches(detected: string, declared: string): boolean {
  if (detected === declared) return true;
  // image/jpg <-> image/jpeg
  if (detected === "image/jpeg" && declared === "image/jpg") return true;
  // docx is delivered as application/zip on the wire
  if (
    detected === "application/zip" &&
    declared === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 10 MB)" },
        { status: 400 },
      );
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type}. Supported: PDF, PNG, JPG, DOCX, TXT`,
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // H-9 magic-byte sniff — reject when declared MIME doesn't match payload.
    const detectedMime = sniffMime(new Uint8Array(buffer), file.type);
    if (!detectedMime || !mimeMatches(detectedMime, file.type)) {
      return NextResponse.json(
        { error: "File contents do not match declared type" },
        { status: 400 },
      );
    }

    let extractedText = "";

    if (file.type === "text/plain") {
      extractedText = buffer.toString("utf-8");
    } else if (file.type === "application/pdf") {
      // Try pdf-parse first, fall back to Gemini vision for scanned PDFs
      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        extractedText = result.text?.trim() || "";
        await parser.destroy();
      } catch {
        // pdf-parse failed — will try Gemini vision below
      }

      if (!extractedText || extractedText.length < 50) {
        extractedText = await extractWithGeminiVision(
          buffer,
          "application/pdf",
        );
      }
    } else if (file.type.startsWith("image/")) {
      extractedText = await extractWithGeminiVision(buffer, file.type);
    } else if (file.type.includes("wordprocessingml")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value?.trim() || "";
    }

    if (!extractedText || extractedText.length < 10) {
      return NextResponse.json(
        { error: "Could not extract text from this file" },
        { status: 422 },
      );
    }

    // Truncate to ~8000 chars to leave room for user query + system prompt
    if (extractedText.length > 8000) {
      extractedText =
        extractedText.slice(0, 8000) +
        "\n\n[Document truncated — showing first 8000 characters]";
    }

    // Store file in Supabase Storage
    let fileUrl: string | null = null;
    try {
      const supabase = (await import("@/lib/supabase")).createServerClient();
      const filePath = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadErr } = await supabase.storage
        .from("chat-uploads")
        .upload(filePath, buffer, { contentType: file.type, upsert: false });
      if (!uploadErr) {
        fileUrl = filePath;
      } else {
        console.error("[upload] Storage error:", uploadErr.message);
      }
    } catch {}

    return NextResponse.json({
      text: extractedText,
      fileName: file.name,
      fileType: file.type,
      fileUrl,
      charCount: extractedText.length,
    });
  } catch (err: unknown) {
    console.error("[upload] Error:", err);
    const message =
      err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function extractWithGeminiVision(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (!GEMINI_API_KEY) return "";

  try {
    const base64 = buffer.toString("base64");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType, data: base64 } },
                {
                  text: "Extract ALL text from this document exactly as written. Preserve section numbers, dates, names, amounts, and legal terms precisely. Do not summarize or interpret — just extract the text.",
                },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 4096 },
        }),
      },
    );

    if (!res.ok) return "";
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch {
    return "";
  }
}
