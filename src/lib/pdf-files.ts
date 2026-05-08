/**
 * Shared PDF file mapping: doc ID → { en?, bn? } paths relative to docs/pdf/
 * Used by the PDF API route and the audit system.
 */
export const PDF_FILES: Record<string, { en?: string; bn?: string }> = {
  "DOC-001": {
    en: "english/Bangladesh Labour Act, 2006 (Official English Text).pdf",
    // No BN PDF — gazette is English; BN text is AI-translated
  },
  "DOC-002": {
    bn: "bangla/Bangladesh Labour (Amendment) Act, 2009 (Official Bangla Text).pdf",
  },
  "DOC-003": {
    bn: "bangla/Bangladesh Labour (Amendment) Act, 2010 (Official Bangla Text).pdf",
  },
  "DOC-004": {
    en: "english/Bangladesh Labour (Amendment) Act, 2013 (English Translation).pdf",
    bn: "bangla/DOC-004_Labour-Amendment-2013_Bangla_DPP-Gazette.pdf",
  },
  "DOC-005": {
    bn: "bangla/DOC-005_Labour-Amendment-2018_Bangla_Gazette.pdf",
  },
  "DOC-006": {
    bn: "bangla/DOC-006_Labour-Amendment-Ordinance-2025_Bangla_DPP-Gazette.pdf",
  },
  "DOC-007": {
    en: "english/Bangladesh Labour Rules, 2015 (Official English Text).pdf",
    bn: "bangla/DOC-007_Labour-Rules-2015_Bangla_DPP-Gazette.pdf",
  },
  "DOC-008": {
    bn: "bangla/DOC-008_Labour-Rules-Amendment-2022_Bangla_MCCI.pdf",
  },
};

/** Returns which PDF languages are available for a given doc ID (filesystem only). */
export function getPdfLanguages(docId: string): { en: boolean; bn: boolean } {
  const mapping = PDF_FILES[docId.toUpperCase()];
  if (!mapping) return { en: false, bn: false };
  return { en: !!mapping.en, bn: !!mapping.bn };
}

/**
 * Returns a PDF as a Buffer — tries filesystem first (legacy docs),
 * then falls back to Supabase Storage bucket `document-pdfs`.
 */
export async function getPdfBuffer(
  docId: string,
  lang: "en" | "bn"
): Promise<Buffer | null> {
  const fs = await import("fs");
  const path = await import("path");

  const id = docId.toUpperCase();
  const mapping = PDF_FILES[id];

  // 1. Try filesystem (legacy docs)
  if (mapping) {
    const relativePath = lang === "bn" ? mapping.bn : mapping.en;
    if (relativePath) {
      const pdfDir = path.join(process.cwd(), "docs", "pdf");
      const filePath = path.join(pdfDir, relativePath);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
    }
  }

  // 2. Try Supabase Storage (new docs)
  const { createServerClient } = await import("@/lib/supabase");
  const supabase = createServerClient();
  const storagePath = `${id}/${lang}.pdf`;

  const { data, error } = await supabase.storage
    .from("document-pdfs")
    .download(storagePath);

  if (error || !data) return null;

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Checks both filesystem AND Supabase Storage for available PDF languages.
 * Use this for new documents that may only exist in Supabase Storage.
 */
export async function getPdfLanguagesAsync(
  docId: string
): Promise<{ en: boolean; bn: boolean }> {
  const id = docId.toUpperCase();

  // Start with filesystem results
  const fsResult = getPdfLanguages(id);

  // If both languages already available on filesystem, no need to check storage
  if (fsResult.en && fsResult.bn) return fsResult;

  // Check Supabase Storage for missing languages
  const { createServerClient } = await import("@/lib/supabase");
  const supabase = createServerClient();

  const checks: Promise<void>[] = [];

  if (!fsResult.en) {
    checks.push(
      supabase.storage
        .from("document-pdfs")
        .download(`${id}/en.pdf`)
        .then(({ data }) => {
          if (data) fsResult.en = true;
        })
    );
  }

  if (!fsResult.bn) {
    checks.push(
      supabase.storage
        .from("document-pdfs")
        .download(`${id}/bn.pdf`)
        .then(({ data }) => {
          if (data) fsResult.bn = true;
        })
    );
  }

  await Promise.all(checks);
  return fsResult;
}
