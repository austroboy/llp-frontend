/**
 * Section-aware legal document chunker for Bangladesh Labour Law.
 *
 * Rules:
 * 1. Never split within a section — each chunk = one complete section
 * 2. If a section exceeds max tokens, split at sub-section or paragraph boundaries
 * 3. Each chunk includes: section number, section title, full text
 * 4. Metadata: document ID, chapter, part
 * 5. Exclude: form templates, gazette headers, page numbers, TOC entries
 */

export interface LegalChunk {
  section: string;
  chapter: string;
  content: string;
  sectionNumber: string; // Clean number: "26", "150", "2"
}

const MAX_CHUNK_TOKENS = 1000;
const MIN_CHUNK_LENGTH = 50;

// ── Section detection patterns ─────────────────────────────────────────
const EN_SECTION_PATTERNS = [
  // "26. Termination of employment..." or "26.- Termination..."
  /^(\d+[A-Za-z]?)[\.\s\-]+\s*(.{0,100})/,
  // "Section 26." or "Section 26.-"
  /^(?:Section\s+)(\d+[A-Za-z]?)[\.\s\-]+\s*(.*)/i,
  // "Rule 115." or "Rule 115.-"
  /^(?:Rule\s+)(\d+[A-Za-z]?(?:\(\d+\))?)[\.\s\-]+\s*(.*)/i,
  // Bold markdown: "**26. Termination...**"
  /^\*\*(\d+[A-Za-z]?)[\.\s]+(.+?)\*\*/,
];

const BN_SECTION_PATTERNS = [
  // "ধারা ২৬।" or "ধারা ২৬.-"
  /^ধারা\s+([০-৯]+[ক-ঞ]?)[\।\.\s\-]+\s*(.*)/,
  // "বিধি ১১৫।"
  /^বিধি\s+([০-৯]+[ক-ঞ]?)[\।\.\s\-]+\s*(.*)/,
];

const CHAPTER_PATTERNS = [
  /^(?:CHAPTER|Chapter)\s+([IVXLCDM]+|\d+)[\s\:\-]*(.*)/i,
  /^(?:PART|Part)\s+([IVXLCDM]+|\d+)[\s\:\-]*(.*)/i,
  /^(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth)\s+(?:Chapter|Schedule)/i,
  /^অধ্যায়\s+([০-৯]+)[\s\:\-]*(.*)/,
  /^পর্ব\s+([০-৯]+)[\s\:\-]*(.*)/,
];

// ── Noise detection ────────────────────────────────────────────────────
function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return true;
  // Page numbers
  if (/^\d{1,4}$/.test(trimmed)) return true;
  if (/^page\s+\d+/i.test(trimmed)) return true;
  // Gazette headers
  if (/bangladesh\s+gazette/i.test(trimmed)) return true;
  if (/বাংলাদেশ\s+গেজেট/.test(trimmed)) return true;
  // Running headers
  if (/^Bangladesh (Labour|Labor) (Act|Rules|Gazette)/i.test(trimmed) && trimmed.length < 80) return true;
  // Bare year numbers
  if (/^\d{4}$/.test(trimmed)) return true;
  // Value/Taka lines
  if (/^Value:\s*Taka/i.test(trimmed)) return true;
  return false;
}

function isFormTemplate(content: string): boolean {
  const lines = content.split("\n").filter(l => l.trim().length > 0);
  if (lines.length === 0) return true;
  let formLines = 0;
  for (const line of lines) {
    if (/:\s*[._]{3,}/.test(line) || /:\s*\.{3,}/.test(line)) formLines++;
    if (/Form\s+No\s*\./i.test(line) || /ফরম\s+নং/.test(line)) formLines++;
  }
  return formLines > lines.length * 0.5;
}

function isTocEntry(content: string): boolean {
  const lines = content.split("\n").filter(l => l.trim().length > 0);
  let tocLines = 0;
  for (const line of lines) {
    if (/\.{4,}\s*\d+\s*$/.test(line)) tocLines++;
    const dots = (line.match(/\./g) || []).length;
    if (dots / line.length > 0.4 && line.length > 10) tocLines++;
  }
  return tocLines > lines.length * 0.5;
}

// ── Bengali numeral conversion ─────────────────────────────────────────
function bnToAscii(text: string): string {
  return text.replace(/[০-৯]/g, ch => "০১২৩৪৫৬৭৮৯".indexOf(ch).toString());
}

// ── Main chunker ───────────────────────────────────────────────────────
export function chunkLegalDocument(content: string): LegalChunk[] {
  const lines = content.split("\n");
  const rawChunks: LegalChunk[] = [];
  let currentSection = "Preamble";
  let currentSectionNumber = "0";
  let currentChapter = "";
  let currentContent: string[] = [];

  function flushChunk() {
    // Filter noise lines
    const cleanLines = currentContent.filter(l => !isNoiseLine(l));
    const text = cleanLines.join("\n").trim();

    if (text.length < MIN_CHUNK_LENGTH) return;
    if (isFormTemplate(text)) return;
    if (isTocEntry(text)) return;

    rawChunks.push({
      section: currentSection,
      chapter: currentChapter,
      content: text,
      sectionNumber: currentSectionNumber,
    });
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (isNoiseLine(trimmed) && trimmed.length === 0) {
      currentContent.push(line);
      continue;
    }

    // Check for chapter/part headers
    let isChapter = false;
    for (const pat of CHAPTER_PATTERNS) {
      if (pat.test(trimmed)) {
        flushChunk();
        currentChapter = trimmed.replace(/\*\*/g, "").trim();
        currentSection = currentChapter;
        currentSectionNumber = "0";
        currentContent = [];
        isChapter = true;
        break;
      }
    }
    if (isChapter) continue;

    // Check for section headers (EN)
    let isNewSection = false;
    for (const pat of EN_SECTION_PATTERNS) {
      const match = trimmed.match(pat);
      if (match && !CHAPTER_PATTERNS.some(cp => cp.test(trimmed))) {
        const num = match[1];
        // Validate: section numbers should be 1-999, not random large numbers
        const numVal = parseInt(num, 10);
        if (numVal > 0 && numVal < 1000) {
          flushChunk();
          currentSectionNumber = num;
          currentSection = `Section ${num}`;
          currentContent = [trimmed];
          isNewSection = true;
          break;
        }
      }
    }

    // Check for section headers (BN)
    if (!isNewSection) {
      for (const pat of BN_SECTION_PATTERNS) {
        const match = trimmed.match(pat);
        if (match) {
          const bnNum = match[1];
          const asciiNum = bnToAscii(bnNum);
          const numVal = parseInt(asciiNum, 10);
          if (numVal > 0 && numVal < 1000) {
            flushChunk();
            currentSectionNumber = asciiNum;
            currentSection = `Section ${asciiNum}`;
            currentContent = [trimmed];
            isNewSection = true;
            break;
          }
        }
      }
    }

    if (!isNewSection) {
      currentContent.push(line);
    }
  }
  flushChunk();

  // ── Split oversized chunks at paragraph boundaries ───────────────
  const finalChunks: LegalChunk[] = [];
  for (const chunk of rawChunks) {
    const approxTokens = Math.ceil(chunk.content.length / 4);
    if (approxTokens > MAX_CHUNK_TOKENS * 1.5) {
      const paragraphs = chunk.content.split(/\n\s*\n/);
      let buffer = "";
      let partIndex = 1;
      for (const para of paragraphs) {
        if (buffer.length > 0 && Math.ceil((buffer + "\n\n" + para).length / 4) > MAX_CHUNK_TOKENS) {
          finalChunks.push({
            section: `${chunk.section} (Part ${partIndex})`,
            chapter: chunk.chapter,
            content: buffer.trim(),
            sectionNumber: chunk.sectionNumber,
          });
          partIndex++;
          buffer = para;
        } else {
          buffer = buffer ? buffer + "\n\n" + para : para;
        }
      }
      if (buffer.trim().length >= MIN_CHUNK_LENGTH) {
        finalChunks.push({
          section: partIndex > 1 ? `${chunk.section} (Part ${partIndex})` : chunk.section,
          chapter: chunk.chapter,
          content: buffer.trim(),
          sectionNumber: chunk.sectionNumber,
        });
      }
    } else {
      finalChunks.push(chunk);
    }
  }

  // ── Merge tiny chunks with next ──────────────────────────────────
  const merged: LegalChunk[] = [];
  for (let i = 0; i < finalChunks.length; i++) {
    const chunk = finalChunks[i];
    if (chunk.content.length < MIN_CHUNK_LENGTH * 2 && i + 1 < finalChunks.length) {
      finalChunks[i + 1].content = chunk.content + "\n\n" + finalChunks[i + 1].content;
      if (!finalChunks[i + 1].chapter && chunk.chapter) finalChunks[i + 1].chapter = chunk.chapter;
    } else {
      merged.push(chunk);
    }
  }

  return merged;
}
