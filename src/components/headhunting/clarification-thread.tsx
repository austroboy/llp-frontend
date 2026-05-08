"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  Send,
  Plus,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

/**
 * Clarification Thread Component (Client Workspace v3.1)
 *
 * Shows threaded Q&A between client and LLP for a mandate.
 * Client can create new topics and reply. LLP responds from admin.
 */
export function ClarificationThread({
  mandateId,
  isAdmin = false,
}: {
  mandateId: Id<"htMandates">;
  isAdmin?: boolean;
}) {
  const { user } = useUser();
  const clarifications = useQuery(api.headhunting.clarifications.getByMandate, { mandateId });
  const createClarification = useMutation(api.headhunting.clarifications.create);
  const replyClarification = useMutation(api.headhunting.clarifications.reply);
  const resolveClarification = useMutation(api.headhunting.clarifications.resolve);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);

  // Reply state per thread
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user || !newTopic.trim() || !newContent.trim()) return;
    setCreating(true);
    try {
      await createClarification({
        mandateId,
        topic: newTopic.trim(),
        content: newContent.trim(),
        senderName: user.fullName || user.primaryEmailAddress?.emailAddress || "Client",
        senderClerkId: user.id,
      });
      setNewTopic("");
      setNewContent("");
      setShowNewForm(false);
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async (clarificationId: string) => {
    const text = replyText[clarificationId];
    if (!user || !text?.trim()) return;
    setReplying(clarificationId);
    try {
      await replyClarification({
        id: clarificationId as Id<"htClarifications">,
        content: text.trim(),
        senderName: user.fullName || user.primaryEmailAddress?.emailAddress || (isAdmin ? "LLP Team" : "Client"),
        senderClerkId: user.id,
        senderRole: isAdmin ? "llp" : "client",
      });
      setReplyText((prev) => ({ ...prev, [clarificationId]: "" }));
    } finally {
      setReplying(null);
    }
  };

  const handleResolve = async (clarificationId: string) => {
    await resolveClarification({ id: clarificationId as Id<"htClarifications"> });
  };

  if (clarifications === undefined) {
    return <div className="text-sm text-muted-foreground py-4">Loading clarifications...</div>;
  }

  const openCount = clarifications.filter((c) => c.status !== "resolved").length;

  const statusColor: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    awaiting_llp: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    awaiting_client: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  const statusLabel: Record<string, string> = {
    open: "Open",
    awaiting_llp: "Awaiting LLP",
    awaiting_client: "Awaiting Client",
    resolved: "Resolved",
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <MessageCircle className="size-4" />
          Clarifications
          {openCount > 0 && (
            <Badge variant="outline" className="text-xs">{openCount} open</Badge>
          )}
        </h3>
        {!isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setShowNewForm(!showNewForm)}>
            <Plus className="size-3 mr-1.5" />
            New Question
          </Button>
        )}
      </div>

      {/* New Clarification Form */}
      {showNewForm && (
        <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
          <Input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Topic (e.g. Notice period, Compensation)"
            className="text-sm"
          />
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Your question or clarification request..."
            rows={3}
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowNewForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={creating || !newTopic.trim() || !newContent.trim()}>
              {creating ? <Loader2 className="size-3 mr-1.5 animate-spin" /> : <Send className="size-3 mr-1.5" />}
              Submit
            </Button>
          </div>
        </div>
      )}

      {/* Thread List */}
      {clarifications.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No clarification requests yet.{!isAdmin && " Click \"New Question\" to ask."}
        </p>
      ) : (
        <div className="space-y-2">
          {clarifications.map((c) => {
            const isExpanded = expandedThread === c._id;
            const lastMessage = c.messages[c.messages.length - 1];

            return (
              <div key={c._id} className="rounded-lg border">
                {/* Thread Header */}
                <button
                  className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedThread(isExpanded ? null : c._id)}
                >
                  {isExpanded ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.topic}</span>
                      <Badge variant="outline" className={cn("text-[10px]", statusColor[c.status])}>
                        {statusLabel[c.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {lastMessage?.senderName}: {lastMessage?.content.slice(0, 80)}...
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {c.messages.length} msg{c.messages.length > 1 ? "s" : ""}
                  </span>
                </button>

                {/* Expanded Messages */}
                {isExpanded && (
                  <div className="border-t p-3 space-y-3">
                    {/* Messages */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {c.messages.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-lg p-2.5 text-sm",
                            msg.sender === "client"
                              ? "bg-primary/5 ml-0 mr-8"
                              : "bg-muted ml-8 mr-0"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{msg.senderName}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {msg.sender === "client" ? "Client" : "LLP"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {new Date(msg.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      ))}
                    </div>

                    {/* Reply + Actions */}
                    {c.status !== "resolved" && (
                      <div className="flex gap-2">
                        <Textarea
                          value={replyText[c._id] || ""}
                          onChange={(e) => setReplyText((prev) => ({ ...prev, [c._id]: e.target.value }))}
                          placeholder="Type your reply..."
                          rows={2}
                          className="text-sm flex-1"
                        />
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => handleReply(c._id)}
                            disabled={replying === c._id || !replyText[c._id]?.trim()}
                          >
                            {replying === c._id ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-green-600"
                              onClick={() => handleResolve(c._id)}
                              title="Mark as resolved"
                            >
                              <CheckCircle className="size-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
