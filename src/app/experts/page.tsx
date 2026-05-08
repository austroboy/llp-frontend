import type { Metadata } from "next";
import { ExpertsContent } from "@/components/experts/experts-content";

export const metadata: Metadata = {
  title: "Expert Consultancy — Labor Law Partner",
  description:
    "Connect with verified Bangladesh labour law experts, HR specialists, and legal advisors. Get practical guidance grounded in evidence and documentation.",
  openGraph: {
    title: "Expert Consultancy — Labor Law Partner",
    description:
      "Browse assessed labour law practitioners. Book sessions with verified experts for PF, compliance, disciplinary, and policy guidance.",
    type: "website",
  },
};

export default function ExpertsPage() {
  return <ExpertsContent />;
}
