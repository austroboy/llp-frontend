import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isMasterAdmin } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/admin-csrf";
import { writeAuditLog } from "@/lib/admin-audit";
import { rateGuard } from "@/lib/rate-limit";
import {
  CF_BASE,
  CF_ZONE_ID,
  CF_ACCOUNT_ID,
  CF_HEADERS,
  type CfResponse,
} from "@/lib/cloudflare";

// ---------------------------------------------------------------------------
// Cloudflare Email Routing management API
//
// Constants moved to `src/lib/cloudflare.ts` so the email-analytics route
// (Phase B) can share the same token / zone / account / headers.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PublicMetadata {
  role?: string;
  [key: string]: unknown;
}

/**
 * Email routing controls where inbound mail is forwarded — security-sensitive
 * because it can be used to redirect mail to attacker-controlled addresses.
 * Restricted to master admins.
 */
async function requireMasterAdmin() {
  const user = await currentUser();
  if (!user) return { error: "Unauthorized", status: 401 } as const;
  const role = (user.publicMetadata as PublicMetadata)?.role;
  if (role !== "admin") return { error: "Forbidden", status: 403 } as const;
  if (!isMasterAdmin(user)) {
    return { error: "Master admin privileges required", status: 403 } as const;
  }
  return null;
}

// Rule types from Cloudflare API
interface CfMatcher {
  type: string;
  field?: string;
  value?: string;
}

interface CfAction {
  type: string;
  value?: string[];
}

interface CfRule {
  id: string;
  name?: string;
  enabled: boolean;
  matchers: CfMatcher[];
  actions: CfAction[];
}

interface CfDestination {
  id: string;
  email: string;
  verified: string | null; // ISO date string when verified, null otherwise
  created: string;
}

// ---------------------------------------------------------------------------
// GET — List routing rules + destination addresses
// ---------------------------------------------------------------------------

export async function GET() {
  const authErr = await requireMasterAdmin();
  if (authErr) {
    return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  }

  try {
    const [rulesRes, destsRes] = await Promise.all([
      fetch(`${CF_BASE}/zones/${CF_ZONE_ID}/email/routing/rules`, {
        headers: CF_HEADERS,
      }),
      fetch(`${CF_BASE}/accounts/${CF_ACCOUNT_ID}/email/routing/addresses`, {
        headers: CF_HEADERS,
      }),
    ]);

    const rulesData: CfResponse<CfRule[]> = await rulesRes.json();
    const destsData: CfResponse<CfDestination[]> = await destsRes.json();

    if (!rulesData.success) {
      console.error("Cloudflare rules error:", rulesData.errors);
      return NextResponse.json(
        { error: "Failed to fetch routing rules", details: rulesData.errors },
        { status: 502 }
      );
    }

    if (!destsData.success) {
      console.error("Cloudflare destinations error:", destsData.errors);
      return NextResponse.json(
        { error: "Failed to fetch destinations", details: destsData.errors },
        { status: 502 }
      );
    }

    const rules = (rulesData.result ?? []).map((r) => ({
      id: r.id,
      name: r.name ?? null,
      customAddress:
        r.matchers[0]?.type === "all"
          ? "*catch-all*"
          : r.matchers[0]?.value ?? null,
      destination: r.actions[0]?.value?.[0] ?? null,
      enabled: r.enabled,
    }));

    const destinations = (destsData.result ?? []).map((d) => ({
      id: d.id,
      email: d.email,
      verified: !!d.verified,
      verifiedAt: d.verified ?? null,
    }));

    return NextResponse.json({ rules, destinations });
  } catch (error) {
    console.error("Email routing GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch email routing data" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Create new routing rule
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authErr = await requireMasterAdmin();
  if (authErr) {
    return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  }

  const csrf = assertSameOrigin(request);
  if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const blocked = await rateGuard(request, 5);
  if (blocked) return blocked;

  const actor = await currentUser();
  const actorClerkId = actor?.id ?? "unknown";

  try {
    const { customAddress, destination } = await request.json();

    if (!customAddress || !destination) {
      return NextResponse.json(
        { error: "customAddress and destination are required" },
        { status: 400 }
      );
    }

    if (!customAddress.endsWith("@laborlawpartner.com")) {
      return NextResponse.json(
        { error: "customAddress must end with @laborlawpartner.com" },
        { status: 400 }
      );
    }

    // Check if destination is already verified
    const destsRes = await fetch(
      `${CF_BASE}/accounts/${CF_ACCOUNT_ID}/email/routing/addresses`,
      { headers: CF_HEADERS }
    );
    const destsData: CfResponse<CfDestination[]> = await destsRes.json();

    const isVerified = (destsData.result ?? []).some(
      (d) => d.email === destination && d.verified
    );

    // If destination not verified, create it (triggers verification email)
    if (!isVerified) {
      const createDestRes = await fetch(
        `${CF_BASE}/accounts/${CF_ACCOUNT_ID}/email/routing/addresses`,
        {
          method: "POST",
          headers: CF_HEADERS,
          body: JSON.stringify({ email: destination }),
        }
      );
      const createDestData: CfResponse<CfDestination> =
        await createDestRes.json();

      if (!createDestData.success) {
        // Ignore "already exists" errors — destination may exist but unverified
        const alreadyExists = createDestData.errors?.some(
          (e) =>
            e.message?.toLowerCase().includes("already") ||
            e.code === 1032
        );
        if (!alreadyExists) {
          console.error(
            "Cloudflare create destination error:",
            createDestData.errors
          );
          return NextResponse.json(
            {
              error: "Failed to register destination address",
              details: createDestData.errors,
            },
            { status: 502 }
          );
        }
      }
    }

    // Create the routing rule
    const ruleRes = await fetch(
      `${CF_BASE}/zones/${CF_ZONE_ID}/email/routing/rules`,
      {
        method: "POST",
        headers: CF_HEADERS,
        body: JSON.stringify({
          name: `Forward ${customAddress}`,
          enabled: true,
          matchers: [
            { type: "literal", field: "to", value: customAddress },
          ],
          actions: [{ type: "forward", value: [destination] }],
        }),
      }
    );

    const ruleData: CfResponse<CfRule> = await ruleRes.json();

    if (!ruleData.success) {
      console.error("Cloudflare create rule error:", ruleData.errors);
      return NextResponse.json(
        { error: "Failed to create routing rule", details: ruleData.errors },
        { status: 502 }
      );
    }

    const rule = ruleData.result;

    await writeAuditLog({
      actorClerkId,
      op: "email-routing.create-rule",
      targetId: rule.id,
      after: { customAddress, destination, enabled: rule.enabled },
    });

    return NextResponse.json({
      rule: {
        id: rule.id,
        name: rule.name ?? null,
        customAddress: rule.matchers[0]?.value ?? customAddress,
        destination: rule.actions[0]?.value?.[0] ?? destination,
        enabled: rule.enabled,
      },
      destinationVerified: isVerified,
    });
  } catch (error) {
    console.error("Email routing POST error:", error);
    return NextResponse.json(
      { error: "Failed to create email routing rule" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT — Update routing rule
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  const authErr = await requireMasterAdmin();
  if (authErr) {
    return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  }

  const csrf = assertSameOrigin(request);
  if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const blocked = await rateGuard(request, 5);
  if (blocked) return blocked;

  const actor = await currentUser();
  const actorClerkId = actor?.id ?? "unknown";

  try {
    const { ruleId, destination, enabled } = await request.json();

    if (!ruleId) {
      return NextResponse.json(
        { error: "ruleId is required" },
        { status: 400 }
      );
    }

    // Fetch existing rule so we can merge fields
    const existingRes = await fetch(
      `${CF_BASE}/zones/${CF_ZONE_ID}/email/routing/rules/${ruleId}`,
      { headers: CF_HEADERS }
    );
    const existingData: CfResponse<CfRule> = await existingRes.json();

    if (!existingData.success) {
      return NextResponse.json(
        { error: "Rule not found", details: existingData.errors },
        { status: 404 }
      );
    }

    const existing = existingData.result;

    // Build updated rule payload
    const updatedActions = destination
      ? [{ type: "forward", value: [destination] }]
      : existing.actions;

    const updatedEnabled = enabled !== undefined ? enabled : existing.enabled;

    const updateRes = await fetch(
      `${CF_BASE}/zones/${CF_ZONE_ID}/email/routing/rules/${ruleId}`,
      {
        method: "PUT",
        headers: CF_HEADERS,
        body: JSON.stringify({
          name: existing.name,
          enabled: updatedEnabled,
          matchers: existing.matchers,
          actions: updatedActions,
        }),
      }
    );

    const updateData: CfResponse<CfRule> = await updateRes.json();

    if (!updateData.success) {
      console.error("Cloudflare update rule error:", updateData.errors);
      return NextResponse.json(
        { error: "Failed to update routing rule", details: updateData.errors },
        { status: 502 }
      );
    }

    const rule = updateData.result;

    await writeAuditLog({
      actorClerkId,
      op: "email-routing.update-rule",
      targetId: rule.id,
      before: { destination: existing.actions[0]?.value?.[0], enabled: existing.enabled },
      after: { destination: rule.actions[0]?.value?.[0], enabled: rule.enabled },
    });

    return NextResponse.json({
      rule: {
        id: rule.id,
        name: rule.name ?? null,
        customAddress:
          rule.matchers[0]?.type === "all"
            ? "*catch-all*"
            : rule.matchers[0]?.value ?? null,
        destination: rule.actions[0]?.value?.[0] ?? null,
        enabled: rule.enabled,
      },
    });
  } catch (error) {
    console.error("Email routing PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update email routing rule" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE — Delete routing rule
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const authErr = await requireMasterAdmin();
  if (authErr) {
    return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  }

  const csrf = assertSameOrigin(request);
  if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const blocked = await rateGuard(request, 5);
  if (blocked) return blocked;

  const actor = await currentUser();
  const actorClerkId = actor?.id ?? "unknown";

  try {
    const { ruleId } = await request.json();

    if (!ruleId) {
      return NextResponse.json(
        { error: "ruleId is required" },
        { status: 400 }
      );
    }

    const deleteRes = await fetch(
      `${CF_BASE}/zones/${CF_ZONE_ID}/email/routing/rules/${ruleId}`,
      {
        method: "DELETE",
        headers: CF_HEADERS,
      }
    );

    const deleteData: CfResponse<null> = await deleteRes.json();

    if (!deleteData.success) {
      console.error("Cloudflare delete rule error:", deleteData.errors);
      return NextResponse.json(
        { error: "Failed to delete routing rule", details: deleteData.errors },
        { status: 502 }
      );
    }

    await writeAuditLog({
      actorClerkId,
      op: "email-routing.delete-rule",
      targetId: String(ruleId),
    });

    return NextResponse.json({ success: true, deletedRuleId: ruleId });
  } catch (error) {
    console.error("Email routing DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete email routing rule" },
      { status: 500 }
    );
  }
}
