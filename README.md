# SYNAPSE — AI LinkedIn Brand Growth System

SYNAPSE surfaces trending topics from HackerNews, Google News, and LinkedIn filtered to your professional niche, generates 3 LinkedIn post variations in your voice using GPT-4o / Claude / Gemini, learns your writing style over time (Brand DNA), and emails you a ready-to-post draft every morning. **You always approve — no auto-posting without your explicit action.**

---

## Architecture

```
synapse/
├── apps/api/          NestJS 11 backend (port 3001)
├── apps/web/          Next.js 14 App Router (port 3000)
├── packages/types/    Shared TypeScript types (@synapse/types)
└── infrastructure/    Docker Compose — PostgreSQL 16 + Redis 7
```

**pnpm monorepo** (v9 — Node 20 is incompatible with pnpm v11)

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 20.x | `node -v` |
| pnpm | 9.x | `pnpm -v` |
| Docker Desktop | Latest | `docker -v` |

```bash
# Install pnpm v9 if you have Node 20
npm install -g pnpm@9
```

---

## Local Development Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

Starts **PostgreSQL 16** on port `5433` and **Redis 7** on port `6379`.

```bash
# Verify both are healthy
docker compose -f infrastructure/docker-compose.yml ps
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in the required values (see [Environment Variables](#environment-variables) below).

> **Monorepo note:** The API reads from `apps/api/.env`. The Next.js web app reads from `apps/web/.env.local`. After filling in `apps/api/.env`, copy the JWT_SECRET into the web env as well:
> ```bash
> echo "JWT_SECRET=\"$(grep JWT_SECRET apps/api/.env | cut -d= -f2-)\"" >> apps/web/.env.local
> ```
> Without this, the middleware can't verify session tokens and users will be stuck in a login loop.

### 4. Run database migrations + seed

```bash
# Apply migrations
pnpm --filter @synapse/api exec prisma migrate dev

# Seed plans (FREE / PRO / BUSINESS)
pnpm --filter @synapse/api exec prisma db seed
```

### 5. Start both apps

```bash
pnpm dev
```

Or individually:

```bash
pnpm --filter @synapse/api start:dev   # API → http://localhost:3001
pnpm --filter @synapse/web dev         # Web → http://localhost:3000
```

### 6. Verify

```bash
curl http://localhost:3001/api/health
# {"status":"ok","service":"synapse-api","timestamp":"..."}
```

Open `http://localhost:3000` — you should be redirected to `/login`.

**API Docs (Swagger):** `http://localhost:3001/docs`

---

## First-Time User Flow

```
/login → Sign in with LinkedIn
  ↓
Onboarding Wizard (niche, tone, posting frequency)
  ↓
Dashboard (trends + brand score + voice report)
  ↓
Trends page (score: Opportunity Score per topic)
  ↓
"Write post →" → 3 AI variations in your voice
  ↓
Pick variation → edit → "Publish to LinkedIn" or schedule
```

---

## Environment Variables

All variables live in `.env` at the repo root (loaded by the API). The web app reads `NEXT_PUBLIC_*` vars at build time.

### Required

```env
# Database (Docker default — change for production)
DATABASE_URL="postgresql://synapse:synapse_password@127.0.0.1:5433/synapse_db"
REDIS_URL="redis://localhost:6379"

# LinkedIn OAuth → https://linkedin.com/developers/apps
# Required scopes: openid, profile, email, w_member_social
LINKEDIN_CLIENT_ID=""
LINKEDIN_CLIENT_SECRET=""
LINKEDIN_CALLBACK_URL="http://localhost:3001/api/auth/linkedin/callback"

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=""
JWT_EXPIRY="7d"
JWT_REFRESH_SECRET=""       # must differ from JWT_SECRET
JWT_REFRESH_EXPIRY="30d"

# Token encryption (LinkedIn access/refresh tokens at rest)
AUTH_ENCRYPTION_KEY=""      # 64-char hex string

# AI (pick one as default; users can bring their own keys)
AI_PROVIDER="gemini"        # gemini | claude | openai
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.0-flash-lite"
ANTHROPIC_API_KEY=""
ANTHROPIC_MODEL="claude-sonnet-4-6"
OPENAI_API_KEY=""
OPENAI_MODEL_GENERATION="gpt-4o-mini"
OPENAI_MODEL_CATEGORIZATION="gpt-4o-mini"

# App URLs
NEXT_PUBLIC_API_URL="http://localhost:3001"
WEB_URL="http://localhost:3000"
API_PORT="3001"
NODE_ENV="development"
CORS_ORIGINS="http://localhost:3000"
```

### Optional (feature-specific)

```env
# Email — Resend (https://resend.com)
RESEND_API_KEY=""
EMAIL_FROM="SYNAPSE <noreply@yourdomain.com>"

# Image generation & storage — Cloudinary (https://cloudinary.com)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Analytics — PostHog
NEXT_PUBLIC_POSTHOG_KEY=""
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
POSTHOG_API_KEY=""          # server-side events

# Payments — Razorpay (India)
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""

# Payments — Stripe (international)
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""

# Swagger docs in production (disabled by default)
SWAGGER_ENABLED="false"
```

---

## LinkedIn App Setup

1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → **Create app**
2. **Auth tab** → add redirect URL: `http://localhost:3001/api/auth/linkedin/callback`
3. **Products tab** → request:
   - **Sign In with LinkedIn using OpenID Connect** (required)
   - **Share on LinkedIn** (required for publishing — `w_member_social` scope)
4. Copy Client ID and Client Secret into `.env`

---

## Useful Commands

```bash
# Type-check (zero errors required before commit)
pnpm --filter @synapse/api exec tsc --noEmit
pnpm --filter @synapse/web exec tsc --noEmit

# Database
pnpm --filter @synapse/api exec prisma migrate dev    # apply migrations
pnpm --filter @synapse/api exec prisma db seed        # seed plans
pnpm --filter @synapse/api exec prisma studio         # DB browser → localhost:5555
pnpm --filter @synapse/api exec prisma migrate status

# Docker
docker compose -f infrastructure/docker-compose.yml up -d
docker compose -f infrastructure/docker-compose.yml down
docker compose -f infrastructure/docker-compose.yml down -v   # wipes data

# Build
pnpm build
```

---

## Production Deployment

Both apps ship as Docker images. A production compose file is included.

### 1. Create `.env.production`

Copy `.env.example` to `.env.production` and fill in production values. Key differences:
- `DATABASE_URL` points to a managed PostgreSQL instance (not localhost)
- `REDIS_URL` points to a managed Redis instance
- `NODE_ENV=production`
- Strong random secrets for `JWT_SECRET`, `AUTH_ENCRYPTION_KEY`
- Real `LINKEDIN_CALLBACK_URL` (your production domain)

### 2. Build and start

```bash
cd infrastructure
POSTGRES_PASSWORD=<strong-password> docker compose -f docker-compose.prod.yml up --build -d
```

The API container automatically runs `prisma migrate deploy` on startup before accepting requests.

### 3. Seed plans (first deploy only)

```bash
docker exec synapse_api node -e "
const { PrismaClient } = require('@prisma/client');
// Run seed via exec or connect to DB directly
"
# Or run seed locally against production DATABASE_URL:
DATABASE_URL="<prod-url>" pnpm --filter @synapse/api exec prisma db seed
```

### Deployment targets

The Dockerfiles produce standard Node.js images deployable to:
- **Render** — connect repo, set env vars, auto-deploy on push
- **Railway** — Dockerfile-based deployments
- **Fly.io** — `fly launch` from each app directory
- **Any VPS** — use `docker-compose.prod.yml`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router · TypeScript · Tailwind CSS 4 |
| Backend | NestJS 11 · TypeScript |
| Database | PostgreSQL 16 · Prisma ORM 5 |
| Cache / Queue | Redis 7 · Bull (scheduled publishing) |
| AI | OpenAI GPT-4o · Google Gemini · Anthropic Claude |
| Auth | LinkedIn OAuth 2.0 · JWT in HttpOnly cookies · jose |
| Email | Resend |
| Storage | Cloudinary |
| Payments | Razorpay (India) · Stripe (international) |
| Analytics | PostHog (frontend + server-side events) |
| API Docs | Swagger / OpenAPI at `/docs` |
| Monorepo | pnpm workspaces · Turborepo |

---

## Key Architecture Decisions

| Decision | Reason |
|---|---|
| PostgreSQL port 5433 | Avoids conflict with system postgres on port 5432 |
| JWT in HttpOnly cookies | Never exposed to JavaScript — prevents XSS token theft |
| LinkedIn tokens AES-256-CBC encrypted at rest | Compliance; tokens are sensitive credentials |
| pnpm v9 (not v11) | Node 20.13.1 is incompatible with pnpm v11 |
| Prisma 5 (not 7) | Prisma 7 requires Node 20.19+; we run 20.13.1 |
| Bull + Redis for scheduling | Survives server restarts; jobs persist across deploys |
| `isolatedModules: false` in API tsconfig | NestJS `emitDecoratorMetadata` incompatible with `isolatedModules: true` |

---

## Security Notes

- **No auto-posting.** Every LinkedIn post requires explicit user action (`POST /drafts/:id/publish` or scheduled via `POST /drafts/:id/schedule`).
- **LinkedIn secrets are server-only.** `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` never reach the browser.
- **API keys are hashed.** Developer API keys (`sk_live_...`) are stored as SHA-256 hashes — the plaintext is shown exactly once at creation.
- **Org invites are token-scoped.** Invite tokens are single-use, 7-day expiry, email-matched on acceptance.
