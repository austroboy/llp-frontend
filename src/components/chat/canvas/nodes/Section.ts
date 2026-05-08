import { Node, mergeAttributes } from "@tiptap/core";

// Section — wraps one body_sections[i]. Content model matches
// SPEC-01 §3.3: exactly one heading followed by one-or-more
// block-level children (paragraph, bulletList, orderedList,
// inlineTable). The `locked` attr reserves space for tier-1 template
// structural locks from SPEC-01 §3.2; DB-07b keeps every draft with
// locked=false — the locking UX lands with a later rung.

export interface SectionAttrs {
  locked: boolean;
  /** Indexes into draft.citations[]. Rendered as a chip row at the
   *  section footer by SectionFooterChips. Omitted (or empty) means
   *  the section has no per-section citations — the canvas page may
   *  show a doc-footer chip list as graceful fallback. */
  citation_refs: number[];
}

export const Section = Node.create({
  name: "section",
  group: "block",
  content: "heading block+",
  defining: true,

  addAttributes() {
    return {
      locked: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute("data-locked") === "true",
        renderHTML: (attrs) => ({
          "data-locked": attrs.locked ? "true" : "false",
        }),
      },
      citation_refs: {
        default: [] as number[],
        parseHTML: (element) => {
          const raw = element.getAttribute("data-citation-refs");
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed)
              ? parsed.filter((n): n is number => typeof n === "number")
              : [];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => {
          const refs = Array.isArray(attrs.citation_refs)
            ? attrs.citation_refs
            : [];
          return refs.length > 0
            ? { "data-citation-refs": JSON.stringify(refs) }
            : {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-canvas-node='section']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-canvas-node": "section",
        class: "canvas-section",
      }),
      0,
    ];
  },
});
