import { NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";

/**
 * Sets publicMetadata.accountType = "organization" on the currently signed-in
 * Clerk user. Called from the org sign-up flow immediately after setActive().
 *
 * Auth: requires an active Clerk session. The user can only finalize their own
 * account — clerkId is derived from currentUser(), never trusted from the body.
 */
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, orgName } = (await req.json()) as { orgId?: string; orgName?: string };
    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    const { ConvexHttpClient } = await import("convex/browser");
    const { api } = await import("../../../../../convex/_generated/api");
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const existingOrg = await convex.query(api.organizations.getByCreator, {
      clerkId: user.id,
    });

    if (!existingOrg || String(existingOrg._id) !== orgId) {
      return NextResponse.json(
        { error: "Organization not found for current user" },
        { status: 403 }
      );
    }

    const client = await clerkClient();
    await client.users.updateUserMetadata(user.id, {
      publicMetadata: {
        ...user.publicMetadata,
        accountType: "organization",
        orgId: String(existingOrg._id),
        orgName: orgName || existingOrg.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[set-org-metadata] failed:", err);
    const message = err instanceof Error ? err.message : "Failed to set org metadata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
