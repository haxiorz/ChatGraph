# F017 — Side-by-Side Branch Comparison

## Priority: P1 (Unique differentiator)

## Status: PLANNED

## Summary

Compare two conversation branches side by side in a split view. This is the visual payoff of ChatGraph's branching model — users can see how different models, prompts, or approaches diverged from the same point. No competitor does this well.

## Acceptance Criteria

- [ ] "Compare" action available on any node with 2+ children (branch point)
- [ ] Opens a side-by-side comparison view showing two branches
- [ ] Each side shows the messages from the branch point downward
- [ ] Messages are vertically aligned by depth for easy scanning
- [ ] Model badges clearly visible on each side
- [ ] User can select which two branches to compare (if >2 exist)
- [ ] Comparison view can be dismissed to return to normal layout
- [ ] Active branch can be switched from the comparison view
- [ ] Text diff highlighting between matching message pairs (optional, stretch)

## Entry Points

### From Graph Panel

Right-click a node with 2+ children → "Compare branches":

```
┌─────────────────────┐
│  Compare branches    │
│  Delete subtree      │
│  Copy content        │
└─────────────────────┘
```

### From Chat Panel (Branch Navigator)

When the branch navigator `← 1/3 →` is visible, a "Compare" button appears:

```
  ← 1/3 →  [Compare]
```

### Keyboard Shortcut

`Ctrl+Shift+M` — Compare branches from the current branch point.

## UI Layout

### Comparison Mode

The chat panel splits into two columns. The graph panel remains visible (or collapses to give more space).

```
┌──────────────────────────┬──────────────────────────┬──────────────┐
│     Branch A (GPT-4o)    │   Branch B (Claude)      │   Graph      │
│──────────────────────────│──────────────────────────│              │
│                          │                          │     ○        │
│  Shared context above:   │  Shared context above:   │    / \       │
│  (collapsed/dimmed)      │  (collapsed/dimmed)      │   ●A  ●B    │
│──────────────────────────│──────────────────────────│              │
│  User: Explain recursion │  User: Explain recursion │              │
│                          │                          │              │
│  GPT-4o:                 │  Claude:                 │              │
│  Recursion is when a     │  Think of recursion as   │              │
│  function calls itself   │  looking into two mirrors│              │
│  with a modified...      │  facing each other...    │              │
│                          │                          │              │
│  User: Give an example   │  User: Compare to loops  │              │
│                          │                          │              │
│  GPT-4o:                 │  Claude:                 │              │
│  Here's factorial:       │  While loops iterate     │              │
│  def fact(n):            │  explicitly, recursion   │              │
│    if n <= 1: return 1   │  breaks problems into    │              │
│    return n * fact(n-1)  │  self-similar pieces...  │              │
│                          │                          │              │
│  [← Back to chat]        │  [← Back to chat]        │              │
└──────────────────────────┴──────────────────────────┴──────────────┘
```

### Branch Selector

When more than 2 branches exist, show dropdowns at the top of each column:

```
┌──────────────────────────┬──────────────────────────┐
│  Branch: [GPT-4o ▼]     │  Branch: [Claude  ▼]     │
│──────────────────────────│──────────────────────────│
```

## Data Model

No schema changes needed. Comparison is a purely frontend feature:

1. Identify the **branch point** (the common ancestor node)
2. Enumerate all child subtrees from that node
3. For each selected branch, compute the path from branch point to deepest leaf
4. Render both paths in parallel columns

### State

```typescript
interface CompareState {
  isComparing: boolean
  branchPointId: string | null
  leftBranchId: string | null    // ID of the first child node (start of branch)
  rightBranchId: string | null   // ID of the second child node
}
```

Add to `uiStore`.

## Shared Context Handling

Messages above the branch point are **shared** between both branches. In comparison mode:
- Show them once at the top, collapsed/dimmed
- Or show them in both columns identically (grayed out)
- A divider marks where the branches diverge: `── branches diverge here ──`

## Text Diff (Stretch Goal)

For branches where the user message is the same but assistant responses differ, highlight the differences:
- Green background for text unique to Branch A
- Blue background for text unique to Branch B
- Use a simple word-level diff algorithm

## Graph Integration

While in comparison mode:
- Both compared branches are highlighted in the graph (different colors)
- The branch point node is emphasized
- Clicking a node in either branch column sets it as active on that side

## Edge Cases

- **Branches of different lengths**: The shorter branch shows empty space at the bottom; align by depth (position), not by count
- **Single-message branches**: Still shows comparison, just with one message each
- **Comparing more than 2**: UI supports exactly 2 columns; user selects which 2 to compare. A future enhancement could support 3+ columns.
- **Comparison during streaming**: Disabled — cannot enter comparison mode while a stream is active
- **Mobile/narrow viewport**: Comparison requires ≥1024px width; show a warning on smaller screens
