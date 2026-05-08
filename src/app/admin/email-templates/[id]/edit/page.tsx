"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CodeMirror from "@uiw/react-codemirror";
import { html as htmlLang } from "@codemirror/lang-html";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { readJson } from "@/lib/http";
import { motion, MotionConfig, type Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};
const inViewOnce = { once: true, margin: "-72px 0px" } as const;

interface OverrideSeed {
  templateId: string;
  name: string;
  category: string;
  subject: string;
  defaultSubject: string;
  defaultHtml: string;
  params: string[];
  sample: Record<string, unknown>;
  override: {
    html: string;
    subject: string;
    updatedAt: number;
    updatedByEmail?: string;
  } | null;
}

export default function EditEmailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [seed, setSeed] = useState<OverrideSeed | null>(null);
  const [html, setHtml] = useState("");
  const [subject, setSubject] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const editorRef = useRef<{
    view?: {
      dispatch: (t: unknown) => void;
      state: { selection: { main: { from: number; to: number } } };
    };
  } | null>(null);

  const fetchSeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/email-templates?action=override&id=${encodeURIComponent(id)}`
      );
      const data = await readJson<OverrideSeed & { error?: string }>(res);
      if (data.error) throw new Error(data.error);
      const s = data as OverrideSeed;
      setSeed(s);
      const startHtml = s.override?.html ?? s.defaultHtml ?? "";
      const startSubject = s.override?.subject ?? s.defaultSubject ?? "";
      setHtml(startHtml);
      setSubject(startSubject);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load template";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSeed();
  }, [fetchSeed]);

  // Debounced live preview
  useEffect(() => {
    if (!seed) return;
    const handle = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch("/api/admin/email-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview",
            id,
            draftHtml: html,
            draftSubject: subject,
            data: seed.sample,
          }),
        });
        const result = await readJson<{ error?: string; html?: string; subject?: string }>(res);
        if (result.error) throw new Error(result.error);
        setPreviewHtml(result.html || "");
        setPreviewSubject(result.subject || "");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Preview failed";
        toast.error(msg);
      } finally {
        setPreviewLoading(false);
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [html, subject, seed, id]);

  const missingTokens = useMemo(() => {
    if (!seed) return [];
    const required = seed.params || [];
    const combined = `${html}\n${subject}`;
    return required.filter(
      (token) => !new RegExp(`{{\\s*${token.replace(/\./g, "\\.")}\\s*}}`).test(combined)
    );
  }, [seed, html, subject]);

  const isDirty = useMemo(() => {
    if (!seed) return false;
    const origHtml = seed.override?.html ?? seed.defaultHtml ?? "";
    const origSubject = seed.override?.subject ?? seed.defaultSubject ?? "";
    return html !== origHtml || subject !== origSubject;
  }, [seed, html, subject]);

  const insertToken = useCallback((token: string) => {
    const insertion = `{{${token}}}`;
    const view = editorRef.current?.view;
    if (view) {
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: insertion },
        selection: { anchor: from + insertion.length },
      });
    } else {
      setHtml((prev) => prev + insertion);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!seed) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-override",
          id,
          html,
          subject,
        }),
      });
      const result = await readJson<{
        error?: string;
        sanitizedHtml?: string;
        missingTokens?: string[];
      }>(res);
      if (result.error) throw new Error(result.error);
      if (result.sanitizedHtml && result.sanitizedHtml !== html) {
        setHtml(result.sanitizedHtml);
      }
      if (Array.isArray(result.missingTokens) && result.missingTokens.length) {
        toast.warning(
          `Saved — ${result.missingTokens.length} required token(s) missing: ${result.missingTokens.join(", ")}`
        );
      } else {
        toast.success("Override saved");
      }
      await fetchSeed();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [id, html, subject, seed, fetchSeed]);

  const handleRestoreDefault = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-override", id }),
      });
      const result = await readJson<{ error?: string }>(res);
      if (result.error) throw new Error(result.error);
      toast.success("Restored default template");
      setRestoreOpen(false);
      await fetchSeed();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Restore failed";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }, [id, fetchSeed]);

  const handleDiscard = useCallback(() => {
    if (!seed) return;
    setHtml(seed.override?.html ?? seed.defaultHtml ?? "");
    setSubject(seed.override?.subject ?? seed.defaultSubject ?? "");
    setDiscardOpen(false);
  }, [seed]);

  const handleSendTest = useCallback(async () => {
    if (!seed) return;
    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-test",
          id,
          data: seed.sample,
          draftHtml: html,
          draftSubject: subject,
        }),
      });
      const result = await readJson<{ error?: string; sentTo?: string }>(res);
      if (result.error) throw new Error(result.error);
      toast.success(`Test email sent to ${result.sentTo || "admin"}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send test";
      toast.error(msg);
    } finally {
      setSendingTest(false);
    }
  }, [id, html, subject, seed]);

  if (loading) {
    return (
      <MotionConfig reducedMotion="user">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
            <Skeleton className="h-[600px] w-full rounded-xl" />
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </div>
        </div>
      </MotionConfig>
    );
  }

  if (!seed) {
    return (
      <MotionConfig reducedMotion="user">
        <div
          className="lf-card"
          style={{ padding: "var(--s-6)", textAlign: "center", borderStyle: "dashed" }}
        >
          <p
            style={{
              fontFamily: "var(--lf-display)",
              fontStyle: "italic",
              color: "var(--ink-3)",
              margin: 0,
            }}
          >
            Template not found.
          </p>
        </div>
      </MotionConfig>
    );
  }

  const hasOverride = !!seed.override;

  return (
    <MotionConfig reducedMotion="user">
      {/* Hero */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-5)" }}
      >
        <motion.div variants={fadeUp}>
          <Link
            href="/admin/email-templates"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--ink-4)",
              textDecoration: "none",
              marginBottom: "var(--s-2)",
              transition: "color 200ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-4)")}
          >
            <ArrowLeft className="size-3" />
            Back to templates
          </Link>
        </motion.div>
        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ 4.4</span>
          Admin · Email templates · Edit
        </motion.div>
        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "var(--s-3) 0 var(--s-2)",
            display: "flex",
            alignItems: "center",
            gap: "var(--s-2)",
            flexWrap: "wrap",
          }}
        >
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
            {seed.name}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {seed.category}
          </Badge>
          {hasOverride ? (
            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Overridden
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Default
            </Badge>
          )}
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="lf-meta"
          style={{ fontFamily: "var(--lf-mono)", marginBottom: "var(--s-4)" }}
        >
          {seed.templateId}
        </motion.p>

        <motion.div
          variants={fadeUp}
          style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", flexWrap: "wrap" }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTest}
            disabled={sendingTest}
          >
            {sendingTest ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <Send className="mr-1 size-3" />
            )}
            Send Test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDiscardOpen(true)}
            disabled={!isDirty}
          >
            <RotateCcw className="mr-1 size-3" />
            Discard
          </Button>
          {hasOverride && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setRestoreOpen(true)}
              disabled={deleting}
            >
              <Trash2 className="mr-1 size-3" />
              Restore Default
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <Save className="mr-1 size-3" />
            )}
            Save
          </Button>
        </motion.div>
      </motion.section>

      {/* Token palette */}
      {seed.params.length > 0 && (
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={inViewOnce}
          style={{ marginBottom: "var(--s-3)" }}
        >
          <motion.div variants={fadeUp} className="lf-card" style={{ padding: "var(--s-3)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--s-2)",
                marginBottom: "var(--s-2)",
                flexWrap: "wrap",
              }}
            >
              <span className="lf-meta" style={{ textTransform: "uppercase" }}>
                Available tokens
              </span>
              {missingTokens.length > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    color: "var(--bronze)",
                    fontFamily: "var(--lf-mono)",
                  }}
                >
                  <AlertTriangle className="size-3" />
                  {missingTokens.length} missing: {missingTokens.join(", ")}
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    color: "var(--emerald)",
                    fontFamily: "var(--lf-mono)",
                  }}
                >
                  <CheckCircle2 className="size-3" />
                  All tokens used
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {seed.params.map((token) => {
                const isMissing = missingTokens.includes(token);
                return (
                  <button
                    key={token}
                    type="button"
                    onClick={() => insertToken(token)}
                    style={{
                      fontFamily: "var(--lf-mono)",
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: "var(--r-sm)",
                      border: `1px solid ${isMissing ? "var(--bronze)" : "var(--line-2)"}`,
                      background: isMissing ? "var(--bronze-ghost, rgba(180, 132, 76, 0.08))" : "var(--glass-bg)",
                      color: isMissing ? "var(--bronze)" : "var(--ink-2)",
                      cursor: "pointer",
                      transition: "background 200ms",
                    }}
                    title="Click to insert at cursor"
                  >
                    {`{{${token}}}`}
                  </button>
                );
              })}
            </div>
            <p
              className="lf-meta"
              style={{ marginTop: "var(--s-2)", fontSize: 10 }}
            >
              Click to insert at the cursor. Tokens get substituted with live data when the email is sent. Unknown tokens are left literal.
            </p>
          </motion.div>
        </motion.section>
      )}

      {/* Subject */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-3)" }}
      >
        <motion.div
          variants={fadeUp}
          className="lf-card"
          style={{ padding: "var(--s-3)", display: "flex", flexDirection: "column", gap: 4 }}
        >
          <label
            className="lf-meta"
            style={{ textTransform: "uppercase", color: "var(--ink-4)" }}
          >
            Subject
          </label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="font-mono text-sm"
            placeholder={seed.defaultSubject}
          />
          {subject !== seed.defaultSubject && (
            <p className="lf-meta" style={{ fontSize: 10 }}>
              Default: <span style={{ fontFamily: "var(--lf-mono)" }}>{seed.defaultSubject}</span>
            </p>
          )}
        </motion.div>
      </motion.section>

      {/* Editor + Preview split */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-3)" }}
      >
        <motion.div
          variants={fadeUp}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "var(--s-3)",
          }}
        >
          {/* Editor */}
          <div
            className="lf-card"
            style={{
              overflow: "hidden",
              padding: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--line-1)",
                padding: "var(--s-2) var(--s-3)",
              }}
            >
              <span className="lf-meta" style={{ textTransform: "uppercase" }}>
                HTML
              </span>
              <span className="lf-meta" style={{ fontSize: 10 }}>
                {html.length.toLocaleString()} chars
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 600, maxHeight: "80vh", overflow: "auto" }}>
              <CodeMirror
                ref={editorRef as unknown as React.Ref<never>}
                value={html}
                onChange={setHtml}
                extensions={[htmlLang()]}
                theme="dark"
                height="600px"
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  highlightActiveLine: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                }}
              />
            </div>
          </div>

          {/* Preview */}
          <div
            className="lf-card"
            style={{
              overflow: "hidden",
              padding: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--line-1)",
                padding: "var(--s-2) var(--s-3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span className="lf-meta" style={{ textTransform: "uppercase" }}>
                  Preview
                </span>
                {previewLoading && (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <span
                className="lf-meta"
                style={{
                  fontSize: 10,
                  maxWidth: "50%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Subject: <span style={{ fontFamily: "var(--lf-mono)" }}>{previewSubject}</span>
              </span>
            </div>
            <div
              style={{
                flex: 1,
                background: "var(--paper-inner)",
                padding: "var(--s-3)",
              }}
            >
              {previewHtml ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "var(--paper)",
                    borderRadius: "var(--r-md)",
                    border: "1px solid var(--line-1)",
                    overflow: "hidden",
                  }}
                >
                  <iframe
                    srcDoc={previewHtml}
                    title="Live preview"
                    style={{ width: "100%", height: 600, border: 0 }}
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    fontSize: 12,
                    color: "var(--ink-4)",
                  }}
                >
                  {previewLoading ? "Rendering…" : "No preview yet"}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Sample data reference */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-3)" }}
      >
        <motion.div
          variants={fadeUp}
          className="lf-card"
          style={{ padding: "var(--s-3)" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--s-2)",
              flexWrap: "wrap",
              gap: "var(--s-2)",
            }}
          >
            <span className="lf-meta" style={{ textTransform: "uppercase" }}>
              Sample data used for preview
            </span>
            <span className="lf-meta" style={{ fontSize: 10 }}>
              Read-only — edit in templates tab for custom values
            </span>
          </div>
          <ScrollArea className="max-h-[200px]">
            <pre
              style={{
                fontSize: 11,
                fontFamily: "var(--lf-mono)",
                color: "var(--ink-3)",
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {JSON.stringify(seed.sample, null, 2)}
            </pre>
          </ScrollArea>
        </motion.div>
      </motion.section>

      {/* Override metadata */}
      {seed.override && (
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={inViewOnce}
          style={{ marginBottom: "var(--s-4)" }}
        >
          <motion.div variants={fadeUp}>
            <Separator />
            <p className="lf-meta" style={{ fontSize: 11, marginTop: "var(--s-3)" }}>
              Last edited{" "}
              <strong>{new Date(seed.override.updatedAt).toLocaleString()}</strong>
              {seed.override.updatedByEmail
                ? ` by ${seed.override.updatedByEmail}`
                : ""}
              .
            </p>
          </motion.div>
        </motion.section>
      )}

      {/* Restore default dialog */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore default template?</DialogTitle>
            <DialogDescription>
              This will delete the saved override and revert to the built-in
              {" "}<span style={{ fontFamily: "var(--lf-mono)" }}>{seed.templateId}</span> template.
              Future emails will use the hard-coded default until a new override
              is saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRestoreOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRestoreDefault}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <Trash2 className="mr-1 size-3" />
              )}
              Restore default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard dialog */}
      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Your edits to the HTML and subject will be reverted to the
              {hasOverride ? " last saved override" : " default template"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDiscardOpen(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={handleDiscard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MotionConfig>
  );
}
