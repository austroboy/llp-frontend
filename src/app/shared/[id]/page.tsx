import { createServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { SharedActions } from "@/components/shared/shared-actions";

interface SharedMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { document?: string; section?: string; text?: string }[] | null;
  created_at?: string;
}

interface SharedConversation {
  public_id: string;
  snapshot_title: string;
  snapshot_messages: SharedMessage[];
  shared_at: string;
  is_active: boolean;
  expires_at: string | null;
}

async function getSharedConversation(publicId: string): Promise<SharedConversation | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("shared_conversations")
    .select("public_id, snapshot_title, snapshot_messages, shared_at, is_active, expires_at")
    .eq("public_id", publicId)
    .eq("is_active", true)
    .single();

  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  return data as SharedConversation;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const shared = await getSharedConversation(id);

  if (!shared) {
    return { title: "Not Found — Labor Law Partner" };
  }

  const firstAiMsg = shared.snapshot_messages.find((m) => m.role === "assistant");
  const description = firstAiMsg
    ? firstAiMsg.content.slice(0, 160) + "..."
    : "Shared legal insight from Labor Law Partner";

  return {
    title: `${shared.snapshot_title} — Labor Law Partner`,
    description,
    openGraph: {
      title: shared.snapshot_title,
      description,
      siteName: "Labor Law Partner",
      type: "article",
    },
  };
}

export default async function SharedConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shared = await getSharedConversation(id);

  if (!shared) {
    notFound();
  }

  const sharedDate = new Date(shared.shared_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <Image src="/logo.png" alt="Labor Law Partner" width={32} height={32} />
            <div>
              <span className="text-lg font-bold text-foreground">Labor Law Partner</span>
              <p className="text-xs text-muted-foreground">AI-Powered Legal Research</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/sign-in"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Try LLP Chat
            </Link>
          </div>
        </div>
      </header>

      {/* Meta */}
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
        <h1 className="text-xl font-bold text-foreground">{shared.snapshot_title}</h1>
        <p className="text-sm text-muted-foreground mt-1">Shared on {sharedDate}</p>
      </div>

      {/* Messages */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
        {shared.snapshot_messages.map((msg, i) => (
          <div key={i} className="space-y-2">
            <div
              className={`text-xs font-bold uppercase ${
                msg.role === "user" ? "text-foreground" : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {msg.role === "user" ? "You" : "Labor Law Partner"}
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {msg.content}
            </div>
            {msg.citations && msg.citations.length > 0 && (
              <div className="pl-3 border-l-2 border-border space-y-0.5 mt-2">
                <div className="text-xs font-medium text-muted-foreground">References:</div>
                {msg.citations.map((c, j) => (
                  <div key={j} className="text-xs text-muted-foreground">
                    • {c.document || "Unknown"} — {c.section || "N/A"}
                  </div>
                ))}
              </div>
            )}
            {i < shared.snapshot_messages.length - 1 && (
              <hr className="border-border mt-4" />
            )}
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-4">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-200 mb-1">DISCLAIMER</p>
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            This document contains AI-generated legal information and does not constitute legal
            advice. Consult a qualified legal professional for specific guidance.
          </p>
        </div>
      </div>

      {/* Share Actions */}
      <div className="max-w-3xl mx-auto px-4 pb-6">
        <SharedActions
          title={shared.snapshot_title}
          messages={shared.snapshot_messages}
          shareUrl={`${process.env.NEXT_PUBLIC_SITE_URL || ""}/shared/${shared.public_id}`}
        />
      </div>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">Powered by Labor Law Partner</p>
        </div>
      </footer>
    </div>
  );
}
