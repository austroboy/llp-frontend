import { Metadata } from "next";
import { PublicProfileContent } from "@/components/profiles/public-profile-content";

export const metadata: Metadata = {
  title: "Profile | Labor Law Partner",
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicProfileContent slug={slug} />;
}
