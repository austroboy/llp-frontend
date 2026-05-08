import { createServerClient } from "@/lib/supabase";

/**
 * Read document text from Supabase.
 * Returns null if not found.
 */
export async function getDocumentText(
  docId: string,
  lang: "en" | "bn"
): Promise<string | null> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("document_texts")
    .select("content")
    .eq("document_id", docId)
    .eq("language", lang)
    .single();

  if (error || !data) return null;
  return data.content;
}

/**
 * Save document text to Supabase (upsert).
 */
export async function saveDocumentText(
  docId: string,
  lang: "en" | "bn",
  content: string
): Promise<void> {
  const sb = createServerClient();
  const { error } = await sb
    .from("document_texts")
    .upsert(
      { document_id: docId, language: lang, content, updated_at: new Date().toISOString() },
      { onConflict: "document_id,language" }
    );

  if (error) throw new Error(`Failed to save ${docId}/${lang}: ${error.message}`);
}

/**
 * Get text byte size (for audit file-size checks).
 */
export async function getDocumentTextSize(
  docId: string,
  lang: "en" | "bn"
): Promise<number | null> {
  const text = await getDocumentText(docId, lang);
  if (text === null) return null;
  return new TextEncoder().encode(text).length;
}
