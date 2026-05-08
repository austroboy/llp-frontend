import type { Metadata } from "next";
import { AcademyContent } from "@/components/academy/academy-content";

export const metadata: Metadata = {
  title: "LLP Academy — Compliance Training That Delivers Work Tools",
  description:
    "Live bootcamps, corporate workshops, and open programs on Bangladesh labour law. Practical templates, SOPs, checklists, and trackers included.",
  openGraph: {
    title: "LLP Academy — Compliance Training That Delivers Work Tools",
    description:
      "Learn it. Use it tomorrow. Practical compliance training for HR professionals, employers, and legal teams.",
    type: "website",
  },
};

export default function AcademyPage() {
  return <AcademyContent />;
}
