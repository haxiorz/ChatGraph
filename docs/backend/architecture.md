# Backend Architecture

## Overview

The backend is a Node.js + Express + TypeScript API server located in `packages/server/`. It provides REST endpoints for conversation management and proxies AI completions through OpenRouter with SSE streaming.

## Technology

| Concern          | Library        | Purpose                                  |
| ---------------- | -------------- | ---------------------------------------- |
| Runtime          | Node.js 20+   | JavaScript runtime                       |
| Framework        | Express        | HTTP server, routing, middleware          |
| Language         | TypeScript     | Type safety                              |
| ORM              | Prisma         | Database access, migrations, type gen    |
| Database         | PostgreSQL 16  | Persistent storage                       |
| Validation       | Zod            | Request body/param validation            |
| HTTP client      | fetch (native) | OpenRouter API calls                     |
| Dev server       | tsx            | TypeScript execution with watch mode     |

## Directory Structure

```
packages/server/
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Migration history
├── src/
│   ├── index.ts                  # Entry point — creates and starts server
│   ├── app.ts                    # Express app setup (middleware, routes)
│   ├── routes/
│   │   ├── conversations.ts      # /api/v1/conversations/*
│   │   ├── nodes.ts              # /api/v1/nodes/*
│   │   ├── completions.ts        # /api/v1/conversations/:id/complete
│   │   ├── models.ts             # /api/v1/models
│   │   └── settings.ts           # /api/v1/settings
│   ├── services/
│   │   ├── conversationService.ts  # Conversation CRUD
│   │   ├── nodeService.ts          # Node CRUD + tree operations
│   │   ├── completionService.ts    # OpenRouter API integration
│   │   ├── modelService.ts         # Model listing/caching
│   │   └── settingsService.ts      # Key-value settings
│   ├── middleware/
│   │   ├── errorHandler.ts       # Global error handler
│   │   └── validate.ts           # Zod validation middleware
│   ├── types/
│   │   └── index.ts              # Shared types
│   └── utils/
│       ├── tree.ts               # Build message path from node chain
│       └── env.ts                # Environment variable access
├── package.json
└── tsconfig.json
```

## Layered Architecture

```
HTTP Request
    │
    ▼
┌──────────────────┐
│   Routes         │  Parse request, call service, format response
├──────────────────┤
│   Services       │  Business logic, orchestration
├──────────────────┤
│   Prisma Client  │  Database access (generated, type-safe)
└──────────────────┘
    │
    ▼
  PostgreSQL
```

**Routes** handle HTTP concerns (req/res, status codes, SSE setup). They delegate to **services** for business logic. Services use **Prisma Client** for database access. No route ever touches Prisma directly.

## Database Schema (Prisma)

```prisma
model Conversation {
  id        String   @id @default(uuid())
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  nodes     Node[]
}

model Node {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  parentId       String?
  parent         Node?        @relation("NodeTree", fields: [parentId], references: [id])
  children       Node[]       @relation("NodeTree")
  role           Role
  content        String
  model          String?
  metadata       Json?
  createdAt      DateTime     @default(now())

  @@index([conversationId])
  @@index([parentId])
}

model Setting {
  id    String @id @default(uuid())
  key   String @unique
  value Json
}

enum Role {
  system
  user
  assistant
}
```

## Completion Flow (detailed)

This is the most complex operation in the backend. Implemented in `completionService.streamCompletion()`:

```
1. POST /api/v1/conversations/:id/complete
   Body: { parentNodeId: string, content: string, model: string }

2. Route validates input (Zod), sets SSE headers, creates AbortController,
   listens for req.on('close') to abort on client disconnect.

3. completionService.streamCompletion():
   a. Fetch all nodes for the conversation from DB
   b. Verify parentNodeId exists in the node set
   c. Create the user Node in DB
   d. Send SSE `event: userNode` with the saved user node
   e. Build path: walk from user node up to root via parent links (utils/tree.ts)
   f. Map path to OpenRouter messages array
   g. Fetch API key from Settings table (settingsService.get)
   h. POST to OpenRouter /chat/completions with stream: true
   i. Read response body stream, parse SSE chunks from OpenRouter
   j. For each token: send SSE `event: token` to client, accumulate text
   k. On stream end: create assistant Node in DB
   l. Auto-title conversation if this is the first exchange (≤1 existing node)
   m. Send SSE `event: done` with the saved assistant node
   n. On client disconnect (abort): save partial content with metadata.partial = true

4. Client receives: userNode → tokens → done (or error)
```

## SSE Streaming Protocol

The server uses Server-Sent Events for streaming completions. Four event types:

```
event: userNode
data: {"id": "...", "role": "user", "content": "...", "conversationId": "...", ...}

event: token
data: {"content": "Hello"}

event: token
data: {"content": " world"}

event: done
data: {"node": {"id": "...", "role": "assistant", "content": "Hello world", "model": "...", ...}}

event: error
data: {"message": "OpenRouter API error: ..."}
```

The `userNode` event is sent immediately after the user node is saved to the database, before the OpenRouter request begins. This allows the client to display the user message instantly.

## Environment Variables

```
DATABASE_URL=postgresql://smoketester:localdev@localhost:5432/chatgraph
PORT=3000
NODE_ENV=development
```

Environment variables are accessed through `utils/env.ts` which validates `DATABASE_URL` at startup. `PORT` defaults to 3000 if not set.

**Note:** The OpenRouter API key is **not** an environment variable. It is stored in the `Setting` table in the database (key: `openrouter_api_key`) and managed via the `/api/v1/settings` endpoints. This allows the user to configure it through the UI without restarting the server.

## Error Handling

All errors flow through the global `errorHandler` middleware:

```typescript
// Any thrown error or next(error) ends up here
app.use(errorHandler)
```

Error response format:

```json
{
  "error": {
    "message": "Conversation not found",
    "code": "NOT_FOUND"
  }
}
```

Service functions throw typed errors; the error handler maps them to HTTP status codes.

## CORS

The server allows requests from the Vite dev server (`http://localhost:5173`) in development. In production, configure the allowed origin via environment variable.
