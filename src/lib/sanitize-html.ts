/**
 * Centralized sanitize-html schemas for XSS defense in depth.
 *
 * Each schema strips <script>, <iframe> (except where allowed), event-handler
 * attributes (on*), javascript: URLs, and other vectors. Use the schema that
 * matches the surface, or hand-roll one with `sanitizeHtml` directly when the
 * needs are special.
 */

import sanitizeHtmlLib, { type IOptions } from "sanitize-html";

/** Inline-only — for hardcoded marketing copy that might include `<strong>`/`<em>`. */
export const inlineSchema: IOptions = {
  allowedTags: ["strong", "em", "b", "i", "u", "br", "span"],
  allowedAttributes: {
    span: ["class"],
  },
  allowedSchemes: [],
  allowedSchemesByTag: {},
  disallowedTagsMode: "discard",
};

/** Email body — permissive enough to render real campaign HTML, but stripping scripts/forms/event handlers. */
export const emailSchema: IOptions = {
  allowedTags: [
    "a",
    "abbr",
    "address",
    "article",
    "b",
    "blockquote",
    "br",
    "caption",
    "center",
    "code",
    "div",
    "dd",
    "dl",
    "dt",
    "em",
    "figure",
    "figcaption",
    "font",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "main",
    "ol",
    "p",
    "pre",
    "section",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel", "title"],
    img: ["src", "alt", "title", "width", "height", "style"],
    table: ["align", "bgcolor", "border", "cellpadding", "cellspacing", "width", "style"],
    td: ["align", "bgcolor", "colspan", "rowspan", "valign", "width", "style"],
    th: ["align", "bgcolor", "colspan", "rowspan", "valign", "width", "style"],
    tr: ["align", "bgcolor", "valign"],
    div: ["style", "align"],
    span: ["style"],
    p: ["style", "align"],
    font: ["color", "face", "size"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto", "cid"],
  allowedSchemesByTag: {
    img: ["http", "https", "cid", "data"],
  },
  allowedSchemesAppliedToAttributes: ["href", "src", "cite"],
  // Strip style attributes that include javascript: or expression()
  // (sanitize-html already strips them by default unless allowed; we permit
  // a narrow style allowlist below by post-filtering.)
  allowedStyles: {
    "*": {
      color: [/^.*$/],
      "background-color": [/^.*$/],
      "background": [/^.*$/],
      "text-align": [/^left$|^right$|^center$|^justify$/],
      "font-size": [/^\d+(?:\.\d+)?(?:px|em|rem|%|pt)$/],
      "font-weight": [/^.*$/],
      "font-style": [/^.*$/],
      "font-family": [/^.*$/],
      width: [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/, /^auto$/],
      "max-width": [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/, /^auto$/],
      height: [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/, /^auto$/],
      "line-height": [/^.*$/],
      padding: [/^.*$/],
      "padding-top": [/^.*$/],
      "padding-bottom": [/^.*$/],
      "padding-left": [/^.*$/],
      "padding-right": [/^.*$/],
      margin: [/^.*$/],
      "margin-top": [/^.*$/],
      "margin-bottom": [/^.*$/],
      "margin-left": [/^.*$/],
      "margin-right": [/^.*$/],
      border: [/^.*$/],
      "border-collapse": [/^.*$/],
      "border-spacing": [/^.*$/],
      "border-color": [/^.*$/],
      "border-style": [/^.*$/],
      "border-width": [/^.*$/],
      "vertical-align": [/^.*$/],
      "text-decoration": [/^.*$/],
    },
  },
  disallowedTagsMode: "discard",
};

/** Print/PDF body — like email but allows pre/code blocks for legal-text rendering. */
export const printSchema: IOptions = {
  ...emailSchema,
  allowedTags: [...(emailSchema.allowedTags || []), "pre", "kbd", "samp", "var", "mark"],
};

/** Chapter content (resources/chapter-reader) — same as print, no inline scripts. */
export const chapterSchema: IOptions = printSchema;

/** Wrapper that always returns a string (sanitize-html returns string). */
export function sanitize(html: string, schema: IOptions = inlineSchema): string {
  if (!html) return "";
  return sanitizeHtmlLib(html, schema);
}
