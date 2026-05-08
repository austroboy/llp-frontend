"use client";

/**
 * Legal content parser — transforms legal-specific patterns in AI responses
 * into styled HTML spans BEFORE markdown rendering.
 *
 * Runs before MarkdownRenderer; the injected <span> tags are rendered via
 * rehype-raw so they pass through react-markdown untouched.
 */

// Detect and style the three-layer headers (Statutory / Regulatory / Recommended Practice)
function parseThreeLayers(text: string): string {
  // **Statutory:** or **Statutory Requirements:** or **Statutory (Section X):**
  text = text.replace(
    /\*\*Statutory(?:\s*Requirements?)?(?:\s*\([^)]*\))?:\*\*/g,
    '**<span class="legal-statutory">\u2696\uFE0F Statutory</span>**'
  );
  // **Regulatory:** or **Regulatory Procedure:** or **Regulatory/Rules:**
  text = text.replace(
    /\*\*Regulatory(?:\s*(?:Procedure|Requirements?|\/Rules))?:\*\*/g,
    '**<span class="legal-regulatory">\uD83D\uDCCB Regulatory</span>**'
  );
  // **Recommended Practice:**
  text = text.replace(
    /\*\*Recommended Practice:\*\*/g,
    '**<span class="legal-practice">\uD83D\uDCA1 Recommended Practice</span>**'
  );
  return text;
}

// Transform "Next Step:" / "Practical Next Step:" into a styled block
function parseNextStep(text: string): string {
  text = text.replace(
    /\*\*(?:Next Step|Practical Next Step):\*\*/g,
    '**<span class="legal-next-step">\u2192 Next Step</span>**'
  );
  return text;
}

// Transform "References:" into a styled header
function parseReferences(text: string): string {
  text = text.replace(
    /\*\*References:\*\*/g,
    '**<span class="legal-references">\uD83D\uDCDA References</span>**'
  );
  return text;
}

// Transform "Direct Answer:" into a styled header
function parseDirectAnswer(text: string): string {
  text = text.replace(
    /\*\*Direct Answer:\*\*/g,
    '**<span class="legal-direct-answer">\u2714\uFE0F Direct Answer</span>**'
  );
  return text;
}

// Transform "Legal Requirement:" into a styled header
function parseLegalRequirement(text: string): string {
  text = text.replace(
    /\*\*Legal Requirement:\*\*/g,
    '**<span class="legal-requirement">\uD83D\uDCDC Legal Requirement</span>**'
  );
  return text;
}

// Transform "Steps:" / "Practical Steps:" into a styled header
function parseSteps(text: string): string {
  text = text.replace(
    /\*\*(?:Practical )?Steps:\*\*/g,
    '**<span class="legal-steps">\uD83D\uDC63 Steps</span>**'
  );
  return text;
}

// Transform "Risks:" / "Risk:" into a styled header
function parseRisks(text: string): string {
  text = text.replace(
    /\*\*Risks?:\*\*/g,
    '**<span class="legal-risks">\u26A0\uFE0F Risks</span>**'
  );
  return text;
}

// Transform "Best Practice:" into a styled header
function parseBestPractice(text: string): string {
  text = text.replace(
    /\*\*Best Practice:\*\*/g,
    '**<span class="legal-best-practice">\u2B50 Best Practice</span>**'
  );
  return text;
}

// Transform "Evidence:" into a styled header
function parseEvidence(text: string): string {
  text = text.replace(
    /\*\*Evidence:\*\*/g,
    '**<span class="legal-evidence">\uD83D\uDD0D Evidence</span>**'
  );
  return text;
}

/**
 * Parse legal content patterns and transform them into styled HTML spans.
 * Call this BEFORE passing content to MarkdownRenderer.
 */
export function parseLegalContent(content: string): string {
  let processed = content;
  processed = parseThreeLayers(processed);
  processed = parseNextStep(processed);
  processed = parseReferences(processed);
  processed = parseDirectAnswer(processed);
  processed = parseLegalRequirement(processed);
  processed = parseSteps(processed);
  processed = parseRisks(processed);
  processed = parseBestPractice(processed);
  processed = parseEvidence(processed);
  return processed;
}
