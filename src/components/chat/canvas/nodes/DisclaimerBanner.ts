import { Node, mergeAttributes } from "@tiptap/core";

// DisclaimerBanner — auto-rendered at document top when tier ≥ 2.
// Read-only, non-removable (SPEC-01 §3.1). The `text` attribute is
// sourced from draft.disclaimer at mount time and is never written
// back: editorStateToSchema passes original.disclaimer through
// unchanged.

export const DisclaimerBanner = Node.create({
  name: "disclaimerBanner",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,
  isolating: true,

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
    return [{ tag: "aside[data-canvas-node='disclaimer-banner']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-canvas-node": "disclaimer-banner",
        class: "canvas-disclaimer-banner",
        role: "note",
        "aria-live": "polite",
      }),
      HTMLAttributes["data-text"] ?? "",
    ];
  },
});
