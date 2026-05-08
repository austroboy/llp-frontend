import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { assertSameOrigin } from "@/lib/admin-csrf";
import { writeAuditLog } from "@/lib/admin-audit";
import { rateGuard } from "@/lib/rate-limit";

/**
 * Confidence Decay API
 * Runs the 5% weekly decay for sections not verified in 30 days.
 * Can be called manually by admin or set up as a Vercel cron.
 *
 * v3.1: Confidence decay (5% weekly for unverified sections, 30-day threshold)
 */
export async function POST(req: NextRequest) {
  // Allow both admin calls and cron calls (with auth header)
  const cronSecret = req.headers.get("authorization");
  const isCronCall = cronSecret === `Bearer ${process.env.CRON_SECRET}`;
  let actorClerkId: string | null = null;

  if (!isCronCall) {
    const user = await currentUser();
    if (!user || (user.publicMetadata as { role?: string })?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const csrf = assertSameOrigin(req);
    if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const blocked = await rateGuard(req, 5);
    if (blocked) return blocked;

    actorClerkId = user.id;
  }

  const supabase = createServerClient();

  try {
    // Run confidence decay RPC
    const { data: affected, error } = await supabase.rpc("apply_confidence_decay");

    if (error) throw error;

    // Also deactivate old hallucination patterns (> 90 days, resolved)
    const { data: cleanedPatterns } = await supabase
      .from("hallucination_patterns")
      .update({ status: "inactive" })
      .eq("status", "active")
      .lt("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .select("id");

    if (actorClerkId) {
      await writeAuditLog({
        actorClerkId,
        op: "decision-tree.decay",
        metadata: {
          sections_decayed: affected || 0,
          patterns_cleaned: cleanedPatterns?.length || 0,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      sections_decayed: affected || 0,
      patterns_cleaned: cleanedPatterns?.length || 0,
      message: `Decay applied to ${affected || 0} sections. ${cleanedPatterns?.length || 0} old patterns deactivated.`,
    });
  } catch (err) {
    console.error("[decision-tree/decay] Error:", err);
    return NextResponse.json({ error: "Decay failed" }, { status: 500 });
  }
}
