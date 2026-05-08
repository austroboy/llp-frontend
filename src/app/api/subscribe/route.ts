import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateGuard } from "@/lib/rate-limit";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LEN = 254; // RFC 5321
const MAX_NAME_LEN = 120;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  // Anti-abuse: 5 signups/min per IP/user. Subscribe is unauthenticated +
  // service-role-backed, so rate-limit it before any DB hit.
  const blocked = await rateGuard(request, 5);
  if (blocked) return blocked;

  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = String(body.email ?? "").trim().toLowerCase();
    const rawName = body.name ? String(body.name).trim() : null;

    // Length caps before regex — cheap rejection for hostile payloads.
    if (rawEmail.length > MAX_EMAIL_LEN || (rawName && rawName.length > MAX_NAME_LEN)) {
      return NextResponse.json(
        { error: "Input too long." },
        { status: 400 }
      );
    }

    const email = rawEmail;
    const name = rawName;

    if (!email || !EMAIL_RX.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: existing, error: fetchError } = await supabase
      .from("email_subscribers")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) {
      console.error("subscribe fetch error:", fetchError);
      return NextResponse.json(
        { error: "Subscription temporarily unavailable. Try again shortly." },
        { status: 500 }
      );
    }

    if (existing) {
      if (existing.status === "unsubscribed") {
        const { error: reactivateError } = await supabase
          .from("email_subscribers")
          .update({
            status: "active",
            unsubscribed_at: null,
            updated_at: new Date().toISOString(),
            ...(name ? { name } : {}),
          })
          .eq("id", existing.id);

        if (reactivateError) {
          console.error("subscribe reactivate error:", reactivateError);
          return NextResponse.json(
            { error: "Could not reactivate subscription. Try again." },
            { status: 500 }
          );
        }
        return NextResponse.json({ status: "reactivated" });
      }
      return NextResponse.json({ status: "already_subscribed" });
    }

    const { error: insertError } = await supabase
      .from("email_subscribers")
      .insert({
        email,
        name,
        source: "website_form",
        status: "active",
        tags: [],
      });

    if (insertError) {
      console.error("subscribe insert error:", insertError);
      return NextResponse.json(
        { error: "Could not save subscription. Try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "subscribed" });
  } catch (error) {
    console.error("subscribe handler error:", error);
    return NextResponse.json(
      { error: "Subscription temporarily unavailable." },
      { status: 500 }
    );
  }
}
