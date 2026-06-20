---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: AGENTS.md#knowledge-map
---

# Config Reference

## Runtime And Package Manager

- Node.js: `>=20` from root `package.json`.
- Package manager: `bun@1.3.5` from root `packageManager`.
- Workspace roots: `packages/*` and `playground/*` from `pnpm-workspace.yaml` and root `package.json`.
- Lockfile: `bun.lock`.

## Root Commands

- Install dependencies: `bun install`
- Start all development tasks: `bun run dev`
- Build all workspaces: `bun run build`
- Lint all workspaces: `bun run lint`
- Format TypeScript, TSX, and Markdown: `bun run format`
- Create a Changeset: `bun run changeset`
- Version packages from Changesets: `bun run version-packages`
- Release `mardora`: `bun run release`
- Run Harness governance checks: `bun run harness:check`

## Package Commands

- Core package build: `bun run --cwd packages/mardora build`
- Core package watch: `bun run --cwd packages/mardora dev`
- Core package lint: `bun run --cwd packages/mardora lint`
- Core package typecheck: `bun run --cwd packages/mardora typecheck`
- Core package tests: `bun run --cwd packages/mardora test`
- React playground dev server: `bun run --cwd playground/react-playground dev`
- React playground build: `bun run --cwd playground/react-playground build`
- React playground typecheck: `bun run --cwd playground/react-playground typecheck`
- Vue2 playground dev server: `bun run --cwd playground/vue2-playground dev`
- Vue2 playground build: `bun run --cwd playground/vue2-playground build`
- Vue2 unit tests: `bun run --cwd playground/vue2-playground test:unit`
- Vue3 playground dev server: `bun run --cwd playground/vue3-playground dev`
- Vue3 playground build: `bun run --cwd playground/vue3-playground build`
- Vue3 unit tests: `bun run --cwd playground/vue3-playground test:unit`

## Local Ports

- React playground: `http://localhost:3000`
- Vue2 playground: `http://localhost:3001`
- Vue3 playground: `http://localhost:3003`

## Turborepo

Root `turbo.json` defines `build`, `lint`, `check-types`, and `dev` tasks. `build` depends on upstream builds and outputs `.next/**` and `dist/**`; `dev` is persistent and uncached.

## CI State

No `.github`, GitLab CI, or Jenkins workflow is present in the repository at this initialization point. Treat local commands as the source of truth until CI is added.
