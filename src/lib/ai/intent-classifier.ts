// Labor Law Partner — Intent Classification System
// Runs before every response. Single Gemini call (~100 tokens).

import type { IntentClassification, Language } from "./framework-types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const CLASSIFIER_MODEL = "gemini-2.5-flash";

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
- NOT_A_QUESTION: ONLY use when the input is clearly NOT any kind of question or legal topic — e.g., gibberish, random numbers, test labels like "Stage 3: Multi-point legal reasoning", single-word greetings like "Hi" or "Hello", or completely unrelated text. Do NOT classify as NOT_A_QUESTION if the input asks about: adjacent legal domains (EPZ law, tax, constitutional law), the AI system's own capabilities or limitations, outcome certainty/prediction, jurisdictional boundaries, or any topic that can be answered with a substantive legal boundary response. When in doubt, classify as FACTUAL — never reject a potentially legitimate query.

DOMAINS: termination, wages, leave, benefits, workplace_safety, trade_union, apprenticeship, maternity, child_labour, working_hours, overtime, provident_fund, gratuity, compensation, dispute_resolution, contract, factory_regulations, employment_conditions, foreign_workers, epz, other

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

export async function classifyIntent(
  query: string
): Promise<IntentClassification> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${CLASSIFIER_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: {
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 200,
            responseMimeType: "application/json",
          },
          contents: [
            { role: "user", parts: [{ text: CLASSIFIER_PROMPT }] },
            {
              role: "user",
              parts: [{ text: `Classify this query:\n"${query}"` }],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      console.error("[IntentClassifier] API error:", res.status);
      return getDefaultClassification(query);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text)
      .join("")
      ?.trim();

    if (!text) {
      console.error("[IntentClassifier] Empty response");
      return getDefaultClassification(query);
    }

    const parsed = JSON.parse(text) as IntentClassification;

    // Validate required fields
    if (!parsed.intents?.length || !parsed.primary_intent || !parsed.domain) {
      console.error("[IntentClassifier] Invalid classification:", parsed);
      return getDefaultClassification(query);
    }

    return parsed;
  } catch (err) {
    console.error("[IntentClassifier] Error:", err);
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
