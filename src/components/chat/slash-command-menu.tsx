"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { ZapIcon, RefreshCwIcon, LanguagesIcon, SearchCheckIcon, BookOpenIcon, SparklesIcon } from "lucide-react";

export interface SlashCommand {
  id: string;
  label: string;
  hint?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  // Either insert a prompt template or run an imperative action.
  template?: string;
  action?: (ctx: SlashCommandContext) => void;
}

export interface SlashCommandContext {
  onReset: () => void;
  setLanguage: (lang: "en" | "bn") => void;
  lastAiContent: string | null;
  sendMessage: (content: string) => void;
  close: () => void;
  clear: () => void;
}

export const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "reset",
    label: "/reset",
    hint: "new chat",
    description: "Start a fresh conversation",
    icon: RefreshCwIcon,
    action: ({ onReset, clear, close }) => {
      onReset();
      clear();
      close();
    },
  },
  {
    id: "en",
    label: "/en",
    hint: "English",
    description: "Switch response language to English",
    icon: LanguagesIcon,
    action: ({ setLanguage, clear, close }) => {
      setLanguage("en");
      clear();
      close();
    },
  },
  {
    id: "bn",
    label: "/bn",
    hint: "Bengali",
    description: "উত্তর ভাষা বাংলায় সেট করুন",
    icon: LanguagesIcon,
    action: ({ setLanguage, clear, close }) => {
      setLanguage("bn");
      clear();
      close();
    },
  },
  {
    id: "summarize",
    label: "/summarize",
    hint: "this conversation",
    description: "Ask for a concise summary of the conversation so far",
    icon: BookOpenIcon,
    template: "Summarize the key points of our conversation so far in 5 bullets.",
  },
  {
    id: "explain",
    label: "/explain",
    hint: "simpler terms",
    description: "Ask the model to re-explain the last answer in plain language",
    icon: SparklesIcon,
    template: "Explain your previous answer in plain, non-legal language a new employee could understand.",
  },
  {
    id: "cite",
    label: "/cite",
    hint: "full references",
    description: "Ask the model to list full citations for the last answer",
    icon: SearchCheckIcon,
    template: "List every citation from your previous answer with section number, document name, and exact quoted text.",
  },
  {
    id: "verify",
    label: "/verify",
    hint: "last answer",
    description: "Ask the model to self-verify the last answer against sources",
    icon: ZapIcon,
    template: "Re-check your previous answer against the cited sources. Flag anything that is not directly supported.",
  },
];

interface SlashCommandMenuProps {
  query: string;
  open: boolean;
  activeIndex: number;
  onSelect: (cmd: SlashCommand) => void;
  onHoverIndex: (idx: number) => void;
  commands?: SlashCommand[];
}

export function filterSlashCommands(q: string, commands: SlashCommand[] = DEFAULT_SLASH_COMMANDS): SlashCommand[] {
  const needle = q.replace(/^\//, "").toLowerCase().trim();
  if (!needle) return commands;
  return commands.filter((c) => {
    const label = c.label.replace(/^\//, "").toLowerCase();
    return label.startsWith(needle) || label.includes(needle);
  });
}

export function SlashCommandMenu({ query, open, activeIndex, onSelect, onHoverIndex, commands = DEFAULT_SLASH_COMMANDS }: SlashCommandMenuProps) {
  const filtered = useMemo(() => filterSlashCommands(query, commands), [query, commands]);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open || filtered.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Slash commands"
      className="slash-menu absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg z-20"
    >
      <style>{`
        /* Origin-aware popover — scales from the trigger (bottom = input),
           not from center. Emil: popovers should scale from their anchor. */
        .slash-menu {
          transform-origin: bottom left;
          animation: slashMenuIn 160ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }
        @keyframes slashMenuIn {
          from { opacity: 0; transform: scale(0.96) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .slash-menu { animation: none; }
        }
      `}</style>
      {filtered.map((cmd, idx) => {
        const Icon = cmd.icon ?? ZapIcon;
        const active = idx === activeIndex;
        return (
          <button
            key={cmd.id}
            ref={active ? activeRef : undefined}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(cmd)}
            onMouseEnter={() => onHoverIndex(idx)}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
              active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
            )}
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-mono text-xs font-medium">{cmd.label}</span>
            {cmd.hint && (
              <span className="text-[11px] text-muted-foreground">{cmd.hint}</span>
            )}
            {cmd.description && (
              <span className="ml-auto text-[11px] text-muted-foreground/80 truncate max-w-[50%]">
                {cmd.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
