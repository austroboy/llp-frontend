import { getRegistry, getSupersessionChains, getTranslationFlags } from "@/lib/documents";
import { DocumentsIndex } from "@/components/documents/documents-index";

export const metadata = {
  title: "Documents — Labor Law Partner",
  description: "Browse Bangladesh Labour Law documents",
};

export default async function DocumentsPage() {
  const documents = await getRegistry();
  const chains = await getSupersessionChains();

  // Build translation flags map for all documents
  const translationFlags: Record<string, { enTranslated?: boolean; bnTranslated?: boolean }> = {};
  for (const doc of documents) {
    translationFlags[doc.id] = await getTranslationFlags(doc.id);
  }

  return <DocumentsIndex documents={documents} chains={chains} translationFlags={translationFlags} />;
}
