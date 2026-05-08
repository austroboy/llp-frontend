"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  PlusSquareIcon,
  MinusSquareIcon,
  PlusIcon,
  MinusIcon,
  QuoteIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ResponseSchemaCitation,
  ResponseSchemaTier,
} from "@/lib/documents/response-schema";

interface ToolbarProps {
  editor: Editor | null;
  tier: ResponseSchemaTier;
  citations: ResponseSchemaCitation[];
  format: "docx" | "pdf" | "pptx" | "xlsx";
}

// Toolbar — sticky above the editor body. Implements SPEC-01 §4.
// Blocked surfaces (color, font, align, hyperlink, image, raw HTML
// paste, code blocks) are simply absent from the button list.

export function Toolbar({ editor, tier, citations, format }: ToolbarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const isTableAware = useMemo(() => {
    if (!editor) return false;
    const selected = editor.state.selection.$from.node();
    const name = selected?.type?.name;
    return name === "inlineTable" || name === "sheetGrid";
  }, [editor, editor?.state?.selection]);

  const insideSection = useMemo(() => {
    if (!editor) return false;
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === "section") return true;
    }
    return false;
  }, [editor, editor?.state?.selection]);

  const xlsxOnly = format === "xlsx";
  const canInsertCitation = tier === 1 && citations.length > 0;

  const btn = (
    icon: ReactNode,
    label: string,
    onClick: () => void,
    opts: { active?: boolean; disabled?: boolean; shortcut?: string } = {},
  ) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={opts.active ? "true" : undefined}
      title={opts.shortcut ? `${label} (${opts.shortcut})` : label}
      onMouseDown={(e) => {
        e.preventDefault();
        if (!opts.disabled) onClick();
      }}
      disabled={opts.disabled}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md transition-colors",
        "hover:bg-amber-500/10 hover:text-amber-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
        opts.active && "bg-amber-500/15 text-amber-500",
        opts.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-inherit",
      )}
    >
      {icon}
    </button>
  );

  const addSection = useCallback(() => {
    if (!editor) return;
    const { $from } = editor.state.selection;
    let insertPos = editor.state.doc.content.size;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === "section") {
        insertPos = $from.after(d);
        break;
      }
    }
    editor
      .chain()
      .focus()
      .insertContentAt(insertPos, {
        type: "section",
        attrs: { locked: false },
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "New section" }],
          },
          { type: "paragraph" },
        ],
      })
      .run();
  }, [editor]);

  const deleteSection = useCallback(() => {
    if (!editor) return;
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === "section") {
        if (node.attrs.locked) return;
        const hasContent = node.childCount > 1;
        if (
          hasContent &&
          !window.confirm("Delete this section and its contents?")
        ) {
          return;
        }
        const from = $from.before(d);
        const to = $from.after(d);
        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .run();
        return;
      }
    }
  }, [editor]);

  if (!editor) {
    return (
      <div
        role="toolbar"
        className="flex flex-wrap items-center gap-1 border-b border-white/[0.07] bg-white/[0.02] px-2 py-1 opacity-40"
        aria-busy
      />
    );
  }

  const headingActive = (level: 1 | 2 | 3) =>
    editor.isActive("heading", { level });

  return (
    <div
      role="toolbar"
      aria-label="Canvas formatting"
      className={cn(
        "sticky top-0 z-10",
        "flex flex-wrap items-center gap-1",
        "border-b border-white/[0.07] bg-background/95 backdrop-blur px-2 py-1",
      )}
    >
      {!xlsxOnly && (
        <>
          {btn(
            <BoldIcon className="size-4" />,
            "Bold",
            () => editor.chain().focus().toggleBold().run(),
            { active: editor.isActive("bold"), shortcut: "⌘B" },
          )}
          {btn(
            <ItalicIcon className="size-4" />,
            "Italic",
            () => editor.chain().focus().toggleItalic().run(),
            { active: editor.isActive("italic"), shortcut: "⌘I" },
          )}
          {btn(
            <UnderlineIcon className="size-4" />,
            "Underline",
            () => editor.chain().focus().toggleUnderline().run(),
            { active: editor.isActive("underline"), shortcut: "⌘U" },
          )}

          <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />

          {btn(
            <Heading1Icon className="size-4" />,
            "Heading 1",
            () =>
              editor.chain().focus().toggleHeading({ level: 1 }).run(),
            { active: headingActive(1) },
          )}
          {btn(
            <Heading2Icon className="size-4" />,
            "Heading 2",
            () =>
              editor.chain().focus().toggleHeading({ level: 2 }).run(),
            { active: headingActive(2) },
          )}
          {btn(
            <Heading3Icon className="size-4" />,
            "Heading 3",
            () =>
              editor.chain().focus().toggleHeading({ level: 3 }).run(),
            { active: headingActive(3) },
          )}

          <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />

          {btn(
            <ListIcon className="size-4" />,
            "Bullet list",
            () => editor.chain().focus().toggleBulletList().run(),
            { active: editor.isActive("bulletList") },
          )}
          {btn(
            <ListOrderedIcon className="size-4" />,
            "Ordered list",
            () => editor.chain().focus().toggleOrderedList().run(),
            { active: editor.isActive("orderedList") },
          )}

          <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />

          {btn(
            <PlusSquareIcon className="size-4" />,
            "Add section",
            addSection,
          )}
          {btn(
            <MinusSquareIcon className="size-4" />,
            "Delete section",
            deleteSection,
            { disabled: !insideSection },
          )}

          <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
        </>
      )}

      {btn(
        <PlusIcon className="size-4" />,
        "Add row",
        () => {
          if (editor.isActive("sheetGrid")) {
            editor.chain().focus().sheetGridAddRow().run();
          } else if (editor.isActive("inlineTable")) {
            editor.chain().focus().inlineTableAddRow().run();
          }
        },
        { disabled: !isTableAware },
      )}
      {btn(
        <MinusIcon className="size-4" />,
        "Delete row",
        () => {
          if (editor.isActive("sheetGrid")) {
            editor.chain().focus().sheetGridDeleteRow(0).run();
          } else if (editor.isActive("inlineTable")) {
            editor.chain().focus().inlineTableDeleteRow(0).run();
          }
        },
        { disabled: !isTableAware },
      )}

      {tier === 1 && (
        <>
          <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
          <div className="relative">
            {btn(
              <QuoteIcon className="size-4" />,
              "Insert citation",
              () => setPickerOpen((o) => !o),
              {
                active: pickerOpen,
                disabled: !canInsertCitation,
                shortcut: "⌘K",
              },
            )}
            {pickerOpen && canInsertCitation && (
              <CitationPicker
                citations={citations}
                onPick={(idx) => {
                  const c = citations[idx];
                  const label = `§${c.section}`;
                  editor
                    .chain()
                    .focus()
                    .insertCitationChip({ index: idx, text: label })
                    .run();
                  setPickerOpen(false);
                }}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CitationPicker({
  citations,
  onPick,
  onClose,
}: {
  citations: ResponseSchemaCitation[];
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Insert citation"
      className={cn(
        "absolute left-0 top-full mt-1 z-20 w-80 max-h-72 overflow-auto",
        "rounded-md border border-white/[0.1] bg-background shadow-xl",
        "p-1",
      )}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      {citations.map((c, i) => (
        <button
          key={i}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(i);
          }}
          className={cn(
            "block w-full rounded px-2 py-1.5 text-left text-sm",
            "hover:bg-amber-500/10",
            "focus-visible:outline-none focus-visible:bg-amber-500/15",
          )}
        >
          <div className="font-mono text-[11px] text-amber-500">
            {c.doc_id} §{c.section}
          </div>
          <div className="line-clamp-2 text-xs text-muted-foreground">
            {c.quote}
          </div>
        </button>
      ))}
    </div>
  );
}
