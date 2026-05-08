import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { ChapterReader } from "@/components/resources/chapter-reader";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerClient();
  const { data } = await supabase
    .from("resource_chapters")
    .select("title, parent_law, chapter_number")
    .eq("id", parseInt(id))
    .single();

  if (!data) return { title: "Chapter Not Found" };

  const lawName =
    data.parent_law === "act"
      ? "Bangladesh Labour Act, 2006"
      : "Bangladesh Labour Rules, 2015";

  return {
    title: `Chapter ${data.chapter_number}: ${data.title} — ${lawName}`,
    description: `Read Chapter ${data.chapter_number} (${data.title}) of the ${lawName} online.`,
  };
}

export default async function ChapterPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("resource_chapters")
    .select("*")
    .eq("id", parseInt(id))
    .single();

  if (error || !data) notFound();

  return <ChapterReader chapter={data} />;
}
