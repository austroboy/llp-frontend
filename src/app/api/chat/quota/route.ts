import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  type Tier,
  type ClerkTierMetadata,
  resolveTier,
} from "@/lib/ai/framework-types";
import { checkDailyRequestLimitAsync } from "@/lib/ai/tier-middleware";

export const runtime = "nodejs";

/**
 * Lightweight quota probe. Used by the chat UI on page load / saved-
 * conversation selection, where no /api/chat call runs — the top-bar
 * quota pill stays null until something emits a meta event. This
 * endpoint returns the same { tier, dailyRemaining } pair so the pill
 * can render immediately without a chat turn.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let tier: Tier = "free_subscribed";
  try {
    const user = await currentUser();
    const metadata = user?.publicMetadata as ClerkTierMetadata | undefined;
    if (metadata?.tier) tier = resolveTier(metadata);
  } catch {}

  let requestCount = 0;
  try {
    const { ConvexHttpClient } = await import("convex/browser");
    const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const { api: convexApi } = await import("../../../../../convex/_generated/api");
    const usage = await convexClient.query(convexApi.tokenUsage.getToday, { userId });
    if (usage) requestCount = usage.requestCount;
  } catch {}

  const limitCheck = await checkDailyRequestLimitAsync(tier, requestCount);
  const dailyRemaining = Math.max(0, limitCheck.limit - requestCount);

  return NextResponse.json({ tier, dailyRemaining });
}
