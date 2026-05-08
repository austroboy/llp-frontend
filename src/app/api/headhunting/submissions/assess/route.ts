import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateGuard } from "@/lib/rate-limit";
import { evaluateCandidateAgainstMatrix } from "@/lib/headhunting/ai/matching-engine";
import type { Requirement, MandateContext } from "@/lib/headhunting/ai/matching-engine";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export const maxDuration = 120;

/**
 * POST /api/headhunting/submissions/assess
 *
 * Runs per-requirement AI matching for a candidate submission.
 * Fetches submission + mandate + requirement matrix from Convex,
 * evaluates CV against each requirement, saves rich assessment back.
 *
 * Body: { submissionId: string, mandateId: string }
 * Returns: { success: true, assessmentId, evaluations, aggregate }
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await rateGuard(request, 10);
  if (blocked) return blocked;

  try {
    const { submissionId, mandateId } = (await request.json()) as {
      submissionId: string;
      mandateId: string;
    };

    if (!submissionId || !mandateId) {
      return NextResponse.json(
        { error: "submissionId and mandateId are required" },
        { status: 400 }
      );
    }

    const { ConvexHttpClient } = await import("convex/browser");
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // 1. Fetch requirement matrix for this mandate
    const matrix = await convex.query(api.headhunting.requirementMatrix.getByMandate, {
      mandateId: mandateId as Id<"htMandates">,
    });

    if (!matrix) {
      return NextResponse.json(
        { error: "No requirement matrix found for this mandate. Build the matrix first." },
        { status: 404 }
      );
    }

    if (!matrix.requirements?.length) {
      return NextResponse.json(
        { error: "Requirement matrix is empty. Add requirements before assessing." },
        { status: 400 }
      );
    }

    // 2. Fetch submission detail (includes mandate + blueprint context)
    const submission = await convex.query(api.headhunting.screening.getSubmissionDetail, {
      id: submissionId as Id<"htSubmissions">,
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // 3. Fetch mandate for context
    const mandate = await convex.query(api.headhunting.mandates.getById, {
      id: mandateId as Id<"htMandates">,
    });

    if (!mandate) {
      return NextResponse.json(
        { error: "Mandate not found" },
        { status: 404 }
      );
    }

    // 4. Get CV data — use parsed data if available, fall back to basic info
    const parsedCV: import("@/lib/headhunting/cv-parser").ParsedCV =
      (submission as Record<string, unknown>).parsedCv as import("@/lib/headhunting/cv-parser").ParsedCV ??
      {
        name: submission.candidateName ?? null,
        currentTitle: null,
        currentCompany: null,
        yearsExperience: null,
        skills: [],
        experience: [],
        education: [],
        salary: null,
        location: null,
        noticePeriod: null,
        summary: "",
      };

    const rawCVText =
      ((submission as Record<string, unknown>).cvRawText as string | undefined) ??
      JSON.stringify(parsedCV);

    // 5. Build requirement list for the engine
    const requirements: Requirement[] = matrix.requirements.map(r => ({
      id: r.id,
      label: r.label,
      description: r.description,
      priority: r.priority as "must_have" | "strong_preference" | "nice_to_have",
      weight: r.weight,
      category: r.category,
      sourceField: r.sourceField,
    }));

    // 6. Build mandate context from available fields
    // mandate.rawTitle is the intake title; blueprint has the structured role data
    const bp = submission.blueprint;
    const mandateContext: MandateContext = {
      title: bp?.title ?? mandate.rawTitle ?? "Unknown Role",
      function: bp?.function ?? undefined,
      seniority: bp?.seniority ?? undefined,
      industry: (mandate as Record<string, unknown>).industry as string | undefined,
      summary: mandate.rawDescription ?? undefined,
    };

    // 7. Run AI matching engine
    const { evaluations, aggregate } = await evaluateCandidateAgainstMatrix(
      parsedCV,
      rawCVText,
      requirements,
      mandateContext
    );

    // 8. Save to Convex
    const assessmentId = await convex.mutation(api.headhunting.candidateAssessment.saveAiEvaluation, {
      submissionId: submissionId as Id<"htSubmissions">,
      mandateId: mandateId as Id<"htMandates">,
      matrixId: matrix._id,
      evaluations: evaluations.map(ev => ({
        requirementId: ev.requirementId,
        matchLevel: ev.matchLevel,
        confidence: ev.confidence,
        evidence: ev.evidence,
        missingEvidence: ev.missingEvidence,
        concern: ev.concern,
      })),
      overallMatchPct: aggregate.overallMatchPct,
      mandatoryMatchPct: aggregate.mandatoryMatchPct,
      goodToHaveMatchPct: aggregate.goodToHaveMatchPct,
      riskFlagCount: aggregate.riskFlagCount,
      recommendation: aggregate.recommendation,
    });

    // Fire AI assessment completion notification (non-blocking)
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const notificationSecret = process.env.NOTIFICATION_SECRET;
    if (notificationSecret) {
      headers["x-notification-secret"] = notificationSecret;
    }
    // SSRF guard — derive base from VERCEL_URL/NEXT_PUBLIC_BASE_URL,
    // never from request.url (Host header is request-controlled).
    const notifBase = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";
    fetch(new URL("/api/notifications", notifBase).toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "mandate_status_changed",
        mandateTitle: `AI Assessment: ${submission.candidateName}`,
        clientName: mandate?.rawTitle ?? "Unknown Mandate",
        oldStatus: "assessing",
        newStatus: `score_${aggregate.overallMatchPct}`,
        note: `AI match: ${aggregate.recommendation} (${aggregate.overallMatchPct}/100, ${aggregate.riskFlagCount} risks)`,
        recipientEmail: "support@laborlawpartner.com",
        recipientName: "Team",
        mandateId,
      }),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      assessmentId,
      evaluations,
      aggregate,
    });
  } catch (err) {
    console.error("[assess] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
