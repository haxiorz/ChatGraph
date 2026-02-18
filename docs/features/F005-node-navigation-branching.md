# F005 — Node Navigation & Branching

## Priority: P0 (Core feature)

## Status: DONE

## Summary

Users can click any node in the graph to navigate to it, seeing the conversation path up to that point. Sending a new message from any node creates a branch — a new child of that node, regardless of whether it already has children.

## Acceptance Criteria

- [x] Clicking a node in the graph sets it as the active node
- [x] Chat panel immediately shows the path from root to the newly active node
- [x] Sending a message from a node that already has children creates a sibling branch
- [x] The graph clearly shows branch points (nodes with multiple children)
- [x] After branching, the new branch becomes the active path
- [x] No data is lost when branching — existing branches remain intact
- [x] Users can navigate back and forth between branches freely

## Implementation Notes

- Clicking a node calls `conversationStore.setActiveNode(nodeId)`, which triggers `useActivePath` to recompute the chat path
- Branching works naturally: `useCompletion.sendMessage()` sends `parentNodeId = activeNodeId`, creating a new child regardless of existing children
- The dagre layout automatically handles visual branching (multiple children fan out)
- Branch navigator in chat (cycling siblings without using graph) is not yet implemented
- Branch count badges on graph nodes are not yet implemented

## Branching Behavior

### Example Flow

```
1. User starts conversation:
   System → User("What is X?") → Assistant("X is...")

2. User continues linearly:
   ... → Assistant("X is...") → User("Tell me more") → Assistant("Sure, X also...")

3. User clicks back on "Assistant: X is..." node and types a different question:
   ... → Assistant("X is...") → User("How about Y?")    ← NEW BRANCH
                              └→ User("Tell me more")    ← existing branch

4. The new branch becomes active. OpenRouter receives:
   [System, "What is X?", "X is...", "How about Y?"]
   NOT including "Tell me more" or its response.
```

### How Branching Works Internally

1. User clicks node N in graph → `activeNodeId = N`
2. User types a message and sends
3. Client sends `POST /complete` with `parentNodeId = N`
4. Server creates user node with `parentId = N`
5. Server builds path: root → ... → N → new user message
6. Server calls OpenRouter with this path
7. Server creates assistant node with `parentId = new user message`
8. Client receives both nodes and updates graph
9. The new assistant node becomes the active node

## Navigation Behavior

When the user clicks a different node:

1. If streaming is in progress → cancel the stream (abort controller)
2. Set `activeNodeId` to clicked node
3. Compute the path from root to this node using `buildPath()`
4. Re-render chat with the new path
5. Highlight the new active path in the graph

## UI Indicators

### Branch Points in Graph
Nodes with 2+ children are visually distinct:
- Small branch count badge: "2 branches" near the node
- Child edges fan out visually

### Branch Navigation in Chat
When viewing a node that has siblings (other branches from the same parent), show a subtle indicator:
```
          ┌──────────────────┐
          │ User: What is X? │
          └──────────────────┘
  ← 1/3 →                        ← branch navigator (arrows to cycle siblings)
          ┌──────────────────┐
          │ Assistant: X is… │
          └──────────────────┘
```
This allows cycling through branches without using the graph.

## Edge Cases

- **Branching from root**: The system node can have multiple children (different opening messages)
- **Branching from assistant node**: User sends a new user message as child of an assistant node (normal case)
- **Branching from user node**: Could happen if user wants to re-phrase — creates a sibling user node under the same parent. The completion then generates a new assistant child.
- **Deep branches**: Performance stays acceptable; only the active path is rendered in chat
- **Cancellation during branching**: If user cancels mid-stream, the user node is already saved. The partial assistant node can be discarded or saved as-is (with a "cancelled" flag in metadata).
