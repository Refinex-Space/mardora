<h1 align="center">Markora</h1>

<p align="center">
  <strong>A modern, extensible markdown editor and previewer for the web.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/markora"><img src="https://img.shields.io/npm/v/markora?style=flat-square&color=blue" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/markora"><img src="https://img.shields.io/npm/dm/markora?style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/Refinex-Space/markora/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/markora?style=flat-square" alt="license" /></a>
  <a href="https://github.com/Refinex-Space/markora"><img src="https://img.shields.io/github/stars/Refinex-Space/markora?style=flat-square" alt="GitHub stars" /></a>
  <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/CodeMirror-6-orange?style=flat-square" alt="CodeMirror 6" />
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#usage">Usage</a> •
  <a href="#features">Features</a> •
  <a href="#api-reference">API</a> •
  <a href="#license">License</a>
</p>

---

## Overview

**Markora** is a powerful, pluggable markdown editor and preview toolkit built on top of **CodeMirror 6**. It provides a seamless "rich text" editing experience while preserving standard markdown syntax. Markora also includes a static HTML renderer that produces output visually identical to the editor, making it perfect for blogs, documentation sites, and content management systems.

### Why Markora?

- 🚀 **Modern Architecture**: Built on CodeMirror 6 with incremental Lezer parsing.
- 🎨 **Rich Editing**: WYSIWYG-like experience with full markdown control.
- 🔌 **Extensible Plugin System**: Add custom rendering, keymaps, and syntax.
- 🖼️ **Static Preview**: Render markdown to semantic HTML with visual parity.
- 🌗 **Theming**: First-class support for light and dark modes.
- 📦 **Modular Exports**: Import only what you need (`markora/editor`, `markora/preview`, `markora/plugins`).

---

## Installation

Install the package via your preferred package manager:

```bash
# npm
npm install markora

# yarn
yarn add markora

# pnpm
pnpm add markora

# bun
bun add markora
```

### Peer Dependencies

Markora requires the following CodeMirror packages as peer dependencies. Make sure they are installed in your project:

```bash
npm install @codemirror/commands @codemirror/lang-markdown @codemirror/language @codemirror/language-data @codemirror/state @codemirror/view
```

---

## Quick Start

Get up and running in seconds.

```tsx
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markora } from "markora";

const view = new EditorView({
  state: EditorState.create({
    doc: "# Hello, Markora!",
    extensions: [markora()],
  }),
  parent: document.getElementById("editor")!,
});
```

---

## Usage

Markora is designed for flexibility. Use it as a CodeMirror extension for interactive editing or as a standalone renderer for static previews.

### Editor Integration

Here's a complete example using `@uiw/react-codemirror`:

```tsx
import CodeMirror from "@uiw/react-codemirror";
import { markora, allPlugins, ThemeEnum } from "markora";
import { githubDark } from "@uiw/codemirror-theme-github";

function MarkdownEditor() {
  return (
    <CodeMirror
      value="# Welcome to Markora\n\nStart writing..."
      height="500px"
      extensions={[
        markora({
          theme: ThemeEnum.DARK,
          themeStyle: githubDark,
          plugins: allPlugins,
          lineWrapping: true,
          history: true,
          indentWithTab: true,
          onNodesChange: (nodes) => console.log("AST:", nodes),
        }),
      ]}
    />
  );
}
```

#### Editor Configuration (`MarkoraConfig`)

| Option                | Type                             | Default          | Description                                              |
| --------------------- | -------------------------------- | ---------------- | -------------------------------------------------------- |
| `theme`               | `ThemeEnum`                      | `ThemeEnum.AUTO` | Theme mode: `LIGHT`, `DARK`, or `AUTO`.                  |
| `themeStyle`          | `Extension`                      | `undefined`      | CodeMirror theme extension (e.g., `githubDark`).         |
| `plugins`             | `MarkoraPlugin[]`                | `[]`             | Plugins to enable for rendering and parsing.             |
| `baseStyles`          | `boolean`                        | `true`           | Load default base styles.                                |
| `disableViewPlugin`   | `boolean`                        | `false`          | Disable rich rendering (raw markdown mode).              |
| `defaultKeybindings`  | `boolean`                        | `true`           | Enable default CodeMirror keybindings.                   |
| `history`             | `boolean`                        | `true`           | Enable undo/redo history.                                |
| `indentWithTab`       | `boolean`                        | `true`           | Use Tab for indentation.                                 |
| `highlightActiveLine` | `boolean`                        | `true`           | Highlight the current line (in raw mode).                |
| `lineWrapping`        | `boolean`                        | `true`           | Enable line wrapping.                                    |
| `onNodesChange`       | `(nodes: MarkoraNode[]) => void` | `undefined`      | Callback fired on every document update with parsed AST. |
| `slashCommands`       | `MarkoraSlashCommandsConfig`     | `{ enabled: true }` | Configure the line-start slash command menu.             |
| `attachments`         | `MarkoraAttachmentsConfig`       | `{ enabled: false }` | Configure browser file uploads for slash, paste, and drop. |
| `markdown`            | `MarkdownConfig[]`               | `[]`             | Additional Lezer markdown parser extensions.             |
| `extensions`          | `Extension[]`                    | `[]`             | Additional CodeMirror extensions.                        |
| `keymap`              | `KeyBinding[]`                   | `[]`             | Additional keybindings.                                  |

---

### Slash Commands and Attachments

Markora includes a compact slash menu for inserting common blocks without memorizing markdown syntax. Type `/` at the start of an empty line, filter the command list, then use Enter to insert the selected block.

Media commands use the browser attachment protocol. Application code supplies an uploader callback, so React, Vue, or plain CodeMirror integrations can upload to their own backend, OSS, MinIO, or another storage service and return the final URL.

```tsx
import { markora, allPlugins } from "markora";

const extensions = markora({
  plugins: allPlugins,
  slashCommands: {
    enabled: true,
  },
  attachments: {
    enabled: true,
    enablePaste: true,
    enableDrop: true,
    accept: {
      image: ["image/*"],
      video: ["video/*"],
      audio: ["audio/*"],
      file: ["*/*"],
    },
    uploader: async (file, context) => {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", context.kind);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: form,
      });
      const result = await response.json();

      return {
        url: result.url,
        name: file.name,
        mimeType: file.type,
      };
    },
  },
});
```

Upload lifecycle:

- Markora inserts a visible upload marker before calling `uploader`.
- Successful uploads replace the marker with markdown or HTML for the returned URL.
- Failed uploads leave a visible failure marker so the user can retry or remove it.
- If the user deletes the upload marker before completion, Markora does not reinsert stale output.

---

### Static Preview

Render markdown to semantic HTML for server-side rendering, static site generation, or read-only views.

```tsx
import { preview, generateCSS, allPlugins, ThemeEnum } from "markora";
import { githubLight } from "@uiw/codemirror-theme-github";

const markdown = `
# Hello World

This is a **bold** statement with some \`inline code\`.

- Item 1
- Item 2
- Item 3
`;

// Generate HTML
const html = preview(markdown, {
  theme: ThemeEnum.LIGHT,
  plugins: allPlugins,
  sanitize: true,
  wrapperClass: "prose",
});

// Generate matching CSS
const css = generateCSS({
  theme: ThemeEnum.LIGHT,
  plugins: allPlugins,
  wrapperClass: "prose",
  includeBase: true,
  syntaxTheme: githubLight,
});

// Use in your app
function ArticlePreview() {
  return (
    <>
      <style>{css}</style>
      <article dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
```

#### Preview Configuration (`PreviewConfig`)

| Option         | Type               | Default             | Description                           |
| -------------- | ------------------ | ------------------- | ------------------------------------- |
| `plugins`      | `MarkoraPlugin[]`  | `[]`                | Plugins for rendering.                |
| `theme`        | `ThemeEnum`        | `ThemeEnum.AUTO`    | Theme mode.                           |
| `sanitize`     | `boolean`          | `true`              | Sanitize HTML output (via DOMPurify). |
| `wrapperClass` | `string`           | `"markora-preview"` | CSS class for the wrapper element.    |
| `wrapperTag`   | `string`           | `"article"`         | HTML tag for the wrapper element.     |
| `markdown`     | `MarkdownConfig[]` | `[]`                | Additional parser extensions.         |

#### CSS Configuration (`GenerateCSSConfig`)

| Option         | Type                                         | Default             | Description                                                                   |
| -------------- | -------------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| `plugins`      | `MarkoraPlugin[]`                            | `[]`                | Plugins to collect preview styles from.                                       |
| `theme`        | `ThemeEnum`                                  | `ThemeEnum.AUTO`    | Theme mode for plugin preview styles.                                         |
| `wrapperClass` | `string`                                     | `"markora-preview"` | Wrapper class used for CSS scoping.                                           |
| `includeBase`  | `boolean`                                    | `true`              | Include Markora base preview layout styles.                                   |
| `syntaxTheme`  | `HighlightStyle \| Extension \| Extension[]` | `undefined`         | CodeMirror syntax theme/extensions used to generate `tok-*` syntax token CSS. |

---

## Features

### 🎯 Rich Text Editing

Markora's `ViewPlugin` decorates the editor to hide markdown syntax and render styled content inline. This provides a WYSIWYG-like experience while keeping the source as plain markdown.

- **Inline Formatting**: Bold, italic, strikethrough, and code are styled in-place.
- **Headings**: Rendered with proper sizes and weights.
- **Lists**: Ordered and unordered lists with custom bullets.
- **Images**: Displayed inline with alt text and captions.
- **Links**: Clickable with visual distinction.
- **Code Blocks**: Syntax highlighted with language detection.

### ⌨️ Slash Command Menu

The built-in slash menu supports text, headings 1-6, quote, ordered list, unordered list, task list, table, divider, link, file, video, audio, and image commands. The menu only triggers at line start, which keeps ordinary body text like `https://` or `path/to/file` from opening the command picker.

### 📎 Browser Attachments

The attachment protocol is framework-agnostic. Paste, drop, and media slash commands all go through the same uploader contract and produce standard markdown-compatible output: image markdown, video/audio HTML, and file links.

### 🔌 Plugin Architecture

Every feature in Markora is a plugin. Plugins can provide:

- **CodeMirror Extensions**: Custom decorations, widgets, and behaviors.
- **Markdown Parser Extensions**: Extend the Lezer parser for custom syntax.
- **Keymaps**: Add keyboard shortcuts.
- **Themes**: Inject custom styles based on the current theme.
- **Preview Renderers**: Define how elements are rendered to static HTML.

```typescript
import { MarkoraPlugin } from "markora/editor";

class MyCustomPlugin extends MarkoraPlugin {
  name = "my-custom-plugin";

  onRegister(context) {
    console.log("Plugin registered!", context.config);
  }

  getExtensions() {
    return [
      /* CodeMirror extensions */
    ];
  }

  getKeymap() {
    return [
      /* KeyBinding[] */
    ];
  }

  getMarkdownConfig() {
    return {
      /* MarkdownConfig */
    };
  }

  theme(mode) {
    return {
      /* Theme spec */
    };
  }
}
```

### 🌲 AST Access

Access the parsed document structure via the `onNodesChange` callback. Perfect for building:

- **Table of Contents**
- **Document Outlines**
- **Navigation Breadcrumbs**
- **Word/Line Counters**

```typescript
type MarkoraNode = {
  from: number; // Start position
  to: number; // End position
  name: string; // Node type (e.g., "Heading", "Paragraph")
  children: MarkoraNode[];
  isSelected: boolean; // True if cursor is within this node
};
```

### 🌗 Theming

Markora provides seamless theming with automatic light/dark mode support:

- **Auto Detection**: Follows system preference with `ThemeEnum.AUTO`.
- **Manual Control**: Force `ThemeEnum.LIGHT` or `ThemeEnum.DARK`.
- **Custom Themes**: Pass any CodeMirror theme via `themeStyle`.
- **Preview Parity**: CSS generation ensures preview matches editor styling.

### 📦 Modular Imports

Import only what you need to minimize bundle size:

```typescript
// Full package
import { markora, preview, allPlugins } from "markora";

// Editor only
import { markora, MarkoraPlugin } from "markora/editor";

// Preview only
import { preview, generateCSS } from "markora/preview";

// Individual plugins
import { HeadingPlugin, ListPlugin } from "markora/plugins";
```

---

## API Reference

### Exports

| Export          | Path              | Description                                     |
| --------------- | ----------------- | ----------------------------------------------- |
| `markora`       | `markora/editor`  | Main editor extension factory.                  |
| `MarkoraPlugin` | `markora/editor`  | Base class for creating plugins.                |
| `ThemeEnum`     | `markora/editor`  | Enum for theme modes (`AUTO`, `LIGHT`, `DARK`). |
| `MarkoraNode`   | `markora/editor`  | Type for AST nodes.                             |
| `MarkoraSlashCommand` | `markora/editor` | Type for custom slash menu commands.            |
| `MarkoraAttachmentUploader` | `markora/editor` | Type for browser upload callbacks.              |
| `preview`       | `markora/preview` | Function to render markdown to HTML.            |
| `generateCSS`   | `markora/preview` | Function to generate CSS for preview styling.   |
| `allPlugins`    | `markora/plugins` | Array of all built-in plugins.                  |

---

## Browser Support

Markora supports all modern browsers:

| Browser | Version |
| ------- | ------- |
| Chrome  | 88+     |
| Firefox | 78+     |
| Safari  | 14+     |
| Edge    | 88+     |

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

---

## License

[MIT](LICENSE) © [Refinex-Space](https://github.com/Refinex-Space)
