<h1 align="center">Markora</h1>

<p align="center">
  <strong>A framework-agnostic Markdown editor, plugin system, and static preview toolkit built on CodeMirror 6.</strong>
</p>

## Overview

Markora packages the Markdown editor capabilities used by the React, Vue2, and Vue3 playgrounds in this repository. It provides:

- CodeMirror 6 extension composition through `markora()`.
- Rich Markdown editing decorations while preserving plain Markdown source.
- Built-in plugins for paragraphs, headings, inline formats, links, lists, tables, HTML, images, math, Mermaid, code blocks, quotes, horizontal rules, and Emoji.
- Slash commands, browser attachment entry points, selected-text toolbar, editor TOC, UI locale support, and static preview rendering.
- Framework-neutral APIs for React, Vue, or plain CodeMirror integrations.

Applications remain responsible for layout, state management, persistence, auth, upload storage, file security, and published-content workflows.

## Installation

```bash
npm install @refinex/markora
npm install @codemirror/commands @codemirror/lang-markdown @codemirror/language @codemirror/language-data @codemirror/state @codemirror/view
```

Optional playground-style output panels usually also use:

```bash
npm install @codemirror/lang-html @codemirror/lang-css @uiw/codemirror-theme-github
```

## Quick Start

```ts
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markora, ThemeEnum } from "@refinex/markora/editor";
import { allPlugins } from "@refinex/markora/plugins";

const parent = document.getElementById("editor");

if (!parent) {
  throw new Error("Missing #editor container");
}

const view = new EditorView({
  parent,
  state: EditorState.create({
    doc: "# Hello, Markora",
    extensions: [
      markora({
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
import { ThemeEnum } from "@refinex/markora/editor";
import { allPlugins } from "@refinex/markora/plugins";
import { generateCSS, preview } from "@refinex/markora/preview";

const html = await preview("# Hello", {
  theme: ThemeEnum.LIGHT,
  plugins: allPlugins,
  sanitize: true,
  wrapperTag: "article",
  wrapperClass: "markora-preview",
});

const css = generateCSS({
  theme: ThemeEnum.LIGHT,
  plugins: allPlugins,
  wrapperClass: "markora-preview",
  includeBase: true,
});
```

Use the same `plugins`, `theme`, syntax theme, and `wrapperClass` for `preview()` and `generateCSS()` so the generated HTML and CSS stay aligned.

## Public Entrypoints

| Entrypoint                 | Purpose                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `@refinex/markora`         | Aggregate export for quick experiments.                                                    |
| `@refinex/markora/editor`  | Editor factory, config types, theme, i18n, attachments, slash, selection toolbar, and TOC. |
| `@refinex/markora/plugins` | Built-in plugins and `allPlugins`.                                                         |
| `@refinex/markora/preview` | Static HTML, CSS, and preview TOC helpers.                                                 |
| `@refinex/markora/lib`     | Lower-level input helpers.                                                                 |

## Documentation

The repository README and guides contain the full production integration path:

- [README.md](https://github.com/Refinex-Space/markora#readme)
- [Project introduction and API guide](https://github.com/Refinex-Space/markora/blob/main/docs/guides/project-introduction.md)
- [React integration guide](https://github.com/Refinex-Space/markora/blob/main/docs/guides/react-integration.md)
- [Vue2 integration guide](https://github.com/Refinex-Space/markora/blob/main/docs/guides/vue2-integration.md)
- [Vue3 integration guide](https://github.com/Refinex-Space/markora/blob/main/docs/guides/vue3-integration.md)

## License

MIT
