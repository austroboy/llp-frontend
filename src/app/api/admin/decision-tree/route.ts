import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

// ── GET — Fetch branches, blacklist, relationships, corrections ──────

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user || (user.publicMetadata as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") || "branches";

  try {
    // ── Branches tab ──
    if (tab === "branches") {
      const statusFilter = searchParams.get("status") || "";
      const domainFilter = searchParams.get("domain") || "";

      let query = supabase
        .from("decision_tree_branches")
        .select("*")
        .order("times_matched", { ascending: false });

      if (statusFilter) query = query.eq("status", statusFilter);
      if (domainFilter) query = query.eq("domain", domainFilter);

      const { data, error } = await query.limit(200);
      if (error) throw error;

      // Stats
      const { data: allBranches } = await supabase
        .from("decision_tree_branches")
        .select("status", { count: "exact" });

      const statusCounts = { draft: 0, under_review: 0, partially_confirmed: 0, confirmed: 0, recheck_required: 0, rejected: 0 };
      for (const b of allBranches || []) {
        const s = b.status as keyof typeof statusCounts;
        if (s in statusCounts) statusCounts[s]++;
      }

      return NextResponse.json({
        branches: data || [],
        stats: {
          total: (allBranches || []).length,
          ...statusCounts,
        },
      });
    }

    // ── Blacklist tab (typed) ──
    if (tab === "blacklist") {
      const typeFilter = searchParams.get("type") || "";

      let query = supabase
        .from("section_blacklist")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (typeFilter) query = query.eq("blacklist_type", typeFilter);

      const { data, error } = await query.limit(200);
      if (error) throw error;

      // Counts per type
      const typeCounts = { superseded: 0, low_confidence: 0, corrupt_extraction: 0, historical_only: 0 };
      for (const entry of data || []) {
        const t = entry.blacklist_type as keyof typeof typeCounts;
        if (t in typeCounts) typeCounts[t]++;
      }

      return NextResponse.json({
        blacklist: data || [],
        typeCounts,
      });
    }

    // ── Relationships tab ──
    if (tab === "relationships") {
      const docFilter = searchParams.get("document_id") || "";

      let query = supabase
        .from("section_relationships")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (docFilter) {
        query = query.or(`section_a_doc.eq.${docFilter},section_b_doc.eq.${docFilter}`);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;

      return NextResponse.json({ relationships: data || [] });
    }

    // ── Review queue (pending contributor corrections) ──
    if (tab === "review-queue") {
      const { data, error } = await supabase
        .from("contributor_corrections")
        .select("*")
        .eq("status", "pending")
        .order("submitted_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return NextResponse.json({ corrections: data || [] });
    }

    // ── Batch reviews ──
    if (tab === "batches") {
      const { data, error } = await supabase
        .from("batch_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return NextResponse.json({ batches: data || [] });
    }

    // ── Single branch detail ──
    if (tab === "branch-detail") {
      const branchId = searchParams.get("id");
      if (!branchId) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }

      const { data: branch, error } = await supabase
        .from("decision_tree_branches")
        .select("*")
        .eq("id", parseInt(branchId))
        .single();

      if (error) throw error;

      // Fetch confidence data for each section in the branch
      const sections = (branch.sections || []) as Array<{
        document_id: string;
        section_number: string;
      }>;
      const confidenceData: Record<string, { score: number; cited: number }> = {};

      for (const sec of sections) {
        const { data: conf } = await supabase
          .from("citation_confidence")
          .select("confidence_score, times_cited")
          .eq("document_id", sec.document_id)
          .eq("section_number", sec.section_number)
          .single();

        if (conf) {
          confidenceData[`${sec.document_id}:${sec.section_number}`] = {
            score: conf.confidence_score,
            cited: conf.times_cited,
          };
        }
      }

      // Fetch related corrections
      const { data: corrections } = await supabase
        .from("contributor_corrections")
        .select("*")
        .eq("branch_id", parseInt(branchId))
        .order("submitted_at", { ascending: false })
        .limit(20);

      return NextResponse.json({
        branch,
        confidenceData,
        corrections: corrections || [],
      });
    }

    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  } catch (err) {
    console.error("[admin/decision-tree] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// ── POST — Create branch, blacklist entry, relationship, or correction ──

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || (user.publicMetadata as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createServerClient();

  try {
    const body = await req.json();
    const { action } = body;

    // ── Create branch ──
    if (action === "create-branch") {
      const { query_type, label, domain, cross_domains, sections, description } = body;

      if (!query_type || !label || !domain) {
        return NextResponse.json({ error: "query_type, label, domain required" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("decision_tree_branches")
        .insert({
          query_type,
          label,
          description: description || null,
          domain,
          cross_domains: cross_domains || [],
          sections: (sections || []).map((s: { document_id: string; section_number: string; section: string }) => ({
            ...s,
            node_status: "unconfirmed",
          })),
          status: "draft",
          section_count: (sections || []).length,
          auto_generated: false,
        })
        .select("id")
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, id: data?.id });
    }

    // ── Create blacklist entry ──
    if (action === "create-blacklist") {
      const {
        document_id,
        section_number,
        section,
        blacklist_type,
        replacement_doc_id,
        replacement_section_number,
        corruption_details,
        notes,
      } = body;

      if (!document_id || !section_number || !blacklist_type) {
        return NextResponse.json(
          { error: "document_id, section_number, blacklist_type required" },
          { status: 400 }
        );
      }

      const { error } = await supabase.from("section_blacklist").upsert(
        {
          document_id,
          section_number,
          section: section || null,
          blacklist_type,
          replacement_doc_id: replacement_doc_id || null,
          replacement_section_number: replacement_section_number || null,
          corruption_details: corruption_details || null,
          notes: notes || null,
          created_by: user.id,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "document_id,section_number,blacklist_type" }
      );

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // ── Create section relationship ──
    if (action === "create-relationship") {
      const {
        section_a_doc,
        section_a_number,
        section_b_doc,
        section_b_number,
        relationship_type,
        description,
      } = body;

      if (!section_a_doc || !section_a_number || !section_b_doc || !section_b_number || !relationship_type) {
        return NextResponse.json({ error: "All section fields and relationship_type required" }, { status: 400 });
      }

      const { error } = await supabase.from("section_relationships").upsert(
        {
          section_a_doc,
          section_a_number,
          section_b_doc,
          section_b_number,
          relationship_type,
          description: description || null,
          created_by: user.id,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "section_a_doc,section_a_number,section_b_doc,section_b_number,relationship_type" }
      );

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[admin/decision-tree] POST error:", err);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

// ── PATCH — Update branch status, review corrections ──

export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  if (!user || (user.publicMetadata as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createServerClient();

  try {
    const body = await req.json();
    const { action } = body;

    // ── Update branch status ──
    if (action === "update-branch-status") {
      const { branch_id, status, notes } = body;

      if (!branch_id || !status) {
        return NextResponse.json({ error: "branch_id and status required" }, { status: 400 });
      }

      const validStatuses = [
        "draft", "under_review", "partially_confirmed",
        "confirmed", "recheck_required", "rejected",
      ];

      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
      }

      const { error } = await supabase.rpc("update_branch_status", {
        p_branch_id: branch_id,
        p_new_status: status,
        p_user_id: user.id,
        p_notes: notes || null,
      });

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // ── Update branch sections (add/update nodes) ──
    if (action === "update-branch-sections") {
      const { branch_id, sections } = body;

      if (!branch_id || !sections) {
        return NextResponse.json({ error: "branch_id and sections required" }, { status: 400 });
      }

      const { error } = await supabase
        .from("decision_tree_branches")
        .update({
          sections,
          section_count: sections.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", branch_id);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // ── Review contributor correction ──
    if (action === "review-correction") {
      const { correction_id, decision, review_notes } = body;

      if (!correction_id || !decision) {
        return NextResponse.json({ error: "correction_id and decision required" }, { status: 400 });
      }

      if (!["approved", "rejected"].includes(decision)) {
        return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });
      }

      const { error } = await supabase
        .from("contributor_corrections")
        .update({
          status: decision,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", correction_id);

      if (error) throw error;

      // If approved, apply as admin correction overlay
      if (decision === "approved") {
        const { data: correction } = await supabase
          .from("contributor_corrections")
          .select("*")
          .eq("id", correction_id)
          .single();

        if (correction && correction.corrected_content) {
          await supabase.from("admin_corrections").upsert(
            {
              document_id: correction.corrected_document_id || correction.document_id,
              section: correction.section || "",
              section_number: correction.corrected_section_number || correction.section_number,
              chunk_id: correction.chunk_id,
              original_content: correction.original_citation,
              corrected_content: correction.corrected_content,
              correction_note: `Contributor correction (${correction.submitted_by_email}): ${correction.correction_note || ""}`,
              corrected_by: user.id,
              corrected_by_email: user.emailAddresses?.[0]?.emailAddress || null,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "document_id,section_number" }
          );
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[admin/decision-tree] PATCH error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// ── DELETE — Remove blacklist entry, relationship, or branch ──

export async function DELETE(req: NextRequest) {
  const user = await currentUser();
  if (!user || (user.publicMetadata as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createServerClient();

  try {
    const body = await req.json();
    const { action, id } = body;

    if (!action || !id) {
      return NextResponse.json({ error: "action and id required" }, { status: 400 });
    }

    const table =
      action === "remove-blacklist" ? "section_blacklist" :
      action === "remove-relationship" ? "section_relationships" :
      action === "remove-branch" ? "decision_tree_branches" : null;

    if (!table) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    // Soft delete for blacklist and relationships, hard delete for branches
    if (table === "decision_tree_branches") {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from(table)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/decision-tree] DELETE error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
