"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Inbox,
  Send,
  Trash2,
  RefreshCw,
  Search,
  Paperclip,
  ArrowLeft,
  Plus,
  X,
  Loader2,
  ShieldAlert,
  ArchiveRestore,
  Reply,
  Forward,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { sanitize, emailSchema } from "@/lib/sanitize-html";

type Folder = "inbox" | "sent" | "spam" | "deleted";

interface Email {
  id: string;
  key: string;
  folder: Folder;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  hasAttachments: boolean;
  snippet?: string;
  text?: string;
  html?: string | null;
  attachments?: Array<{ filename: string; contentType: string; size: number }>;
}

interface FromOption {
  email: string;
  label: string;
}

const FOLDER_CONFIG: Record<Folder, { icon: typeof Inbox; label: string; color: string }> = {
  inbox: { icon: Inbox, label: "Inbox", color: "text-blue-500" },
  sent: { icon: Send, label: "Sent", color: "text-green-500" },
  spam: { icon: ShieldAlert, label: "Spam", color: "text-amber-500" },
  deleted: { icon: Trash2, label: "Deleted", color: "text-red-500" },
};

export function EmailInboxTab() {
  const [activeFolder, setActiveFolder] = useState<Folder>("inbox");
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("");
  const [folderCounts, setFolderCounts] = useState<Record<Folder, number>>({
    inbox: 0,
    sent: 0,
    spam: 0,
    deleted: 0,
  });

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [fromOptions, setFromOptions] = useState<FromOption[]>([]);
  const [composeFrom, setComposeFrom] = useState("");
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeReplyTo, setComposeReplyTo] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch from options
  useEffect(() => {
    fetch("/api/email?action=from_options")
      .then((r) => r.json())
      .then((d) => {
        setFromOptions(d.options || []);
        if (d.options?.length) setComposeFrom(d.options[0].email);
      });
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/email?action=counts");
      const data = await res.json();
      if (!data.error) setFolderCounts(data);
    } catch {}
  }, []);

  const fetchEmails = useCallback(
    async (folder: Folder, silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await fetch(`/api/email?action=list&folder=${folder}&limit=50`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setEmails(data.emails || []);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to fetch emails";
        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const fetchEmail = useCallback(
    async (id: string, folder: Folder) => {
      try {
        const res = await fetch(
          `/api/email?action=read&id=${encodeURIComponent(id)}&folder=${folder}`
        );
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setSelectedEmail(data);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to fetch email";
        toast.error(message);
      }
    },
    []
  );

  // Load folder
  useEffect(() => {
    setSelectedEmail(null);
    fetchEmails(activeFolder);
    fetchCounts();
  }, [activeFolder, fetchEmails, fetchCounts]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEmails(activeFolder, true);
      fetchCounts();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeFolder, fetchEmails, fetchCounts]);

  // === Actions ===
  const handleSend = async () => {
    if (!composeTo || !composeSubject) {
      toast.error("To and Subject are required");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          from: composeFrom,
          to: composeTo.split(",").map((s) => s.trim()),
          cc: composeCc ? composeCc.split(",").map((s) => s.trim()) : undefined,
          subject: composeSubject,
          body: composeBody,
          replyTo: composeReplyTo || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Email sent");
      setComposeOpen(false);
      resetCompose();
      fetchCounts();
      if (activeFolder === "sent") fetchEmails("sent", true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to send email";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (email: Email) => {
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id: email.id,
          folder: email.folder || activeFolder,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(
        activeFolder === "deleted" ? "Permanently deleted" : "Moved to Deleted"
      );
      setSelectedEmail(null);
      fetchEmails(activeFolder, true);
      fetchCounts();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete email";
      toast.error(message);
    }
  };

  const handleSpam = async (email: Email) => {
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "spam",
          id: email.id,
          folder: email.folder || activeFolder,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Moved to Spam");
      setSelectedEmail(null);
      fetchEmails(activeFolder, true);
      fetchCounts();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to mark as spam";
      toast.error(message);
    }
  };

  const handleRestore = async (email: Email) => {
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: activeFolder === "spam" ? "unspam" : "restore",
          id: email.id,
          folder: activeFolder,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Restored to Inbox");
      setSelectedEmail(null);
      fetchEmails(activeFolder, true);
      fetchCounts();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to restore email";
      toast.error(message);
    }
  };

  const handleReply = (email: Email) => {
    setComposeFrom(fromOptions[0]?.email || "");
    const replyAddr = email.from.replace(/.*<(.+)>/, "$1").trim();
    setComposeTo(replyAddr);
    setComposeReplyTo(replyAddr);
    setComposeSubject(
      email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`
    );
    setComposeBody(
      `\n\n--- Original Message ---\nFrom: ${email.from}\nDate: ${formatDate(email.date)}\n\n${email.text || ""}`
    );
    setComposeOpen(true);
  };

  const handleForward = (email: Email) => {
    setComposeFrom(fromOptions[0]?.email || "");
    setComposeTo("");
    setComposeSubject(
      email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`
    );
    setComposeBody(
      `\n\n--- Forwarded Message ---\nFrom: ${email.from}\nTo: ${email.to}\nDate: ${formatDate(email.date)}\nSubject: ${email.subject}\n\n${email.text || ""}`
    );
    setComposeOpen(true);
  };

  const resetCompose = () => {
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
    setComposeReplyTo("");
  };

  const openCompose = () => {
    resetCompose();
    setComposeOpen(true);
  };

  const filteredEmails = emails.filter((e) => {
    // Recipient filter (prefix before @)
    if (recipientFilter) {
      const target = `${recipientFilter.toLowerCase()}@`;
      const toField = e.to.toLowerCase();
      if (!toField.includes(target)) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.from.toLowerCase().includes(q) ||
      e.to.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q) ||
      (e.snippet || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-border">
      {/* === Left Sidebar — Folders === */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card/50 p-3 sm:block">
        <Button onClick={openCompose} className="mb-4 w-full" size="sm">
          <Plus className="mr-1.5 size-4" />
          Compose
        </Button>

        <nav className="space-y-0.5">
          {(Object.keys(FOLDER_CONFIG) as Folder[]).map((folder) => {
            const { icon: Icon, label, color } = FOLDER_CONFIG[folder];
            const count = folderCounts[folder];
            const active = activeFolder === folder;
            return (
              <button
                key={folder}
                onClick={() => setActiveFolder(folder)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={cn("size-4", active ? "text-primary" : color)} />
                  {label}
                </span>
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-auto px-1.5 py-0 text-[10px]",
                      active && folder === "inbox" && "bg-primary/20 text-primary"
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 rounded-lg border border-dashed p-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Domain
          </p>
          <p className="text-xs font-medium">laborlawpartner.com</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            via AWS SES
          </p>
        </div>
      </aside>

      {/* === Main Content === */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          {/* Mobile folder selector */}
          <div className="sm:hidden">
            <Select
              value={activeFolder}
              onValueChange={(v) => setActiveFolder(v as Folder)}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FOLDER_CONFIG) as Folder[]).map((f) => (
                  <SelectItem key={f} value={f}>
                    {FOLDER_CONFIG[f].label} ({folderCounts[f]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEmail ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedEmail(null)}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {selectedEmail.subject}
              </span>
            </>
          ) : (
            <>
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="hidden items-center gap-0 sm:flex">
                <Input
                  placeholder="all"
                  value={recipientFilter}
                  onChange={(e) => setRecipientFilter(e.target.value.replace(/@/g, ""))}
                  className="h-9 w-20 rounded-r-none text-sm"
                />
                <span className="flex h-9 items-center rounded-r-md border border-l-0 border-border bg-muted px-2 text-xs text-muted-foreground whitespace-nowrap">
                  @laborlawpartner.com
                </span>
              </div>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchEmails(activeFolder, true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          </Button>

          <Button
            size="sm"
            onClick={openCompose}
            className="hidden sm:inline-flex"
          >
            <Plus className="mr-1 size-4" />
            Compose
          </Button>
          {/* Mobile compose */}
          <Button size="icon" onClick={openCompose} className="sm:hidden">
            <Plus className="size-4" />
          </Button>
        </div>

        {/* Email list / reader */}
        <div className="flex min-h-0 flex-1">
          {/* Email List */}
          <div
            className={cn(
              "flex-1 overflow-y-auto border-r border-border lg:max-w-md xl:max-w-lg",
              selectedEmail && "hidden lg:block"
            )}
          >
            {loading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
                ))}
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Mail className="mb-3 size-10 opacity-20" />
                <p className="text-sm">
                  {searchQuery
                    ? "No emails match your search"
                    : `No emails in ${FOLDER_CONFIG[activeFolder].label}`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => fetchEmail(email.id, activeFolder)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-accent/50",
                      selectedEmail?.id === email.id && "bg-accent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {activeFolder === "sent"
                              ? `To: ${email.to}`
                              : email.from}
                          </span>
                          {/* Mailbox chip — local part before @ — shows which
                              of our addresses received this delivery. Hidden
                              for sent folder where the recipient is already
                              the primary line. */}
                          {activeFolder !== "sent" &&
                            email.to?.includes("@") && (
                              <span className="shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                                {email.to.split("@")[0]}
                              </span>
                            )}
                          {email.hasAttachments && (
                            <Paperclip className="size-3 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                        <p className="truncate text-sm">{email.subject}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {email.snippet}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatDate(email.date)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Email Reader */}
          <div
            className={cn(
              "flex-1 overflow-y-auto",
              !selectedEmail && "hidden lg:flex lg:items-center lg:justify-center"
            )}
          >
            {selectedEmail ? (
              <div className="p-4 sm:p-6">
                {/* Email header */}
                <div className="mb-4 space-y-3 border-b border-border pb-4">
                  <h2 className="text-lg font-semibold leading-tight">
                    {selectedEmail.subject}
                  </h2>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <span className="text-muted-foreground">From:</span>
                    <span className="truncate">{selectedEmail.from}</span>
                    <span className="text-muted-foreground">To:</span>
                    <span className="truncate">{selectedEmail.to}</span>
                    {selectedEmail.cc && (
                      <>
                        <span className="text-muted-foreground">Cc:</span>
                        <span className="truncate">{selectedEmail.cc}</span>
                      </>
                    )}
                    <span className="text-muted-foreground">Date:</span>
                    <span>{formatDateFull(selectedEmail.date)}</span>
                  </div>
                </div>

                {/* Attachments */}
                {selectedEmail.attachments &&
                  selectedEmail.attachments.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {selectedEmail.attachments.map((att, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          <Paperclip className="mr-1 size-3" />
                          {att.filename} ({formatSize(att.size)})
                        </Badge>
                      ))}
                    </div>
                  )}

                {/* Body */}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {selectedEmail.html ? (
                    <div
                      // C-6 XSS: sanitize untrusted email HTML.
                      dangerouslySetInnerHTML={{ __html: sanitize(selectedEmail.html, emailSchema) }}
                      className="email-body"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {selectedEmail.text}
                    </pre>
                  )}
                </div>

                {/* Actions bar */}
                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  {activeFolder !== "sent" && (
                    <Button size="sm" onClick={() => handleReply(selectedEmail)}>
                      <Reply className="mr-1.5 size-4" />
                      Reply
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleForward(selectedEmail)}
                  >
                    <Forward className="mr-1.5 size-4" />
                    Forward
                  </Button>

                  <div className="ml-auto flex items-center gap-1">
                    {(activeFolder === "deleted" || activeFolder === "spam") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(selectedEmail)}
                      >
                        <ArchiveRestore className="mr-1.5 size-4" />
                        Restore
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {activeFolder === "inbox" && (
                          <DropdownMenuItem
                            onClick={() => handleSpam(selectedEmail)}
                          >
                            <AlertTriangle className="mr-2 size-4 text-amber-500" />
                            Mark as Spam
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(selectedEmail)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          {activeFolder === "deleted"
                            ? "Delete Permanently"
                            : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Mail className="mx-auto mb-3 size-12 opacity-15" />
                <p className="text-sm">Select an email to read</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === Compose Dialog === */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5" />
              New Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-[60px_1fr] items-center gap-2">
              <label className="text-sm text-muted-foreground">From:</label>
              <Select value={composeFrom} onValueChange={setComposeFrom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fromOptions.map((opt) => (
                    <SelectItem key={opt.email} value={opt.email}>
                      {opt.label} &lt;{opt.email}&gt;
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[60px_1fr] items-center gap-2">
              <label className="text-sm text-muted-foreground">To:</label>
              <Input
                placeholder="recipient@example.com"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-[60px_1fr] items-center gap-2">
              <label className="text-sm text-muted-foreground">Cc:</label>
              <Input
                placeholder="cc@example.com (optional)"
                value={composeCc}
                onChange={(e) => setComposeCc(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-[60px_1fr] items-center gap-2">
              <label className="text-sm text-muted-foreground">Subject:</label>
              <Input
                placeholder="Email subject"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </div>

            <Textarea
              placeholder="Write your message..."
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={14}
              className="font-mono text-sm"
            />

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setComposeOpen(false)}
              >
                <X className="mr-1.5 size-4" />
                Discard
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 size-4" />
                )}
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}
