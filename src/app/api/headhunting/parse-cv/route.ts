import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateGuard } from "@/lib/rate-limit";
import { parseCVFromBase64, parseCVFromText } from "@/lib/headhunting/cv-parser";
import { detectGaps } from "@/lib/headhunting/gap-detector";
import { scoreFit } from "@/lib/headhunting/fit-scorer";

export const maxDuration = 120;

/**
 * POST /api/headhunting/parse-cv
 *
 * Accepts either:
 * - FormData with file (PDF/image) + optional blueprint JSON
 * - JSON with { text, blueprint } for pre-extracted text
 *
 * Returns: parsed CV data + gap analysis + fit scores (if blueprint provided)
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await rateGuard(request, 5);
  if (blocked) return blocked;

  try {
    const contentType = request.headers.get("content-type") || "";

    let parsedCV;
    let blueprint;

    if (contentType.includes("multipart/form-data")) {
      // File upload mode
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const blueprintJson = formData.get("blueprint") as string | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
      ];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Unsupported file type. Use PDF, JPG, or PNG." },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      parsedCV = await parseCVFromBase64(base64, file.type);

      if (blueprintJson) {
        try {
          blueprint = JSON.parse(blueprintJson);
        } catch {
          // Ignore invalid blueprint JSON
        }
      }
    } else {
      // JSON mode (text already extracted)
      const body = await request.json();
      const { text, blueprint: bp } = body;

      if (!text || typeof text !== "string") {
        return NextResponse.json({ error: "No CV text provided" }, { status: 400 });
      }

      parsedCV = await parseCVFromText(text);
      blueprint = bp;
    }

    // Build response
    const result: {
      parsedCV: typeof parsedCV;
      gaps?: Awaited<ReturnType<typeof detectGaps>>;
      fitScore?: Awaited<ReturnType<typeof scoreFit>>;
    } = { parsedCV };

    // If blueprint provided, run gap detection and fit scoring in parallel
    if (blueprint?.mustHaves?.length && blueprint?.criticalMatchPoints?.length) {
      const [gaps, fitScore] = await Promise.all([
        detectGaps(parsedCV, blueprint).catch((e) => {
          console.error("Gap detection failed:", e);
          return null;
        }),
        scoreFit(parsedCV, blueprint).catch((e) => {
          console.error("Fit scoring failed:", e);
          return null;
        }),
      ]);

      if (gaps) result.gaps = gaps;
      if (fitScore) result.fitScore = fitScore;
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("CV parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse CV. Please try again." },
      { status: 500 }
    );
  }
}
