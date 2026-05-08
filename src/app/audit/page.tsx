import type { Metadata } from "next";
import { AuditContent } from "@/components/audit/audit-content";

export const metadata: Metadata = {
  title: "LLP Self-Audit — Free compliance diagnostic",
  description:
    "Answer ten questions about your establishment. Receive a diagnostic report with a compliance score, specific red flags, and a 30-day action plan. Grounded in the Labour Act.",
  openGraph: {
    title: "LLP Self-Audit — Free compliance diagnostic",
    description:
      "Answer ten questions about your establishment. Receive a diagnostic report with a compliance score, specific red flags, and a 30-day action plan. Grounded in the Labour Act.",
    type: "website",
  },
};

export default function AuditPage() {
  return <AuditContent />;
}
