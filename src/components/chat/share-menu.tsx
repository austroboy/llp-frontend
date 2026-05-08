"use client";

import { useState, useCallback } from "react";
import { Link2, Mail, Check, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";
import { useChatStore } from "@/store/chat-store";

interface ShareTarget {
  scope: "message" | "conversation";
  conversationId: string;
  messageId?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function createShareUrl({
  scope,
  conversationId,
  messageId,
}: ShareTarget): Promise<string | null> {
  // Streaming / in-flight messages carry a client-side temp id like
  // "temp-1776669988798-ai" that is not a UUID. Downgrade to conversation
  // scope so the snapshot still captures the answer once it persists.
  const messageIsPersisted = !!messageId && UUID_RE.test(messageId);
  const effectiveScope =
    scope === "message" && !messageIsPersisted ? "conversation" : scope;
  const effectiveMessageId =
    effectiveScope === "message" ? messageId : undefined;

  const summariesById = useChatStore.getState().messageSummaries;
  const summaryOverlay: Record<string, typeof summariesById[string]> = {};
  for (const [id, s] of Object.entries(summariesById)) {
    if (UUID_RE.test(id)) summaryOverlay[id] = s;
  }

  const res = await fetch("/api/share/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: conversationId,
      scope: effectiveScope,
      message_id: effectiveMessageId,
      message_summaries: summaryOverlay,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.url as string;
}

export function CopyLinkButton({ scope, conversationId, messageId }: ShareTarget) {
  const { t } = useLanguage();
  const chatIsLoading = useChatStore((s) => s.isLoading);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    if (busy || chatIsLoading) return;
    setBusy(true);
    try {
      const url = await createShareUrl({ scope, conversationId, messageId });
      if (!url) {
        toast.error(t("share.linkFailed"));
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("share.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setBusy(false);
    }
  }, [busy, chatIsLoading, scope, conversationId, messageId, t]);

  return (
    <button
      onClick={handleClick}
      disabled={busy || chatIsLoading}
      className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
      title={copied ? t("share.linkCopied") : t("share.copyLink")}
      aria-label={t("share.copyLink")}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Link2 className="h-4 w-4" />
      )}
    </button>
  );
}

export function EmailShareButton({ scope, conversationId, messageId }: ShareTarget) {
  const { t } = useLanguage();
  const chatIsLoading = useChatStore((s) => s.isLoading);
  const [sending, setSending] = useState(false);

  const handleClick = useCallback(async () => {
    if (sending || chatIsLoading) return;
    setSending(true);
    try {
      const res = await fetch("/api/share/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          conversation_id: conversationId,
          message_id: scope === "message" ? messageId : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send email");
      }
      toast.success(t("share.emailSent") || "Email sent to your inbox");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send email";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }, [sending, chatIsLoading, scope, conversationId, messageId, t]);

  return (
    <button
      onClick={handleClick}
      disabled={sending || chatIsLoading}
      className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
      title={sending ? t("share.sending") || "Sending..." : t("share.emailToMe") || "Email to me"}
      aria-label={t("share.emailToMe") || "Email to me"}
    >
      {sending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mail className="h-4 w-4" />
      )}
    </button>
  );
}
