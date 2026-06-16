# Vue3 接入指南

本文面向 Vue 3 项目，目标是接入一个与 Vue 3 playground 同等质量的 Markora 编辑器：支持富 Markdown 编辑、源码模式、预览模式、HTML/CSS 输出、插件开关、slash commands、附件上传、目录、主题切换和本地持久化。

## 1. 安装依赖

```shell
npm install markora
npm install @codemirror/commands @codemirror/lang-markdown @codemirror/language @codemirror/language-data @codemirror/state @codemirror/view
```

如果要展示 HTML/CSS 输出视图，还需要：

```shell
npm install @codemirror/lang-html @codemirror/lang-css @uiw/codemirror-theme-github
```

Markora 不需要 Vue 3 专属组件。推荐直接在 `onMounted()` 中创建 CodeMirror `EditorView`，在 `onBeforeUnmount()` 中销毁。

## 2. 准备状态与类型

```ts
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import type { MarkoraNode, MarkoraTocItem } from "markora/editor";
import { markora, ThemeEnum } from "markora/editor";
import { allPlugins } from "markora/plugins";
import { extractPreviewTocFromMarkdown, generateCSS, preview } from "markora/preview";

type PlaygroundMode = "live" | "code" | "view" | "output";
type ThemeMode = "light" | "dark";
type PluginConfig = Record<string, boolean>;

type PlaygroundConfig = {
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

function createDefaultPluginConfig(): PluginConfig {
  return Object.fromEntries(allPlugins.map((plugin) => [plugin.name.toLowerCase(), true]));
}

const config = reactive<PlaygroundConfig>({
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
});
```

## 3. 准备模板

```vue
<template>
  <section class="markora-shell">
    <header class="toolbar">
      <button @click="mode = 'live'">编辑</button>
      <button @click="mode = 'code'">源码</button>
      <button @click="mode = 'view'">预览</button>
      <button @click="mode = 'output'">输出</button>
    </header>

    <div v-if="mode === 'view'" ref="previewHost" class="preview-host">
      <div v-html="previewOutput.html" />
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
    </div>

    <div v-else-if="mode === 'output'" class="output-grid">
      <div ref="htmlOutputHost" />
      <div ref="cssOutputHost" />
    </div>

    <div v-else ref="editorHost" class="editor-host" />
  </section>
</template>
```

基础布局：

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
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
```

## 4. 创建和重建 EditorView

```ts
const editorHost = ref<HTMLElement | null>(null);
const previewHost = ref<HTMLElement | null>(null);
const htmlOutputHost = ref<HTMLElement | null>(null);
const cssOutputHost = ref<HTMLElement | null>(null);

const mode = ref<PlaygroundMode>("live");
const theme = ref<ThemeMode>("light");
const content = ref("# Hello, Markora");
const nodes = ref<MarkoraNode[]>([]);
const previewToc = ref<MarkoraTocItem[]>([]);
const previewOutput = ref({ html: "", css: "" });

const editorView = ref<EditorView | null>(null);
const htmlView = ref<EditorView | null>(null);
const cssView = ref<EditorView | null>(null);
const previewStyleElement = ref<HTMLStyleElement | null>(null);
const objectUrls: string[] = [];
let internalUpdate = false;

const activePlugins = computed(() =>
  allPlugins.filter((plugin) => config.plugins[plugin.name.toLowerCase()] !== false)
);

function cmTheme() {
  return theme.value === "dark" ? githubDark : githubLight;
}

function markoraTheme() {
  return theme.value === "dark" ? ThemeEnum.DARK : ThemeEnum.LIGHT;
}

async function mockUploader(file: File) {
  const url = URL.createObjectURL(file);
  objectUrls.push(url);
  return {
    url,
    name: file.name,
    mimeType: file.type,
  };
}

function createEditorView() {
  const parent = editorHost.value;
  if (!parent) return;

  const updateListener = EditorView.updateListener.of((update) => {
    if (!update.docChanged || internalUpdate) return;
    content.value = update.state.doc.toString();
  });

  editorView.value = new EditorView({
    parent,
    state: EditorState.create({
      doc: content.value,
      extensions: [
        cmTheme(),
        markora({
          theme: markoraTheme(),
          locale: config.locale,
          baseStyles: config.editor.baseStyles,
          plugins: activePlugins.value,
          markdown: [],
          extensions: [],
          keymap: [],
          disableViewPlugin: mode.value === "code",
          defaultKeybindings: config.editor.defaultKeybindings,
          history: config.editor.history,
          indentWithTab: config.editor.indentWithTab,
          highlightActiveLine: config.editor.highlightActiveLine,
          lineWrapping: config.editor.lineWrapping,
          slashCommands: {
            enabled: config.features.slashCommands,
          },
          selectionToolbar: {
            enabled: config.features.selectionToolbar,
          },
          toc: {
            enabled: mode.value === "live" && config.features.tableOfContents,
            onTocChange: (items) => {
              previewToc.value = items;
            },
          },
          attachments: {
            enabled: config.features.attachments,
            uploader: config.features.attachments ? mockUploader : undefined,
            enablePaste: config.features.pasteDropUploads,
            enableDrop: config.features.pasteDropUploads,
            accept: {
              image: ["image/*"],
              video: ["video/*"],
              audio: ["audio/*"],
              file: ["*/*"],
            },
          },
          onNodesChange: (nextNodes) => {
            nodes.value = nextNodes;
          },
        }),
        updateListener,
      ],
    }),
  });
}
```

## 5. 渲染 preview 和 output

```ts
async function renderPreview() {
  const syntaxTheme = cmTheme();

  const htmlOutput = await preview(content.value, {
    theme: markoraTheme(),
    plugins: activePlugins.value,
    markdown: [],
    syntaxTheme,
    sanitize: config.preview.sanitize,
    wrapperTag: "div",
    wrapperClass: "markora-preview vue3-preview",
  });

  const cssOutput = generateCSS({
    theme: markoraTheme(),
    plugins: activePlugins.value,
    wrapperClass: "markora-preview",
    includeBase: config.preview.includeBase,
    syntaxTheme,
  });

  previewOutput.value = { html: htmlOutput, css: cssOutput };
  previewToc.value = extractPreviewTocFromMarkdown(content.value);

  await nextTick();

  if (mode.value === "view") {
    updatePreviewStyles();
  }

  if (mode.value === "output") {
    createOutputViews();
  }
}

function updatePreviewStyles() {
  if (!previewHost.value) return;

  if (!previewStyleElement.value) {
    previewStyleElement.value = document.createElement("style");
    previewHost.value.prepend(previewStyleElement.value);
  }

  previewStyleElement.value.textContent = previewOutput.value.css;
}

function createOutputViews() {
  if (!htmlOutputHost.value || !cssOutputHost.value) return;

  htmlView.value = new EditorView({
    parent: htmlOutputHost.value,
    state: EditorState.create({
      doc: previewOutput.value.html,
      extensions: [cmTheme(), html(), EditorView.lineWrapping, EditorState.readOnly.of(true)],
    }),
  });

  cssView.value = new EditorView({
    parent: cssOutputHost.value,
    state: EditorState.create({
      doc: previewOutput.value.css,
      extensions: [cmTheme(), css(), EditorView.lineWrapping, EditorState.readOnly.of(true)],
    }),
  });
}
```

## 6. 监听模式和配置变化

```ts
async function rebuildForMode() {
  await nextTick();
  destroyViews();

  if (mode.value === "view" || mode.value === "output") {
    await renderPreview();
    return;
  }

  createEditorView();
}

watch([mode, theme, activePlugins], () => {
  rebuildForMode();
});

watch(
  config,
  () => {
    rebuildForMode();
  },
  { deep: true }
);

watch(content, (next) => {
  if (!editorView.value) return;
  if (next === editorView.value.state.doc.toString()) return;

  internalUpdate = true;
  editorView.value.dispatch({
    changes: {
      from: 0,
      to: editorView.value.state.doc.length,
      insert: next,
    },
  });
  internalUpdate = false;
});

onMounted(() => {
  rebuildForMode();
});
```

注意：不要在每次输入时重建 `EditorView`。只在模式、主题、插件或配置变更时重建；正文变更通过 dispatch 同步。

## 7. 目录跳转

```ts
function jumpToc(item: MarkoraTocItem) {
  if (mode.value === "view") {
    const target = previewHost.value?.querySelector(`#${CSS.escape(item.id)}`) as HTMLElement | null;
    target?.scrollIntoView({ block: "start" });
    return;
  }

  if (editorView.value && typeof item.from === "number") {
    editorView.value.dispatch({
      selection: { anchor: item.from },
      effects: EditorView.scrollIntoView(item.from, { y: "start" }),
    });
    editorView.value.focus();
  }
}
```

编辑态目录来自 `toc.onTocChange`；预览态目录来自 `extractPreviewTocFromMarkdown()`。这样无论是否存在编辑器实例，目录都能工作。

## 8. 生命周期清理

```ts
function destroyViews() {
  editorView.value?.destroy();
  htmlView.value?.destroy();
  cssView.value?.destroy();

  editorView.value = null;
  htmlView.value = null;
  cssView.value = null;

  if (previewStyleElement.value) {
    previewStyleElement.value.remove();
    previewStyleElement.value = null;
  }
}

onBeforeUnmount(() => {
  destroyViews();
  for (const url of objectUrls) {
    URL.revokeObjectURL(url);
  }
  objectUrls.length = 0;
});
```

## 9. 本地文档数据

建议默认文档使用固定 id，并通过版本号刷新：

```ts
export type Content = {
  id: string;
  title: string;
  content: string;
};

export const STORAGE_VERSION = 2;

export const defaultContents: Content[] = [
  { id: "project-introduction", title: "项目介绍", content: projectIntroduction },
  { id: "vue2-guide", title: "Ve2 接入指南", content: vue2Guide },
  { id: "vue3-guide", title: "Vue3 接入指南", content: vue3Guide },
  { id: "react-guide", title: "React 接入指南", content: reactGuide },
];
```

刷新默认文档时，只替换这些固定 id；用户自建文档应保留。

## 10. 插件与 API 标准

Vue 3 接入推荐直接使用 Markora 标准 API：

- `markora/editor`：编辑器扩展、`ThemeEnum`、`MarkoraNode`、`MarkoraTocItem`。
- `markora/plugins`：`allPlugins`、`essentialPlugins` 和单个插件类。
- `markora/preview`：`preview()`、`generateCSS()`、`extractPreviewTocFromMarkdown()`。
- CodeMirror 6：`EditorState`、`EditorView`、`Extension`、`updateListener`、`EditorView.lineWrapping`。
- Lezer Markdown：通过插件 `getMarkdownConfig()` 扩展语法。
- Browser API：附件上传使用 `File`、`FormData`、paste、drop。

## 11. 验收清单

- 编辑、源码、预览、输出模式都能切换。
- Vue 3 ref/reactive 状态与 CodeMirror 文档不会互相覆盖或死循环。
- `allPlugins` 全启用时，标题、列表、表格、图片、代码块、数学公式、Mermaid、HTML、Emoji 都能显示。
- slash commands、选区工具栏、附件上传、paste/drop、目录都按配置开关生效。
- `preview()` 和 `generateCSS()` 使用同一组插件、主题、syntax theme。
- 组件卸载时销毁全部 `EditorView` 并释放 `blob:` URL。
- 默认文章变更后提升 storage version，旧缓存可刷新。
