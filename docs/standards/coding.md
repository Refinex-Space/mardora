---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: AGENTS.md#knowledge-map
---

# Coding Standards

## TypeScript

- Keep TypeScript strict and avoid `any` unless a boundary cannot be typed more precisely.
- Export public types through package index files when they are part of the integration API.
- Keep helper logic pure when it is used by multiple UI runtimes or by tests.
- Add standardized comments for public classes, public methods, non-obvious configuration fields, and complex implementation blocks. Avoid comments that merely repeat the code.

## Core Editor Code

- Keep `packages/mardora` independent from React, Vue, Next.js, Radix, and playground UI packages.
- Prefer CodeMirror extension boundaries for editor behavior: state/query helpers, DOM menu rendering, theme, and extension wiring should stay in separate files when the feature is non-trivial.
- Put browser-only or DOM-only behavior behind integration points that can be tested with lightweight fakes.
- Keep upload and persistence as application responsibilities unless a task explicitly changes the Mardora API boundary.

## Tests

- Use `bun:test` for core package unit tests under `packages/mardora/tests`.
- Add pure helper coverage before wiring complex CodeMirror or DOM behavior.
- For playground logic, prefer focused tests for state, persistence, and config defaults.

## Formatting And Linting

- Use `bun run format` for TypeScript, TSX, and Markdown formatting.
- Use `bun run lint` for workspace linting when shared code, UI, or package boundaries change.
- Do not edit generated output directories as source.
