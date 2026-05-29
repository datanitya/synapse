---
description: Next.js 14 App Router conventions for apps/web
paths:
  - apps/web/**
---

# Frontend Conventions (apps/web)

## Server vs Client Components
Default to **Server Components**. Only add `'use client'` when the component uses:
- React hooks (`useState`, `useEffect`, `useRouter`, etc.)
- Browser APIs
- Event handlers

Data-fetching pages that just display data should be Server Components using `async/await`.

## API Calls
All API calls go through `lib/api-client.ts`. Never use `fetch` directly.

```typescript
import { api } from '../../../lib/api-client';

// In a Server Component or useEffect:
const data = await api.get<MyType>('/endpoint');
const result = await api.post<ResponseType>('/endpoint', payload);
```

The client automatically attaches the `synapse_token` Bearer JWT from the cookie.

## Auth & Cookies
Use `setAuthCookie(token)` and `clearAuthCookie()` from `lib/api-client.ts`. Never manipulate `synapse_token` with `document.cookie` directly.

## Route Groups
- `(auth)/` — unauthenticated pages: `/login`, `/callback`
- `(dashboard)/` — protected pages behind `middleware.ts`
- `onboarding/` — intermediate onboarding wizard

## Middleware
`middleware.ts` reads the `synapse_token` cookie and redirects:
- No token → `/login`
- Token, `onboardingComplete: false` → `/onboarding`
- Token, `onboardingComplete: true` → `/dashboard`

Do not add additional auth logic outside `middleware.ts`.

## Styling
Tailwind CSS dark theme. Background hierarchy:
- App background: `bg-slate-950`
- Card/panel: `bg-slate-900 border border-slate-800`
- Text primary: `text-white`
- Text secondary: `text-slate-400`
- Text muted: `text-slate-500` / `text-slate-600`
- Accent/action: `text-blue-400`, `bg-blue-600`
- Success: `text-green-400`
- Warning: `text-yellow-400`
- Danger: `text-red-400`

## Loading States
Use `animate-pulse` skeleton placeholders, not spinners. Match the skeleton shape to the final content (same height, same border radius).

## Shared Types
Import all types from `@synapse/types`. Do not redefine types that already exist in the shared package.

```typescript
import type { Draft, DraftStatus, UserWithPreferences } from '@synapse/types';
```

## useSearchParams
Always wrap components that use `useSearchParams()` in `<Suspense>`. Next.js 14 requires this for static rendering to work correctly.

```tsx
<Suspense fallback={<div>Loading…</div>}>
  <ComponentUsingSearchParams />
</Suspense>
```

## Images
External images (LinkedIn avatars) use `next/image` with the remotePatterns configured in `next.config.ts` (`*.licdn.com`). For images where next/image causes issues, use a plain `<img>` with the `// eslint-disable-next-line @next/next/no-img-element` comment.