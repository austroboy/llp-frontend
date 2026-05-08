import { NextRequest, NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { assertSameOrigin } from "@/lib/admin-csrf";
import { writeAuditLog } from "@/lib/admin-audit";
import { rateGuard } from "@/lib/rate-limit";

interface PublicMetadata {
  role?: string;
  tier?: string;
  scoutTier?: string;
  accountType?: string;    // "personal" | "organization" | "both"
  orgId?: string;          // Convex organization ID
  orgName?: string;        // Organization display name
  subscriptionStatus?: string;
  subscriptionExpiry?: string;
  [key: string]: unknown;
}

const VALID_ROLES = ["user", "admin", "expert", "employer", "scout"] as const;
const SCOUT_TIERS = ["scout_standard", "scout_verified", "scout_premium"] as const;
const VALID_TIERS = ["free_guest", "free_subscribed", "mini", "max", "scout_standard", "scout_verified", "scout_premium"] as const;
const PAID_TIERS = ["mini", "max"] as const;

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (user.publicMetadata as PublicMetadata)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const query = searchParams.get("query") ?? undefined;

  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({
      limit,
      offset: (page - 1) * limit,
      query,
      orderBy: "-created_at",
    });

    return NextResponse.json({
      users: users.data.map((u) => {
        const meta = u.publicMetadata as PublicMetadata;
        const unsafeMeta = u.unsafeMetadata as { accountType?: string } | undefined;
        // Determine auth provider from external accounts or fall back to email
        const providers = u.externalAccounts?.map((acc) => {
          const p = acc.provider?.replace(/^oauth_/, "") ?? "unknown";
          return p.charAt(0).toUpperCase() + p.slice(1);
        }) ?? [];
        const provider = providers.length > 0 ? providers.join(", ") : "Email";

        // Account type fallback: publicMetadata is the source of truth, but if
        // an org user signed up before finalize-org ran, the marker only lives
        // in unsafeMetadata. Show the truth so admins can identify them.
        const accountType =
          meta?.accountType ?? unsafeMeta?.accountType ?? "personal";

        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.emailAddresses[0]?.emailAddress,
          imageUrl: u.imageUrl,
          role: meta?.role ?? "user",
          tier: meta?.tier || "free_subscribed",
          scoutTier: meta?.scoutTier ?? null,
          accountType,
          orgName: meta?.orgName ?? null,
          provider,
          createdAt: u.createdAt,
          lastSignInAt: u.lastSignInAt,
        };
      }),
      totalCount: users.totalCount,
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await currentUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((admin.publicMetadata as PublicMetadata)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const csrf = assertSameOrigin(request);
  if (!csrf.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const blocked = await rateGuard(request, 5);
  if (blocked) return blocked;

  const { userId, role, tier, scoutTier, accountType, orgName } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const PLATFORM_TIERS = ["free_guest", "free_subscribed", "mini", "max"] as const;
  const RAW_SCOUT_TIERS = ["standard", "verified", "premium"] as const;

  // Validate values
  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
  }
  if (tier && !(PLATFORM_TIERS as readonly string[]).includes(tier)) {
    return NextResponse.json({ error: `Invalid tier. Must be one of: ${PLATFORM_TIERS.join(", ")}` }, { status: 400 });
  }
  if (scoutTier && !(RAW_SCOUT_TIERS as readonly string[]).includes(scoutTier) && scoutTier !== "none") {
    return NextResponse.json({ error: `Invalid scoutTier. Must be one of: ${RAW_SCOUT_TIERS.join(", ")} or none` }, { status: 400 });
  }

  // Prevent admin from changing their own role
  if (userId === admin.id && role && role !== "admin") {
    return NextResponse.json({ error: "Cannot change your own admin role" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const targetUser = await client.users.getUser(userId);
    const existingMeta = (targetUser.publicMetadata ?? {}) as PublicMetadata;

    const updatedMeta: PublicMetadata = { ...existingMeta };

    if (role) {
      updatedMeta.role = role;
      // Expert and Scout roles get "max" service access automatically
      if (role === "expert" || role === "scout") {
        updatedMeta.tier = "max";
        updatedMeta.subscriptionStatus = "active";
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 10);
        updatedMeta.subscriptionExpiry = expiry.toISOString();
      }
    }

    if (tier) {
      updatedMeta.tier = tier;
      if ((PAID_TIERS as readonly string[]).includes(tier)) {
        updatedMeta.subscriptionStatus = "active";
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        updatedMeta.subscriptionExpiry = expiry.toISOString();
      } else {
        delete updatedMeta.subscriptionStatus;
        delete updatedMeta.subscriptionExpiry;
      }
    }

    if (scoutTier !== undefined) {
      if (scoutTier === "none" || !scoutTier) {
        delete updatedMeta.scoutTier;
      } else {
        updatedMeta.scoutTier = scoutTier;
        updatedMeta.subscriptionStatus = "active";
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 10);
        updatedMeta.subscriptionExpiry = expiry.toISOString();
      }
    }

    // Account type: "personal" | "organization"
    if (accountType !== undefined) {
      const validTypes = ["personal", "organization"];
      if (validTypes.includes(accountType)) {
        updatedMeta.accountType = accountType;
      }
    }
    if (orgName !== undefined) {
      if (orgName) {
        updatedMeta.orgName = orgName;
      } else {
        delete updatedMeta.orgName;
      }
    }

    // Auto-create org record when granting org access
    if (accountType && accountType === "organization" && !existingMeta.orgId) {
      try {
        const { ConvexHttpClient } = await import("convex/browser");
        const { api } = await import("../../../../../convex/_generated/api");
        const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

        const orgId = await convex.mutation(api.organizations.create, {
          name: orgName || [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") + "'s Organization",
          primaryContactEmail: targetUser.emailAddresses[0]?.emailAddress,
          createdByClerkId: userId,
        });
        updatedMeta.orgId = orgId;
      } catch (convexErr) {
        console.error("Auto-create org failed (metadata still updated):", convexErr);
      }
    }

    await client.users.updateUserMetadata(userId, {
      publicMetadata: updatedMeta,
    });

    // Auto-create htClients when role is set to "employer"
    if (role === "employer" && existingMeta.role !== "employer") {
      try {
        const { ConvexHttpClient } = await import("convex/browser");
        const { api } = await import("../../../../../convex/_generated/api");
        const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

        const userName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") || "Unnamed";
        const userEmail = targetUser.emailAddresses[0]?.emailAddress ?? "";

        await convex.mutation(api.headhunting.clients.createWithClerkId, {
          companyName: userName,
          contactName: userName,
          contactEmail: userEmail,
          clerkId: userId,
        });
      } catch (convexErr) {
        console.error("Auto-create client failed (role still updated):", convexErr);
      }
    }

    // Auto-activate scout in experts table when scout role is set
    if (role === "scout") {
      try {
        const { ConvexHttpClient } = await import("convex/browser");
        const { api } = await import("../../../../../convex/_generated/api");
        const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

        const scoutTier = (updatedMeta.scoutTier ?? "standard") as "standard" | "verified" | "premium";
        const expert = await convex.query(api.experts.getByClerkId, { clerkId: userId });
        if (expert) {
          await convex.mutation(api.experts.update, {
            id: expert._id,
            scoutStatus: "active",
            scoutTier,
          });
        }
      } catch (convexErr) {
        console.error("Auto-activate scout failed (role still updated):", convexErr);
      }
    }

    // Auto-update scout tier in experts table when tier is changed to a scout tier
    if (tier && (SCOUT_TIERS as readonly string[]).includes(tier) && existingMeta.role === "scout") {
      try {
        const { ConvexHttpClient } = await import("convex/browser");
        const { api } = await import("../../../../../convex/_generated/api");
        const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

        const scoutTier = tier.replace("scout_", "") as "standard" | "verified" | "premium";
        const expert = await convex.query(api.experts.getByClerkId, { clerkId: userId });
        if (expert) {
          await convex.mutation(api.experts.update, {
            id: expert._id,
            scoutTier,
          });
        }
      } catch (convexErr) {
        console.error("Auto-update scout tier failed:", convexErr);
      }
    }

    await writeAuditLog({
      actorClerkId: admin.id,
      op: "user.role-change",
      targetId: userId,
      before: {
        role: existingMeta.role,
        tier: existingMeta.tier,
        scoutTier: existingMeta.scoutTier ?? null,
        accountType: existingMeta.accountType ?? null,
        orgName: existingMeta.orgName ?? null,
      },
      after: {
        role: updatedMeta.role,
        tier: updatedMeta.tier,
        scoutTier: updatedMeta.scoutTier ?? null,
        accountType: updatedMeta.accountType ?? "personal",
        orgName: updatedMeta.orgName ?? null,
      },
    });

    return NextResponse.json({ success: true, role: updatedMeta.role, tier: updatedMeta.tier, scoutTier: updatedMeta.scoutTier ?? null, accountType: updatedMeta.accountType ?? "personal", orgName: updatedMeta.orgName ?? null });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await currentUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((admin.publicMetadata as PublicMetadata)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  if (userId === admin.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
