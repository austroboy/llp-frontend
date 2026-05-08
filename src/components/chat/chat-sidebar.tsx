"use client";

import { useEffect, useCallback, useMemo } from "react";
import {
  MoreHorizontalIcon,
  Share2Icon,
  PencilIcon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  Trash2Icon,
  PlusIcon,
} from "lucide-react";
import { useChatStore, type Conversation } from "@/store/chat-store";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";
import { JumpBackInCard } from "./jump-back-in-card";
import { StatusDots } from "./status-dots";

/** Group conversations into Today / This Week / Earlier */
function groupConversations(conversations: Conversation[]): { label: string; items: Conversation[]; section: string }[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const today: Conversation[] = [];
  const thisWeek: Conversation[] = [];
  const earlier: Conversation[] = [];

  for (const conv of conversations) {
    const date = new Date(conv.updated_at || conv.created_at);
    if (date >= todayStart) today.push(conv);
    else if (date >= weekStart) thisWeek.push(conv);
    else earlier.push(conv);
  }

  const groups: { label: string; items: Conversation[]; section: string }[] = [];
  if (today.length > 0) groups.push({ label: "Today", section: "§ I", items: today });
  if (thisWeek.length > 0) groups.push({ label: "This Week", section: "§ II", items: thisWeek });
  if (earlier.length > 0) groups.push({ label: "Earlier", section: "§ III", items: earlier });
  return groups;
}

function GroupMarker({ section, label }: { section: string; label: string }) {
  return (
    <div className="sb-marker flex items-center gap-2.5 px-1 pt-4 pb-2 text-[10px] uppercase tracking-[0.28em]">
      <span className="sb-section">{section}</span>
      <span className="sb-marker-label">{label}</span>
      <span className="h-px flex-1 bg-[var(--sb-rule)]" />
    </div>
  );
}

function ConversationItem({
  conv,
  isActive,
  onSelect,
  onShare,
  onRename,
  onArchive,
  onUnarchive,
  onDelete,
  isArchived,
}: {
  conv: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onShare: () => void;
  onRename: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete: () => void;
  isArchived: boolean;
}) {
  return (
    <div
      className={cn(
        "sb-item group/item relative flex items-center",
        isActive && "sb-item--active",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="sb-item-btn flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-1.5 pr-9 text-left transition-colors"
      >
        <span
          aria-hidden
          className={cn(
            "sb-item-marker shrink-0 text-[10px]",
            isActive ? "text-[color:var(--sb-rust)]" : "text-[color:var(--sb-ink-faint)]",
          )}
        >
          ·
        </span>
        <span className="sb-item-title truncate min-w-0 text-[13px] leading-snug">
          {conv.title}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More"
            className="sb-item-more absolute right-1.5 inline-flex size-6 items-center justify-center rounded-md opacity-0 transition-opacity group-hover/item:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontalIcon className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" side="right" align="start">
          <DropdownMenuItem onClick={onShare}>
            <Share2Icon className="size-4 text-muted-foreground" />
            <span>Share</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRename}>
            <PencilIcon className="size-4 text-muted-foreground" />
            <span>Rename</span>
          </DropdownMenuItem>
          {isArchived ? (
            <DropdownMenuItem onClick={onUnarchive}>
              <ArchiveRestoreIcon className="size-4 text-muted-foreground" />
              <span>Unarchive</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onArchive}>
              <ArchiveIcon className="size-4 text-muted-foreground" />
              <span>Archive</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2Icon className="size-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ChatSidebar() {
  const {
    conversations,
    selectedConversationId,
    conversationsLoaded,
    loadConversations,
    selectConversation,
    startNewChat,
    renameConversation,
    archiveConversation,
    unarchiveConversation,
    deleteConversation,
  } = useChatStore();
  const { t } = useLanguage();

  const handleShareConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: convId, scope: "conversation" }),
      });
      if (!res.ok) throw new Error("Failed to create share link");
      const data = await res.json();
      await navigator.clipboard.writeText(data.url);
      toast.success(t("share.linkCopied"));
    } catch {
      toast.error(t("share.linkFailed"));
    }
  }, [t]);

  useEffect(() => {
    if (!conversationsLoaded) loadConversations();
  }, [conversationsLoaded, loadConversations]);

  const recentConversations = useMemo(
    () => conversations.filter((c) => !c.is_archived && c.title !== "New Conversation"),
    [conversations]
  );
  const archivedConversations = useMemo(
    () => conversations.filter((c) => c.is_archived),
    [conversations]
  );

  const groups = useMemo(() => groupConversations(recentConversations), [recentConversations]);

  return (
    <div className="codex-sidebar flex h-full w-full flex-col">
      {/* Masthead */}
      <div className="sb-masthead flex items-center gap-1.5 px-3 pt-3 pb-2.5">
        <button
          type="button"
          onClick={startNewChat}
          className="sb-new group/new flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <span className="sb-new-plus inline-flex size-5 items-center justify-center rounded-full">
            <PlusIcon className="size-3.5" />
          </span>
          <span
            className="text-[15px]"
            style={{
              fontFamily: "var(--lf-display)",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
            }}
          >
            New Inquiry
          </span>
        </button>

        {recentConversations.length > 0 && (
          <button
            type="button"
            title="Clear all history"
            onClick={() => {
              if (window.confirm("Delete all chat history? This cannot be undone.")) {
                for (const conv of [...recentConversations, ...archivedConversations]) {
                  deleteConversation(conv.id);
                }
                startNewChat();
              }
            }}
            className="sb-clear inline-flex size-7 items-center justify-center rounded-full text-[color:var(--sb-ink-faint)] transition-colors hover:text-[color:var(--sb-rust)]"
          >
            <Trash2Icon className="size-3.5" />
          </button>
        )}
      </div>

      {/* Rule */}
      <div className="mx-3 h-px bg-[var(--sb-rule)]" />

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-2 pt-1 pb-3">
          {groups.map((group) => (
            <div key={group.label} className="space-y-[2px]">
              <GroupMarker section={group.section} label={group.label} />
              {group.items.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={selectedConversationId === conv.id}
                  isArchived={false}
                  onSelect={() => selectConversation(conv.id)}
                  onShare={() => handleShareConversation(conv.id)}
                  onRename={() => {
                    const newTitle = window.prompt("Rename conversation", conv.title);
                    if (newTitle?.trim()) renameConversation(conv.id, newTitle.trim());
                  }}
                  onArchive={() => archiveConversation(conv.id)}
                  onDelete={() => deleteConversation(conv.id)}
                />
              ))}
            </div>
          ))}

          {recentConversations.length === 0 && (
            <div className="px-4 pt-6">
              <p className="sb-empty text-[12.5px] leading-relaxed">
                <span className="text-[color:var(--sb-rust)]">&sect;</span>{" "}
                <span>No inquiries on file yet.</span>
                <br />
                <span className="text-[color:var(--sb-ink-muted)]">
                  Begin one to start your ledger.
                </span>
              </p>
            </div>
          )}

          {archivedConversations.length > 0 && (
            <div className="space-y-[2px]">
              <GroupMarker section="§ —" label="Archive" />
              {archivedConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={selectedConversationId === conv.id}
                  isArchived={true}
                  onSelect={() => selectConversation(conv.id)}
                  onShare={() => handleShareConversation(conv.id)}
                  onRename={() => {
                    const newTitle = window.prompt("Rename conversation", conv.title);
                    if (newTitle?.trim()) renameConversation(conv.id, newTitle.trim());
                  }}
                  onUnarchive={() => unarchiveConversation(conv.id)}
                  onDelete={() => deleteConversation(conv.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="sb-footer px-3 pt-3 pb-3 space-y-2">
        <JumpBackInCard />
        <StatusDots />
      </div>

      <style>{sidebarStyles}</style>
    </div>
  );
}

const sidebarStyles = `
  /* lf-* glass sidebar — sits in the page gutter, blurs the canvas.
     Bridges legacy sb-* token names to lf-* so inline var(--sb-*)
     references in the JSX keep working. */
  .codex-sidebar {
    --sb-rule: var(--line-2);
    --sb-rule-strong: var(--line-2);
    --sb-active: var(--accent-blue-ghost);
    --sb-hover: rgba(20, 20, 19, 0.04);
    --sb-ink: var(--ink);
    --sb-ink-muted: var(--ink-3);
    --sb-ink-faint: var(--ink-4);
    --sb-rust: var(--accent-blue);

    background: var(--glass-bg-strong);
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    color: var(--ink);
    border-right: 1px solid var(--line-2);
    font-family: var(--lf-body);
  }

  /* Dark mode — paint warm coffee gradient to match the top-nav and
     right files-sidebar. Drop the glass blur (no canvas behind to blur). */
  .lf-page[data-theme="dark"] .codex-sidebar,
  .dark .codex-sidebar {
    background: linear-gradient(180deg, #2a241b 0%, #1e1a14 100%);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-right-color: rgba(237, 228, 210, 0.10);
  }

  /* Masthead — "+ New Inquiry" pill */
  .sb-new {
    color: var(--ink);
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    border-radius: var(--r-md);
  }
  .sb-new:hover {
    background: var(--sb-hover);
    border-color: var(--line-1);
  }
  .sb-new-plus {
    background: var(--accent-blue-ghost);
    color: var(--accent-blue);
    transition: background 180ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .sb-new:hover .sb-new-plus {
    background: color-mix(in oklab, var(--accent-blue) 18%, transparent);
    transform: rotate(90deg);
  }

  /* Group markers — lf-kicker style */
  .sb-marker { color: var(--ink-3); }
  .sb-section {
    font-family: var(--lf-mono);
    color: var(--accent-blue);
    letter-spacing: 0.16em;
  }
  .sb-marker-label {
    font-family: var(--lf-mono);
    color: var(--ink-3);
  }

  /* Items */
  .sb-item {
    border-radius: var(--r-md);
    transition: background 180ms ease, box-shadow 180ms ease;
  }
  .sb-item:hover {
    background: var(--sb-hover);
  }
  .sb-item--active {
    background: var(--sb-active);
    box-shadow: inset 2px 0 0 0 var(--accent-blue);
  }
  .sb-item-btn {
    color: var(--ink-2);
    cursor: pointer;
    background: transparent;
    border: 0;
  }
  .sb-item-title {
    font-family: var(--lf-body);
    font-weight: 400;
    color: var(--ink-2);
    transition: color 180ms ease;
  }
  .sb-item--active .sb-item-title { color: var(--accent-blue); font-weight: 500; }
  .sb-item:not(.sb-item--active):hover .sb-item-title {
    color: var(--ink);
  }
  .sb-item-marker { color: var(--ink-4); }
  .sb-item-more {
    color: var(--ink-3);
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    transition: color 160ms ease, background 160ms ease, border-color 160ms ease;
  }
  .sb-item-more:hover {
    color: var(--ink);
    background: var(--sb-hover);
    border-color: var(--line-1);
  }

  .sb-clear {
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
  }
  .sb-clear:hover {
    background: var(--sb-hover);
    border-color: var(--line-1);
    color: var(--rust);
  }

  /* Empty state — italic Fraunces aside */
  .sb-empty {
    font-family: var(--lf-display);
    font-style: italic;
    color: var(--ink-2);
  }

  .sb-footer {
    border-top: 1px solid var(--line-1);
    background: color-mix(in oklab, var(--ink) 2%, transparent);
  }

  /* sb-* sidebar uses --sb-rule alias for legacy CSS */
  .codex-sidebar { /* no-op — placeholder for token bridge */ }

  /* Hide scrollbar but keep scroll */
  .no-scrollbar { scrollbar-width: none; }
  .no-scrollbar::-webkit-scrollbar { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .sb-item,
    .sb-item-btn,
    .sb-new,
    .sb-new-plus,
    .sb-item-more,
    .sb-clear,
    .sb-item-title { transition: none !important; }
  }
`;
