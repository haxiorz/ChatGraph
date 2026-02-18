# Backend Coding Guidelines

## Principles

1. **KISS** — Straightforward code over clever code. Express is simple; keep it that way.
2. **DRY** — Shared logic lives in services or utils. But two similar 5-line functions are fine as-is.
3. **SOLID**
   - **S**: Each service handles one domain (conversations, nodes, completions, etc.).
   - **O**: Add new routes/services without modifying existing ones.
   - **L**: Service functions honor their type contracts.
   - **I**: Functions accept only the parameters they need. No god-objects.
   - **D**: Routes depend on service interfaces, not on Prisma directly.
4. **Clean Code** — Functions are small, well-named, and do one thing. No 200-line functions.

## TypeScript

- **Strict mode** enabled.
- **No `any`**. Use `unknown` and narrow.
- Prisma generates types from the schema — use them directly. Don't re-declare database types.
- Define API request/response types in `types/index.ts`.
- Use Zod schemas for runtime validation (they also infer TypeScript types):
  ```typescript
  const CreateNodeSchema = z.object({
    parentNodeId: z.string().uuid(),
    content: z.string().min(1),
    model: z.string().min(1),
  })

  type CreateNodeInput = z.infer<typeof CreateNodeSchema>
  ```

## Architecture Rules

### Routes

- Routes are thin. They validate input, call a service, and return a response.
- One route file per resource (`conversations.ts`, `nodes.ts`, etc.).
- Use `express.Router()` and mount under `/api/v1`.
- Always use the `validate` middleware for request body validation.

```typescript
// Good: thin route
router.post('/', validate(CreateConversationSchema), async (req, res, next) => {
  try {
    const conversation = await conversationService.create(req.body)
    res.status(201).json(conversation)
  } catch (error) {
    next(error)
  }
})
```

### Services

- Services contain business logic.
- Services are plain functions (not classes) exported from a module.
- Services call Prisma directly — no additional "repository" layer.
- Services throw errors on failure (routes catch and forward to error handler).

```typescript
// conversationService.ts
import { prisma } from '../prisma'

export async function create(input: CreateConversationInput) {
  return prisma.conversation.create({ data: { title: input.title } })
}
```

### Middleware

- Validation middleware wraps Zod and returns 400 on failure.
- Error handler middleware is the last middleware registered.
- No auth middleware needed initially (single-user local app).

## Error Handling

- **Services throw** — routes catch via `try/catch` and call `next(error)`.
- Use a custom error class for known errors:
  ```typescript
  export class AppError extends Error {
    constructor(
      message: string,
      public statusCode: number,
      public code: string,
    ) {
      super(message)
    }
  }
  ```
- The global error handler maps `AppError` to the appropriate status code. Unknown errors become 500.

## Database

- **Prisma is the only DB access layer**. No raw SQL unless absolutely necessary.
- Use Prisma's relation queries to fetch related data in a single query.
- Always use transactions for operations that create multiple related records.
- Migration naming: `npx prisma migrate dev --name descriptive_name`.

## API Conventions

- **JSON** request and response bodies.
- **HTTP status codes**: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 404 (Not Found), 500 (Internal Error).
- **Consistent response shape**:
  ```json
  // Success (single)
  { "id": "...", "title": "...", ... }

  // Success (list)
  [{ "id": "...", "title": "...", ... }]

  // Error
  { "error": { "message": "...", "code": "..." } }
  ```
- Use plural nouns for resources: `/conversations`, not `/conversation`.

## Streaming

- Use `res.setHeader('Content-Type', 'text/event-stream')` for SSE.
- Use `res.setHeader('Cache-Control', 'no-cache')` and `res.setHeader('Connection', 'keep-alive')`.
- Flush after each write: `res.flush()` (if compression middleware is enabled).
- Always send a final `event: done` or `event: error` so the client knows the stream ended.

## File Naming

| Type        | Convention          | Example                        |
| ----------- | ------------------- | ------------------------------ |
| Route       | camelCase.ts        | `conversations.ts`             |
| Service     | camelCase.ts        | `conversationService.ts`       |
| Middleware  | camelCase.ts        | `errorHandler.ts`              |
| Utility     | camelCase.ts        | `tree.ts`                      |
| Type file   | camelCase.ts        | `index.ts`                     |
| Prisma      | schema.prisma       | `schema.prisma`                |

## Environment

- **Never hardcode** secrets or configuration. Use environment variables via `utils/env.ts`.
- `.env` file for local development (git-ignored).
- `.env.example` committed with placeholder values.

## Testing Strategy

- **Unit tests**: Service functions, utility functions (especially tree path building)
- **Integration tests**: Route → DB round-trip tests with a test database
- Test files live next to the code: `nodeService.ts` → `nodeService.test.ts`
- Use Vitest as the test runner (consistent with the frontend).
