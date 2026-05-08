import type { Metadata } from "next";
import { PathAssemblyContent } from "@/components/academy/path-assembly-content";

export const metadata: Metadata = {
  title: "Assembling your Path — LLP Academy",
  description:
    "Composing your first session: reading your Twin, selecting methodology, curating Industry Context, assembling your Applicability Decision Tree.",
};

export default function PathAssemblingPage() {
  return <PathAssemblyContent />;
}
