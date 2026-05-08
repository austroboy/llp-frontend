import { createServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { PrintMarkdownRenderer } from "@/components/chat/print-markdown-renderer";
import "highlight.js/styles/github.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Arabic + Arabic Supplement + Arabic Presentation Forms (covers ar, ur, fa, etc.)
const RTL_REGEX =
  /[\u0600-\u06ff\u0750-\u077f\u0870-\u089f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;

function isRtl(text: string): boolean {
  return RTL_REGEX.test(text);
}

interface Citation {
  document_id?: string;
  document?: string;
  section?: string;
  text?: string;
}

interface MessageSummary {
  summary: string;
  example_scenario?: string;
  cited_sections?: string[];
}

interface VerifyClaim {
  claim?: string;
  cited_section?: string;
  verdict?: string;
  confidence?: number;
  explanation?: string;
}

interface MessageVerify {
  overall_verdict?: string;
  confidence?: number;
  claims?: VerifyClaim[];
  superseded_sections?: string[];
  missing_citations?: string[];
}

interface ClarifyOption {
  title?: string;
  role?: string;
  blurb?: string;
  scenario_query?: string;
}

interface SharedMessage {
  role: "user" | "assistant";
  content: string;
  content_en?: string | null;
  language?: string | null;
  citations?: Citation[] | null;
  created_at?: string;
  summary?: MessageSummary | null;
  verify?: MessageVerify | null;
  clarify_options?: ClarifyOption[] | null;
  clarify_reason?: string | null;
}

interface SharedConversation {
  public_id: string;
  snapshot_title: string;
  snapshot_messages: SharedMessage[];
  shared_at: string;
  is_active: boolean;
  expires_at: string | null;
}

async function getShare(publicId: string): Promise<SharedConversation | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("shared_conversations")
    .select("public_id, snapshot_title, snapshot_messages, shared_at, is_active, expires_at")
    .eq("public_id", publicId)
    .eq("is_active", true)
    .single();
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return data as SharedConversation;
}

export default async function ChatPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ shareId: string }>;
  searchParams: Promise<{ en?: string; summary?: string; verify?: string }>;
}) {
  const { shareId } = await params;
  const sp = await searchParams;
  const includeEnglish = sp.en === "1";
  const includeSummary = sp.summary === "1";
  const includeVerify = sp.verify === "1";

  const shared = await getShare(shareId);
  if (!shared) notFound();

  const messages = shared.snapshot_messages || [];
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // conversations.title is stored truncated at 60 chars (chat/route.ts:1001)
  // — the cover title therefore shows "...", which is ugly and drops the key
  // qualifier of a long question. Recover the full text from snapshot_messages
  // when the stored title ends with "...". Prefer the most recent user
  // message that starts with the truncated prefix (because chat/route.ts
  // rewrites the title on every turn).
  let coverTitle = shared.snapshot_title;
  if (/\.{3}$/.test(coverTitle)) {
    const prefix = coverTitle.replace(/\.{3}$/, "");
    const match = [...messages]
      .reverse()
      .find(
        (m) =>
          m.role === "user" &&
          typeof m.content === "string" &&
          m.content.startsWith(prefix.slice(0, Math.min(40, prefix.length))),
      );
    if (match?.content) coverTitle = match.content.trim();
  }
  // Still cap at 200 chars to keep cover aesthetic — pathological titles
  // (pasted essays) would otherwise flow over the meta row.
  if (coverTitle.length > 200) coverTitle = coverTitle.slice(0, 197) + "...";

  const pairs: Array<{ q?: SharedMessage; a?: SharedMessage; idx: number }> = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === "user") {
      const next = messages[i + 1];
      if (next && next.role === "assistant") {
        pairs.push({ q: m, a: next, idx: pairs.length + 1 });
        i++;
      } else {
        pairs.push({ q: m, idx: pairs.length + 1 });
      }
    } else {
      pairs.push({ a: m, idx: pairs.length + 1 });
    }
  }

  return (
    <>
      <style>{PRINT_CSS}</style>
      <main className="pdf-root">
        <section className="pdf-cover">
          <div className="pdf-brand">
            <img src="/logo.png" alt="Labor Law Partner" className="pdf-logo" />
            <div>
              <div className="pdf-brand-name">Labor Law Partner</div>
              <div className="pdf-brand-tag">AI-Powered Bangladesh Labour Law Research</div>
            </div>
          </div>

          <div className="pdf-title-block">
            <div className="pdf-eyebrow">Conversation Export</div>
            <h1 className="pdf-doc-title">{coverTitle}</h1>
            <div className="pdf-meta-row">
              <span>Generated {generatedDate}</span>
              <span>•</span>
              <span>{pairs.length} {pairs.length === 1 ? "exchange" : "exchanges"}</span>
              <span>•</span>
              <span className="pdf-mono">{shared.public_id}</span>
            </div>
          </div>

          <div className="pdf-cover-notice">
            This document was generated from an AI conversation on Labor Law Partner.
            All legal citations reference the Bangladesh Labour Act 2006, amendments,
            or Labour Rules 2015. Verify specifics against the primary source before
            acting on them.
          </div>
        </section>

        <section className="pdf-body">
          {pairs.map((pair) => (
            <article key={pair.idx} className="pdf-exchange">
              {pair.q && (
                <div className="pdf-q">
                  <div className="pdf-label pdf-label-q">Question {pair.idx}</div>
                  <div
                    className="pdf-q-text"
                    dir={isRtl(pair.q.content) ? "rtl" : "ltr"}
                  >
                    {pair.q.content}
                  </div>
                </div>
              )}
              {pair.a && (() => {
                const clipText = (s: unknown, n: number): string =>
                  typeof s === "string" ? s.trim().slice(0, n) : "";
                const rawClarifyOpts = Array.isArray(pair.a.clarify_options)
                  ? pair.a.clarify_options
                  : [];
                // Legacy snapshots (pre 2026-04-21 hardening) may contain raw
                // un-capped model output — whole legal sections pasted into a
                // card title. Cap at render time so a single oversized card
                // can't blow up the page. Limits match the upstream caps in
                // src/app/api/chat/route.ts:921-923.
                const clarifyOpts = rawClarifyOpts.map((o) => ({
                  title: clipText(o?.title, 90),
                  role: typeof o?.role === "string" ? o.role : "general",
                  blurb: clipText(o?.blurb, 200),
                  scenario_query: clipText(o?.scenario_query, 220),
                }));
                const clarifyReason = clipText(pair.a.clarify_reason, 220);
                const isClarify = (!pair.a.content || pair.a.content.trim() === "") && clarifyOpts.length > 0;
                const dirSource = pair.a.content || clarifyReason || "";
                return (
                <div
                  className="pdf-a"
                  dir={isRtl(dirSource) ? "rtl" : "ltr"}
                >
                  <div className="pdf-label pdf-label-a">
                    {isClarify ? "Clarification requested" : "Answer"}
                  </div>
                  {isClarify ? (
                    <div className="pdf-clarify">
                      {clarifyReason && (
                        <div className="pdf-clarify-reason">
                          {clarifyReason}
                        </div>
                      )}
                      <div className="pdf-clarify-sub">Options offered to user</div>
                      <ol className="pdf-clarify-list">
                        {clarifyOpts.map((opt, k) => (
                          <li key={k} className="pdf-clarify-item">
                            {opt.title && (
                              <span className="pdf-clarify-title">{opt.title}</span>
                            )}
                            {opt.role && opt.role !== "general" && (
                              <span className="pdf-clarify-role">{opt.role}</span>
                            )}
                            {opt.blurb && (
                              <div className="pdf-clarify-blurb">{opt.blurb}</div>
                            )}
                            {opt.scenario_query && opt.scenario_query !== opt.title && (
                              <div className="pdf-clarify-query">“{opt.scenario_query}”</div>
                            )}
                          </li>
                        ))}
                      </ol>
                      <div className="pdf-clarify-note">
                        User selected one of the options above; the chosen scenario becomes the next question below.
                      </div>
                    </div>
                  ) : (
                    <PrintMarkdownRenderer content={pair.a.content} />
                  )}
                  {includeEnglish && pair.a.content_en && pair.a.content_en !== pair.a.content && (
                    <aside className="pdf-en-source">
                      <div className="pdf-en-title">English source</div>
                      <PrintMarkdownRenderer content={pair.a.content_en} />
                    </aside>
                  )}
                  {includeSummary && pair.a.summary && pair.a.summary.summary && (
                    <aside className="pdf-summary" dir={isRtl(pair.a.summary.summary) ? "rtl" : "ltr"}>
                      <div className="pdf-summary-title">Plain-language summary</div>
                      <div className="pdf-summary-body">{pair.a.summary.summary}</div>
                      {pair.a.summary.example_scenario && (
                        <>
                          <div className="pdf-summary-divider" />
                          <div className="pdf-summary-sub">Example scenario</div>
                          <div className="pdf-summary-example">{pair.a.summary.example_scenario}</div>
                        </>
                      )}
                      {pair.a.summary.cited_sections && pair.a.summary.cited_sections.length > 0 && (
                        <div className="pdf-summary-basis">
                          Based on: <span className="pdf-summary-basis-mono">{pair.a.summary.cited_sections.join(", ")}</span>
                        </div>
                      )}
                    </aside>
                  )}
                  {includeVerify && pair.a.verify && (
                    <aside className="pdf-verify">
                      <div className="pdf-verify-head">
                        <div className="pdf-verify-title">Citation audit</div>
                        {typeof pair.a.verify.confidence === "number" && (
                          <div className="pdf-verify-conf">
                            Confidence {Math.round(pair.a.verify.confidence * 100)}%
                          </div>
                        )}
                      </div>
                      {pair.a.verify.overall_verdict && (
                        <div className="pdf-verify-verdict">
                          <strong>Verdict:</strong> {pair.a.verify.overall_verdict}
                        </div>
                      )}
                      {pair.a.verify.claims && pair.a.verify.claims.length > 0 && (
                        <ol className="pdf-verify-claims">
                          {pair.a.verify.claims.map((c, i) => (
                            <li key={i} className="pdf-verify-claim">
                              <div className="pdf-verify-claim-head">
                                {c.cited_section && (
                                  <span className="pdf-verify-section">§ {c.cited_section}</span>
                                )}
                                {c.verdict && (
                                  <span className={`pdf-verify-badge pdf-verify-badge--${c.verdict}`}>
                                    {c.verdict.replace(/_/g, " ")}
                                  </span>
                                )}
                                {typeof c.confidence === "number" && (
                                  <span className="pdf-verify-claim-conf">{Math.round(c.confidence * 100)}%</span>
                                )}
                              </div>
                              {c.claim && <div className="pdf-verify-claim-text">{c.claim}</div>}
                              {c.explanation && (
                                <div className="pdf-verify-claim-expl">{c.explanation}</div>
                              )}
                            </li>
                          ))}
                        </ol>
                      )}
                      {pair.a.verify.missing_citations && pair.a.verify.missing_citations.length > 0 && (
                        <div className="pdf-verify-missing">
                          Missing citations: <span className="pdf-verify-missing-mono">{pair.a.verify.missing_citations.join(", ")}</span>
                        </div>
                      )}
                      {pair.a.verify.superseded_sections && pair.a.verify.superseded_sections.length > 0 && (
                        <div className="pdf-verify-missing">
                          Superseded sections: <span className="pdf-verify-missing-mono">{pair.a.verify.superseded_sections.join(", ")}</span>
                        </div>
                      )}
                    </aside>
                  )}
                  {pair.a.citations && pair.a.citations.length > 0 && (
                    <aside className="pdf-citations">
                      <div className="pdf-citations-title">References</div>
                      <ol className="pdf-citations-list">
                        {pair.a.citations.map((c, j) => (
                          <li key={j} className="pdf-citation">
                            <div className="pdf-citation-head">
                              <span className="pdf-citation-doc">
                                {c.document_id || c.document || "Unknown source"}
                              </span>
                              {c.section && (
                                <span className="pdf-citation-sec">§ {c.section}</span>
                              )}
                            </div>
                            {c.text && <div className="pdf-citation-text">"{c.text}"</div>}
                          </li>
                        ))}
                      </ol>
                    </aside>
                  )}
                </div>
                );
              })()}
            </article>
          ))}
        </section>

        <section className="pdf-disclaimer">
          <div className="pdf-disclaimer-title">Legal Disclaimer</div>
          <p className="pdf-disclaimer-text">
            The information in this document is AI-generated and intended for research and
            informational purposes only. It does not constitute legal advice and does not
            establish an attorney-client relationship. For specific legal guidance, consult
            a qualified Bangladesh labour law practitioner. Labor Law Partner makes no
            warranty as to the accuracy or completeness of AI-generated responses.
          </p>
          <div className="pdf-disclaimer-foot">
            © {new Date().getFullYear()} Labor Law Partner · laborlawpartner.com
          </div>
        </section>
      </main>
    </>
  );
}

const PRINT_CSS = `
  /* Hide app chrome for clean PDF render */
  [data-sonner-toaster], [data-sonner-toast] { display: none !important; }
  .cookie-dock, .cookie-card, [data-cookie-banner] { display: none !important; }
  nav, header:not(.pdf-brand), footer:not(.pdf-disclaimer) { display: none !important; }
  [role="dialog"][aria-label*="consent" i] { display: none !important; }

  @page {
    size: A4;
    margin: 18mm 16mm 22mm 16mm;
  }

  html, body {
    background: #ffffff !important;
    color: #0f172a !important;
  }

  body { margin: 0 !important; padding: 0 !important; }

  .pdf-root {
    max-width: 100%;
    margin: 0 auto;
    font-family: "Fraunces", var(--font-bengali), var(--font-devanagari), var(--font-arabic), var(--font-sc), var(--font-kr), var(--font-jp), "Noto Sans Bengali", "Noto Sans Devanagari", "Noto Naskh Arabic", "Noto Sans SC", "Noto Sans KR", "Noto Sans JP", "Noto Sans CJK SC", "Noto Sans CJK KR", "Noto Sans CJK JP", Georgia, serif;
    font-size: 11pt;
    line-height: 1.55;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Cover — compact banner at top of page 1. Small vertical footprint so
     the first Q/A pair can always join on page 1. No page-break-after
     rule: we WANT the flow to continue directly; the avoid rule was
     actively causing a page break when the first exchange happened to
     be tall. */
  .pdf-cover {
    padding: 0 0 3mm;
    border-bottom: 1pt solid #0f172a;
    margin-bottom: 4mm;
  }
  .pdf-brand {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 3mm;
  }
  .pdf-logo { width: 26px; height: 26px; object-fit: contain; }
  .pdf-brand-name {
    font-family: "Fraunces", Georgia, serif;
    font-weight: 600;
    font-size: 12pt;
    color: #0f172a;
    letter-spacing: -0.01em;
  }
  .pdf-brand-tag {
    font-family: "JetBrains Mono", "Geist Mono", ui-monospace, monospace;
    font-size: 6.5pt;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 1px;
  }
  .pdf-eyebrow {
    font-family: "JetBrains Mono", "Geist Mono", ui-monospace, monospace;
    font-size: 7pt;
    color: #b45309;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    margin-bottom: 1.5mm;
  }
  .pdf-doc-title {
    font-family: "Fraunces", Georgia, serif;
    font-weight: 500;
    font-size: 15pt;
    line-height: 1.2;
    letter-spacing: -0.015em;
    color: #0f172a;
    margin: 0 0 2mm 0;
    max-width: 95%;
    overflow-wrap: break-word;
  }
  .pdf-meta-row {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7.5pt;
    color: #64748b;
  }
  .pdf-mono {
    background: #f1f5f9;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 7pt;
  }
  .pdf-cover-notice {
    margin-top: 2.5mm;
    padding: 2mm 3mm;
    background: #fef3c7;
    border-left: 2pt solid #b45309;
    font-size: 8pt;
    font-style: italic;
    color: #78350f;
    line-height: 1.45;
  }

  /* Body */
  .pdf-body {
    padding-top: 2mm;
  }
  .pdf-exchange {
    margin-bottom: 10mm;
    page-break-inside: avoid;
  }
  /* First exchange MUST flow right after the cover — if we keep
     page-break-inside:avoid on it and the exchange is tall, the whole
     thing jumps to page 2 and page 1 sits half-empty. Allow it to
     break internally. Later exchanges keep avoid for cleaner reading. */
  .pdf-exchange:first-of-type { page-break-inside: auto; }
  .pdf-exchange:last-child { margin-bottom: 0; }

  .pdf-label {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    margin-bottom: 3mm;
  }
  .pdf-label-q { color: #64748b; }
  .pdf-label-a { color: #b45309; }

  .pdf-q {
    background: #f8fafc;
    border-left: 2pt solid #cbd5e1;
    padding: 4mm 5mm;
    margin-bottom: 5mm;
    border-radius: 2pt;
  }
  .pdf-q-text {
    font-family: "Fraunces", var(--font-bengali), var(--font-devanagari), var(--font-arabic), var(--font-sc), var(--font-kr), var(--font-jp), "Noto Sans Bengali", "Noto Sans Devanagari", "Noto Naskh Arabic", "Noto Sans SC", "Noto Sans KR", "Noto Sans JP", "Noto Sans CJK SC", "Noto Sans CJK KR", "Noto Sans CJK JP", Georgia, serif;
    font-weight: 400;
    font-size: 12.5pt;
    line-height: 1.45;
    color: #0f172a;
    letter-spacing: -0.005em;
    unicode-bidi: plaintext;
  }
  [dir="rtl"] .pdf-q-text { text-align: right; }

  .pdf-a {
    padding-left: 2mm;
  }

  /* Markdown-rendered answer */
  .pdf-md {
    font-family: "Fraunces", var(--font-bengali), var(--font-devanagari), var(--font-arabic), var(--font-sc), var(--font-kr), var(--font-jp), "Noto Sans Bengali", "Noto Sans Devanagari", "Noto Naskh Arabic", "Noto Sans SC", "Noto Sans KR", "Noto Sans JP", "Noto Sans CJK SC", "Noto Sans CJK KR", "Noto Sans CJK JP", Georgia, serif;
  }
  /* Per-script font hints (browser picks per codepoint) */
  .pdf-md :lang(bn), .pdf-md [lang="bn"] {
    font-family: var(--font-bengali), "Noto Sans Bengali", "Fraunces", sans-serif;
  }
  .pdf-md :lang(hi), .pdf-md [lang="hi"] {
    font-family: var(--font-devanagari), "Noto Sans Devanagari", "Fraunces", sans-serif;
  }
  .pdf-md :lang(ar), .pdf-md :lang(ur), .pdf-md [lang="ar"], .pdf-md [lang="ur"] {
    font-family: var(--font-arabic), "Noto Naskh Arabic", "Amiri", serif;
  }
  .pdf-md :lang(zh), .pdf-md [lang="zh"] {
    font-family: var(--font-sc), "Noto Sans SC", "Noto Sans CJK SC", "PingFang SC", sans-serif;
  }
  .pdf-md :lang(ko), .pdf-md [lang="ko"] {
    font-family: var(--font-kr), "Noto Sans KR", "Noto Sans CJK KR", "Apple SD Gothic Neo", sans-serif;
  }
  .pdf-md :lang(ja), .pdf-md [lang="ja"] {
    font-family: var(--font-jp), "Noto Sans JP", "Noto Sans CJK JP", "Hiragino Sans", sans-serif;
  }

  /* RTL alignment */
  [dir="rtl"] .pdf-p,
  [dir="rtl"] .pdf-li,
  [dir="rtl"] .pdf-h1,
  [dir="rtl"] .pdf-h2,
  [dir="rtl"] .pdf-h3,
  [dir="rtl"] .pdf-h4 {
    text-align: right;
    unicode-bidi: plaintext;
  }
  [dir="rtl"] .pdf-ul,
  [dir="rtl"] .pdf-ol {
    padding-right: 5mm;
    padding-left: 0;
    margin-right: 0;
  }
  [dir="rtl"] .pdf-quote {
    border-left: none;
    border-right: 2.5pt solid #b45309;
    border-radius: 2pt 0 0 2pt;
  }

  .pdf-h1 {
    font-family: "Fraunces", Georgia, serif;
    font-size: 16pt;
    font-weight: 500;
    letter-spacing: -0.015em;
    color: #0f172a;
    margin: 6mm 0 3mm;
    page-break-after: avoid;
  }
  .pdf-h2 {
    font-family: "Fraunces", Georgia, serif;
    font-size: 13.5pt;
    font-weight: 500;
    color: #0f172a;
    margin: 5mm 0 2.5mm;
    page-break-after: avoid;
  }
  .pdf-h3 {
    font-family: "Fraunces", Georgia, serif;
    font-size: 11.5pt;
    font-weight: 600;
    color: #0f172a;
    margin: 4mm 0 2mm;
    page-break-after: avoid;
  }
  .pdf-h4 {
    font-size: 10.5pt;
    font-weight: 600;
    color: #334155;
    margin: 3mm 0 1.5mm;
    page-break-after: avoid;
  }

  .pdf-p {
    margin: 2mm 0;
    font-size: 11pt;
    line-height: 1.6;
    color: #1e293b;
    orphans: 3;
    widows: 3;
  }

  .pdf-strong { font-weight: 600; color: #0f172a; }
  .pdf-a {
    color: #b45309;
    text-decoration: underline;
    text-underline-offset: 1.5pt;
  }

  .pdf-ul, .pdf-ol {
    margin: 2mm 0 2mm 5mm;
    padding: 0;
  }
  .pdf-li {
    margin: 1mm 0;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #1e293b;
  }
  .pdf-ul .pdf-li { list-style-type: disc; }
  .pdf-ol .pdf-li { list-style-type: decimal; }

  .pdf-quote {
    margin: 3mm 0;
    padding: 2.5mm 4mm;
    border-left: 2.5pt solid #b45309;
    background: #fffbeb;
    font-style: italic;
    color: #78350f;
    font-size: 10.5pt;
    line-height: 1.55;
    border-radius: 0 2pt 2pt 0;
  }

  /* Code */
  .pdf-inline-code {
    font-family: "JetBrains Mono", "Geist Mono", ui-monospace, monospace;
    font-size: 9.5pt;
    background: #f1f5f9;
    padding: 0.5pt 3pt;
    border-radius: 2pt;
    color: #b45309;
  }
  .pdf-code {
    margin: 3mm 0;
    border: 1pt solid #e2e8f0;
    border-radius: 3pt;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .pdf-code-lang {
    background: #f8fafc;
    padding: 1mm 3mm;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #64748b;
    border-bottom: 0.5pt solid #e2e8f0;
  }
  .pdf-pre {
    margin: 0;
    padding: 3mm 4mm;
    background: #fafafa;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 9pt;
    line-height: 1.5;
    color: #1e293b;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  /* Tables */
  .pdf-table-wrap {
    margin: 3mm 0;
    overflow: hidden;
    border: 1pt solid #e2e8f0;
    border-radius: 3pt;
    page-break-inside: avoid;
  }
  .pdf-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
  }
  .pdf-thead { background: #f1f5f9; }
  .pdf-th {
    padding: 2mm 3mm;
    text-align: left;
    font-weight: 600;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #475569;
    border-bottom: 1pt solid #cbd5e1;
  }
  .pdf-td {
    padding: 2mm 3mm;
    border-bottom: 0.5pt solid #e2e8f0;
    color: #1e293b;
    vertical-align: top;
  }
  .pdf-table tbody tr:nth-child(even) .pdf-td { background: #fafafa; }

  .pdf-hr {
    border: none;
    border-top: 0.5pt solid #e2e8f0;
    margin: 4mm 0;
  }
  .pdf-img { max-width: 100%; height: auto; margin: 3mm 0; border: 0.5pt solid #e2e8f0; border-radius: 2pt; }

  /* Summary card — amber, matches in-chat SummaryCard aesthetic */
  .pdf-summary {
    margin-top: 5mm;
    padding: 4mm 5mm;
    background: #fffbeb;
    border: 0.5pt solid #fcd34d;
    border-left: 2.5pt solid #d97706;
    border-radius: 0 3pt 3pt 0;
    page-break-inside: avoid;
  }
  .pdf-summary-title {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #b45309;
    margin-bottom: 2mm;
  }
  .pdf-summary-body {
    font-size: 10.5pt;
    line-height: 1.55;
    color: #1f2937;
    font-family: "Fraunces", var(--font-bengali), var(--font-devanagari), var(--font-arabic), var(--font-sc), var(--font-kr), var(--font-jp), "Noto Sans Bengali", "Noto Sans Devanagari", "Noto Naskh Arabic", "Noto Sans CJK SC", "Noto Sans CJK KR", "Noto Sans CJK JP", Georgia, serif;
    unicode-bidi: plaintext;
  }
  .pdf-summary-divider {
    height: 0.5pt;
    background: #fcd34d;
    margin: 3mm 0;
  }
  .pdf-summary-sub {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #b45309;
    margin-bottom: 1.5mm;
  }
  .pdf-summary-example {
    font-size: 10pt;
    line-height: 1.55;
    color: #374151;
    font-style: italic;
    padding: 2.5mm 3mm;
    background: rgba(255,255,255,0.55);
    border: 0.25pt solid rgba(217,119,6,0.2);
    border-radius: 2pt;
    font-family: "Fraunces", var(--font-bengali), var(--font-devanagari), var(--font-arabic), var(--font-sc), var(--font-kr), var(--font-jp), "Noto Sans Bengali", "Noto Sans Devanagari", "Noto Naskh Arabic", "Noto Sans CJK SC", "Noto Sans CJK KR", "Noto Sans CJK JP", Georgia, serif;
    unicode-bidi: plaintext;
  }
  .pdf-summary-basis {
    margin-top: 2.5mm;
    font-size: 8.5pt;
    color: #92400e;
  }
  .pdf-summary-basis-mono {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 8pt;
  }

  /* Clarify block — turn-1 disambiguation cards rendered in-place of Answer.
     No page-break-inside:avoid on the outer block — legacy snapshots can
     carry uncapped option text that bloats the block past one page, which
     would otherwise orphan the whole block to the next page and leave the
     question on an empty page. Per-item avoid is kept so single cards stay
     intact. */
  .pdf-clarify {
    margin-top: 1mm;
    padding: 4mm 5mm;
    background: #eff6ff;
    border: 0.5pt solid #bfdbfe;
    border-left: 2.5pt solid #1d4ed8;
    border-radius: 0 3pt 3pt 0;
  }
  .pdf-clarify-reason {
    font-size: 10.5pt;
    line-height: 1.55;
    color: #1e293b;
    margin-bottom: 3mm;
    font-family: "Fraunces", var(--font-bengali), var(--font-devanagari), var(--font-arabic), var(--font-sc), var(--font-kr), var(--font-jp), "Noto Sans Bengali", "Noto Sans Devanagari", "Noto Naskh Arabic", "Noto Sans CJK SC", "Noto Sans CJK KR", "Noto Sans CJK JP", Georgia, serif;
    unicode-bidi: plaintext;
  }
  .pdf-clarify-sub {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #1e40af;
    margin-bottom: 2mm;
  }
  .pdf-clarify-list {
    margin: 0 0 3mm;
    padding-left: 5mm;
    counter-reset: pdf-clar;
  }
  .pdf-clarify-item {
    margin: 2mm 0;
    padding: 2mm 3mm;
    background: rgba(255,255,255,0.65);
    border: 0.25pt solid rgba(29,78,216,0.2);
    border-radius: 2pt;
    list-style: decimal;
    font-size: 10pt;
    color: #1e293b;
    page-break-inside: avoid;
  }
  .pdf-clarify-title {
    font-weight: 600;
    color: #0f172a;
    font-size: 10.5pt;
  }
  .pdf-clarify-role {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: #dbeafe;
    color: #1e40af;
    padding: 0.5pt 5pt;
    border-radius: 2pt;
    margin-left: 5pt;
  }
  .pdf-clarify-blurb {
    margin-top: 1.5mm;
    font-size: 9.5pt;
    line-height: 1.5;
    color: #334155;
  }
  .pdf-clarify-query {
    margin-top: 1.5mm;
    font-size: 9pt;
    font-style: italic;
    color: #475569;
    line-height: 1.45;
  }
  .pdf-clarify-note {
    font-size: 8.5pt;
    font-style: italic;
    color: #475569;
    line-height: 1.45;
  }

  /* English source block — when user opts in */
  .pdf-en-source {
    margin-top: 5mm;
    padding: 3mm 5mm;
    background: #f8fafc;
    border-left: 2pt solid #64748b;
    border-radius: 0 2pt 2pt 0;
    page-break-inside: avoid;
  }
  .pdf-en-title {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #475569;
    margin-bottom: 2mm;
  }
  .pdf-en-source .pdf-md .pdf-p,
  .pdf-en-source .pdf-md .pdf-li {
    font-size: 9.5pt;
    color: #334155;
  }

  /* Citation audit (Verify) block */
  .pdf-verify {
    margin-top: 5mm;
    padding: 4mm 5mm;
    background: #ecfdf5;
    border: 0.5pt solid #6ee7b7;
    border-left: 2.5pt solid #047857;
    border-radius: 0 3pt 3pt 0;
    page-break-inside: avoid;
  }
  .pdf-verify-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2mm;
  }
  .pdf-verify-title {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #047857;
  }
  .pdf-verify-conf {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 8pt;
    color: #065f46;
  }
  .pdf-verify-verdict {
    font-size: 10pt;
    color: #064e3b;
    margin-bottom: 3mm;
    line-height: 1.5;
  }
  .pdf-verify-claims {
    margin: 0 0 2mm;
    padding: 0;
    list-style: none;
    counter-reset: vclaim;
  }
  .pdf-verify-claim {
    margin: 2mm 0;
    padding: 2mm 3mm;
    background: rgba(255,255,255,0.6);
    border: 0.25pt solid rgba(4,120,87,0.2);
    border-radius: 2pt;
    page-break-inside: avoid;
  }
  .pdf-verify-claim-head {
    display: flex;
    gap: 6px;
    align-items: baseline;
    flex-wrap: wrap;
    margin-bottom: 1.5mm;
  }
  .pdf-verify-section {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 8pt;
    font-weight: 600;
    color: #064e3b;
  }
  .pdf-verify-badge {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.5pt 5pt;
    border-radius: 2pt;
  }
  .pdf-verify-badge--correct {
    background: #d1fae5; color: #065f46; border: 0.25pt solid #34d399;
  }
  .pdf-verify-badge--partially_correct {
    background: #fef3c7; color: #92400e; border: 0.25pt solid #fbbf24;
  }
  .pdf-verify-badge--misquoted {
    background: #fed7aa; color: #9a3412; border: 0.25pt solid #fb923c;
  }
  .pdf-verify-badge--fabricated {
    background: #fee2e2; color: #991b1b; border: 0.25pt solid #f87171;
  }
  .pdf-verify-claim-conf {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7.5pt;
    color: #065f46;
    margin-left: auto;
  }
  .pdf-verify-claim-text {
    font-size: 9.5pt;
    color: #1f2937;
    line-height: 1.5;
    margin-bottom: 1mm;
  }
  .pdf-verify-claim-expl {
    font-size: 9pt;
    font-style: italic;
    color: #475569;
    line-height: 1.45;
  }
  .pdf-verify-missing {
    margin-top: 2mm;
    font-size: 9pt;
    color: #92400e;
  }
  .pdf-verify-missing-mono {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 8.5pt;
  }

  /* Citations */
  .pdf-citations {
    margin-top: 5mm;
    padding: 3mm 4mm;
    background: #f8fafc;
    border-left: 2pt solid #cbd5e1;
    border-radius: 0 2pt 2pt 0;
    page-break-inside: avoid;
  }
  .pdf-citations-title {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #475569;
    margin-bottom: 2mm;
  }
  .pdf-citations-list {
    margin: 0;
    padding-left: 4mm;
    font-size: 9.5pt;
    color: #334155;
    counter-reset: pdf-cite;
  }
  .pdf-citation {
    margin: 1.5mm 0;
    list-style: decimal;
  }
  .pdf-citation-head {
    display: flex;
    gap: 6px;
    align-items: baseline;
    font-weight: 600;
    color: #0f172a;
    font-size: 9.5pt;
  }
  .pdf-citation-doc {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 8.5pt;
    background: #fef3c7;
    padding: 0.5pt 4pt;
    border-radius: 2pt;
    color: #78350f;
  }
  .pdf-citation-sec {
    font-weight: 500;
    color: #475569;
  }
  .pdf-citation-text {
    margin-top: 1mm;
    font-style: italic;
    color: #475569;
    line-height: 1.45;
    font-size: 9pt;
  }

  /* Disclaimer */
  .pdf-disclaimer {
    margin-top: 14mm;
    padding-top: 6mm;
    border-top: 0.75pt solid #cbd5e1;
    page-break-inside: avoid;
  }
  .pdf-disclaimer-title {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #b45309;
    margin-bottom: 3mm;
  }
  .pdf-disclaimer-text {
    font-size: 8.5pt;
    line-height: 1.55;
    color: #475569;
    margin: 0 0 4mm 0;
  }
  .pdf-disclaimer-foot {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 7.5pt;
    color: #94a3b8;
    text-align: center;
    letter-spacing: 0.05em;
  }

  /* Syntax highlight override — lighten for print */
  .pdf-pre .hljs-keyword { color: #b45309; font-weight: 600; }
  .pdf-pre .hljs-string { color: #047857; }
  .pdf-pre .hljs-number { color: #7c3aed; }
  .pdf-pre .hljs-comment { color: #94a3b8; font-style: italic; }
  .pdf-pre .hljs-function, .pdf-pre .hljs-title { color: #1e40af; }
`;
