import type { Metadata } from "next";
import { BiographyContent } from "@/components/research/biography-content";

export const metadata: Metadata = {
  title: "Section Biography — LLP Research Lab",
  description:
    "Every statute has a history, a regulatory context, and a discipline ownership. The Section Biography tool renders all three as a living diagram.",
  openGraph: {
    title: "Section Biography — LLP Research Lab",
    description:
      "Every statute has a history, a regulatory context, and a discipline ownership. The Section Biography tool renders all three as a living diagram.",
    type: "website",
  },
};

export default function BiographyPage() {
  return <BiographyContent />;
}
