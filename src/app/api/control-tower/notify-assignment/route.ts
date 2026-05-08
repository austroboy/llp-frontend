import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    const meta = user?.publicMetadata as { role?: string; contributor?: boolean } | undefined;
    const canNotify = meta?.role === "admin" || meta?.contributor === true;
    if (!user || !canNotify) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      assigneeName: string;
      assigneeEmail: string;
      taskTitle: string;
      workstreamName: string;
      priority: string;
      dueDate?: number;
    };

    const dueLine = body.dueDate
      ? `<p style="margin:0 0 8px;"><strong>Due:</strong> ${new Date(body.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>`
      : "";

    const priorityColor: Record<string, string> = {
      low: "#6b7280",
      medium: "#3b82f6",
      high: "#f97316",
      critical: "#ef4444",
    };
    const pColor = priorityColor[body.priority] || "#111";

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; max-width:560px; margin:0 auto; padding:24px; color:#111;">
        <div style="margin-bottom:24px;">
          <h2 style="margin:0; font-size:20px;">📋 Task Assigned to You</h2>
        </div>
        <p style="margin:0 0 16px;">Hi ${body.assigneeName},</p>
        <p style="margin:0 0 16px; color:#555;">A task has been assigned to you in the LLP Control Tower.</p>

        <div style="background:#f8f8f9; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0 0 8px; font-size:16px; font-weight:600;">${body.taskTitle}</p>
          <p style="margin:0 0 8px; color:#555;"><strong>Workstream:</strong> ${body.workstreamName}</p>
          <p style="margin:0 0 8px; color:${pColor};"><strong>Priority:</strong> ${body.priority.toUpperCase()}</p>
          ${dueLine}
        </div>

        <a href="https://laborlawpartner.com/admin/control-tower"
           style="display:inline-block; background:#111; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-size:14px; font-weight:500; margin-top:8px;">
          Open Control Tower →
        </a>

        <p style="margin-top:32px; font-size:11px; color:#9ca3af; border-top:1px solid #f3f4f6; padding-top:16px;">
          Labor Law Partner · Control Tower · <a href="https://laborlawpartner.com" style="color:#9ca3af;">laborlawpartner.com</a>
        </p>
      </div>
    `;

    const result = await sendEmail({
      from: "LLP Control Tower <noreply@laborlawpartner.com>",
      to: body.assigneeEmail,
      subject: `[LLP] Task assigned: ${body.taskTitle}`,
      html,
    });

    return NextResponse.json({ ok: result.success, id: result.id });
  } catch (err) {
    console.error("[notify-assignment]", err);
    return NextResponse.json({ ok: false }, { status: 200 }); // never break the caller
  }
}
