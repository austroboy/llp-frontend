import { NextRequest } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { runHogQL } from "@/lib/posthog/server";
import { liveActivity } from "@/lib/posthog/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: NextRequest) {
  try {
    await requireAdminUser();
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: "auth_failed" }, { status: 500 });
  }

  try {
    const now = new Date();
    const from = new Date(now.getTime() - 60_000).toISOString();
    const to = now.toISOString();
    const result = await runHogQL(liveActivity({ from, to }));
    const events = result.results.map((row) => {
      const obj: Record<string, unknown> = {};
      result.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
    return Response.json({ events });
  } catch (err) {
    const msg = (err as Error).message.replace(/phx_[A-Za-z0-9]+/g, "phx_***");
    console.error("[analytics/live] failed:", msg);
    return Response.json({ error: msg, events: [] }, { status: 500 });
  }
}
