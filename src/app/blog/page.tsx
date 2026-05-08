import type { Metadata } from "next";
import { BlogContent } from "@/components/blog/blog-content";

export const metadata: Metadata = {
  title: "LLP Blog — Expert Insights on Bangladesh Labour Law",
  description:
    "Official LLP guidance and peer-reviewed community contributions on compliance, HR policy, and workplace law in Bangladesh.",
  openGraph: {
    title: "LLP Blog — Expert Insights on Bangladesh Labour Law",
    description:
      "A dual-stream publication: official guidance from LLP and verified contributions from compliance professionals.",
    type: "website",
  },
};

export default function BlogPage() {
  return <BlogContent />;
}
