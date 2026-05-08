import { createServerClient } from "@/lib/supabase";
import type { ModelUsage } from "./token-tracker";

export interface AuditLogEntry {
  operation: string;
  document_id: string;
  document_title?: string;
  language?: string;
  user_id: string;
  user_email?: string;
  quality_mode?: string;
  ai_model?: string;
  health_score?: number;
  health?: string;
  total_findings?: number;
  errors?: number;
  warnings?: number;
  infos?: number;
  result?: string;
  result_message?: string;
  chunks_count?: number;
  duration_ms?: number;
  tokens?: Record<string, ModelUsage>;
  cost_usd?: number;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from("audit_logs").insert(entry);
    if (error) console.error("Failed to write audit log:", error.message);
  } catch (err) {
    console.error("Audit log write error:", err);
  }
}
