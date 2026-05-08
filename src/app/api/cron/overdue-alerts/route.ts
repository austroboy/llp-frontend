import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { sendEmail } from "@/lib/email";
import { safeEqual } from "@/lib/timing-safe";

/**
 * GET /api/cron/overdue-alerts
 *
 * Daily cron that checks:
 * 1. Approval requests pending > 5 days → escalation email to admin
 * 2. User profiles inactive > 30 days → re-engagement email
 *
 * Protected by CRON_SECRET.
 */

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
      <a href="${SITE_URL}" style="color:#94a3b8;">laborlawpartner.com</a>
    </div>
  </div>
</div>
</body></html>`;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const provided = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!safeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const now = Date.now();
  const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const results = { overdue: 0, reengagement: 0, errors: [] as string[] };

  try {
    // 1. Check overdue approval requests (pending > 5 days)
    const approvals = await convex.query(api.approvalRequests.list, { status: "pending" });
    const overdue = (approvals || []).filter(
      (a) => a.status === "pending" && (now - a.createdAt) > FIVE_DAYS
    );

    if (overdue.length > 0) {
      const items = overdue.map((a) => {
        const days = Math.floor((now - a.createdAt) / (24 * 60 * 60 * 1000));
        return `<li style="margin-bottom:6px;"><strong>${a.title}</strong> by ${a.requesterName} — <span style="color:#dc2626;">${days} days pending</span></li>`;
      }).join("");

      const html = emailLayout(`
        <h2 style="margin:0 0 16px;font-size:18px;">⏰ Overdue Approvals (${overdue.length})</h2>
        <p style="margin:0 0 16px;color:#555;">The following approval requests have been pending for more than 5 days:</p>
        <ul style="color:#555;font-size:14px;padding-left:20px;margin:0 0 16px;">${items}</ul>
        <a href="${SITE_URL}/admin/approvals" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">Review Approvals →</a>
      `);

      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `[LLP] ⏰ ${overdue.length} overdue approval${overdue.length > 1 ? "s" : ""} need attention`,
        html,
      });
      results.overdue = overdue.length;
    }

    // 2. Check inactive users (profile not updated > 30 days)
    const profiles = await convex.query(api.professionalProfiles.listEmailEnabled, {});
    const inactive = (profiles || []).filter(
      (p) => p.emailNotifications && p.email && (now - p.updatedAt) > THIRTY_DAYS
    );

    for (const p of inactive.slice(0, 20)) { // Max 20 re-engagement emails per day
      try {
        const html = emailLayout(`
          <p style="margin:0 0 16px;font-size:15px;">Hi ${p.fullName || "there"},</p>
          <p style="margin:0 0 16px;color:#555;">We noticed you haven't visited Labor Law Partner in a while. Here's what's new:</p>
          <ul style="color:#555;font-size:14px;padding-left:20px;margin:0 0 16px;">
            <li style="margin-bottom:8px;">New jobs posted daily from LinkedIn & BdJobs</li>
            <li style="margin-bottom:8px;">AI-powered job recommendations based on your profile</li>
            <li style="margin-bottom:8px;">Expert consultation services available</li>
          </ul>
          <a href="${SITE_URL}/jobs" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">Browse New Jobs →</a>
          <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">
            <a href="${SITE_URL}/dashboard/profile" style="color:#94a3b8;">Manage email preferences</a>
          </p>
        `);

        await sendEmail({
          to: p.email!,
          subject: "We miss you! New jobs and features await",
          html,
        });
        results.reengagement++;
      } catch (e) {
        results.errors.push(`Re-engagement for ${p.userId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      checkedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    console.error("[cron/overdue-alerts]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
