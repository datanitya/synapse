---
description: NestJS API conventions for apps/api
paths:
  - apps/api/**
---

# API Conventions (apps/api)

## Module Structure
Every feature module must have exactly: `*.module.ts`, `*.service.ts`, `*.controller.ts`.
DTOs live in `modules/<feature>/dto/`. No business logic in controllers.

## Authentication
Every controller (except `AuthController` and `AppController`) must be decorated with `@UseGuards(JwtAuthGuard)` at the class level.

```typescript
@Controller('resource')
@UseGuards(JwtAuthGuard)
export class ResourceController {}
```

## User Injection
Use the `@CurrentUser()` param decorator to inject the authenticated user. Never import `User` from `@prisma/client` in controllers — it causes TS1272. Define a local interface instead:

```typescript
interface AuthUser { id: string; email: string; onboardingComplete: boolean }

@Get('me')
getMe(@CurrentUser() user: AuthUser) { ... }
```

## DTOs
All request body DTOs use `class-validator` decorators. Every DTO must be validated by the global `ValidationPipe` (already configured in `main.ts`). Import enums from `@prisma/client`, not from `@synapse/types`, inside DTOs.

## Error Handling
Throw NestJS `HttpException` subclasses (`NotFoundException`, `BadRequestException`, etc.). The global `AllExceptionsFilter` handles everything else. Never `try/catch` and swallow errors silently.

## Prisma
Use `PrismaService` injected via constructor. Transactions use `prisma.$transaction([...])`. Never use raw SQL unless Prisma ORM cannot express the query.

Always handle `P2002` (unique constraint) and `P2025` (record not found) Prisma errors and convert them to appropriate `HttpException` types.

## AI Module
Use `AiService.chat(system, user, model)` for all OpenAI calls. Never instantiate `OpenAI` directly in feature services. Use `'generation'` (GPT-4o) for user-facing content, `'categorization'` (GPT-4o-mini) for classification tasks.

## Route Prefix
All routes are prefixed with `/api` (set in `main.ts`). Controllers declare paths without the `/api` prefix.

## Environment Config
Access env vars through `ConfigService`, never via `process.env` directly in services.

```typescript
constructor(private config: ConfigService) {}
const secret = this.config.get<string>('jwt.secret');
```