import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import {
  sendWelcomeEmail,
} from "@/lib/email-experts";
import { trackServer } from "@/lib/posthog/events-server";
import { captureServer } from "@/lib/posthog/server";

/**
 * POST /api/webhooks/clerk
 *
 * Handles Clerk webhook events and forwards identity-tier signals to PostHog
 * server-side capture (no client-side fallback to keep these events tamper-
 * resistant for revenue + retention math):
 * - user.created   → welcome email + `signup_completed`
 * - user.updated   → role change notification
 * - session.created → `login`
 * - session.removed → `logout` (with session_duration_min)
 * - user.deleted   → `account_deleted`
 *
 * Requires CLERK_WEBHOOK_SECRET env var.
 * Register this URL in Clerk Dashboard → Webhooks.
 */

/** Shape of the subset of Clerk svix payload fields we consume. */
type SessionPayload = {
  id?: string;
  user_id?: string;
  created_at?: number;
  abandon_at?: number;
  expire_at?: number;
  last_active_at?: number;
};

type UserCreatedPayload = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email_addresses?: { email_address: string }[];
  external_accounts?: { provider?: string }[];
  public_metadata?: { tier?: string };
  unsafe_metadata?: { utm_source?: string; source?: string };
};

type UserDeletedPayload = {
  id?: string;
  deleted?: boolean;
  public_metadata?: { tier?: string };
  created_at?: number;
};

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify webhook signature
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  let event: { type: string; data: Record<string, unknown> };

  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    switch (event.type) {
      case "user.created": {
        const data = event.data as UserCreatedPayload;
        const { first_name, last_name, email_addresses } = data;
        const email = email_addresses?.[0]?.email_address;
        const name = [first_name, last_name].filter(Boolean).join(" ") || "there";

        if (email) {
          await sendWelcomeEmail({ userName: name, userEmail: email });
        }

        // Identify by Clerk user_id so PostHog row links to the same
        // distinct_id that posthog.identify() uses on first sign-in.
        const userId = data.id ?? "system";
        const externalProvider = data.external_accounts?.[0]?.provider;
        const registrationMethod = externalProvider
          ? `oauth_${externalProvider}`
          : "email";
        await captureServer(userId, "signup_completed", {
          source: "clerk_webhook",
          registration_method: registrationMethod,
          utm_source: data.unsafe_metadata?.utm_source,
          tier_id: data.public_metadata?.tier ?? "free_subscribed",
        });
        // Backwards-compat: keep the old typed wrapper firing too so
        // the existing `signup_completed` chart on the analytics
        // dashboard does not show a regression while the captureServer
        // row picks up the richer property bag.
        await trackServer("signup_completed", { source: "clerk_webhook" });
        break;
      }

      case "session.created": {
        const data = event.data as SessionPayload;
        if (!data.user_id) break;
        // Login method is not in the Clerk payload directly; fall back
        // to "session" until we wire a richer signal (Clerk's
        // session.actor or factor metadata, when stable).
        await captureServer(data.user_id, "login", {
          login_method: "session",
        });
        break;
      }

      case "session.removed":
      case "session.ended":
      case "session.revoked": {
        const data = event.data as SessionPayload;
        if (!data.user_id) break;
        // Clerk timestamps are ms-epoch. last_active_at is closest to
        // a real "logout time"; created_at is the session start. Fall
        // back to abandon_at if last_active is missing.
        const startMs = data.created_at;
        const endMs = data.last_active_at ?? data.abandon_at ?? Date.now();
        const sessionDurationMin =
          startMs && endMs && endMs >= startMs
            ? Math.round((endMs - startMs) / 60000)
            : undefined;
        await captureServer(data.user_id, "logout", {
          session_duration_min: sessionDurationMin,
        });
        break;
      }

      case "user.deleted": {
        const data = event.data as UserDeletedPayload;
        if (!data.id) break;
        const tenureDays =
          typeof data.created_at === "number"
            ? Math.round((Date.now() - data.created_at) / 86_400_000)
            : undefined;
        await captureServer(data.id, "account_deleted", {
          tier_id: data.public_metadata?.tier ?? "free_subscribed",
          tenure_days: tenureDays,
        });
        break;
      }

      case "user.updated": {
        const { first_name, last_name, email_addresses, public_metadata } = event.data as {
          first_name?: string;
          last_name?: string;
          email_addresses?: { email_address: string }[];
          public_metadata?: { role?: string };
        };
        const email = email_addresses?.[0]?.email_address;
        const name = [first_name, last_name].filter(Boolean).join(" ") || "User";
        const newRole = public_metadata?.role;

        // If role was set/changed, notify user
        if (email && newRole) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://laborlawpartner.com";
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          const notificationSecret = process.env.NOTIFICATION_SECRET;
          if (notificationSecret) {
            headers["x-notification-secret"] = notificationSecret;
          }
          await fetch(new URL("/api/notifications", baseUrl).toString(), {
            method: "POST",
            headers,
            body: JSON.stringify({
              type: "consultation_status_updated",
              requesterName: name,
              requesterEmail: email,
              expertArea: `Role: ${newRole}`,
              newStatus: "approved",
              adminNotes: `Your account role has been updated to ${newRole}. You now have access to ${newRole} features.`,
            }),
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: unknown) {
    console.error("[clerk-webhook]", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
