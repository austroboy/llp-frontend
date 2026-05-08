"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SendIcon,
  Loader2,
  RotateCcw,
  Clock,
  FlaskConical,
  Copy,
  Check,
  FileText,
  ChevronDown,
  ChevronUp,
  PanelRightOpen,
  PanelRightClose,
  PanelLeftOpen,
  PanelLeftClose,
  Plus,
  MessageSquare,
  Trash2,
  Paperclip,
  X,
  Activity,
  Database,
  TreePine,
  Cpu,
  ScrollText,
  RefreshCw,
  Save,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { parseLegalContent } from "@/components/chat/legal-content-parser";
import { getSandboxPrompt } from "./sandbox-prompts";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

// ── Types ──

interface ChatMeta {
  conversation_id?: string;
  tier?: string;
  model?: string;
  cached?: boolean;
  dailyRemaining?: number;
  nodesUsed?: number;
  ragChunks?: number;
  contextLength?: number;
  raceWinner?: string;
  raceCandidates?: string[];
}

interface TierModelConfig {
  chain?: Array<{ model: string; provider: string; keyIndex?: number }>;
  model?: string;
  provider?: string;
  fallbackModel?: string;
  fallbackProvider?: string;
}

interface PipelineHealth {
  proxyStatus: "loading" | "online" | "offline";
  proxyModel?: string;
  proxyUptime?: string;
  ragChunkCount?: number;
  ragStatus: "loading" | "ok" | "error";
  treeNodeCount?: number;
  treeStatus: "loading" | "ok" | "error";
  systemPromptLines?: number;
  lastChecked?: number;
  tierConfig?: Record<string, TierModelConfig>;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: ChatMeta;
  citations?: Array<{ section: string; document: string; document_title?: string; document_id?: string }>;
  startTime?: number;
  endTime?: number;
}

interface SavedConversation {
  id: string;
  title: string;
  tier: string;
  model?: string;
  messageCount: number;
  createdAt: number;
  messages: ChatMessage[];
  prompt?: string;
  adminEmail?: string;
}

// ── Tier options ──

const TIER_OPTIONS = [
  { id: "free_guest", label: "Free Guest" },
  { id: "free_subscribed", label: "Free Subscribed" },
  { id: "mini", label: "Mini" },
  { id: "max", label: "Max" },
];

export default function AdminChatTestPage() {
  const { user, isLoaded } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState("free_guest");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMeta, setShowMeta] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  // Collapse sidebars on mobile after mount
  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowSidebar(false);
      setShowHistory(false);
    }
  }, []);
  const [health, setHealth] = useState<PipelineHealth>({
    proxyStatus: "loading",
    ragStatus: "loading",
    treeStatus: "loading",
  });
  const [lastPipelineStats, setLastPipelineStats] = useState<ChatMeta | null>(null);
  const [sandboxPrompt, setSandboxPrompt] = useState("");
  const [promptDirty, setPromptDirty] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [attachedDoc, setAttachedDoc] = useState<{ text: string; fileName: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  const isAdmin =
    (user?.publicMetadata as any)?.role === "admin" ||
    (user?.publicMetadata as any)?.contributor === true;

  const fetchHealth = useCallback(async (tier?: string) => {
    try {
      const res = await fetch(`/api/admin/chat-health?tier=${tier || selectedTier}`);
      if (res.ok) {
        const data = await res.json();
        setHealth({
          proxyStatus: data.proxyOnline ? "online" : "offline",
          proxyModel: data.proxyModel,
          ragChunkCount: data.ragChunkCount,
          ragStatus: data.ragChunkCount > 0 ? "ok" : "error",
          treeNodeCount: data.treeNodeCount,
          treeStatus: data.treeNodeCount > 0 ? "ok" : "error",
          systemPromptLines: data.systemPromptLines,
          tierConfig: data.tierConfig,
          lastChecked: Date.now(),
        });
        // Prompt is set by fixed sandbox prompts (sandbox-prompts.ts).
        // Only restore user-saved localStorage overrides here.
        if (!promptDirty) {
          const savedKey = `sandbox-prompt-${tier || selectedTier}`;
          const saved = localStorage.getItem(savedKey);
          if (saved) {
            setSandboxPrompt(saved);
            setPromptDirty(true);
            setPromptSaved(true);
          }
        }
      }
    } catch {
      setHealth((h) => ({ ...h, proxyStatus: "offline", ragStatus: "error", treeStatus: "error", lastChecked: Date.now() }));
    }
  }, [selectedTier, promptDirty]);

  useEffect(() => {
    if (isAdmin) fetchHealth();
  }, [isAdmin, fetchHealth]);

  // Reload prompt when tier changes — use fixed sandbox prompts
  useEffect(() => {
    if (isAdmin) {
      const fixedPrompt = getSandboxPrompt(selectedTier);
      setSandboxPrompt(fixedPrompt);
      setDefaultPrompt(fixedPrompt);
      setPromptDirty(false);
      setPromptSaved(false);
      fetchHealth(selectedTier);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTier]);

  // Load saved conversations from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sandbox-conversations");
      if (saved) setSavedConversations(JSON.parse(saved));
    } catch {}
  }, []);

  // Auto-save current conversation when a response completes
  const saveCurrentConversation = useCallback(() => {
    const msgs = messagesRef.current;
    if (msgs.length < 2) return;
    const firstUserMsg = msgs.find(m => m.role === "user");
    const lastAiMsg = [...msgs].reverse().find(m => m.role === "assistant" && m.content);
    const title = firstUserMsg?.content.slice(0, 60) || "Untitled";

    setActiveConvId(prev => {
      const id = prev || `conv-${Date.now()}`;

      const conv: SavedConversation = {
        id,
        title,
        tier: selectedTier,
        model: lastAiMsg?.meta?.model,
        messageCount: msgs.length,
        createdAt: prev ? Date.now() : Date.now(),
        messages: msgs,
        prompt: promptDirty ? sandboxPrompt : undefined,
        adminEmail: user?.primaryEmailAddress?.emailAddress,
      };

      setSavedConversations(prevConvs => {
        const filtered = prevConvs.filter(c => c.id !== id);
        const updated = [conv, ...filtered].slice(0, 50);
        try { localStorage.setItem("sandbox-conversations", JSON.stringify(updated)); } catch {}
        return updated;
      });

      return id;
    });
  }, [selectedTier, sandboxPrompt, promptDirty]);

  const loadConversation = useCallback((conv: SavedConversation) => {
    setMessages(conv.messages);
    setSelectedTier(conv.tier);
    setActiveConvId(conv.id);
    setConversationId(null);
    if (conv.prompt) {
      setSandboxPrompt(conv.prompt);
      setPromptDirty(true);
    }
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setSavedConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem("sandbox-conversations", JSON.stringify(updated));
      return updated;
    });
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
    }
  }, [activeConvId]);

  // Keep ref in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large (max 10MB)");
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Upload failed");
        return;
      }
      const data = await res.json();
      setAttachedDoc({ text: data.text, fileName: data.fileName });
    } catch {
      alert("Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const messageWithDoc = attachedDoc
      ? `[User uploaded: ${attachedDoc.fileName}]\n---\n${attachedDoc.text}\n---\n\n${text}`
      : text;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const aiId = `a-${Date.now()}`;
    const aiMsg: ChatMessage = {
      id: aiId,
      role: "assistant",
      content: "",
      startTime: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    setAttachedDoc(null);
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/admin/chat-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageWithDoc,
          history: history.slice(-8),
          conversation_id: conversationId,
          tier_override: selectedTier,
          system_prompt_override: sandboxPrompt || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  content: `Error: ${err.error || res.statusText}`,
                  endTime: Date.now(),
                }
              : m
          )
        );
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!;

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "meta") {
              // Initial meta with conversation_id, tier, model, gateway
              if (event.conversation_id) {
                setConversationId(event.conversation_id);
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiId
                    ? {
                        ...m,
                        meta: {
                          ...m.meta,
                          conversation_id: event.conversation_id,
                          tier: event.tier,
                          model: event.model || m.meta?.model,
                          cached: event.cached,
                          dailyRemaining: event.dailyRemaining,
                        },
                      }
                    : m
                )
              );
            } else if (event.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiId
                    ? { ...m, content: m.content + event.content }
                    : m
                )
              );
            } else if (event.type === "meta_update") {
              const metaFields: Partial<ChatMeta> = {};
              if (event.model) metaFields.model = event.model;
              if (event.nodesUsed !== undefined) metaFields.nodesUsed = event.nodesUsed;
              if (event.ragChunks !== undefined) metaFields.ragChunks = event.ragChunks;
              if (event.contextLength !== undefined) metaFields.contextLength = event.contextLength;
              if (event.raceWinner) metaFields.raceWinner = event.raceWinner;
              if (event.raceCandidates) metaFields.raceCandidates = event.raceCandidates;
              if (Object.keys(metaFields).length > 0) {
                setLastPipelineStats((prev) => ({ ...prev, ...metaFields }));
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiId
                    ? {
                        ...m,
                        citations: event.citations || m.citations,
                        meta: { ...m.meta, ...metaFields },
                      }
                    : m
                )
              );
            } else if (event.type === "title_update") {
              // Ignore title updates in sandbox
            }
          } catch {
            /* skip malformed lines */
          }
        }
      }

      // Mark response as complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, endTime: Date.now() } : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? {
                ...m,
                content: `Network error: ${err}`,
                endTime: Date.now(),
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      // Auto-save after a tick so messages state is updated
      setTimeout(() => saveCurrentConversation(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    if (messages.length >= 2) saveCurrentConversation();
    setMessages([]);
    setInput("");
    setConversationId(null);
    setActiveConvId(null);
  };

  // ── Auth gate ──
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] text-muted-foreground gap-3">
        <FlaskConical className="size-12 opacity-30" />
        <h2 className="text-lg font-medium">Admin Access Required</h2>
        <p className="text-sm">This sandbox is restricted to admin users.</p>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="mx-auto max-w-7xl w-full flex flex-col h-[calc(100vh-140px)] bg-background px-2">

    {/* Hero stamp rail (lf) */}
    <motion.div
      variants={heroStagger}
      initial="hidden"
      animate="show"
      className="flex items-center gap-2 mb-2 shrink-0"
    >
      <motion.div variants={fadeUp} className="lf-kicker">
        <span className="lf-kicker-mark">§ 3.6</span>
        Admin · Chat Workbench
      </motion.div>
      <motion.span
        variants={fadeUp}
        className="lf-meta"
        style={{ color: "var(--ink-4)" }}
      >
        ·
      </motion.span>
      <motion.span
        variants={fadeUp}
        className="lf-meta"
        style={{ fontStyle: "italic" }}
      >
        Sandbox — prompts, tiers, stream traces
      </motion.span>
    </motion.div>

    {/* ── Model info bar (top) ── */}
    <div className="bg-muted/30 border border-border rounded-none mb-2 px-4 py-1.5 flex items-center justify-center gap-2 text-[10px] text-muted-foreground overflow-x-auto shrink-0">
      <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium shrink-0 border-emerald-500/50 text-emerald-400">
        Chat Proxy
      </Badge>
      <span className="text-border">|</span>
      <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium shrink-0">
        {TIER_OPTIONS.find((t) => t.id === selectedTier)?.label || selectedTier}
      </Badge>
      <span className="text-border">|</span>
      {(() => {
        const tc = health.tierConfig?.[selectedTier];
        const chain = tc?.chain || [];
        const isMax = selectedTier === "max";
        const primary = chain[0];
        const fallbacks = chain.slice(1);
        const fmtModel = (m: string) => m?.split("/").pop()?.replace(":free", "") || "unknown";
        const fmtProvider = (p: string) => p === "xai" ? "xAI" : p === "gemini-native" ? "Google" : p === "openrouter" ? "OpenRouter" : p === "openai-compat" ? "Z.Ai" : p;
        return (
          <>
            <span className="shrink-0">
              <span className="text-muted-foreground/60">Gen:</span>{" "}
              <span className="font-mono text-foreground/80">{primary ? fmtModel(primary.model) : "Race (OpenRouter)"}</span>
              {primary && <span className="text-muted-foreground/40 ml-0.5">({fmtProvider(primary.provider)})</span>}
            </span>
            {isMax && (
              <>
                <span className="text-border">|</span>
                <span className="shrink-0">
                  <span className="text-muted-foreground/60">Cite&nbsp;Verify:</span>{" "}
                  <span className="font-mono text-foreground/80">grok-4-1-fast-non-reasoning</span>
                  <span className="text-muted-foreground/40 ml-0.5">(xAI)</span>
                </span>
              </>
            )}
            <span className="text-border">|</span>
            <span className="shrink-0">
              <span className="text-muted-foreground/60">Fallback:</span>{" "}
              <span className="font-mono text-foreground/80">
                {fallbacks.length > 0
                  ? fallbacks.map((f: { model: string; provider: string }) => fmtModel(f.model)).join(" → ")
                  : "none"}
              </span>
            </span>
            <span className="text-border">|</span>
            <span className="shrink-0">
              <span className="text-muted-foreground/60">Rerank:</span>{" "}
              <span className="font-mono text-foreground/80">cohere/rerank-4-pro</span>
              <span className="text-muted-foreground/40 ml-0.5">(OpenRouter)</span>
            </span>
            <span className="text-border">|</span>
            <span className="shrink-0">
              <span className="text-muted-foreground/60">Intent:</span>{" "}
              <span className="font-mono text-foreground/80">gemini-2.5-flash</span>
              <span className="text-muted-foreground/40 ml-0.5">(Google)</span>
            </span>
            <span className="text-border">|</span>
            <span className="shrink-0">
              <span className="text-muted-foreground/60">Embed:</span>{" "}
              <span className="font-mono text-foreground/80">gemini-embedding-001</span>
            </span>
          </>
        );
      })()}
      {conversationId && (
        <>
          <span className="text-border ml-auto">|</span>
          <span className="font-mono opacity-50 shrink-0">conv: {conversationId.slice(0, 8)}...</span>
        </>
      )}
    </div>

    {/* ── 3-column layout ── */}
    <div className="flex flex-1 min-h-0 gap-0 md:gap-4 relative">

    {/* ── Left Sidebar: Conversations ── */}
    {showHistory && (
      <div className="shrink-0 h-full">
        <ConversationSidebar
          conversations={savedConversations}
          activeId={activeConvId}
          onSelect={loadConversation}
          onDelete={deleteConversation}
          onNew={handleReset}
          onClose={() => setShowHistory(false)}
        />
      </div>
    )}

    <div className="flex-1 min-w-[200px] flex flex-col overflow-hidden">
      {/* ── Header Bar ── */}
      <div className="border-b border-border bg-card px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* History toggle */}
          <Button
            variant={showHistory ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </Button>
          <FlaskConical className="size-5 text-primary" />
          <h1 className="text-sm font-semibold">Chat Sandbox</h1>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 ml-auto flex-wrap">
          {/* Tier selector */}
          <Select value={selectedTier} onValueChange={setSelectedTier}>
            <SelectTrigger className="w-[130px] md:w-[170px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIER_OPTIONS.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={handleReset}
          >
            <RotateCcw className="size-4" />
          </Button>

          {/* Pipeline inspector toggle */}
          <Button
            variant={showSidebar ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
          </Button>
        </div>
      </div>


      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <FlaskConical className="size-12 mx-auto mb-4 opacity-30" />
              <h2 className="text-lg font-medium mb-1">Admin Chat Sandbox</h2>
              <p className="text-sm">
                Same pipeline as /chat — race mode + RAG + tree reasoning.
                Select a tier and send a query.
              </p>
              <p className="text-xs mt-2 opacity-60">
                Daily limits are bypassed in sandbox mode.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              {/* ── User Message ── */}
              {msg.role === "user" && (
                <div className="flex justify-end mb-2">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              )}

              {/* ── Assistant Message ── */}
              {msg.role === "assistant" && (
                <div className="space-y-2">
                  {/* Response content */}
                  <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%] relative group">
                    {msg.content ? (
                      <MarkdownRenderer
                        content={parseLegalContent(msg.content)}
                        className="text-sm"
                      />
                    ) : isLoading && msg.id === messages[messages.length - 1]?.id ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-xs">Generating...</span>
                      </div>
                    ) : null}

                    {/* Copy button */}
                    {msg.content && (
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                      >
                        {copiedId === msg.id ? (
                          <Check className="size-3.5 text-green-500" />
                        ) : (
                          <Copy className="size-3.5 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Meta panel */}
                  {showMeta && msg.endTime && (
                    <MetaPanel msg={msg} />
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input Area ── */}
      <div className="border-t border-border bg-card p-4">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Attachment badge */}
          {(attachedDoc || isUploading) && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-2 py-1 gap-1.5">
                {isUploading ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Analyzing document...
                  </>
                ) : (
                  <>
                    <FileText className="size-3" />
                    {attachedDoc?.fileName}
                    <button onClick={() => setAttachedDoc(null)} className="ml-1 hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </>
                )}
              </Badge>
            </div>
          )}
          <div className="flex gap-2">
            {/* File upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 size-11"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Paperclip className="size-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a labour law question to test..."
              className="min-h-[44px] max-h-[120px] resize-none text-sm"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0 size-11"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>

    {/* ── Right Sidebar ── */}
    {showSidebar && (
      <div className="shrink-0 h-full">
        <PipelineSidebar
          health={health}
          lastStats={lastPipelineStats}
          selectedTier={selectedTier}
          onRefresh={fetchHealth}
          sandboxPrompt={sandboxPrompt}
          onPromptChange={(v) => { setSandboxPrompt(v); setPromptDirty(true); setPromptSaved(false); }}
          promptDirty={promptDirty}
          promptSaved={promptSaved}
          onPromptReset={() => {
            localStorage.removeItem(`sandbox-prompt-${selectedTier}`);
            setSandboxPrompt(defaultPrompt);
            setPromptDirty(false);
            setPromptSaved(false);
          }}
          onPromptSave={() => {
            localStorage.setItem(`sandbox-prompt-${selectedTier}`, sandboxPrompt);
            setPromptSaved(true);
          }}
        />
      </div>
    )}

    </div>
    </div>
    </MotionConfig>
  );
}

// ── Conversation Sidebar Component ──

function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNew,
  onClose,
}: {
  conversations: SavedConversation[];
  activeId: string | null;
  onSelect: (conv: SavedConversation) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const tierColors: Record<string, string> = {
    free_guest: "bg-zinc-500/20 text-zinc-400",
    free_subscribed: "bg-zinc-500/20 text-zinc-400",
    mini: "bg-blue-500/20 text-blue-400",
    max: "bg-amber-500/20 text-amber-400",
  };

  return (
    <aside className="w-[200px] md:w-[280px] shrink-0 h-full border border-border bg-card flex flex-col overflow-hidden rounded-none">
      <div className="px-3 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Close history"
          >
            <PanelLeftClose className="size-3.5 text-muted-foreground" />
          </button>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</h3>
        </div>
        <button
          onClick={onNew}
          className="p-1 rounded hover:bg-muted transition-colors"
          title="New conversation"
        >
          <Plus className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <div className="px-3 py-8 text-center text-muted-foreground/50">
            <MessageSquare className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-[10px]">No conversations yet</p>
          </div>
        )}

        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              "group px-3 py-2.5 border-b border-border/50 cursor-pointer transition-colors",
              activeId === conv.id ? "bg-primary/10" : "hover:bg-muted/50"
            )}
            onClick={() => onSelect(conv)}
          >
            <div className="flex items-start justify-between gap-1">
              <p className="text-xs font-medium truncate flex-1 leading-tight">
                {conv.title}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const pw = prompt("Enter password to delete:");
                  if (pw === "Fuckingshit34") onDelete(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 transition-opacity shrink-0"
              >
                <Trash2 className="size-3 text-destructive" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={cn("text-[8px] px-1 py-0 rounded font-medium", tierColors[conv.tier] || "bg-muted text-muted-foreground")}>
                {conv.tier === "free_guest" ? "Guest" : conv.tier === "free_subscribed" ? "Free" : conv.tier.charAt(0).toUpperCase() + conv.tier.slice(1)}
              </span>
              {conv.model && (
                <span className="text-[8px] font-mono text-muted-foreground/60 truncate">
                  {conv.model.replace("-preview", "").replace("-non-reasoning", "")}
                </span>
              )}
              <span className="text-[8px] text-muted-foreground/40 ml-auto shrink-0">
                {formatTime(conv.createdAt)}
              </span>
            </div>
            <div className="text-[9px] text-muted-foreground/40 mt-0.5 flex items-center justify-between">
              <span>{conv.messageCount} messages</span>
              {conv.adminEmail && (
                <span className="truncate ml-1">{conv.adminEmail.split("@")[0]}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ── Pipeline Sidebar Component ──

function PipelineSidebar({
  health,
  lastStats,
  selectedTier,
  onRefresh,
  sandboxPrompt,
  onPromptChange,
  promptDirty,
  promptSaved,
  onPromptReset,
  onPromptSave,
}: {
  health: PipelineHealth;
  lastStats: ChatMeta | null;
  selectedTier: string;
  onRefresh: () => void;
  sandboxPrompt: string;
  onPromptChange: (v: string) => void;
  promptDirty: boolean;
  promptSaved: boolean;
  onPromptReset: () => void;
  onPromptSave: () => void;
}) {
  const statusDot = (status: "loading" | "online" | "ok" | "offline" | "error") => {
    const colors = {
      loading: "bg-yellow-500 animate-pulse",
      online: "bg-emerald-500",
      ok: "bg-emerald-500",
      offline: "bg-red-500",
      error: "bg-red-500",
    };
    return <span className={cn("inline-block size-2 rounded-full", colors[status])} />;
  };

  return (
    <aside className="w-[200px] md:w-[280px] shrink-0 h-full border border-border bg-card flex flex-col overflow-hidden rounded-none">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline Inspector</h3>
        <button onClick={onRefresh} className="p-1 rounded hover:bg-muted transition-colors">
          <RefreshCw className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="p-4 space-y-5 flex-1 overflow-y-auto flex flex-col">
        {/* ── Chat Proxy Status ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Chat Proxy</span>
          </div>
          <div className="bg-muted/50 rounded-none p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="flex items-center gap-1.5 font-medium">
                {statusDot(health.proxyStatus)}
                {health.proxyStatus === "loading" ? "Checking..." : health.proxyStatus === "online" ? "Online" : "Offline"}
              </span>
            </div>
            {health.proxyModel && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="font-mono text-[10px]">{health.proxyModel}</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Tree Nodes ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <TreePine className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">DOC-010 Tree</span>
          </div>
          <div className="bg-muted/50 rounded-none p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="flex items-center gap-1.5 font-medium">
                {statusDot(health.treeStatus)}
                {health.treeStatus === "loading" ? "Checking..." : health.treeStatus === "ok" ? "Loaded" : "Error"}
              </span>
            </div>
            {health.treeNodeCount !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Nodes</span>
                <span className="font-medium">{health.treeNodeCount}</span>
              </div>
            )}
          </div>
        </section>

        {/* ── RAG Status ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Database className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Supabase RAG</span>
          </div>
          <div className="bg-muted/50 rounded-none p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="flex items-center gap-1.5 font-medium">
                {statusDot(health.ragStatus)}
                {health.ragStatus === "loading" ? "Checking..." : health.ragStatus === "ok" ? "Connected" : "Error"}
              </span>
            </div>
            {health.ragChunkCount !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Chunks</span>
                <span className="font-medium">{health.ragChunkCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Last Query Stats ── */}
        {lastStats && (lastStats.nodesUsed || lastStats.ragChunks || lastStats.contextLength) && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="size-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last Query</span>
            </div>
            <div className="bg-muted/50 rounded-none p-3 space-y-1.5 text-xs">
              {lastStats.model && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{lastStats.model}</Badge>
                </div>
              )}
              {lastStats.nodesUsed !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tree Nodes Used</span>
                  <span className="font-medium text-primary">{lastStats.nodesUsed}</span>
                </div>
              )}
              {lastStats.ragChunks !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">RAG Chunks</span>
                  <span className="font-medium text-primary">{lastStats.ragChunks}</span>
                </div>
              )}
              {lastStats.contextLength !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Context Size</span>
                  <span className="font-mono text-[10px]">{(lastStats.contextLength / 1024).toFixed(1)}KB</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Race Mode ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="size-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Race Mode</span>
          </div>
          <div className="bg-muted/50 rounded-none p-3 space-y-1.5 text-xs">
            {lastStats?.raceWinner ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Winner</span>
                  <span className="font-mono text-[10px] text-emerald-400 text-right max-w-[160px] truncate" title={lastStats.raceWinner}>
                    {lastStats.raceWinner.split("/").pop()?.replace(":free", "")}
                  </span>
                </div>
                {lastStats.raceCandidates && (
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground">Candidates</span>
                    {lastStats.raceCandidates.map((c, i) => (
                      <div key={i} className="flex items-center justify-between pl-2">
                        <span className="font-mono text-[9px] text-muted-foreground/70 truncate" title={c}>
                          {c.split("/").pop()?.replace(":free", "")}
                        </span>
                        {c === lastStats.raceWinner && (
                          <Badge variant="secondary" className="text-[7px] px-1 py-0 text-emerald-400">won</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {(() => {
                  const tc = health.tierConfig?.[selectedTier];
                  const chainLen = tc?.chain?.length || 0;
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Strategy</span>
                      <span className="font-mono text-[10px]">{chainLen > 1 ? `${chainLen}-model chain` : "single model"}</span>
                    </div>
                  );
                })()}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Timeout</span>
                  <span className="font-mono text-[10px]">30s → next fallback</span>
                </div>
                <span className="text-muted-foreground/50 text-[10px]">Send a query to see race results</span>
              </>
            )}
          </div>
        </section>

        {/* ── Sandbox System Prompt ── */}
        <section className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ScrollText className="size-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">System Prompt</span>
            </div>
            <div className="flex items-center gap-1.5">
              {promptDirty && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 text-amber-600 border-amber-400">
                  {promptSaved ? "saved" : "edited"}
                </Badge>
              )}
              {promptDirty && !promptSaved && (
                <button
                  onClick={onPromptSave}
                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-emerald-400 text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                  title="Save this prompt for the current tier (persists across refresh)"
                >
                  <Save className="size-2.5" />
                  Save
                </button>
              )}
              <button
                onClick={onPromptReset}
                className={cn(
                  "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                  promptDirty
                    ? "border-amber-400 text-amber-600 hover:bg-amber-500/10"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
                title="Reset to default system prompt for this tier"
              >
                <RotateCcw className="size-2.5" />
                Reset
              </button>
            </div>
          </div>
          <div className="bg-muted/50 rounded-none p-2 space-y-1.5 text-xs flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-muted-foreground text-[10px]">Profile</span>
              <span className="font-medium text-[10px]">
                {selectedTier === "free_guest" || selectedTier === "free_subscribed" ? "Free Tier" : selectedTier === "mini" ? "Mini Tier" : "Max Tier"} v3
              </span>
            </div>
            <textarea
              value={sandboxPrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              className="w-full flex-1 min-h-[200px] bg-background border border-border rounded-md p-2 text-[10px] font-mono leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              spellCheck={false}
              placeholder="Loading system prompt..."
            />
            <p className={cn("text-[9px] px-1", promptDirty ? "text-red-500 font-medium" : "text-muted-foreground/60")}>
              {promptDirty
                ? "⚠ Custom prompt active — chat responses will follow this modified prompt instead of the default system behavior."
                : "Sandbox-only — this prompt is completely isolated from production /chat. Edits here never affect live users."}
            </p>
          </div>
        </section>

        {/* ── Timestamp ── */}
        {health.lastChecked && (
          <p className="text-[10px] text-muted-foreground/50 text-center">
            Last checked: {new Date(health.lastChecked).toLocaleTimeString()}
          </p>
        )}
      </div>
    </aside>
  );
}

// ── Meta Panel Component ──

function MetaPanel({ msg }: { msg: ChatMessage }) {
  const responseTime =
    msg.startTime && msg.endTime ? msg.endTime - msg.startTime : null;

  return (
    <div className="bg-muted/50 border border-border rounded-none px-3 py-2 text-xs flex items-center gap-3 flex-wrap">
      {/* Response time */}
      {responseTime !== null && (
        <span className="flex items-center gap-1 text-primary font-medium">
          <Clock className="size-3" />
          {(responseTime / 1000).toFixed(1)}s
        </span>
      )}

      {/* Tier used */}
      {msg.meta?.tier && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
          tier: {msg.meta.tier}
        </Badge>
      )}

      {/* Model */}
      {msg.meta?.model && (
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
          model: {msg.meta.model}
        </Badge>
      )}

      {/* Cached */}
      {msg.meta?.cached && (
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 text-amber-600 border-amber-300"
        >
          cached
        </Badge>
      )}

      {/* Daily remaining */}
      {msg.meta?.dailyRemaining !== undefined && (
        <span className="text-muted-foreground">
          remaining: {msg.meta.dailyRemaining}
        </span>
      )}
    </div>
  );
}
