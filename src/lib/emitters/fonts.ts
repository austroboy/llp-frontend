import { readFileSync } from "node:fs";
import { join } from "node:path";

const FONTS_DIR = join(process.cwd(), "src", "lib", "emitters", "fonts");

export const NOTO_BENGALI_REGULAR: Buffer = readFileSync(
  join(FONTS_DIR, "NotoSansBengali-Regular.ttf"),
);
export const NOTO_BENGALI_BOLD: Buffer = readFileSync(
  join(FONTS_DIR, "NotoSansBengali-Bold.ttf"),
);

export const NOTO_BENGALI_REGULAR_B64: string =
  NOTO_BENGALI_REGULAR.toString("base64");
export const NOTO_BENGALI_BOLD_B64: string =
  NOTO_BENGALI_BOLD.toString("base64");

export const FONT_FAMILY_BENGALI = "Noto Sans Bengali";

const BENGALI_RANGE = /[\u0980-\u09FF]/;

export function containsBangla(text: string): boolean {
  return BENGALI_RANGE.test(text);
}

export function draftHasBangla(draft: {
  language?: string;
  title?: string;
  body_sections?: Array<{
    heading?: string;
    paragraphs?: string[];
    bullets?: string[];
  }>;
  disclaimer?: string | null;
  footer_notes?: string[];
}): boolean {
  if (draft.language === "bn" || draft.language === "mixed") return true;
  if (draft.title && containsBangla(draft.title)) return true;
  if (draft.disclaimer && containsBangla(draft.disclaimer)) return true;
  for (const note of draft.footer_notes ?? []) {
    if (containsBangla(note)) return true;
  }
  for (const section of draft.body_sections ?? []) {
    if (section.heading && containsBangla(section.heading)) return true;
    for (const p of section.paragraphs ?? []) {
      if (containsBangla(p)) return true;
    }
    for (const b of section.bullets ?? []) {
      if (containsBangla(b)) return true;
    }
  }
  return false;
}
