import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-guard";
import { createServerClient } from "@/lib/supabase";
import {
  ENGAGEMENT_THRESHOLDS,
  type SignalEntry,
} from "@/lib/engagement-score";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ScoreRow {
  user_id: string;
  score: number;
  signal_breakdown: Record<string, SignalEntry>;
  computed_at: string;
}

interface PanelRow {
  user_id_short: string;
  score: number;
  primary_label: string;
  computed_at: string;
}

/**
 * GET /api/admin/engagement-scores
 *
 * Returns at-risk and power-user lists. Admin-gated.
 *
 * Privacy: emails / display names are NEVER exposed in the response.
 * Only the truncated user_id, score, and the primary signal label
 * cross the wire. Looking up a specific user is a separate flow.
 */
export async function GET() {
  try {
    await requireAdminUser();
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "auth_failed" }, { status: 500 });
  }

  try {
    const supabase = createServerClient();
    const [atRiskRes, powerRes] = await Promise.all([
      supabase
        .from("user_engagement_scores")
        .select("user_id, score, signal_breakdown, computed_at")
        .gte("score", ENGAGEMENT_THRESHOLDS.AT_RISK)
        .order("score", { ascending: false })
        .limit(50),
      supabase
        .from("user_engagement_scores")
        .select("user_id, score, signal_breakdown, computed_at")
        .lte("score", ENGAGEMENT_THRESHOLDS.POWER)
        .order("score", { ascending: true })
        .limit(50),
    ]);

    if (atRiskRes.error) {
      throw new Error(`at_risk fetch failed: ${atRiskRes.error.message}`);
    }
    if (powerRes.error) {
      throw new Error(`power fetch failed: ${powerRes.error.message}`);
    }

    return NextResponse.json({
      at_risk: ((atRiskRes.data ?? []) as ScoreRow[]).map(toPanelRow),
      power_users: ((powerRes.data ?? []) as ScoreRow[]).map(toPanelRow),
      thresholds: ENGAGEMENT_THRESHOLDS,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    console.error("[admin/engagement-scores] failed:", msg);
    return NextResponse.json(
      { error: msg, at_risk: [], power_users: [] },
      { status: 500 },
    );
  }
}

function toPanelRow(row: ScoreRow): PanelRow {
  return {
    user_id_short: shortenUserId(row.user_id),
    score: row.score,
    primary_label: pickPrimaryLabel(row.signal_breakdown),
    computed_at: row.computed_at,
  };
}

function shortenUserId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function pickPrimaryLabel(
  breakdown: Record<string, SignalEntry> | null | undefined,
): string {
  if (!breakdown) return "—";
  let best: SignalEntry | null = null;
  for (const entry of Object.values(breakdown)) {
    if (!entry?.fired) continue;
    if (!best || Math.abs(entry.points) > Math.abs(best.points)) best = entry;
  }
  return best?.label ?? "—";
}
