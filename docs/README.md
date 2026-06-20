---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: AGENTS.md#knowledge-map
---

# Mardora Knowledge Map

This directory stores repository details and evidence. Keep root `AGENTS.md` concise and route task-specific details here.

## Core Repository Docs

- Architecture and package boundaries: `docs/architecture/overview.md`
- Config, scripts, ports, release, and local state: `docs/config/reference.md`
- Coding standards: `docs/standards/coding.md`
- Public API and package export standards: `docs/standards/api.md`
- Security and data handling: `docs/standards/security.md`
- Domain glossary: `docs/domain/glossary.md`
- Operational runbook: `docs/guides/runbook.md`

## Product And Integration Guides

- Product and API reference guide: `docs/guides/project-introduction.md`
- React integration guide: `docs/guides/react-integration.md`
- Vue2 integration guide: `docs/guides/vue2-integration.md`
- Vue3 integration guide: `docs/guides/vue3-integration.md`

## Superpowers Specs

- Slash commands and attachments design: `docs/superpowers/specs/2026-06-15-slash-commands-attachments-design.md`
- Vue2 playground design: `docs/superpowers/specs/2026-06-15-vue2-playground-design.md`
- Selection toolbar design: `docs/superpowers/specs/2026-06-16-selection-toolbar-design.md`
- Header icon-only refactor and theme-aware logo design: `docs/superpowers/specs/2026-06-16-header-icon-only-design.md`
- Playground shell i18n design: `docs/superpowers/specs/2026-06-16-shell-i18n-design.md`
- Slash menu i18n design: `docs/superpowers/specs/2026-06-16-slash-menu-i18n-design.md`
- Table of contents design: `docs/superpowers/specs/2026-06-16-table-of-contents-design.md`
- Table row and column controls design: `docs/superpowers/specs/2026-06-18-table-row-column-controls-design.md`

## Superpowers Plans

- Slash commands and attachments plan: `docs/superpowers/plans/2026-06-15-slash-commands-attachments.md`
- Vue2 playground plan: `docs/superpowers/plans/2026-06-15-vue2-playground.md`
- Selection toolbar plan: `docs/superpowers/plans/2026-06-16-selection-toolbar.md`
- Slash menu i18n plan: `docs/superpowers/plans/2026-06-16-slash-menu-i18n.md`
- Table of contents plan: `docs/superpowers/plans/2026-06-16-table-of-contents.md`
- Table row and column controls plan: `docs/superpowers/plans/2026-06-18-table-row-column-controls.md`

## Maintenance Rules

- Active docs must keep front matter with `owner`, `updated`, `status`, and `referenced_by`.
- Docs file names must be lower-kebab-case, except `README.md` and ADR files under a `decisions` directory.
- Add new docs to this README or to the root knowledge map in the same change.
