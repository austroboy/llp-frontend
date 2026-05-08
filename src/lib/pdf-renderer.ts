import puppeteer, { type Browser } from "puppeteer-core";

const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ||
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  "/usr/bin/google-chrome-stable";

const NAV_TIMEOUT_MS = parseInt(process.env.PDF_NAV_TIMEOUT_MS || "30000", 10);
const RENDER_TIMEOUT_MS = parseInt(process.env.PDF_RENDER_TIMEOUT_MS || "45000", 10);

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) return browserPromise;
  browserPromise = puppeteer
    .launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=medium",
      ],
    })
    .then((browser) => {
      browser.on("disconnected", () => {
        browserPromise = null;
      });
      return browser;
    })
    .catch((err) => {
      browserPromise = null;
      throw err;
    });
  return browserPromise;
}

export async function renderSharePdfLocal({
  shareId,
  siteUrl,
}: {
  shareId: string;
  siteUrl: string;
}): Promise<Uint8Array> {
  if (!shareId) throw new Error("shareId required");
  if (!siteUrl) throw new Error("siteUrl required");

  // shareId may carry a query string (e.g. "abc?en=1&summary=1") — preserve it
  const [rawId, query] = shareId.split("?");
  const queryPart = query ? `?${query}` : "";
  const url = `${siteUrl.replace(/\/$/, "")}/chat/print/${encodeURIComponent(rawId)}${queryPart}`;
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.emulateMediaType("print");
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

    const navResult = await Promise.race([
      page.goto(url, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT_MS }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("navigation timeout")), NAV_TIMEOUT_MS + 2000)
      ),
    ]);
    const status = navResult?.status?.() ?? 0;
    if (status >= 400) throw new Error(`print page responded ${status}`);

    await page.evaluate(() =>
      (document as unknown as { fonts?: { ready: Promise<void> } }).fonts?.ready ?? Promise.resolve()
    );

    const buffer = (await Promise.race([
      page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "18mm", right: "16mm", bottom: "22mm", left: "16mm" },
        displayHeaderFooter: true,
        headerTemplate: `<div></div>`,
        footerTemplate: `
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 7pt; color: #94a3b8; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between;">
            <span>Labor Law Partner · AI Legal Research</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("render timeout")), RENDER_TIMEOUT_MS)
      ),
    ])) as Uint8Array;

    return buffer;
  } finally {
    try {
      await page.close();
    } catch {}
  }
}
