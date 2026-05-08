import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { SheetGridView } from "./SheetGridView";

// SheetGrid — xlsx-only. Carries one `sheets[i]` entry. Add/delete
// row and cell edits per SPEC-01 §5. Column ops locked: Phase-1
// decides the schema. Column-type enforcement (§5.4) is deferred —
// DB-07a landed sheets with `columns: string[]` (not {name,type}),
// so every column is treated as text.
// TODO: column-type enforcement pending schema evolution to
// {name, type} shape (DB-07a drift flag 1).

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sheetGrid: {
      sheetGridAddRow: () => ReturnType;
      sheetGridDeleteRow: (rowIndex: number) => ReturnType;
    };
  }
}

export const SheetGrid = Node.create({
  name: "sheetGrid",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      name: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-name") ?? "",
        renderHTML: (a) => ({ "data-name": a.name ?? "" }),
      },
      columns: {
        default: [] as string[],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-columns");
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        },
        renderHTML: (a) => ({
          "data-columns": JSON.stringify(a.columns ?? []),
        }),
      },
      rows: {
        default: [] as Array<Array<string | number | null>>,
        parseHTML: (el) => {
          const raw = el.getAttribute("data-rows");
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        },
        renderHTML: (a) => ({
          "data-rows": JSON.stringify(a.rows ?? []),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-canvas-node='sheet-grid']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-canvas-node": "sheet-grid",
        class: "canvas-sheet-grid",
      }),
    ];
  },

  addCommands() {
    return {
      sheetGridAddRow:
        () =>
        ({ state, dispatch }) => {
          const { from } = state.selection;
          const node = state.doc.nodeAt(from);
          if (!node || node.type.name !== this.name) return false;
          const cols = Array.isArray(node.attrs.columns)
            ? (node.attrs.columns as string[])
            : [];
          const rows = Array.isArray(node.attrs.rows)
            ? (node.attrs.rows as Array<Array<string | number | null>>)
            : [];
          if (rows.length >= 2000) return false;
          if (!dispatch) return true;
          const newRow = cols.map(() => "");
          const tr = state.tr.setNodeMarkup(from, undefined, {
            ...node.attrs,
            rows: [...rows, newRow],
          });
          dispatch(tr);
          return true;
        },
      sheetGridDeleteRow:
        (rowIndex: number) =>
        ({ state, dispatch }) => {
          const { from } = state.selection;
          const node = state.doc.nodeAt(from);
          if (!node || node.type.name !== this.name) return false;
          const rows = Array.isArray(node.attrs.rows)
            ? (node.attrs.rows as Array<Array<string | number | null>>)
            : [];
          if (rowIndex < 0 || rowIndex >= rows.length) return false;
          if (!dispatch) return true;
          const next = rows.filter((_, i) => i !== rowIndex);
          const tr = state.tr.setNodeMarkup(from, undefined, {
            ...node.attrs,
            rows: next,
          });
          dispatch(tr);
          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(SheetGridView);
  },
});
