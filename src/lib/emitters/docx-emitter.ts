import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ResponseSchema } from "@/lib/documents/response-schema";
import {
  FONT_FAMILY_BENGALI,
  NOTO_BENGALI_BOLD,
  NOTO_BENGALI_REGULAR,
} from "./fonts";

function run(
  text: string,
  opts: { bold?: boolean; italics?: boolean; size?: number } = {},
): TextRun {
  return new TextRun({
    text,
    font: FONT_FAMILY_BENGALI,
    bold: opts.bold,
    italics: opts.italics,
    size: opts.size,
  });
}

function paragraph(text: string, bold = false): Paragraph {
  return new Paragraph({ children: [run(text, { bold })] });
}

function titleBlock(draft: ResponseSchema): Paragraph[] {
  const blocks: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [run(draft.title, { bold: true, size: 36 })],
    }),
  ];
  return blocks;
}

function disclaimerBlock(text: string): Paragraph {
  return new Paragraph({
    shading: { type: ShadingType.SOLID, color: "FFF8E1", fill: "FFF8E1" },
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "E0A800" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "E0A800" },
      left: { style: BorderStyle.SINGLE, size: 6, color: "E0A800" },
      right: { style: BorderStyle.SINGLE, size: 6, color: "E0A800" },
    },
    spacing: { before: 120, after: 240 },
    children: [run(text, { italics: true })],
  });
}

function tableFor(table: NonNullable<ResponseSchema["body_sections"][number]["table"]>): Table {
  const headerCells = table.columns.map(
    (col) =>
      new TableCell({
        children: [new Paragraph({ children: [run(col, { bold: true })] })],
        shading: { type: ShadingType.SOLID, color: "E5E5E5", fill: "E5E5E5" },
      }),
  );
  const rows: TableRow[] = [new TableRow({ children: headerCells })];
  for (const row of table.rows) {
    rows.push(
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [new Paragraph({ children: [run(String(cell ?? ""))] })],
            }),
        ),
      }),
    );
  }
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function sectionChildren(
  section: ResponseSchema["body_sections"][number],
): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [];
  out.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [run(section.heading, { bold: true, size: 28 })],
    }),
  );
  for (const p of section.paragraphs ?? []) {
    out.push(new Paragraph({ children: [run(p)], spacing: { after: 120 } }));
  }
  for (const b of section.bullets ?? []) {
    out.push(
      new Paragraph({
        bullet: { level: 0 },
        children: [run(b)],
      }),
    );
  }
  if (section.table) out.push(tableFor(section.table));
  return out;
}

function signatureBlock(
  sig: NonNullable<ResponseSchema["signatures"]>[number],
): Paragraph[] {
  const lines: Paragraph[] = [
    new Paragraph({ spacing: { before: 360 }, children: [run(sig.role, { bold: true })] }),
  ];
  if (sig.name) lines.push(paragraph(sig.name));
  if (sig.designation) lines.push(paragraph(sig.designation));
  if (sig.date) lines.push(paragraph(`Date: ${sig.date}`));
  return lines;
}

function citationsBlock(
  citations: ResponseSchema["citations"],
): Array<Paragraph> {
  if (!citations.length) return [];
  const out: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 120 },
      children: [run("Sources", { bold: true, size: 24 })],
    }),
  ];
  citations.forEach((c, i) => {
    out.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          run(`[${i + 1}] ${c.doc_id} §${c.section} — `, { bold: true }),
          run(`"${c.quote}"`, { italics: true }),
        ],
      }),
    );
  });
  return out;
}

export async function emitDocx(draft: ResponseSchema): Promise<Buffer> {
  const tier2OrHigher = draft.tier >= 2 && !!draft.disclaimer;
  const children: Array<Paragraph | Table> = [
    ...(tier2OrHigher ? [disclaimerBlock(draft.disclaimer!)] : []),
    ...titleBlock(draft),
    ...draft.body_sections.flatMap(sectionChildren),
    ...(draft.signatures ?? []).flatMap(signatureBlock),
    ...(draft.tier === 1 ? citationsBlock(draft.citations) : []),
    ...(draft.footer_notes ?? []).map(
      (n) =>
        new Paragraph({
          spacing: { before: 240 },
          children: [run(n, { italics: true, size: 18 })],
        }),
    ),
  ];

  const doc = new Document({
    creator: "LLP Universe",
    title: draft.title,
    fonts: [
      { name: FONT_FAMILY_BENGALI, data: NOTO_BENGALI_REGULAR },
      { name: FONT_FAMILY_BENGALI, data: NOTO_BENGALI_BOLD },
    ],
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc) as Promise<Buffer>;
}
