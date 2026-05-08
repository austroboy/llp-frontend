import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { InlineTableView } from "./InlineTableView";

// InlineTable — tier-1 structured clauses (fixed rows/cols) and
// tier-2/3 tables (add/delete row). SPEC-01 §3.1 editability rules.
// Represented as an atom node carrying `columns: string[]` and
// `rows: (string|number|null)[][]` attrs; cell text editing happens
// inside the React NodeView so ProseMirror never sees the cell
// content in its document tree.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inlineTable: {
      inlineTableAddRow: () => ReturnType;
      inlineTableDeleteRow: (rowIndex: number) => ReturnType;
    };
  }
}

export const InlineTable = Node.create({
  name: "inlineTable",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
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
    return [{ tag: "div[data-canvas-node='inline-table']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-canvas-node": "inline-table",
        class: "canvas-inline-table",
      }),
    ];
  },

  addCommands() {
    return {
      inlineTableAddRow:
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
          if (!dispatch) return true;
          const newRow = cols.map(() => "");
          const tr = state.tr.setNodeMarkup(from, undefined, {
            ...node.attrs,
            rows: [...rows, newRow],
          });
          dispatch(tr);
          return true;
        },
      inlineTableDeleteRow:
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
    return ReactNodeViewRenderer(InlineTableView);
  },
});
