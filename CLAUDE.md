# ChatGraph

AI chat application with a graph-based conversation UI. Each prompt is a node in a tree — users can branch, navigate, and switch models at any point.

## Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| Monorepo     | npm workspaces + concurrently           |
| Frontend     | React 18, TypeScript 5.7, Vite 6        |
| Graph UI     | @xyflow/react (React Flow v12) + dagre  |
| Styling      | Tailwind CSS 4                          |
| State        | Zustand 5                               |
| Routing      | React Router v7                         |
| Backend      | Node.js, Express 4, TypeScript 5.7      |
| ORM          | Prisma 6                                |
| Validation   | Zod                                     |
| Database     | PostgreSQL 16 (Docker, port 5432)       |
| AI API       | OpenRouter (`/api/v1`) via SSE streaming|

## Project Structure

```
ChatGraph/
├── CLAUDE.md
├── package.json              # Root workspace config (workspaces: packages/*)
├── .env.example
├── .gitignore
├── docs/                     # Project documentation (specs + architecture)
│   ├── PROJECT_SPEC.md
│   ├── frontend/
│   │   ├── architecture.md
│   │   └── guidelines.md
│   ├── backend/
│   │   ├── architecture.md
│   │   └── guidelines.md
│   └── features/
│       └── F001-*.md ... F051-*.md
├── packages/
│   ├── client/               # React frontend (Vite, port 5173)
│   │   ├── src/
│   │   │   ├── components/   # chat/, graph/, layout/, settings/, shared/
│   │   │   ├── hooks/        # useConversation, useCompletion, useActivePath
│   │   │   ├── stores/       # conversationStore, uiStore, settingsStore
│   │   │   ├── services/     # api.ts (REST), stream.ts (SSE)
│   │   │   ├── types/
│   │   │   └── utils/        # tree.ts, layout.ts (dagre)
│   │   ├── vite.config.ts    # Proxy /api → localhost:3000
│   │   └── package.json
│   └── server/               # Express backend (port 3000)
│       ├── src/
│       │   ├── routes/       # conversations, nodes, completions, models, settings
│       │   ├── services/     # conversation, node, completion, model, settings
│       │   ├── middleware/   # errorHandler, validate (Zod)
│       │   ├── types/
│       │   └── utils/        # tree.ts, env.ts
│       ├── prisma/
│       │   └── schema.prisma # Conversation, Node, Setting models
│       └── package.json
```

## Quick Start

```bash
npm install          # Install all workspace dependencies
npm run dev          # Start both client and server concurrently
```

## Commands

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start client + server in dev mode    |
| `npm run build`     | Build both packages                  |
| `npm run lint`      | Lint all packages                    |
| `npm run typecheck` | Type-check all packages              |
| `npx prisma studio` | Open Prisma database browser        |
| `npx prisma migrate dev` | Run database migrations         |

## Database

PostgreSQL 16 runs in Docker (`smoketester-postgres` container, port 5432).

```
postgresql://smoketester:localdev@localhost:5432/chatgraph
```

Schema: 3 tables (`Conversation`, `Node`, `Setting`) + `Role` enum. Migration `init` has been applied. The OpenRouter API key is stored in the `Setting` table (not in env vars).

## Implementation Status

Core P0 features implemented (F001–F012): project scaffolding, conversation tree model, chat interface, graph visualization, node navigation/branching, model switching, OpenRouter streaming, conversation management, settings, markdown rendering, and regenerate/edit-resend. Dark mode (F015) is implemented. Keyboard shortcuts (F016) are partially implemented (Ctrl+Enter/Esc in edit mode). Both server and client compile cleanly with `tsc --noEmit`.

Additional features implemented: AI auto-title via gpt-4o-mini (F021), context window visualizer progress bar (F022), response quality tracking with thumbs up/down (F023), auto-pan graph to active node (F024), toast notification system (F025), collapse/expand subtrees (F026), graph toolbar with zoom-to-fit & reset view (F027), graph layout toggle vertical/horizontal (F028), node pinning & color labels (F029), smart summarization nodes (F030), multi-model tournament mode (F031), conversation analytics & insights (F032), token & cost dashboard with real pricing (F033), time-travel conversation replay (F034), conversation heatmap overlay (F035), saved viewport positions per conversation (F036), mermaid diagram rendering (F037), HTML/CSS/JS live preview sandbox (F038), graph label filtering (F039), desktop notifications for background completions (F040), daily budget alerts with progress bar (F041), auto-summarize suggestion when context window >80% full (F042), historical spending charts (F043), export usage data as CSV (F044), per-node token contribution breakdown (F045), real-time cost ticker during streaming (F046), node annotations with freeform notes (F047), tournament comparison table with metrics (F048), emoji prefix for auto-titles (F049), fog-of-war minimap (F050), context pruning controls (F051), expand summary nodes to show originals (F052), re-title suggestions after conversation growth (F053), cost comparison across models in usage dashboard (F054), activity feed event log panel (F055).

Not yet implemented: export/import (F013), full-text search (F014), keyboard shortcuts completion (F016), branch comparison (F017), branch merging (F018), system prompt library (F019), token tracking (F020).

## Conventions

- **Language**: TypeScript everywhere (strict mode)
- **Formatting**: Prettier defaults (2-space indent, single quotes, no semicolons)
- **Naming**: camelCase for variables/functions, PascalCase for components/types, UPPER_SNAKE for constants
- **Exports**: Named exports only (no default exports)
- **API routes**: RESTful, prefixed with `/api/v1`
- **Error handling**: Express error middleware; frontend error boundaries
- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **No `any`**: Use `unknown` and narrow types instead
