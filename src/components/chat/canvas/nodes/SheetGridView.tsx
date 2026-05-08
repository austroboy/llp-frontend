"use client";

import {
  useRef,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { cn } from "@/lib/utils";

type Cell = string | number | null;

const SOFT_ROW_LIMIT = 500;
const HARD_ROW_LIMIT = 2000;

export function SheetGridView({ node, updateAttributes, editor }: NodeViewProps) {
  const name = (node.attrs.name as string) ?? "";
  const columns = ((node.attrs.columns as string[]) ?? []).map((c) =>
    typeof c === "string" ? c : String(c),
  );
  const rows = (node.attrs.rows as Cell[][]) ?? [];
  const readOnly = !editor.isEditable;
  const cellRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const focusCell = (r: number, c: number) => {
    const clampedR = Math.max(0, Math.min(rows.length - 1, r));
    const clampedC = Math.max(0, Math.min(columns.length - 1, c));
    cellRefs.current[clampedR]?.[clampedC]?.focus();
  };

  const updateCell = (r: number, c: number, value: string) => {
    const next = rows.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : [...row],
    );
    updateAttributes({ rows: next });
  };

  const addRow = () => {
    if (rows.length >= HARD_ROW_LIMIT) return;
    const newRow = columns.map(() => "");
    updateAttributes({ rows: [...rows, newRow] });
  };

  const deleteRow = (rowIdx: number) => {
    const row = rows[rowIdx];
    const hasData =
      Array.isArray(row) && row.some((cell) => cell != null && cell !== "");
    if (hasData && !window.confirm(`Delete row ${rowIdx + 1}? It contains data.`)) {
      return;
    }
    updateAttributes({ rows: rows.filter((_, i) => i !== rowIdx) });
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    r: number,
    c: number,
  ) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(r - 1, c);
    } else if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey && e.key === "Enter") {
        focusCell(r - 1, c);
      } else {
        focusCell(r + 1, c);
      }
    } else if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      focusCell(r, c - 1);
    } else if (
      e.key === "ArrowRight" &&
      e.currentTarget.selectionEnd === e.currentTarget.value.length
    ) {
      e.preventDefault();
      focusCell(r, c + 1);
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        if (c > 0) focusCell(r, c - 1);
        else if (r > 0) focusCell(r - 1, columns.length - 1);
      } else {
        if (c < columns.length - 1) focusCell(r, c + 1);
        else if (r < rows.length - 1) focusCell(r + 1, 0);
      }
    }
  };

  const atSoftLimit = rows.length >= SOFT_ROW_LIMIT;
  const atHardLimit = rows.length >= HARD_ROW_LIMIT;

  return (
    <NodeViewWrapper
      data-canvas-node="sheet-grid"
      className={cn("canvas-sheet-grid my-4")}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <input
          type="text"
          value={name}
          readOnly={readOnly}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateAttributes({ name: e.target.value })
          }
          aria-label="Sheet name"
          className={cn(
            "bg-transparent border-0 outline-none text-sm font-semibold",
            "focus:ring-0",
          )}
          placeholder="Sheet name"
        />
        {!readOnly && (
          <button
            type="button"
            onClick={addRow}
            disabled={atHardLimit}
            title={
              atSoftLimit
                ? "Sheets over 500 rows perform poorly in the canvas."
                : "Add row"
            }
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-white/[0.08] px-2 py-1",
              "text-[11px] font-medium transition-colors",
              "hover:bg-amber-500/10 hover:border-amber-500/40",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            + Row
          </button>
        )}
      </div>
      <div
        className="overflow-auto rounded-md border border-white/[0.07]"
        role="grid"
        aria-rowcount={rows.length + 1}
        aria-colcount={columns.length}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr role="row">
              <th
                scope="col"
                className="w-10 border-b border-white/[0.07] bg-white/[0.04] px-2 py-2 text-center font-mono text-[10px] text-muted-foreground"
                aria-label="Row"
              >
                #
              </th>
              {columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  role="columnheader"
                  aria-colindex={i + 1}
                  title="Column headers are locked"
                  className={cn(
                    "border-b border-white/[0.07] bg-white/[0.04] px-3 py-2 text-left",
                    "font-mono text-[11px] uppercase tracking-wider text-muted-foreground",
                  )}
                >
                  {col}
                </th>
              ))}
              <th className="w-10 border-b border-white/[0.07] bg-white/[0.04]" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} role="row" aria-rowindex={r + 2}>
                <td className="border-t border-white/[0.05] px-2 py-1 text-center font-mono text-[10px] text-muted-foreground/60">
                  {r + 1}
                </td>
                {columns.map((_, c) => {
                  if (!cellRefs.current[r]) cellRefs.current[r] = [];
                  const val = row?.[c];
                  return (
                    <td
                      key={c}
                      role="gridcell"
                      aria-colindex={c + 1}
                      aria-rowindex={r + 2}
                      className="border-t border-white/[0.05] p-0 align-top"
                    >
                      <input
                        ref={(el) => {
                          if (!cellRefs.current[r]) cellRefs.current[r] = [];
                          cellRefs.current[r][c] = el;
                        }}
                        type="text"
                        value={val == null ? "" : String(val)}
                        readOnly={readOnly}
                        onChange={(e) => updateCell(r, c, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, r, c)}
                        className={cn(
                          "w-full bg-transparent px-3 py-2 text-sm outline-none",
                          "focus:bg-amber-500/10",
                        )}
                      />
                    </td>
                  );
                })}
                <td className="border-t border-white/[0.05] px-1 py-1 text-center">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => deleteRow(r)}
                      aria-label={`Delete row ${r + 1}`}
                      title="Delete row"
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] opacity-40",
                        "hover:bg-red-500/10 hover:text-red-400 hover:opacity-100",
                        "transition-all",
                      )}
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {atSoftLimit && !atHardLimit && (
        <p className="mt-1 text-[11px] text-amber-500/80">
          Sheets over {SOFT_ROW_LIMIT} rows perform poorly in the canvas.
        </p>
      )}
    </NodeViewWrapper>
  );
}
