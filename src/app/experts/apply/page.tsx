import type { Metadata } from "next";
import { ExpertApplicationContent } from "@/components/experts/expert-application-content";
import { OrgGuard } from "@/components/shared/org-guard";

export const metadata: Metadata = {
  title: "Become an LLP Expert — Application Form",
  description:
    "Apply to join the LLP marketplace of verified labour law and compliance experts. Auto-save enabled, review in 3-5 days.",
};

export default function ExpertApplicationPage() {
  return (
    <OrgGuard redirectTo="/experts">
      <ExpertApplicationContent />
    </OrgGuard>
  );
}
