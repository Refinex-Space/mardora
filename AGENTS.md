# AGENTS.md

## Project

Mardora is a Bun workspace and Turborepo monorepo for a framework-agnostic CodeMirror 6 Markdown editor, static preview renderer, shared UI package, and React/Vue playgrounds.

## Environment And Commands

- Install: `bun install`
- Develop all workspaces: `bun run dev`
- Develop React playground only: `bun run --cwd playground/react-playground dev`
- Develop Vue2 playground only: `bun run --cwd playground/vue2-playground dev`
- Develop Vue3 playground only: `bun run --cwd playground/vue3-playground dev`
- Build all workspaces: `bun run build`
- Lint all workspaces: `bun run lint`
- Format source/docs: `bun run format`
- Core package tests: `bun run --cwd packages/mardora test`
- Core package typecheck: `bun run --cwd packages/mardora typecheck`
- React playground typecheck: `bun run --cwd playground/react-playground typecheck`
- Vue2 unit tests: `bun run --cwd playground/vue2-playground test:unit`
- Vue3 unit tests: `bun run --cwd playground/vue3-playground test:unit`
- Harness audit: `bun run harness:check`

## Repository Boundaries

- Keep `packages/mardora` framework-agnostic; do not add React, Vue, Radix, playground UI, backend upload, OSS, S3, or asset-manager dependencies to the core package unless the task explicitly requires it.
- Treat `packages/mardora` public exports and `MardoraConfig` as package API; API changes need tests and docs updates, and published behavior changes usually need a Changeset.
- Vue2 and Vue3 playgrounds consume package exports such as `mardora/editor`; React playground may use `mardora/src` for local iteration, so do not assume all playground imports are equivalent.
- Do not edit generated output such as `dist`, `.next`, `.turbo`, or `node_modules` as source.
- Do not write secrets, tokens, production credentials, or real uploaded file URLs into docs, tests, logs, screenshots, or fixtures.

## Definition Of Done

- The smallest relevant checks pass: core changes normally run `bun run --cwd packages/mardora test` plus `typecheck`; workspace-wide or shared changes normally run `bun run lint` and `bun run build`.
- UI/playground changes cover loading, empty, error, responsive, and theme states where the touched surface exposes them; use browser validation when a local page behavior changed.
- Public API, config, architecture, security, or integration changes update the matching docs through the knowledge map.
- Delivery includes changed files/modules, commands run with result summaries, skipped checks and reasons, risks, and rollback.

## Knowledge Map

- Repository architecture and package boundaries -> read `docs/architecture/overview.md` before design, refactor, or cross-package work.
- Environment, scripts, ports, release, and local state -> read `docs/config/reference.md` before config, build, deploy, or startup work.
- Coding standards -> read `docs/standards/coding.md` before implementation work.
- Public API and package export standards -> read `docs/standards/api.md` before API, exports, or integration changes.
- Security and data handling -> read `docs/standards/security.md` before attachment, preview, sanitization, permission, or dependency work.
- Domain terms -> read `docs/domain/glossary.md` when naming, docs, or business semantics matter.
- Runbook -> read `docs/guides/runbook.md` for setup, verification, release, incident, or rollback tasks.
- Product and framework integration guides -> read `docs/README.md` when updating user-facing guide docs or playground sample content.
- Superpowers specs and implementation plans -> read `docs/README.md` before continuing a planned feature from an existing spec or plan.

## Knowledge Maintenance

- Stable facts go in the routed docs file, not in long AGENTS prose; update `updated` in front matter.
- Add an `AGENTS.md` knowledge-map line only when a new recurring "when to read" route is needed.
- Keep `CLAUDE.md` as the thin `@AGENTS.md` bridge unless divergence is explicitly required and documented.
