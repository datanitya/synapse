# SYNAPSE — AI Personal Branding System

An AI-powered LinkedIn content engine. It surfaces trending topics from HackerNews filtered to your niche, generates 3 post variations in your voice using GPT-4o, recommends optimal posting times, and emails you a ready-to-post draft every morning. **You always approve and post manually — no auto-posting.**

---

## Prerequisites

Make sure these are installed before you start:

| Tool | Version | Check |
|---|---|---|
| Node.js | 20.x | `node -v` |
| pnpm | 9.x | `pnpm -v` |
| Docker Desktop | Latest | `docker -v` |

> **Windows note:** pnpm v11 requires Node 22+. If you have Node 20, install pnpm v9 specifically:
> ```bash
> npm install -g pnpm@9
> ```

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd Echo

pnpm install
```

---

## 2. Start the Database & Cache

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

This starts:
- **PostgreSQL 16** on port `5433` (not 5432 — avoids conflict with system postgres)
- **Redis 7** on port `6379`

Verify both are healthy:
```bash
docker compose -f infrastructure/docker-compose.yml ps
```
Both should show `(healthy)`.

---

## 3. Set Up Environment Variables

Copy the example file and fill in your values:

```bash
cp apps/api/.env.example apps/api/.env   # if .env.example exists
# or edit apps/api/.env directly
```

Open `apps/api/.env` and fill in:

### Required

```env
# LinkedIn OAuth — get from https://linkedin.com/developers/apps
LINKEDIN_CLIENT_ID="your_client_id"
LINKEDIN_CLIENT_SECRET="your_client_secret"

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="<64-char hex>"
JWT_REFRESH_SECRET="<64-char hex — different from JWT_SECRET>"

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AUTH_ENCRYPTION_KEY="<64-char hex>"

# OpenAI — get from https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-..."
```

### LinkedIn App Setup
1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → **Create app**
2. Under **Auth** tab → add redirect URL: `http://localhost:3001/auth/linkedin/callback`
3. Under **Products** tab → request **"Sign In with LinkedIn using OpenID Connect"**
4. Copy `Client ID` and `Client Secret` into your `.env`

### SMTP Email (for daily digest)

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"       # Gmail: Account → Security → App Passwords
EMAIL_FROM="SYNAPSE <your-email@gmail.com>"
```

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords → create one called "SYNAPSE"

---

## 4. Run Database Migrations

```bash
pnpm --filter "@synapse/api" exec prisma migrate dev
```

Confirm all 7 tables exist:
```bash
pnpm --filter "@synapse/api" exec prisma studio
```
Opens at `http://localhost:5555`.

---

## 5. Start the App

Open **two terminals**:

**Terminal 1 — API:**
```bash
pnpm --filter "@synapse/api" start:dev
```
API runs at `http://localhost:3001`

**Terminal 2 — Web:**
```bash
pnpm --filter "@synapse/web" dev
```
Web runs at `http://localhost:3000`

Or run both together with Turborepo:
```bash
pnpm dev
```

---

## 6. Verify Everything Works

```bash
curl http://localhost:3001/api/health
# → {"status":"ok","service":"synapse-api"}
```

Open `http://localhost:3000` — you should be redirected to `/login`.

---

## 7. First-Time Flow

```
http://localhost:3000
  ↓
Sign in with LinkedIn   (LinkedIn OAuth)
  ↓
Onboarding Wizard       (pick your niche, tone, posting frequency)
  ↓
Dashboard               (top trends + pending drafts)
  ↓
Trends page             (HackerNews stories filtered to your niche)
  ↓
"Write post →"          (generates 3 variations with GPT-4o)
  ↓
Pick a variation        (edit if needed, set status to Approved)
  ↓
Copy → Post on LinkedIn (manual — you're always in control)
```

---

## Daily Email Digest

Once SMTP is configured, SYNAPSE automatically:
- Picks the top trending topic for your niche every day at **8:00 AM IST**
- Generates a post using GPT-4o
- Emails all 3 variations to you with a link to edit the draft

**Test it immediately** (without waiting for 8am):
```bash
curl -X POST http://localhost:3001/api/digest/trigger \
  -H "Authorization: Bearer <paste synapse_token cookie value here>"
```
You'll receive the email within ~10 seconds.

> To get your token: open browser DevTools → Application → Cookies → copy `synapse_token` value.

---

## Useful Commands

```bash
# Typecheck (should always be zero errors)
pnpm --filter "@synapse/api" exec tsc --noEmit
pnpm --filter "@synapse/web" exec tsc --noEmit

# Validate Prisma schema
pnpm --filter "@synapse/api" exec prisma validate

# Manually trigger HackerNews trend sync
curl -X POST http://localhost:3001/api/trends/sync \
  -H "Authorization: Bearer <token>"

# Prisma Studio (DB browser)
pnpm --filter "@synapse/api" exec prisma studio

# Stop Docker containers
docker compose -f infrastructure/docker-compose.yml down

# Stop and wipe database (destructive!)
docker compose -f infrastructure/docker-compose.yml down -v
```

---

## Project Structure

```
Echo/
├── apps/
│   ├── api/                  NestJS backend (port 3001)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/         LinkedIn OAuth + JWT
│   │   │   │   ├── users/        User profile
│   │   │   │   ├── onboarding/   4-step setup wizard
│   │   │   │   ├── trends/       HackerNews feed + niche filtering
│   │   │   │   ├── content/      GPT-4o post generation
│   │   │   │   ├── drafts/       Draft management
│   │   │   │   ├── digest/       Daily email + SMTP
│   │   │   │   ├── timing/       Posting time recommendations
│   │   │   │   └── notifications/ In-app notifications
│   │   │   └── prisma/           Database client
│   │   └── prisma/
│   │       └── schema.prisma     Database schema
│   │
│   └── web/                  Next.js 14 App Router (port 3000)
│       └── app/
│           ├── (auth)/           Login + OAuth callback
│           ├── onboarding/       Setup wizard
│           └── (dashboard)/      Main app
│               ├── dashboard/    Home
│               ├── trends/       Trend feed
│               ├── compose/      Generate posts
│               ├── drafts/       Draft list + editor
│               ├── notifications/
│               └── settings/
│
├── packages/
│   └── types/                Shared TypeScript types
│
├── infrastructure/
│   └── docker-compose.yml    PostgreSQL 16 + Redis 7
│
├── .claude/                  Claude Code configuration
├── CLAUDE.md                 AI assistant context
└── README.md                 This file
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (port 5433) |
| `REDIS_URL` | Yes | Redis connection string |
| `LINKEDIN_CLIENT_ID` | Yes | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | Yes | LinkedIn OAuth client secret |
| `LINKEDIN_CALLBACK_URL` | Yes | Must match LinkedIn app settings |
| `JWT_SECRET` | Yes | 32-byte hex string for signing JWTs |
| `JWT_REFRESH_SECRET` | Yes | Different 32-byte hex for refresh tokens |
| `AUTH_ENCRYPTION_KEY` | Yes | 32-byte hex for encrypting LinkedIn tokens |
| `OPENAI_API_KEY` | Yes | OpenAI API key (GPT-4o access required) | 
| `SMTP_HOST` | Yes | SMTP server hostname |
| `SMTP_PORT` | Yes | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_USER` | Yes | SMTP login email |
| `SMTP_PASS` | Yes | SMTP password or app password |
| `EMAIL_FROM` | Yes | Sender name + address |
| `WEB_URL` | Yes | Frontend URL (for email links) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind CSS |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL 16 (Docker) + Prisma ORM v5 |
| Cache | Redis 7 (Docker) |
| AI | OpenAI GPT-4o (posts) + GPT-4o-mini (categorization) |
| Auth | LinkedIn OAuth 2.0 + JWT (HttpOnly cookies) |
| Email | Nodemailer (SMTP) |
| Scheduler | @nestjs/schedule (daily cron) |
| Monorepo | pnpm workspaces + Turborepo |
