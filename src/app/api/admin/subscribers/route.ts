import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

interface PublicMetadata {
  role?: string;
  [key: string]: unknown;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
  const user = await currentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = (user.publicMetadata as PublicMetadata)?.role;
  if (role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

// ---------------------------------------------------------------------------
// GET — List subscribers with filtering, search, pagination, and stats
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const source = params.get("source");
  const search = params.get("search");
  const tag = params.get("tag");
  const page = Math.max(1, parseInt(params.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "50")));
  const offset = (page - 1) * limit;

  const supabase = getSupabase();

  try {
    // Build filtered query
    let query = supabase
      .from("email_subscribers")
      .select("*", { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    }
    if (source) {
      query = query.eq("source", source);
    }
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }
    if (tag) {
      query = query.contains("tags", [tag]);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: subscribers, count, error } = await query;

    if (error) {
      console.error("Failed to fetch subscribers:", error);
      return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
    }

    // Fetch aggregate stats (unfiltered)
    const { data: allSubscribers, error: statsError } = await supabase
      .from("email_subscribers")
      .select("status, source");

    if (statsError) {
      console.error("Failed to fetch subscriber stats:", statsError);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    const stats = {
      total: allSubscribers.length,
      active: allSubscribers.filter((s) => s.status === "active").length,
      unsubscribed: allSubscribers.filter((s) => s.status === "unsubscribed").length,
      bounced: allSubscribers.filter((s) => s.status === "bounced").length,
      bySource: allSubscribers.reduce<Record<string, number>>((acc, s) => {
        const src = s.source || "unknown";
        acc[src] = (acc[src] || 0) + 1;
        return acc;
      }, {}),
    };

    return NextResponse.json({
      subscribers: subscribers ?? [],
      total: count ?? 0,
      page,
      limit,
      stats,
    });
  } catch (error) {
    console.error("Failed to fetch subscribers:", error);
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Create subscriber(s): single or bulk
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = getSupabase();

  try {
    const body = await request.json();

    // Determine if bulk or single
    const isBulk = Array.isArray(body.subscribers);
    const entries: { email: string; name?: string; tags?: string[] }[] = isBulk
      ? body.subscribers
      : [{ email: body.email, name: body.name, tags: body.tags }];
    const source = body.source || (isBulk ? "csv_import" : "admin_manual");

    if (!entries.length || !entries[0]?.email) {
      return NextResponse.json({ error: "At least one email is required" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches of 100 to avoid oversized payloads
    const BATCH_SIZE = 100;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      // Validate emails in batch
      const validRows: { email: string; name: string | null; source: string; status: string; tags: string[] }[] = [];
      for (const entry of batch) {
        const email = entry.email?.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`Invalid email: ${entry.email ?? "(empty)"}`);
          skipped++;
          continue;
        }
        validRows.push({
          email,
          name: entry.name?.trim() || null,
          source,
          status: "active",
          tags: entry.tags ?? [],
        });
      }

      if (!validRows.length) continue;

      // Upsert: on conflict(email) do nothing meaningful — skip duplicates
      const { data, error } = await supabase
        .from("email_subscribers")
        .upsert(validRows, {
          onConflict: "email",
          ignoreDuplicates: true,
        })
        .select("id");

      if (error) {
        console.error("Batch upsert error:", error);
        errors.push(`Batch insert error: ${error.message}`);
        skipped += validRows.length;
      } else {
        created += data?.length ?? 0;
        skipped += validRows.length - (data?.length ?? 0);
      }
    }

    return NextResponse.json({ created, skipped, errors });
  } catch (error) {
    console.error("Failed to create subscriber(s):", error);
    return NextResponse.json({ error: "Failed to create subscriber(s)" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT — Update a single subscriber
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { id, name, status, tags, metadata } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Build update payload — only include provided fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (tags !== undefined) updates.tags = tags;
    if (metadata !== undefined) updates.metadata = metadata;

    // If status changed to "unsubscribed", record the timestamp
    if (status === "unsubscribed") {
      updates.unsubscribed_at = new Date().toISOString();
    }
    // If reactivating, clear unsubscribed_at
    if (status === "active") {
      updates.unsubscribed_at = null;
    }

    const { data, error } = await supabase
      .from("email_subscribers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update subscriber:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to update subscriber" }, { status: 500 });
    }

    return NextResponse.json({ subscriber: data });
  } catch (error) {
    console.error("Failed to update subscriber:", error);
    return NextResponse.json({ error: "Failed to update subscriber" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — Bulk delete subscribers by ID
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("email_subscribers")
      .delete()
      .in("id", ids)
      .select("id");

    if (error) {
      console.error("Failed to delete subscribers:", error);
      return NextResponse.json({ error: "Failed to delete subscribers" }, { status: 500 });
    }

    return NextResponse.json({ deleted: data?.length ?? 0 });
  } catch (error) {
    console.error("Failed to delete subscribers:", error);
    return NextResponse.json({ error: "Failed to delete subscribers" }, { status: 500 });
  }
}
