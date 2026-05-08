import { Marked } from "marked";
import { sanitize, printSchema } from "@/lib/sanitize-html";

// Server-side markdown for the print/PDF page. Custom renderer maps each
// token kind onto the pdf-* class set already styled in page.tsx, so the
// print CSS wins over Tailwind preflight without tag-vs-class specificity
// fights. Parsed synchronously so Puppeteer never races hydration.

type RendererThis = { parser: { parseInline: (tokens: unknown[]) => string; parse: (tokens: unknown[]) => string } };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const customRenderer = {
  heading(this: RendererThis, token: { tokens: unknown[]; depth: number }) {
    const text = this.parser.parseInline(token.tokens);
    const depth = Math.min(token.depth, 4);
    return `<h${token.depth} class="pdf-h${depth}">${text}</h${token.depth}>\n`;
  },
  paragraph(this: RendererThis, token: { tokens: unknown[] }) {
    const text = this.parser.parseInline(token.tokens);
    return `<p class="pdf-p">${text}</p>\n`;
  },
  strong(this: RendererThis, token: { tokens: unknown[] }) {
    return `<strong class="pdf-strong">${this.parser.parseInline(token.tokens)}</strong>`;
  },
  em(this: RendererThis, token: { tokens: unknown[] }) {
    return `<em>${this.parser.parseInline(token.tokens)}</em>`;
  },
  list(this: RendererThis, token: { ordered: boolean; items: { tokens: unknown[] }[] }) {
    const tag = token.ordered ? "ol" : "ul";
    const cls = token.ordered ? "pdf-ol" : "pdf-ul";
    const body = token.items
      .map((item) => `<li class="pdf-li">${this.parser.parse(item.tokens)}</li>`)
      .join("");
    return `<${tag} class="${cls}">${body}</${tag}>\n`;
  },
  blockquote(this: RendererThis, token: { tokens: unknown[] }) {
    return `<blockquote class="pdf-quote">${this.parser.parse(token.tokens)}</blockquote>\n`;
  },
  code(_this: unknown, token: { text: string; lang?: string }) {
    const escaped = escapeHtml(token.text);
    const langLabel = token.lang ? `<div class="pdf-code-lang">${escapeHtml(token.lang)}</div>` : "";
    return `<div class="pdf-code">${langLabel}<pre class="pdf-pre"><code>${escaped}</code></pre></div>\n`;
  },
  codespan(_this: unknown, token: { text: string }) {
    return `<code class="pdf-inline-code">${escapeHtml(token.text)}</code>`;
  },
  link(this: RendererThis, token: { href: string; title?: string | null; tokens: unknown[] }) {
    const text = this.parser.parseInline(token.tokens);
    const t = token.title ? ` title="${escapeHtml(token.title)}"` : "";
    return `<a class="pdf-a" href="${escapeHtml(token.href)}"${t}>${text}</a>`;
  },
  image(_this: unknown, token: { href: string; title?: string | null; text: string }) {
    const t = token.title ? ` title="${escapeHtml(token.title)}"` : "";
    return `<img class="pdf-img" src="${escapeHtml(token.href)}" alt="${escapeHtml(token.text)}"${t} />`;
  },
  hr() {
    return `<hr class="pdf-hr" />\n`;
  },
  table(this: RendererThis, token: {
    header: { tokens: unknown[] }[];
    rows: { tokens: unknown[] }[][];
  }) {
    const headers = token.header
      .map((cell) => `<th class="pdf-th">${this.parser.parseInline(cell.tokens)}</th>`)
      .join("");
    const rows = token.rows
      .map((row) => {
        const cells = row
          .map((cell) => `<td class="pdf-td">${this.parser.parseInline(cell.tokens)}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    return `<div class="pdf-table-wrap"><table class="pdf-table"><thead class="pdf-thead"><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
  },
};

// Build a dedicated Marked instance so the global one used elsewhere in the
// app keeps its own renderer configuration untouched.
const printMarked = new Marked({
  gfm: true,
  breaks: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: customRenderer as any,
});

interface Props {
  content: string;
}

export function PrintMarkdownRenderer({ content }: Props) {
  let html: string;
  try {
    html = printMarked.parse(content, { async: false }) as string;
  } catch (err) {
    console.error("[print-markdown-renderer] parse failed", err);
    // Fallback: escape and render as pre-wrapped text so the PDF is never blank
    html = `<pre class="pdf-pre">${escapeHtml(content)}</pre>`;
  }
  // C-5: sanitize parsed markdown HTML before render.
  const safe = sanitize(html, printSchema);
  return <div className="pdf-md" dangerouslySetInnerHTML={{ __html: safe }} />;
}
