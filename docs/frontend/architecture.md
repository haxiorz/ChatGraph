# Frontend Architecture

## Overview

The frontend is a React + TypeScript SPA built with Vite, located in `packages/client/`. It renders a split-pane layout: chat panel (left) and graph panel (right).

## Technology

| Concern          | Library                    | Purpose                              | Status      |
| ---------------- | -------------------------- | ------------------------------------ | ----------- |
| UI framework     | React 18                   | Component-based UI                   | Installed   |
| Language         | TypeScript 5.7 (strict)    | Type safety                          | Installed   |
| Bundler          | Vite 6                     | Fast HMR, ESBuild-based             | Installed   |
| Graph rendering  | @xyflow/react (React Flow v12) | Interactive node-based graphs    | Installed   |
| Graph layout     | elkjs                      | Async layout engine (layered, tree, force, radial) | Installed   |
| Styling          | Tailwind CSS 4             | Utility-first CSS                    | Installed   |
| State management | Zustand 5                  | Lightweight global state             | Installed   |
| HTTP client      | fetch (native)             | API calls; SSE for streaming         | Built-in    |
| Routing          | React Router v7            | URL-based navigation (`/c/:id`)      | Installed   |
| Markdown         | react-markdown             | Rich Markdown rendering              | Not yet installed |
| Syntax highlight | rehype-highlight           | Code block syntax highlighting       | Not yet installed |
| Math             | remark-math + rehype-katex | LaTeX math rendering                 | Not yet installed |

## Directory Structure

All files listed below are implemented and type-check cleanly.

```
packages/client/src/
├── components/
│   ├── chat/
│   │   ├── ChatPanel.tsx          # Chat panel — renders active path messages
│   │   ├── ConversationList.tsx   # Home screen — list/create/delete conversations
│   │   ├── MessageBubble.tsx      # Single message (role-based styling)
│   │   ├── MessageInput.tsx       # Textarea + send/stop button + model selector
│   │   └── StreamingMessage.tsx   # Live token display with blinking cursor
│   ├── graph/
│   │   ├── GraphPanel.tsx         # React Flow container with dagre layout
│   │   └── ConversationNode.tsx   # Custom node (role color, content preview, model badge)
│   ├── layout/
│   │   ├── AppLayout.tsx          # Split-pane shell with resizable divider
│   │   └── Header.tsx             # Top bar (back nav, title, node count, settings gear)
│   ├── settings/
│   │   └── SettingsDialog.tsx     # Modal for API key input + test connection
│   └── shared/
│       ├── ModelSelector.tsx      # Searchable model dropdown (opens upward)
│       └── LoadingSpinner.tsx     # Spinner component
├── hooks/
│   ├── useConversation.ts         # Loads conversation data on route change
│   ├── useCompletion.ts           # Sends messages, manages SSE stream + abort
│   └── useActivePath.ts           # Derives path from nodes Map + activeNodeId
├── stores/
│   ├── conversationStore.ts       # Conversations list, nodes Map, activeNodeId
│   ├── uiStore.ts                 # Panel width, stream state, selected model, abort
│   └── settingsStore.ts           # Settings from server, models list, hasApiKey
├── services/
│   ├── api.ts                     # REST client (all endpoints)
│   └── stream.ts                  # SSE consumer with typed callbacks
├── types/
│   └── index.ts                   # Conversation, Node, Model, Settings, StreamState
├── utils/
│   ├── tree.ts                    # buildPath, getChildren, getRootNodes
│   └── layout.ts                  # dagre-based graph layout computation
├── index.css                      # Tailwind import + React Flow styles
├── App.tsx                        # BrowserRouter with / and /c/:id routes
└── main.tsx                       # React root render
```

### Notable differences from original spec

- **No `GraphControls.tsx`** — React Flow's built-in `<Controls />` and `<MiniMap />` are used directly in `GraphPanel.tsx`
- **No `ResizeHandle.tsx`** — Resize logic is inline in `AppLayout.tsx` (simple `onMouseDown` handler on a div)
- **Added `ConversationList.tsx`** — Home screen for browsing/creating conversations (not in original spec)
- **Added `SettingsDialog.tsx`** — Settings modal in `components/settings/` (spec had it as part of F010)

## State Architecture

### Zustand Stores

**conversationStore** — Source of truth for conversation data.

```typescript
interface ConversationStore {
  conversations: Conversation[]
  activeConversationId: string | null
  nodes: Map<string, ConversationNode>    // All nodes for active conversation
  activeNodeId: string | null             // Currently selected node

  // Actions
  loadConversations: () => Promise<void>
  loadConversation: (id: string) => Promise<void>  // Loads nodes, auto-selects latest leaf
  setActiveNode: (nodeId: string) => void
  addNode: (node: ConversationNode) => void         // Adds node + sets it as active
  removeNode: (nodeId: string) => void
  setConversations: (conversations: Conversation[]) => void
  reset: () => void
}
```

**uiStore** — UI-only state that doesn't touch the server.

```typescript
interface UIStore {
  chatPanelWidth: number                  // Percentage (30-70), default 50
  streamState: StreamState                // { status: 'idle' | 'streaming' | 'error', ... }
  selectedModel: string                   // Default: 'openai/gpt-4o-mini'
  abortController: AbortController | null // For cancelling active streams
  settingsOpen: boolean

  setChatPanelWidth: (width: number) => void
  setStreamState: (state: StreamState) => void
  setSelectedModel: (model: string) => void
  setAbortController: (controller: AbortController | null) => void
  setSettingsOpen: (open: boolean) => void
}

type StreamState =
  | { status: 'idle' }
  | { status: 'streaming'; content: string }
  | { status: 'error'; error: string }
```

**settingsStore** — Server-side settings + model list.

```typescript
interface SettingsStore {
  settings: Settings                      // Key-value settings from server
  models: OpenRouterModel[]               // Cached model list from OpenRouter
  hasApiKey: boolean                      // Derived from settings
  loaded: boolean                         // Whether initial load is complete

  loadSettings: () => Promise<void>
  loadModels: () => Promise<void>
  updateSetting: (key: string, value: unknown) => Promise<void>
}
```

### Data Flow

```
User types message
    → useCompletion.sendMessage(content)
    → AbortController created, streamState → 'streaming'
    → POST /conversations/:id/complete (SSE)
    → onUserNode → conversationStore.addNode(userNode)
    → onToken → uiStore.streamState.content accumulates
    → StreamingMessage renders partial content with blinking cursor
    → onDone → conversationStore.addNode(assistantNode), streamState → 'idle'
    → Graph re-renders with new nodes via dagre layout
```

## Graph Visualization

### React Flow Integration

Each `ConversationNode` in the database maps to a React Flow node via `GraphPanel.tsx`. The graph is rendered as a **top-to-bottom tree** using dagre layout (via `utils/layout.ts`).

A single custom node type `conversation` is registered, rendered by `ConversationNode.tsx` (memoized with `React.memo`).

**Node styling by role:**
- `system` — Gray background (`bg-gray-200`), gear icon, shows "System prompt" text
- `user` — Blue background (`bg-blue-100`), user icon, first 50 chars of message
- `assistant` — Green background (`bg-green-100`), sparkle icon, first 50 chars + model badge

**Active node indicator:** Blue border (`border-blue-500`) with shadow glow.

**Edges:**
- Parent → Child smooth step edges
- Active path edges: thicker (2.5px) and blue (`#3B82F6`)
- Inactive edges: thin (1.5px) and gray (`#9CA3AF`)

**Built-in controls:** React Flow `<Controls />`, `<MiniMap />`, and `<Background />` components.

### Graph Interactions

| Action             | Behavior                                   | Implemented |
| ------------------ | ------------------------------------------ | ----------- |
| Click node         | Set as active node; chat shows path to it  | Yes         |
| Scroll wheel       | Zoom in/out                                | Yes (React Flow built-in) |
| Drag background    | Pan                                        | Yes (React Flow built-in) |
| Fit view           | Auto-zoom to show entire graph on load     | Yes (`fitView` prop) |
| Drag nodes         | Disabled (`nodesDraggable={false}`)         | N/A         |
| Connect nodes      | Disabled (`nodesConnectable={false}`)       | N/A         |

**MiniMap** colors: Gray for system, Blue for user, Green for assistant.

## Streaming

The frontend uses `fetch` with `ReadableStream` to consume Server-Sent Events (`services/stream.ts`). The `useCompletion` hook orchestrates the flow:

1. Creates an `AbortController` (cancels any previous in-flight stream)
2. Sets `streamState` to `{ status: 'streaming', content: '' }`
3. Calls `consumeStream()` which parses SSE events from the response body
4. `onUserNode` — adds the user node to the store immediately
5. `onToken` — appends token text to `streamState.content`; `StreamingMessage` renders it with a blinking cursor
6. `onDone` — adds the assistant node to the store, sets `streamState` back to `idle`
7. `onError` — sets `streamState` to `{ status: 'error', error: message }`

The "Stop" button calls `abortController.abort()`, which cancels the fetch and resets state.

## Error Handling

Current implementation:
- API errors → displayed inline in the chat panel as a red error box
- Streaming errors → shown via `streamState.error` in the chat
- Missing API key → warning banner on the conversation list page

Not yet implemented:
- Toast notifications
- Retry with exponential backoff
- React error boundaries per panel
