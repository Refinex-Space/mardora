---
owner: refinex
updated: 2026-06-21
status: active
referenced_by: docs/README.md#product-and-integration-guides
---

# Vue3 接入指南

本文面向 Vue 3 项目，目标是用 Composition API 接入一个与 Mardora Vue 3 playground 同等质量的编辑器：支持富 Markdown 编辑、源码模式、预览模式、HTML/CSS 输出、插件开关、slash commands、附件上传、选区工具栏、目录、主题切换和本地持久化。

## 1. Vue 3 接入结论

| 项目     | 建议                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 接入方式 | 在组件中通过 `ref<HTMLElement>()` 挂载 CodeMirror `EditorView`。       |
| 生命周期 | `onMounted()` 创建，`onBeforeUnmount()` 销毁。                         |
| 状态管理 | Markdown 原文放在 `ref` 或业务 store 中。                              |
| 预览     | 使用 `preview()`、`generateCSS()`、`extractPreviewTocFromMarkdown()`。 |
| 配置更新 | 主题、模式、插件、功能开关变化时重建 `EditorView`。                    |
| 输入同步 | 正文输入只更新 Markdown state，不重建扩展。                            |

## 2. 安装依赖

```shell
npm install mardora
```

下面的 HTML/CSS 输出面板示例会用到 `@codemirror/lang-html`、`@codemirror/lang-css` 和 `@uiw/codemirror-theme-github`；只有保留该面板时才需要按需安装。

Mardora 不提供 Vue 3 组件封装。直接使用 CodeMirror 6 API 更可控，也更接近 playground。

## 3. 模板结构

```vue
<template>
  <section class="mardora-vue3-shell">
    <header class="mardora-toolbar">
      <button type="button" @click="mode = 'live'">编辑</button>
      <button type="button" @click="mode = 'code'">源码</button>
      <button type="button" @click="mode = 'view'">预览</button>
      <button type="button" @click="mode = 'output'">输出</button>
    </header>

    <div v-if="mode === 'view'" ref="previewHost" class="mardora-preview-host">
      <div v-html="previewOutput.html" />

      <aside v-if="config.features.tableOfContents" class="mardora-preview-toc">
        <button
          v-for="item in previewToc"
          :key="item.id"
          type="button"
          :data-level="item.level"
          :class="{ active: item.active }"
          @click="jumpToc(item)"
        >
          {{ item.text }}
        </button>
      </aside>
    </div>

    <div v-else-if="mode === 'output'" class="mardora-output-grid">
      <div ref="htmlOutputHost" />
      <div ref="cssOutputHost" />
    </div>

    <div v-else ref="editorHost" class="mardora-editor-host" />
  </section>
</template>
```

```css
.mardora-vue3-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.mardora-editor-host,
.mardora-preview-host,
.mardora-output-grid {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.mardora-output-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
```

## 4. 状态和配置

```ts
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import type { MardoraAttachmentUploadContext, MardoraNode, MardoraTocItem } from "mardora/editor";
import { EditorState, EditorView, mardora, ThemeEnum } from "mardora/editor";
import { allPlugins } from "mardora/plugins";
import { extractPreviewTocFromMarkdown, generateCSS, preview } from "mardora/preview";

type Mode = "live" | "code" | "view" | "output";
type PluginConfig = Record<string, boolean>;

const editorHost = ref<HTMLElement | null>(null);
const previewHost = ref<HTMLElement | null>(null);
const htmlOutputHost = ref<HTMLElement | null>(null);
const cssOutputHost = ref<HTMLElement | null>(null);

const mode = ref<Mode>("live");
const theme = ref<"light" | "dark">("light");
const content = ref("# Hello, Mardora");
const nodes = ref<MardoraNode[]>([]);
const previewToc = ref<MardoraTocItem[]>([]);
const previewOutput = ref({ html: "", css: "" });

const editorView = ref<EditorView | null>(null);
const htmlView = ref<EditorView | null>(null);
const cssView = ref<EditorView | null>(null);
const previewStyleElement = ref<HTMLStyleElement | null>(null);
const objectUrls: string[] = [];

let internalUpdate = false;

const config = reactive({
  locale: "zh-CN" as "zh-CN" | "en-US",
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
  },
  features: {
    slashCommands: true,
    attachments: true,
    pasteDropUploads: true,
    selectionToolbar: true,
    tableOfContents: true,
  },
  plugins: Object.fromEntries(allPlugins.map((plugin) => [plugin.name.toLowerCase(), true])) as PluginConfig,
});

const activePlugins = computed(() =>
  allPlugins.filter((plugin) => config.plugins[plugin.name.toLowerCase()] !== false)
);

function cmTheme() {
  return theme.value === "dark" ? githubDark : githubLight;
}

function mardoraTheme() {
  return theme.value === "dark" ? ThemeEnum.DARK : ThemeEnum.LIGHT;
}
```

## 5. 创建 EditorView

```ts
async function uploader(file: File) {
  // Demo 使用 blob URL；生产环境必须上传到后端或对象存储。
  const url = URL.createObjectURL(file);
  objectUrls.push(url);

  return {
    url,
    name: file.name,
    mimeType: file.type,
  };
}

function createEditorView() {
  if (!editorHost.value) return;

  const updateListener = EditorView.updateListener.of((update) => {
    if (!update.docChanged || internalUpdate) return;
    content.value = update.state.doc.toString();
  });

  editorView.value = new EditorView({
    parent: editorHost.value,
    state: EditorState.create({
      doc: content.value,
      extensions: [
        cmTheme(),
        mardora({
          theme: mardoraTheme(),
          locale: config.locale,
          baseStyles: config.editor.baseStyles,
          contentWidth: config.preview.contentWidth === "wide" ? "full" : "default",
          plugins: activePlugins.value,
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
            storageKey: "mardora-vue3:toc",
            onTocChange: (items) => {
              previewToc.value = items;
            },
          },
          attachments: {
            enabled: config.features.attachments,
            uploader: config.features.attachments ? uploader : undefined,
            enablePaste: config.features.pasteDropUploads,
            enableDrop: config.features.pasteDropUploads,
            accept: {
              image: ["image/*"],
              video: ["video/*"],
              audio: ["audio/*"],
              file: ["*/*"],
            },
          },
          linkPreview: {
            enabled: true,
            resolve: resolveLinkPreview,
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

## 6. Preview 与输出模式

```ts
async function renderPreview() {
  const syntaxTheme = cmTheme();

  const htmlOutput = await preview(content.value, {
    theme: mardoraTheme(),
    plugins: activePlugins.value,
    markdown: [],
    syntaxTheme,
    sanitize: config.preview.sanitize,
    wrapperTag: "div",
    wrapperClass: "mardora-preview vue3-preview",
  });

  const cssOutput = generateCSS({
    theme: mardoraTheme(),
    plugins: activePlugins.value,
    wrapperClass: "mardora-preview",
    includeBase: config.preview.includeBase,
    syntaxTheme,
  });

  previewOutput.value = { html: htmlOutput, css: cssOutput };
  previewToc.value = extractPreviewTocFromMarkdown(content.value);

  await nextTick();

  if (mode.value === "view") updatePreviewStyles();
  if (mode.value === "output") createOutputViews();
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

## 7. 重建与销毁

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
  if (!editorView.value || next === editorView.value.state.doc.toString()) return;

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

onBeforeUnmount(() => {
  destroyViews();

  for (const url of objectUrls) {
    URL.revokeObjectURL(url);
  }
  objectUrls.length = 0;
});
```

## 8. API 表

### 8.1 编辑器配置

| 配置                       | 默认值           | Vue 3 建议                                                |
| -------------------------- | ---------------- | --------------------------------------------------------- |
| `theme`                    | `ThemeEnum.AUTO` | 和应用主题 ref 同步。                                     |
| `locale`                   | `"zh-CN"`        | 由产品语言决定。                                          |
| `baseStyles`               | `true`           | 初次接入保持开启。                                        |
| `plugins`                  | `[]`             | 传 `activePlugins.value`。                                |
| `disableViewPlugin`        | `false`          | 源码模式设为 `true`。                                     |
| `defaultKeybindings`       | `true`           | 保持开启。                                                |
| `history`                  | `true`           | 保持开启。                                                |
| `indentWithTab`            | `true`           | 保持开启。                                                |
| `highlightActiveLine`      | `true`           | 源码模式有效。                                            |
| `lineWrapping`             | `true`           | 保持开启。                                                |
| `slashCommands.enabled`    | `true`           | 用 feature toggle 控制。                                  |
| `selectionToolbar.enabled` | `true`           | 用 feature toggle 控制。                                  |
| `toc.enabled`              | `true`           | live 模式开启，预览用 `extractPreviewTocFromMarkdown()`。 |
| `attachments.enabled`      | `false`          | 有 uploader 后开启。                                      |

### 8.2 附件上传配置

| 属性          | 默认值           | 说明                                           |
| ------------- | ---------------- | ---------------------------------------------- |
| `enabled`     | `false`          | 总开关。                                       |
| `uploader`    | `undefined`      | 必须传入，未传时附件扩展不注册。               |
| `enablePaste` | `true`           | 是否处理剪贴板文件。                           |
| `enableDrop`  | `true`           | 是否处理拖拽文件。                             |
| `accept`      | 类型侧默认 `*/*` | 按 `image/video/audio/file` 限制 MIME 或后缀。 |

上传成功后，Mardora 会把 `image` 转成 Markdown 图片，把 `video/audio` 转成 HTML 标签，把 `file` 转成 Markdown 链接。存储、鉴权、病毒扫描、大小限制都属于业务后端职责。

### 8.3 TOC 配置

| 属性              | 默认值      | 说明                         |
| ----------------- | ----------- | ---------------------------- |
| `enabled`         | `true`      | 是否显示内置 TOC。           |
| `minLevel`        | `2`         | 最小标题层级。               |
| `maxLevel`        | `6`         | 最大标题层级。               |
| `defaultExpanded` | `true`      | 默认展开。                   |
| `defaultWidth`    | `240`       | 默认宽度。                   |
| `minWidth`        | `180`       | 最小宽度，源码限制至少 120。 |
| `maxWidth`        | `360`       | 最大宽度。                   |
| `storageKey`      | `undefined` | 保存展开和宽度状态。         |

## 9. 链接卡片解析

链接面板支持把独占一行的 Markdown 链接切换为卡片。Vue 3 项目应在业务层提供 `resolveLinkPreview`，由服务端接口抓取目标站点的 `og:*`、`twitter:*`、`title`、description 和 image 信息；Mardora core 只负责调用 resolver、写入隐藏注释并渲染卡片。

Vue 3 playground 已在 Vite dev server 中挂载 `/api/link-preview`，复用同一套解析器读取 Open Graph、Twitter Card、`title`、description 和 image；接口不可用时才回退为标题、URL 和 domain。

```ts
const resolveLinkPreview = async ({ url, title }: { url: string; title: string }) => {
  const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error("Failed to resolve link preview");
  const metadata = await response.json();
  return {
    kind: "link" as const,
    url: metadata.url || url,
    title: metadata.title || title || url,
    ...(metadata.domain ? { domain: metadata.domain } : {}),
    ...(metadata.image ? { image: metadata.image } : {}),
    ...(metadata.description ? { description: metadata.description } : {}),
  };
};
```

卡片在 Markdown 中持久化为“独占行链接 + 下一行 `<!--mardora-link-preview:v1 ...-->` 注释”。这条注释对用户不可见；Live 编辑态和 `preview()` 会把它渲染为卡片。服务端 resolver 必须限制协议、私网地址、超时、响应体大小和内容类型，避免在浏览器端直接抓取任意站点。

## 10. 附件上传生产实现

```ts
async function productionUploader(file: File, context: MardoraAttachmentUploadContext) {
  if (!["image", "video", "audio", "file"].includes(context.kind)) {
    throw new Error("Unsupported attachment kind");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("kind", context.kind);
  form.append("source", context.source);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return response.json() as Promise<{
    url: string;
    name?: string;
    title?: string;
    mimeType?: string;
  }>;
}
```

## 10. 插件体系

Vue 3 中自定义插件不需要 Composition API 包装。插件仍然是 Mardora 标准插件：

| 方法                                    | 用途                       |
| --------------------------------------- | -------------------------- |
| `getExtensions()`                       | 添加 CodeMirror 扩展。     |
| `getMarkdownConfig()`                   | 添加 Lezer Markdown 语法。 |
| `getKeymap()`                           | 添加快捷键。               |
| `buildDecorations(ctx)`                 | 添加编辑态 decoration。    |
| `renderToHTML(node, children, ctx)`     | 添加 preview HTML。        |
| `getPreviewStyles(theme, wrapperClass)` | 添加 preview CSS。         |

如果自定义插件会创建资源或监听器，应在 `onViewReady()` 注册，在 `onUnregister()` 或 view destroy 路径清理。

## 11. 验收清单

- `mode` 切换不会留下旧 EditorView。
- 输入正文不会触发频繁重建。
- `preview()` 和 `generateCSS()` 使用同一组插件和主题。
- 附件上传在 slash、paste、drop 三种来源都按预期工作。
- 上传失败能被用户看见。
- TOC 在编辑态和预览态都能跳转。
- 卸载时 `EditorView.destroy()` 和 `URL.revokeObjectURL()` 已执行。
- 默认文档和用户文档有明确持久化策略。
