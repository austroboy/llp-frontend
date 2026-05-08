"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { cn } from "@/lib/utils";

export function SignatureBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const role = (node.attrs.role as string) ?? "";
  const name = (node.attrs.name as string) ?? "";
  const designation = (node.attrs.designation as string) ?? "";
  const date = (node.attrs.date as string) ?? "";
  const readOnly = !editor.isEditable;

  const inputClass = cn(
    "w-full bg-transparent border-0 border-b border-white/[0.07] px-1 py-1 text-sm outline-none",
    "focus:border-amber-500/60 focus:ring-0",
    "placeholder:text-muted-foreground/40",
  );

  return (
    <NodeViewWrapper
      data-canvas-node="signature-block"
      className={cn(
        "canvas-signature-block mt-8 mb-4",
        "rounded-md border border-white/[0.07] p-3",
      )}
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <label className="col-span-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Role
          </span>
          <input
            type="text"
            value={role}
            readOnly={readOnly}
            onChange={(e) => updateAttributes({ role: e.target.value })}
            className={inputClass}
            placeholder="Signatory role"
          />
        </label>
        <label>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Name
          </span>
          <input
            type="text"
            value={name}
            readOnly={readOnly}
            onChange={(e) => updateAttributes({ name: e.target.value })}
            className={inputClass}
            placeholder="Full name"
          />
        </label>
        <label>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Designation
          </span>
          <input
            type="text"
            value={designation}
            readOnly={readOnly}
            onChange={(e) =>
              updateAttributes({ designation: e.target.value })
            }
            className={inputClass}
            placeholder="Designation"
          />
        </label>
        <label className="col-span-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Date
          </span>
          <input
            type="text"
            value={date}
            readOnly={readOnly}
            onChange={(e) => updateAttributes({ date: e.target.value })}
            className={inputClass}
            placeholder="YYYY-MM-DD"
          />
        </label>
      </div>
    </NodeViewWrapper>
  );
}
