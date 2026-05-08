import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateGuard } from "@/lib/rate-limit";
import { generateComplianceBrief } from "@/lib/headhunting/compliance";

export const maxDuration = 120;

/**
 * POST /api/headhunting/compliance
 * Generate a compliance brief for a role blueprint.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await rateGuard(request, 5);
  if (blocked) return blocked;

  try {
    const blueprint = await request.json();

    if (!blueprint?.title) {
      return NextResponse.json(
        { error: "Blueprint with title is required" },
        { status: 400 }
      );
    }

    const brief = await generateComplianceBrief(blueprint);
    return NextResponse.json({ data: brief });
  } catch (error) {
    console.error("Compliance check error:", error);
    return NextResponse.json(
      { error: "Failed to generate compliance brief." },
      { status: 500 }
    );
  }
}
