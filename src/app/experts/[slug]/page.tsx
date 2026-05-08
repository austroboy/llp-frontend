import { ExpertProfileContent } from "@/components/experts/expert-profile-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Expert Profile — LLP Marketplace",
};

export default async function ExpertProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ExpertProfileContent slug={slug} />;
}
