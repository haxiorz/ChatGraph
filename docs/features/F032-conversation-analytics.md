# F032 - Conversation Analytics & Insights

## Overview

AI-powered analysis of conversation trees providing: summary, key decisions, open questions, action items, health score, and structural stats.

## User Flow

1. Open a conversation
2. Click the **Brain** icon in the header bar
3. Analytics panel slides in from the right
4. Choose scope: "Full Tree" (entire conversation) or "Active Path" (root to current node)
5. Click "Analyze" - sends conversation to the selected model
6. Results display: health score gauge, stats badges, summary, and collapsible sections for decisions/questions/action items

## Architecture

### Backend

**Endpoint:** `POST /api/v1/conversations/:id/analyze`

**Request body:**
```json
{
  "model": "openai/gpt-4o-mini",
  "targetNodeId": "uuid (optional - for active path mode)"
}
```

**Response:**
```json
{
  "summary": "A 2-3 sentence summary",
  "decisions": ["Decision 1", "Decision 2"],
  "openQuestions": ["Question 1"],
  "actionItems": ["Action 1"],
  "healthScore": 7,
  "healthAssessment": "Productive conversation with clear direction",
  "branchCount": 3,
  "nodeCount": 15,
  "modelsMentioned": ["openai/gpt-4o", "anthropic/claude-3.5-sonnet"]
}
```

**Implementation:** `analyticsService.analyzeConversation()` formats the conversation tree (with indentation showing branching structure), sends it to OpenRouter with a structured analysis prompt (temperature 0.3), and parses the JSON response.

### Frontend

**UI Store:** `analyticsOpen` boolean + `setAnalyticsOpen()` toggle.

**API:** `api.analyzeConversation(id, model, targetNodeId?)` - POST request returning `ConversationAnalytics`.

**Component:** `AnalyticsPanel.tsx` - Slide-in panel with:
- Scope toggle (Full Tree / Active Path)
- Model display (uses currently selected model)
- Analyze button with loading state
- Results: health score gauge, stats badges, summary, collapsible sections

**Integration:**
- `Header.tsx` - Brain icon button (visible when conversation active)
- `AppLayout.tsx` - AnalyticsPanel rendered in AnimatePresence

## Files

| File | Action |
|------|--------|
| `server/src/services/analyticsService.ts` | Created |
| `server/src/routes/analytics.ts` | Created |
| `server/src/app.ts` | Modified - mount analytics route |
| `client/src/types/index.ts` | Modified - `ConversationAnalytics` interface |
| `client/src/services/api.ts` | Modified - `analyzeConversation` |
| `client/src/stores/uiStore.ts` | Modified - `analyticsOpen` |
| `client/src/components/shared/AnalyticsPanel.tsx` | Created |
| `client/src/components/layout/Header.tsx` | Modified - Brain icon button |
| `client/src/components/layout/AppLayout.tsx` | Modified - render AnalyticsPanel |
