import { getDocumentText } from "@/lib/document-storage";

// ── Re-exports from the DB-backed registry ─────────────────────────
export {
  getRegistry,
  getDocumentById,
  getDocumentByTitle,
  getSupersessionChains,
  getBilingualFlags,
  getTranslationFlags,
  invalidateRegistryCache,
  type DocumentMeta,
  type SupersessionChain,
  type BilingualFlags,
} from "./registry";

import { getDocumentById, getBilingualFlags } from "./registry";
import type { DocumentMeta } from "./registry";

export interface ParsedSection {
  id: string;
  title: string;
  content: string;
  level: "chapter" | "section" | "subsection";
  children?: ParsedSection[];
}

export interface ParsedDocument {
  meta: DocumentMeta;
  sections: ParsedSection[];
  rawText: string;
}

export interface BilingualDocument {
  meta: DocumentMeta;
  en: { sections: ParsedSection[]; rawText: string } | null;
  bn: { sections: ParsedSection[]; rawText: string } | null;
  enTranslated?: boolean;
  bnTranslated?: boolean;
}

/**
 * Normalize a section title into a URL-safe anchor ID.
 * e.g. "CHAPTER I" -> "chapter-i", "Section 28" -> "section-28"
 */
export function toAnchorId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Read and parse an extracted document file into structured sections.
 */
export async function parseDocument(docId: string): Promise<ParsedDocument | null> {
  const meta = await getDocumentById(docId);
  if (!meta) return null;

  // Try EN first, then BN
  const text = await getDocumentText(docId, "en") || await getDocumentText(docId, "bn");
  if (!text) return null;

  const sections = parseTextIntoSections(text, false);
  return { meta, sections, rawText: text };
}

/**
 * Parse a document in both available languages for the bilingual reader.
 */
export async function parseDocumentBilingual(docId: string): Promise<BilingualDocument | null> {
  const meta = await getDocumentById(docId);
  if (!meta) return null;

  const flags = await getBilingualFlags(docId);

  const [en, bn] = await Promise.all([
    flags.hasEn ? parseFromDb(docId, "en") : null,
    flags.hasBn ? parseFromDb(docId, "bn") : null,
  ]);

  // Fallback: if neither worked, try generic parse
  if (!en && !bn) {
    const fallback = await parseDocument(docId);
    if (!fallback) return null;
    return { meta, en: { sections: fallback.sections, rawText: fallback.rawText }, bn: null };
  }

  return {
    meta,
    en,
    bn,
    enTranslated: flags.enTranslated,
    bnTranslated: flags.bnTranslated,
  };
}

/**
 * Flatten a section tree into a linear list for prev/next navigation.
 */
function flattenSections(sections: ParsedSection[]): ParsedSection[] {
  const result: ParsedSection[] = [];
  for (const s of sections) {
    result.push(s);
    if (s.children) {
      result.push(...s.children);
    }
  }
  return result;
}

/**
 * Find a section by anchor ID within a parsed document's sections.
 * Returns the section plus prev/next neighbors for navigation.
 */
export function findSectionById(
  sections: ParsedSection[],
  sectionId: string
): {
  section: ParsedSection;
  chapter: string | null;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
} | null {
  const flat = flattenSections(sections);

  // 1. Exact match
  let idx = flat.findIndex((s) => s.id === sectionId);

  // 2. Prefix match: chunk IDs are long ("section-27-termination-of-employment")
  //    while parser IDs are short ("section-27"). Check if requested ID starts with a parser ID.
  if (idx === -1) {
    idx = flat.findIndex((s) => sectionId.startsWith(s.id + "-") || sectionId === s.id);
  }

  // 3. Reverse prefix: parser ID starts with requested ID
  if (idx === -1) {
    idx = flat.findIndex((s) => s.id.startsWith(sectionId + "-") || s.id.startsWith(sectionId));
  }

  // 4. Section number extraction: "section-27-termination..." -> match "section-27"
  if (idx === -1) {
    const numMatch = sectionId.match(/^((?:section|chapter)-\w+?)(?:-[a-z]|$)/);
    if (numMatch) {
      const prefix = numMatch[1];
      idx = flat.findIndex((s) => s.id === prefix);
    }
  }

  if (idx === -1) return null;

  const matchedId = flat[idx].id;

  // Find parent chapter
  let chapter: string | null = null;
  for (const s of sections) {
    if (s.id === matchedId && s.level === "chapter") {
      chapter = s.title;
      break;
    }
    if (s.children?.some((c) => c.id === matchedId)) {
      chapter = s.title;
      break;
    }
  }

  return {
    section: flat[idx],
    chapter,
    prev: idx > 0 ? { id: flat[idx - 1].id, title: flat[idx - 1].title } : null,
    next: idx < flat.length - 1 ? { id: flat[idx + 1].id, title: flat[idx + 1].title } : null,
  };
}

async function parseFromDb(
  docId: string,
  lang: "en" | "bn"
): Promise<{ sections: ParsedSection[]; rawText: string } | null> {
  const text = await getDocumentText(docId, lang);
  if (!text) return null;
  const sections = parseTextIntoSections(text, false);
  return { sections, rawText: text };
}

/**
 * Parse raw text into hierarchical sections based on patterns like:
 * - CHAPTER I, CHAPTER II, etc.
 * - Section 1., 2., etc.
 * - **Bold headings** in markdown
 * - Numbered items like "1. Short title..."
 */
function parseTextIntoSections(
  text: string,
  isMarkdown: boolean
): ParsedSection[] {
  // Normalize Bengali য়/ড়/ঢ় variants — single-char forms to decomposed (char + nukta)
  // so regex patterns only need one encoding
  const normalized = text
    .replace(/\u09DF/g, "\u09AF\u09BC")  // য় (YYA → YA + NUKTA)
    .replace(/\u09DC/g, "\u09A1\u09BC")  // ড় (RRA → DDA + NUKTA)
    .replace(/\u09DD/g, "\u09A2\u09BC"); // ঢ় (RHA → DDHA + NUKTA)
  const lines = normalized.split("\n");
  const sections: ParsedSection[] = [];
  let currentChapter: ParsedSection | null = null;
  let currentSection: ParsedSection | null = null;
  let contentBuffer: string[] = [];
  const usedIds = new Set<string>();

  /** Generate a unique ID, appending -2, -3, etc. for duplicates. */
  const uniqueId = (base: string): string => {
    let id = base;
    let counter = 2;
    while (usedIds.has(id)) {
      id = `${base}-${counter++}`;
    }
    usedIds.add(id);
    return id;
  };

  const flushContent = () => {
    const content = contentBuffer.join("\n").trim();
    if (currentSection) {
      currentSection.content = content;
    } else if (currentChapter) {
      currentChapter.content = content;
    }
    contentBuffer = [];
  };

  // Bangla digit map for parsing Bangla numerals
  const banglaToAscii: Record<string, string> = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  };
  const convertBanglaNum = (s: string) => s.replace(/[০-৯]/g, (d) => banglaToAscii[d] || d);

  // Bangla ordinal chapter names (প্রথম = 1st, দ্বিতীয় = 2nd, etc.)
  const banglaOrdinals: Record<string, string> = {
    "প্রথম": "I", "দ্বিতীয়": "II", "তৃতীয়": "III", "চতুর্থ": "IV",
    "পঞ্চম": "V", "ষষ্ঠ": "VI", "সপ্তম": "VII", "অষ্টম": "VIII",
    "নবম": "IX", "দশম": "X", "একাদশ": "XI", "দ্বাদশ": "XII",
    "ত্রয়োদশ": "XIII", "প্রয়োদশ": "XIII", "চতুর্দশ": "XIV",
    "পঞ্চদশ": "XV", "ষোড়শ": "XVI", "ষষ্ঠদশ": "XVI", "সপ্তদশ": "XVII",
    "অষ্টাদশ": "XVIII", "ঊনবিংশ": "XIX", "বিংশ": "XX",
    "একবিংশ": "XXI",
  };

  // English chapter patterns
  const chapterPattern = /^(?:\*\*)?CHAPTER\s+([IVXLCDM]+(?:\s*[A-Z])?)\s*[-—:]?\s*(.*?)(?:\*\*)?$/;
  // Title-case "Chapter Four", "Chapter XIV" etc. (standalone line, no trailing sentence)
  const englishWordOrdinals: Record<string, string> = {
    "one": "I", "two": "II", "three": "III", "four": "IV", "five": "V",
    "six": "VI", "seven": "VII", "eight": "VIII", "nine": "IX", "ten": "X",
    "eleven": "XI", "twelve": "XII", "thirteen": "XIII", "fourteen": "XIV",
    "fifteen": "XV", "sixteen": "XVI", "seventeen": "XVII", "eighteen": "XVIII",
    "nineteen": "XIX", "twenty": "XX", "twenty-one": "XXI",
  };
  const chapterWordPattern = /^Chapter\s+([A-Z][a-z]+(?:-[A-Z][a-z]+)?|[IVXLCDM]+(?:\s*[A-Z])?)\s*$/i;
  // Bangla chapter patterns — "প্রথম অধ্যায়" or markdown "## প্রথম অধ্যায়"
  const banglaChapterPattern = /^(?:#{1,4}\s+)?((?:প্রথম|দ্বিতীয়|তৃতীয়|চতুর্থ|পঞ্চম|ষষ্ঠ|সপ্তম|অষ্টম|নবম|দশম|একাদশ|দ্বাদশ|ত্রয়োদশ|প্রয়োদশ|চতুর্দশ|পঞ্চদশ|ষোড়শ|ষষ্ঠদশ|সপ্তদশ|অষ্টাদশ|ঊনবিংশ|বিংশ|একবিংশ)\s+অধ্যায়)\s*$/;
  const banglaChapterWithTitlePattern = /^(?:#{1,4}\s+)?((?:প্রথম|দ্বিতীয়|তৃতীয়|চতুর্থ|পঞ্চম|ষষ্ঠ|সপ্তম|অষ্টম|নবম|দশম|একাদশ|দ্বাদশ|ত্রয়োদশ|প্রয়োদশ|চতুর্দশ|পঞ্চদশ|ষোড়শ|ষষ্ঠদশ|সপ্তদশ|অষ্টাদশ|ঊনবিংশ|বিংশ|একবিংশ)\s+(?:অধ্যায়|পরিচ্ছেদ))\s*[-—:]?\s*(.*)$/;
  // Markdown heading as chapter (## or # level)
  const mdChapterPattern = /^#{1,2}\s+(?:CHAPTER|Part)\s+([IVXLCDM]+(?:\s*[A-Z])?)\s*[-—:]?\s*(.*?)$/i;

  // English section patterns (supports letter suffixes like 3A, 263A)
  const sectionPattern = /^(?:\*\*)?(\d+[A-Z]?)\.\s+(.+?)(?:\*\*)?$/;
  const sectionAltPattern = /^(?:\*\*)?(?:Section|ধারা)\s+(\d+[A-Za-z]*)\s*[.:-]\s*(.*?)(?:\*\*)?$/i;
  const mdHeadingPattern = /^\*\*(\d+[A-Z]?)\.\s+(.+?)\*\*$/;
  const amendmentPattern = /^(?:\*\*)?(\d+[A-Z]?)\.\s+(Amendment\s+of\s+.+?)(?:\*\*)?$/i;

  // Bangla section patterns — "১।" or "১।  শিরোনাম ও প্রবর্তন।—"
  // Also handles markdown heading sections: "### ১। শিরোনাম"
  const banglaSectionPattern = /^(?:#{1,5}\s+)?([০-৯]+)[।\.]\s+(.+?)$/;
  // Bangla ধারা-prefixed section pattern — handles:
  //   "ধারা ২৪। শাস্তি প্রদানের পদ্ধতি।— (১) ..."
  //   "ধারা ৪৷" (definition, no title)
  //   "ধারা ৩ক। ঠিকাদারি সংস্থার নিবন্ধন।—"
  const banglaDharaPattern = /^(?:#{1,5}\s+)?ধারা\s+([০-৯]+[ক-হ]?)\s*[।\.৷]/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      contentBuffer.push("");
      continue;
    }

    // Skip gazette headers/footers and image references
    if (trimmed.match(/^!\[.*\]\(.*\)$/) || trimmed.match(/^বাংলাদেশ গেজেট,/)) {
      contentBuffer.push(line);
      continue;
    }

    // Check for English chapter heading
    const chapterMatch = trimmed.match(chapterPattern) || trimmed.match(mdChapterPattern);
    const chapterWordMatch = !chapterMatch ? trimmed.match(chapterWordPattern) : null;
    if (chapterMatch || chapterWordMatch) {
      flushContent();
      let chapterNum: string;
      let chapterTitle: string;
      if (chapterWordMatch) {
        // "Chapter Four" → convert word to Roman numeral
        const word = chapterWordMatch[1].toLowerCase();
        chapterNum = englishWordOrdinals[word] || chapterWordMatch[1];
        chapterTitle = "";
      } else {
        chapterNum = chapterMatch![1];
        chapterTitle = chapterMatch![2]?.trim() || "";
      }
      const title = `CHAPTER ${chapterNum}${chapterTitle ? " — " + chapterTitle : ""}`;
      currentChapter = {
        id: uniqueId(toAnchorId(`chapter-${chapterNum}`)),
        title,
        content: "",
        level: "chapter",
        children: [],
      };
      currentSection = null;
      sections.push(currentChapter);
      continue;
    }

    // Check for Bangla chapter heading
    const banglaChMatch = trimmed.match(banglaChapterWithTitlePattern) || trimmed.match(banglaChapterPattern);
    if (banglaChMatch) {
      flushContent();
      const banglaName = banglaChMatch[1];
      const chapterTitle = banglaChMatch[2]?.trim() || "";
      // Extract the ordinal word to map to roman numeral
      const ordinalWord = Object.keys(banglaOrdinals).find((k) => banglaName.includes(k));
      const romanNum = ordinalWord ? banglaOrdinals[ordinalWord] : "";
      const title = chapterTitle
        ? `${banglaName} — ${chapterTitle}`
        : banglaName;
      currentChapter = {
        id: uniqueId(toAnchorId(`chapter-${romanNum || banglaName}`)),
        title,
        content: "",
        level: "chapter",
        children: [],
      };
      currentSection = null;
      sections.push(currentChapter);
      // Check if next line is a subtitle (### heading)
      continue;
    }

    // Check for English section heading (various patterns)
    const secMatch =
      trimmed.match(amendmentPattern) ||
      trimmed.match(sectionAltPattern) ||
      trimmed.match(mdHeadingPattern) ||
      trimmed.match(sectionPattern);

    if (secMatch && trimmed.length < 500) {
      flushContent();
      const secNum = secMatch[1];
      const secTitle = secMatch[2]?.trim().replace(/\*\*$/, "") || "";
      const title = `Section ${secNum}. ${secTitle}`;
      currentSection = {
        id: uniqueId(toAnchorId(`section-${secNum}`)),
        title,
        content: "",
        level: "section",
      };
      if (currentChapter && currentChapter.children) {
        currentChapter.children.push(currentSection);
      } else {
        sections.push(currentSection);
      }
      continue;
    }

    // Check for Bangla ধারা-prefixed section heading (e.g. "ধারা ২৪। শাস্তি প্রদানের পদ্ধতি।—")
    const banglaDharaMatch = trimmed.match(banglaDharaPattern);
    if (banglaDharaMatch) {
      flushContent();
      const banglaNum = banglaDharaMatch[1];
      const asciiNum = convertBanglaNum(banglaNum);
      // Extract text after "ধারা X।" — split title from inline content
      const restOfLine = trimmed.slice(banglaDharaMatch[0].length).trim();
      let secTitle = restOfLine;
      let initialContent = "";
      // Title ends at "।—" or "।-" or "—" separator
      const titleSep = restOfLine.match(/^(.+?)[।\.]\s*[—\-]/);
      if (titleSep) {
        secTitle = titleSep[1].trim();
        initialContent = restOfLine.slice(titleSep[0].length).trim();
      } else if (restOfLine.includes("—")) {
        const dashIdx = restOfLine.indexOf("—");
        secTitle = restOfLine.slice(0, dashIdx).trim();
        initialContent = restOfLine.slice(dashIdx + 1).trim();
      }
      const title = secTitle
        ? `ধারা ${banglaNum}। ${secTitle}`
        : `ধারা ${banglaNum}`;
      currentSection = {
        id: uniqueId(toAnchorId(`section-${asciiNum}`)),
        title,
        content: "",
        level: "section",
      };
      if (initialContent) {
        contentBuffer.push(initialContent);
      }
      if (currentChapter && currentChapter.children) {
        currentChapter.children.push(currentSection);
      } else {
        sections.push(currentSection);
      }
      continue;
    }

    // Check for Bangla section heading without ধারা prefix (e.g. "### ১। শিরোনাম")
    const banglaSecMatch = trimmed.match(banglaSectionPattern);
    if (banglaSecMatch && trimmed.length < 600) {
      const banglaNum = banglaSecMatch[1];
      const asciiNum = convertBanglaNum(banglaNum);
      const secTitle = banglaSecMatch[2]?.trim().replace(/\*\*$/, "") || "";
      // Skip gazette page numbers (e.g. "৭৩১৫" with no title text)
      if (secTitle.length > 2) {
        flushContent();
        const title = `ধারা ${banglaNum}। ${secTitle}`;
        currentSection = {
          id: uniqueId(toAnchorId(`section-${asciiNum}`)),
          title,
          content: "",
          level: "section",
        };
        if (currentChapter && currentChapter.children) {
          currentChapter.children.push(currentSection);
        } else {
          sections.push(currentSection);
        }
        continue;
      }
    }

    contentBuffer.push(line);
  }

  // Flush remaining content
  flushContent();

  // If no sections were parsed, create a single section with all content
  if (sections.length === 0) {
    sections.push({
      id: "full-text",
      title: "Full Text",
      content: text,
      level: "chapter",
    });
  }

  return sections;
}
