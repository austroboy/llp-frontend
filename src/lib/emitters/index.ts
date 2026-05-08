export { emitDocx } from "./docx-emitter";
export { emitPdf, closePdfBrowser } from "./pdf-emitter";
export { emitPptx } from "./pptx-emitter";
export { emitXlsx, XlsxSheetsMissingError } from "./xlsx-emitter";
export { containsBangla, draftHasBangla, FONT_FAMILY_BENGALI } from "./fonts";

export type EmitFormat = "docx" | "pdf" | "pptx" | "xlsx";

export const MIME_BY_FORMAT: Record<EmitFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
