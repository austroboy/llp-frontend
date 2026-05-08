import { notFound } from "next/navigation";
import { getRegistry, parseDocumentBilingual } from "@/lib/documents";
import { getPdfLanguagesAsync } from "@/lib/pdf-files";
import { DocumentReader } from "@/components/documents/document-reader";

export async function generateStaticParams() {
  const docs = await getRegistry();
  return docs.map((d) => ({ id: d.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsed = await parseDocumentBilingual(id);
  if (!parsed) return { title: "Document Not Found" };
  return {
    title: `${parsed.meta.title} — Labor Law Partner`,
    description: `Read ${parsed.meta.title} — ${parsed.meta.instrument_type}`,
  };
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
