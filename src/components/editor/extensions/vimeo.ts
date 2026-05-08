import { Node, mergeAttributes, ResizableNodeView } from "@tiptap/core";

const VIMEO_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com)\/(\d+)/;

function extractVimeoId(url: string): string | null {
  const match = url.match(VIMEO_REGEX);
  return match ? match[1] : null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    vimeo: {
      /**
       * Insert a Vimeo video embed from a URL.
       * Returns false if the URL is not a valid Vimeo URL.
       */
      setVimeoVideo: (url: string) => ReturnType;
    };
  }
}

export const Vimeo = Node.create({
  name: "vimeo",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) =>
          element.querySelector("iframe")?.getAttribute("src") ?? null,
      },
      videoId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-vimeo-video") ?? null,
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const w = element.getAttribute("data-vimeo-width");
          if (!w || w === "100%") return null;
          const num = parseInt(w, 10);
          return isNaN(num) ? null : num;
        },
        renderHTML: (attributes) => ({
          "data-vimeo-width": attributes.width ?? "100%",
        }),
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const h = element.getAttribute("data-vimeo-height");
          return h ? parseInt(h, 10) || null : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { "data-vimeo-height": attributes.height };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-vimeo-video]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { videoId, width, height, ...rest } = HTMLAttributes;

    const playerSrc = `https://player.vimeo.com/video/${videoId}`;

    return [
      "div",
      mergeAttributes(rest, {
        "data-vimeo-video": videoId,
        "data-vimeo-width": width ?? "100%",
      }),
      [
        "iframe",
        {
          src: playerSrc,
          allowfullscreen: "true",
          allow: "autoplay; fullscreen; picture-in-picture",
          style: "width:100%;aspect-ratio:16/9;border:0;",
        },
      ],
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement("div");
      container.style.aspectRatio = "16 / 9";
      container.style.overflow = "hidden";
      container.style.borderRadius = "0.75rem";

      const iframe = document.createElement("iframe");
      const videoId = node.attrs.videoId;
      iframe.src = `https://player.vimeo.com/video/${videoId}`;
      iframe.allowFullscreen = true;
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
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
            .updateAttributes("vimeo", { width, height })
            .run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          const newId = updatedNode.attrs.videoId;
          if (newId !== videoId) {
            iframe.src = `https://player.vimeo.com/video/${newId}`;
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

  addCommands() {
    return {
      setVimeoVideo:
        (url: string) =>
        ({ commands }) => {
          const videoId = extractVimeoId(url);

          if (!videoId) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              src: url,
              videoId,
            },
          });
        },
    };
  },
});

export default Vimeo;
