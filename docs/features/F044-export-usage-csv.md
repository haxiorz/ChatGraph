# F044 — Export Usage Data as CSV

## Overview

Adds a download button to the Usage Dashboard that generates and downloads a CSV file containing all visible usage statistics.

## Feature

### CSV Export Button

- Appears in the period selector row (right-aligned)
- Download icon + "CSV" label
- Generates filename: `chatgraph-usage-{period}-{date}.csv`

### CSV Contents

The exported CSV includes four sections:

1. **Summary** — Total prompt tokens, completion tokens, and cost
2. **By Model** — Per-model breakdown with token counts, cost, and request count
3. **Top Conversations** — Conversation titles with total tokens and cost
4. **Daily Spending** (when viewing 7-day or 30-day period) — Per-day token and cost breakdown

### Implementation

- `generateUsageCSV()` builds CSV string from stats + optional daily data
- `downloadCSV()` creates a Blob, generates an object URL, and triggers download via a temporary link element
- No server-side endpoint needed — CSV is generated entirely client-side from already-fetched data

## Files Modified

| File | Change |
|------|--------|
| `packages/client/src/components/shared/UsageDashboard.tsx` | `generateUsageCSV()`, `downloadCSV()`, export button |
