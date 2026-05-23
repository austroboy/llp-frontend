import { NextResponse } from "next/server";
import { currentUser, clerkClient, auth } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { z } from "zod";

interface PendingOrg {
  companyName?: string;
  industry?: string;
  employeeCount?: string;
  city?: string;
  country?: string;
  designation?: string;
  phone?: string;
  orgType?: string;
}

/**
 * H-3: validate `unsafeMetadata.pendingOrg` before persisting it to Convex
 * or promoting fields into Clerk publicMetadata. unsafeMetadata is
 * client-writable (set by the SPA during signUp.create) so we MUST treat
 * its contents as untrusted input on the server boundary.
 *
 * Fields here mirror the `PendingOrg` interface above. `.strict()` rejects
 * unknown keys so an attacker can't smuggle extra publicMetadata in via
 * the spread on line ~94.
 */
const PendingOrgSchema = z
  .object({
    companyName: z.string().min(1).max(200).optional(),
    industry: z.string().max(100).optional(),
    employeeCount: z.string().max(50).optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    designation: z.string().max(100).optional(),
    phone: z.string().max(40).optional(),
    orgType: z.string().max(100).optional(),
  })
  .strict();

interface PublicMeta {
  accountType?: string;
  orgId?: string;
  orgName?: string;
  [key: string]: unknown;
}

interface UnsafeMeta {
  accountType?: string;
  pendingOrg?: PendingOrg;
  [key: string]: unknown;
}

/**
 * Self-heal endpoint for org users whose Phase B (post-verification finalize)
 * never completed. Reads the org marker from the user's own unsafeMetadata
 * (set during signUp.create), creates the Convex organization if missing, and
 * promotes accountType to publicMetadata.
 *
 * Auth: requires an active Clerk session. Only finalizes the caller's own
 * account. Idempotent — safe to call on every authenticated page load.
 *
 * Called from src/components/providers/account-context.tsx when it detects
 * unsafeMetadata.accountType === "organization" but publicMetadata.accountType
 * is not yet set.
 */
export async function POST() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const publicMeta = (user.publicMetadata ?? {}) as PublicMeta;
    const unsafeMeta = (user.unsafeMetadata ?? {}) as UnsafeMeta;

    // Already finalized — nothing to do
    if (publicMeta.accountType === "organization" && publicMeta.orgId) {
      return NextResponse.json({ ok: true, status: "already_finalized" });
    }

    // Not an org user — nothing to do
    if (unsafeMeta.accountType !== "organization") {
      return NextResponse.json({ ok: true, status: "not_org_user" });
    }

    // H-3: validate pendingOrg before any persistence. unsafeMetadata is
    // client-writable so we cannot trust its shape.
    const parsed = PendingOrgSchema.safeParse(unsafeMeta.pendingOrg ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid org payload" }, { status: 400 });
    }
    const pending = parsed.data;
    const email = user.emailAddresses[0]?.emailAddress;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

    // Create the Convex organization if we don't already have an orgId
    let orgId = publicMeta.orgId;
    if (!orgId) {
      // Forward the caller's Clerk JWT to Convex so the `requireUser` guard
      // inside `organizations.create` sees the same identity we already
      // verified via `currentUser()` above. Without this token Convex sees
      // an unauthenticated request and the mutation throws "Unauthorized".
      // The "convex" template is configured in the Clerk dashboard and
      // referenced by `convex/auth.config.ts`.
      const { getToken } = await auth();
      const token = await getToken({ template: "convex" });
      if (!token) {
        return NextResponse.json(
          { error: "Could not mint Convex token for current session" },
          { status: 500 }
        );
      }

      const newOrgId = (await fetchMutation(
        api.organizations.create,
        {
          name: pending.companyName || `${fullName || "New"}'s Organization`,
          industry: pending.industry,
          size: pending.employeeCount,
          address:
            pending.city && pending.country
              ? `${pending.city}, ${pending.country}`
              : undefined,
          primaryContactName: fullName || undefined,
          primaryContactDesignation: pending.designation,
          primaryContactEmail: email,
          primaryContactPhone: pending.phone,
          createdByClerkId: user.id,
        },
        { token }
      )) as Id<"organizations">;
      orgId = newOrgId;
    }

    // Promote to publicMetadata
    const client = await clerkClient();
    await client.users.updateUserMetadata(user.id, {
      publicMetadata: {
        ...publicMeta,
        accountType: "organization",
        orgId,
        orgName: pending.companyName ?? publicMeta.orgName,
      },
    });

    return NextResponse.json({ ok: true, status: "finalized", orgId });
  } catch (err) {
    // Surface as much detail as possible — Convex wraps non-ConvexError throws
    // into a generic "Server Error" with no `data` field, which makes silent
    // 500s frustrating to debug. Log everything we can serialise.
    const errAny = err as Error & { data?: unknown; cause?: unknown };
    console.error("[finalize-org] failed:", {
      message: errAny?.message,
      name: errAny?.name,
      data: errAny?.data,
      cause: errAny?.cause,
      stack: errAny?.stack,
    });
    const message =
      typeof errAny?.message === "string" ? errAny.message : "Failed to finalize org";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
