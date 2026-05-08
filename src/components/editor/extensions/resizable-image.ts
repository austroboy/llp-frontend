import Image from "@tiptap/extension-image";
import { ResizableNodeView } from "@tiptap/core";
import { isConvexStorageUrl, extractStorageId } from "../image-upload";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const convexClient = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

// Cache resolved URLs to avoid repeated API calls
const urlCache = new Map<string, string>();

async function resolveImageSrc(src: string): Promise<string> {
  if (!isConvexStorageUrl(src)) return src;

  const cached = urlCache.get(src);
  if (cached) return cached;

  const storageId = extractStorageId(src) as Id<"_storage">;
  const url = await convexClient.query(api.files.getUrl, { storageId });
  if (url) {
    urlCache.set(src, url);
    return url;
  }
  return src;
}

export const ResizableImage = Image.extend({
  addNodeView() {
    const resizeOpts = this.options.resize;
    if (!resizeOpts || !resizeOpts.enabled || typeof document === "undefined") {
      return null;
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } =
      resizeOpts;

    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement("img");

      // Set all attributes except width/height (managed by ResizableNodeView)
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value != null && key !== "width" && key !== "height") {
          el.setAttribute(key, String(value));
        }
      });

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          el.style.width = `${width}px`;
          el.style.height = `${height}px`;
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) return;
          this.editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(this.name, { width, height })
            .run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          return true;
        },
        options: {
          directions,
          min: { width: minWidth, height: minHeight },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      });

      const dom = nodeView.dom;
      dom.style.visibility = "hidden";
      dom.style.pointerEvents = "none";

      el.onload = () => {
        dom.style.visibility = "";
        dom.style.pointerEvents = "";
      };

      el.onerror = () => {
        // Still show even if load fails, so the user sees something
        dom.style.visibility = "";
        dom.style.pointerEvents = "";
      };

      // Resolve Convex storage URLs, then set the real src
      const rawSrc = HTMLAttributes.src;
      resolveImageSrc(rawSrc).then((realSrc) => {
        el.src = realSrc;
      });

      return nodeView;
    };
  },
});

export default ResizableImage;
