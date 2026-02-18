# F015 — Dark Mode & Theming

## Priority: P1 (Baseline for developer-facing tools)

## Status: PLANNED

## Summary

Full dark mode support with a toggle in the header. Theme preference persists across sessions. All components, the graph, code blocks, and the chat panel respect the selected theme.

## Acceptance Criteria

- [ ] Light and dark themes available
- [ ] Toggle switch in the header (sun/moon icon)
- [ ] Theme preference stored in Settings table and `localStorage` for instant load
- [ ] System theme detection (`prefers-color-scheme`) as default on first visit
- [ ] All components styled for both themes
- [ ] React Flow graph adapts to theme (background, node colors, edges)
- [ ] Code blocks always use dark background regardless of theme
- [ ] No flash of wrong theme on page load (FOUC prevention)
- [ ] Smooth transition between themes (150ms transition on `background-color` and `color`)

## Implementation

### Tailwind Dark Mode

Use Tailwind's `class` dark mode strategy for manual control:

**tailwind.config.ts:**
```typescript
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic color tokens
        surface: {
          DEFAULT: '#ffffff',       // light
          dark: '#1a1a2e',          // dark
        },
        'surface-secondary': {
          DEFAULT: '#f3f4f6',       // light (gray-100)
          dark: '#16213e',          // dark
        },
        'surface-elevated': {
          DEFAULT: '#ffffff',       // light
          dark: '#0f3460',          // dark
        },
        'text-primary': {
          DEFAULT: '#111827',       // light (gray-900)
          dark: '#e5e7eb',          // dark (gray-200)
        },
        'text-secondary': {
          DEFAULT: '#6b7280',       // light (gray-500)
          dark: '#9ca3af',          // dark (gray-400)
        },
        // Node colors (adjusted for dark mode contrast)
        'node-user': {
          DEFAULT: '#3b82f6',       // blue-500
          dark: '#60a5fa',          // blue-400
        },
        'node-assistant': {
          DEFAULT: '#10b981',       // emerald-500
          dark: '#34d399',          // emerald-400
        },
        'node-system': {
          DEFAULT: '#6b7280',       // gray-500
          dark: '#9ca3af',          // gray-400
        },
      },
    },
  },
}
```

### Theme Provider

```typescript
// hooks/useTheme.ts
export function useTheme() {
  const theme = useSettingsStore(s => s.theme)
  const setTheme = useSettingsStore(s => s.setTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }
}
```

### FOUC Prevention

Add a blocking script in `index.html` before React mounts:

```html
<script>
  (function() {
    const theme = localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    if (theme === 'dark') document.documentElement.classList.add('dark')
  })()
</script>
```

## Component Theming

### Chat Panel
```typescript
// Light
<div className="bg-white text-gray-900">

// Dark-aware
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

### Message Bubbles
| Element | Light | Dark |
|---------|-------|------|
| User message bg | `bg-blue-50` | `dark:bg-blue-950` |
| Assistant message bg | `bg-white` | `dark:bg-gray-800` |
| System message bg | `bg-gray-50` | `dark:bg-gray-900` |
| Borders | `border-gray-200` | `dark:border-gray-700` |

### Graph Panel
| Element | Light | Dark |
|---------|-------|------|
| Background | White dots | Dark with subtle dots |
| Node fill | White with colored border | Dark with colored border |
| Edge default | `#d1d5db` (gray-300) | `#4b5563` (gray-600) |
| Edge active | `#3b82f6` (blue-500) | `#60a5fa` (blue-400) |
| Minimap | Light gray | Dark gray |

### React Flow Dark Theme

```typescript
<ReactFlow
  className={theme === 'dark' ? 'dark-flow' : ''}
  style={{
    backgroundColor: theme === 'dark' ? '#1a1a2e' : '#ffffff',
  }}
>
  <Background color={theme === 'dark' ? '#333' : '#ddd'} gap={16} />
  <MiniMap
    nodeColor={theme === 'dark' ? '#4b5563' : '#e5e7eb'}
    maskColor={theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'}
  />
</ReactFlow>
```

## Toggle UI

Header toggle button:

```
┌──────────────────────────────────────────────────┐
│  ChatGraph    [☀️/🌙]    [⚙️]                     │
└──────────────────────────────────────────────────┘
```

- Click to toggle
- Icon reflects current theme (sun = currently light, moon = currently dark)
- Tooltip: "Switch to dark mode" / "Switch to light mode"

## Settings Integration

Theme is stored in:
1. **`localStorage`** — for instant load without waiting for API
2. **`Settings` table** — for persistence across devices/browsers

On load: read `localStorage` first (immediate), then sync with server settings.

## Edge Cases

- **System theme changes**: Listen for `matchMedia` changes and update if user hasn't manually set a preference
- **Scrollbar styling**: Custom scrollbar colors for dark mode (`::-webkit-scrollbar`)
- **Third-party components**: Ensure any popups, tooltips, and dropdowns inherit theme
- **Print**: Force light theme for printing (`@media print`)
