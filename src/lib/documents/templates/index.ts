// Barrel for document PDF templates.
// Each DocType maps (eventually) to a React-PDF component exported here.

import type { ComponentType } from "react";
import type { DocType } from "../types";
import { TerminationNoticePdf } from "./termination-notice";

export { TerminationNoticePdf } from "./termination-notice";
// Future: export { GrievanceLetterPdf } from "./grievance-letter"; etc.

export const TEMPLATE_REGISTRY: Partial<Record<DocType, ComponentType<any>>> = {
  "termination-notice": TerminationNoticePdf,
};

export function getTemplate(docType: DocType): ComponentType<any> | null {
  return TEMPLATE_REGISTRY[docType] ?? null;
}
