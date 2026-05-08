import { ExpertCompareContent } from "@/components/experts/expert-compare-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Experts — LLP Marketplace",
};

export default function ExpertComparePage() {
  return <ExpertCompareContent />;
}
