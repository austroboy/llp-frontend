import { Metadata } from "next";
import { PrivacyContent } from "./_privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy — Labor Law Partner",
  description: "Privacy Policy for the Labor Law Partner platform.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
