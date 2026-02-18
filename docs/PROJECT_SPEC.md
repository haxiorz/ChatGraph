# ChatGraph — Project Specification

## Vision

ChatGraph reimagines AI chat as a **graph-based conversation explorer**. Instead of a single linear thread, every message is a node in a tree. Users can revisit any point in a conversation, branch off in new directions, and switch AI models on the fly — all through a split-pane UI with the chat on the left and an interactive graph on the right.

## Problem Statement

Current AI chat interfaces are linear. Once you go down a path, going back means losing context or manually copy-pasting. There's no way to:

- Explore multiple approaches to the same question simultaneously
- Compare how different models respond to the same prompt history
- Visually see the shape and depth of a conversation

ChatGraph solves all three.

## Core Concepts

### Conversation Tree

A conversation is a **tree** (a directed acyclic graph). The root node is the first message. Each subsequent message is a child of the message it replies to. Branching happens when a user creates a new child from an existing node that already has children.

```
[System Prompt]
    └── [User: "Explain recursion"]
            ├── [Assistant GPT-4: "Recursion is..."]
            │       └── [User: "Give me an example"]
            │               └── [Assistant GPT-4: "Here's factorial..."]
            └── [Assistant Claude: "Think of recursion as..."]   ← branch with different model
                    └── [User: "Compare to iteration"]
                            └── [Assistant Claude: "..."]
```

### Active Path

At any time, there is an **active path** — the chain of nodes from the root to the currently selected node. This path determines what message history is sent to the AI.

### Model Switching

Since OpenRouter accepts a `model` parameter per request, users can switch models at any branch point. The model used is stored per-node, so the graph shows which model generated each response.

## Tech Stack Rationale

| Choice       | Why                                                                              |
| ------------ | -------------------------------------------------------------------------------- |
| npm workspaces | Monorepo with zero extra tooling; `npm install` at root handles everything     |
| concurrently | Single `npm run dev` starts both client and server                               |
| React + Vite | Fast dev server, TypeScript-first, huge ecosystem                                |
| React Flow   | Best-in-class React library for interactive node graphs; handles layout, zoom, pan |
| Tailwind CSS | Utility-first — fast to build, no CSS file sprawl                                |
| Zustand      | Minimal boilerplate state management; works great with React Flow                |
| Express      | Mature, simple, flexible; ideal for a REST + streaming API                       |
| Prisma       | Type-safe ORM, great migration story, visual studio for DB exploration           |
| PostgreSQL   | Already running in Docker; supports JSONB for flexible metadata, excellent with Prisma |

## Data Model

### Implemented Tables

```
Conversation
├── id          UUID (PK)
├── title       String
├── created_at  DateTime
└── updated_at  DateTime

Node
├── id              UUID (PK)
├── conversation_id UUID (FK → Conversation)
├── parent_id       UUID (FK → Node, nullable for root)
├── role            Enum (system, user, assistant)
├── content         Text
├── model           String (nullable — only set for assistant nodes)
├── created_at      DateTime
└── metadata        JSONB (token counts, latency, etc.)

Settings
├── id              UUID (PK)
├── key             String (unique)
└── value           JSONB
```

### Planned Tables (not yet implemented)

```
Prompt (for F019 — System Prompt Library)
├── id, name, description, content, is_built_in, last_used_at, created_at, updated_at

MergeEdge (for F018 — Branch Merging)
├── id, child_id, parent_id, branch_order
```

### Key Relationships

- `Conversation` 1 → N `Node`
- `Node` 1 → N `Node` (self-referential parent → children)
- Root nodes have `parent_id = null`

## API Design

### Implemented REST Endpoints

```
GET    /api/v1/conversations               List conversations (paginated)
POST   /api/v1/conversations               Create conversation
GET    /api/v1/conversations/:id            Get conversation with all nodes
PATCH  /api/v1/conversations/:id            Rename a conversation
DELETE /api/v1/conversations/:id            Delete conversation

POST   /api/v1/conversations/:id/nodes      Create a standalone node (system prompt, manual)
POST   /api/v1/conversations/:id/complete    Send completion request (SSE streaming)
PATCH  /api/v1/nodes/:id                     Edit a node's content
DELETE /api/v1/nodes/:id                     Delete a node (and its subtree)

GET    /api/v1/models                        List available OpenRouter models
GET    /api/v1/settings                      Get app settings
PUT    /api/v1/settings                      Update app settings
POST   /api/v1/settings/test-connection      Test OpenRouter API key validity
```

### Planned REST Endpoints (not yet implemented)

```
POST   /api/v1/conversations/:id/regenerate   Regenerate an assistant response (F012)
POST   /api/v1/conversations/:id/merge       Merge two branches (F018)
GET    /api/v1/conversations/:id/export      Export conversation (F013)
POST   /api/v1/conversations/import          Import a conversation from file (F013)

GET    /api/v1/prompts                       System prompt templates (F019)
POST   /api/v1/prompts                       Create a custom prompt template (F019)
PATCH  /api/v1/prompts/:id                   Update a prompt template (F019)
DELETE /api/v1/prompts/:id                   Delete a prompt template (F019)

GET    /api/v1/search?q=...                  Full-text search (F014)
GET    /api/v1/usage                         Token usage statistics (F020)
```

### Completion Flow

1. Client sends `POST /conversations/:id/complete` with `{ parentNodeId, content, model }`
2. Server builds the message path (root → parentNode → new user message)
3. Server creates the user `Node` in DB
4. Server calls OpenRouter `/chat/completions` with the message array and chosen model
5. Server streams the response back via SSE (Server-Sent Events)
6. On completion, server saves the assistant `Node` in DB
7. Client receives the full node and adds it to the graph

## UI Layout

```
┌─────────────────────────────────┬──────────────────────────────────┐
│         CHAT PANEL              │         GRAPH PANEL              │
│                                 │                                  │
│  ┌───────────────────────┐      │      ○ System                   │
│  │ System: You are a...  │      │      │                          │
│  └───────────────────────┘      │      ○ User                     │
│  ┌───────────────────────┐      │     / \                         │
│  │ User: Explain X       │      │    ○   ○  ← branches            │
│  └───────────────────────┘      │    │   │                        │
│  ┌───────────────────────┐      │    ○   ○                        │
│  │ Assistant: X is...    │      │    │                             │
│  └───────────────────────┘      │    ● ← active node (highlighted)│
│                                 │                                  │
│  ┌───────────────────────┐      │                                  │
│  │ [Type a message...]   │      │  [Model: gpt-4o     ▼]          │
│  │              [Send ▶] │      │                                  │
│  └───────────────────────┘      │                                  │
└─────────────────────────────────┴──────────────────────────────────┘
```

## Feature Roadmap

### P0 — Core (Must ship)

| Feature | Spec | Status | Description |
|---------|------|--------|-------------|
| Project Setup | F001 | Done | Monorepo, TypeScript, Prisma, Tailwind, dev server |
| Conversation Tree Model | F002 | Done | Database layer, tree structure, path building |
| Chat Interface | F003 | Done | Chat panel, message display, input, streaming |
| Graph Visualization | F004 | Done | React Flow graph, dagre layout, interactions |
| Node Navigation & Branching | F005 | Done | Click-to-navigate, branching via model switch |
| Model Switching | F006 | Done | Switch models per-message, model selector dropdown |
| OpenRouter Integration | F007 | Done | API proxy, streaming, error handling |
| Streaming Responses | F008 | Done | Token-by-token display, abort, SSE protocol |
| Conversation Management | F009 | Done | Create, list, delete conversations; auto-titling |
| Settings & Configuration | F010 | Done | API key storage, test connection, model loading |
| Markdown Rendering | F011 | Done | Code blocks, syntax highlighting, LaTeX, tables |
| Regenerate & Edit+Resend | F012 | Done | Regenerate responses, edit and resend messages |

### P1 — Essential (High impact)

| Feature | Spec | Status | Description |
|---------|------|--------|-------------|
| Export & Import | F013 | Planned | Markdown/JSON export, ChatGPT import |
| Full-Text Search | F014 | Planned | Search across all conversations and nodes |
| Dark Mode & Theming | F015 | Done | Light/dark mode, theme system |
| Keyboard Shortcuts | F016 | Partial | Comprehensive keyboard shortcuts |
| Branch Comparison | F017 | Planned | Side-by-side branch comparison view |
| System Prompt Library | F019 | Planned | Save and reuse system prompt templates |
| Token & Cost Tracking | F020 | Planned | Display token usage, cost per message/conversation |

### P2 — Advanced (Differentiators)

| Feature | Spec | Status | Description |
|---------|------|--------|-------------|
| Branch Merging (DAG) | F018 | Planned | Merge branches, multi-parent nodes |

## Non-Functional Requirements

| Requirement | Status |
|-------------|--------|
| Streaming responses | Done — SSE streaming with abort support |
| All data in PostgreSQL | Done — Prisma ORM with migrations |
| Resizable panels | Done — drag-to-resize split pane (30%–70%) |
| Keyboard-friendly shortcuts | Partial (F016) — Ctrl+Enter/Esc in edit mode |
| API key stored server-side | Done — stored in Settings table via Prisma |
| Markdown rendering | Done (F011) — react-markdown with syntax highlighting |
| Dark mode | Done (F015) — Tailwind dark: classes, theme toggle |
