<h1 align="center">Mardora</h1>

<p align="center">
  <strong>A framework-agnostic Markdown editor, plugin system, and static preview toolkit built on CodeMirror 6.</strong>
</p>

## Overview

Mardora packages the Markdown editor capabilities used by the React, Vue2, and Vue3 playgrounds in this repository. It provides:

- CodeMirror 6 extension composition through `mardora()`.
- Rich Markdown editing decorations while preserving plain Markdown source.
- Built-in plugins for paragraphs, headings, inline formats, links, lists, tables, HTML, images, math, Mermaid, code blocks, quotes, GFM callouts, horizontal rules, and Emoji.
- Slash commands including Callout templates, browser attachment entry points, selected-text toolbar with localized tooltips, editor TOC, UI locale support, and static preview rendering.
- Link panels and block link cards backed by a Markdown-compatible hidden metadata comment protocol.
- Live editor content width control through `contentWidth`.
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
        contentWidth: "full",
      }),
    ],
  }),
});

// Call this when the owning component or page unmounts.
// view.destroy();
```

`contentWidth` controls the live editor content column. The default keeps the
readable `48rem` column; use `"full"` for full-width workspace editors, or pass
`{ maxWidth: "64rem" }` for an application-specific centered column.

## Selection Toolbar

Set `selectionToolbar.enabled` to `false` to disable the selected-text toolbar.
When enabled, toolbar labels, button tooltips, the link panel, color panels, and
block-type names use the resolved editor locale (`"zh-CN"` by default, or
`"en-US"` through `locale` / `i18n.locale` / `selectionToolbar.locale`).

The built-in toolbar supports block type, bold, italic, strikethrough,
underline, inline code, highlight, text color, link, ordered list, unordered
list, and task list actions.

## Link Cards

Clicking a link in live editing opens the link panel instead of expanding the
raw `[title](url)` source. The panel can edit title and URL, copy, open, remove,
and, for standalone links only, embed the link as a block card.

Link cards remain plain Markdown plus a hidden HTML comment:

```text
[Octarine - Take back control of your writing](https://octarine.app/)
<!--mardora-link-preview:v1 {"kind":"link","url":"https://octarine.app/","title":"Octarine - Take back control of your writing","domain":"octarine.app","image":"https://octarine.app/img/og/base.png","description":"Private, markdown-based note-taking app with a focus on speed, simplicity and data ownership. Write faster, think clearer."}-->
```

Mardora renders the matching standalone link and metadata comment as a card in
the live editor and in `preview()` output. It does not fetch arbitrary remote
pages in the core package. Production applications should provide a server-side
`linkPreview.resolve` implementation that validates `http:` / `https:`, blocks
private or loopback addresses, limits redirects, timeout, response size, and
content type, then extracts Open Graph, Twitter Card, and `<title>` metadata.

```ts
import { mardora, type MardoraLinkPreviewMetadata } from "mardora/editor";

const extensions = mardora({
  linkPreview: {
    enabled: true,
    async resolve({ url, title }): Promise<MardoraLinkPreviewMetadata> {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error("Failed to resolve link preview");
      const metadata = await response.json();
      return {
        kind: "link",
        url: metadata.url || url,
        title: metadata.title || title || url,
        domain: metadata.domain,
        image: metadata.image,
        description: metadata.description,
      };
    },
  },
});
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

| Entrypoint        | Purpose                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------ |
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
