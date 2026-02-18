# F018 — Branch Merging (DAG Support)

## Priority: P2 (Killer feature — complex but transformative)

## Status: PLANNED

## Summary

Allow users to **merge** two conversation branches, combining context from parallel explorations into a single continuation. This converts the conversation from a strict tree into a DAG (Directed Acyclic Graph). Nodini is the only competitor with this feature — doing it well would be a major differentiator.

## Acceptance Criteria

- [ ] Users can select two branch endpoints and merge them
- [ ] A merge creates a special "merge node" that has two parents
- [ ] The message path for a merge node includes messages from both branches
- [ ] The merged context is sent to the AI, which can reference both branches
- [ ] The graph visually shows merge points (two edges converging)
- [ ] Merge nodes are visually distinct from regular nodes
- [ ] Users can continue chatting after a merge (normal branching resumes)
- [ ] Merges are reversible (delete the merge node to undo)

## Core Concept

```
[System] → [User: "Research X"] → [Asst: "X is..."]
                                        │
                         ┌──────────────┴──────────────┐
                         │                              │
                   [User: "Benefits?"]          [User: "Risks?"]
                   [Asst: "Benefits are..."]    [Asst: "Risks include..."]
                         │                              │
                         └──────────────┬──────────────┘
                                        │
                                  [Merge Node]
                                  "Summarizing both benefits
                                   and risks from above..."
                                        │
                                  [User: "Now compare"]
                                  [Asst: "Comparing..."]
```

The merge node's context includes messages from BOTH branches, giving the AI full awareness of parallel explorations.

## Data Model Changes

### Adding Multi-Parent Support

The current `Node` model has a single `parentId`. To support merges, add a junction table:

```prisma
model Node {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  parentId       String?      // Primary parent (for backward compat and tree traversal)
  parent         Node?        @relation("NodeTree", fields: [parentId], references: [id])
  children       Node[]       @relation("NodeTree")
  role           Role
  content        String
  model          String?
  metadata       Json?
  createdAt      DateTime     @default(now())
  isMergeNode    Boolean      @default(false)

  // Merge relationships
  mergeParents   MergeEdge[]  @relation("MergeChild")

  @@index([conversationId])
  @@index([parentId])
}

model MergeEdge {
  id           String @id @default(uuid())
  childId      String
  parentId     String
  branchOrder  Int    // Order of this branch in the merge (0, 1, ...)

  child        Node   @relation("MergeChild", fields: [childId], references: [id], onDelete: Cascade)

  @@unique([childId, parentId])
  @@index([childId])
}
```

### Path Building for Merge Nodes

When building the message path for a merge node, the system must:

1. Identify all merge parents
2. Find the common ancestor of both branches
3. Build paths from common ancestor to each merge parent
4. Interleave or concatenate the branch messages
5. Add a system instruction explaining the merge

**Merge path strategy:**
```
[Messages from root to common ancestor]
[--- Branch A context ---]
[Messages unique to Branch A]
[--- Branch B context ---]
[Messages unique to Branch B]
[--- Merged context ---]
[User's merge prompt or auto-generated summary request]
```

## API

### `POST /api/v1/conversations/:id/merge`

**Request:**
```json
{
  "branchEndpoints": [
    "node-id-branch-a-leaf",
    "node-id-branch-b-leaf"
  ],
  "prompt": "Summarize the key points from both explorations above.",
  "model": "openai/gpt-4o"
}
```

**Behavior:**
1. Validate both nodes belong to the same conversation
2. Find the common ancestor
3. Build the merged message path
4. Create a merge node with `isMergeNode: true`
5. Create `MergeEdge` records linking both branch endpoints
6. Set `parentId` to one of the branch endpoints (primary path for simple traversal)
7. Call OpenRouter with the merged context
8. Stream the response

**Response:** SSE stream (same protocol as `/complete`)

### Path Building Algorithm

```typescript
function buildMergePath(
  nodes: Map<string, Node>,
  mergeParentIds: string[],
): Message[] {
  // 1. Find common ancestor
  const pathA = walkToRoot(nodes, mergeParentIds[0])
  const pathB = walkToRoot(nodes, mergeParentIds[1])
  const commonAncestor = findCommonAncestor(pathA, pathB)

  // 2. Get shared prefix (root → common ancestor)
  const sharedPrefix = getPathFromTo(nodes, rootId, commonAncestor)

  // 3. Get unique suffixes for each branch
  const branchA = getPathFromTo(nodes, commonAncestor, mergeParentIds[0])
  const branchB = getPathFromTo(nodes, commonAncestor, mergeParentIds[1])

  // 4. Compose merged path
  return [
    ...sharedPrefix,
    { role: 'system', content: '--- The following is from exploration branch A ---' },
    ...branchA,
    { role: 'system', content: '--- The following is from exploration branch B ---' },
    ...branchB,
    { role: 'system', content: '--- Both branches are now merged. Respond considering all context above. ---' },
  ]
}
```

## UI Design

### Merge Initiation

**Method 1: Graph Drag**
Drag from one branch endpoint to another to initiate a merge.

**Method 2: Context Menu**
Right-click a node → "Merge with..." → select the other branch in the graph.

**Method 3: Merge Dialog**
From the graph toolbar, click "Merge" → select two branch endpoints.

### Merge Dialog

```
┌─────────────────────────────────────────────┐
│  Merge Branches                        [X]  │
│─────────────────────────────────────────────│
│                                             │
│  Branch A:  [Benefits exploration  ▼]       │
│  Branch B:  [Risks exploration     ▼]       │
│                                             │
│  Common ancestor: "Research X"              │
│  Branch A depth: 4 messages                 │
│  Branch B depth: 3 messages                 │
│  Total context: ~2,400 tokens               │
│                                             │
│  Merge prompt (optional):                   │
│  ┌─────────────────────────────────────┐    │
│  │ Summarize the key findings from     │    │
│  │ both explorations...                │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Model: [GPT-4o  ▼]                        │
│                                             │
│  ⚠️ This will use ~2,400 tokens of context  │
│                                             │
│  [Cancel]                     [Merge]       │
└─────────────────────────────────────────────┘
```

### Graph Visualization

Merge nodes are visually distinct:
- **Shape**: Diamond or hexagon (vs. rectangle for normal nodes)
- **Color**: Purple/violet (`#8b5cf6`)
- **Icon**: Merge icon (↗↘ converging)
- **Edges**: Two incoming edges from the merge parents, rendered with a special merge style

```
    ○ Benefits      ○ Risks
     \              /
      \            /
       ◇ Merge Node
       │
       ○ User: "Compare..."
```

## Context Window Awareness

Merging doubles the context from two branches. The merge dialog must:
- Show estimated token count for the merged context
- Warn if the merge would exceed the selected model's context window
- Suggest a model with a larger context window if needed

## Edge Cases

- **Merging more than 2 branches**: Support in the data model (MergeEdge supports N parents via `branchOrder`), but UI initially limits to 2
- **Merging a branch with itself**: Prevented — validation rejects identical endpoints
- **Nested merges**: A merge node can itself be a branch endpoint for another merge. Path building must recursively resolve merge parents.
- **Deleting a merge**: Deleting the merge node removes the MergeEdge records; original branches are unaffected
- **Very long merged context**: If both branches are deep, the merged context could be huge. Show token count and warn.
- **Conflicting information**: The AI may receive contradictory context from the two branches. The merge system prompt should instruct the AI to acknowledge and reconcile conflicts.
