import type { Metadata } from "next";
import { HeadhuntingContent } from "@/components/headhunting/headhunting-content";

export const metadata: Metadata = {
  title: "LLP Headhunting — Structured Cross-Border Hiring",
  description:
    "Scout-led sourcing built on structured role architecture, AI-assisted screening, and human validation. Commission a search across Bangladesh, India, and the UAE.",
  openGraph: {
    title: "LLP Headhunting — Structured Cross-Border Hiring",
    description:
      "Scout-led sourcing built on structured role architecture, AI-assisted screening, and human validation. Commission a search across Bangladesh, India, and the UAE.",
    type: "website",
  },
};

export default function HeadhuntingPage() {
  return <HeadhuntingContent />;
}
