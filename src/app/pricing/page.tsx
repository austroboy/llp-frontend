import type { Metadata } from "next";
import { PricingContent } from "@/components/pricing/pricing-content";

export const metadata: Metadata = {
  title: "Pricing — Labor Law Partner",
  description:
    "Subscription plans for Bangladesh labour law research. Start free. Upgrade to Mini, Max, or Team when you need more.",
  openGraph: {
    title: "Pricing — Labor Law Partner",
    description:
      "Four subscription tiers — Free, Mini, Max, Team. Transparent monthly pricing in Bangladesh taka.",
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
