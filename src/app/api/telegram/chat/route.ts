import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import {
  type Tier,
  type ClerkTierMetadata,
  resolveTier,
} from "@/lib/ai/framework-types";
import {
  getTierConfigAsync,
  checkDailyRequestLimitAsync,
} from "@/lib/ai/tier-middleware";
import { safeEqual } from "@/lib/timing-safe";

export const maxDuration = 60;

const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY || "";
const CHAT_PROXY_URL = process.env.CHAT_PROXY_URL;
if (!CHAT_PROXY_URL && process.env.NODE_ENV === "production") {
  throw new Error("CHAT_PROXY_URL env required");
}

// ── Auth: verify request is from the orchestrator ──
function authenticateRequest(req: NextRequest): boolean {
  if (!TELEGRAM_API_KEY) return false;
  const auth = req.headers.get("authorization");
  if (!auth) return false;
  // Strip "Bearer " prefix and constant-time compare against secret.
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  return safeEqual(provided, TELEGRAM_API_KEY);
}

// ── Clerk: find user by email ──
async function findUserByEmail(email: string) {
  const clerk = await clerkClient();
  const users = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
  return users.data[0] || null;
}

// ── Clerk: find user by telegramId in publicMetadata ──
async function findUserByTelegramId(telegramId: string) {
  const clerk = await clerkClient();
  // Search all users — Clerk doesn't support metadata queries directly,
  // so we check our Supabase mapping table instead
  const supabase = createServerClient();
  const { data } = await supabase
    .from("telegram_users")
    .select("clerk_user_id, email, tier")
    .eq("telegram_id", telegramId)
    .limit(1);

  if (!data || data.length === 0) return null;

  try {
    const user = await clerk.users.getUser(data[0].clerk_user_id);
    return user;
  } catch {
    return null;
  }
}

// ── Link telegram user to Clerk ──
async function linkTelegramUser(telegramId: string, clerkUserId: string, email: string) {
  const supabase = createServerClient();
  await supabase.from("telegram_users").upsert(
    {
      telegram_id: telegramId,
      clerk_user_id: clerkUserId,
      email,
      verified_at: new Date().toISOString(),
    },
    { onConflict: "telegram_id" }
  );

  // Also store in Clerk metadata
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(clerkUserId);
  const existing = (user.publicMetadata || {}) as Record<string, unknown>;
  await clerk.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { ...existing, telegramId },
  });
}

export async function POST(req: NextRequest) {
  if (!authenticateRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, telegram_id, email, message, history } = body;

    // ── Action: check ── Is this telegram user verified?
    if (action === "check") {
      if (!telegram_id) return NextResponse.json({ error: "telegram_id required" }, { status: 400 });

      const user = await findUserByTelegramId(telegram_id);
      if (!user) {
        return NextResponse.json({ verified: false });
      }

      const metadata = user.publicMetadata as ClerkTierMetadata | undefined;
      const tier: Tier = metadata?.tier ? resolveTier(metadata) : "free_subscribed";
      const tierConfig = await getTierConfigAsync(tier);

      // Check daily limit
      let requestCount = 0;
      try {
        const { ConvexHttpClient } = await import("convex/browser");
        const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        const { api: convexApi } = await import("../../../../../convex/_generated/api");
        const usage = await convexClient.query(convexApi.tokenUsage.getToday, { userId: user.id });
        if (usage) requestCount = usage.requestCount;
      } catch {}

      const limitCheck = await checkDailyRequestLimitAsync(tier, requestCount);

      return NextResponse.json({
        verified: true,
        tier,
        dailyLimit: limitCheck.limit,
        dailyUsed: requestCount,
        dailyRemaining: Math.max(0, limitCheck.limit - requestCount),
        allowed: limitCheck.allowed,
      });
    }

    // ── Action: lookup ── Check if email exists in Clerk
    if (action === "lookup") {
      if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

      const user = await findUserByEmail(email.trim().toLowerCase());
      if (!user) {
        return NextResponse.json({
          found: false,
          message: "No account found with this email. Please sign up at https://www.laborlawpartner.com/sign-up",
        });
      }

      return NextResponse.json({
        found: true,
        userId: user.id,
        firstName: user.firstName,
      });
    }

    // ── Action: send_code ── Send verification code to email via Clerk
    if (action === "send_code") {
      if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

      const user = await findUserByEmail(email.trim().toLowerCase());
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Find the email address object and send verification
      const emailObj = user.emailAddresses.find(
        (e) => e.emailAddress === email.trim().toLowerCase()
      );
      if (!emailObj) {
        return NextResponse.json({ error: "Email not found on user" }, { status: 404 });
      }

      // Generate a 6-digit code, store in Supabase with 10min TTL
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const supabase = createServerClient();
      await supabase.from("telegram_verification_codes").upsert(
        {
          email: email.trim().toLowerCase(),
          code,
          clerk_user_id: user.id,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
        { onConflict: "email" }
      );

      // Send verification code via centralized email function
      await sendEmail({
        to: email.trim().toLowerCase(),
        from: "LLP Universe <noreply@laborlawpartner.com>",
        subject: "Your verification code for LLP Universe Telegram",
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111;">
          <p>Your verification code is:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:4px;margin:16px 0;">${code}</p>
          <p style="color:#666;">This code expires in 10 minutes.</p>
          <p style="color:#999;font-size:13px;margin-top:24px;">If you did not request this, please ignore this email.</p>
        </div>`,
      });

      return NextResponse.json({
        sent: true,
        message: `Verification code sent to ${email}. Please enter the 6-digit code.`,
      });
    }

    // ── Action: verify_code ── Verify the code and link accounts
    if (action === "verify_code") {
      if (!email || !telegram_id) {
        return NextResponse.json({ error: "email and telegram_id required" }, { status: 400 });
      }
      const { code } = body;
      if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

      const supabase = createServerClient();
      const { data } = await supabase
        .from("telegram_verification_codes")
        .select("code, clerk_user_id, expires_at")
        .eq("email", email.trim().toLowerCase())
        .limit(1);

      if (!data || data.length === 0) {
        return NextResponse.json({ verified: false, message: "No verification code found. Please request a new one." });
      }

      if (new Date(data[0].expires_at) < new Date()) {
        return NextResponse.json({ verified: false, message: "Code expired. Please request a new one." });
      }

      if (data[0].code !== code.trim()) {
        return NextResponse.json({ verified: false, message: "Invalid code. Please try again." });
      }

      // Link accounts
      await linkTelegramUser(telegram_id, data[0].clerk_user_id, email.trim().toLowerCase());

      // Clean up verification code
      await supabase.from("telegram_verification_codes").delete().eq("email", email.trim().toLowerCase());

      return NextResponse.json({
        verified: true,
        message: "Account verified! You can now ask labour law questions.",
      });
    }

    // ── Action: chat ── Authenticated chat request
    if (action === "chat") {
      if (!telegram_id || !message) {
        return NextResponse.json({ error: "telegram_id and message required" }, { status: 400 });
      }

      // Verify user
      const user = await findUserByTelegramId(telegram_id);
      if (!user) {
        return NextResponse.json({
          error: "not_verified",
          message: "Please verify your account first. Send your email address to get started.",
        }, { status: 403 });
      }

      // Resolve tier + limits
      const metadata = user.publicMetadata as ClerkTierMetadata | undefined;
      const tier: Tier = metadata?.tier ? resolveTier(metadata) : "free_subscribed";

      let requestCount = 0;
      try {
        const { ConvexHttpClient } = await import("convex/browser");
        const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        const { api: convexApi } = await import("../../../../../convex/_generated/api");
        const usage = await convexClient.query(convexApi.tokenUsage.getToday, { userId: user.id });
        if (usage) requestCount = usage.requestCount;
      } catch {}

      const limitCheck = await checkDailyRequestLimitAsync(tier, requestCount);
      if (!limitCheck.allowed) {
        return NextResponse.json({
          error: "limit_reached",
          message: `Daily limit reached (${limitCheck.limit} queries). Upgrade your plan for more.`,
          dailyLimit: limitCheck.limit,
          dailyUsed: requestCount,
        }, { status: 429 });
      }

      // Call chat-proxy
      const proxyHeaders: Record<string, string> = { "Content-Type": "application/json" };
      const chatProxyKey = process.env.CHAT_PROXY_API_KEY || "";
      if (chatProxyKey) proxyHeaders["Authorization"] = `Bearer ${chatProxyKey}`;

      const proxyRes = await fetch(`${CHAT_PROXY_URL}/chat`, {
        method: "POST",
        headers: proxyHeaders,
        body: JSON.stringify({
          query: message,
          history: (history || []).slice(-4),
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(55000),
      });

      if (!proxyRes.ok || !proxyRes.body) {
        return NextResponse.json({ error: "AI service temporarily unavailable." }, { status: 502 });
      }

      // Parse NDJSON from chat-proxy, extract text + citations
      const reader = proxyRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      const citations: { section: string; document_id: string; document_title: string }[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "text") fullContent += event.content;
            if (event.type === "citations" && event.citations) citations.push(...event.citations);
          } catch {}
        }
      }

      // Track usage — Telegram bridge hits chat-proxy Grok (turn-1, stream 1).
      // Telegram has no T2 path today; if/when it does, detect-and-bump turn here.
      // chars/4 floored placeholder (P4 will wire real usage).
      try {
        const { ConvexHttpClient } = await import("convex/browser");
        const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        const { api: convexApi } = await import("../../../../../convex/_generated/api");
        const inputTokens = Math.max(1, Math.floor(message.length / 4));
        const outputTokens = Math.max(1, Math.floor(fullContent.length / 4));
        await convexClient.mutation(convexApi.tokenUsage.track, {
          userId: user.id,
          tier,
          inputTokens,
          outputTokens,
          model: "grok-4-1-fast-reasoning",
          agentSlug: "chat-proxy-grok",
          turn: 1,
          stream: 1,
        });
      } catch {}

      return NextResponse.json({
        response: fullContent,
        citations,
        tier,
        dailyRemaining: Math.max(0, limitCheck.limit - requestCount - 1),
      });
    }

    return NextResponse.json({ error: "Unknown action. Use: check, lookup, send_code, verify_code, chat" }, { status: 400 });
  } catch (err: any) {
    console.error("[telegram/chat] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// ── GET handler (orchestrator web_fetch is GET-only, exec blocks curl POST) ──
export async function GET(req: NextRequest) {
  if (!authenticateRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const p = req.nextUrl.searchParams;
  const body = {
    action: p.get("action"),
    telegram_id: p.get("telegram_id") || "",
    email: p.get("email") || "",
    code: p.get("code") || "",
    message: p.get("message") || "",
    history: [],
  };

  const postReq = new NextRequest(req.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: req.headers.get("authorization") || "" },
    body: JSON.stringify(body),
  });
  return POST(postReq);
}
