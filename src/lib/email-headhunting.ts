/**
 * Headhunting email templates — mandate lifecycle, scout briefs,
 * submissions, placements, and payout notifications.
 *
 * Uses the shared email infrastructure from ./email.ts
 */

import { sendEmail } from "./email";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://laborlawpartner.com";
const ADMIN_EMAIL = "support@laborlawpartner.com";

// ── Helpers ─────────────────────────────────────────────────────

function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
<div style="max-width:580px;margin:0 auto;padding:24px;">
  <div style="padding-bottom:16px;border-bottom:2px solid #0f172a;margin-bottom:20px;">
    <div style="font-size:20px;font-weight:bold;color:#0f172a;">Labor Law Partner</div>
    <div style="font-size:12px;color:#64748b;">Headhunting &amp; Talent Acquisition</div>
  </div>
  ${body}
  <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;">
    <div style="font-size:11px;color:#94a3b8;">
      <a href="${SITE_URL}" style="color:#94a3b8;">laborlawpartner.com</a> ·
      <a href="mailto:${ADMIN_EMAIL}" style="color:#94a3b8;">${ADMIN_EMAIL}</a>
    </div>
  </div>
</div>
</body></html>`;
}

function infoBox(content: string): string {
  return `<div style="background:#f8f8f9;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">${content}</div>`;
}

function ctaButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;margin-top:8px;">${text}</a>`;
}

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    received: "#f59e0b",
    clarification: "#ef4444",
    architecture: "#8b5cf6",
    internal_review: "#6366f1",
    client_review: "#3b82f6",
    approved: "#22c55e",
    released: "#06b6d4",
    paused: "#9ca3af",
    filled: "#10b981",
    closed: "#6b7280",
  };
  const color = colors[status] || "#6b7280";
  return `<span style="display:inline-block;background:${color}20;color:${color};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${status.replace(/_/g, " ").toUpperCase()}</span>`;
}

// ═══════════════════════════════════════════════════════════════
// 0. HIRING REQUEST ACKNOWLEDGMENT (client-facing)
// ═══════════════════════════════════════════════════════════════

/** Hiring request submitted — acknowledge to the client */
export async function sendHiringRequestAcknowledgment(params: {
  recipientEmail: string;
  recipientName: string;
  assignmentName: string;
  department?: string;
  urgency: string;
  description?: string;
}) {
  const urgencyLabel = params.urgency === "critical" ? "Critical" : params.urgency === "urgent" ? "Urgent" : "Standard";
  const urgencyIcon = params.urgency === "critical" ? "🔴" : params.urgency === "urgent" ? "🟠" : "🟢";

  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Dear ${params.recipientName},</p>
    <p style="margin:0 0 16px;color:#333;font-size:14px;line-height:1.6;">
      Thank you for submitting your hiring request. We have received your requirement and our team will begin reviewing it shortly.
    </p>
    ${infoBox(`
      <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0f172a;">Request Summary</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;width:120px;vertical-align:top;">Role Title</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#0f172a;">${params.assignmentName}</td>
        </tr>
        ${params.department ? `<tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;vertical-align:top;">Department</td>
          <td style="padding:6px 0;font-size:13px;color:#0f172a;">${params.department}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;vertical-align:top;">Urgency</td>
          <td style="padding:6px 0;font-size:13px;color:#0f172a;">${urgencyIcon} ${urgencyLabel}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;vertical-align:top;">Status</td>
          <td style="padding:6px 0;font-size:13px;">${statusBadge("received")}</td>
        </tr>
        ${params.description ? `<tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;vertical-align:top;">Description</td>
          <td style="padding:6px 0;font-size:13px;color:#334155;line-height:1.5;">${params.description}</td>
        </tr>` : ""}
      </table>
    `)}
    <p style="margin:0 0 8px;color:#333;font-size:14px;font-weight:600;">What happens next?</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#0f172a;vertical-align:top;width:24px;">1.</td>
        <td style="padding:8px 0;font-size:13px;color:#334155;line-height:1.5;">Our headhunting team reviews your requirement and may reach out for clarification.</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#0f172a;vertical-align:top;">2.</td>
        <td style="padding:8px 0;font-size:13px;color:#334155;line-height:1.5;">A detailed role brief is created and matched to our scout network.</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#0f172a;vertical-align:top;">3.</td>
        <td style="padding:8px 0;font-size:13px;color:#334155;line-height:1.5;">You receive a curated shortlist of screened candidates.</td>
      </tr>
    </table>
    <p style="margin:0 0 20px;color:#555;font-size:13px;line-height:1.5;">
      You can track the status of your request at any time from your organization dashboard.
    </p>
    ${ctaButton("View Your Requests →", `${SITE_URL}/org/hiring`)}
    <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">
      If you have any questions, reply to this email or contact us at <a href="mailto:${ADMIN_EMAIL}" style="color:#64748b;">${ADMIN_EMAIL}</a>.
    </p>
  `);

  // Send to client
  const clientResult = await sendEmail({
    to: params.recipientEmail,
    subject: `Your hiring request has been received — ${params.assignmentName}`,
    html,
    replyTo: ADMIN_EMAIL,
    templateId: "sendHiringRequestAcknowledgment",
    tokenData: params,
  });

  // Notify admin
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[HT] ${urgencyIcon} New hiring request: ${params.assignmentName} — ${params.recipientName}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;font-size:18px;">📋 New Hiring Request</h2>
      ${infoBox(`
        <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${params.assignmentName}</p>
        <p style="margin:0 0 8px;"><strong>From:</strong> ${params.recipientName} (${params.recipientEmail})</p>
        ${params.department ? `<p style="margin:0 0 8px;"><strong>Department:</strong> ${params.department}</p>` : ""}
        <p style="margin:0 0 8px;"><strong>Urgency:</strong> ${urgencyIcon} ${urgencyLabel}</p>
        ${params.description ? `<p style="margin:8px 0 0;color:#555;font-size:13px;">${params.description}</p>` : ""}
      `)}
      ${ctaButton("Review in Admin →", `${SITE_URL}/admin/headhunting`)}
    `),
    templateId: "sendHiringRequestAcknowledgment",
    tokenData: params,
  });

  return clientResult;
}

// ═══════════════════════════════════════════════════════════════
// 1. MANDATE LIFECYCLE
// ═══════════════════════════════════════════════════════════════

/** Mandate created — notify admin/team lead */
export async function sendMandateCreatedNotify(params: {
  mandateTitle: string;
  clientName: string;
  source: string;
  urgency: string;
  mandateType: string;
  assignedAgentEmail?: string;
}) {
  const urgencyIcon = params.urgency === "critical" ? "🔴" : params.urgency === "urgent" ? "🟠" : "🟢";
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;">📋 New Mandate Received</h2>
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${params.mandateTitle}</p>
      <p style="margin:0 0 8px;"><strong>Client:</strong> ${params.clientName}</p>
      <p style="margin:0 0 8px;"><strong>Source:</strong> ${params.source.replace(/_/g, " ")}</p>
      <p style="margin:0 0 8px;"><strong>Urgency:</strong> ${urgencyIcon} ${params.urgency.toUpperCase()}</p>
      <p style="margin:0;"><strong>Type:</strong> ${params.mandateType.replace(/_/g, " ")}</p>
    `)}
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">This mandate requires initial review and role architecture.</p>
    ${ctaButton("Review Mandate →", `${SITE_URL}/admin/headhunting`)}
  `);

  return sendEmail({
    to: params.assignedAgentEmail || ADMIN_EMAIL,
    subject: `[HT] ${urgencyIcon} New mandate: ${params.mandateTitle} — ${params.clientName}`,
    html,
    templateId: "sendMandateCreatedNotify",
    tokenData: params,
  });
}

/** Mandate status changed — notify client contact + internal */
export async function sendMandateStatusChanged(params: {
  mandateTitle: string;
  clientName: string;
  oldStatus: string;
  newStatus: string;
  note?: string;
  recipientEmail: string;
  recipientName: string;
  mandateId: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.recipientName},</p>
    <p style="margin:0 0 16px;color:#555;">The mandate <strong>${params.mandateTitle}</strong> for ${params.clientName} has been updated.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>Status:</strong> ${statusBadge(params.oldStatus)} → ${statusBadge(params.newStatus)}</p>
      ${params.note ? `<p style="margin:8px 0 0;color:#555;font-size:13px;"><strong>Note:</strong> ${params.note}</p>` : ""}
    `)}
    ${ctaButton("View Mandate →", `${SITE_URL}/admin/headhunting/${params.mandateId}`)}
  `);

  return sendEmail({
    to: params.recipientEmail,
    subject: `[HT] Mandate updated: ${params.mandateTitle} — now ${params.newStatus.replace(/_/g, " ")}`,
    html,
    templateId: "sendMandateStatusChanged",
    tokenData: params,
  });
}

/** Mandate moved to clarification — notify requester for follow-up */
export async function sendMandateClarificationNeeded(params: {
  mandateTitle: string;
  clientName: string;
  recipientEmail: string;
  recipientName: string;
  questions?: string;
  mandateId: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.recipientName},</p>
    <p style="margin:0 0 16px;color:#555;">We need additional information for the mandate <strong>${params.mandateTitle}</strong> (${params.clientName}) before we can proceed.</p>
    ${params.questions ? infoBox(`
      <p style="margin:0 0 8px;font-weight:600;">Clarification Needed:</p>
      <p style="margin:0;color:#555;font-size:13px;">${params.questions}</p>
    `) : ""}
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">Please respond at your earliest convenience so we can move forward.</p>
    ${ctaButton("Respond to Clarification →", `${SITE_URL}/headhunting/client`)}
  `);

  return sendEmail({
    to: params.recipientEmail,
    subject: `[HT] Clarification needed: ${params.mandateTitle}`,
    html,
    replyTo: ADMIN_EMAIL,
    templateId: "sendMandateClarificationNeeded",
    tokenData: params,
  });
}

/** Mandate released — notify scouts about new opportunity */
export async function sendMandateReleasedToScout(params: {
  scoutName: string;
  scoutEmail: string;
  mandateTitle: string;
  roleTitle?: string;
  location?: string;
  seniority?: string;
  disclosureLevel: string;
}) {
  const disclosed = params.disclosureLevel === "disclosed";
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.scoutName},</p>
    <p style="margin:0 0 16px;color:#555;">A new headhunting opportunity has been released to you.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${disclosed ? params.mandateTitle : "Confidential Role"}</p>
      ${params.roleTitle ? `<p style="margin:0 0 8px;"><strong>Role:</strong> ${params.roleTitle}</p>` : ""}
      ${params.location ? `<p style="margin:0 0 8px;"><strong>Location:</strong> ${params.location}</p>` : ""}
      ${params.seniority ? `<p style="margin:0;"><strong>Level:</strong> ${params.seniority}</p>` : ""}
    `)}
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">Log in to view the full brief and start sourcing candidates.</p>
    ${ctaButton("View Brief →", `${SITE_URL}/headhunting/scout`)}
  `);

  return sendEmail({
    to: params.scoutEmail,
    subject: `[HT] New opportunity: ${disclosed ? params.mandateTitle : "Confidential Role"}`,
    html,
    templateId: "sendMandateReleasedToScout",
    tokenData: params,
  });
}

/** Mandate filled/paused/closed — notify scouts */
export async function sendMandateClosedNotify(params: {
  scoutName: string;
  scoutEmail: string;
  mandateTitle: string;
  newStatus: "filled" | "paused" | "closed";
  note?: string;
}) {
  const statusMessages = {
    filled: "has been successfully filled. Thank you for your contributions!",
    paused: "has been temporarily paused. We'll notify you when it resumes.",
    closed: "has been closed. No further submissions are needed.",
  };

  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.scoutName},</p>
    <p style="margin:0 0 16px;color:#555;">The mandate <strong>${params.mandateTitle}</strong> ${statusMessages[params.newStatus]}</p>
    ${params.note ? infoBox(`<p style="margin:0;color:#555;font-size:13px;">${params.note}</p>`) : ""}
    ${ctaButton("View Your Dashboard →", `${SITE_URL}/headhunting/scout`)}
  `);

  return sendEmail({
    to: params.scoutEmail,
    subject: `[HT] Mandate ${params.newStatus}: ${params.mandateTitle}`,
    html,
    templateId: "sendMandateClosedNotify",
    tokenData: params,
  });
}

// ═══════════════════════════════════════════════════════════════
// 2. BRIEF RELEASES
// ═══════════════════════════════════════════════════════════════

/** Brief released to individual scout */
export async function sendBriefReleasedNotify(params: {
  scoutName: string;
  scoutEmail: string;
  mandateTitle: string;
  compensationMode: string;
  roleTitle?: string;
  location?: string;
}) {
  const compLabel = params.compensationMode === "revenue_share" ? "Revenue Share" : "Fixed Bounty";
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.scoutName},</p>
    <p style="margin:0 0 16px;color:#555;">A new brief has been released to you for sourcing.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${params.mandateTitle}</p>
      ${params.roleTitle ? `<p style="margin:0 0 8px;"><strong>Role:</strong> ${params.roleTitle}</p>` : ""}
      ${params.location ? `<p style="margin:0 0 8px;"><strong>Location:</strong> ${params.location}</p>` : ""}
      <p style="margin:0;"><strong>Compensation:</strong> ${compLabel}</p>
    `)}
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">Review the brief details and start sourcing candidates.</p>
    ${ctaButton("View Brief Details →", `${SITE_URL}/headhunting/scout`)}
  `);

  return sendEmail({
    to: params.scoutEmail,
    subject: `[HT] Brief released: ${params.mandateTitle}`,
    html,
    templateId: "sendBriefReleasedNotify",
    tokenData: params,
  });
}

// ═══════════════════════════════════════════════════════════════
// 3. SUBMISSIONS
// ═══════════════════════════════════════════════════════════════

/** Submission received — acknowledge to scout + notify admin */
export async function sendSubmissionReceivedScout(params: {
  scoutName: string;
  scoutEmail: string;
  candidateName: string;
  mandateTitle: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.scoutName},</p>
    <p style="margin:0 0 16px;color:#555;">Your candidate submission has been received and is being reviewed.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>Candidate:</strong> ${params.candidateName}</p>
      <p style="margin:0;"><strong>Mandate:</strong> ${params.mandateTitle}</p>
    `)}
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">You'll receive an update once the screening is complete.</p>
    ${ctaButton("View Submissions →", `${SITE_URL}/headhunting/scout`)}
  `);

  return sendEmail({
    to: params.scoutEmail,
    subject: `[HT] Submission received: ${params.candidateName} for ${params.mandateTitle}`,
    html,
    templateId: "sendSubmissionReceivedScout",
    tokenData: params,
  });
}

/** Submission received — notify admin/assignment team */
export async function sendSubmissionReceivedAdmin(params: {
  scoutName: string;
  candidateName: string;
  mandateTitle: string;
  mandateId: string;
}) {
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;">📄 New Candidate Submission</h2>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>Candidate:</strong> ${params.candidateName}</p>
      <p style="margin:0 0 8px;"><strong>Mandate:</strong> ${params.mandateTitle}</p>
      <p style="margin:0;"><strong>Submitted by:</strong> ${params.scoutName}</p>
    `)}
    ${ctaButton("Review Submission →", `${SITE_URL}/admin/headhunting/${params.mandateId}`)}
  `);

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `[HT] New submission: ${params.candidateName} — ${params.mandateTitle}`,
    html,
    templateId: "sendSubmissionReceivedAdmin",
    tokenData: params,
  });
}

/** Submission status changed — notify scout */
export async function sendSubmissionStatusChanged(params: {
  scoutName: string;
  scoutEmail: string;
  candidateName: string;
  mandateTitle: string;
  oldStatus: string;
  newStatus: string;
  rejectionReason?: string;
}) {
  const isPositive = ["shortlisted", "interview", "selected", "offer", "joined"].includes(params.newStatus);
  const isRejected = params.newStatus === "rejected";

  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.scoutName},</p>
    <p style="margin:0 0 16px;color:#555;">
      ${isPositive
        ? `Great news! Your candidate <strong>${params.candidateName}</strong> has progressed to the next stage.`
        : isRejected
          ? `We have an update on your candidate <strong>${params.candidateName}</strong>.`
          : `Your candidate <strong>${params.candidateName}</strong> status has been updated.`
      }
    </p>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>Mandate:</strong> ${params.mandateTitle}</p>
      <p style="margin:0 0 8px;"><strong>Status:</strong> ${statusBadge(params.oldStatus)} → ${statusBadge(params.newStatus)}</p>
      ${isRejected && params.rejectionReason ? `<p style="margin:8px 0 0;color:#555;font-size:13px;"><strong>Reason:</strong> ${params.rejectionReason}</p>` : ""}
    `)}
    ${ctaButton("View Details →", `${SITE_URL}/headhunting/scout`)}
  `);

  return sendEmail({
    to: params.scoutEmail,
    subject: `[HT] ${params.candidateName} — ${params.newStatus.replace(/_/g, " ")} (${params.mandateTitle})`,
    html,
    templateId: "sendSubmissionStatusChanged",
    tokenData: params,
  });
}

// ═══════════════════════════════════════════════════════════════
// 4. PLACEMENTS
// ═══════════════════════════════════════════════════════════════

/** Placement created (offer accepted) — notify scout */
export async function sendPlacementCreatedNotify(params: {
  scoutName: string;
  scoutEmail: string;
  candidateName: string;
  mandateTitle: string;
  clientName: string;
  salary?: number;
  feeAmount?: number;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.scoutName},</p>
    <p style="margin:0 0 16px;color:#555;">🎉 Congratulations! A placement has been confirmed for your candidate.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;">Placement Confirmed</p>
      <p style="margin:0 0 8px;"><strong>Candidate:</strong> ${params.candidateName}</p>
      <p style="margin:0 0 8px;"><strong>Mandate:</strong> ${params.mandateTitle}</p>
      <p style="margin:0 0 8px;"><strong>Client:</strong> ${params.clientName}</p>
      ${params.salary ? `<p style="margin:0 0 8px;"><strong>Salary:</strong> ৳${params.salary.toLocaleString()}/month</p>` : ""}
      ${params.feeAmount ? `<p style="margin:0;"><strong>Fee:</strong> ৳${params.feeAmount.toLocaleString()}</p>` : ""}
    `)}
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">The protection window has started. You'll receive payout details shortly.</p>
    ${ctaButton("View Placement →", `${SITE_URL}/headhunting/scout`)}
  `);

  return sendEmail({
    to: params.scoutEmail,
    subject: `[HT] 🎉 Placement confirmed: ${params.candidateName} at ${params.clientName}`,
    html,
    templateId: "sendPlacementCreatedNotify",
    tokenData: params,
  });
}

/** Candidate joined — notify scout with fee/invoice details */
export async function sendPlacementJoinedNotify(params: {
  scoutName: string;
  scoutEmail: string;
  candidateName: string;
  mandateTitle: string;
  clientName: string;
  feeAmount?: number;
  protectionMonths?: number;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.scoutName},</p>
    <p style="margin:0 0 16px;color:#555;">✅ <strong>${params.candidateName}</strong> has officially joined ${params.clientName}. The protection period is now active.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>Mandate:</strong> ${params.mandateTitle}</p>
      ${params.feeAmount ? `<p style="margin:0 0 8px;"><strong>Placement Fee:</strong> ৳${params.feeAmount.toLocaleString()}</p>` : ""}
      ${params.protectionMonths ? `<p style="margin:0;"><strong>Protection Window:</strong> ${params.protectionMonths} months</p>` : ""}
    `)}
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">Your payout will be processed once the protection window clears.</p>
    ${ctaButton("View Details →", `${SITE_URL}/headhunting/scout`)}
  `);

  return sendEmail({
    to: params.scoutEmail,
    subject: `[HT] ✅ ${params.candidateName} joined ${params.clientName} — protection active`,
    html,
    templateId: "sendPlacementJoinedNotify",
    tokenData: params,
  });
}

/** Payout released — notify scout */
export async function sendPayoutReleasedNotify(params: {
  scoutName: string;
  scoutEmail: string;
  candidateName: string;
  rewardAmount: number;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.scoutName},</p>
    <p style="margin:0 0 16px;color:#555;">💰 Your payout has been released!</p>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>Candidate:</strong> ${params.candidateName}</p>
      <p style="margin:0;font-size:20px;font-weight:bold;color:#16a34a;">৳${params.rewardAmount.toLocaleString()}</p>
    `)}
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">The payment will be processed according to your payment terms.</p>
    ${ctaButton("View Earnings →", `${SITE_URL}/headhunting/scout`)}
  `);

  return sendEmail({
    to: params.scoutEmail,
    subject: `[HT] 💰 Payout released: ৳${params.rewardAmount.toLocaleString()} for ${params.candidateName}`,
    html,
    templateId: "sendPayoutReleasedNotify",
    tokenData: params,
  });
}

// ═══════════════════════════════════════════════════════════════
// 5. BLUEPRINT VALIDATION (sent_to_client)
// ═══════════════════════════════════════════════════════════════

/** Blueprint ready for client review — send validation link */
export async function sendBlueprintValidationEmail(params: {
  clientEmail: string;
  clientName: string;
  roleTitle: string;
  validationToken: string;
}): Promise<void> {
  const validationUrl = `${SITE_URL}/blueprint/validate/${params.validationToken}`;

  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Dear ${params.clientName},</p>
    <p style="margin:0 0 16px;color:#333;font-size:14px;line-height:1.6;">
      Labor Law Partner has prepared a detailed role blueprint for <strong>${params.roleTitle}</strong>.
      This document captures our understanding of the position requirements, candidate profile, and search parameters.
    </p>
    <p style="margin:0 0 16px;color:#333;font-size:14px;line-height:1.6;">
      We kindly request you to review the blueprint and either approve it or provide your revisions.
      Your feedback ensures we target the right candidates for your organization.
    </p>
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#0f172a;">Role Blueprint</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;width:120px;">Role Title</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#0f172a;">${params.roleTitle}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Status</td>
          <td style="padding:6px 0;font-size:13px;">${statusBadge("client_review")}</td>
        </tr>
      </table>
    `)}
    <p style="margin:0 0 8px;color:#333;font-size:14px;font-weight:600;">What you can do:</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="padding:6px 12px;font-size:13px;color:#0f172a;vertical-align:top;width:24px;">1.</td>
        <td style="padding:6px 0;font-size:13px;color:#334155;line-height:1.5;"><strong>Approve</strong> — Confirm the blueprint is accurate and we can proceed to sourcing.</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;font-size:13px;color:#0f172a;vertical-align:top;">2.</td>
        <td style="padding:6px 0;font-size:13px;color:#334155;line-height:1.5;"><strong>Request Revisions</strong> — Flag specific areas that need adjustment.</td>
      </tr>
    </table>
    <div style="text-align:center;margin:24px 0;">
      ${ctaButton("Review Blueprint", validationUrl)}
    </div>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">
      This link is valid for 30 days. If you have questions, reply to this email or contact us at
      <a href="mailto:${ADMIN_EMAIL}" style="color:#64748b;">${ADMIN_EMAIL}</a>.
    </p>
  `);

  await sendEmail({
    to: params.clientEmail,
    subject: `LLP — Role Blueprint Ready for Your Review: ${params.roleTitle}`,
    html,
    replyTo: ADMIN_EMAIL,
    templateId: "sendBlueprintValidationEmail",
    tokenData: params,
  });

  // Notify admin that validation was sent
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[HT] Blueprint validation sent: ${params.roleTitle} — ${params.clientName}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;font-size:18px;">Blueprint Sent for Client Validation</h2>
      ${infoBox(`
        <p style="margin:0 0 8px;"><strong>Role:</strong> ${params.roleTitle}</p>
        <p style="margin:0 0 8px;"><strong>Client:</strong> ${params.clientName} (${params.clientEmail})</p>
        <p style="margin:0;"><strong>Validation Link:</strong> <a href="${validationUrl}" style="color:#3b82f6;">${validationUrl}</a></p>
      `)}
    `),
    templateId: "sendBlueprintValidationEmail",
    tokenData: params,
  });
}

// ═══════════════════════════════════════════════════════════════
// 6. SCOUT BRIEF RELEASE NOTIFICATION (new-style briefs)
// ═══════════════════════════════════════════════════════════════

/** Notify scout that a new-style brief has been released to them */
export async function sendBriefReleasedEmail(params: {
  scoutEmail: string;
  scoutName: string;
  roleTitle: string;
  briefId: string;
}): Promise<void> {
  const briefUrl = `${SITE_URL}/headhunting/scout/briefs/new/${params.briefId}`;

  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.scoutName},</p>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6;">
      A new role brief for <strong>${params.roleTitle}</strong> has been released to you.
      Review the brief details and start sourcing qualified candidates.
    </p>
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${params.roleTitle}</p>
      <p style="margin:0;font-size:13px;color:#64748b;">View the full brief for must-haves, critical match criteria, and submission guidance.</p>
    `)}
    <div style="text-align:center;margin:20px 0;">
      ${ctaButton("View Brief Details", briefUrl)}
    </div>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">
      If you have questions about this brief, contact us at
      <a href="mailto:${ADMIN_EMAIL}" style="color:#64748b;">${ADMIN_EMAIL}</a>.
    </p>
  `);

  await sendEmail({
    to: params.scoutEmail,
    subject: `LLP — New Role Brief Available: ${params.roleTitle}`,
    html,
    templateId: "sendBriefReleasedEmail",
    tokenData: params,
  });
}

// ═══════════════════════════════════════════════════════════════
// 7. REPLACEMENTS
// ═══════════════════════════════════════════════════════════════

/** Replacement triggered — notify client + team + scout */
export async function sendReplacementTriggeredNotify(params: {
  recipientName: string;
  recipientEmail: string;
  candidateName: string;
  mandateTitle: string;
  clientName: string;
  reason?: string;
  mandateId: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.recipientName},</p>
    <p style="margin:0 0 16px;color:#555;">⚠️ A replacement has been triggered for <strong>${params.candidateName}</strong>.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>Mandate:</strong> ${params.mandateTitle}</p>
      <p style="margin:0 0 8px;"><strong>Client:</strong> ${params.clientName}</p>
      ${params.reason ? `<p style="margin:0;color:#555;font-size:13px;"><strong>Reason:</strong> ${params.reason}</p>` : ""}
    `)}
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">The mandate has been re-opened for sourcing. All pending payouts are frozen pending resolution.</p>
    ${ctaButton("View Mandate →", `${SITE_URL}/admin/headhunting/${params.mandateId}`)}
  `);

  return sendEmail({
    to: params.recipientEmail,
    subject: `[HT] ⚠️ Replacement triggered: ${params.candidateName} — ${params.mandateTitle}`,
    html,
    templateId: "sendReplacementTriggeredNotify",
    tokenData: params,
  });
}
