import posthog from "posthog-js";

export type ChatLang = "en" | "bn" | (string & {});
export type ChatRole = "worker" | "employer" | "hr" | "general" | (string & {});
export type ExportFormat = "pdf" | "docx" | "pptx" | "xlsx";
export type SignupSource = "landing" | "chat" | "experts" | "jobs" | (string & {});
export type HeadhuntingCta = "employer" | "candidate";

interface BaseProps {
  distinct_id?: string;
}

export interface EventProps {
  chat_query_sent: BaseProps & { lang: ChatLang; role: ChatRole; length: number; query_snippet?: string };
  chat_answer_received: BaseProps & { latency_ms: number; citations: number; model: string; clarify: boolean };
  chat_clarify_shown: BaseProps & { query: string };
  chat_summarize_clicked: BaseProps & { lang: string };
  chat_export_clicked: BaseProps & { format: ExportFormat };
  chat_jump_back_clicked: BaseProps & { conv_id: string };
  signup_completed: BaseProps & { source: SignupSource; registration_method?: string; utm_source?: string; tier_id?: string };
  signin_completed: BaseProps & { source: string };
  doc_viewed: BaseProps & { doc_id: string; page: number };
  doc_searched: BaseProps & { query: string; results: number };
  cv_template_selected: BaseProps & { template: string };
  cv_pdf_downloaded: BaseProps & { template: string };
  expert_profile_viewed: BaseProps & { expert_id: string };
  expert_application_submitted: BaseProps & { expert_id: string };
  headhunting_cta_clicked: BaseProps & { cta: HeadhuntingCta; position: string };
  paywall_shown: BaseProps & { gate: string; tier: string };
  paywall_clicked: BaseProps & { gate: string; target_tier: string };

  // ── Tier 1 — Search & RAG ──
  search_limit_warning: BaseProps & { searches_used: number; limit_total: number; tier_id: string };
  search_limit_reached: BaseProps & { tier_id: string; time_of_day: string; searches_attempted_after_limit: number };
  search_limit_exceeded_attempt: BaseProps & { tier_id: string; attempts_count: number; upgrade_prompt_shown: boolean };
  chat_signup_wall_shown: BaseProps & { source_page: string; cta_clicked: boolean };
  search_result_rated: BaseProps & { query_id: string; rating: 1 | -1; user_tier_id: string };
  clause_link_followed: BaseProps & { source_clause: string; destination_clause: string; session_depth: number };
  follow_up_query_submitted: BaseProps & { parent_query_id: string; follow_up_depth_number: number };

  // ── Tier 1 — File & document ──
  file_upload_initiated: BaseProps & { file_type: string; file_size_kb: number; user_tier_id: string };
  file_upload_completed: BaseProps & { file_id: string; file_type: string; file_size_kb: number; upload_time_ms: number };
  file_upload_failed: BaseProps & { file_type: string; file_size_kb: number; error_reason: string; user_tier_id: string };
  file_analysis_requested: BaseProps & { file_id: string; analysis_type: string; query_attached: boolean };
  file_analysis_completed: BaseProps & { file_id: string; analysis_type: string; response_time_ms: number; compliance_issues_flagged_count: number; suggestions_count: number };
  compliance_report_exported: BaseProps & { file_id?: string; export_format: ExportFormat; user_tier_id: string };

  // ── Tier 1 — Marketplace + headhunting ──
  headhunting_lead_submitted: BaseProps & { cta: HeadhuntingCta; position: string };

  // ── Tier 1 — Identity (server-side) ──
  login: BaseProps & { login_method: string; days_since_last_login?: number };
  logout: BaseProps & { session_duration_min?: number; actions_taken_count?: number };
  account_deleted: BaseProps & { tier_id?: string; tenure_days?: number; deletion_reason?: string };
  profile_completed: BaseProps & { role_selected?: string; industry_selected?: string; company_size_band?: string };
}

export type EventName = keyof EventProps;

function sanitize<T extends Record<string, unknown>>(props: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "string") {
      out[k] = v.length > 60 ? v.slice(0, 60) : v;
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function track<E extends EventName>(event: E, props: EventProps[E]): void {
  if (typeof window === "undefined") return;
  try {
    const loaded = (posthog as unknown as { __loaded?: boolean }).__loaded;
    if (!loaded) return;
    posthog.capture(event, sanitize(props as unknown as Record<string, unknown>));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[posthog.track] failed for "${event}":`, (err as Error).message);
    }
  }
}
