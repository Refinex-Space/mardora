---
owner: refinex
updated: 2026-06-21
status: active
referenced_by: AGENTS.md#knowledge-map
---

# Runbook

## Setup

1. Install dependencies from the repository root:

   ```bash
   bun install
   ```

2. Start all development tasks:

   ```bash
   bun run dev
   ```

3. For Vue playground work, build or watch the core package first if package exports are stale:

   ```bash
   bun run --cwd packages/mardora build
   ```

## Focused Verification

- Core editor or preview code: `bun run --cwd packages/mardora test` and `bun run --cwd packages/mardora typecheck`
- React playground: `bun run --cwd playground/react-playground typecheck` and, for UI behavior, local browser validation at `http://localhost:3000/playground`
- Vue2 playground: `bun run --cwd playground/vue2-playground test:unit`
- Vue3 playground: `bun run --cwd playground/vue3-playground test:unit`
- Shared or cross-workspace changes: `bun run lint` and `bun run build`
- Harness docs/control-plane changes: `bun run harness:check`

## Release

1. Run relevant tests for the changed area.
2. Run `bun run harness:check` when docs, guides, or control-plane files changed.
3. Run `bun run build`.
4. Confirm root `package.json`, `packages/mardora/package.json`, and `bun.lock` agree on the target version.
5. Confirm `packages/mardora/README.md` documents the public npm-facing capabilities and links to the current guides.
6. Add a Changeset with `bun run changeset` when package consumers are affected.
7. Use `bun run version-packages` only when preparing a release version update.
8. Use `bun run release` only after build, review, and package publishing intent are confirmed.

## Rollback

- Code rollback: revert the affected commit or apply a focused reverse patch.
- Public API rollback: restore the previous export/config behavior and add regression coverage.
- Docs/control-plane rollback: restore `AGENTS.md`, `CLAUDE.md`, `docs/`, `ops/harness/`, and root `package.json` script changes from the previous commit.
- Playground local-state rollback: clear the relevant browser localStorage keys documented in the touched playground code.
