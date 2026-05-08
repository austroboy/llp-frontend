import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title:
    "Labor Law Partner — A research lab for Bangladesh labor and compliance law",
  description:
    "Phrased like a conversation, cited like a statute. Ask a question about Bangladesh labor and compliance law and get an answer the way it is actually read in practice.",
  openGraph: {
    title:
      "Labor Law Partner — A research lab for Bangladesh labor and compliance law",
    description:
      "Phrased like a conversation, cited like a statute. Ask a question about Bangladesh labor and compliance law and get an answer the way it is actually read in practice.",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
