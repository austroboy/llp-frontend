"use client";

import { useState, useCallback } from "react";
import { Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostShareProps {
  url: string;
  title: string;
  className?: string;
  variant?: "vertical" | "horizontal";
}

const socialTargets = [
  {
    label: "\uD835\uDD4F",
    name: "X",
    getUrl: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    label: "f",
    name: "Facebook",
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    label: "in",
    name: "LinkedIn",
    getUrl: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    label: "wa",
    name: "WhatsApp",
    getUrl: (url: string, title: string) =>
      `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`,
  },
];

export function PostShare({
  url,
  title,
  className,
  variant = "vertical",
}: PostShareProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [url]);

  const handleSocialClick = (getUrl: (url: string, title: string) => string) => {
    window.open(getUrl(url, title), "_blank", "width=600,height=400");
  };

  return (
    <div
      className={cn(
        variant === "vertical" ? "flex flex-col gap-2" : "flex gap-2",
        className
      )}
    >
      {/* Copy link button */}
      <button
        onClick={handleCopyLink}
        title="Copy link"
        className="size-9 rounded-full border border-border hover:bg-muted flex items-center justify-center text-sm transition-colors"
      >
        {copied ? (
          <Check className="size-4 text-green-500" />
        ) : (
          <Link2 className="size-4" />
        )}
      </button>

      {/* Social share buttons */}
      {socialTargets.map((target) => (
        <button
          key={target.name}
          onClick={() => handleSocialClick(target.getUrl)}
          title={`Share on ${target.name}`}
          className="size-9 rounded-full border border-border hover:bg-muted flex items-center justify-center text-sm font-medium transition-colors"
        >
          {target.label}
        </button>
      ))}
    </div>
  );
}
