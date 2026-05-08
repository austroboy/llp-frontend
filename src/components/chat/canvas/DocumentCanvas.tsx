"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import type { ResponseSchema } from "@/lib/documents/response-schema";
import { canvasCustomNodes } from "./nodes";
import { editorStateToSchema, schemaToEditorState } from "./schema-map";
import { Toolbar } from "./Toolbar";

export interface DocumentCanvasProps {
  draft: ResponseSchema;
  onChange?: (edited: ResponseSchema) => void;
  onSubmit?: (edited: ResponseSchema) => void;
  onClose?: () => void;
  language: "en" | "bn" | "mixed";
  readOnly?: boolean;
  className?: string;
}

const AUTOSAVE_DEBOUNCE_MS = 800;

export default function DocumentCanvas({
  draft,
  onChange,
  onSubmit,
  onClose,
  language,
  readOnly = false,
  className,
}: DocumentCanvasProps) {
  const [mounted, setMounted] = useState(false);
  const originalDraftRef = useRef(draft);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSchemaRef = useRef<ResponseSchema>(draft);

  useEffect(() => {
    originalDraftRef.current = draft;
    latestSchemaRef.current = draft;
  }, [draft]);

  const initialContent = useMemo(
    () => schemaToEditorState(draft),
    // Only on first mount — later updates flow through editor commands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const fontFamilyClass =
    language === "bn" || language === "mixed"
      ? "font-[var(--font-bengali)]"
      : "font-sans";

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return "Section heading";
          if (node.type.name === "paragraph") return "Write…";
          return "";
        },
      }),
      ...canvasCustomNodes,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        "aria-label": "Document canvas",
        role: "textbox",
        "aria-multiline": "true",
        class: cn(
          "canvas-prose outline-none focus:outline-none",
          "min-h-[60vh] px-6 py-6",
          fontFamilyClass,
        ),
      },
      // Plain-text only paste (SPEC-01 §4.2). Strip any HTML + images.
      handlePaste: (_view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;
        const text = clipboard.getData("text/plain");
        if (!text) return false;
        event.preventDefault();
        editor?.chain().focus().insertContent(text).run();
        return true;
      },
    },
    onCreate: () => setMounted(true),
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const next = editorStateToSchema(
          json as JSONContent,
          originalDraftRef.current,
        );
        latestSchemaRef.current = next;
        onChange?.(next);
      }, AUTOSAVE_DEBOUNCE_MS);
    },
  });

  const handleSubmit = useCallback(() => {
    if (!editor || !onSubmit) return;
    const json = editor.getJSON();
    const next = editorStateToSchema(
      json as JSONContent,
      originalDraftRef.current,
    );
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    latestSchemaRef.current = next;
    onChange?.(next);
    onSubmit(next);
  }, [editor, onChange, onSubmit]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const handler = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key === "Enter") {
        event.preventDefault();
        handleSubmit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };
    dom.addEventListener("keydown", handler);
    return () => {
      dom.removeEventListener("keydown", handler);
    };
  }, [editor, handleSubmit, onClose]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const citations = draft.citations ?? [];

  return (
    <div
      className={cn(
        "canvas-root flex flex-col w-full h-full",
        "bg-background text-foreground",
        className,
      )}
      data-canvas-format={draft.format}
      data-canvas-tier={draft.tier}
      data-canvas-language={language}
    >
      <Toolbar
        editor={editor}
        tier={draft.tier}
        citations={citations}
        format={draft.format}
      />
      <div className="relative flex-1 overflow-auto">
        {!mounted && <CanvasSkeleton />}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function CanvasSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="absolute inset-0 px-6 py-6 space-y-4"
    >
      <div className="h-8 w-3/5 animate-pulse rounded bg-white/[0.06]" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-2/5 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-full animate-pulse rounded bg-white/[0.04]" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-white/[0.04]" />
          <div className="h-3 w-9/12 animate-pulse rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}
