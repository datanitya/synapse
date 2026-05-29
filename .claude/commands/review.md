---
name: review
description: Review code changes for quality, security, and SYNAPSE conventions
user-invocable: true
argument-hint: "[file path or description of what to review]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

Review the following for the Echo / SYNAPSE project: $ARGUMENTS

If no argument is given, review all uncommitted changes (`git diff HEAD`).

Perform a structured review covering these areas in order:

## 1. Security
- No LinkedIn OAuth secrets or tokens in frontend code or logs
- JWT not stored in localStorage or exposed to JS
- No `console.log` of sensitive values (tokens, encryption keys, JWTs)
- No auto-posting logic introduced
- SQL injection / XSS / injection risks in any new inputs

## 2. TypeScript Correctness
Run `tsc --noEmit` for the affected app and report any errors.
- Check that no `User` from `@prisma/client` is imported in NestJS controllers (use local `interface AuthUser`)
- Confirm `@synapse/types` is used for shared types, not locally redefined

## 3. API Conventions (if touching apps/api)
- Every controller has `@UseGuards(JwtAuthGuard)` at class level (except AuthController, AppController)
- Request bodies validated with class-validator DTOs
- Errors thrown as NestJS `HttpException`, not raw `Error`
- AI calls go through `AiService`, not direct OpenAI instantiation

## 4. Frontend Conventions (if touching apps/web)
- `'use client'` only where hooks or browser APIs are used
- API calls use `api` from `lib/api-client.ts`, not raw `fetch`
- Shared types imported from `@synapse/types`
- `useSearchParams` wrapped in `<Suspense>`

## 5. General Quality
- No hardcoded secrets, ports, or localhost URLs (use env vars / ConfigService)
- No unnecessary `any` types
- No dead code or commented-out blocks left behind
- Loading and error states handled in UI components

Output a concise verdict per area: PASS / WARN / FAIL with specific line references.