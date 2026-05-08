import { Node, mergeAttributes } from "@tiptap/core";

// FooterNote — one `footer_notes[i]` entry. Inline marks allowed
// (bold/italic/underline) per SPEC-01 §3.3. Serializer collapses the
// marks to plain text for round-trip.

export const FooterNote = Node.create({
  name: "footerNote",
  group: "block",
  content: "inline*",

  parseHTML() {
    return [{ tag: "p[data-canvas-node='footer-note']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        "data-canvas-node": "footer-note",
        class: "canvas-footer-note",
      }),
      0,
    ];
  },
});
