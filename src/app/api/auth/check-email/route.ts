import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { rateGuard } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const blocked = await rateGuard(req, 5);
  if (blocked) return blocked;

  const { email } = (await req.json()) as { email?: unknown };
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 }
    );
  }

  const client = await clerkClient();
  const users = await client.users.getUserList({
    emailAddress: [normalizedEmail],
  });
  const activeUsers = users.data.filter((u) => !u.banned && !u.locked);

  return NextResponse.json({ exists: activeUsers.length > 0 });
}
