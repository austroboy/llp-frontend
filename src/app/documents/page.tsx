import { getRegistry, getSupersessionChains, getTranslationFlags } from "@/lib/documents";
import { DocumentsIndex } from "@/components/documents/documents-index";

export const metadata = {
  title: "Documents — Labor Law Partner",
  description: "Browse Bangladesh Labour Law documents",
};

// Skip static generation at build time. The /documents/* routes are
// gated by proxy.ts to /coming-soon pre-launch, so build-time Supabase
// access is not needed.
export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  try {
    const documents = await getRegistry();
    const chains = await getSupersessionChains();

    const translationFlags: Record<string, { enTranslated?: boolean; bnTranslated?: boolean }> = {};
    for (const doc of documents) {
      translationFlags[doc.id] = await getTranslationFlags(doc.id);
    }

    return (
      <DocumentsIndex
        documents={documents}
        chains={chains}
        translationFlags={translationFlags}
      />
    );
  } catch {
    // Backend unreachable — render empty index. The proxy gate will
    // typically rewrite this route to /coming-soon anyway pre-launch.
    return <DocumentsIndex documents={[]} chains={{}} translationFlags={{}} />;
  }
}
