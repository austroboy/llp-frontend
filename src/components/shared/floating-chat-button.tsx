"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";

export function FloatingChatButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50">
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex items-center justify-center size-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        aria-label="Support"
      >
        <MessageCircle className="size-5" />
        {hovered && (
          <span className="absolute right-full mr-2 whitespace-nowrap rounded-lg bg-card border border-border px-3 py-1.5 text-xs font-medium text-foreground shadow-md">
            Coming Soon
          </span>
        )}
      </button>
    </div>
  );
}
