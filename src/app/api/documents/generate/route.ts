import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { writeAuditLog } from "@/lib/audit/log-writer";
import { DOC_CATALOG } from "@/lib/documents/catalog";
import {
  DOC_INPUT_SCHEMA,
  getRequiredFields,
} from "@/lib/documents/input-schema";
import { generateDocument } from "@/lib/documents/generator";
import type { DocType, Language, Perspective, Tier } from "@/lib/documents/types";
import { resolveTier, type ClerkTierMetadata } from "@/lib/ai/framework-types";

// ─────────────────────────────────────────────────────────────────────
// Post-chat document generation endpoint.
//
// Sits between the chat UI (doc action button + modal) and the AI
// generator module. Validates input, enforces tier gating, calls the
// generator, and writes an audit log row.
//
// NOTE: `@/lib/documents` (the bare barrel) resolves to src/lib/documents.ts,
// which is the legacy registry re-export. To reach the doc-gen subsystem,
// we import from the explicit sub-module paths (catalog/input-schema/
// generator/types). This avoids clashing with the registry exports.
// ─────────────────────────────────────────────────────────────────────

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const ALLOWED_PERSPECTIVES: ReadonlyArray<Perspective> = [
  "employer",
  "worker",
  "hr",
  "neutral",
];

function isPerspective(v: unknown): v is Perspective {
  return (
    typeof v === "string" &&
    (ALLOWED_PERSPECTIVES as readonly string[]).includes(v)
  );
}

const ALLOWED_LANGUAGES: ReadonlyArray<Language> = ["en", "bn"];

function isLanguage(v: unknown): v is Language {
  return (
    typeof v === "string" &&
    (ALLOWED_LANGUAGES as readonly string[]).includes(v)
  );
}

// ── Request body shape (pre-validation) ──────────────────────────────
interface RawBody {
  docType?: unknown;
  userInputs?: unknown;
  citedSections?: unknown;
  perspective?: unknown;
  language?: unknown;
  chatQuery?: unknown;
  chatAnswer?: unknown;
}

interface CitedSectionInput {
  section: string;
  content: string;
  document_id: string;
  document_title: string;
}

function isCitedSection(v: unknown): v is CitedSectionInput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.section === "string" &&
    typeof o.content === "string" &&
    typeof o.document_id === "string" &&
    typeof o.document_title === "string"
  );
}

function isStringRecord(v: unknown): v is Record<string, string> {
  if (!v || typeof v !== "object") return false;
  for (const val of Object.values(v as Record<string, unknown>)) {
    if (typeof val !== "string") return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse body ──────────────────────────────────────────────────
  let body: RawBody;
  try {
    body = (await request.json()) as RawBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    docType,
    userInputs,
    citedSections,
    perspective,
    language,
    chatQuery,
    chatAnswer,
  } = body;

  // ── 3. Validate docType ────────────────────────────────────────────
  if (typeof docType !== "string" || !(docType in DOC_CATALOG)) {
    return NextResponse.json(
      { error: `Unknown docType: ${String(docType)}` },
      { status: 400 }
    );
  }
  const typedDocType = docType as DocType;
  const meta = DOC_CATALOG[typedDocType];

  // ── 4. Validate perspective ────────────────────────────────────────
  if (!isPerspective(perspective)) {
    return NextResponse.json(
      { error: "perspective must be employer|worker|hr|neutral" },
      { status: 400 }
    );
  }
  // Must be allowed by the doc's catalog entry (or the doc is neutral).
  const perspectiveAllowed =
    meta.perspective.includes(perspective) ||
    meta.perspective.includes("neutral");
  if (!perspectiveAllowed) {
    return NextResponse.json(
      {
        error: `Perspective "${perspective}" not supported for docType "${typedDocType}". Allowed: ${meta.perspective.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  // ── 5. Validate language ───────────────────────────────────────────
  if (!isLanguage(language)) {
    return NextResponse.json(
      { error: "language must be 'en' or 'bn'" },
      { status: 400 }
    );
  }

  // ── 6. Validate citedSections ──────────────────────────────────────
  if (!Array.isArray(citedSections) || citedSections.length === 0) {
    return NextResponse.json(
      { error: "citedSections must be a non-empty array" },
      { status: 400 }
    );
  }
  if (!citedSections.every(isCitedSection)) {
    return NextResponse.json(
      {
        error:
          "each citedSection must have {section, content, document_id, document_title}",
      },
      { status: 400 }
    );
  }
  const typedCitedSections: CitedSectionInput[] = citedSections;

  // ── 7. Validate userInputs ─────────────────────────────────────────
  if (!isStringRecord(userInputs)) {
    return NextResponse.json(
      { error: "userInputs must be an object of string→string" },
      { status: 400 }
    );
  }
  const requiredFields = getRequiredFields(typedDocType);
  // Only enforce when the doc has a schema defined (stub docs have []).
  if (requiredFields.length > 0 && DOC_INPUT_SCHEMA[typedDocType].length > 0) {
    const missing = requiredFields.filter(
      (f) => !userInputs[f] || userInputs[f].trim() === ""
    );
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required fields: ${missing.join(", ")}`,
          missingFields: missing,
        },
        { status: 400 }
      );
    }
  }

  // ── 8. Tier gating ─────────────────────────────────────────────────
  const metadata = user.publicMetadata as ClerkTierMetadata | undefined;
  const tier: Tier = metadata?.tier ? resolveTier(metadata) : "free_subscribed";
  if (tier === "free_guest" || tier === "free_subscribed") {
    return NextResponse.json(
      {
        error: "Document generation requires Mini subscription or higher",
        upgradeUrl: "/pricing",
      },
      { status: 403 }
    );
  }
  // TODO: enforce 5/day rate limit for "mini" tier via Convex counter.
  // For now we pass through and rely on client-side limit + audit log.

  // ── 9. Optional chatQuery / chatAnswer ─────────────────────────────
  const typedChatQuery =
    typeof chatQuery === "string" ? chatQuery : undefined;
  const typedChatAnswer =
    typeof chatAnswer === "string" ? chatAnswer : undefined;

  // ── 10. Generate ───────────────────────────────────────────────────
  const startTime = Date.now();
  const generatedAt = new Date().toISOString();
  const auditDocId = `${typedDocType}:${generatedAt}`;

  try {
    const result = await generateDocument({
      docType: typedDocType,
      userInputs,
      citedSections: typedCitedSections,
      perspective,
      language,
      chatQuery: typedChatQuery,
      chatAnswer: typedChatAnswer,
    });

    const duration = Date.now() - startTime;

    writeAuditLog({
      operation: "generate-document",
      document_id: auditDocId,
      document_title: meta.label,
      language,
      user_id: user.id,
      user_email: user.emailAddresses?.[0]?.emailAddress,
      result: "success",
      result_message: `Generated ${typedDocType} (${result.draftText.length} chars, ${result.sectionCitations.length} citations, ${result.warnings.length} warnings)`,
      duration_ms: duration,
      tokens: result.tokensUsed
        ? {
            "gemini-2.5-flash": {
              input: result.tokensUsed.in,
              output: result.tokensUsed.out,
            },
          }
        : undefined,
    }).catch((err) => console.error("audit log (success) failed:", err));

    return NextResponse.json({
      draftText: result.draftText,
      sectionCitations: result.sectionCitations,
      warnings: result.warnings,
      docType: typedDocType,
      language,
      generatedAt,
      tokensUsed: result.tokensUsed ?? { in: 0, out: 0 },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Generation failed";
    const duration = Date.now() - startTime;

    writeAuditLog({
      operation: "generate-document",
      document_id: auditDocId,
      document_title: meta.label,
      language,
      user_id: user.id,
      user_email: user.emailAddresses?.[0]?.emailAddress,
      result: "error",
      result_message: message,
      duration_ms: duration,
    }).catch((writeErr) =>
      console.error("audit log (error) failed:", writeErr)
    );

    return NextResponse.json(
      { error: "Generation failed", details: message },
      { status: 502 }
    );
  }
}
