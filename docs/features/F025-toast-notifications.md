# F025 — Toast Notification System

## Summary

A global toast notification system providing visual feedback for user actions (save, delete, import, connection test) with auto-dismiss, type-based styling, and accessibility support.

## Motivation

Previously, many actions (saving settings, deleting nodes/conversations, importing) either had no feedback or used inline text that was easy to miss. A toast system gives consistent, visible confirmation across the entire app.

## Architecture

### Store: `toastStore.ts`

Zustand store managing a `Toast[]` array:

- **`addToast(toast)`** — appends a toast, auto-schedules removal via `setTimeout`
- **`removeToast(id)`** — removes a toast by ID (manual dismiss or auto-expire)

Imperative helpers exported as `toast.success()`, `toast.error()`, `toast.info()`, `toast.warning()` — callable from anywhere without React hooks.

### Component: `Toast.tsx`

- **`ToastContainer`** — fixed `bottom-4 right-4 z-[60]`, renders toast list with `AnimatePresence`
- Each toast: icon per type (lucide), themed border color, close button
- Slide-in/out animation via `framer-motion`
- `role="alert"` + `aria-live="assertive"` for screen readers

### Integration Points

| Location | Action | Toast |
|---|---|---|
| `SettingsDialog` | Connection test pass/fail | `success` / `error` |
| `SettingsDialog` | Save settings | `success` / `error` |
| `NodeContextMenu` | Delete node | `success` / `error` |
| `ConversationList` | Delete conversation | `success` / `error` |
| `ConversationList` | Import conversation | `success` / `error` |

## Configuration

| Property | Default | Description |
|---|---|---|
| `duration` (success/info) | 4000ms | Auto-dismiss delay |
| `duration` (error) | 5000ms | Longer for errors |
| `duration` (warning) | 4500ms | Moderate for warnings |

## Files Changed

- **New**: `stores/toastStore.ts`, `components/ui/Toast.tsx`
- **Modified**: `AppLayout.tsx`, `SettingsDialog.tsx`, `NodeContextMenu.tsx`, `ConversationList.tsx`
