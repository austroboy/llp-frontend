/**
 * Admin-editable email template override helpers.
 *
 * Overrides live in Convex (`emailTemplateOverrides` table) and are keyed by
 * the helper function name (e.g. "sendConsultationConfirmation"). When a row
 * exists, the override HTML + subject replace the hard-coded default in
 * email*.ts. Both strings support mustache-style `{{token}}` interpolation
 * against the helper's params object; missing tokens fall through untouched.
 */

import sanitizeHtml from "sanitize-html";
import { api } from "@convex/_generated/api";

export interface EmailOverride {
  templateId: string;
  html: string;
  subject: string;
  updatedAt: number;
  updatedByClerkId: string;
  updatedByEmail?: string;
}

/**
 * Fetch override for a templateId, or null if none / fetch fails.
 * Swallows errors so a down Convex never blocks outgoing email.
 */
export async function getEmailOverride(
  templateId: string
): Promise<EmailOverride | null> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  try {
    const { ConvexHttpClient } = await import("convex/browser");
    const client = new ConvexHttpClient(url);
    const row = await client.query(api.emailTemplateOverrides.get, {
      templateId,
    });
    if (!row) return null;
    return {
      templateId: row.templateId,
      html: row.html,
      subject: row.subject,
      updatedAt: row.updatedAt,
      updatedByClerkId: row.updatedByClerkId,
      updatedByEmail: row.updatedByEmail,
    };
  } catch (e) {
    console.error("[email-overrides] fetch failed", templateId, e);
    return null;
  }
}

/**
 * Replace `{{dotted.path}}` tokens in `template` using values from `data`.
 * Unknown tokens are left literal. Non-string leaves are stringified.
 */
export function substituteTokens(
  template: string,
  data: Record<string, unknown>
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path: string) => {
    const parts = path.split(".");
    let cur: unknown = data;
    for (const part of parts) {
      if (cur && typeof cur === "object" && part in (cur as object)) {
        cur = (cur as Record<string, unknown>)[part];
      } else {
        return match; // leave literal if path doesn't resolve
      }
    }
    if (cur === null || cur === undefined) return "";
    if (typeof cur === "string") return cur;
    if (typeof cur === "number" || typeof cur === "boolean") return String(cur);
    try {
      return JSON.stringify(cur);
    } catch {
      return String(cur);
    }
  });
}

const EMAIL_SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    "html", "head", "body", "title", "meta",
    "table", "thead", "tbody", "tfoot", "tr", "td", "th", "col", "colgroup", "caption",
    "div", "span", "p", "a", "img", "figure", "figcaption",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "strong", "em", "b", "i", "u", "s", "small", "sub", "sup",
    "br", "hr",
    "blockquote", "pre", "code",
    "center", "font",
  ],
  allowedAttributes: {
    "*": [
      "style", "class", "id", "dir", "lang", "title",
      "align", "valign", "width", "height",
      "border", "cellpadding", "cellspacing", "bgcolor",
      "colspan", "rowspan",
      "aria-label", "aria-hidden", "role",
    ],
    a: ["href", "target", "rel", "name"],
    img: ["src", "alt", "border"],
    meta: ["name", "content", "charset"],
    table: ["summary"],
    font: ["color", "face", "size"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel", "cid"],
  allowedSchemesByTag: { img: ["http", "https", "cid"] },
  allowedSchemesAppliedToAttributes: ["href", "src", "cite"],
  allowProtocolRelative: true,
  parseStyleAttributes: false,
  disallowedTagsMode: "discard",
};

const DOCTYPE_RE = /^\s*<!doctype[^>]*>/i;

/**
 * Strip scripts, event handlers, and javascript: URLs from override HTML.
 * Email clients drop most of this anyway, but admin preview iframes don't.
 *
 * Uses `sanitize-html` (no jsdom) so Vercel's serverless bundler doesn't pull
 * `html-encoding-sniffer`'s ESM-only `@exodus/bytes` transitive — which breaks
 * CommonJS require() in production.
 */
export function sanitizeTemplateHtml(html: string): string {
  const doctypeMatch = html.match(DOCTYPE_RE);
  const doctype = doctypeMatch ? doctypeMatch[0] : "";
  const body = doctype ? html.slice(doctype.length) : html;
  const cleaned = sanitizeHtml(body, EMAIL_SANITIZE_OPTS);
  return doctype ? `${doctype}\n${cleaned}` : cleaned;
}

/**
 * Render override against data, returning sanitized HTML + substituted subject.
 * Used by both the send pipeline (real emails) and the admin preview route.
 */
export function renderOverride(
  override: { html: string; subject: string },
  data: Record<string, unknown>
): { html: string; subject: string } {
  const html = sanitizeTemplateHtml(substituteTokens(override.html, data));
  const subject = substituteTokens(override.subject, data);
  return { html, subject };
}

/**
 * Return the set of `{{token}}` paths referenced in a template string.
 */
export function extractTokens(template: string): string[] {
  const set = new Set<string>();
  const re = /\{\{\s*([\w.]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) set.add(m[1]);
  return Array.from(set);
}
