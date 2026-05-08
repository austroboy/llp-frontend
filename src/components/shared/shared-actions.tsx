"use client";

import { useState } from "react";
import {
  FileDown,
  Mail,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SharedMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { document?: string; section?: string; text?: string }[] | null;
}

interface SharedActionsProps {
  title: string;
  messages: SharedMessage[];
  shareUrl: string;
}

const socialTargets = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "wa",
    getUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: "f",
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: "twitter",
    label: "X",
    icon: "\uD835\uDD4F",
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: "tg",
    getUrl: (url: string, text: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
];

export function SharedActions({ title, messages, shareUrl }: SharedActionsProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { generateChatPdf } = await import("@/components/chat/chat-pdf");
      const pdfMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
        citations: m.citations,
      }));
      const blob = await generateChatPdf({
        title,
        messages: pdfMessages,
        date: new Date(),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
      a.href = url;
      a.download = `LLP-Universe-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Labor Law Partner: ${title}`);
    const body = encodeURIComponent(`Check out this legal insight from Labor Law Partner:\n\n${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleSocial = (getUrl: (url: string, text: string) => string) => {
    const text = `Check out this legal insight: ${title}`;
    window.open(getUrl(shareUrl, text), "_blank", "width=600,height=400");
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 w-full"
        onClick={handleDownloadPdf}
        disabled={isGeneratingPdf}
      >
        {isGeneratingPdf ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <FileDown className="size-3.5" />
        )}
        {isGeneratingPdf ? "..." : "PDF"}
      </Button>

      <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={handleEmail}>
        <Mail className="size-3.5" />
        Email
      </Button>

      {socialTargets.map((target) => (
        <Button
          key={target.key}
          variant="outline"
          size="sm"
          className="gap-1.5 w-full"
          onClick={() => handleSocial(target.getUrl)}
        >
          <span className="text-xs font-bold">{target.icon}</span>
          {target.label}
        </Button>
      ))}
    </div>
  );
}
