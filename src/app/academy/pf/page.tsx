import type { Metadata } from "next";
import { PathTopicContent } from "@/components/academy/path-topic-content";

export const metadata: Metadata = {
  title: "Provident Fund — LLP Academy Path",
  description:
    "Become the person at your factory who actually knows PF. Five sessions, twenty-five minutes each. Cited, human-reviewed, yours forever. ৳990 founding price.",
  openGraph: {
    title: "Provident Fund — LLP Academy Path",
    description:
      "Five sessions, twenty-five minutes each. Cited, human-reviewed, yours forever. Session 1 free.",
    type: "website",
  },
};

export default function PathPFPage() {
  return <PathTopicContent />;
}
