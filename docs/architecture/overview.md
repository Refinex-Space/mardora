---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: AGENTS.md#knowledge-map
---

# Architecture Overview

Markora is a Bun workspace managed by Turborepo. The repository combines the published editor package, shared UI primitives, shared lint/type configuration, and playground applications used to validate framework integrations.

## Workspace Layout

- `packages/markora`: published `@refinex/markora` package. It owns the framework-agnostic CodeMirror 6 editor extension, built-in Markdown plugins, static preview renderer, and low-level input helpers.
- `packages/ui`: private React UI primitives used by the React playground.
- `packages/eslint-config` and `packages/typescript-config`: shared workspace configuration packages.
- `playground/react-playground`: Next.js playground for interactive Markora validation and user-facing guide content.
- `playground/vue2-playground`: Vue 2.6 + Vue CLI 4 + Webpack 4 playground. It validates legacy Vue integration against package exports.
- `playground/vue3-playground`: Vue 3 + Vite playground. It validates modern Vue integration against package exports.

## Core Package Boundaries

`packages/markora` must remain framework-agnostic. It can depend on CodeMirror, Lezer, DOM sanitization, rendering helpers, and editor-domain libraries, but it must not depend on React, Vue, Next.js, Radix UI, playground components, or application upload/storage SDKs.

Main public areas:

- `@refinex/markora/editor`: editor configuration, CodeMirror extension composition, slash commands, attachments, selection toolbar, i18n, and table of contents.
- `@refinex/markora/plugins`: built-in Markdown rendering plugins.
- `@refinex/markora/preview`: static HTML/CSS preview renderer and preview TOC helpers.
- `@refinex/markora/lib`: lower-level input helpers.

## Playground Boundaries

Playgrounds demonstrate integration quality and may own framework-specific shell UI, localStorage state, mock uploaders, guide sample content, and playground-only controls.

React playground currently imports from `@refinex/markora/src` for local iteration. Vue playgrounds import package exports such as `@refinex/markora/editor`, `@refinex/markora/plugins`, and `@refinex/markora/preview`; when those exports are stale, build or watch `packages/markora` first.

## Feature Placement

- Editor capabilities used by more than one framework belong in `packages/markora/src/editor`.
- Markdown node rendering and preview HTML behavior belong in `packages/markora/src/plugins` or `packages/markora/src/preview`.
- Framework shell controls, layout, sample documents, and local persistence belong in the relevant playground.
- Shared React UI primitives belong in `packages/ui`, not in the core Markora package.
