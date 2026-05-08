import type { JSONContent } from "@tiptap/core";
import type {
  ResponseSchema,
  ResponseSchemaBodySection,
  ResponseSchemaSheet,
  ResponseSchemaSignature,
  ResponseSchemaTable,
} from "@/lib/documents/response-schema";

// Bidirectional schema ↔ Tiptap editor state mapper. Round-trip must be
// idempotent for every gold fixture: schemaToEditorState →
// editorStateToSchema returns a deep-equal object.
//
// The editor owns a strict subset of ResponseSchema:
//   - title (via TitleBlock)
//   - body_sections[] (via Section nodes containing heading/paragraphs/
//     bulletList/orderedList/inlineTable)
//   - signatures[] (via SignatureBlock)
//   - footer_notes[] (via FooterNote)
//   - sheets[] (via SheetGrid, only when format === "xlsx")
//
// Fields NOT touched by the editor (pass-through from the original
// draft): tier, document_type, language, role_context, format,
// citations, disclaimer, metadata.
//
// DisclaimerBanner is rendered read-only from draft.disclaimer and is
// not consulted on the serialize side — we re-read disclaimer straight
// from the original draft. CitationChip inline nodes reference entries
// in draft.citations by index and do not mutate the citations array.

export function schemaToEditorState(draft: ResponseSchema): JSONContent {
  const content: JSONContent[] = [];

  content.push({
    type: "titleBlock",
    attrs: { text: draft.title },
  });

  if (draft.tier >= 2 && draft.disclaimer) {
    content.push({
      type: "disclaimerBanner",
      attrs: { text: draft.disclaimer },
    });
  }

  for (const section of draft.body_sections ?? []) {
    content.push(bodySectionToNode(section));
  }

  if (draft.format === "xlsx") {
    for (const sheet of draft.sheets ?? []) {
      content.push({
        type: "sheetGrid",
        attrs: {
          name: sheet.name,
          columns: sheet.columns,
          rows: sheet.rows,
        },
      });
    }
  }

  for (const sig of draft.signatures ?? []) {
    content.push({
      type: "signatureBlock",
      attrs: {
        role: sig.role ?? "",
        name: sig.name ?? "",
        designation: sig.designation ?? "",
        date: sig.date ?? "",
      },
    });
  }

  for (const note of draft.footer_notes ?? []) {
    content.push({
      type: "footerNote",
      content: note ? [{ type: "text", text: note }] : [],
    });
  }

  return { type: "doc", content };
}

export function editorStateToSchema(
  doc: JSONContent,
  original: ResponseSchema,
): ResponseSchema {
  let title = original.title;
  const bodySections: ResponseSchemaBodySection[] = [];
  const sheets: ResponseSchemaSheet[] = [];
  const signatures: ResponseSchemaSignature[] = [];
  const footerNotes: string[] = [];

  for (const child of doc.content ?? []) {
    switch (child.type) {
      case "titleBlock": {
        const t = child.attrs?.text;
        if (typeof t === "string") title = t;
        break;
      }
      case "section": {
        bodySections.push(sectionFromNode(child));
        break;
      }
      case "sheetGrid": {
        const attrs = child.attrs ?? {};
        sheets.push({
          name: typeof attrs.name === "string" ? attrs.name : "",
          columns: Array.isArray(attrs.columns) ? [...attrs.columns] : [],
          rows: Array.isArray(attrs.rows)
            ? (attrs.rows as Array<Array<string | number | null>>).map((r) => [
                ...r,
              ])
            : [],
        });
        break;
      }
      case "signatureBlock": {
        const a = child.attrs ?? {};
        signatures.push({
          role: typeof a.role === "string" ? a.role : "",
          name: typeof a.name === "string" ? a.name : "",
          designation:
            typeof a.designation === "string" ? a.designation : "",
          date: typeof a.date === "string" ? a.date : "",
        });
        break;
      }
      case "footerNote": {
        footerNotes.push(plainText(child));
        break;
      }
      // disclaimerBanner: read-only, ignored on serialize; we pass
      // original.disclaimer through untouched below.
    }
  }

  const out: ResponseSchema = {
    ...original,
    title,
    body_sections: bodySections,
    citations: original.citations,
    disclaimer: original.disclaimer,
    metadata: original.metadata,
  };

  // Preserve presence/absence of optional top-level arrays to match
  // the original draft shape exactly.
  if (original.signatures !== undefined) {
    out.signatures = signatures;
  } else if (signatures.length > 0) {
    out.signatures = signatures;
  }

  if (original.footer_notes !== undefined) {
    out.footer_notes = footerNotes;
  } else if (footerNotes.length > 0) {
    out.footer_notes = footerNotes;
  }

  if (original.format === "xlsx" || original.sheets !== undefined) {
    out.sheets = sheets;
  }

  return out;
}

function bodySectionToNode(
  section: ResponseSchemaBodySection,
): JSONContent {
  const children: JSONContent[] = [];
  children.push({
    type: "heading",
    attrs: { level: 2 },
    content: section.heading
      ? [{ type: "text", text: section.heading }]
      : [],
  });

  for (const p of section.paragraphs ?? []) {
    children.push({
      type: "paragraph",
      content: p ? [{ type: "text", text: p }] : [],
    });
  }

  if (section.bullets && section.bullets.length > 0) {
    children.push({
      type: "bulletList",
      content: section.bullets.map((b) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: b ? [{ type: "text", text: b }] : [],
          },
        ],
      })),
    });
  }

  if (section.table) {
    children.push({
      type: "inlineTable",
      attrs: {
        columns: section.table.columns,
        rows: section.table.rows,
      },
    });
  }

  const citationRefs = Array.isArray(section.citation_refs)
    ? section.citation_refs.filter((n): n is number => typeof n === "number")
    : [];

  return {
    type: "section",
    attrs: { locked: false, citation_refs: citationRefs },
    content: children,
  };
}

function sectionFromNode(node: JSONContent): ResponseSchemaBodySection {
  let heading = "";
  const paragraphs: string[] = [];
  const bullets: string[] = [];
  let table: ResponseSchemaTable | undefined;
  const attrs = node.attrs ?? {};
  const citationRefs = Array.isArray(attrs.citation_refs)
    ? (attrs.citation_refs as unknown[]).filter(
        (n): n is number => typeof n === "number",
      )
    : [];

  for (const child of node.content ?? []) {
    if (child.type === "heading") {
      heading = plainText(child);
    } else if (child.type === "paragraph") {
      paragraphs.push(plainText(child));
    } else if (
      child.type === "bulletList" ||
      child.type === "orderedList"
    ) {
      for (const li of child.content ?? []) {
        bullets.push(plainText(li));
      }
    } else if (child.type === "inlineTable") {
      const a = child.attrs ?? {};
      table = {
        columns: Array.isArray(a.columns) ? [...a.columns] : [],
        rows: Array.isArray(a.rows)
          ? (a.rows as Array<Array<string | number | null>>).map((r) => [
              ...r,
            ])
          : [],
      };
    }
  }

  const out: ResponseSchemaBodySection = { heading };
  if (paragraphs.length > 0) out.paragraphs = paragraphs;
  if (bullets.length > 0) out.bullets = bullets;
  if (table) out.table = table;
  if (citationRefs.length > 0) out.citation_refs = citationRefs;
  return out;
}

// Collect plain text from a Tiptap node, recursively. Inline marks
// (bold/italic/underline) and CitationChip inline atoms are dropped
// for round-trip purposes — the schema carries plain strings.
function plainText(node: JSONContent): string {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  let out = "";
  for (const child of node.content ?? []) {
    if (child.type === "citationChip") continue;
    out += plainText(child);
  }
  return out;
}
