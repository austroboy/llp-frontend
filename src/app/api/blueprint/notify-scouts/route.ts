import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { sendBriefReleasedEmail } from "@/lib/email-headhunting";

/**
 * POST /api/blueprint/notify-scouts
 *
 * Sends brief release notification emails to selected scouts.
 * Called from the admin brief release page after releasing a brief.
 *
 * Body: { briefId, roleTitle, scouts: { email, name }[] }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const meta = user?.publicMetadata as { role?: string } | undefined;
    if (!user || meta?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { briefId, roleTitle, scouts } = body;

    if (!briefId || !roleTitle || !Array.isArray(scouts)) {
      return NextResponse.json(
        { error: "Missing required fields: briefId, roleTitle, scouts[]" },
        { status: 400 }
      );
    }

    // Send emails in parallel but don't fail the whole request if one fails
    const results = await Promise.allSettled(
      scouts.map((scout: { email: string; name: string }) =>
        sendBriefReleasedEmail({
          scoutEmail: scout.email,
          scoutName: scout.name,
          roleTitle,
          briefId,
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0) {
      console.error(
        "[notify-scouts] Some emails failed:",
        results
          .filter((r) => r.status === "rejected")
          .map((r) => (r as PromiseRejectedResult).reason?.message)
      );
    }

    return NextResponse.json({ sent, failed, total: scouts.length });
  } catch (e: any) {
    console.error("[notify-scouts] Brief release email error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
