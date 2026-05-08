import type { Metadata } from "next";
import { ContactContent } from "@/components/contact/contact-content";

export const metadata: Metadata = {
  title: "Contact — Labor Law Partner",
  description:
    "Get in touch with Labor Law Partner. Reach us by email for questions about our platform, services, partnerships, or general enquiries.",
};

export default function ContactPage() {
  return <ContactContent />;
}
