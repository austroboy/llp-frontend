"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { cn } from "@/lib/utils";

export function TitleBlockView({
  node,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const text = (node.attrs.text as string) ?? "";
  const readOnly = !editor.isEditable;

  return (
    <NodeViewWrapper
      data-canvas-node="title-block"
      className={cn(
        "canvas-title-block",
        "border-b border-white/[0.07] pb-4 mb-4",
      )}
    >
      <input
        type="text"
        value={text}
        readOnly={readOnly}
        onChange={(e) => updateAttributes({ text: e.target.value })}
        placeholder="Document title"
        aria-label="Document title"
        className={cn(
          "w-full bg-transparent border-0 outline-none",
          "text-2xl font-semibold tracking-tight text-foreground",
          "placeholder:text-muted-foreground/40",
          "focus:ring-0",
        )}
      />
    </NodeViewWrapper>
  );
}
