import { Metadata } from "next";
import { TermsContent } from "./_terms-content";

export const metadata: Metadata = {
  title: "Terms of Service — Labor Law Partner",
  description: "Terms of Service for the Labor Law Partner platform.",
};

export default function TermsPage() {
  return <TermsContent />;
}
