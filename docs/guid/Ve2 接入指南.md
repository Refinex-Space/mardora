# Ve2 接入指南

本文面向 Vue 2 项目，目标是接入一个与 Vue 2 playground 同等质量的 Markora 编辑器：支持富 Markdown 编辑、源码模式、预览模式、HTML/CSS 输出、插件开关、slash commands、附件上传、目录、主题切换和本地持久化。

## 1. 安装依赖

```shell
npm install markora
npm install @codemirror/commands @codemirror/lang-markdown @codemirror/language @codemirror/language-data @codemirror/state @codemirror/view
```

如果要展示 HTML/CSS 输出视图，还需要：

```shell
npm install @codemirror/lang-html @codemirror/lang-css @uiw/codemirror-theme-github
```

Vue 2 项目通常还需要 TypeScript、Vue 2 loader 与构建器本身的配置。Markora 不要求 Vue 2 专属 adapter，直接使用 CodeMirror `EditorView`。

## 2. 准备容器

```vue
<template>
  <section class="markora-shell">
    <div class="toolbar">
      <button @click="mode = 'live'">编辑</button>
      <button @click="mode = 'code'">源码</button>
      <button @click="mode = 'view'">预览</button>
      <button @click="mode = 'output'">输出</button>
    </div>

    <div v-if="mode === 'view'" ref="previewHost" class="preview-host">
      <div v-html="previewOutput.html" />
    </div>

    <div v-else-if="mode === 'output'" class="output-grid">
      <div ref="htmlOutputHost" />
      <div ref="cssOutputHost" />
    </div>

    <div v-else ref="editorHost" class="editor-host" />
  </section>
</template>
```

推荐让编辑器宿主拥有明确高度，否则 CodeMirror 的滚动区很难稳定：

```css
.markora-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.editor-host,
.preview-host,
.output-grid {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.output-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
```

## 3. 定义配置状态

Vue 2 playground 的配置可以拆成 editor、preview、features、plugins 四块：

```ts
import { allPlugins } from "markora/plugins";

export type PluginConfig = Record<string, boolean>;

export type PlaygroundConfig = {
  locale: "zh-CN" | "en-US";
  editor: {
    baseStyles: boolean;
    defaultKeybindings: boolean;
    history: boolean;
    indentWithTab: boolean;
    highlightActiveLine: boolean;
    lineWrapping: boolean;
  };
  preview: {
    includeBase: boolean;
    sanitize: boolean;
    contentWidth: "regular" | "wide";
  };
  features: {
    slashCommands: boolean;
    attachments: boolean;
    pasteDropUploads: boolean;
    selectionToolbar: boolean;
    tableOfContents: boolean;
  };
  plugins: PluginConfig;
};

export function createDefaultPluginConfig(): PluginConfig {
  return Object.fromEntries(allPlugins.map((plugin) => [plugin.name.toLowerCase(), true]));
}

export function getActivePlugins(pluginConfig: PluginConfig) {
  return allPlugins.filter((plugin) => pluginConfig[plugin.name.toLowerCase()] !== false);
}
```

默认配置：

```ts
export const defaultConfig: PlaygroundConfig = {
  locale: "zh-CN",
  editor: {
    baseStyles: true,
    defaultKeybindings: true,
    history: true,
    indentWithTab: true,
    highlightActiveLine: true,
    lineWrapping: true,
  },
  preview: {
    includeBase: true,
    sanitize: true,
    contentWidth: "regular",
  },
  features: {
    slashCommands: true,
    attachments: true,
    pasteDropUploads: true,
    selectionToolbar: true,
    tableOfContents: true,
  },
  plugins: createDefaultPluginConfig(),
};
```

## 4. 创建编辑器

```ts
import Vue from "vue";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import type { MarkoraNode, MarkoraTocItem } from "markora/editor";
import { markora, ThemeEnum } from "markora/editor";
import { extractPreviewTocFromMarkdown, generateCSS, preview } from "markora/preview";
import { getActivePlugins } from "./playground-config";

export default Vue.extend({
  data() {
    return {
      mode: "live" as "live" | "code" | "view" | "output",
      theme: "light" as "light" | "dark",
      content: "# Hello, Markora",
      editorView: null as EditorView | null,
      htmlView: null as EditorView | null,
      cssView: null as EditorView | null,
      previewStyleElement: null as HTMLStyleElement | null,
      previewOutput: { html: "", css: "" },
      previewToc: [] as MarkoraTocItem[],
      objectUrls: [] as string[],
      internalUpdate: false,
      config: defaultConfig,
    };
  },

  mounted() {
    this.rebuildForMode();
  },

  beforeDestroy() {
    this.destroyViews();
    this.revokeObjectUrls();
  },

  watch: {
    mode() {
      this.rebuildForMode();
    },
    theme() {
      this.rebuildForMode();
    },
    config: {
      deep: true,
      handler() {
        this.rebuildForMode();
      },
    },
    content(next: string) {
      if (!this.editorView) return;
      if (next === this.editorView.state.doc.toString()) return;

      this.internalUpdate = true;
      this.editorView.dispatch({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: next,
        },
      });
      this.internalUpdate = false;
    },
  },

  methods: {
    cmTheme() {
      return this.theme === "dark" ? githubDark : githubLight;
    },

    markoraTheme() {
      return this.theme === "dark" ? ThemeEnum.DARK : ThemeEnum.LIGHT;
    },

    async mockUploader(file: File) {
      const url = URL.createObjectURL(file);
      this.objectUrls.push(url);
      return {
        url,
        name: file.name,
        mimeType: file.type,
      };
    },

    rebuildForMode() {
      this.$nextTick(() => {
        this.destroyViews();

        if (this.mode === "view" || this.mode === "output") {
          this.renderPreview();
          return;
        }

        this.createEditorView();
      });
    },

    createEditorView() {
      const parent = this.$refs.editorHost as HTMLElement | undefined;
      if (!parent) return;

      const updateListener = EditorView.updateListener.of((update) => {
        if (!update.docChanged || this.internalUpdate) return;
        this.content = update.state.doc.toString();
      });

      this.editorView = new EditorView({
        parent,
        state: EditorState.create({
          doc: this.content,
          extensions: [
            this.cmTheme(),
            markora({
              theme: this.markoraTheme(),
              locale: this.config.locale,
              baseStyles: this.config.editor.baseStyles,
              plugins: getActivePlugins(this.config.plugins),
              markdown: [],
              extensions: [],
              keymap: [],
              disableViewPlugin: this.mode === "code",
              defaultKeybindings: this.config.editor.defaultKeybindings,
              history: this.config.editor.history,
              indentWithTab: this.config.editor.indentWithTab,
              highlightActiveLine: this.config.editor.highlightActiveLine,
              lineWrapping: this.config.editor.lineWrapping,
              slashCommands: {
                enabled: this.config.features.slashCommands,
              },
              selectionToolbar: {
                enabled: this.config.features.selectionToolbar,
              },
              toc: {
                enabled: this.mode === "live" && this.config.features.tableOfContents,
                onTocChange: (items: MarkoraTocItem[]) => {
                  this.previewToc = items;
                },
              },
              attachments: {
                enabled: this.config.features.attachments,
                uploader: this.config.features.attachments ? this.mockUploader : undefined,
                enablePaste: this.config.features.pasteDropUploads,
                enableDrop: this.config.features.pasteDropUploads,
                accept: {
                  image: ["image/*"],
                  video: ["video/*"],
                  audio: ["audio/*"],
                  file: ["*/*"],
                },
              },
              onNodesChange: (nodes: MarkoraNode[]) => {
                this.$emit("nodes-change", nodes);
              },
            }),
            updateListener,
          ],
        }),
      });
    },
  },
});
```

生产 uploader 不要返回 `blob:` URL。应该上传到后端、对象存储或 CDN，并返回可长期访问的 `url`。

## 5. 实现预览与输出模式

```ts
async function renderPreview(this: Vue & any) {
  const plugins = getActivePlugins(this.config.plugins);
  const syntaxTheme = this.cmTheme();

  const htmlOutput = await preview(this.content, {
    theme: this.markoraTheme(),
    plugins,
    markdown: [],
    syntaxTheme,
    sanitize: this.config.preview.sanitize,
    wrapperTag: "div",
    wrapperClass: "markora-preview vue2-preview",
  });

  const cssOutput = generateCSS({
    theme: this.markoraTheme(),
    plugins,
    wrapperClass: "markora-preview",
    includeBase: this.config.preview.includeBase,
    syntaxTheme,
  });

  this.previewOutput = { html: htmlOutput, css: cssOutput };
  this.previewToc = extractPreviewTocFromMarkdown(this.content);

  this.$nextTick(() => {
    if (this.mode === "view") {
      this.updatePreviewStyles();
    }
    if (this.mode === "output") {
      this.createOutputViews();
    }
  });
}

function updatePreviewStyles(this: Vue & any) {
  const previewHost = this.$refs.previewHost as HTMLElement | undefined;
  if (!previewHost) return;

  if (!this.previewStyleElement) {
    this.previewStyleElement = document.createElement("style");
    previewHost.prepend(this.previewStyleElement);
  }

  this.previewStyleElement.textContent = this.previewOutput.css;
}

function createOutputViews(this: Vue & any) {
  const htmlParent = this.$refs.htmlOutputHost as HTMLElement | undefined;
  const cssParent = this.$refs.cssOutputHost as HTMLElement | undefined;
  if (!htmlParent || !cssParent) return;

  this.htmlView = new EditorView({
    parent: htmlParent,
    state: EditorState.create({
      doc: this.previewOutput.html,
      extensions: [this.cmTheme(), html(), EditorView.lineWrapping, EditorState.readOnly.of(true)],
    }),
  });

  this.cssView = new EditorView({
    parent: cssParent,
    state: EditorState.create({
      doc: this.previewOutput.css,
      extensions: [this.cmTheme(), css(), EditorView.lineWrapping, EditorState.readOnly.of(true)],
    }),
  });
}
```

## 6. 目录接入

Live 编辑模式可以使用 `toc.onTocChange` 获取编辑态目录。预览模式建议用 `extractPreviewTocFromMarkdown(markdown)`，避免依赖已销毁的编辑器实例。

```vue
<aside v-if="config.features.tableOfContents" class="preview-toc">
  <button
    v-for="item in previewToc"
    :key="item.id"
    :data-level="item.level"
    :class="{ active: item.active }"
    @click="jumpToc(item)"
  >
    {{ item.text }}
  </button>
</aside>
```

```ts
function jumpToc(this: Vue & any, item: MarkoraTocItem) {
  if (this.mode === "view") {
    const host = this.$refs.previewHost as HTMLElement | undefined;
    const target = host?.querySelector(`#${CSS.escape(item.id)}`) as HTMLElement | null;
    target?.scrollIntoView({ block: "start" });
    return;
  }

  if (this.editorView && typeof item.from === "number") {
    this.editorView.dispatch({
      selection: { anchor: item.from },
      effects: EditorView.scrollIntoView(item.from, { y: "start" }),
    });
    this.editorView.focus();
  }
}
```

## 7. 本地持久化

Playground 采用版本号刷新默认文档，同时保留用户自建文档：

```ts
export const STORAGE_CONTENTS_KEY = "markora-vue2-playground-contents";
export const STORAGE_CURRENT_KEY = "markora-vue2-playground-current";
export const STORAGE_VERSION_KEY = "markora-vue2-playground-version";
export const STORAGE_VERSION = 2;

export function loadSnapshot(defaultContents: Content[]) {
  const storedContents = localStorage.getItem(STORAGE_CONTENTS_KEY);
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
  const versionMatches = storedVersion === String(STORAGE_VERSION);

  if (storedContents && versionMatches) {
    return JSON.parse(storedContents) as Content[];
  }

  localStorage.setItem(STORAGE_CONTENTS_KEY, JSON.stringify(defaultContents));
  localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
  return defaultContents;
}
```

每次调整默认文章内容或标题时提高 `STORAGE_VERSION`，否则老用户本地缓存不会自动刷新。

## 8. 生命周期清理

```ts
function destroyViews(this: Vue & any) {
  this.editorView?.destroy();
  this.htmlView?.destroy();
  this.cssView?.destroy();
  this.editorView = null;
  this.htmlView = null;
  this.cssView = null;

  if (this.previewStyleElement) {
    this.previewStyleElement.remove();
    this.previewStyleElement = null;
  }
}

function revokeObjectUrls(this: Vue & any) {
  for (const url of this.objectUrls) {
    URL.revokeObjectURL(url);
  }
  this.objectUrls = [];
}
```

Vue 2 中最容易遗漏的是 watcher 触发重建后没有销毁旧 `EditorView`，以及附件上传 demo 产生的 `blob:` URL 没有释放。

## 9. 插件与 API 标准

Vue 2 接入不需要绕开 Markora 的标准 API。推荐直接使用：

- `markora/editor`：编辑器扩展、`ThemeEnum`、`MarkoraNode`、`MarkoraTocItem`。
- `markora/plugins`：`allPlugins`、`essentialPlugins` 和单个插件类。
- `markora/preview`：`preview()`、`generateCSS()`、`extractPreviewTocFromMarkdown()`。
- CodeMirror 6：`EditorState`、`EditorView`、`Extension`、`updateListener`、`EditorView.lineWrapping`。
- Browser API：`File`、`FormData`、`URL.createObjectURL`、paste、drop。

如果要自定义语法，创建 `MarkoraPlugin` 并提供 `getMarkdownConfig()`；如果要自定义编辑态视觉，提供 `buildDecorations()`；如果要让预览同步，提供 `renderToHTML()` 和 `getPreviewStyles()`。

## 10. 验收清单

- 编辑、源码、预览、输出模式都能切换。
- 输入内容后 Vue 2 状态和 CodeMirror 文档保持一致。
- `allPlugins` 全启用时，标题、列表、表格、图片、代码块、数学公式、Mermaid、HTML、Emoji 都能显示。
- slash commands、选区工具栏、附件上传按配置开关生效。
- 预览 HTML 和 CSS 与当前插件、主题、syntax theme 一致。
- 目录在编辑态和预览态都能跳转。
- 组件销毁时 `EditorView` 和 `blob:` URL 已清理。
- 默认文章变更后提高 storage version，旧缓存能刷新默认文章并保留用户文章。
