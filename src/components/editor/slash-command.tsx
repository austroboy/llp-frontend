"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Video,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  SquareCode,
  Quote,
  List,
  ListOrdered,
  Table,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlashCommandItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  action: (editor: Editor) => void;
}

interface SlashCommandMenuProps {
  editor: Editor;
  onImageUpload: (file: File) => Promise<string>;
}

function createSlashItems(
  editor: Editor,
  onImageUpload: (file: File) => Promise<string>
): SlashCommandItem[] {
  const iconSize = 16;

  const triggerImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await onImageUpload(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    };
    input.click();
  };

  return [
    {
      key: "h1",
      label: "Heading 1",
      icon: <Heading1 size={iconSize} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      key: "h2",
      label: "Heading 2",
      icon: <Heading2 size={iconSize} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: "h3",
      label: "Heading 3",
      icon: <Heading3 size={iconSize} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      key: "image",
      label: "Image",
      icon: <ImagePlus size={iconSize} />,
      action: () => triggerImageUpload(),
    },
    {
      key: "youtube",
      label: "YouTube Video",
      icon: <Video size={iconSize} />,
      action: (ed) => {
        const url = window.prompt("Enter YouTube URL:");
        if (url) ed.commands.setYoutubeVideo({ src: url });
      },
    },
    {
      key: "vimeo",
      label: "Vimeo Video",
      icon: <Video size={iconSize} />,
      action: (ed) => {
        const url = window.prompt("Enter Vimeo URL:");
        if (url) ed.commands.setVimeoVideo(url);
      },
    },
    {
      key: "callout-info",
      label: "Info Callout",
      icon: <AlertCircle size={iconSize} />,
      action: (ed) => ed.commands.setCallout("info"),
    },
    {
      key: "callout-warning",
      label: "Warning",
      icon: <AlertTriangle size={iconSize} />,
      action: (ed) => ed.commands.setCallout("warning"),
    },
    {
      key: "callout-tip",
      label: "Tip",
      icon: <CheckCircle size={iconSize} />,
      action: (ed) => ed.commands.setCallout("tip"),
    },
    {
      key: "callout-danger",
      label: "Danger",
      icon: <XCircle size={iconSize} />,
      action: (ed) => ed.commands.setCallout("danger"),
    },
    {
      key: "code",
      label: "Code Block",
      icon: <SquareCode size={iconSize} />,
      action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      key: "quote",
      label: "Blockquote",
      icon: <Quote size={iconSize} />,
      action: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      key: "bullet",
      label: "Bullet List",
      icon: <List size={iconSize} />,
      action: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      key: "numbered",
      label: "Numbered List",
      icon: <ListOrdered size={iconSize} />,
      action: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      key: "table",
      label: "Table",
      icon: <Table size={iconSize} />,
      action: (ed) =>
        ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      key: "divider",
      label: "Divider",
      icon: <Minus size={iconSize} />,
      action: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },
  ];
}

export function SlashCommandMenu({ editor, onImageUpload }: SlashCommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [slashPos, setSlashPos] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = createSlashItems(editor, onImageUpload);
  const filteredItems = filterText
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(filterText.toLowerCase()) ||
          item.key.toLowerCase().includes(filterText.toLowerCase())
      )
    : items;

  // Delete the slash + filter text and execute the command
  const executeItem = useCallback(
    (item: SlashCommandItem) => {
      if (slashPos !== null) {
        const { state } = editor;
        const cursorPos = state.selection.from;
        // Delete from slash position to current cursor
        editor
          .chain()
          .focus()
          .deleteRange({ from: slashPos, to: cursorPos })
          .run();
      }
      item.action(editor);
      setIsOpen(false);
      setFilterText("");
      setSlashPos(null);
    },
    [editor, slashPos]
  );

  // Detect slash at start of block / after whitespace
  useEffect(() => {
    const handleTransaction = () => {
      const { state } = editor;
      const { from } = state.selection;
      const $from = state.doc.resolve(from);
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

      // Match "/" at the start of the text content or after a space
      const slashMatch = textBefore.match(/(?:^|\s)\/([^\s]*)$/);

      if (slashMatch) {
        // Calculate the absolute position of the "/" character
        const relativeSlashOffset = textBefore.length - slashMatch[0].length + (slashMatch[0].startsWith("/") ? 0 : 1);
        const absoluteSlashPos = from - $from.parentOffset + relativeSlashOffset;

        const filter = slashMatch[1] || "";
        setFilterText(filter);
        setSlashPos(absoluteSlashPos);
        setSelectedIndex(0);

        // Get coordinates for positioning
        try {
          const coords = editor.view.coordsAtPos(absoluteSlashPos);
          const editorRect = editor.view.dom.closest(".tiptap-editor-wrapper")?.getBoundingClientRect();
          if (editorRect) {
            setPosition({
              top: coords.bottom - editorRect.top + 4,
              left: coords.left - editorRect.left,
            });
          } else {
            setPosition({ top: coords.bottom + 4, left: coords.left });
          }
        } catch {
          // coordsAtPos can throw if position is invalid
        }

        setIsOpen(true);
      } else {
        if (isOpen) {
          setIsOpen(false);
          setFilterText("");
          setSlashPos(null);
        }
      }
    };

    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          executeItem(filteredItems[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        setFilterText("");
        setSlashPos(null);
      }
    };

    // Use capture to intercept before TipTap processes the keydown
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, filteredItems, selectedIndex, executeItem]);

  // Scroll selected item into view
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const selected = menuRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, isOpen]);

  if (!isOpen || filteredItems.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 max-h-[300px] min-w-[200px] overflow-y-auto rounded-lg border bg-card p-1 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {filteredItems.map((item, index) => (
        <button
          key={item.key}
          type="button"
          data-index={index}
          onClick={() => executeItem(item)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
            index === selectedIndex
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <span className="flex size-5 items-center justify-center text-muted-foreground">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
