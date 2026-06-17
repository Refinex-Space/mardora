---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: AGENTS.md#knowledge-map
---

# Domain Glossary

- Markora: a framework-agnostic Markdown editor and preview toolkit built on CodeMirror 6.
- Core package: `packages/markora`, the published `@refinex/markora` npm package.
- Plugin: a `MarkoraPlugin` implementation that can provide editor decorations, keymaps, Markdown parsing config, preview HTML, and preview CSS.
- Editor mode: interactive CodeMirror editing through `@refinex/markora/editor`.
- Preview mode: static HTML/CSS generation through `@refinex/markora/preview`.
- Slash commands: line-start `/` command menu for inserting Markdown blocks or triggering media commands.
- Attachments: browser file selection, paste, or drop integration that calls an application-provided uploader and replaces upload markers with Markdown or HTML.
- Selection toolbar: floating selected-text toolbar for inline formatting, links, colors, highlights, and list conversion.
- Table of contents: editor and preview heading extraction/rendering for `h2` through `h6` unless configured otherwise.
- Playground: framework-specific validation app under `playground/*`, not part of the published core package API.
- Shell i18n: playground chrome localization for headers, sidebars, dialogs, footers, and sample documents.
- Markora i18n: editor-owned UI localization such as slash command menu text.
