---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: AGENTS.md#knowledge-map
---

# API Standards

## Public Exports

`packages/markora/package.json` exposes:

- `markora`
- `markora/editor`
- `markora/plugins`
- `markora/preview`
- `markora/lib`
- `markora/src` and `markora/src/*` for source-level local use

When changing public behavior, update the relevant export barrel and verify generated declarations through the core build.

## Public Configuration

`MarkoraConfig` is public API. Additions or semantic changes need:

- Type exports from the relevant module.
- Unit tests for defaulting and edge cases.
- README or guide updates when integrators need to know about the option.
- A Changeset when published package consumers are affected.

## Peer Dependencies

CodeMirror packages are peer dependencies of `markora`. Do not hide required CodeMirror peer requirements inside playground-only docs.

## Framework Integrations

React, Vue2, and Vue3 should share core Markora APIs. If a feature is framework-specific, keep the framework-specific layer in the playground or consuming application and document why it is not core API.

## Release Impact

Public API changes, bug fixes visible to package consumers, dependency changes, and exported type changes usually require `bun run changeset` before release work.
