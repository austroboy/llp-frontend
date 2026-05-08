/**
 * Expert & Consultation + Service email templates.
 */

import { sendEmail } from "./email";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://laborlawpartner.com";
const ADMIN_EMAIL = "support@laborlawpartner.com";

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

// ═══════════════════════════════════════════════════════════════
// EXPERT NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

/** Expert profile published */
export async function sendExpertProfilePublished(params: {
  expertName: string;
  expertEmail: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.expertName},</p>
    <p style="margin:0 0 16px;color:#555;">Your expert profile is now <strong style="color:#16a34a;">live</strong> on the Labor Law Partner platform. Users can now find and connect with you.</p>
    ${ctaButton("View Your Profile →", `${SITE_URL}/experts`)}
  `);

  return sendEmail({
    to: params.expertEmail,
    subject: "Your expert profile is now live!",
    html,
    templateId: "sendExpertProfilePublished",
    tokenData: params,
  });
}

/** Expert badge awarded */
export async function sendExpertBadgeAwarded(params: {
  expertName: string;
  expertEmail: string;
  badge: string;
  awardedBy: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.expertName},</p>
    <p style="margin:0 0 16px;color:#555;">You've been awarded a new badge on the Labor Law Partner platform!</p>
    <div style="background:#fefce8;border:2px solid #fde047;border-radius:10px;padding:20px;margin:16px 0;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🏅</div>
      <div style="font-size:18px;font-weight:700;color:#0f172a;">${params.badge}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;">Awarded by ${params.awardedBy}</div>
    </div>
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">This badge is visible on your expert profile.</p>
    ${ctaButton("View Your Profile →", `${SITE_URL}/experts`)}
  `);

  return sendEmail({
    to: params.expertEmail,
    subject: `New badge awarded: ${params.badge}`,
    html,
    templateId: "sendExpertBadgeAwarded",
    tokenData: params,
  });
}

// ═══════════════════════════════════════════════════════════════
// CONSULTATION NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

/** Consultation connected — expert assigned, notify requester */
export async function sendConsultationConnected(params: {
  requesterName: string;
  requesterEmail: string;
  expertName: string;
  expertArea: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.requesterName},</p>
    <p style="margin:0 0 16px;color:#555;">Your consultation request has been reviewed and an expert has been assigned to assist you.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>Expert:</strong> ${params.expertName}</p>
      <p style="margin:0;"><strong>Area:</strong> ${params.expertArea}</p>
    `)}
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">The expert will reach out to you shortly. You can also view details in your dashboard.</p>
    ${ctaButton("View Dashboard →", `${SITE_URL}/dashboard`)}
  `);

  return sendEmail({
    to: params.requesterEmail,
    subject: `Expert assigned to your consultation — ${params.expertName}`,
    html,
    replyTo: ADMIN_EMAIL,
    templateId: "sendConsultationConnected",
    tokenData: params,
  });
}

/** Consultation completed — ask for feedback */
export async function sendConsultationCompleted(params: {
  requesterName: string;
  requesterEmail: string;
  expertArea: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.requesterName},</p>
    <p style="margin:0 0 16px;color:#555;">Your consultation for <strong>${params.expertArea}</strong> has been marked as completed. We hope it was helpful!</p>
    <p style="margin:0 0 16px;color:#555;">Your feedback helps us improve and helps other users find the best experts.</p>
    ${ctaButton("Share Your Feedback →", `${SITE_URL}/dashboard`)}
  `);

  return sendEmail({
    to: params.requesterEmail,
    subject: "Consultation completed — how was your experience?",
    html,
    templateId: "sendConsultationCompleted",
    tokenData: params,
  });
}

/** Consultation status change (generic) */
export async function sendConsultationStatusUpdate(params: {
  requesterName: string;
  requesterEmail: string;
  expertArea: string;
  newStatus: string;
  adminNotes?: string;
}) {
  const statusMessages: Record<string, string> = {
    reviewed: "Your consultation request has been reviewed by our team.",
    connected: "An expert has been assigned to your consultation.",
    completed: "Your consultation has been completed.",
    cancelled: "Your consultation request has been cancelled.",
  };

  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.requesterName},</p>
    <p style="margin:0 0 16px;color:#555;">${statusMessages[params.newStatus] || `Your consultation status is now: ${params.newStatus}.`}</p>
    ${infoBox(`
      <p style="margin:0 0 8px;"><strong>Area:</strong> ${params.expertArea}</p>
      <p style="margin:0;"><strong>Status:</strong> <span style="text-transform:capitalize;font-weight:600;">${params.newStatus}</span></p>
      ${params.adminNotes ? `<p style="margin:8px 0 0;color:#555;font-size:13px;"><strong>Note:</strong> ${params.adminNotes}</p>` : ""}
    `)}
    ${ctaButton("View Dashboard →", `${SITE_URL}/dashboard`)}
  `);

  return sendEmail({
    to: params.requesterEmail,
    subject: `Consultation update: ${params.newStatus}`,
    html,
    templateId: "sendConsultationStatusUpdate",
    tokenData: params,
  });
}

// ═══════════════════════════════════════════════════════════════
// CV & RESOURCE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

/** CV generated/saved — notify user */
export async function sendCvGenerated(params: {
  userName: string;
  userEmail: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.userName},</p>
    <p style="margin:0 0 16px;color:#555;">Your CV has been generated and saved to your profile. You can download it anytime from your dashboard.</p>
    ${ctaButton("View Your CV →", `${SITE_URL}/dashboard/profile`)}
  `);

  return sendEmail({
    to: params.userEmail,
    subject: "Your CV has been generated!",
    html,
    templateId: "sendCvGenerated",
    tokenData: params,
  });
}

/** Profile milestone reached (50% or 75%) */
export async function sendProfileMilestone(params: {
  userName: string;
  userEmail: string;
  milestone: number;
}) {
  const tips: Record<number, string> = {
    50: "Add your work experience and education to get better job recommendations.",
    75: "Almost there! Add a profile photo and LinkedIn link to complete your profile.",
  };

  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.userName},</p>
    <p style="margin:0 0 16px;color:#555;">Your professional profile is <strong>${params.milestone}% complete</strong>!</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
      <div style="font-size:32px;font-weight:800;color:#16a34a;">${params.milestone}%</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;">Profile Completion</div>
    </div>
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">${tips[params.milestone] || "Keep going!"}</p>
    ${ctaButton("Complete Your Profile →", `${SITE_URL}/dashboard/profile`)}
  `);

  return sendEmail({
    to: params.userEmail,
    subject: `Your profile is ${params.milestone}% complete`,
    html,
    templateId: "sendProfileMilestone",
    tokenData: params,
  });
}

/** Resource published — notify admin */
export async function sendResourcePublished(params: {
  resourceTitle: string;
  fileName: string;
  language: string;
}) {
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;">📚 New Resource Published</h2>
    <div style="background:#f8f8f9;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${params.resourceTitle}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#555;">File: ${params.fileName}</p>
      <p style="margin:0;font-size:13px;color:#555;">Language: ${params.language.toUpperCase()}</p>
    </div>
    ${ctaButton("View Resources →", `${SITE_URL}/resources`)}
  `);

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Resource] Published: ${params.resourceTitle}`,
    html,
    templateId: "sendResourcePublished",
    tokenData: params,
  });
}

// ═══════════════════════════════════════════════════════════════
// ONBOARDING NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

/** Welcome email — sent after user signs up (via Clerk webhook) */
export async function sendWelcomeEmail(params: {
  userName: string;
  userEmail: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.userName},</p>
    <p style="margin:0 0 16px;color:#555;">Welcome to <strong>Labor Law Partner</strong> — Bangladesh's AI-powered labour law compliance platform.</p>
    <p style="margin:0 0 16px;color:#555;">Here's what you can do:</p>
    <ul style="color:#555;font-size:14px;padding-left:20px;margin:0 0 16px;">
      <li style="margin-bottom:8px;"><strong>Ask questions</strong> about Bangladesh labour law using our AI chatbot</li>
      <li style="margin-bottom:8px;"><strong>Search jobs</strong> from LinkedIn, BdJobs, and more</li>
      <li style="margin-bottom:8px;"><strong>Build your profile</strong> and get AI-powered job recommendations</li>
      <li style="margin-bottom:8px;"><strong>Connect with experts</strong> for consultations</li>
    </ul>
    ${ctaButton("Get Started →", `${SITE_URL}`)}
  `);

  return sendEmail({
    to: params.userEmail,
    subject: "Welcome to Labor Law Partner!",
    html,
    templateId: "sendWelcomeEmail",
    tokenData: params,
  });
}

// ═══════════════════════════════════════════════════════════════
// PROFILE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

/** Profile completed — congratulate user */
export async function sendProfileCompleted(params: {
  userName: string;
  userEmail: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.userName},</p>
    <p style="margin:0 0 16px;color:#555;">Congratulations! Your professional profile is now <strong style="color:#16a34a;">complete</strong>.</p>
    <p style="margin:0 0 16px;color:#555;">You'll now receive personalized job recommendations and can be discovered by recruiters on the platform.</p>
    ${ctaButton("View Your Profile →", `${SITE_URL}/dashboard/profile`)}
  `);

  return sendEmail({
    to: params.userEmail,
    subject: "Your professional profile is complete!",
    html,
    templateId: "sendProfileCompleted",
    tokenData: params,
  });
}

// ═══════════════════════════════════════════════════════════════
// BLOG NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

/** Blog post submitted for review — notify admin */
export async function sendBlogSubmittedForReview(params: {
  authorName: string;
  postTitle: string;
}) {
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;">📝 Blog Post Submitted for Review</h2>
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${params.postTitle}</p>
      <p style="margin:0;"><strong>Author:</strong> ${params.authorName}</p>
    `)}
    ${ctaButton("Review in Admin →", `${SITE_URL}/admin/blog`)}
  `);

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Blog] Review requested: ${params.postTitle} by ${params.authorName}`,
    html,
    templateId: "sendBlogSubmittedForReview",
    tokenData: params,
  });
}

/** Blog post approved/published — notify author */
export async function sendBlogPostPublished(params: {
  authorName: string;
  authorEmail: string;
  postTitle: string;
  slug: string;
}) {
  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.authorName},</p>
    <p style="margin:0 0 16px;color:#555;">Your blog post has been <strong style="color:#16a34a;">published</strong>!</p>
    ${infoBox(`
      <p style="margin:0;font-size:16px;font-weight:600;">${params.postTitle}</p>
    `)}
    <p style="margin:16px 0 8px;color:#555;font-size:14px;">It's now live and visible to all users on the platform.</p>
    ${ctaButton("View Your Post →", `${SITE_URL}/blog/${params.slug}`)}
  `);

  return sendEmail({
    to: params.authorEmail,
    subject: `Your blog post is live: ${params.postTitle}`,
    html,
    templateId: "sendBlogPostPublished",
    tokenData: params,
  });
}

// ═══════════════════════════════════════════════════════════════
// SERVICE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

/** Service request status change */
export async function sendServiceStatusUpdate(params: {
  requesterName: string;
  requesterEmail: string;
  serviceTitle: string;
  orderNumber?: string;
  newStatus: string;
  adminNotes?: string;
}) {
  const statusMessages: Record<string, string> = {
    reviewed: "Your service request has been reviewed.",
    in_progress: "Your service request is now being worked on.",
    completed: "Your service request has been completed!",
    cancelled: "Your service request has been cancelled.",
  };

  const html = emailLayout(`
    <p style="margin:0 0 16px;font-size:15px;">Hi ${params.requesterName},</p>
    <p style="margin:0 0 16px;color:#555;">${statusMessages[params.newStatus] || `Service status updated to: ${params.newStatus}.`}</p>
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${params.serviceTitle}</p>
      ${params.orderNumber ? `<p style="margin:0 0 8px;"><strong>Order #:</strong> ${params.orderNumber}</p>` : ""}
      <p style="margin:0;"><strong>Status:</strong> <span style="text-transform:capitalize;font-weight:600;">${params.newStatus.replace(/_/g, " ")}</span></p>
      ${params.adminNotes ? `<p style="margin:8px 0 0;color:#555;font-size:13px;"><strong>Note:</strong> ${params.adminNotes}</p>` : ""}
    `)}
    ${params.newStatus === "completed"
      ? `<p style="margin:16px 0 8px;color:#555;font-size:14px;">We'd love to hear your feedback!</p>`
      : ""
    }
    ${ctaButton("View Dashboard →", `${SITE_URL}/dashboard`)}
  `);

  return sendEmail({
    to: params.requesterEmail,
    subject: `[Service] ${params.serviceTitle} — ${params.newStatus.replace(/_/g, " ")}${params.orderNumber ? ` (${params.orderNumber})` : ""}`,
    html,
    templateId: "sendServiceStatusUpdate",
    tokenData: params,
  });
}
