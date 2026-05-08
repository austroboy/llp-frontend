import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { SignatureBlockView } from "./SignatureBlockView";

// SignatureBlock — one `signatures[i]` entry. Four editable string
// attrs: role, name, designation, date. Role is the only required
// field per ResponseSchemaSignature; the rest may be empty.

export const SignatureBlock = Node.create({
  name: "signatureBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      role: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-role") ?? "",
        renderHTML: (a) => ({ "data-role": a.role ?? "" }),
      },
      name: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-name") ?? "",
        renderHTML: (a) => ({ "data-name": a.name ?? "" }),
      },
      designation: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-designation") ?? "",
        renderHTML: (a) => ({ "data-designation": a.designation ?? "" }),
      },
      date: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-date") ?? "",
        renderHTML: (a) => ({ "data-date": a.date ?? "" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-canvas-node='signature-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-canvas-node": "signature-block",
        class: "canvas-signature-block",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SignatureBlockView);
  },
});
