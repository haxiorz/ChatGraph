# Frontend Coding Guidelines

## Principles

1. **KISS** — Prefer the simplest solution that works. No premature abstractions.
2. **DRY** — Extract shared logic into hooks or utility functions, but only after it appears in 2+ places.
3. **SOLID (adapted for React)**
   - **S**: One component = one responsibility. A `MessageBubble` renders a message — it doesn't fetch data.
   - **O**: Components are open for extension via props/composition, closed for modification.
   - **L**: Any component accepting `children` should work with any valid child.
   - **I**: Props interfaces should be minimal. Don't pass an entire `Conversation` when you only need `title`.
   - **D**: Components depend on abstractions (hooks, services), not concrete implementations.
4. **Clean Code** — Code should read like prose. If a function needs a comment to explain what it does, rename it.

## TypeScript

- **Strict mode** enabled (`"strict": true` in tsconfig).
- **No `any`**. Use `unknown` and type guards to narrow.
- **No type assertions** (`as X`) unless interfacing with untyped libraries.
- Define types in `types/index.ts` for shared types. Component-specific types live next to the component.
- Use discriminated unions for state that has multiple shapes:
  ```typescript
  type StreamState =
    | { status: 'idle' }
    | { status: 'streaming'; content: string }
    | { status: 'error'; error: string }
  ```

## Components

- **Named exports only**. No `export default`.
- **Functional components** only. No class components.
- **Props type** named `{ComponentName}Props`:
  ```typescript
  interface MessageBubbleProps {
    role: 'user' | 'assistant' | 'system'
    content: string
  }

  export function MessageBubble({ role, content }: MessageBubbleProps) { ... }
  ```
- **Colocation**: Keep component, styles, and tests close together.
- Keep components under ~100 lines. If it grows, split into sub-components.

## Hooks

- Custom hooks start with `use` and live in `hooks/`.
- A hook does **one thing**: `useCompletion` handles completions — it doesn't manage UI state.
- Return objects (not arrays) for hooks with 3+ return values for readability.

## State Management

- **Local state first** (`useState`) — only promote to Zustand when state is shared across components.
- **Zustand stores are flat** — avoid deeply nested state. Normalize data:
  ```typescript
  // Good: flat map
  nodes: Map<string, Node>

  // Bad: nested tree
  conversation: { nodes: [{ children: [...] }] }
  ```
- **Derive, don't duplicate** — compute `activePath` from `nodes` + `activeNodeId` in a selector, not as separate state.

## Styling

- **Tailwind utility classes** for all styling.
- **No inline `style` props** unless dynamic values are required (e.g., panel width).
- Extract repeated class combinations into component composition, not `@apply`:
  ```typescript
  // Good: composition
  function Card({ children }: { children: React.ReactNode }) {
    return <div className="rounded-lg border bg-white p-4 shadow-sm">{children}</div>
  }

  // Avoid: @apply in CSS files
  ```
- Use Tailwind's color palette consistently. Define semantic colors in `tailwind.config.ts` if needed:
  ```
  userMessage: colors.blue[50]
  assistantMessage: colors.green[50]
  ```

## API Calls

- All API calls go through `services/api.ts`.
- Use plain `fetch` — no axios or other HTTP library needed.
- Handle errors at the call site, not in the service layer (the service returns typed data or throws).
- Streaming uses `ReadableStream` — see `services/stream.ts`.

## File Naming

| Type        | Convention          | Example                    |
| ----------- | ------------------- | -------------------------- |
| Component   | PascalCase.tsx      | `MessageBubble.tsx`        |
| Hook        | camelCase.ts        | `useCompletion.ts`         |
| Store       | camelCase.ts        | `conversationStore.ts`     |
| Service     | camelCase.ts        | `api.ts`                   |
| Type file   | camelCase.ts        | `index.ts`                 |
| Utility     | camelCase.ts        | `tree.ts`                  |

## Testing Strategy

- **Unit tests**: Utility functions, tree traversal logic, type guards
- **Component tests**: React Testing Library for key components
- **Integration tests**: Full flow tests (type message → see response)
- Test files live next to the code: `tree.ts` → `tree.test.ts`

## Performance

- Memoize expensive React Flow node renders with `React.memo`.
- Use Zustand selectors to prevent unnecessary re-renders:
  ```typescript
  // Good: subscribe to just what you need
  const activeNodeId = useConversationStore(s => s.activeNodeId)

  // Bad: subscribe to entire store
  const store = useConversationStore()
  ```
- Debounce graph layout recalculations on rapid node additions (during streaming).
