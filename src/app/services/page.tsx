import { Suspense } from "react";
import type { Metadata } from "next";
import { ServicesContent } from "@/components/services/services-content";

export const metadata: Metadata = {
  title: "LLP Services Desk — Compliance Support Delivered by LLP",
  description:
    "Compliance support scoped clearly, executed reliably, and delivered with quality checkpoints. QuickCheck diagnostics, PF/Gratuity setup, HR documentation packs, and more.",
  openGraph: {
    title: "LLP Services Desk — Compliance Support Delivered by LLP",
    description:
      "From request to handover pack. Structured compliance services for Bangladesh labour law.",
    type: "website",
  },
};

export default function ServicesPage() {
  return (
    <Suspense>
      <ServicesContent />
    </Suspense>
  );
}
