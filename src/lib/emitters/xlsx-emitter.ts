import ExcelJS from "exceljs";
import type { ResponseSchema } from "@/lib/documents/response-schema";
import { FONT_FAMILY_BENGALI } from "./fonts";

export class XlsxSheetsMissingError extends Error {
  constructor() {
    super("xlsx_emit_requires_sheets");
    this.name = "XlsxSheetsMissingError";
  }
}

export async function emitXlsx(draft: ResponseSchema): Promise<Buffer> {
  if (!draft.sheets?.length) throw new XlsxSheetsMissingError();

  const wb = new ExcelJS.Workbook();
  wb.creator = "LLP Universe";
  wb.created = new Date();
  wb.title = draft.title;

  for (const sheet of draft.sheets) {
    const ws = wb.addWorksheet(sheet.name);
    ws.columns = sheet.columns.map((name) => ({
      header: name,
      key: name,
      width: 22,
    }));
    for (const row of sheet.rows) {
      // Defense in depth: column-type enforcement runs client-side; emitter
      // trusts but writes cells exactly as received without coercion.
      ws.addRow(row);
    }
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, name: FONT_FAMILY_BENGALI };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E5E5" },
    };
  }

  if (draft.tier >= 2 && draft.disclaimer && wb.worksheets[0]) {
    wb.worksheets[0].getCell("A1").note = draft.disclaimer;
  }

  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr as ArrayBuffer);
}
