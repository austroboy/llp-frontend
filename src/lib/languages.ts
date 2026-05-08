export interface ChatLanguage {
  code: string;
  label: string;
  nativeName: string;
  flag: string;
  geminiName: string;
  rtl?: boolean;
}

export const CHAT_LANGUAGES: readonly ChatLanguage[] = [
  { code: "en", label: "English",  nativeName: "English",          flag: "/flags/en.svg", geminiName: "English" },
  { code: "bn", label: "Bangla",   nativeName: "বাংলা",             flag: "/flags/bn.svg", geminiName: "Bangla (বাংলা)" },
  { code: "hi", label: "Hindi",    nativeName: "हिन्दी",            flag: "/flags/hi.svg", geminiName: "Hindi (हिन्दी)" },
  { code: "zh", label: "Chinese",  nativeName: "中文",              flag: "/flags/zh.svg", geminiName: "Chinese (中文)" },
  { code: "ko", label: "Korean",   nativeName: "한국어",             flag: "/flags/ko.svg", geminiName: "Korean (한국어)" },
  { code: "ja", label: "Japanese", nativeName: "日本語",             flag: "/flags/ja.svg", geminiName: "Japanese (日本語)" },
  { code: "ar", label: "Arabic",   nativeName: "العربية",           flag: "/flags/ar.svg", geminiName: "Arabic (العربية)",  rtl: true },
  { code: "ur", label: "Urdu",     nativeName: "اردو",              flag: "/flags/ur.svg", geminiName: "Urdu (اردو)",       rtl: true },
  { code: "ms", label: "Malay",    nativeName: "Bahasa Melayu",    flag: "/flags/ms.svg", geminiName: "Malay (Bahasa Melayu)" },
] as const;

export const DEFAULT_CHAT_LANGUAGE = "en";

export const CHAT_LANGUAGE_CODES = CHAT_LANGUAGES.map((l) => l.code);

export function getLanguage(code: string | null | undefined): ChatLanguage {
  if (!code) return CHAT_LANGUAGES[0];
  return CHAT_LANGUAGES.find((l) => l.code === code) ?? CHAT_LANGUAGES[0];
}

export function isSupportedLanguage(code: string | null | undefined): boolean {
  if (!code) return false;
  return CHAT_LANGUAGE_CODES.includes(code);
}

/**
 * Short UI labels used by chat-surface components (Summarize card, source
 * toggle, etc.) that need their chrome text to match the chat language.
 * Keys map 1:1 to CHAT_LANGUAGES codes. Missing entries fall back to
 * English — keeping the app usable even if a translation is forgotten.
 */
export interface ChatLabels {
  summarizeIdle: string;
  summarizeLoading: string;
  summaryHeading: string;
  exampleHeading: string;
  basedOnLabel: string;
  summaryUnavailable: string;
  viewOriginalEnglish: string;
  sourceEnglish: string;
}

const EN_LABELS: ChatLabels = {
  summarizeIdle: "Summarize",
  summarizeLoading: "Summarizing...",
  summaryHeading: "Summary",
  exampleHeading: "Example scenario",
  basedOnLabel: "Based on:",
  summaryUnavailable: "Summary unavailable — try again later.",
  viewOriginalEnglish: "View original English",
  sourceEnglish: "Source · English",
};

export const CHAT_LABELS: Record<string, ChatLabels> = {
  en: EN_LABELS,
  bn: {
    summarizeIdle: "সংক্ষেপ ও উদাহরণ",
    summarizeLoading: "সংক্ষেপ করছি...",
    summaryHeading: "সারাংশ",
    exampleHeading: "উদাহরণ পরিস্থিতি",
    basedOnLabel: "ভিত্তি:",
    summaryUnavailable: "সংক্ষেপ পাওয়া যায়নি—পরে আবার চেষ্টা করুন।",
    viewOriginalEnglish: "ইংরেজি মূল দেখুন",
    sourceEnglish: "উৎস · ইংরেজি",
  },
  hi: {
    summarizeIdle: "सारांश",
    summarizeLoading: "सारांश बना रहा हूँ...",
    summaryHeading: "सारांश",
    exampleHeading: "उदाहरण परिदृश्य",
    basedOnLabel: "आधार:",
    summaryUnavailable: "सारांश उपलब्ध नहीं — बाद में पुनः प्रयास करें।",
    viewOriginalEnglish: "मूल अंग्रेज़ी देखें",
    sourceEnglish: "स्रोत · अंग्रेज़ी",
  },
  zh: {
    summarizeIdle: "摘要",
    summarizeLoading: "正在总结...",
    summaryHeading: "摘要",
    exampleHeading: "示例情景",
    basedOnLabel: "依据:",
    summaryUnavailable: "摘要暂不可用,请稍后重试。",
    viewOriginalEnglish: "查看英文原文",
    sourceEnglish: "来源 · 英文",
  },
  ko: {
    summarizeIdle: "요약",
    summarizeLoading: "요약하는 중...",
    summaryHeading: "요약",
    exampleHeading: "예시 시나리오",
    basedOnLabel: "근거:",
    summaryUnavailable: "요약을 불러올 수 없습니다. 잠시 후 다시 시도하세요.",
    viewOriginalEnglish: "영문 원문 보기",
    sourceEnglish: "출처 · 영어",
  },
  ja: {
    summarizeIdle: "要約",
    summarizeLoading: "要約中...",
    summaryHeading: "要約",
    exampleHeading: "例示シナリオ",
    basedOnLabel: "根拠:",
    summaryUnavailable: "要約を取得できません。後でもう一度お試しください。",
    viewOriginalEnglish: "原文(英語)を表示",
    sourceEnglish: "出典 · 英語",
  },
  ar: {
    summarizeIdle: "تلخيص",
    summarizeLoading: "جارٍ التلخيص...",
    summaryHeading: "الملخص",
    exampleHeading: "سيناريو توضيحي",
    basedOnLabel: "بناءً على:",
    summaryUnavailable: "الملخص غير متاح — حاول مرة أخرى لاحقًا.",
    viewOriginalEnglish: "عرض النص الإنجليزي الأصلي",
    sourceEnglish: "المصدر · الإنجليزية",
  },
  ur: {
    summarizeIdle: "خلاصہ",
    summarizeLoading: "خلاصہ بنایا جا رہا ہے...",
    summaryHeading: "خلاصہ",
    exampleHeading: "مثالی منظرنامہ",
    basedOnLabel: "بنیاد:",
    summaryUnavailable: "خلاصہ دستیاب نہیں — بعد میں دوبارہ کوشش کریں۔",
    viewOriginalEnglish: "اصل انگریزی دیکھیں",
    sourceEnglish: "ماخذ · انگریزی",
  },
  ms: {
    summarizeIdle: "Rumusan",
    summarizeLoading: "Sedang merumuskan...",
    summaryHeading: "Rumusan",
    exampleHeading: "Senario Contoh",
    basedOnLabel: "Berdasarkan:",
    summaryUnavailable: "Rumusan tidak tersedia — cuba lagi kemudian.",
    viewOriginalEnglish: "Lihat Bahasa Inggeris asal",
    sourceEnglish: "Sumber · Bahasa Inggeris",
  },
};

export function getLabels(code: string | null | undefined): ChatLabels {
  if (!code || !CHAT_LABELS[code]) return EN_LABELS;
  return CHAT_LABELS[code];
}
