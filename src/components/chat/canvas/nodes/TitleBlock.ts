import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TitleBlockView } from "./TitleBlockView";

// TitleBlock — exactly one per DocumentRoot. Holds the draft title as
// a single-line attribute, edited through an <input> in a React
// NodeView so Tiptap's inline-text machinery never sees the title.
// Matches SPEC-01 §3.3 (title has no inline marks).

export interface TitleBlockAttrs {
  text: string;
}

export const TitleBlock = Node.create({
  name: "titleBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      text: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-text") ?? "",
        renderHTML: (attrs) => ({ "data-text": attrs.text ?? "" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-canvas-node='title-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-canvas-node": "title-block",
        class: "canvas-title-block",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TitleBlockView);
  },
});
