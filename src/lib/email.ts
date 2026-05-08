/**
 * Shared email utility — all transactional emails go through here.
 * Uses AWS SES v2 with noreply@laborlawpartner.com as default sender.
 */

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { getEmailOverride, renderOverride } from "./email-overrides";

const FROM_DEFAULT = "Labor Law Partner <noreply@laborlawpartner.com>";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://laborlawpartner.com";
const ADMIN_EMAIL = "support@laborlawpartner.com";

let _ses: SESv2Client | null = null;
function getSES(): SESv2Client {
  if (!_ses) {
    _ses = new SESv2Client({ region: process.env.AWS_REGION || "us-east-1" });
  }
  return _ses;
}

// ─── Email wrapper ───────────────────────────────────────────────

function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
<div style="max-width:580px;margin:0 auto;padding:24px;">
  <div style="padding-bottom:16px;border-bottom:2px solid #0f172a;margin-bottom:20px;">
    <div style="font-size:20px;font-weight:bold;color:#0f172a;">Labor Law Partner</div>
    <div style="font-size:12px;color:#64748b;">Bangladesh Labour Law Compliance Platform</div>
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

// ─── Send helper ─────────────────────────────────────────────────

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  cc?: string[];
  replyTo?: string;
  /** If set, checks Convex for an admin override of this template. When an
   *  override exists, its stored subject + HTML replace the params ones (with
   *  `{{tokens}}` interpolated against `tokenData`). */
  templateId?: string;
  /** Data object used to substitute `{{tokens}}` in the override strings. */
  tokenData?: Record<string, unknown>;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  let subject = params.subject;
  let html = params.html;

  if (params.templateId) {
    const override = await getEmailOverride(params.templateId);
    if (override) {
      const rendered = renderOverride(override, params.tokenData || {});
      subject = rendered.subject;
      html = rendered.html;
    }
  }

  try {
    const ses = getSES();
    const command = new SendEmailCommand({
      FromEmailAddress: params.from || FROM_DEFAULT,
      Destination: {
        ToAddresses: Array.isArray(params.to) ? params.to : [params.to],
        CcAddresses: params.cc || [],
      },
      ReplyToAddresses: params.replyTo ? [params.replyTo] : [],
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Html: { Data: html, Charset: "UTF-8" } },
        },
      },
      ConfigurationSetName: "llp-production",
    });
    const result = await ses.send(command);
    return { success: true, id: result.MessageId };
  } catch (e: any) {
    console.error("[sendEmail]", e);
    return { success: false, error: e.message };
  }
}

// ─── Notification Templates ──────────────────────────────────────

/** Consultation request — confirmation to requester */
export async function sendConsultationConfirmation(params: {
  requesterName: string;
  requesterEmail: string;
  expertArea: string;
  urgency: string;
  description: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.requesterName},</p>
    <p style="margin:0 0 16px;color:#555;">Thank you for submitting a consultation request. Our team will review it and connect you with a qualified expert shortly.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>Area:</strong> ${params.expertArea}</p>
      <p style="margin:0 0 8px;"><strong>Urgency:</strong> ${params.urgency === "urgent" ? "🔴 Urgent" : "🟢 Normal"}</p>
      <p style="margin:0;color:#555;font-size:13px;">${params.description.slice(0, 300)}</p>
    `)}
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">We typically respond within 24 hours for normal requests and 4 hours for urgent ones.</p>
    ${ctaButton("View Your Dashboard →", `${SITE_URL}/dashboard`)}
  `);

  return sendEmail({
    to: params.requesterEmail,
    subject: "Your consultation request has been received",
    html,
    templateId: "sendConsultationConfirmation",
    tokenData: params,
  });
}

/** Consultation request — notify admin */
export async function sendConsultationAdminNotify(params: {
  requesterName: string;
  requesterEmail: string;
  expertArea: string;
  urgency: string;
  description: string;
}) {
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;">📋 New Consultation Request</h2>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>From:</strong> ${params.requesterName} (${params.requesterEmail})</p>
      <p style="margin:0 0 8px;"><strong>Area:</strong> ${params.expertArea}</p>
      <p style="margin:0 0 8px;"><strong>Urgency:</strong> ${params.urgency === "urgent" ? "🔴 URGENT" : "Normal"}</p>
      <p style="margin:0;color:#555;font-size:13px;">${params.description.slice(0, 500)}</p>
    `)}
    ${ctaButton("Review in Admin →", `${SITE_URL}/admin/consultations`)}
  `);

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `[LLP] ${params.urgency === "urgent" ? "🔴 URGENT " : ""}Consultation request from ${params.requesterName}`,
    html,
    replyTo: params.requesterEmail,
    templateId: "sendConsultationAdminNotify",
    tokenData: params,
  });
}

/** Service request — confirmation to requester */
export async function sendServiceRequestConfirmation(params: {
  requesterName: string;
  requesterEmail: string;
  serviceTitle: string;
  serviceCategory: string;
  orderNumber: string;
  description: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.requesterName},</p>
    <p style="margin:0 0 16px;color:#555;">Your service request has been received. We'll review it and get back to you shortly.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${params.serviceTitle}</p>
      <p style="margin:0 0 8px;"><strong>Order #:</strong> ${params.orderNumber}</p>
      <p style="margin:0 0 8px;"><strong>Category:</strong> ${params.serviceCategory}</p>
      <p style="margin:0;color:#555;font-size:13px;">${params.description.slice(0, 300)}</p>
    `)}
    ${ctaButton("View Your Dashboard →", `${SITE_URL}/dashboard`)}
  `);

  return sendEmail({
    to: params.requesterEmail,
    subject: `Service request received — ${params.orderNumber}`,
    html,
    templateId: "sendServiceRequestConfirmation",
    tokenData: params,
  });
}

/** Service request — notify admin */
export async function sendServiceRequestAdminNotify(params: {
  requesterName: string;
  requesterEmail: string;
  serviceTitle: string;
  serviceCategory: string;
  orderNumber: string;
  description: string;
}) {
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;">🛎️ New Service Request</h2>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>From:</strong> ${params.requesterName} (${params.requesterEmail})</p>
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${params.serviceTitle}</p>
      <p style="margin:0 0 8px;"><strong>Order #:</strong> ${params.orderNumber}</p>
      <p style="margin:0 0 8px;"><strong>Category:</strong> ${params.serviceCategory}</p>
      <p style="margin:0;color:#555;font-size:13px;">${params.description.slice(0, 500)}</p>
    `)}
    ${ctaButton("Review in Admin →", `${SITE_URL}/admin/services`)}
  `);

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `[LLP] New service request ${params.orderNumber} — ${params.serviceTitle}`,
    html,
    replyTo: params.requesterEmail,
    templateId: "sendServiceRequestAdminNotify",
    tokenData: params,
  });
}

/** Expert application — confirmation to applicant */
export async function sendExpertApplicationConfirmation(params: {
  applicantName: string;
  applicantEmail: string;
  specialization: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.applicantName},</p>
    <p style="margin:0 0 16px;color:#555;">Thank you for applying to join the Labor Law Partner Expert Network. Your application has been submitted for review.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>Specialization:</strong> ${params.specialization}</p>
      <p style="margin:0;color:#555;font-size:13px;">Our team reviews applications within 3–5 business days. You'll receive an email when a decision is made.</p>
    `)}
    ${ctaButton("View Your Profile →", `${SITE_URL}/dashboard/profile`)}
  `);

  return sendEmail({
    to: params.applicantEmail,
    subject: "Expert application received — under review",
    html,
    templateId: "sendExpertApplicationConfirmation",
    tokenData: params,
  });
}

/** Expert application — notify admin */
export async function sendExpertApplicationAdminNotify(params: {
  applicantName: string;
  applicantEmail: string;
  specialization: string;
}) {
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;">👤 New Expert Application</h2>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>Applicant:</strong> ${params.applicantName} (${params.applicantEmail})</p>
      <p style="margin:0;"><strong>Specialization:</strong> ${params.specialization}</p>
    `)}
    ${ctaButton("Review in Admin →", `${SITE_URL}/admin/experts`)}
  `);

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `[LLP] New expert application from ${params.applicantName}`,
    html,
    replyTo: params.applicantEmail,
    templateId: "sendExpertApplicationAdminNotify",
    tokenData: params,
  });
}

/** Expert application — status update (approved/rejected) */
export async function sendExpertStatusUpdate(params: {
  applicantName: string;
  applicantEmail: string;
  status: "approved" | "rejected";
  reason?: string;
}) {
  const approved = params.status === "approved";
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.applicantName},</p>
    ${approved
      ? `<p style="margin:0 0 16px;color:#555;">Congratulations! Your application to the Labor Law Partner Expert Network has been <strong style="color:#16a34a;">approved</strong>.</p>
         <p style="margin:0 0 16px;color:#555;">Your profile is now live on our platform. You may receive consultation requests from users seeking your expertise.</p>
         ${ctaButton("View Your Expert Profile →", `${SITE_URL}/experts`)}`
      : `<p style="margin:0 0 16px;color:#555;">After careful review, we're unable to approve your expert application at this time.</p>
         ${params.reason ? `<p style="margin:0 0 16px;color:#555;"><strong>Reason:</strong> ${params.reason}</p>` : ""}
         <p style="margin:0 0 16px;color:#555;">You're welcome to reapply with updated credentials. If you have questions, please reply to this email.</p>`
    }
  `);

  return sendEmail({
    to: params.applicantEmail,
    subject: approved
      ? "Your expert application has been approved!"
      : "Update on your expert application",
    html,
    replyTo: ADMIN_EMAIL,
    templateId: "sendExpertStatusUpdate",
    tokenData: params,
  });
}
