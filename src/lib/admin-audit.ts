import { createServerClient } from "@/lib/supabase";

/**
 * Admin mutation audit log (H-5).
 *
 * Writes a single row to the existing `audit_logs` table after a destructive
 * admin operation succeeds. Failure to log MUST NOT break the mutation —
 * we swallow errors and console.error them so the user-visible op still
 * returns success.
 *
 * Schema mapping (TODO):
 *   The current `audit_logs` table (see src/lib/audit/log-writer.ts +
 *   src/app/api/admin/audit-logs/route.ts) uses columns:
 *     operation TEXT, document_id TEXT, user_id TEXT, user_email TEXT,
 *     created_at TIMESTAMPTZ DEFAULT now(), cost_usd NUMERIC, health_score INT, ...
 *   It does NOT currently have actor_clerk_id / target_id / before / after /
 *   metadata columns. Until a migration adds those, we map:
 *     actorClerkId -> user_id
 *     op           -> operation
 *     targetId     -> document_id   (string ids — works for any admin entity)
 *     before/after/metadata -> packed into result_message JSON, since the table
 *                              has no jsonb column for them yet.
 *   Once a migration ships proper columns, callers don't change — this helper
 *   absorbs the schema delta.
 *   No supabase/migrations/ directory exists in this repo; schema is managed
 *   directly via Supabase Studio. Coordinator must add columns there.
 */
export async function writeAuditLog(entry: {
  actorClerkId: string;
  op: string;             // e.g. "decision-tree.decay" | "cache.delete" | "user.role-change"
  targetId?: string;      // id of the row being mutated, if any
  before?: unknown;       // optional snapshot
  after?: unknown;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const sb = createServerClient();
    const payload: Record<string, unknown> = {
      operation: entry.op,
      user_id: entry.actorClerkId,
      document_id: entry.targetId ?? "",
    };

    // Pack before/after/metadata into result_message until dedicated columns exist.
    if (entry.before !== undefined || entry.after !== undefined || entry.metadata) {
      try {
        payload.result_message = JSON.stringify({
          before: entry.before ?? null,
          after: entry.after ?? null,
          metadata: entry.metadata ?? {},
        });
      } catch {
        payload.result_message = "[unserialisable audit payload]";
      }
    }

    const { error } = await sb.from("audit_logs").insert(payload);
    if (error) console.error("[admin-audit] insert failed:", error.message);
  } catch (err) {
    // Audit log failures must NOT break the mutation; log + swallow.
    console.error("[admin-audit] write failed:", err);
  }
}
