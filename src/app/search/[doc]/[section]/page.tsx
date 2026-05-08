import { notFound } from "next/navigation";
import { parseDocumentBilingual, findSectionById } from "@/lib/documents";
import { SearchResultContent } from "@/components/search/search-result-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string; section: string }>;
}) {
  const { doc, section } = await params;
  const parsed = await parseDocumentBilingual(doc);
  if (!parsed) return { title: "Section Not Found — LLP Free Search" };

  const enResult = parsed.en ? findSectionById(parsed.en.sections, section) : null;
  const title = enResult?.section.title || section;

  return {
    title: `${title} — ${parsed.meta.title} — LLP Free Search`,
    description: `Read ${title} from ${parsed.meta.title}`,
  };
}

export default async function SearchResultPage({
  params,
}: {
  params: Promise<{ doc: string; section: string }>;
}) {
  const { doc, section } = await params;
  const parsed = await parseDocumentBilingual(doc);

  if (!parsed) notFound();

  const enResult = parsed.en ? findSectionById(parsed.en.sections, section) : null;
  const bnResult = parsed.bn ? findSectionById(parsed.bn.sections, section) : null;

  // Try to find the section in either language
  const result = enResult || bnResult;
  if (!result) notFound();

  return (
    <SearchResultContent
      docId={doc}
      docTitle={parsed.meta.title}
      docType={parsed.meta.instrument_type}
      chapter={result.chapter}
      sectionId={result.section.id}
      sectionTitle={result.section.title}
      sectionContent={enResult?.section.content || result.section.content}
      sectionTitleBn={bnResult?.section.title || null}
      sectionContentBn={bnResult?.section.content || null}
      prev={result.prev}
      next={result.next}
    />
  );
}
