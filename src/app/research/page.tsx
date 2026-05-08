import type { Metadata } from "next";
import { ResearchContent } from "@/components/research/research-content";

export const metadata: Metadata = {
  title: "LLP Research Lab — Two tools for understanding the law",
  description:
    "Section Biography and Situation Map: read any Bangladesh labor section in full amendment context, or map a real situation across labor, tax, OSH, and governance.",
  openGraph: {
    title: "LLP Research Lab — Two tools for understanding the law",
    description:
      "Section Biography and Situation Map: read any Bangladesh labor section in full amendment context, or map a real situation across labor, tax, OSH, and governance.",
    type: "website",
  },
};

export default function ResearchPage() {
  return <ResearchContent />;
}
