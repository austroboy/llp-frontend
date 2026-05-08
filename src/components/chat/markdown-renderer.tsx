"use client";

import { useState, useEffect, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { cn } from "@/lib/utils";
import { CopyIcon, CheckIcon, XIcon } from "lucide-react";

// Allow only what the legal-content-parser needs (`<span class="...">` for
// citation highlighting). rehype-raw parses HTML first, then rehype-sanitize
// strips disallowed tags/attrs (incl. <script>, on* handlers, javascript: URLs).
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span || []), ["className"]],
  },
};

// Stable plugin arrays — avoids new references on every render
const remarkPlugins = [remarkGfm];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rehypePlugins: any[] = [rehypeHighlight, rehypeRaw, [rehypeSanitize, sanitizeSchema]];

// Protocol allowlist for markdown links (M-10). Anything that isn't an http(s)
// or mailto URL is rendered as plain text to block javascript:/data: vectors.
function isSafeHref(href: string | undefined): boolean {
  if (!href) return false;
  try {
    const u = new URL(href, "https://placeholder.invalid");
    return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:";
  } catch {
    return false;
  }
}

/** Code block with language label + copy button */
function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = String(children).replace(/\n$/, "");
  const lang = className?.replace("language-", "") ?? "";

  return (
    <div className="group relative my-4 overflow-hidden rounded-lg border border-border/60">
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/70 px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        <span>{lang || "code"}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(text).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
        >
          {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="overflow-x-auto bg-muted/30 p-4 text-[13px] leading-relaxed whitespace-pre">
        <code
          className={className}
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace" }}
        >
          {children}
        </code>
      </pre>
    </div>
  );
}

function ZoomableImage({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block max-w-full my-2 cursor-zoom-in overflow-hidden rounded-lg border border-border/60"
        aria-label={alt ? `Zoom image: ${alt}` : "Zoom image"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ""} loading="lazy" className="max-w-full h-auto" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded image"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 cursor-zoom-out motion-reduce:animate-none"
          style={{ animation: "zoomFadeIn 140ms ease-out both" }}
        >
          <button
            type="button"
            aria-label="Close expanded image"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="absolute top-4 right-4 inline-flex items-center justify-center size-9 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <XIcon className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt ?? ""}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg shadow-2xl"
            style={{ animation: "zoomScaleIn 160ms ease-out both" }}
          />
          <style>{`
            @keyframes zoomFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes zoomScaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
          `}</style>
        </div>
      )}
    </>
  );
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
  isStreaming,
}: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "md-render md-render--codex prose dark:prose-invert max-w-none break-words",
        isStreaming && "md-render--streaming",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          // Tables — styled with borders, alternating rows
          table: ({ children }) => (
            <div className="not-prose overflow-x-auto my-3 rounded-lg border border-border">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/30 even:bg-muted/20 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold border-b border-border bg-muted text-[13px]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-border/50">{children}</td>
          ),

          // Code blocks — with copy button and syntax highlighting via rehype-highlight
          pre: ({ children }) => <>{children}</>,
          code: ({ className: codeClassName, children, node, ...props }: any) => {
            const isBlock =
              !!codeClassName ||
              node?.position?.start.line !== node?.position?.end.line ||
              String(children).includes("\n");
            if (isBlock) {
              return <CodeBlock className={codeClassName}>{children}</CodeBlock>;
            }
            return (
              <code
                className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-medium text-primary"
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
                }}
                {...props}
              >
                {children}
              </code>
            );
          },

          // Headings — appropriately sized
          h1: ({ children }) => (
            <h1 className="md-h text-[20px] font-semibold mt-5 mb-2.5">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="md-h text-[17px] font-semibold mt-4 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="md-h text-[15.5px] font-semibold mt-3 mb-1.5">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="md-h text-[14.5px] font-semibold mt-2 mb-1">{children}</h4>
          ),

          // Bold — slightly emphasized
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),

          // Blockquotes — colored left border for caveats/notes
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-[3px] border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 pl-3 py-1.5 text-sm italic text-muted-foreground rounded-r-lg">
              {children}
            </blockquote>
          ),

          // Lists — proper spacing
          ul: ({ children }) => (
            <ul className="my-1.5 ml-4 space-y-0.5 list-disc">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1.5 ml-4 space-y-0.5 list-decimal">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="md-li text-[15px] leading-[1.6]">{children}</li>
          ),

          // Links — external indicator. Unsafe protocols render as plain text (M-10).
          a: ({ href, children }) => {
            if (!isSafeHref(href)) {
              return <span>{children}</span>;
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {children}
              </a>
            );
          },

          // Paragraphs — proper spacing
          p: ({ children }) => (
            <p className="md-p my-2 text-[15px] leading-[1.65]">{children}</p>
          ),

          // Horizontal rules
          hr: () => <hr className="my-3 border-border" />,

          // Images — click to zoom (full-screen modal, esc/click-out to close)
          img: ({ src, alt }: any) => (
            <ZoomableImage src={typeof src === "string" ? src : undefined} alt={alt} />
          ),

          // Pass through <span> elements (needed for legal content parser HTML)
          span: ({ className: spanClass, children, ...props }: any) => (
            <span className={spanClass} {...props}>
              {children}
            </span>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      <style>{`
        .md-render--codex .md-p,
        .md-render--codex .md-li {
          font-family: var(--font-sans), sans-serif;
          color: hsl(var(--foreground));
        }
        .md-render--codex .md-h {
          font-family: var(--font-sans), sans-serif;
          letter-spacing: -0.005em;
          color: hsl(var(--foreground));
        }
        .md-render--codex strong {
          font-weight: 600;
          color: hsl(var(--foreground));
        }
      `}</style>
      {isStreaming && (
        <style>{`
          @keyframes mdCaretBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
          @keyframes mdRevealMask { from { mask-position: 0 -120%; -webkit-mask-position: 0 -120%; } to { mask-position: 0 0; -webkit-mask-position: 0 0; } }
          .md-render--streaming {
            -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) calc(100% - 28px), rgba(0,0,0,0.15) 100%);
            mask-image: linear-gradient(to bottom, rgba(0,0,0,1) calc(100% - 28px), rgba(0,0,0,0.15) 100%);
          }
          .md-render--streaming > p:last-of-type::after,
          .md-render--streaming > ul:last-of-type > li:last-child::after,
          .md-render--streaming > ol:last-of-type > li:last-child::after,
          .md-render--streaming > h1:last-of-type::after,
          .md-render--streaming > h2:last-of-type::after,
          .md-render--streaming > h3:last-of-type::after,
          .md-render--streaming > h4:last-of-type::after {
            content: "";
            display: inline-block;
            width: 3px;
            height: 1.1em;
            margin-left: 3px;
            vertical-align: -0.15em;
            background: hsl(var(--primary));
            border-radius: 1px;
            animation: mdCaretBlink 1s steps(2, end) infinite;
            box-shadow: 0 0 6px hsl(var(--primary) / 0.55);
          }
          .md-render--streaming:empty::after,
          .md-render--streaming > :first-child:empty::after {
            content: "";
            display: inline-block;
            width: 3px;
            height: 1.1em;
            background: hsl(var(--primary));
            border-radius: 1px;
            animation: mdCaretBlink 1s steps(2, end) infinite;
            box-shadow: 0 0 6px hsl(var(--primary) / 0.55);
          }
          @media (prefers-reduced-motion: reduce) {
            .md-render--streaming { -webkit-mask-image: none; mask-image: none; }
            .md-render--streaming > p:last-of-type::after,
            .md-render--streaming > ul:last-of-type > li:last-child::after,
            .md-render--streaming > ol:last-of-type > li:last-child::after,
            .md-render--streaming > h1:last-of-type::after,
            .md-render--streaming > h2:last-of-type::after,
            .md-render--streaming > h3:last-of-type::after,
            .md-render--streaming > h4:last-of-type::after { animation: none; opacity: 1; }
          }
        `}</style>
      )}
    </div>
  );
});
