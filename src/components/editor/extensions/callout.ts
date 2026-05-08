import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutType = "info" | "warning" | "tip" | "danger";

export const CALLOUT_EMOJIS: Record<CalloutType, string> = {
  info: "💡",
  warning: "⚠️",
  tip: "✅",
  danger: "🚨",
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /**
       * Insert a callout block with the given type.
       */
      setCallout: (type: CalloutType) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",

  group: "block",

  content: "block+",

  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info" as CalloutType,
        parseHTML: (element) =>
          element.getAttribute("data-callout-type") ?? "info",
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-callout-type]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "callout" }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (type: CalloutType) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { type },
            content: [
              {
                type: "paragraph",
              },
            ],
          });
        },
    };
  },
});

export default Callout;
