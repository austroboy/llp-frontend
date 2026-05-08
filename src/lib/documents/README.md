# Document Generation Module (Post-Chat Actions)

MVP backend for generating Bangladesh-labour-law legal documents on demand after a chat answer. Feature spec: `.claude.memory/project_post_chat_actions.md`.

## Status

**Backend complete. UI deferred to next session.**

| Layer | File | Status |
|---|---|---|
| Types | `types.ts` | ✅ |
| Catalog (15 doc types) | `catalog.ts` | ✅ |
| Action detector | `action-detector.ts` | ✅ |
| Input schema (5 types fully, 10 stubbed) | `input-schema.ts` | ✅ |
| Generator (Gemini 2.5 Flash) | `generator.ts` | ✅ |
| API route | `../../app/api/documents/generate/route.ts` | ✅ |
| PDF template (termination-notice) | `templates/termination-notice.tsx` | ✅ |
| Template registry | `templates/index.ts` | ✅ |
| Action buttons UI | `src/components/chat/document-actions.tsx` | ⏳ deferred |
| Builder modal | `src/components/chat/document-builder-sheet.tsx` | ⏳ deferred |

## Architecture

```
Chat answer returned with citations[]
  ↓
[frontend] detectDocActions({ citations, perspective, tier })
  → list of AvailableDocAction[]
  → render buttons below chat message
  ↓
User clicks [Generate Termination Notice]
  ↓
[frontend] open DocumentBuilderSheet
  → fetch DOC_INPUT_SCHEMA["termination-notice"] → render form
  ↓
User fills form, clicks [Generate]
  ↓
[frontend] POST /api/documents/generate
  { docType, userInputs, citedSections, perspective, language, tier, chatQuery, chatAnswer }
  ↓
[server] route.ts validates input + tier
  ↓
[server] generateDocument() → Gemini 2.5 Flash → draft text
  ↓
Response: { draftText, sectionCitations, warnings, tokensUsed }
  ↓
[frontend] render in modal preview + PDF button
  ↓
PDF: <TerminationNoticePdf draftText=... sectionCitations=... userInputs=... />
  → pdf() from @react-pdf/renderer → blob → download
```

## Import path note

The existing file `src/lib/documents.ts` (registry for Supabase documents) conflicts with this directory's `index.ts` barrel. TypeScript/Next resolves `@/lib/documents` to the `.ts` file preferentially. To avoid ambiguity, import from sub-paths:

```ts
import { DOC_CATALOG } from "@/lib/documents/catalog";
import { generateDocument } from "@/lib/documents/generator";
import { detectDocActions } from "@/lib/documents/action-detector";
import { DOC_INPUT_SCHEMA, getRequiredFields } from "@/lib/documents/input-schema";
import type { DocType, Perspective, Language, Tier } from "@/lib/documents/types";
import { getTemplate, TEMPLATE_REGISTRY } from "@/lib/documents/templates";
```

A future cleanup could rename the old `documents.ts` to `document-registry.ts` and consolidate exports through this barrel.

## Tier gating

| Tier | Access |
|---|---|
| `free_guest`, `free_subscribed` | 403 with upgrade CTA — document generation is a Mini+ feature |
| `mini` | Allowed (TODO: enforce 5/day rate limit) |
| `max` | Unlimited |

## Doc types (15 total)

Legacy (from spec):
- `termination-notice` (employer) — §26, §20
- `grievance-letter` (worker) — §33
- `show-cause-notice` (employer) — §23, §24
- `defense-reply` (worker) — §23, §24
- `resignation-letter` (worker) — §27
- `leave-application` (worker) — §§115-117
- `salary-complaint` (worker) — §§120-125
- `maternity-leave-application` (worker) — §§45-47
- `appointment-letter` (employer) — §5
- `service-certificate` (worker+employer) — §31

New in 2026 (DOC-011):
- `domestic-worker-contract` — §2(9b), §307A, §307B
- `forced-labour-self-audit` — §2(12a), §345C
- `harassment-committee-sop` — §332, §332A
- `equal-pay-audit` — §345, §345B
- `pragati-opt-in-notice` — §264

## Next steps (for UI session)

1. Build `DocumentActions` React component to render action buttons below `ChatMessage`.
2. Build `DocumentBuilderSheet` slide-over with form, preview, PDF download.
3. Wire `perspective` detection from existing intent classifier.
4. Wire rate-limit enforcement (Convex store per-user doc-gen count).
5. Add save-draft feature (Convex `generatedDocuments` table).
6. Build remaining 14 PDF templates (1 per doc type, ~300 lines each).
