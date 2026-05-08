// Barrel — re-exports the public surface of the document-gen subsystem.

export { DOC_CATALOG } from "./catalog";
export {
  detectDocActions,
  normalizeSection,
} from "./action-detector";
export { parseDocIntent } from "./intent-parser";
export {
  DOC_INPUT_SCHEMA,
  getRequiredFields,
} from "./input-schema";
export type { InputField } from "./input-schema";
export {
  buildPrompt,
  generateDocument,
} from "./generator";
export type {
  BuildPromptParams,
  CitedSection,
  GenerateDocumentParams,
  GenerateDocumentResult,
} from "./generator";
export type {
  AvailableDocAction,
  Citation,
  DocMetadata,
  DocType,
  Language,
  Perspective,
  Tier,
} from "./types";
export { isResponseSchemaLike } from "./response-schema";
export type {
  ResponseSchema,
  ResponseSchemaBodySection,
  ResponseSchemaCitation,
  ResponseSchemaFormat,
  ResponseSchemaLanguage,
  ResponseSchemaMetadata,
  ResponseSchemaRoleContext,
  ResponseSchemaSheet,
  ResponseSchemaSignature,
  ResponseSchemaTable,
  ResponseSchemaTier,
} from "./response-schema";
