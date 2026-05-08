/**
 * Clarification Gateway — Pure decision logic for admin/chat-test sandbox.
 *
 * Determines whether a user query should:
 *  - Be clarified first (vague topic keyword, missing critical facts)
 *  - Go directly to the LLM (explicit definition, specific question, bounded rule)
 *  - Be rejected as a dump request (all/every/full chapter)
 */

export type GatewayAction = "clarify_first" | "direct_answer" | "anti_dump";

export interface GatewayDecision {
  action: GatewayAction;
  reason: string;
  /** Pre-built clarification question for clarify_first, if deterministic */
  clarificationDraft?: string;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Pattern matchers ──

/** Dump requests: user wants exhaustive coverage of a broad topic */
const DUMP_PATTERNS = [
  /\b(give|show|list|tell)\s+(me\s+)?(all|every|each|complete|full|entire)\b/i,
  /\bfull\s+chapter\b/i,
  /\bevery\s+section\b/i,
  /\ball\s+(?:sections?|provisions?|rules?|clauses?)\s+(?:about|on|regarding|related|of|under)\b/i,
  /\bcomplete\s+(?:list|guide|overview|summary)\s+(?:of|on|about)\b/i,
  /\bentire\s+(?:act|law|chapter|part)\b/i,
];

/** Explicit definition requests: "define X", "what is X", "meaning of X" */
const DEFINITION_PATTERNS = [
  /^define\s+/i,
  /^what\s+(?:is|are|does)\s+(?:the\s+)?(?:definition|meaning)\s+of\b/i,
  /^what\s+(?:is|are)\s+[\w\s]{1,40}\??$/i,
  /^meaning\s+of\s+/i,
  /^(?:explain|describe)\s+(?:the\s+)?(?:term|concept|definition)\s+/i,
];

/** Single topic keywords — vague queries that need clarification */
function isVagueTopicKeyword(message: string): boolean {
  const trimmed = message.replace(/[?.!,]+$/g, "").trim();
  const words = trimmed.split(/\s+/);
  // 1-3 words, no verb structure, no question words
  if (words.length > 3) return false;
  if (words.length === 0) return false;

  const questionStarters = /^(what|how|when|where|who|which|can|does|do|is|are|should|will|may)\b/i;
  if (questionStarters.test(trimmed)) return false;

  // Check it's not a definition request
  if (DEFINITION_PATTERNS.some((p) => p.test(trimmed))) return false;

  return true;
}

/** Check if the query is an explicit definition request */
function isDefinitionRequest(message: string): boolean {
  return DEFINITION_PATTERNS.some((p) => p.test(message.trim()));
}

/** Check if the query is a dump/exhaustive request */
function isDumpRequest(message: string): boolean {
  return DUMP_PATTERNS.some((p) => p.test(message.trim()));
}

/**
 * Context short-circuit: if recent chat history makes the user's intent
 * sufficiently identifiable, skip clarification even for vague keywords.
 */
function hasContextClarity(
  message: string,
  history: ChatHistoryMessage[]
): boolean {
  if (history.length === 0) return false;

  // Tighter context: look only at the immediate previous exchange (last 2 messages)
  const recent = history.slice(-2);
  const msgLower = message.toLowerCase().trim();
  const msgWords = msgLower.replace(/[?.!]/g, "").split(/\s+/).filter(w => w.length > 3);

  const lastAssistant = [...recent].reverse().find((m) => m.role === "assistant");
  if (lastAssistant) {
    const assistantLower = lastAssistant.content.toLowerCase();
    // If assistant just asked a question (likely a clarification), user is answering
    if (assistantLower.includes("?") && assistantLower.length < 200) {
      return true;
    }
    // If the user's keyword strongly overlaps with the active topic in the last response
    if (msgWords.length > 0 && msgWords.some(w => assistantLower.includes(w))) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a query resolves to a single controlling provision or bounded legal rule
 * that can be answered directly without branch-dependent assumptions.
 */
function isBoundedLegalQuery(message: string, classification: Record<string, unknown>): boolean {
  // Specific section references → direct answer
  if (/section\s+\d+/i.test(message)) return true;
  if (/rule\s+\d+/i.test(message)) return true;
  if (/ধারা\s+[\u09E6-\u09EF\d]+/i.test(message)) return true;

  // Questions with specific parameters (establishment type, duration, amount)
  const specificParams = /\b(factory|commercial|tea\s+plantation|shop|establishment)\b/i;
  const questionWithParam = /\b(notice\s+period|maternity|overtime|gratuity|compensation|wage|leave|working\s+hours?)\b/i;
  if (specificParams.test(message) && questionWithParam.test(message)) return true;

  // "How to calculate X" — bounded procedural query
  if (/how\s+(?:to|do\s+(?:I|we|you))\s+calculate/i.test(message)) return true;

  // Classification signals high confidence in a single domain
  if (classification.primary_intent === "FACTUAL" && classification.urgency === "specific") return true;

  return false;
}

// ── Main gateway decision ──

export function gatewayDecision(
  message: string,
  classification: Record<string, unknown>,
  history: ChatHistoryMessage[] = []
): GatewayDecision {
  const trimmed = message.trim();

  // 1. Anti-dump check (highest priority)
  if (isDumpRequest(trimmed)) {
    return {
      action: "anti_dump",
      reason: "dump_request_detected",
      clarificationDraft:
        "That covers a very broad area. Could you narrow it down to the specific aspect you need — for example, a particular type of leave, a specific worker category, or a situation you're dealing with?",
    };
  }

  // 2. Explicit definition request → direct answer
  if (isDefinitionRequest(trimmed)) {
    return {
      action: "direct_answer",
      reason: "explicit_definition_request",
    };
  }

  // 3. Bounded legal query with specific parameters → direct answer
  if (isBoundedLegalQuery(trimmed, classification)) {
    return {
      action: "direct_answer",
      reason: "bounded_legal_query",
    };
  }

  // 4. Context short-circuit: history makes intent clear → direct answer
  if (isVagueTopicKeyword(trimmed) && hasContextClarity(trimmed, history)) {
    return {
      action: "direct_answer",
      reason: "context_short_circuit",
    };
  }

  // 5. Vague topic keyword without context → clarify first
  if (isVagueTopicKeyword(trimmed)) {
    const topic = trimmed.replace(/[?.!]/g, "").trim();
    return {
      action: "clarify_first",
      reason: "vague_topic_keyword",
      clarificationDraft: `"${topic}" can involve several different aspects under the law. What specific situation or question do you have in mind?`,
    };
  }

  // 6. Short ambiguous query (4-8 words, no clear question structure)
  const words = trimmed.split(/\s+/);
  if (words.length <= 8 && !trimmed.includes("?") && !/^(what|how|when|where|who|which|can|does|do|is|are)\b/i.test(trimmed)) {
    // Check if it's still specific enough
    if (!isBoundedLegalQuery(trimmed, classification)) {
      return {
        action: "clarify_first",
        reason: "ambiguous_short_query",
      };
    }
  }

  // 7. Default: proceed to direct answer
  return {
    action: "direct_answer",
    reason: "sufficient_specificity",
  };
}

// ── Clarification validator ──

export interface ValidationResult {
  valid: boolean;
  violations: string[];
}

/**
 * Validates a generated clarification response.
 * Must be: one clarification intent, one short paragraph, no bullets,
 * no citations, no legal mini-essay, no broad overview drift.
 */
export function validateClarification(text: string): ValidationResult {
  const violations: string[] = [];
  const trimmed = text.trim();

  // No bullets or numbered lists
  if (/^[\s]*[-•*]\s/m.test(trimmed) || /^\s*\d+[.)]\s/m.test(trimmed)) {
    violations.push("contains_bullets_or_lists");
  }

  // No citations (Section X, ধারা X)
  if (/Section\s+\d+/i.test(trimmed) || /ধারা\s+[\u09E6-\u09EF\d]+/.test(trimmed)) {
    violations.push("contains_citations");
  }

  // No legal references (Act, Rules, Amendment)
  if (/\b(?:Bangladesh\s+)?Labour\s+(?:Act|Rules|Amendment)/i.test(trimmed)) {
    violations.push("contains_legal_references");
  }

  // Must be short — one paragraph, roughly 20-100 words
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > 100) {
    violations.push("too_long");
  }
  if (wordCount < 5) {
    violations.push("too_short");
  }

  // No multiple paragraphs (allow one line break for formatting)
  const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length > 1) {
    violations.push("multiple_paragraphs");
  }

  // Must end with or contain a question
  if (!trimmed.includes("?")) {
    violations.push("no_question_mark");
  }

  // No broad overview markers
  if (/\b(overview|comprehensive|in\s+general|broadly|typically|usually|various\s+aspects)\b/i.test(trimmed)) {
    violations.push("broad_overview_drift");
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Deterministic fallback clarification when LLM-generated one fails validation.
 * Uses the gateway decision's topic to ask a focused question.
 */
export function fallbackClarification(message: string): string {
  const topic = message.replace(/[?.!]/g, "").trim();
  return `Could you tell me more about what specifically regarding "${topic}" you need help with?`;
}
