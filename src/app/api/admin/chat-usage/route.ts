import { NextRequest, NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";

interface PublicMetadata {
  role?: string;
  [key: string]: unknown;
}

// GET /api/admin/chat-usage?userIds=id1,id2,id3
// Resolves Clerk user IDs to names/emails for display
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((user.publicMetadata as PublicMetadata)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userIds = request.nextUrl.searchParams.get("userIds");
  if (!userIds) {
    return NextResponse.json({ error: "userIds required" }, { status: 400 });
  }

  const ids = userIds.split(",").filter(Boolean).slice(0, 100);

  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({
      userId: ids,
      limit: 100,
    });

    const userMap: Record<
      string,
      { name: string; email: string; imageUrl: string }
    > = {};

    for (const u of users.data) {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown";
      userMap[u.id] = {
        name,
        email: u.emailAddresses[0]?.emailAddress || "",
        imageUrl: u.imageUrl,
      };
    }

    return NextResponse.json({ users: userMap });
  } catch (error) {
    console.error("Failed to resolve user IDs:", error);
    return NextResponse.json(
      { error: "Failed to resolve users" },
      { status: 500 }
    );
  }
}
