---
name: test-gen
description: Generate Jest unit tests for a NestJS service or Next.js component
user-invocable: true
argument-hint: "<path to file>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
---

Generate comprehensive Jest tests for: $ARGUMENTS

Read the target file first, then generate tests following these rules:

## For NestJS Services (apps/api)

Use `@nestjs/testing` `Test.createTestingModule`. Mock all dependencies injected in the constructor:
- `PrismaService` — mock each method called (`findUnique`, `create`, etc.)
- `AiService` — mock `chat()` to return fixture JSON strings
- `ConfigService` — mock `get()` with relevant env values

Test structure:
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let prisma: DeepMocked<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ServiceName, mockProvider(PrismaService), mockProvider(AiService)],
    }).compile();
    service = module.get(ServiceName);
    prisma = module.get(PrismaService);
  });

  describe('methodName', () => {
    it('should ...', async () => { ... });
    it('should throw NotFoundException when record not found', async () => { ... });
  });
});
```

Cover:
- Happy path for every public method
- Record-not-found cases (Prisma `P2025` → `NotFoundException`)
- Unique constraint violations (Prisma `P2002` → `BadRequestException`)
- AI service failure handling

## For Next.js Components (apps/web)

Use React Testing Library + `jest-environment-jsdom`. Mock `lib/api-client.ts`:
```typescript
jest.mock('../../../lib/api-client', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
```

Cover:
- Renders loading skeleton initially
- Renders correct content after data loads
- Error state renders fallback message
- User interactions (button clicks, form submissions) call correct `api.*` methods

## Output
Write the test file to the same directory as the source file, named `<filename>.spec.ts`.
After writing, run `tsc --noEmit` in the relevant app to confirm no type errors in the generated test.