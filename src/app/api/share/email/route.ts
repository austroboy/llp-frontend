import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

// Simple in-memory rate limit: userId -> timestamps[]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  rateLimitMap.set(userId, recent);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  return true;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  // Send to the logged-in user's email
  const userEmail = user.emailAddresses?.[0]?.emailAddress;
  if (!userEmail) {
    return NextResponse.json({ error: "No email address found on your account" }, { status: 400 });
  }

  const body = await request.json();
  const { scope, conversation_id, message_id } = body;

  // Verify user owns conversation
  const supabase = createServerClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, title")
    .eq("id", conversation_id)
    .eq("user_id", userId)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 403 });
  }

  // Fetch messages
  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content, citations, created_at")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true });

  const allMsgs = messages || [];

  // Select messages for email
  let emailMessages;
  if (scope === "message" && message_id) {
    const targetIdx = allMsgs.findIndex((m) => m.id === message_id);
    if (targetIdx >= 0) {
      const start = targetIdx > 0 && allMsgs[targetIdx - 1].role === "user" ? targetIdx - 1 : targetIdx;
      emailMessages = allMsgs.slice(start, targetIdx + 1);
    } else {
      emailMessages = allMsgs.slice(0, 6);
    }
  } else {
    emailMessages = allMsgs.slice(0, 6);
  }

  const userName = user.firstName || "there";

  const messagesHtml = emailMessages
    .map(
      (m: { role: string; content: string; citations?: { document?: string; section?: string }[] | null }) => `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: bold; color: ${m.role === "user" ? "#0f172a" : "#1e40af"}; text-transform: uppercase; margin-bottom: 4px;">
          ${m.role === "user" ? "You" : "Labor Law Partner"}
        </div>
        <div style="font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">
          ${m.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 2000)}
        </div>
        ${
          m.citations && m.citations.length > 0
            ? `<div style="margin-top: 6px; padding-left: 8px; border-left: 2px solid #cbd5e1; font-size: 12px; color: #64748b;">
                ${m.citations.map((c: { document?: string; section?: string }) => `<div>• ${c.document || ""} — ${c.section || ""}</div>`).join("")}
               </div>`
            : ""
        }
      </div>
    `
    )
    .join('<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0;">');

  const hasMore = allMsgs.length > emailMessages.length;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="padding-bottom: 16px; border-bottom: 2px solid #0f172a; margin-bottom: 20px;">
          <div style="font-size: 20px; font-weight: bold; color: #0f172a;">Labor Law Partner</div>
          <div style="font-size: 12px; color: #64748b;">AI-Powered Legal Research</div>
        </div>

        <p style="margin: 0 0 16px; font-size: 15px;">Hi ${userName},</p>
        <p style="margin: 0 0 16px; color: #555; font-size: 14px;">Here's your saved conversation from Labor Law Partner.</p>

        <div style="font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 16px;">
          ${conversation.title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </div>

        ${messagesHtml}

        ${
          hasMore
            ? `<div style="text-align: center; margin: 16px 0; padding: 12px; background: #f1f5f9; border-radius: 6px;">
                <span style="font-size: 13px; color: #64748b;">+ ${allMsgs.length - emailMessages.length} more messages in this conversation</span>
               </div>`
            : ""
        }

        <div style="background: #fef3c7; padding: 12px; border-radius: 4px; margin-top: 24px;">
          <div style="font-size: 11px; font-weight: bold; color: #92400e;">DISCLAIMER</div>
          <div style="font-size: 11px; color: #92400e; line-height: 1.4;">
            This document contains AI-generated legal information and does not constitute legal advice.
            Consult a qualified legal professional for specific guidance.
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; color: #94a3b8;">Powered by Labor Law Partner</div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await sendEmail({
      to: userEmail,
      subject: `Your conversation: ${conversation.title.slice(0, 60)}`,
      html,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Share email error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
