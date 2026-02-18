# F001 — Project Setup & Infrastructure

## Priority: P0 (Must have first)

## Status: DONE

## Summary

Set up the monorepo structure, install dependencies, configure TypeScript, Prisma, Tailwind, and ensure both client and server start with a single `npm run dev`.

## Acceptance Criteria

- [x] Root `package.json` with npm workspaces pointing to `packages/client` and `packages/server`
- [x] `npm install` at root installs all dependencies
- [x] `npm run dev` starts both Vite dev server and Express dev server concurrently
- [x] TypeScript strict mode in both packages
- [x] Prisma schema defined with `Conversation`, `Node`, and `Setting` models
- [x] `npx prisma migrate dev` creates tables in the local PostgreSQL
- [x] Tailwind CSS configured in the client
- [x] Vite proxies `/api` requests to the Express server (avoids CORS in dev)
- [x] `.env.example` with all required environment variables
- [x] `.gitignore` covers `node_modules`, `.env`, `dist`, Prisma generated client

## Technical Notes

- Use `concurrently` package at root to run both workspaces in parallel
- Vite dev server: port 5173 (default)
- Express server: port 3000
- Vite proxy config in `vite.config.ts`:
  ```typescript
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
  ```
- `tsx watch` for server hot-reload in development

## Dependencies

### Root
- `concurrently`

### Client (`packages/client`)
- `react`, `react-dom`
- `@xyflow/react` (React Flow v12)
- `tailwindcss`, `@tailwindcss/vite`
- `zustand`
- `react-router-dom`
- Dev: `typescript`, `vite`, `@types/react`, `@types/react-dom`

### Server (`packages/server`)
- `express`, `cors`
- `@prisma/client`
- `zod`
- Dev: `typescript`, `tsx`, `prisma`, `@types/express`, `@types/cors`

## Tasks

1. Create root `package.json` with workspaces
2. Scaffold `packages/client` with Vite React-TS template
3. Scaffold `packages/server` with Express + TypeScript
4. Configure Prisma schema and initial migration
5. Configure Tailwind in client
6. Set up Vite proxy
7. Add `npm run dev` script with concurrently
8. Create `.env.example` and `.gitignore`
9. Verify full startup with `npm run dev`
