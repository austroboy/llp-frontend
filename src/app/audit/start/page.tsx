import type { Metadata } from "next";
import { AuditFlowContent } from "@/components/audit/audit-flow-content";

export const metadata: Metadata = {
  title: "PF Self-Audit — Start the diagnostic",
  description:
    "Ten-question Provident Fund self-audit. Compliance score 0-100, named red flags, sequenced 30-day action plan. Anonymous by default. ~4 minutes.",
};

export default function AuditStartPage() {
  return <AuditFlowContent />;
}
