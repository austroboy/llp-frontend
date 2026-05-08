import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateGuard } from "@/lib/rate-limit";

export const maxDuration = 60;

interface CandidateData {
  name: string;
  email: string;
  summary: string;
  currentTitle: string;
  currentCompany: string;
  yearsExperience?: number;
  skills: string[];
  fitScore?: number;
  strengths: string[];
  gaps: string[];
  watchouts?: string[]; // Phase 2: 1-3 watchout items
  complianceFlags: string[];
  llpNote?: string; // Phase 2: LLP/Partner internal note
}

interface TopsheetOptions {
  brandType?: "llp" | "partner" | "co_branded"; // Phase 2: dynamic branding
  partnerName?: string;
}

/**
 * POST /api/headhunting/generate-topsheet
 * Generates an LLP-branded HTML topsheet document for shortlisted candidates.
 * Returns HTML that can be opened in browser or printed to PDF.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await rateGuard(request, 5);
  if (blocked) return blocked;

  try {
    const { mandateTitle, candidates, options } = (await request.json()) as {
      mandateTitle: string;
      candidates: CandidateData[];
      options?: TopsheetOptions;
    };

    if (!mandateTitle || !candidates?.length) {
      return NextResponse.json(
        { error: "Mandate title and candidates required" },
        { status: 400 }
      );
    }

    const html = generateTopsheetHTML(mandateTitle, candidates, options);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${mandateTitle.replace(/\s+/g, "-")}-Topsheet.html"`,
      },
    });
  } catch (error) {
    console.error("Topsheet generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate topsheet" },
      { status: 500 }
    );
  }
}

function generateTopsheetHTML(
  mandateTitle: string,
  candidates: CandidateData[],
  options?: TopsheetOptions
): string {
  const brandType = options?.brandType || "llp";
  const partnerName = options?.partnerName || "Partner";
  const brandLabel = brandType === "partner"
    ? `${partnerName} <span>Powered by LLP</span>`
    : brandType === "co_branded"
      ? `${partnerName} <span>× Labor Law Partner</span>`
      : "LLP <span>Universe</span>";
  const brandColor = brandType === "partner" ? "#6366f1" : "#2563eb";
  const now = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const candidateCards = candidates
    .map(
      (c, i) => `
    <div class="candidate-card">
      <div class="candidate-header">
        <div>
          <h3 class="candidate-name">Candidate ${i + 1}${c.name ? ` — ${c.name}` : ""}</h3>
          <p class="candidate-subtitle">${c.currentTitle || ""}${c.currentCompany ? ` at ${c.currentCompany}` : ""}${c.yearsExperience ? ` · ${c.yearsExperience} years` : ""}</p>
        </div>
        ${c.fitScore != null ? `<div class="fit-badge ${c.fitScore >= 70 ? "fit-high" : c.fitScore >= 50 ? "fit-mid" : "fit-low"}">${c.fitScore}% Fit</div>` : ""}
      </div>

      ${c.summary ? `<div class="section"><h4>Executive Summary</h4><p>${c.summary}</p></div>` : ""}

      ${c.skills.length ? `<div class="section"><h4>Key Skills</h4><div class="skill-tags">${c.skills.map((s) => `<span class="tag">${s}</span>`).join("")}</div></div>` : ""}

      ${c.strengths.length ? `<div class="section strengths"><h4>Strengths</h4><ul>${c.strengths.map((s) => `<li>${s}</li>`).join("")}</ul></div>` : ""}

      ${c.gaps.length ? `<div class="section gaps"><h4>Development Areas / Gaps</h4><ul>${c.gaps.map((g) => `<li>${g}</li>`).join("")}</ul></div>` : ""}

      ${c.watchouts?.length ? `<div class="section gaps"><h4>Watchouts</h4><ul>${c.watchouts.map((w) => `<li>${w}</li>`).join("")}</ul></div>` : ""}

      ${c.complianceFlags.length ? `<div class="section compliance"><h4>Compliance Notes</h4><ul>${c.complianceFlags.map((f) => `<li>${f}</li>`).join("")}</ul></div>` : ""}

      ${c.llpNote ? `<div class="section" style="margin-top:12px;padding:8px 12px;background:#f1f5f9;border-radius:4px;font-size:12px;color:#475569;"><strong>${brandType === "partner" ? partnerName : "LLP"} Note:</strong> ${c.llpNote}</div>` : ""}
    </div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LLP Topsheet — ${mandateTitle}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; }

  .cover { text-align: center; padding: 60px 0 40px; border-bottom: 3px solid #2563eb; margin-bottom: 40px; }
  .logo { font-size: 28px; font-weight: 800; color: ${brandColor}; letter-spacing: -1px; }
  .logo span { color: #64748b; font-weight: 400; }
  .cover h1 { font-size: 22px; margin-top: 24px; color: #1e293b; }
  .cover .meta { color: #64748b; font-size: 13px; margin-top: 8px; }

  .summary-bar { display: flex; gap: 24px; margin-bottom: 32px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
  .summary-item { text-align: center; flex: 1; }
  .summary-item .num { font-size: 24px; font-weight: 700; color: ${brandColor}; }
  .summary-item .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

  .candidate-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px; page-break-inside: avoid; }
  .candidate-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
  .candidate-name { font-size: 16px; font-weight: 600; }
  .candidate-subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }

  .fit-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .fit-high { background: #dcfce7; color: #166534; }
  .fit-mid { background: #fef9c3; color: #854d0e; }
  .fit-low { background: #fee2e2; color: #991b1b; }

  .section { margin-top: 12px; }
  .section h4 { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px; }
  .section p { font-size: 13px; line-height: 1.6; }
  .section ul { font-size: 13px; line-height: 1.8; padding-left: 16px; }

  .strengths { border-left: 3px solid #22c55e; padding-left: 12px; }
  .gaps { border-left: 3px solid #ef4444; padding-left: 12px; }
  .compliance { border-left: 3px solid #f59e0b; padding-left: 12px; background: #fffbeb; padding: 8px 12px; border-radius: 4px; }

  .skill-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { padding: 2px 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; font-size: 11px; color: #1d4ed8; }

  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }

  @media print {
    body { padding: 20px; }
    .candidate-card { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="cover">
    <div class="logo">${brandLabel}</div>
    <h1>${mandateTitle}</h1>
    <p class="meta">Candidate Shortlist — ${now} — Confidential</p>
  </div>

  <div class="summary-bar">
    <div class="summary-item">
      <div class="num">${candidates.length}</div>
      <div class="label">Candidates</div>
    </div>
    <div class="summary-item">
      <div class="num">${candidates.filter((c) => (c.fitScore ?? 0) >= 70).length}</div>
      <div class="label">Strong Fit</div>
    </div>
    <div class="summary-item">
      <div class="num">${candidates.filter((c) => (c.fitScore ?? 0) >= 50 && (c.fitScore ?? 0) < 70).length}</div>
      <div class="label">Moderate Fit</div>
    </div>
    <div class="summary-item">
      <div class="num">${Math.round(candidates.reduce((s, c) => s + (c.fitScore ?? 0), 0) / (candidates.length || 1))}%</div>
      <div class="label">Avg Fit Score</div>
    </div>
  </div>

  ${candidateCards}

  <div class="footer">
    <p>Prepared by ${brandType === "partner" ? partnerName + " (Powered by Labor Law Partner)" : "Labor Law Partner Headhunting Division"} — ${now}</p>
    <p>This document is confidential and intended solely for the recipient.</p>
  </div>
</body>
</html>`;
}
