// src/app/admin/cost-calculator/presets.ts
import type { PresetId, Macros, PhaseBState } from "./calc-types";

export interface PresetSnapshot {
  id: PresetId;
  label: string;
  description: string;
  macros: Macros;
  /** Optional phaseB override; if absent, derived from Quality. */
  phaseBOverride?: Partial<PhaseBState>;
  /**
   * When true, the cost-calculator page fetches `/api/admin/cost-calc/live`
   * and overlays the rolling 7-day production telemetry on top of the static
   * macros above. Currently only the "today" preset opts in.
   */
  useLive?: boolean;
}

export const PRESETS: PresetSnapshot[] = [
  {
    id: "today",
    label: "Today (prod)",
    description: "Live state · Grok 4.1 Fast Reasoning T1 · G1 honesty banner only · all other Phase B flags OFF · Stream-2 fully absorbed by Claude/Codex subs.",
    macros: { scaleUsers: 100, quality: 50, subsidyPct: 100 },
    useLive: true,
  },
  {
    id: "phase_b_full",
    label: "Phase B Full",
    description: "What-if all 7 flags flip ON · Opus verify + F1 corrector active · subs still absorb Stream-2 → bottom line barely moves (only +A2 BN bridge + selfcheck add tiny variable cost).",
    macros: { scaleUsers: 100, quality: 95, subsidyPct: 100 },
  },
  {
    id: "phase_b_full_no_subsidy",
    label: "Phase B Full + redClaw exits",
    description: "Nightmare scenario · Phase B fully ON AND Claude/Codex subs cancel · LLP would pay Anthropic API rates ($15/$75 Opus, $3/$15 Sonnet) per call. Stress-test for budget planning.",
    macros: { scaleUsers: 100, quality: 95, subsidyPct: 0 },
  },
  {
    id: "cost_floor",
    label: "Cost Floor",
    description: "Absolute minimum burn · Gemini-3-Flash (free preview) for T1 · no verify · no Phase B. Variable cost ≈ $0 per chat. Quality drops noticeably.",
    macros: { scaleUsers: 100, quality: 10, subsidyPct: 100 },
  },
  {
    id: "investor_pitch",
    label: "Investor Pitch",
    description: "Unit economics at 10,000-user scale · prod-today quality · full subsidy · shows margin per cohort at growth scale for fundraising deck.",
    macros: { scaleUsers: 10000, quality: 50, subsidyPct: 100 },
  },
];

export function findPreset(id: PresetId): PresetSnapshot | undefined {
  return PRESETS.find(p => p.id === id);
}
