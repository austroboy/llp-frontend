import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SessionPlayerContent } from "@/components/academy/session-player-content";

const VALID_IDS = new Set([1, 2, 3, 4, 5]);

export const metadata: Metadata = {
  title: "Session player — LLP Academy",
  description:
    "Five-block session in the LLP Path methodology — industry context, first principle, two realities, scenario, apply, asset.",
};

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!VALID_IDS.has(sessionId)) notFound();
  return <SessionPlayerContent sessionId={sessionId} />;
}
