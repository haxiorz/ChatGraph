# ChatGraph Feature Ideas & Competitive Analysis

> Generated 2026-02-18. A roadmap of feature ideas organized by category, informed by competitive analysis of graph-based LLM chat tools and emerging AI trends.

---

## Table of Contents

1. [Competitive Landscape](#competitive-landscape)
2. [Parity Features (What Others Have)](#parity-features)
3. [Differentiator Features (What Nobody Has)](#differentiator-features)
4. [Power User Features](#power-user-features)
5. [Collaboration & Sharing](#collaboration--sharing)
6. [Intelligence & Automation](#intelligence--automation)
7. [Data & Analytics](#data--analytics)
8. [Integration & Extensibility](#integration--extensibility)
9. [UX & Polish](#ux--polish)
10. [Summary Matrix](#summary-matrix)

---

## Competitive Landscape

| Project | Type | Key Strengths | Weaknesses |
|---------|------|---------------|------------|
| [LibreChat](https://github.com/danny-avila/LibreChat) | Self-hosted chat platform | Agents, MCP, Artifacts, Code Interpreter, multi-user auth | No graph visualization, branching is basic (ChatGPT-style arrows) |
| [LobeChat/LobeHub](https://github.com/lobehub/lobehub) | Agent platform | Multi-agent teams, plugin ecosystem, polished UI | Branch conversations exist but no graph view |
| [Forky](https://github.com/ishandhanani/forky) | Git-style LLM chat | Semantic 3-way merge, DAG structure, LCA computation | Small project, limited UI, no streaming |
| [GitChat](https://github.com/DrustZ/GitChat) | Research tool | Academic backing, branch/merge/rewire | Research prototype, not production-ready |
| [Threds.dev](https://news.ycombinator.com/item?id=46876469) | Research chat tool | Git-style branching/merging, versioned reasoning trees | Niche, limited feature set |
| [tldraw Branching Chat](https://github.com/tldraw/branching-chat-template) | Canvas-based chat | Infinite canvas, draggable nodes, visual connections | Template/starter kit, not a full product |
| [BranchGPT](https://www.branchgpt.xyz/) | Chrome extension | Tree visualization of ChatGPT branches, colored labels | Extension only, depends on ChatGPT |
| [ContextBranch](https://arxiv.org/abs/2512.13914) | Research paper | Checkpoint/branch/switch/inject primitives, 58% context reduction | Academic concept, no product |
| [CTK](https://metafunctor.com/post/2025-10-ctk/) | Conversation toolkit | Multi-provider import, unified tree format, plugin system | CLI-focused, no visual UI |

**ChatGraph's unique position**: The only project combining a full graph visualization (React Flow) with a production-ready chat interface, self-hosted backend, and tree-native data model. Most competitors either have branching without visualization, or visualization without a full chat experience.

---

## Parity Features

Features that competitors already offer. ChatGraph needs these to be competitive.

### P1. Artifacts / Rich Output Panel
**Seen in**: LibreChat, Claude, ChatGPT

A side panel that renders structured AI outputs: HTML previews, React components, SVG diagrams, Mermaid charts, and interactive code snippets. Instead of just text in the chat, the assistant can produce "artifacts" that render live.

- Detect code blocks with language tags and offer "Preview" button
- ~~Mermaid diagram rendering inline~~ ✅ Implemented (F037)
- ~~HTML/CSS/JS sandbox (iframe) for live previews~~ ✅ Implemented (F038)
- Artifact versioning: each edit creates a new version, diffs visible

### P4. System Prompt Library & Templates
**Already specced as F019** but not implemented.

Extend beyond the current spec:
- Community-shared prompt library (import from URL/JSON)
- Prompt variables/templates (`{{topic}}`, `{{language}}`) filled at conversation start
- Version history for prompts
- A/B testing: same input, different system prompts, compare outputs on graph

### P5. File & Image Attachments
**Seen in**: LibreChat, ChatGPT, Claude

- Attach files (PDF, images, CSV, code files) to any message node
- Images sent to vision-capable models
- File content extracted and included in context
- Drag-and-drop onto graph nodes or chat input
- Attachment thumbnails visible on graph nodes

---

## Differentiator Features

Features that no competitor fully offers. These would make ChatGraph unique.

### ~~D1. Multi-Model Tournament Mode~~ ✅ Implemented (F031)
~~Nobody has this.~~ — Send same prompt to 2-4 models simultaneously, side-by-side streaming comparison, pick winner to continue that branch. Tournament nodes get amber dashed border + Swords icon on graph.

Remaining ideas:
- Aggregate scoring over multiple rounds (ELO-style)
- ~~Cost/speed/quality comparison table per response~~ ✅ Implemented (F048)
- Tournament history: which model wins most often for which types of prompts

### D2. Conversation Blueprints (Replayable Templates)
**Nobody has this.**

Save an entire conversation tree structure as a reusable "blueprint" — a template with placeholder nodes. Then replay it with different models, different system prompts, or different user inputs.

- Extract a conversation tree into a blueprint (strip content, keep structure + roles)
- Fill in placeholders: system prompt, user messages, model selection
- "Replay" button that executes the entire blueprint automatically
- Compare results across replays as parallel branches
- Use case: regression testing prompts across model updates, prompt engineering workflows

### D3. Semantic Branch Diff & Merge
**Forky has basic merging. Nobody has visual semantic diff.**

Go beyond text diff — use embeddings to show semantic similarity between branches:

- Visual diff view: highlight semantic overlap vs. divergence between two branches
- Heatmap overlay on graph: color nodes by semantic similarity to a reference branch
- Smart merge: AI summarizes two branches into a merged continuation
- Conflict resolution UI when branches contain contradictory information
- "Cherry-pick" individual nodes from one branch into another

### ~~D4. Time-Travel Debugging / Conversation Replay~~ ✅ Implemented (F034)
~~Replay a conversation step by step, like a debugger~~ — Playback slider scrubs through the graph build-up chronologically. Play/pause, step controls, keyboard shortcuts (Space/Arrows/Esc), and "Fork from here" to branch from any historical point.

Remaining ideas:
- ~~Annotate nodes with notes ("this is where the model went wrong")~~ ✅ Implemented (F047)
- Share replay as a link or recording (useful for teaching/demos)

### ~~D5. Context Window Visualizer~~ ✅ Partially Implemented (F022)
~~Nobody visualizes this well.~~ — Basic token count progress bar implemented (green/yellow/red color-coded).

Remaining ideas:
- Color-coded segments: system prompt (gray), early context (faded), recent context (bright)
- ~~Per-node token contribution: how many tokens each message in the path contributes~~ ✅ Implemented (F045)
- Warning when approaching context limit with actionable suggestions:
  - "Summarize early messages" (auto-compress)
  - "Start a new branch from a summary node"
  - "Switch to a larger-context model"
- ~~Context pruning controls: manually exclude specific nodes from the path~~ ✅ Implemented (F051)

### ~~D7. Conversation Annotations & Pins~~ ✅ Partially Implemented (F029)
~~Pin important nodes, color-coded labels~~ — Node pinning with pinned panel + 6-color label system implemented. Stored in node metadata (no migration needed).

Remaining ideas:
- Freeform sticky notes attached to graph regions
- Drawing/highlighting overlay on the graph canvas
- ~~Filter graph view by tag/label~~ ✅ Implemented (F039)
- Annotation summary: "This conversation has 3 key insights, 2 errors, 1 action item"

### D10. Thought Graph Mode (Non-Linear Canvas)
**tldraw's template hints at this. Nobody has it in a chat product.**

Switch from tree layout to a freeform canvas mode:

- Nodes can be freely positioned (not just dagre auto-layout)
- Draw connections between any nodes (not just parent-child)
- Group nodes into clusters with labels
- Create "idea nodes" that are not messages — just text/sticky notes on the canvas
- Mixed mode: some areas are tree-structured conversations, others are freeform brainstorming
- Export canvas as an image


## Intelligence & Automation

### ~~I2. Smart Summarization Nodes~~ ✅ Implemented (F030)
~~Right-click any node → "Summarize above" creates a summary node~~ — Streaming AI summarization with distinct visual styling (dashed cyan border, ScrollText icon, summary badge in chat).

Remaining ideas:
- ~~Automatic summarization when context window is getting full~~ ✅ Implemented (F042)
- ~~Expanding a summary node shows the original messages it replaced~~ ✅ Implemented (F052)

### ~~I3. Conversation Analytics & Insights~~ ✅ Implemented (F032)
~~AI-generated conversation analysis~~ — Brain icon in header opens analytics panel. Analyzes full tree or active path. Returns: summary, key decisions, open questions, action items, health score (1-10), structural stats.

Remaining ideas:
- Topic clustering: group branches by subject matter
- Auto-trigger analytics on long conversations

### ~~I4. Auto-Title with AI~~ ✅ Implemented (F021)
~~Replace the current "first 60 chars" approach~~ — Now uses gpt-4o-mini to generate a 3-7 word title on first exchange.

Remaining ideas:
- ~~Re-title when conversation direction changes significantly~~ ✅ Implemented (F053)
- ~~Title suggestions: offer 3 options, user picks one~~ ✅ Implemented (F053)
- ~~Emoji prefix based on conversation topic~~ ✅ Implemented (F049)

---

## Data & Analytics

### ~~DA1. Token & Cost Dashboard~~ ✅ Implemented (F033)
~~Already specced as F020 but extend it~~ — Real dollar amounts in Usage dashboard (per-model and per-conversation) and per-message cost in chat bubbles. Uses OpenRouter model pricing data.

Remaining ideas:
- ~~Real-time cost ticker as you chat~~ ✅ Implemented (F046)
- ~~Budget alerts: "You've spent $5 today"~~ ✅ Implemented (F041)
- ~~Cost comparison: "This conversation cost $0.50 with GPT-4 vs. estimated $0.02 with GPT-4o-mini"~~ ✅ Implemented (F054)
- ~~Historical spending charts (daily/weekly/monthly)~~ ✅ Implemented (F043)
- ~~Export usage data as CSV~~ ✅ Implemented (F044)

### ~~DA2. Response Quality Tracking~~ ✅ Partially Implemented (F023)
~~Thumbs up/down on every assistant response~~ — Implemented: thumbs up/down stored in node metadata.

Remaining ideas:
- Track quality scores per model over time
- "Best model for me" recommendation based on ratings
- Quality vs. cost scatter plot
- Export quality data for analysis

### ~~DA3. Conversation Heatmap~~ ✅ Implemented (F035)
~~Visual heatmap overlay on the graph~~ — Toggle-able blue-to-red color overlay on nodes. Three metrics: token count, branch activity, recency. Gradient legend panel. Flame icon button with metric dropdown in graph toolbar.

Remaining ideas:
- Response time / model latency metric
- Toggleable layer stacking (multiple metrics at once)

---

## Integration & Extensibility

## UX & Polish

### UX1. Minimap Enhancements
- Clickable minimap regions for quick navigation
- Minimap shows annotations and labels
- ~~Fog-of-war: dim unexplored branches~~ ✅ Implemented (F050)
- Branch activity indicators (pulsing for recently active)

### ~~UX2. Graph Layout Options~~ ✅ Implemented (F028)
~~Toggle between: tree (current), radial, force-directed, horizontal~~ — Vertical/horizontal toggle implemented with localStorage persistence.
- ~~Collapse/expand subtrees~~ ✅ Implemented (F026)
- ~~Auto-focus: graph auto-pans to follow the active node~~ ✅ Implemented (F024)
- ~~Zoom-to-fit button with animation~~ ✅ Implemented (F027) — includes reset view, keyboard shortcuts
- ~~Saved viewport positions per conversation~~ ✅ Implemented (F036)

Remaining ideas:
- Radial and force-directed layouts

### UX3. Onboarding & Tutorials
- Interactive first-run tutorial
- Sample conversations demonstrating branching, model switching, etc.
- Tooltip hints for new users
- "What's new" changelog on update

### UX4. Mobile-Responsive Design
- Touch-friendly graph interaction (pinch-to-zoom, swipe between branches)
- Collapsible graph panel on small screens
- Bottom sheet for graph on mobile
- PWA support for "install as app"

### UX5. Accessibility
- Screen reader support for graph navigation
- Keyboard-only operation for all features
- High-contrast mode
- Reduced motion mode
- ARIA labels on all interactive elements

### UX6. Notification & Activity Feed _(toast subset implemented as F025)_
- ~~Toast notification system for async events~~ ✅ Implemented (F025)
- ~~Activity feed: "Model finished responding", "Export complete", "Background task done"~~ ✅ Implemented (F055)
- ~~Desktop notifications for long-running completions~~ ✅ Implemented (F040)
