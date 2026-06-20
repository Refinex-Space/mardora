<h1 align="center">Mardora</h1>

<p align="center">
  <strong>A framework-agnostic Markdown editor, plugin system, and static preview toolkit built on CodeMirror 6.</strong>
</p>

## Overview

Mardora packages the Markdown editor capabilities used by the React, Vue2, and Vue3 playgrounds in this repository. It provides:

- CodeMirror 6 extension composition through `mardora()`.
- Rich Markdown editing decorations while preserving plain Markdown source.
- Built-in plugins for paragraphs, headings, inline formats, links, lists, tables, HTML, images, math, Mermaid, code blocks, quotes, GFM callouts, horizontal rules, and Emoji.
- Slash commands including Callout templates, browser attachment entry points, selected-text toolbar, editor TOC, UI locale support, and static preview rendering.
- Framework-neutral APIs for React, Vue, or plain CodeMirror integrations.

Applications remain responsible for layout, state management, persistence, auth, upload storage, file security, and published-content workflows.

## Installation

```bash
npm install mardora
```

Mardora installs the CodeMirror 6 runtime packages it uses as pinned dependencies and re-exports common editor APIs from `mardora/editor`. Install additional CodeMirror language/theme packages only when your application builds optional output panels like the playground.

## GFM Callouts

`QuotePlugin` recognizes GitHub Flavored Markdown callouts and renders `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, and `CAUTION` as typed callout blocks in both edit-state decoration and static preview output.
Default slash commands include shortcuts for all five Callout types.

```markdown
> [!NOTE]
> Useful context for readers.
```

## Quick Start

```ts
import { EditorState, EditorView, mardora, ThemeEnum } from "mardora/editor";
import { allPlugins } from "mardora/plugins";

const parent = document.getElementById("editor");

if (!parent) {
  throw new Error("Missing #editor container");
}

const view = new EditorView({
  parent,
  state: EditorState.create({
    doc: "# Hello, Mardora",
    extensions: [
      mardora({
        theme: ThemeEnum.AUTO,
        plugins: allPlugins,
      }),
    ],
  }),
});

// Call this when the owning component or page unmounts.
// view.destroy();
```

## Static Preview

```ts
import { ThemeEnum } from "mardora/editor";
import { allPlugins } from "mardora/plugins";
import { generateCSS, preview } from "mardora/preview";

const html = await preview("# Hello", {
  theme: ThemeEnum.LIGHT,
  plugins: allPlugins,
  sanitize: true,
  wrapperTag: "article",
  wrapperClass: "mardora-preview",
});

const css = generateCSS({
  theme: ThemeEnum.LIGHT,
  plugins: allPlugins,
  wrapperClass: "mardora-preview",
  includeBase: true,
});
```

Use the same `plugins`, `theme`, syntax theme, and `wrapperClass` for `preview()` and `generateCSS()` so the generated HTML and CSS stay aligned.

## Public Entrypoints

| Entrypoint                 | Purpose                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `mardora`         | Aggregate export for quick experiments.                                                    |
| `mardora/editor`  | Editor factory, config types, theme, i18n, attachments, slash, selection toolbar, and TOC. |
| `mardora/plugins` | Built-in plugins and `allPlugins`.                                                         |
| `mardora/preview` | Static HTML, CSS, and preview TOC helpers.                                                 |
| `mardora/lib`     | Lower-level input helpers.                                                                 |

## Documentation

The repository README and guides contain the full production integration path:

- [README.md](https://github.com/Refinex-Space/mardora#readme)
- [Project introduction and API guide](https://github.com/Refinex-Space/mardora/blob/main/docs/guides/project-introduction.md)
- [React integration guide](https://github.com/Refinex-Space/mardora/blob/main/docs/guides/react-integration.md)
- [Vue2 integration guide](https://github.com/Refinex-Space/mardora/blob/main/docs/guides/vue2-integration.md)
- [Vue3 integration guide](https://github.com/Refinex-Space/mardora/blob/main/docs/guides/vue3-integration.md)

## License

MIT
