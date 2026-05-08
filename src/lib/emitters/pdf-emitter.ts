// PDF emit via Puppeteer + @sparticuz/chromium-min.
//
// Cold-start trade-off: a module-level browser singleton keeps Chromium warm
// across invocations within a single serverless instance. Vercel /tmp is
// persisted for the lifetime of the worker so chromium-min's tar download is
// also amortized after the first hit.
//
// We do NOT explicitly close the browser on success — Vercel reaps the
// process when the instance recycles. For local smoke runs the script calls
// `closePdfBrowser()` at the end to release the handle.

import type { Browser } from "puppeteer-core";
import type { ResponseSchema } from "@/lib/documents/response-schema";
import { NOTO_BENGALI_BOLD_B64, NOTO_BENGALI_REGULAR_B64 } from "./fonts";

const REMOTE_CHROMIUM_TAR =
  "https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar";

let browserPromise: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
  // Dynamic imports keep the heavy deps out of the cold path until the
  // first PDF request actually hits the route.
  const [{ default: chromium }, puppeteer] = await Promise.all([
    import("@sparticuz/chromium-min"),
    import("puppeteer-core"),
  ]);
  const executablePath = await chromium.executablePath(REMOTE_CHROMIUM_TAR);
  return puppeteer.default.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  }) as unknown as Browser;
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) browserPromise = launchBrowser();
  try {
    const browser = await browserPromise;
    if (!browser.connected) {
      browserPromise = null;
      return getBrowser();
    }
    return browser;
  } catch (err) {
    browserPromise = null;
    throw err;
  }
}

export async function closePdfBrowser(): Promise<void> {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
    // best effort
  } finally {
    browserPromise = null;
  }
}

function esc(text: string | null | undefined): string {
  if (text == null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tableHtml(
  table: NonNullable<ResponseSchema["body_sections"][number]["table"]>,
): string {
  const head = table.columns.map((c) => `<th>${esc(c)}</th>`).join("");
  const body = table.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${esc(String(cell ?? ""))}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function sectionHtml(section: ResponseSchema["body_sections"][number]): string {
  const parts: string[] = [`<h2>${esc(section.heading)}</h2>`];
  for (const p of section.paragraphs ?? []) parts.push(`<p>${esc(p)}</p>`);
  if (section.bullets?.length) {
    parts.push(
      `<ul>${section.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`,
    );
  }
  if (section.table) parts.push(tableHtml(section.table));
  return `<section>${parts.join("")}</section>`;
}

function citationsHtml(citations: ResponseSchema["citations"]): string {
  if (!citations.length) return "";
  const items = citations
    .map(
      (c, i) =>
        `<li><strong>[${i + 1}] ${esc(c.doc_id)} §${esc(c.section)}</strong> — <em>"${esc(c.quote)}"</em></li>`,
    )
    .join("");
  return `<section><h2>Sources</h2><ol class="sources">${items}</ol></section>`;
}

function signaturesHtml(signatures: ResponseSchema["signatures"]): string {
  if (!signatures?.length) return "";
  return signatures
    .map(
      (sig) =>
        `<div class="sig"><div class="sig-role">${esc(sig.role)}</div>${
          sig.name ? `<div>${esc(sig.name)}</div>` : ""
        }${
          sig.designation ? `<div>${esc(sig.designation)}</div>` : ""
        }${sig.date ? `<div class="sig-date">Date: ${esc(sig.date)}</div>` : ""}</div>`,
    )
    .join("");
}

function renderHtml(draft: ResponseSchema): string {
  const tier2OrHigher = draft.tier >= 2 && !!draft.disclaimer;
  return `<!doctype html>
<html lang="${esc(draft.language)}">
<head>
<meta charset="utf-8" />
<style>
@font-face {
  font-family: 'Noto Sans Bengali';
  src: url(data:font/ttf;base64,${NOTO_BENGALI_REGULAR_B64}) format('truetype');
  font-weight: 400; font-style: normal;
}
@font-face {
  font-family: 'Noto Sans Bengali';
  src: url(data:font/ttf;base64,${NOTO_BENGALI_BOLD_B64}) format('truetype');
  font-weight: 700; font-style: normal;
}
* { box-sizing: border-box; }
body {
  font-family: 'Noto Sans Bengali', 'Inter', system-ui, sans-serif;
  color: #0a0a0a;
  margin: 0; padding: 0;
  font-size: 12pt;
  line-height: 1.5;
}
h1 { font-size: 22pt; margin: 0 0 12pt; text-align: center; }
h2 { font-size: 14pt; margin: 16pt 0 8pt; }
p { margin: 0 0 8pt; }
ul, ol { margin: 0 0 8pt 18pt; padding: 0; }
.disclaimer {
  border: 1px solid #e0a800;
  background: #fff8e1;
  padding: 10pt 12pt;
  margin: 0 0 16pt;
  font-style: italic;
}
.data-table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
.data-table th, .data-table td { border: 1px solid #888; padding: 4pt 6pt; text-align: left; }
.data-table th { background: #e5e5e5; }
.sig { margin-top: 24pt; border-top: 1px solid #333; padding-top: 6pt; }
.sig-role { font-weight: 700; }
.sig-date { margin-top: 4pt; }
.sources { padding-left: 18pt; }
.footer-note { margin-top: 16pt; font-size: 9pt; color: #555; font-style: italic; }
</style>
</head>
<body>
${tier2OrHigher ? `<div class="disclaimer">${esc(draft.disclaimer!)}</div>` : ""}
<h1>${esc(draft.title)}</h1>
${draft.body_sections.map(sectionHtml).join("")}
${signaturesHtml(draft.signatures)}
${draft.tier === 1 ? citationsHtml(draft.citations) : ""}
${(draft.footer_notes ?? []).map((n) => `<p class="footer-note">${esc(n)}</p>`).join("")}
</body>
</html>`;
}

export async function emitPdf(draft: ResponseSchema): Promise<Buffer> {
  const html = renderHtml(draft);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
