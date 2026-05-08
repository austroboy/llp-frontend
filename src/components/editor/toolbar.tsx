"use client";

import { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  SquareCode,
  Table,
  Minus,
  ImagePlus,
  Video,
  AlertCircle,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalloutType } from "./extensions/callout";
import { CALLOUT_EMOJIS } from "./extensions/callout";

interface EditorToolbarProps {
  editor: Editor;
  onImageUpload: (file: File) => Promise<string>;
}

function ToolbarButton({
  onClick,
  isActive = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex size-7 items-center justify-center rounded transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}

export function EditorToolbar({ editor, onImageUpload }: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [calloutOpen, setCalloutOpen] = useState(false);
  const calloutRef = useRef<HTMLDivElement>(null);

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const url = await onImageUpload(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        console.error("Image upload failed:", err);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [editor, onImageUpload]
  );

  const handleLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const handleVideo = useCallback(() => {
    const url = window.prompt("Enter YouTube or Vimeo URL:");
    if (!url) return;

    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/
    );
    const vimeoMatch = url.match(/(?:vimeo\.com)\/(\d+)/);

    if (youtubeMatch) {
      editor.commands.setYoutubeVideo({ src: url });
    } else if (vimeoMatch) {
      editor.commands.setVimeoVideo(url);
    } else {
      window.alert("Could not detect YouTube or Vimeo URL.");
    }
  }, [editor]);

  const handleCallout = useCallback(
    (type: CalloutType) => {
      editor.commands.setCallout(type);
      setCalloutOpen(false);
    },
    [editor]
  );

  const iconSize = 15;

  const calloutOptions: { type: CalloutType; label: string; icon: React.ReactNode }[] = [
    { type: "info", label: `${CALLOUT_EMOJIS.info} Info`, icon: <AlertCircle size={14} /> },
    { type: "warning", label: `${CALLOUT_EMOJIS.warning} Warning`, icon: <AlertTriangle size={14} /> },
    { type: "tip", label: `${CALLOUT_EMOJIS.tip} Tip`, icon: <CheckCircle size={14} /> },
    { type: "danger", label: `${CALLOUT_EMOJIS.danger} Danger`, icon: <XCircle size={14} /> },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold"
      >
        <Bold size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic"
      >
        <Italic size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline"
      >
        <Underline size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="Inline Code"
      >
        <Code size={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={handleLink} isActive={editor.isActive("link")} title="Link">
        <Link size={iconSize} />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={iconSize} />
      </ToolbarButton>

      <Divider />

      {/* Block types */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numbered List"
      >
        <ListOrdered size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title="Code Block"
      >
        <SquareCode size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        title="Insert Table"
      >
        <Table size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus size={iconSize} />
      </ToolbarButton>

      <Divider />

      {/* Media */}
      <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Upload Image">
        <ImagePlus size={iconSize} />
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      <ToolbarButton onClick={handleVideo} title="Embed Video">
        <Video size={iconSize} />
      </ToolbarButton>

      <Divider />

      {/* Callout dropdown */}
      <div className="relative" ref={calloutRef}>
        <button
          type="button"
          onClick={() => setCalloutOpen((v) => !v)}
          title="Insert Callout"
          className={cn(
            "flex h-7 items-center gap-0.5 rounded px-1.5 text-xs transition-colors",
            calloutOpen
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <AlertCircle size={14} />
          <span className="hidden sm:inline">Callout</span>
          <ChevronDown size={12} />
        </button>

        {calloutOpen && (
          <>
            {/* Invisible overlay to close dropdown */}
            <div className="fixed inset-0 z-40" onClick={() => setCalloutOpen(false)} />
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border bg-card p-1 shadow-lg">
              {calloutOptions.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleCallout(opt.type)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
