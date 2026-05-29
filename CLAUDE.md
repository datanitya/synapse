# Echo — SYNAPSE AI Personal Branding System

SYNAPSE is an AI LinkedIn personal brand growth system. It surfaces HackerNews-sourced trending topics filtered by niche, generates 3 LinkedIn post variations per topic using GPT-4o in the user's voice, and recommends optimal posting times. **MVP has no auto-posting — users always manually approve.**

## Repository Layout

pnpm monorepo (v9 — Node 20.13.1 is incompatible with pnpm v11):
```
echo/
├── apps/api/          NestJS backend (port 3001)
├── apps/web/          Next.js 14 App Router (port 3000)
├── packages/types/    Shared types (@synapse/types workspace package)
└── infrastructure/    Docker Compose — PostgreSQL 16 + Redis 7
```

## Commands

```bash
# Infrastructure
docker compose -f infrastructure/docker-compose.yml up -d
docker compose -f infrastructure/docker-compose.yml down

# Dev (both apps via Turborepo)
pnpm dev

# Individual apps
pnpm --filter @synapse/api start:dev
pnpm --filter @synapse/web dev

# Database
pnpm --filter @synapse/api exec prisma migrate dev
pnpm --filter @synapse/api exec prisma migrate status
pnpm --filter @synapse/api exec prisma validate
pnpm --filter @synapse/api exec prisma studio

# Typecheck (zero errors required before any commit)
pnpm --filter @synapse/api exec tsc --noEmit
pnpm --filter @synapse/web exec tsc --noEmit

# Build
pnpm build
```

## Critical Environment Facts

| Fact | Detail |
|---|---|
| PostgreSQL port | **5433** (not 5432 — local postgres.exe holds 5432) |
| Redis port | 6379 |
| API port | 3001 |
| Web port | 3000 |
| Node version | 20.13.1 |
| pnpm version | 9.x (v11 requires Node 22+) |
| Prisma version | 5.x (v7 requires Node 20.19+) |

## Non-Negotiable Security Rules

- **No auto-posting.** Every LinkedIn post requires explicit user approval. Never implement scheduled or automatic posting.
- **LinkedIn secrets server-only.** `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` must never appear in frontend code or be sent to the browser.
- **Tokens encrypted at rest.** LinkedIn access/refresh tokens are AES-256-CBC encrypted using `AUTH_ENCRYPTION_KEY`. Never store them in plaintext.
- **JWT in HttpOnly cookies only.** Never store JWTs in `localStorage` or expose them to JavaScript. Cookie name: `synapse_token`.
- **Never log tokens.** No `console.log` of JWT payloads, LinkedIn tokens, or `AUTH_ENCRYPTION_KEY`.
- **Do not modify `.env` or `.env.local` directly.** Update `.env.example` instead and instruct the user.

## Known TypeScript Gotchas

- `isolatedModules` is **false** in `apps/api/tsconfig.json` — NestJS `emitDecoratorMetadata` is incompatible with `isolatedModules: true`. Do not change this.
- Never import `User` from `@prisma/client` in NestJS controllers — it causes TS1272. Use a local interface instead: `interface AuthUser { id: string }`.
- When adding a new Prisma model, run `prisma generate` before running `tsc --noEmit`.

## Architecture Rules

@.claude/rules/api-conventions.md
@.claude/rules/frontend-styles.md

