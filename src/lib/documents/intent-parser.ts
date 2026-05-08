// Last-user-message intent parser. Maps a raw user turn to a DocType via
// case-insensitive keyword rules covering EN + BN. Pure function, no LLM,
// no async. Order of RULES matters: longer / more specific phrases come
// first so general ones (e.g. "leave application") don't swallow
// specific ones (e.g. "maternity leave application"). Custom docType is
// never returned here — custom is user-driven, not intent-detected.

import { DOC_CATALOG } from "./catalog";
import type { DocType } from "./types";

interface IntentRule {
  docType: DocType;
  pattern: RegExp;
}

const RULES: IntentRule[] = [
  // Most-specific compound phrases first — a query that mentions both
  // "service certificate" and "resignation" should resolve to the
  // certificate, not the resignation. Likewise "defense reply to show
  // cause" → defense-reply, not show-cause.
  {
    docType: "maternity-leave-application",
    pattern: /maternity|মাতৃত্বকালীন|মাতৃত্ব/i,
  },
  {
    docType: "salary-complaint",
    pattern:
      /salary complaint|unpaid wages?|wage delay|wage complaint|বেতন সংক্রান্ত অভিযোগ|বেতন অভিযোগ|বকেয়া মজুরি|বকেয়া বেতন/i,
  },
  {
    docType: "service-certificate",
    pattern:
      /service certificate|experience certificate|সার্ভিস সার্টিফিকেট|চাকরির প্রত্যয়ন/i,
  },
  {
    docType: "appointment-letter",
    pattern:
      /appointment letter|offer letter|offer of employment|নিয়োগপত্র/i,
  },
  {
    docType: "defense-reply",
    pattern:
      /defen[cs]e reply|reply to show[- ]cause|written reply|defen[cs]e|আত্মপক্ষ সমর্থন|আত্মপক্ষ|লিখিত জবাব/i,
  },
  {
    docType: "show-cause-notice",
    pattern: /show[- ]cause|কারণ দর্শানো/i,
  },
  {
    docType: "leave-application",
    pattern:
      /leave letter|leave application|casual leave|sick leave|annual leave|leave request|ছুটির আবেদন|ছুটি চাই|ছুটি দরকার/i,
  },
  {
    docType: "termination-notice",
    pattern:
      /termination notice|terminat(?:e|ion)|dismiss(?:al)?|sack(?:ed)?|\bfire(?:d)?\b|চাকরিচ্যুতির নোটিশ|চাকরিচ্যুতি|বরখাস্ত/i,
  },
  {
    docType: "resignation-letter",
    pattern: /resign(?:ation)?|\bquit\b|পদত্যাগপত্র|পদত্যাগ/i,
  },
  {
    docType: "grievance-letter",
    pattern:
      /grievance|complain(?:t)? against|complain(?:t)? about.*(?:boss|supervisor|employer|manager|company)|অভিযোগপত্র|অভিযোগ জানা|অভিযোগ করতে/i,
  },
  {
    docType: "domestic-worker-contract",
    pattern: /domestic[- ]worker|গৃহকর্মী চুক্তি|গৃহকর্মী/i,
  },
  {
    docType: "forced-labour-self-audit",
    pattern:
      /forced[- ]labour self[- ]audit|forced labour audit|জোরপূর্বক শ্রম/i,
  },
  {
    docType: "harassment-committee-sop",
    pattern:
      /harassment committee|anti[- ]harassment sop|হয়রানি প্রতিরোধ কমিটি|হয়রানি কমিটি|হয়রানি প্রতিরোধ/i,
  },
  {
    docType: "equal-pay-audit",
    pattern:
      /equal[- ]pay audit|equal pay for equal work|সমান মজুরি নিরীক্ষা|সমান মজুরি/i,
  },
  {
    docType: "pragati-opt-in-notice",
    pattern: /\bpragati\b|প্রগতি/i,
  },
];

export function parseDocIntent(lastUserMessage: string): DocType | null {
  const s = (lastUserMessage ?? "").trim();
  if (!s) return null;
  for (const rule of RULES) {
    if (rule.pattern.test(s)) {
      // Guard: rule must map to a real catalog entry.
      if (DOC_CATALOG[rule.docType]) return rule.docType;
    }
  }
  return null;
}
