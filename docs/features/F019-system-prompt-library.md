# F019 — System Prompt Library

## Priority: P1 (Low effort, high utility)

## Status: PLANNED

## Summary

A library of saved system prompt templates that users can quickly apply when creating new conversations. Includes built-in presets and user-created custom prompts.

## Acceptance Criteria

- [ ] Prompt library accessible when creating a new conversation
- [ ] Built-in preset prompts (5-10 common personas)
- [ ] Users can save custom prompts with a name and description
- [ ] Prompts are editable and deletable
- [ ] Search/filter prompts by name
- [ ] Selecting a prompt fills the system prompt field
- [ ] Prompts persist in the database
- [ ] Last used prompt is remembered as the default

## Data Model

### New Table

```prisma
model Prompt {
  id          String   @id @default(uuid())
  name        String
  description String?
  content     String
  isBuiltIn   Boolean  @default(false)
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([lastUsedAt])
}
```

## API Endpoints

### `GET /api/v1/prompts`

List all prompts (built-in first, then custom sorted by `lastUsedAt`).

**Response:** `200`
```json
[
  {
    "id": "uuid",
    "name": "Code Reviewer",
    "description": "Reviews code for bugs, style, and best practices",
    "content": "You are an expert code reviewer...",
    "isBuiltIn": true,
    "lastUsedAt": "2026-02-17T...",
    "createdAt": "..."
  }
]
```

### `POST /api/v1/prompts`

Create a custom prompt.

**Request:**
```json
{
  "name": "My Custom Prompt",
  "description": "Optional description",
  "content": "You are a helpful assistant that..."
}
```

### `PATCH /api/v1/prompts/:id`

Update a prompt. Built-in prompts cannot be edited (return 403).

### `DELETE /api/v1/prompts/:id`

Delete a custom prompt. Built-in prompts cannot be deleted (return 403).

## Built-In Presets

Seed the database with these on first run:

| Name | Description | System Prompt (abbreviated) |
|------|-------------|---------------------------|
| **Default Assistant** | General-purpose helpful assistant | "You are a helpful assistant." |
| **Code Reviewer** | Reviews code quality and bugs | "You are an expert code reviewer. Analyze code for bugs, performance issues, security vulnerabilities, and style. Be specific and suggest fixes." |
| **Technical Writer** | Explains concepts clearly | "You are a technical writer. Explain concepts clearly and concisely, using examples and analogies. Adjust complexity to the user's level." |
| **Socratic Tutor** | Teaches through questions | "You are a Socratic tutor. Never give direct answers. Instead, ask guiding questions that help the user discover the answer themselves." |
| **Creative Writer** | Storytelling and creative content | "You are a creative writing assistant. Help with stories, dialogue, worldbuilding, and creative exercises. Be imaginative and vivid." |
| **Debate Partner** | Argues the opposing view | "You are a debate partner. Whatever position the user takes, argue the opposing view thoughtfully and rigorously. Be fair but challenging." |
| **Data Analyst** | Data interpretation and analysis | "You are a data analyst. Help interpret data, suggest analyses, write SQL/Python queries, and explain statistical concepts." |
| **Concise Mode** | Brief, direct responses | "You are a helpful assistant. Keep all responses concise — use bullet points, short paragraphs, and avoid filler. Maximum 3 paragraphs unless asked for more." |

## UI Design

### Prompt Selector in New Conversation Dialog

```
┌─────────────────────────────────────────────┐
│  New Conversation                      [X]  │
│─────────────────────────────────────────────│
│                                             │
│  System Prompt:                             │
│  ┌─────────────────────────────────────┐    │
│  │  [📚 Library ▼]                     │    │
│  │──────────────────────────────────── │    │
│  │  ★ Default Assistant                │    │
│  │  ★ Code Reviewer                    │    │
│  │  ★ Socratic Tutor                   │    │
│  │  ──────────────────                 │    │
│  │  My Custom Prompt 1                 │    │
│  │  My Custom Prompt 2                 │    │
│  │  ──────────────────                 │    │
│  │  + Create new prompt                │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ You are a helpful assistant.        │    │  ← editable textarea
│  │                                     │    │     (populated from selection)
│  └─────────────────────────────────────┘    │
│                                             │
│  [Cancel]                   [Create]        │
└─────────────────────────────────────────────┘
```

### Prompt Management Page

Accessible from Settings → "Manage Prompts":

```
┌─────────────────────────────────────────────┐
│  Prompt Library                             │
│  🔍 Search prompts...                       │
│─────────────────────────────────────────────│
│                                             │
│  BUILT-IN                                   │
│  ┌────────────────────────────────────────┐ │
│  │ ★ Code Reviewer                       │ │
│  │   Reviews code for bugs and style     │ │
│  │                              [View]   │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  CUSTOM                                     │
│  ┌────────────────────────────────────────┐ │
│  │ My Research Assistant                  │ │
│  │   Helps with academic research        │ │
│  │                    [Edit]  [Delete]    │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  [+ New Prompt]                             │
└─────────────────────────────────────────────┘
```

## Integration with Conversation Creation

When creating a new conversation (F009):
1. User selects a prompt from the library (or writes a custom one)
2. The system prompt content is used to create the root system node
3. The prompt's `lastUsedAt` is updated
4. The prompt ID is stored in conversation metadata for reference

## Edge Cases

- **Empty library**: Show the built-in presets; user can always write a custom prompt
- **Editing a prompt used by existing conversations**: Changes do NOT retroactively affect existing conversations (the prompt was copied into the system node at creation time)
- **Very long prompts**: Textarea grows up to 10 lines; scrollable beyond that. Show token count estimate.
- **Duplicate names**: Allowed — prompts are identified by ID, not name
- **Import/Export prompts**: Future enhancement — export prompts as JSON for sharing
