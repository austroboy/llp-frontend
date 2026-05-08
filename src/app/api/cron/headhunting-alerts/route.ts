import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { sendEmail } from "@/lib/email";
import { safeEqual } from "@/lib/timing-safe";

/**
 * GET /api/cron/headhunting-alerts
 *
 * Scheduled endpoint (Vercel cron or external scheduler) that checks:
 * 1. Brief releases expiring within 7 days
 * 2. Placements with protection windows expiring within 30 days
 *
 * Should be called daily. Protected by CRON_SECRET header.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://laborlawpartner.com";
const ADMIN_EMAIL = "support@laborlawpartner.com";

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
      <a href="${SITE_URL}" style="color:#94a3b8;">laborlawpartner.com</a>
    </div>
  </div>
</div>
</body></html>`;
}

export async function GET(req: NextRequest) {
  // Verify cron secret
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
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const alerts: string[] = [];

  try {
    // 1. Check protection windows expiring within 30 days
    const placements = await convex.query(api.headhunting.placements.list, {});
    const expiringPlacements = placements.filter((p) => {
      if (p.status !== "protection_active" || !p.protectionWindowEnd) return false;
      const timeLeft = p.protectionWindowEnd - now;
      return timeLeft > 0 && timeLeft < THIRTY_DAYS;
    });

    for (const p of expiringPlacements) {
      const daysLeft = Math.ceil((p.protectionWindowEnd! - now) / (24 * 60 * 60 * 1000));
      const html = emailLayout(`
        <h2 style="margin:0 0 16px;font-size:18px;">⏰ Protection Window Expiring</h2>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px;"><strong>Candidate:</strong> ${p.candidateName}</p>
          <p style="margin:0 0 8px;"><strong>Mandate:</strong> ${p.mandateTitle}</p>
          <p style="margin:0 0 8px;"><strong>Client:</strong> ${p.clientName}</p>
          <p style="margin:0;font-size:16px;font-weight:bold;color:#ea580c;">⏳ ${daysLeft} days remaining</p>
        </div>
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">
          Once the protection window clears, held payouts will become eligible for release.
        </p>
        <a href="${SITE_URL}/admin/headhunting/revenue" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;margin-top:8px;">View Revenue Dashboard →</a>
      `);

      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `[HT] ⏰ Protection expiring in ${daysLeft}d: ${p.candidateName} — ${p.clientName}`,
        html,
      });
      alerts.push(`Protection expiring: ${p.candidateName} (${daysLeft}d left)`);
    }

    // 2. Check brief releases older than 7 days with no submissions
    // We check released mandates and notify scouts about expiring briefs
    const mandates = await convex.query(api.headhunting.mandates.list, { status: "released" });
    for (const m of mandates) {
      const releasedAge = now - m.updatedAt;
      // Notify at 7 days and 14 days
      if (releasedAge > SEVEN_DAYS && releasedAge < SEVEN_DAYS + 24 * 60 * 60 * 1000) {
        const html = emailLayout(`
          <h2 style="margin:0 0 16px;font-size:18px;">📢 Brief Reminder</h2>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${m.rawTitle}</p>
            <p style="margin:0 0 8px;"><strong>Client:</strong> ${m.clientName}</p>
            <p style="margin:0;color:#555;font-size:13px;">This mandate has been open for 7 days. Please check on scout submissions.</p>
          </div>
          <a href="${SITE_URL}/admin/headhunting" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;margin-top:8px;">View Mandates →</a>
        `);

        await sendEmail({
          to: ADMIN_EMAIL,
          subject: `[HT] 📢 Brief open 7d: ${m.rawTitle} — check submissions`,
          html,
        });
        alerts.push(`Brief 7d reminder: ${m.rawTitle}`);
      }
    }

    return NextResponse.json({
      success: true,
      alertsSent: alerts.length,
      alerts,
      checkedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    console.error("[cron/headhunting-alerts]", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
