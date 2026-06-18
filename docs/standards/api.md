---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: AGENTS.md#knowledge-map
---

# API Standards

## Public Exports

`packages/markora/package.json` exposes:

- `@refinex/markora`
- `@refinex/markora/editor`
- `@refinex/markora/plugins`
- `@refinex/markora/preview`
- `@refinex/markora/lib`
- `@refinex/markora/src` and `@refinex/markora/src/*` for source-level local use

When changing public behavior, update the relevant export barrel and verify generated declarations through the core build.

## Public Configuration

`MarkoraConfig` is public API. Additions or semantic changes need:

- Type exports from the relevant module.
- Unit tests for defaulting and edge cases.
- README or guide updates when integrators need to know about the option.
- A Changeset when published package consumers are affected.

## Runtime Dependencies

Core CodeMirror packages used by Markora are regular dependencies of `@refinex/markora` and are pinned by the Markora package. Do not document them as required externally installed packages.

Optional playground-only output panel packages, such as `@codemirror/lang-html`, `@codemirror/lang-css`, and `@uiw/codemirror-theme-github`, must remain clearly optional and app-owned.

## Framework Integrations

React, Vue2, and Vue3 should share core Markora APIs. If a feature is framework-specific, keep the framework-specific layer in the playground or consuming application and document why it is not core API.

## Release Impact

Public API changes, bug fixes visible to package consumers, dependency changes, and exported type changes usually require `bun run changeset` before release work.
