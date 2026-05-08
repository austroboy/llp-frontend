"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ResizableImage } from "./extensions/resizable-image";
import { ResizableYoutube } from "./extensions/resizable-youtube";
import TiptapLink from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { common, createLowlight } from "lowlight";
import { Callout } from "./extensions/callout";
import { Vimeo } from "./extensions/vimeo";
import { EditorToolbar } from "./toolbar";
import { SlashCommandMenu } from "./slash-command";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link,
} from "lucide-react";

const lowlight = createLowlight(common);

interface TiptapEditorProps {
  content: string; // JSON string or empty string
  onChange: (jsonString: string) => void;
  onImageUpload: (file: File) => Promise<string>;
  placeholder?: string;
  className?: string;
}

function BubbleToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updateBubble = () => {
      const { from, to, empty } = editor.state.selection;

      if (empty || from === to) {
        setVisible(false);
        return;
      }

      // Don't show for node selections (images, etc.)
      if ("node" in editor.state.selection) {
        setVisible(false);
        return;
      }

      try {
        const fromCoords = editor.view.coordsAtPos(from);
        const toCoords = editor.view.coordsAtPos(to);

        const wrapperEl = editor.view.dom.closest(".tiptap-editor-wrapper");
        if (!wrapperEl) return;
        const wrapperRect = wrapperEl.getBoundingClientRect();

        const centerX = (fromCoords.left + toCoords.right) / 2 - wrapperRect.left;
        const top = fromCoords.top - wrapperRect.top - 44; // 44px above selection

        setPosition({
          top: Math.max(0, top),
          left: Math.max(8, centerX - 100), // rough center, clamp left
        });
        setVisible(true);
      } catch {
        setVisible(false);
      }
    };

    editor.on("selectionUpdate", updateBubble);
    editor.on("transaction", updateBubble);

    return () => {
      editor.off("selectionUpdate", updateBubble);
      editor.off("transaction", updateBubble);
    };
  }, [editor]);

  const handleLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor || !visible) return null;

  const iconSize = 14;

  const buttons = [
    {
      key: "bold",
      icon: <Bold size={iconSize} />,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      title: "Bold",
    },
    {
      key: "italic",
      icon: <Italic size={iconSize} />,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      title: "Italic",
    },
    {
      key: "underline",
      icon: <UnderlineIcon size={iconSize} />,
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: editor.isActive("underline"),
      title: "Underline",
    },
    {
      key: "strike",
      icon: <Strikethrough size={iconSize} />,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive("strike"),
      title: "Strikethrough",
    },
    {
      key: "code",
      icon: <Code size={iconSize} />,
      action: () => editor.chain().focus().toggleCode().run(),
      active: editor.isActive("code"),
      title: "Code",
    },
    {
      key: "link",
      icon: <Link size={iconSize} />,
      action: handleLink,
      active: editor.isActive("link"),
      title: "Link",
    },
  ];

  return (
    <div
      ref={ref}
      className="absolute z-50 flex items-center gap-0.5 rounded-lg border bg-card p-1 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {buttons.map((btn) => (
        <button
          key={btn.key}
          type="button"
          onClick={btn.action}
          title={btn.title}
          className={cn(
            "flex size-7 items-center justify-center rounded transition-colors",
            btn.active
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}

export function TiptapEditor({
  content,
  onChange,
  onImageUpload,
  placeholder = "Start writing... Type / for commands",
  className,
}: TiptapEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const parsedContent = (() => {
    if (!content) return undefined;
    try {
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  })();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      ResizableImage.configure({
        allowBase64: false,
        resize: {
          enabled: true,
          directions: ['bottom-right', 'bottom-left'],
          minWidth: 100,
          minHeight: 50,
          alwaysPreserveAspectRatio: true,
        },
      }),
      ResizableYoutube.configure({
        nocookie: true,
        inline: false,
      }),
      TiptapLink.configure({
        openOnClick: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Callout,
      Vimeo,
    ],
    content: parsedContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none px-4 py-3 min-h-[400px] focus:outline-none",
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !event.dataTransfer?.files.length) return false;

        const file = event.dataTransfer.files[0];
        if (!file?.type.startsWith("image/")) return false;

        event.preventDefault();

        const coordinates = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });

        onImageUpload(file)
          .then((url) => {
            if (coordinates) {
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: url });
              const tr = view.state.tr.insert(coordinates.pos, node);
              view.dispatch(tr);
            }
          })
          .catch((err) => console.error("Image drop upload failed:", err));

        return true;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;

            onImageUpload(file)
              .then((url) => {
                const { schema } = view.state;
                const node = schema.nodes.image.create({ src: url });
                const tr = view.state.tr.replaceSelectionWith(node);
                view.dispatch(tr);
              })
              .catch((err) => console.error("Image paste upload failed:", err));

            return true;
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChangeRef.current(JSON.stringify(ed.getJSON()));
    },
    immediatelyRender: false,
  });

  // Sync external content changes (only if content differs from current state)
  const initialContent = useRef(content);
  useEffect(() => {
    if (!editor || content === initialContent.current) return;
    initialContent.current = content;

    if (!content) return;
    try {
      const parsed = JSON.parse(content);
      const current = JSON.stringify(editor.getJSON());
      if (JSON.stringify(parsed) !== current) {
        editor.commands.setContent(parsed, { emitUpdate: false });
      }
    } catch {
      // invalid JSON, ignore
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className={cn("tiptap-editor-wrapper relative rounded-lg border bg-background", className)}>
      <EditorToolbar editor={editor} onImageUpload={onImageUpload} />

      <SlashCommandMenu editor={editor} onImageUpload={onImageUpload} />

      <BubbleToolbar editor={editor} />

      <EditorContent editor={editor} />
    </div>
  );
}
