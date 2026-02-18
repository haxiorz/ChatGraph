# F016 — Keyboard Shortcuts

## Priority: P1 (Power user retention)

## Status: PLANNED

## Summary

Comprehensive keyboard shortcuts for all major actions. Power users should be able to navigate conversations, switch models, manage branches, and control the UI entirely from the keyboard.

## Acceptance Criteria

- [ ] All shortcuts listed below are functional
- [ ] Shortcuts do not conflict with browser defaults
- [ ] Shortcuts are disabled when a text input/textarea is focused (except where noted)
- [ ] Shortcut help dialog accessible via `?` key
- [ ] Shortcuts shown as tooltips on relevant buttons
- [ ] Shortcuts work across all panels (chat, graph, sidebar)

## Shortcut Map

### Global (always active)

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Ctrl+K` | Open search | Command palette |
| `Ctrl+N` | New conversation | Opens new conversation dialog |
| `Ctrl+,` | Open settings | Settings dialog |
| `Ctrl+B` | Toggle sidebar | Show/hide conversation list |
| `Ctrl+\` | Toggle graph panel | Show/hide graph |
| `Ctrl+D` | Toggle dark mode | Switch theme |
| `?` | Show shortcuts help | Opens shortcut reference dialog |
| `Escape` | Close dialog/modal | Closes any open dialog |

### Chat Panel

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Enter` | Send message | When input is focused |
| `Shift+Enter` | New line | When input is focused |
| `Ctrl+Shift+R` | Regenerate last response | Creates a new branch |
| `Ctrl+Shift+S` | Stop generating | Abort active stream |
| `Ctrl+Shift+C` | Copy last response | Copies last assistant message |
| `↑` (in empty input) | Edit last user message | Loads message for editing |
| `Ctrl+E` | Edit selected message | Enter inline edit mode |
| `/` | Focus chat input | When not in an input field |

### Graph Panel

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Ctrl+Shift+F` | Fit graph to view | Zoom to show all nodes |
| `Ctrl+0` | Reset zoom | 100% zoom |
| `Ctrl+=` / `Ctrl+-` | Zoom in / out | Graph zoom |
| `↑` / `↓` | Navigate parent/child | Move along active path |
| `←` / `→` | Navigate siblings | Cycle between branches |
| `Home` | Jump to root node | Navigate to conversation root |
| `End` | Jump to deepest leaf | Navigate to the deepest node on active path |

### Model Switching

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Ctrl+/` | Open model selector | Focus search in model dropdown |
| `1-9` (in model selector) | Quick select model | Select by position |

### Conversation List

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Ctrl+Shift+↑` | Previous conversation | In sidebar |
| `Ctrl+Shift+↓` | Next conversation | In sidebar |
| `Ctrl+Shift+D` | Delete conversation | With confirmation |

## Implementation

### `useKeyboardShortcuts` Hook

Central hook that registers all global shortcuts:

```typescript
export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if user is typing in an input/textarea (except for Enter/Shift+Enter)
      const isTyping = ['INPUT', 'TEXTAREA'].includes(
        (e.target as HTMLElement).tagName
      )

      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        openSearch()
      }

      if (!isTyping) {
        if (e.key === '/' ) {
          e.preventDefault()
          focusChatInput()
        }
        if (e.key === '?') {
          e.preventDefault()
          openShortcutsHelp()
        }
      }

      // ... more shortcuts
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
```

### Platform Awareness

- On macOS: `Ctrl` is replaced with `Cmd` (`metaKey`)
- Detect platform via `navigator.platform` or `navigator.userAgent`
- Display the correct modifier key in tooltips and help dialog

## Help Dialog

Triggered by pressing `?`:

```
┌─────────────────────────────────────────────┐
│  Keyboard Shortcuts                    [X]  │
│─────────────────────────────────────────────│
│                                             │
│  GENERAL                                    │
│  Ctrl+K        Search conversations         │
│  Ctrl+N        New conversation             │
│  Ctrl+B        Toggle sidebar               │
│  Ctrl+\        Toggle graph panel           │
│  Ctrl+,        Settings                     │
│                                             │
│  CHAT                                       │
│  Enter         Send message                 │
│  Shift+Enter   New line                     │
│  Ctrl+Shift+R  Regenerate response          │
│  Ctrl+Shift+S  Stop generating              │
│  /             Focus input                  │
│                                             │
│  GRAPH                                      │
│  ↑ ↓           Navigate parent/child        │
│  ← →           Navigate siblings            │
│  Ctrl+Shift+F  Fit to view                  │
│  Home/End      Jump to root/leaf            │
│                                             │
└─────────────────────────────────────────────┘
```

## Button Tooltips

All buttons that have shortcuts show the shortcut in their tooltip:

```
[↻ Regenerate]  →  tooltip: "Regenerate response (Ctrl+Shift+R)"
[⚙️ Settings]   →  tooltip: "Settings (Ctrl+,)"
[🔍 Search]     →  tooltip: "Search (Ctrl+K)"
```

## Edge Cases

- **Conflicting shortcuts**: `Ctrl+K` conflicts with browser's address bar focus on some browsers — use `e.preventDefault()` to override
- **IME input**: Skip shortcut handling during IME composition (`e.isComposing`)
- **Multiple dialogs**: `Escape` closes the topmost dialog; shortcuts are disabled while a modal is open
- **Accessibility**: All shortcut-triggered actions must also be accessible via mouse/touch
