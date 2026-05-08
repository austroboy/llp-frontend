import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { rateGuard } from "@/lib/rate-limit";

/**
 * Citation Review API — Submit contributor corrections from in-chat review UI
 * v3.1: Corrections go to admin review queue, not applied directly.
 */
export async function POST(req: NextRequest) {
  const blocked = await rateGuard(req, 10);
  if (blocked) return blocked;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role check: must be contributor, reviewer, or admin
  const role = (user.publicMetadata as { role?: string })?.role;
  if (!role || !["contributor", "reviewer", "admin"].includes(role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const supabase = createServerClient();

  try {
    const {
      document_id,
      section_number,
      section,
      original_citation,
      query_text,
      conversation_id,
      corrected_section_number,
      corrected_document_id,
      corrected_content,
      correction_note,
    } = await req.json();

    if (!document_id || !section_number) {
      return NextResponse.json(
        { error: "document_id and section_number required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("contributor_corrections").insert({
      document_id,
      section_number,
      section: section || null,
      original_citation: original_citation || null,
      query_text: query_text || null,
      conversation_id: conversation_id || null,
      corrected_section_number: corrected_section_number || null,
      corrected_document_id: corrected_document_id || null,
      corrected_content: corrected_content || null,
      correction_note: correction_note || null,
      submitted_by: user.id,
      submitted_by_email: user.emailAddresses?.[0]?.emailAddress || null,
      status: "pending",
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[citation-review] POST error:", err);
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }
}
