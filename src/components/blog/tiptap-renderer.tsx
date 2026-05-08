"use client";

import { useState, useCallback, type ReactNode, type JSX } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { isConvexStorageUrl, extractStorageId } from "@/components/editor/image-upload";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    // Keep ASCII word chars, whitespace, hyphens, and all non-ASCII (Bangla, etc.)
    .replace(/[^\w\s\u0080-\uFFFF-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "heading";
}

function getTextFromNode(node: TiptapNode): string {
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(getTextFromNode).join("");
}

const CALLOUT_EMOJIS: Record<string, string> = {
  info: "\u2139\uFE0F",
  warning: "\u26A0\uFE0F",
  tip: "\uD83D\uDCA1",
  danger: "\uD83D\uDED1",
};

const CALLOUT_STYLES: Record<string, string> = {
  info: "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40",
  warning: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
  tip: "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/40",
  danger: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40",
};

/* ------------------------------------------------------------------ */
/*  ConvexImage                                                        */
/* ------------------------------------------------------------------ */

function ConvexImage({ storageId, alt, width }: { storageId: Id<"_storage">; alt?: string; width?: number | null }) {
  const url = useQuery(api.files.getUrl, { storageId });
  if (!url)
    return <div className="w-full h-64 bg-muted animate-pulse rounded-xl my-6" />;
  return (
    <figure className="my-6">
      <img
        src={url}
        alt={alt || ""}
        className="rounded-xl"
        style={{ width: width ? `${width}px` : "100%", maxWidth: "100%" }}
        loading="lazy"
      />
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/*  Code block copy button                                             */
/* ------------------------------------------------------------------ */

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 rounded-md bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline marks                                                       */
/* ------------------------------------------------------------------ */

function renderMarks(text: string, marks?: TiptapMark[]): ReactNode {
  if (!marks || marks.length === 0) return text;

  let result: ReactNode = text;

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = <strong>{result}</strong>;
        break;
      case "italic":
        result = <em>{result}</em>;
        break;
      case "underline":
        result = <u>{result}</u>;
        break;
      case "strike":
        result = <s>{result}</s>;
        break;
      case "code":
        result = (
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            {result}
          </code>
        );
        break;
      case "link": {
        const href = (mark.attrs?.href as string) || "#";
        result = (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline"
          >
            {result}
          </a>
        );
        break;
      }
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Node renderer                                                      */
/* ------------------------------------------------------------------ */

function renderNode(
  node: TiptapNode,
  index: number,
  headingIds: Map<string, number>
): ReactNode {
  // Text node
  if (node.type === "text") {
    return (
      <span key={index}>{renderMarks(node.text || "", node.marks)}</span>
    );
  }

  const children = node.content?.map((child, i) =>
    renderNode(child, i, headingIds)
  );

  switch (node.type) {
    case "doc":
      return <div key={index}>{children}</div>;

    case "paragraph":
      return (
        <p key={index} className="mb-4 leading-relaxed">
          {children}
        </p>
      );

    case "heading": {
      const level = (node.attrs?.level as number) || 2;
      const text = getTextFromNode(node);
      let id = slugify(text);
      const count = headingIds.get(id) ?? 0;
      headingIds.set(id, count + 1);
      if (count > 0) id = `${id}-${count}`;
      const sizeClasses: Record<number, string> = {
        1: "text-3xl font-bold mt-10 mb-4",
        2: "text-2xl font-bold mt-8 mb-3",
        3: "text-xl font-semibold mt-6 mb-2",
        4: "text-lg font-semibold mt-4 mb-2",
      };
      const hClass = cn(sizeClasses[level] || sizeClasses[2], "scroll-mt-24");
      switch (level) {
        case 1:
          return <h1 key={index} id={id} className={hClass}>{children}</h1>;
        case 3:
          return <h3 key={index} id={id} className={hClass}>{children}</h3>;
        case 4:
          return <h4 key={index} id={id} className={hClass}>{children}</h4>;
        default:
          return <h2 key={index} id={id} className={hClass}>{children}</h2>;
      }
    }

    case "image": {
      const src = (node.attrs?.src as string) || "";
      const alt = (node.attrs?.alt as string) || "";
      const caption = (node.attrs?.title as string) || "";
      const imgWidth = (node.attrs?.width as number) || null;

      if (isConvexStorageUrl(src)) {
        const storageId = extractStorageId(src);
        return <ConvexImage key={index} storageId={storageId} alt={alt} width={imgWidth} />;
      }

      return (
        <figure key={index} className="my-6">
          <img
            src={src}
            alt={alt}
            className="rounded-xl"
            style={{ width: imgWidth ? `${imgWidth}px` : "100%", maxWidth: "100%" }}
            loading="lazy"
          />
          {caption && (
            <figcaption className="mt-2 text-center text-sm text-muted-foreground">
              {caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case "youtube": {
      const src = (node.attrs?.src as string) || "";
      const ytWidth = (node.attrs?.width as number) || null;
      return (
        <div key={index} className="my-6" style={ytWidth ? { width: `${ytWidth}px`, maxWidth: "100%" } : undefined}>
          <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={src}
              className="absolute inset-0 h-full w-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              loading="lazy"
            />
          </div>
        </div>
      );
    }

    case "vimeo": {
      const vimeoSrc = (node.attrs?.src as string) || "";
      const videoId = (node.attrs?.videoId as string) || "";
      const vimeoWidth = (node.attrs?.width as number) || null;
      const iframeSrc = vimeoSrc.includes("player.vimeo.com")
        ? vimeoSrc
        : videoId
          ? `https://player.vimeo.com/video/${videoId}`
          : vimeoSrc;
      return (
        <div key={index} className="my-6" style={vimeoWidth ? { width: `${vimeoWidth}px`, maxWidth: "100%" } : undefined}>
          <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={iframeSrc}
              className="absolute inset-0 h-full w-full"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        </div>
      );
    }

    case "callout": {
      const calloutType = (node.attrs?.type as string) || "info";
      const emoji = CALLOUT_EMOJIS[calloutType] || CALLOUT_EMOJIS.info;
      const style = CALLOUT_STYLES[calloutType] || CALLOUT_STYLES.info;
      return (
        <div
          key={index}
          className={cn("rounded-xl border p-4 my-6 flex gap-3", style)}
        >
          <span className="text-lg shrink-0">{emoji}</span>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      );
    }

    case "codeBlock": {
      const language = (node.attrs?.language as string) || "";
      const code = getTextFromNode(node);
      return (
        <div key={index} className="relative my-6">
          {language && (
            <span className="absolute top-3 left-3 rounded-md bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
              {language}
            </span>
          )}
          <CopyButton code={code} />
          <pre className="rounded-xl bg-zinc-900 text-zinc-100 p-4 pt-10 overflow-x-auto">
            <code className="text-sm font-mono">{children}</code>
          </pre>
        </div>
      );
    }

    case "blockquote":
      return (
        <blockquote
          key={index}
          className="border-l-4 border-primary pl-4 my-6 italic text-muted-foreground"
        >
          {children}
        </blockquote>
      );

    case "bulletList":
      return (
        <ul key={index} className="list-disc pl-6 mb-4 space-y-1">
          {children}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={index} className="list-decimal pl-6 mb-4 space-y-1">
          {children}
        </ol>
      );

    case "listItem":
      return <li key={index}>{children}</li>;

    case "table":
      return (
        <div key={index} className="overflow-x-auto my-6">
          <table className="w-full border-collapse">{children}</table>
        </div>
      );

    case "tableRow":
      return <tr key={index}>{children}</tr>;

    case "tableCell":
      return (
        <td key={index} className="border border-border px-3 py-2">
          {children}
        </td>
      );

    case "tableHeader":
      return (
        <th
          key={index}
          className="border border-border px-3 py-2 bg-muted font-semibold text-left"
        >
          {children}
        </th>
      );

    case "horizontalRule":
      return <hr key={index} className="my-8 border-border" />;

    case "hardBreak":
      return <br key={index} />;

    default:
      // Render children for unknown node types
      return children ? <div key={index}>{children}</div> : null;
  }
}

/* ------------------------------------------------------------------ */
/*  Public exports                                                     */
/* ------------------------------------------------------------------ */

export function TiptapRenderer({ content }: { content: string }): JSX.Element {
  let parsed: TiptapNode;
  try {
    parsed = JSON.parse(content);
  } catch {
    return <p className="text-muted-foreground">{content}</p>;
  }

  return <>{renderNode(parsed, 0, new Map())}</>;
}

export function extractHeadings(
  content: string
): { id: string; text: string; level: number }[] {
  let parsed: TiptapNode;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const headings: { id: string; text: string; level: number }[] = [];
  const usedIds = new Map<string, number>();

  function walk(node: TiptapNode) {
    if (node.type === "heading") {
      const level = (node.attrs?.level as number) || 2;
      if (level === 2 || level === 3) {
        const text = getTextFromNode(node);
        let id = slugify(text);
        const count = usedIds.get(id) ?? 0;
        usedIds.set(id, count + 1);
        if (count > 0) id = `${id}-${count}`;
        headings.push({ id, text, level });
      }
    }
    if (node.content) {
      node.content.forEach(walk);
    }
  }

  walk(parsed);
  return headings;
}

export function extractPlainText(content: string): string {
  let parsed: TiptapNode;
  try {
    parsed = JSON.parse(content);
  } catch {
    return content;
  }

  const texts: string[] = [];

  function walk(node: TiptapNode) {
    if (node.text) texts.push(node.text);
    if (node.content) node.content.forEach(walk);
  }

  walk(parsed);
  return texts.join(" ");
}
