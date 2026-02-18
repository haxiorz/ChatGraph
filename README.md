# ChatGraph

AI chat application with a graph-based conversation UI. Every message is a node in a tree — branch off at any point, explore multiple approaches simultaneously, and switch AI models on the fly.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Express](https://img.shields.io/badge/Express-4-000)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![License](https://img.shields.io/badge/License-MIT-green)

## Why ChatGraph?

Traditional AI chat interfaces are linear — once you go down a path, going back means losing context. ChatGraph fixes this:

- **Branch conversations** from any message to explore different directions
- **Switch AI models** mid-conversation and compare responses side-by-side
- **Visualize conversation structure** as an interactive graph with the chat panel alongside it
- **Navigate freely** — click any node in the graph to jump to that point in the conversation

```
[System Prompt]
    └── [User: "Explain recursion"]
            ├── [GPT-4: "Recursion is..."]
            │       └── [User: "Give me an example"]
            │               └── [GPT-4: "Here's factorial..."]
            └── [Claude: "Think of recursion as..."]   ← branch with different model
                    └── [User: "Compare to iteration"]
```

<img width="2554" height="1282" alt="obraz" src="https://github.com/user-attachments/assets/99277214-c4d0-4842-a314-98236bc3df19" />


## Features

**Core**
- Tree-based conversation model with branching and navigation
- Real-time streaming responses via SSE (Server-Sent Events)
- Model switching per message via [OpenRouter](https://openrouter.ai/)
- Split-pane UI — chat panel + interactive graph visualization
- Markdown rendering with syntax highlighting, LaTeX, and tables
- Regenerate responses and edit+resend messages
- Dark mode

**Graph & Visualization**
- Interactive node graph powered by React Flow with dagre layout
- Collapse/expand subtrees, zoom-to-fit, vertical/horizontal layout toggle
- Conversation heatmap overlay and fog-of-war minimap
- Node pinning, color labels, and freeform annotations
- Time-travel conversation replay
- Label filtering and saved viewport positions

**AI & Analytics**
- Multi-model tournament mode — compare responses from different models
- AI-powered auto-titling for conversations
- Smart summarization nodes with context pruning controls
- Context window visualizer with auto-summarize suggestions
- Token & cost dashboard with real pricing data
- Historical spending charts and CSV export
- Per-node token contribution breakdown and real-time cost ticker

**Productivity**
- Toast notification system and desktop notifications
- Activity feed event log
- Response quality tracking (thumbs up/down)
- Daily budget alerts
- Mermaid diagram rendering and HTML/CSS/JS live preview

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL 16** — running locally or in Docker
- **OpenRouter API key** — get one at [openrouter.ai](https://openrouter.ai/)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ChatGraph.git
cd ChatGraph
```

### 2. Install dependencies

```bash
npm install
```

This installs dependencies for both the client and server workspaces.

### 3. Set up the database

Start a PostgreSQL instance. If using Docker:

```bash
docker run -d \
  --name chatgraph-postgres \
  -e POSTGRES_USER=chatgraph \
  -e POSTGRES_PASSWORD=localdev \
  -e POSTGRES_DB=chatgraph \
  -p 5432:5432 \
  postgres:16
```

### 4. Configure environment

```bash
cp .env.example packages/server/.env
```

Edit `packages/server/.env` if your database connection differs from the defaults:

```
DATABASE_URL=postgresql://chatgraph:localdev@localhost:5432/chatgraph
PORT=3002
NODE_ENV=development
```

### 5. Run database migrations

```bash
cd packages/server
npx prisma migrate dev
cd ../..
```

### 6. Start the app

```bash
npm run dev
```

This starts both the frontend (http://localhost:5173) and backend (http://localhost:3002) concurrently.

### 7. Add your OpenRouter API key

Open the app in your browser and go to **Settings**. Enter your OpenRouter API key and test the connection. The key is stored server-side in the database — not in environment variables.

## Project Structure

```
ChatGraph/
├── packages/
│   ├── client/                 # React frontend (Vite, port 5173)
│   │   ├── src/
│   │   │   ├── components/     # chat/, graph/, layout/, settings/, shared/
│   │   │   ├── hooks/          # useConversation, useCompletion, useActivePath
│   │   │   ├── stores/         # Zustand stores (conversation, ui, settings)
│   │   │   ├── services/       # api.ts (REST), stream.ts (SSE)
│   │   │   ├── types/
│   │   │   └── utils/          # tree.ts, layout.ts (dagre)
│   │   └── vite.config.ts      # Proxy /api → backend
│   └── server/                 # Express backend (port 3002)
│       ├── src/
│       │   ├── routes/         # REST API endpoints
│       │   ├── services/       # Business logic
│       │   ├── middleware/      # Error handling, Zod validation
│       │   └── utils/
│       └── prisma/
│           └── schema.prisma   # Database schema
├── docs/                       # Specifications and architecture docs
├── package.json                # Root workspace config
└── .env.example
```

## Available Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start client + server in dev mode |
| `npm run build` | Build both packages |
| `npm run lint` | Lint all packages |
| `npm run typecheck` | Type-check all packages |
| `npm test` | Run tests |
| `npx prisma studio` | Open Prisma database browser (run from `packages/server`) |
| `npx prisma migrate dev` | Run database migrations (run from `packages/server`) |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Monorepo | npm workspaces |
| Frontend | React 18, TypeScript, Vite 6 |
| Graph UI | React Flow (v12) + dagre |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| Backend | Node.js, Express 4, TypeScript |
| ORM | Prisma 6 |
| Validation | Zod |
| Database | PostgreSQL 16 |
| AI API | OpenRouter (SSE streaming) |

## API Overview

The backend exposes a RESTful API under `/api/v1`:

- `GET/POST/DELETE /api/v1/conversations` — manage conversations
- `POST /api/v1/conversations/:id/complete` — send a completion request (SSE streaming)
- `POST /api/v1/conversations/:id/nodes` — create nodes
- `PATCH/DELETE /api/v1/nodes/:id` — edit or delete nodes
- `GET /api/v1/models` — list available OpenRouter models
- `GET/PUT /api/v1/settings` — app settings
- `GET /api/v1/usage` — token usage statistics
- `GET /api/v1/analytics` — conversation analytics

## License

MIT
