import type { Metadata } from "next";
import { ResourcesContent } from "@/components/resources/resources-content";

export const metadata: Metadata = {
  title: "Resource Centre — Labor Law Partner",
  description:
    "Download Bangladesh labour law PDFs, minimum wage gazettes, and read structured legal chapters — all in one place.",
};

export default function ResourcesPage() {
  return <ResourcesContent />;
}
