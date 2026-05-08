import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sendBlueprintValidationEmail } from "@/lib/email-headhunting";

/**
 * POST /api/blueprint/notify-client
 *
 * Sends the blueprint validation email to the client.
 * Called from the admin blueprint editor after transitioning to "sent_to_client".
 *
 * Body: { blueprintId, clientEmail, clientName, roleTitle }
 *
 * The validationToken is resolved from Convex (it was set by the transitionStatus mutation).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const meta = user?.publicMetadata as { role?: string } | undefined;
    if (!user || meta?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { blueprintId, clientEmail, clientName, roleTitle } = body;

    if (!blueprintId || !clientEmail || !clientName || !roleTitle) {
      return NextResponse.json(
        { error: "Missing required fields: blueprintId, clientEmail, clientName, roleTitle" },
        { status: 400 }
      );
    }

    // Fetch the blueprint from Convex to get the validation token
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const blueprint = await convex.query(api.headhunting.blueprints.getById, {
      id: blueprintId as Id<"htRoleBlueprints">,
    });

    if (!blueprint) {
      return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });
    }

    if (!blueprint.validationToken) {
      return NextResponse.json(
        { error: "Blueprint does not have a validation token. Ensure status is sent_to_client." },
        { status: 400 }
      );
    }

    await sendBlueprintValidationEmail({
      clientEmail,
      clientName,
      roleTitle,
      validationToken: blueprint.validationToken,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[notify-client] Blueprint validation email error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
