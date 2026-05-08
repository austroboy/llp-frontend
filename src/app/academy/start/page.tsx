import type { Metadata } from "next";
import { PathIntakeContent } from "@/components/academy/path-intake-content";

export const metadata: Metadata = {
  title: "Start your Path — LLP Academy",
  description:
    "Four-question intake. Shapes your methodology and personalizes every session — name, company, sector, current PF position. ~60 seconds.",
};

export default function PathStartPage() {
  return <PathIntakeContent />;
}
