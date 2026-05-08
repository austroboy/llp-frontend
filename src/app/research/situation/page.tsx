import type { Metadata } from "next";
import { SituationContent } from "@/components/research/situation-content";

export const metadata: Metadata = {
  title: "Situation Map — LLP Research Lab",
  description:
    "Describe a real situation. The Situation Map shows how labor, tax, OSH, and governance laws apply together — primary sections, related sections, and the authorities involved.",
  openGraph: {
    title: "Situation Map — LLP Research Lab",
    description:
      "Describe a real situation. The Situation Map shows how labor, tax, OSH, and governance laws apply together — primary sections, related sections, and the authorities involved.",
    type: "website",
  },
};

export default function SituationPage() {
  return <SituationContent />;
}
