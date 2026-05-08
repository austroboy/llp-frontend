import { NextRequest, NextResponse } from "next/server";
import {
  getAnalyticsRole,
  requireAdminUser,
  type AnalyticsRole,
} from "@/lib/admin-guard";
import { runHogQL } from "@/lib/posthog/server";
import { queries, type QueryName } from "@/lib/posthog/queries";

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface RequestBody {
  queryName?: string;
  from?: string;
  to?: string;
  params?: Record<string, unknown>;
}

/**
 * Tier 5 — query names that return raw rows containing distinct_id or
 * user-typed text snippets. Restricted to tech_admin / super_admin per
 * implementation-plan.md §Tier 5 access matrix. Aggregated queries
 * remain available to growth_admin.
 *
 * Keep this list narrow: only add a query here when its result row
 * shape would let a reader correlate to a specific user.
 */
const PII_QUERIES: ReadonlySet<QueryName> = new Set<QueryName>([
  "liveActivity",
  "topQueries",
]);

const PII_ALLOWED_ROLES: ReadonlyArray<AnalyticsRole> = ["super_admin", "tech_admin"];

function isIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAdminUser();
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { queryName, from, to, params } = body;
  if (!queryName || !(queryName in queries)) {
    return NextResponse.json({ error: "Unknown queryName" }, { status: 400 });
  }
  if (!isIso(from) || !isIso(to)) {
    return NextResponse.json({ error: "from/to must be ISO date strings" }, { status: 400 });
  }

  // Tier 5 — gate PII / raw-event queries to tech_admin + super_admin.
  // Aggregated queries fall through to the standard admin gate.
  if (PII_QUERIES.has(queryName as QueryName)) {
    const role = getAnalyticsRole(user);
    if (!role || !PII_ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const builder = queries[queryName as QueryName];
  const sql = builder({ from, to, ...(params ?? {}) } as { from: string; to: string });

  if (request.signal.aborted) {
    return NextResponse.json({ error: "Client aborted" }, { status: 499 });
  }

  try {
    const result = await runHogQL(sql);
    return NextResponse.json(result);
  } catch (err) {
    const raw = (err as Error).message;
    const msg = raw.replace(/phx_[A-Za-z0-9]+/g, "phx_***");
    console.error(`[analytics/query] ${queryName} failed:`, msg);
    return NextResponse.json({ error: msg, queryName }, { status: 500 });
  }
}
