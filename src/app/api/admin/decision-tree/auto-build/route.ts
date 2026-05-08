import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { autoBuildBranches } from "@/lib/ai/decision-tree";
import { assertSameOrigin } from "@/lib/admin-csrf";
import { writeAuditLog } from "@/lib/admin-audit";
import { rateGuard } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || (user.publicMetadata as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const csrf = assertSameOrigin(req);
  if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const blocked = await rateGuard(req, 5);
  if (blocked) return blocked;

  try {
    const result = await autoBuildBranches();
    await writeAuditLog({
      actorClerkId: user.id,
      op: "decision-tree.auto-build",
      metadata: { proposed: result.proposed, skipped: result.skipped },
    });
    return NextResponse.json({
      ok: true,
      ...result,
      message: `Auto-build complete: ${result.proposed} proposed, ${result.skipped} skipped (overlap)`,
    });
  } catch (err) {
    console.error("[admin/decision-tree/auto-build] Error:", err);
    return NextResponse.json({ error: "Auto-build failed" }, { status: 500 });
  }
}
