import { notFound } from "next/navigation";
import { parseDocumentBilingual } from "@/lib/documents";
import { getPdfLanguagesAsync } from "@/lib/pdf-files";
import { DocumentReader } from "@/components/documents/document-reader";

// Skip static generation at build time. The /documents/* routes are
// gated by proxy.ts to /coming-soon pre-launch, so we don't need to
// pre-render any document pages. Forcing dynamic rendering avoids the
// build-time Supabase fetch that was failing on Vercel.
export const dynamic = "force-dynamic";

// generateStaticParams returns an empty array so Next.js does not try
// to enumerate all document IDs from Supabase during build.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const parsed = await parseDocumentBilingual(id);
    if (!parsed) return { title: "Document Not Found" };
    return {
      title: `${parsed.meta.title} — Labor Law Partner`,
      description: `Read ${parsed.meta.title} — ${parsed.meta.instrument_type}`,
    };
  } catch {
    return { title: "Document — Labor Law Partner" };
  }
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsed = await parseDocumentBilingual(id);

  if (!parsed) {
    notFound();
  }

  const pdfLangs = await getPdfLanguagesAsync(id);

  return (
    <DocumentReader
      meta={parsed.meta}
      sectionsEn={parsed.en?.sections ?? []}
      sectionsBn={parsed.bn?.sections ?? null}
      enTranslated={parsed.enTranslated}
      bnTranslated={parsed.bnTranslated}
      pdfLangs={pdfLangs}
    />
  );
}
