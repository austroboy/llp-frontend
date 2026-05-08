import { Node, mergeAttributes } from "@tiptap/core";

// CitationChip — inline atom referencing draft.citations[index].
// Tier-1 only (SPEC-01 §3.1). Read-only text; deletable via
// backspace when the cursor sits adjacent. `text` attr is the
// user-visible label (e.g. "[1]" or "§26"); `index` points into the
// draft.citations array — round-trip stability depends on the index
// staying valid relative to the original draft.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    citationChip: {
      insertCitationChip: (args: {
        index: number;
        text: string;
      }) => ReturnType;
    };
  }
}

export const CitationChip = Node.create({
  name: "citationChip",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      index: {
        default: 0,
        parseHTML: (element) =>
          Number(element.getAttribute("data-index") ?? 0),
        renderHTML: (attrs) => ({ "data-index": String(attrs.index ?? 0) }),
      },
      text: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-text") ?? "",
        renderHTML: (attrs) => ({ "data-text": attrs.text ?? "" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-canvas-node='citation-chip']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-canvas-node": "citation-chip",
        class: "canvas-citation-chip",
        role: "link",
      }),
      HTMLAttributes["data-text"] ?? "",
    ];
  },

  addCommands() {
    return {
      insertCitationChip:
        ({ index, text }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { index, text },
          });
        },
    };
  },
});
