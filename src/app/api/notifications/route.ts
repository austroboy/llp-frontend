import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  sendConsultationConfirmation,
  sendConsultationAdminNotify,
  sendServiceRequestConfirmation,
  sendServiceRequestAdminNotify,
  sendExpertApplicationConfirmation,
  sendExpertApplicationAdminNotify,
  sendExpertStatusUpdate,
} from "@/lib/email";
import {
  sendMandateCreatedNotify,
  sendMandateStatusChanged,
  sendMandateClarificationNeeded,
  sendMandateReleasedToScout,
  sendMandateClosedNotify,
  sendBriefReleasedNotify,
  sendSubmissionReceivedScout,
  sendSubmissionReceivedAdmin,
  sendSubmissionStatusChanged,
  sendPlacementCreatedNotify,
  sendPlacementJoinedNotify,
  sendPayoutReleasedNotify,
  sendReplacementTriggeredNotify,
  sendBlueprintValidationEmail,
  sendBriefReleasedEmail,
} from "@/lib/email-headhunting";
import {
  sendExpertProfilePublished,
  sendExpertBadgeAwarded,
  sendConsultationConnected,
  sendConsultationCompleted,
  sendConsultationStatusUpdate,
  sendServiceStatusUpdate,
  sendBlogSubmittedForReview,
  sendBlogPostPublished,
  sendProfileCompleted,
  sendWelcomeEmail,
  sendCvGenerated,
  sendProfileMilestone,
  sendResourcePublished,
} from "@/lib/email-experts";

/**
 * Internal notification endpoint — called from Convex httpActions or frontend.
 * Protected by a shared secret (NOTIFICATION_SECRET) or an authenticated Clerk session.
 */

function verifySecret(req: NextRequest): boolean {
  const secret = process.env.NOTIFICATION_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("x-notification-secret");
  return provided === secret;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, ...rawData } = body;
  const secretOk = verifySecret(req);
  let data = rawData;

  if (!secretOk) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meta = user.publicMetadata as { role?: string; contributor?: boolean } | undefined;
    const isAdmin = meta?.role === "admin" || meta?.contributor === true;
    const primaryEmail = user.emailAddresses?.[0]?.emailAddress;
    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "User";

    const userAllowedTypes = new Set([
      "consultation_created",
      "service_request_created",
      "expert_application_submitted",
      "cv_generated",
      "profile_milestone",
    ]);
    if (!isAdmin && !userAllowedTypes.has(type)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin) {
      if (!primaryEmail) {
        return NextResponse.json({ error: "No email address found on your account" }, { status: 400 });
      }

      switch (type) {
        case "consultation_created":
          data = {
            ...rawData,
            requesterEmail: primaryEmail,
            requesterName: typeof rawData.requesterName === "string" && rawData.requesterName.trim()
              ? rawData.requesterName
              : displayName,
          };
          break;
        case "service_request_created":
          data = {
            ...rawData,
            requesterEmail: primaryEmail,
            requesterName: typeof rawData.requesterName === "string" && rawData.requesterName.trim()
              ? rawData.requesterName
              : displayName,
          };
          break;
        case "expert_application_submitted":
          data = {
            ...rawData,
            applicantEmail: primaryEmail,
            applicantName: typeof rawData.applicantName === "string" && rawData.applicantName.trim()
              ? rawData.applicantName
              : displayName,
          };
          break;
        case "cv_generated":
          data = {
            ...rawData,
            userEmail: primaryEmail,
            userName: typeof rawData.userName === "string" && rawData.userName.trim()
              ? rawData.userName
              : displayName,
          };
          break;
        case "profile_milestone":
          data = {
            ...rawData,
            userEmail: primaryEmail,
            userName: typeof rawData.userName === "string" && rawData.userName.trim()
              ? rawData.userName
              : displayName,
          };
          break;
      }
    }
  }

  try {
    switch (type) {
      // ── Existing: Consultations ──
      case "consultation_created": {
        const [userResult, adminResult] = await Promise.all([
          sendConsultationConfirmation(data),
          sendConsultationAdminNotify(data),
        ]);
        return NextResponse.json({
          userEmail: userResult,
          adminEmail: adminResult,
        });
      }

      // ── Existing: Services ──
      case "service_request_created": {
        const [userResult, adminResult] = await Promise.all([
          sendServiceRequestConfirmation(data),
          sendServiceRequestAdminNotify(data),
        ]);
        return NextResponse.json({
          userEmail: userResult,
          adminEmail: adminResult,
        });
      }

      // ── Existing: Experts ──
      case "expert_application_submitted": {
        const [userResult, adminResult] = await Promise.all([
          sendExpertApplicationConfirmation(data),
          sendExpertApplicationAdminNotify(data),
        ]);
        return NextResponse.json({
          userEmail: userResult,
          adminEmail: adminResult,
        });
      }

      case "expert_status_updated": {
        const result = await sendExpertStatusUpdate(data);
        return NextResponse.json(result);
      }

      // ── Headhunting: Mandate Lifecycle ──
      case "mandate_created": {
        const result = await sendMandateCreatedNotify(data);
        return NextResponse.json(result);
      }

      case "mandate_status_changed": {
        const result = await sendMandateStatusChanged(data);
        return NextResponse.json(result);
      }

      case "mandate_clarification": {
        const result = await sendMandateClarificationNeeded(data);
        return NextResponse.json(result);
      }

      case "mandate_released": {
        const result = await sendMandateReleasedToScout(data);
        return NextResponse.json(result);
      }

      case "mandate_closed": {
        const result = await sendMandateClosedNotify(data);
        return NextResponse.json(result);
      }

      // ── Headhunting: Brief Releases ──
      case "brief_released": {
        const result = await sendBriefReleasedNotify(data);
        return NextResponse.json(result);
      }

      // ── Headhunting: Submissions ──
      case "submission_received": {
        const [scoutResult, adminResult] = await Promise.all([
          sendSubmissionReceivedScout(data),
          sendSubmissionReceivedAdmin(data),
        ]);
        return NextResponse.json({
          scoutEmail: scoutResult,
          adminEmail: adminResult,
        });
      }

      case "submission_status_changed": {
        const result = await sendSubmissionStatusChanged(data);
        return NextResponse.json(result);
      }

      // ── Headhunting: Placements ──
      case "placement_created": {
        const result = await sendPlacementCreatedNotify(data);
        return NextResponse.json(result);
      }

      case "placement_joined": {
        const result = await sendPlacementJoinedNotify(data);
        return NextResponse.json(result);
      }

      case "payout_released": {
        const result = await sendPayoutReleasedNotify(data);
        return NextResponse.json(result);
      }

      case "replacement_triggered": {
        const result = await sendReplacementTriggeredNotify(data);
        return NextResponse.json(result);
      }

      // ── Blueprint Validation ──
      case "blueprint_validation_sent": {
        await sendBlueprintValidationEmail(data);
        return NextResponse.json({ success: true });
      }

      // ── New-style Brief Released to Scout ──
      case "new_brief_released": {
        await sendBriefReleasedEmail(data);
        return NextResponse.json({ success: true });
      }

      // ── Expert & Consultation ──
      case "expert_profile_published": {
        const result = await sendExpertProfilePublished(data);
        return NextResponse.json(result);
      }

      case "expert_badge_awarded": {
        const result = await sendExpertBadgeAwarded(data);
        return NextResponse.json(result);
      }

      case "consultation_connected": {
        const result = await sendConsultationConnected(data);
        return NextResponse.json(result);
      }

      case "consultation_completed": {
        const result = await sendConsultationCompleted(data);
        return NextResponse.json(result);
      }

      case "consultation_status_updated": {
        const result = await sendConsultationStatusUpdate(data);
        return NextResponse.json(result);
      }

      // ── CV & Resources ──
      case "cv_generated": {
        const result = await sendCvGenerated(data);
        return NextResponse.json(result);
      }

      case "profile_milestone": {
        const result = await sendProfileMilestone(data);
        return NextResponse.json(result);
      }

      case "resource_published": {
        const result = await sendResourcePublished(data);
        return NextResponse.json(result);
      }

      // ── Onboarding ──
      case "welcome": {
        const result = await sendWelcomeEmail(data);
        return NextResponse.json(result);
      }

      // ── Profiles ──
      case "profile_completed": {
        const result = await sendProfileCompleted(data);
        return NextResponse.json(result);
      }

      // ── Blog ──
      case "blog_submitted_for_review": {
        const result = await sendBlogSubmittedForReview(data);
        return NextResponse.json(result);
      }

      case "blog_post_published": {
        const result = await sendBlogPostPublished(data);
        return NextResponse.json(result);
      }

      // ── Services ──
      case "service_status_updated": {
        const result = await sendServiceStatusUpdate(data);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: `Unknown notification type: ${type}` },
          { status: 400 }
        );
    }
  } catch (e: any) {
    console.error(`[notifications] ${type}:`, e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
