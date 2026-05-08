import pptxgen from "pptxgenjs";
import type { ResponseSchema } from "@/lib/documents/response-schema";
import { FONT_FAMILY_BENGALI } from "./fonts";

const FALLBACK_FONT = `${FONT_FAMILY_BENGALI}, Calibri`;

export async function emitPptx(draft: ResponseSchema): Promise<Buffer> {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.author = "LLP Universe";
  pres.title = draft.title;

  // Title slide
  const title = pres.addSlide();
  title.addText(draft.title, {
    x: 0.5,
    y: 2.0,
    w: 12,
    h: 1.5,
    fontSize: 36,
    bold: true,
    fontFace: FALLBACK_FONT,
    align: "center",
  });
  if (draft.tier >= 2 && draft.disclaimer) {
    title.addText(draft.disclaimer, {
      x: 0.5,
      y: 5.5,
      w: 12,
      h: 1.5,
      fontSize: 10,
      italic: true,
      fontFace: FALLBACK_FONT,
      color: "C8960A",
    });
  }

  // Section slides
  for (const section of draft.body_sections) {
    const slide = pres.addSlide();
    slide.addText(section.heading, {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.8,
      fontSize: 24,
      bold: true,
      fontFace: FALLBACK_FONT,
    });

    const items: pptxgen.TextProps[] = [];
    for (const p of section.paragraphs ?? []) {
      items.push({ text: p, options: { fontSize: 14, fontFace: FALLBACK_FONT } });
    }
    for (const b of section.bullets ?? []) {
      items.push({
        text: b,
        options: { bullet: true, fontSize: 14, fontFace: FALLBACK_FONT },
      });
    }
    if (items.length) {
      slide.addText(items, {
        x: 0.5,
        y: 1.4,
        w: 12,
        h: 5.5,
        fontFace: FALLBACK_FONT,
      });
    }

    if (section.table) {
      slide.addTable(
        [
          section.table.columns.map((c) => ({
            text: c,
            options: { bold: true, fill: { color: "E5E5E5" } },
          })),
          ...section.table.rows.map((row) =>
            row.map((cell) => ({ text: String(cell ?? "") })),
          ),
        ],
        {
          x: 0.5,
          y: 1.4,
          w: 12,
          fontSize: 12,
          fontFace: FALLBACK_FONT,
          border: { type: "solid", color: "888888", pt: 0.5 },
        },
      );
    }
  }

  // Citations slide (tier-1)
  if (draft.tier === 1 && draft.citations.length) {
    const slide = pres.addSlide();
    slide.addText("Sources", {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.8,
      fontSize: 24,
      bold: true,
      fontFace: FALLBACK_FONT,
    });
    slide.addText(
      draft.citations.map((c, i) => ({
        text: `[${i + 1}] ${c.doc_id} §${c.section} — "${c.quote}"`,
        options: { bullet: true, fontSize: 12, fontFace: FALLBACK_FONT },
      })),
      { x: 0.5, y: 1.4, w: 12, h: 5.5 },
    );
  }

  const buf = (await pres.write({ outputType: "nodebuffer" })) as
    | Buffer
    | ArrayBuffer
    | Uint8Array;
  if (Buffer.isBuffer(buf)) return buf;
  return Buffer.from(buf as ArrayBuffer);
}
