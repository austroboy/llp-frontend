/**
 * Shared Mistral OCR module.
 *
 * Extracts text from a PDF buffer using the Mistral OCR API.
 * Processes pages in batches of 50, handles 422 (page-out-of-range)
 * gracefully, and reports progress via a callback.
 */

import type { TokenTracker } from "./token-tracker";

// ── Types ────────────────────────────────────────────────────────────

export interface OcrProgress {
  type: "progress" | "result" | "error";
  message?: string;
  step?: number;
  total?: number;
  /** Final extracted text (only on type === "result") */
  text?: string;
  /** Number of pages successfully extracted */
  pageCount?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getMistralApiKey(): string {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) {
    throw new Error("MISTRAL_API_KEY not configured");
  }
  return key;
}

// ── Core OCR function ────────────────────────────────────────────────

/**
 * Run Mistral OCR on a PDF buffer.
 *
 * @param pdfBuffer  - The raw PDF bytes (caller is responsible for reading from disk / network / etc.)
 * @param onProgress - Callback invoked for each batch and on completion / error
 * @param options.tracker   - Optional TokenTracker to accumulate OCR page costs
 * @param options.fileName  - Optional filename hint for the Mistral file upload (defaults to "document.pdf")
 * @returns The full extracted text with `<!-- PAGE X -->` markers
 */
export async function runMistralOcr(
  pdfBuffer: Buffer,
  onProgress: (event: OcrProgress) => void,
  options?: {
    tracker?: TokenTracker;
    fileName?: string;
  }
): Promise<string> {
  const MISTRAL_API_KEY = getMistralApiKey();
  const tracker = options?.tracker;
  const fileName = options?.fileName ?? "document.pdf";

  // ── 1. Upload PDF to Mistral ────────────────────────────────────────

  onProgress({ type: "progress", message: "Uploading PDF to Mistral..." });

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
  formData.append("file", blob, fileName);
  formData.append("purpose", "ocr");

  let fileId: string;
  try {
    const uploadRes = await fetch("https://api.mistral.ai/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${MISTRAL_API_KEY}` },
      body: formData,
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(
        `Upload failed ${uploadRes.status}: ${errText.slice(0, 200)}`
      );
    }
    const uploadData = await uploadRes.json();
    fileId = uploadData.id;
  } catch (err) {
    const msg = `PDF upload failed: ${err instanceof Error ? err.message : "Unknown error"}`;
    onProgress({ type: "error", message: msg });
    throw new Error(msg);
  }

  // ── 2. Estimate pages & batch ───────────────────────────────────────

  // PDFs range from 5 KB/page (text-heavy) to 100 KB/page (scanned).
  // Use conservative 5 KB/page so we never under-count, capped at 500.
  const pdfSizeKB = pdfBuffer.length / 1024;
  const estimatedPages = Math.min(
    500,
    Math.max(10, Math.ceil(pdfSizeKB / 5))
  );
  const BATCH_SIZE = 50;
  const totalBatches = Math.ceil(estimatedPages / BATCH_SIZE);

  onProgress({
    type: "progress",
    message: `OCR'ing ~${estimatedPages} pages in ${totalBatches} batch(es)...`,
  });

  // ── 3. Process in batches ───────────────────────────────────────────

  const allPages: { index: number; text: string }[] = [];

  for (let batch = 0; batch < totalBatches; batch++) {
    const startPage = batch * BATCH_SIZE;
    const endPage = Math.min(startPage + BATCH_SIZE, estimatedPages);
    const pages = Array.from(
      { length: endPage - startPage },
      (_, i) => startPage + i
    );

    onProgress({
      type: "progress",
      message: `OCR batch ${batch + 1}/${totalBatches} (pages ${startPage + 1}-${endPage})...`,
      step: batch + 1,
      total: totalBatches,
    });

    try {
      const ocrRes = await fetch("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-ocr-latest",
          document: { type: "file", file_id: fileId },
          pages,
        }),
      });

      if (!ocrRes.ok) {
        const errText = await ocrRes.text();
        // 422 = page-out-of-range → we've hit the actual end of the PDF
        if (ocrRes.status === 422 || errText.includes("page")) break;
        throw new Error(
          `OCR error ${ocrRes.status}: ${errText.slice(0, 200)}`
        );
      }

      const ocrData = await ocrRes.json();
      const pageResults = (ocrData.pages || []).sort(
        (a: { index: number }, b: { index: number }) => a.index - b.index
      );

      if (pageResults.length === 0 && batch > 0) break; // no more pages

      // Track OCR pages for cost accounting
      if (tracker && pageResults.length > 0) {
        tracker.add("mistral-ocr-latest", 0, 0, pageResults.length);
      }

      for (const p of pageResults) {
        const text = (p as { markdown?: string }).markdown || "";
        if (text.trim()) {
          allPages.push({ index: p.index, text: text.trim() });
        }
      }

      onProgress({
        type: "progress",
        message: `Batch ${batch + 1} done — ${allPages.length} pages so far`,
      });
    } catch (err) {
      onProgress({
        type: "progress",
        message: `Batch ${batch + 1} failed: ${err instanceof Error ? err.message : "error"}, continuing...`,
      });
    }

    if (batch < totalBatches - 1) await sleep(1000);
  }

  // ── 4. Return result ────────────────────────────────────────────────

  if (allPages.length === 0) {
    const msg = "OCR produced no text.";
    onProgress({ type: "error", message: msg });
    throw new Error(msg);
  }

  // Build structured output with page markers
  const structuredLines: string[] = [];
  for (const page of allPages) {
    structuredLines.push(`<!-- PAGE ${page.index + 1} -->`);
    structuredLines.push("");
    structuredLines.push(page.text);
    structuredLines.push("");
  }
  const fullText = structuredLines.join("\n");

  onProgress({
    type: "result",
    message: `OCR complete: ${fullText.length} chars from ${allPages.length} pages.`,
    text: fullText,
    pageCount: allPages.length,
  });

  return fullText;
}
