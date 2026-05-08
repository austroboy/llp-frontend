// Labor Law Partner — Intent Classification via Claude Haiku 4.5
// Drop-in replacement for intent-classifier.ts (Gemini → Claude)

import Anthropic from "@anthropic-ai/sdk";
import type { IntentClassification, Language } from "./framework-types";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const CLASSIFIER_MODEL = "claude-haiku-4-5-20251001";

const CLASSIFIER_PROMPT = `You are an intent classifier for a Bangladesh labour law AI system (Labor Law Partner).

Classify the user's query into the following intent taxonomy. A query may have multiple intents.

INTENTS:
- FACTUAL: Questions about legal facts, definitions, rights, obligations. Available to ALL tiers.
- ADVISORY: Requests for strategic advice, risk analysis, recommendations. Paid tiers only.
- DRAFTING: Requests to create/write policies, notices, letters, deeds, complaints. Paid tiers only.
- CALCULATION: Monetary calculations (gratuity, PF, encashment, severance). Free subscribed+ tiers.
- PROCEDURAL: Step-by-step process questions (how to file, how to apply). Available to ALL tiers.
- CROSS_DOMAIN: Questions spanning multiple legal domains (labour + tax, labour + immigration). Paid tiers only.
- PRODUCT_INQUIRY: User directly asks about an LLP product or service by explicitly naming it (e.g., "LLP Marketplace", "LLP Academy", "LLP Help Desk", "LLP Headhunting", "Expatriate & Visa Solutions", "HR & People Solutions", "Licensing & Regulatory Services"). Only classify as PRODUCT_INQUIRY if the user uses the actual product name. Do NOT classify generic questions like "find a lawyer" or "need help" as PRODUCT_INQUIRY. Available to ALL tiers.

DOMAINS: termination, wages, leave, benefits, workplace_safety, trade_union, apprenticeship, maternity, child_labour, working_hours, overtime, provident_fund, gratuity, compensation, dispute_resolution, contract, factory_regulations, employment_conditions, foreign_workers, other

PERSPECTIVE: worker (employee asking about their rights), employer (employer/HR asking about compliance), neutral (general/academic question)

URGENCY: general (normal question), time_sensitive (deadline mentioned), crisis (immediate legal threat, termination notice, accident)

Respond with ONLY valid JSON, no markdown fences:
{
  "intents": ["FACTUAL"],
  "primary_intent": "FACTUAL",
  "domain": "termination",
  "cross_domains": [],
  "urgency": "general",
  "language": "english",
  "requires_file": false,
  "perspective": "neutral"
}`;

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

export async function classifyIntentWithClaude(
  query: string
): Promise<IntentClassification> {
  try {
    const response = await client.messages.create({
      model: CLASSIFIER_MODEL,
      max_tokens: 200,
      system: CLASSIFIER_PROMPT,
      messages: [
        {
          role: "user",
          content: `Classify this query:\n"${query}"`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) {
      console.error("[IntentClassifier-Claude] Empty response");
      return getDefaultClassification(query);
    }

    // Strip markdown fences if present (safety)
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(cleaned) as IntentClassification;

    // Validate required fields
    if (!parsed.intents?.length || !parsed.primary_intent || !parsed.domain) {
      console.error("[IntentClassifier-Claude] Invalid classification:", parsed);
      return getDefaultClassification(query);
    }

    return parsed;
  } catch (err) {
    console.error("[IntentClassifier-Claude] Error:", err);
    return getDefaultClassification(query);
  }
}

function getDefaultClassification(query: string): IntentClassification {
  // Detect language from query
  const hasBangla = /[\u0980-\u09FF]/.test(query);
  const language: Language = hasBangla ? "bangla" : "english";

  return {
    intents: ["FACTUAL"],
    primary_intent: "FACTUAL",
    domain: "other",
    cross_domains: [],
    urgency: "general",
    language,
    requires_file: false,
    perspective: "neutral",
  };
}
