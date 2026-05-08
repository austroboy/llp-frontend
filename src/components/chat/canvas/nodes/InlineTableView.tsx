"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { cn } from "@/lib/utils";

type Cell = string | number | null;

export function InlineTableView({ node, updateAttributes, editor }: NodeViewProps) {
  const columns = ((node.attrs.columns as string[]) ?? []).map((c) =>
    typeof c === "string" ? c : String(c),
  );
  const rows = (node.attrs.rows as Cell[][]) ?? [];
  const readOnly = !editor.isEditable;

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const next = rows.map((r, ri) =>
      ri === rowIdx
        ? r.map((c, ci) => (ci === colIdx ? value : c))
        : [...r],
    );
    updateAttributes({ rows: next });
  };

  return (
    <NodeViewWrapper
      data-canvas-node="inline-table"
      className={cn("canvas-inline-table my-3")}
    >
      <div className="overflow-x-auto rounded-md border border-white/[0.07]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-white/[0.04]">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    "px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wider",
                    "text-muted-foreground border-b border-white/[0.07]",
                  )}
                  scope="col"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className="border-t border-white/[0.05] p-0 align-top"
                  >
                    <input
                      type="text"
                      value={cell == null ? "" : String(cell)}
                      readOnly={readOnly}
                      onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                      className={cn(
                        "w-full bg-transparent px-3 py-2 text-sm outline-none",
                        "focus:bg-amber-500/10",
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </NodeViewWrapper>
  );
}
