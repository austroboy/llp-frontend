import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { createRequire } from "node:module";

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

let validateRequestFn: ValidateFunction | null = null;
let validateStatusFn: ValidateFunction | null = null;

function init(): void {
  if (validateRequestFn && validateStatusFn) return;
  const req = createRequire(import.meta.url);
  const requestSchema = req("./schemas/delegation-request-schema.json");
  const statusSchema = req("./schemas/delegation-status-event-schema.json");
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  validateRequestFn = ajv.compile(requestSchema);
  validateStatusFn = ajv.compile(statusSchema);
}

function toResult(fn: ValidateFunction, obj: unknown): ValidationResult {
  if (fn(obj)) return { ok: true };
  const errors = (fn.errors ?? []).map((e) => {
    const path = e.instancePath || "(root)";
    return `${path} ${e.message ?? "invalid"}`.trim();
  });
  return { ok: false, errors };
}

export function validateDelegationRequest(obj: unknown): ValidationResult {
  init();
  return toResult(validateRequestFn!, obj);
}

export function validateDelegationStatusEvent(obj: unknown): ValidationResult {
  init();
  return toResult(validateStatusFn!, obj);
}

export function assertDelegationStatusEvent(obj: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  const r = validateDelegationStatusEvent(obj);
  if (!r.ok) {
    throw new Error(
      `delegation_status event failed schema validation:\n  ${r.errors.join("\n  ")}`,
    );
  }
}
