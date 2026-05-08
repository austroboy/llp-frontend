"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <div className="shrink-0 px-4 pb-3 pt-2">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-surface border border-border rounded-xl shadow-lg shadow-black/20 focus-within:border-brand/40 focus-within:ring-1 focus-within:ring-brand/20 transition-all px-3 py-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask about Bangladesh labour law..."
            className="flex-1 bg-transparent text-sm text-foreground resize-none focus:outline-none placeholder:text-muted py-1 max-h-[120px]"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isLoading}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-brand hover:bg-brand-hover disabled:bg-border disabled:text-muted text-white transition-colors"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowUp size={16} />
            )}
          </button>
        </div>
        <p className="text-[11px] text-muted text-center mt-1.5">
          Answers sourced from Labor Law Partner documents only. Not legal advice.
        </p>
      </div>
    </div>
  );
}
