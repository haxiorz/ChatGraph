# F040: Desktop Notifications

## Overview

Browser desktop notifications when AI completions finish while the user is in a different tab. Reduces context-switching cost for long-running completions.

## Behavior

1. User enables "Desktop Notifications" in Settings > General
2. On first enable, the browser's native permission prompt is triggered
3. When an AI completion finishes (sendMessage or regenerate) and `document.hidden` is true, a browser `Notification` is fired
4. Notification shows the conversation title and model name
5. If the browser blocks notifications, a warning toast explains how to unblock

## Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `desktop_notifications` | `boolean` | `false` | Enable/disable desktop notifications |

Stored in the `Setting` database table via the existing settings API.

## Implementation

### Settings UI (`SettingsDialog.tsx`)

- Toggle button with Bell/BellOff icons
- Requests `Notification.requestPermission()` when enabling
- Shows warning toast if permission is denied or blocked

### Notification Logic (`useCompletion.ts`)

`notifyIfHidden(node)` — called from `onCompletionDone`:

- Checks `settings.desktop_notifications` is true
- Checks `document.hidden` is true (tab not focused)
- Checks `Notification.permission === 'granted'`
- Creates `new Notification(title, { body, icon })`

### Applies To

- `sendMessage` onDone
- `regenerate` onDone
- Does NOT apply to tournaments (multiple completions, noisy)

## Files Modified

| File | Changes |
|------|---------|
| `packages/client/src/types/index.ts` | Added `desktop_notifications` to `Settings` |
| `packages/client/src/hooks/useCompletion.ts` | Added `notifyIfHidden` helper |
| `packages/client/src/components/settings/SettingsDialog.tsx` | Added notification toggle UI |

## Dependencies

- Browser Notification API (standard, no library)
- Existing settings persistence (F010)
- Existing toast system (F025)
