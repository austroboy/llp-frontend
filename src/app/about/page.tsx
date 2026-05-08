import type { Metadata } from "next";
import { AboutContent } from "@/components/about/about-content";

export const metadata: Metadata = {
  title: "About LLP — Labor Law Partner",
  description:
    "Labor Law Partner is a Bangladesh-based legal compliance ecosystem combining AI-powered employment law search, expert consultancy, compliance services, and structured talent sourcing.",
};

export default function AboutPage() {
  return <AboutContent />;
}
