// Tier-based model definitions for client and server

// All users — Gemini primary (zero-cost)
export const FREE_TIER_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Google AI" },
] as const;
export const DEFAULT_FREE_MODEL = "gemini-2.5-flash";

// Paid tier (Mini/Max) — same lineup
export const PAID_TIER_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Google AI" },
] as const;
export const DEFAULT_PAID_MODEL = "gemini-2.5-flash";

// Backward compat aliases (used by chat-main, chat-input-box, chat-conversation-view)
export const AI_MODELS = FREE_TIER_MODELS;
export const DEFAULT_MODEL = DEFAULT_FREE_MODEL;

export type ModelId = (typeof PAID_TIER_MODELS)[number]["id"];
