# F010 — Settings & Configuration

## Priority: P2 (Important but not blocking)

## Status: DONE (partial)

## Summary

A settings page/dialog where users configure their OpenRouter API key, default model, and other preferences.

## Acceptance Criteria

- [x] Settings accessible via a gear icon in the header
- [x] OpenRouter API key input (masked, with "test connection" button)
- [ ] Default model selection — not yet in settings UI
- [ ] Default system prompt template — not yet in settings UI
- [ ] Default temperature slider (0.0 - 2.0) — not yet in settings UI
- [ ] Theme toggle (light/dark) — not yet implemented (F015)
- [x] Settings persisted in the database `Settings` table

## Implementation Notes

- `SettingsDialog.tsx` — modal dialog with API key input, test connection button, save
- API key stored as `openrouter_api_key` in the `Setting` table (not encrypted yet)
- Test connection calls `POST /api/v1/settings/test-connection` which hits OpenRouter's `/models` endpoint
- On save, models list is reloaded to pick up the new API key
- Warning banner shown on conversation list page when no API key is configured
- API key is currently returned in full from `GET /settings` — should be masked in future

## Settings Schema

| Key                     | Type    | Default                          |
| ----------------------- | ------- | -------------------------------- |
| `openrouter_api_key`    | string  | (required, encrypted at rest)    |
| `default_model`         | string  | `"openai/gpt-4o"`               |
| `default_system_prompt` | string  | `"You are a helpful assistant."` |
| `default_temperature`   | number  | `0.7`                            |
| `theme`                 | string  | `"dark"`                         |

## API Endpoints

### `GET /api/v1/settings`
Returns all settings as key-value pairs.

**Response:** `200`
```json
{
  "default_model": "openai/gpt-4o",
  "default_system_prompt": "You are a helpful assistant.",
  "default_temperature": 0.7,
  "theme": "light"
}
```

Note: `openrouter_api_key` is NEVER returned to the client. The client only sees a boolean `hasApiKey: true/false`.

### `PUT /api/v1/settings`
Update one or more settings.

**Request:**
```json
{
  "default_model": "anthropic/claude-3.5-sonnet",
  "default_temperature": 0.5
}
```

### `POST /api/v1/settings/test-connection`
Test the OpenRouter API key by making a lightweight API call.

**Response:** `200`
```json
{ "valid": true, "message": "Connection successful" }
```

## UI Component: SettingsDialog

Modal dialog with tabs or sections:

```
┌───────────────────────────────────────┐
│  Settings                       [X]   │
│───────────────────────────────────────│
│                                       │
│  OpenRouter API Key                   │
│  ┌─────────────────────────┐          │
│  │ sk-or-••••••••••••••••  │ [Test]   │
│  └─────────────────────────┘          │
│                                       │
│  Default Model                        │
│  ┌─────────────────────────┐          │
│  │ GPT-4o               ▼  │          │
│  └─────────────────────────┘          │
│                                       │
│  Default System Prompt                │
│  ┌─────────────────────────┐          │
│  │ You are a helpful...    │          │
│  └─────────────────────────┘          │
│                                       │
│  Temperature: 0.7                     │
│  ──────────●──────────────            │
│  0.0              2.0                 │
│                                       │
│  [Cancel]              [Save]         │
└───────────────────────────────────────┘
```

## First-Run Experience

If no API key is configured:
1. App shows a welcome screen / setup wizard
2. Prompts user to enter their OpenRouter API key
3. Tests the connection
4. On success, redirects to main app with a new conversation created

## Security

- API key is stored server-side in the `Settings` table, **encrypted at rest** using a server-side secret (via `ENCRYPTION_KEY` env var)
- It is never sent back to the client (write-only from client perspective)
- The "test connection" endpoint validates the key server-side
- Encryption uses AES-256-GCM; the key is derived from `ENCRYPTION_KEY` via PBKDF2
