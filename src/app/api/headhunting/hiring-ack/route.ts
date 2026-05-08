import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sendHiringRequestAcknowledgment } from "@/lib/email-headhunting";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const recipientEmail = user?.primaryEmailAddress?.emailAddress?.trim();
    const recipientName =
      user?.fullName?.trim() || user?.firstName?.trim() || "there";

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "No verified primary email available for current user" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { assignmentName, department, urgency, description } = body as {
      assignmentName?: string;
      department?: string;
      urgency?: string;
      description?: string;
    };

    if (!assignmentName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await sendHiringRequestAcknowledgment({
      recipientEmail,
      recipientName,
      assignmentName,
      department,
      urgency: urgency || "standard",
      description,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[hiring-ack] Failed to send email:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
