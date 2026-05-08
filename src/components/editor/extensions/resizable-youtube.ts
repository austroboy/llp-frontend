import Youtube from "@tiptap/extension-youtube";
import { ResizableNodeView } from "@tiptap/core";

export const ResizableYoutube = Youtube.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const w = element.getAttribute("data-width");
          return w ? parseInt(w, 10) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { "data-width": attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const h = element.getAttribute("data-height");
          return h ? parseInt(h, 10) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { "data-height": attributes.height };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement("div");
      container.style.aspectRatio = "16 / 9";
      container.style.overflow = "hidden";
      container.style.borderRadius = "0.75rem";

      const iframe = document.createElement("iframe");
      iframe.src = node.attrs.src;
      iframe.allowFullscreen = true;
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "0";
      container.appendChild(iframe);

      const nodeView = new ResizableNodeView({
        element: container,
        editor,
        node,
        getPos,
        onResize: (width) => {
          container.style.width = `${width}px`;
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) return;
          editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(this.name, { width, height })
            .run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          if (updatedNode.attrs.src !== iframe.src) {
            iframe.src = updatedNode.attrs.src;
          }
          return true;
        },
        options: {
          directions: ["bottom-right", "bottom-left"],
          min: { width: 200, height: 112 },
          preserveAspectRatio: true,
        },
      });

      return nodeView;
    };
  },
});

export default ResizableYoutube;
