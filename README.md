# Labor Law Partner — Universe Platform

AI-powered Bangladesh labour-law search, compliance, and HR-services
platform. Bilingual (English / Bangla) RAG over the Bangladesh Labour
Act 2006 and its amendments, with admin tooling, headhunting, expert
marketplace, CV builder, and content modules.

## About

Labor Law Partner (LLP) is founded by Tanbhir Siddiki. The Universe
platform is being built and maintained by Abs Rasel for LLP. See
[`LICENSE`](./LICENSE) for usage terms.

## Stack

- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4
- **Backend:** Vercel Functions (serverless), Convex (real-time backend)
- **Database:** Supabase (Postgres + pgvector for retrieval)
- **Auth:** Clerk
- **AI:** Gemini 2.5 Flash (RAG + chat); OpenRouter, Anthropic, Mistral, OpenAI (auxiliary)
- **Rate limiting:** Upstash Redis
- **Analytics:** PostHog
- **Email:** AWS SES
- **Editor:** TipTap
- **PDF:** React-PDF + headless Chromium for server-side rendering

## Setup

```sh
pnpm install
cp .env.example .env.local   # fill in values from your providers
pnpm dev                      # http://localhost:3001
```

Convex schema is regenerated from `convex/schema.ts` on first run.
Supabase migrations live in your Supabase project dashboard.

## Build

```sh
pnpm build
pnpm start
```

Deployment is via Vercel. The `vercel.json` file declares scheduled
crons (engagement scoring, headhunting alerts, overdue reminders).

## Project structure

```
src/app/              Next.js App Router pages + API routes
src/app/api/          Backend API routes (Vercel serverless functions)
src/components/       UI components
src/hooks/            React hooks
src/lib/              Server + shared utilities (AI, supabase, sanitize, rate-limit, etc.)
src/store/            Client-state (Zustand)
src/data/             Static reference data (labour-law graph, products, taxonomy)
convex/               Convex backend (queries, mutations, actions, schema)
convex/_lib/          Auth helpers (requireUser / requireAdmin / requireOwner)
docs/pdf/             Source labour-law PDF documents (bundled into /api/pdf/[id])
docs/extracted/       Extracted text + structure used by the RAG bundler
public/               Static assets (logos, fonts, manifest)
```

## Environment variables

See [`.env.example`](./.env.example) for the full list with notes.
Variables are grouped by domain: platform URLs, Supabase, Convex,
Clerk, AI providers, inference proxy, email, rate-limit, analytics,
Cloudflare, feature flags.

## Conventions

- Package manager: **pnpm 9+** (lockfile: `pnpm-lock.yaml`)
- TypeScript strict; `npx tsc --noEmit` on changes
- shadcn-style components; canonical primitives in `src/components/ui/`
- Tailwind v4 via `@tailwindcss/postcss`
- App Router conventions: `route.ts` for handlers, `proxy.ts` for middleware

## License

Proprietary — see [`LICENSE`](./LICENSE).
