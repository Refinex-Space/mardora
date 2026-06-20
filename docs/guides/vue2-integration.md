---
owner: refinex
updated: 2026-06-18
status: active
referenced_by: docs/README.md#product-and-integration-guides
---

# Vue2 接入指南

本文面向 Vue 2 项目，即 Vue 2 + TypeScript + CodeMirror 6 的接入方式。目标是让业务项目接入一个与 Mardora Vue 2 playground 同等质量的编辑器：支持富 Markdown 编辑、源码模式、预览模式、HTML/CSS 输出、插件开关、slash commands、附件上传、选区工具栏、目录、主题切换和本地持久化。

## 1. Vue 2 接入结论

| 项目         | 建议                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| 接入方式     | 直接在 Vue 2 组件中创建 CodeMirror `EditorView`。                            |
| 组件生命周期 | `mounted()` 创建或重建，`beforeDestroy()` 销毁。                             |
| 文档状态     | Vue state 保存 Markdown 原文，CodeMirror 只作为编辑视图。                    |
| 预览状态     | 使用 `preview()` + `generateCSS()` 生成 HTML/CSS。                           |
| 附件上传     | 在 `attachments.uploader` 中接入业务上传接口。                               |
| 目录         | 编辑态可用 `toc.onTocChange`，预览态可用 `extractPreviewTocFromMarkdown()`。 |

## 2. 安装依赖

```shell
npm install mardora
```

下面的 HTML/CSS 输出面板示例会用到 `@codemirror/lang-html`、`@codemirror/lang-css` 和 `@uiw/codemirror-theme-github`；只有保留该面板时才需要按需安装。

Vue 2 项目还需要自己的构建环境，例如 `vue@2`、`vue-template-compiler`、`@vue/cli-service`、`@vue/cli-plugin-typescript`。Mardora 不提供 Vue 2 adapter，也不要求额外 adapter。

## 3. 模板结构

```vue
<template>
  <section class="mardora-vue2-shell">
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
.mardora-vue2-shell {
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

## 4. 配置模型

```ts
import { allPlugins } from "mardora/plugins";

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

## 5. 完整组件脚本

```ts
import Vue from "vue";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import type { MardoraAttachmentUploadContext, MardoraNode, MardoraTocItem } from "mardora/editor";
import { EditorState, EditorView, mardora, ThemeEnum } from "mardora/editor";
import { extractPreviewTocFromMarkdown, generateCSS, preview } from "mardora/preview";
import { defaultConfig, getActivePlugins } from "./playground-config";

type Mode = "live" | "code" | "view" | "output";

export default Vue.extend({
  name: "MardoraVue2Editor",

  data() {
    return {
      mode: "live" as Mode,
      theme: "light" as "light" | "dark",
      content: "# Hello, Mardora",
      config: defaultConfig,
      editorView: null as EditorView | null,
      htmlView: null as EditorView | null,
      cssView: null as EditorView | null,
      previewStyleElement: null as HTMLStyleElement | null,
      previewOutput: { html: "", css: "" },
      previewToc: [] as MardoraTocItem[],
      objectUrls: [] as string[],
      internalUpdate: false,
    };
  },

  mounted() {
    // Vue 2 组件挂载后，DOM ref 才可用于创建 EditorView。
    this.rebuildForMode();
  },

  beforeDestroy() {
    // 销毁所有 CodeMirror 视图和临时 URL，避免内存泄漏。
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
      // 外部状态变更时同步到 CodeMirror，但避免由 CodeMirror 输入触发死循环。
      if (!this.editorView || next === this.editorView.state.doc.toString()) return;

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

    mardoraTheme() {
      return this.theme === "dark" ? ThemeEnum.DARK : ThemeEnum.LIGHT;
    },

    async uploader(file: File) {
      // playground 可用 blob URL 演示；生产环境必须改成真实上传接口。
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
            mardora({
              theme: this.mardoraTheme(),
              locale: this.config.locale,
              baseStyles: this.config.editor.baseStyles,
              plugins: getActivePlugins(this.config.plugins),
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
                storageKey: "mardora-vue2:toc",
                onTocChange: (items: MardoraTocItem[]) => {
                  this.previewToc = items;
                },
              },
              attachments: {
                enabled: this.config.features.attachments,
                uploader: this.config.features.attachments ? this.uploader : undefined,
                enablePaste: this.config.features.pasteDropUploads,
                enableDrop: this.config.features.pasteDropUploads,
                accept: {
                  image: ["image/*"],
                  video: ["video/*"],
                  audio: ["audio/*"],
                  file: ["*/*"],
                },
              },
              onNodesChange: (nodes: MardoraNode[]) => {
                this.$emit("nodes-change", nodes);
              },
            }),
            updateListener,
          ],
        }),
      });
    },

    async renderPreview() {
      const plugins = getActivePlugins(this.config.plugins);
      const syntaxTheme = this.cmTheme();

      const htmlOutput = await preview(this.content, {
        theme: this.mardoraTheme(),
        plugins,
        markdown: [],
        syntaxTheme,
        sanitize: this.config.preview.sanitize,
        wrapperTag: "div",
        wrapperClass: "mardora-preview vue2-preview",
      });

      const cssOutput = generateCSS({
        theme: this.mardoraTheme(),
        plugins,
        wrapperClass: "mardora-preview",
        includeBase: this.config.preview.includeBase,
        syntaxTheme,
      });

      this.previewOutput = { html: htmlOutput, css: cssOutput };
      this.previewToc = extractPreviewTocFromMarkdown(this.content);

      this.$nextTick(() => {
        if (this.mode === "view") this.updatePreviewStyles();
        if (this.mode === "output") this.createOutputViews();
      });
    },

    updatePreviewStyles() {
      const previewHost = this.$refs.previewHost as HTMLElement | undefined;
      if (!previewHost) return;

      if (!this.previewStyleElement) {
        this.previewStyleElement = document.createElement("style");
        previewHost.prepend(this.previewStyleElement);
      }

      this.previewStyleElement.textContent = this.previewOutput.css;
    },

    createOutputViews() {
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
    },

    jumpToc(item: MardoraTocItem) {
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
    },

    destroyViews() {
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
    },

    revokeObjectUrls() {
      for (const url of this.objectUrls) {
        URL.revokeObjectURL(url);
      }
      this.objectUrls = [];
    },
  },
});
```

## 6. Mardora 配置速查

| 配置                       | 默认值           | Vue 2 建议                                                                       |
| -------------------------- | ---------------- | -------------------------------------------------------------------------------- |
| `theme`                    | `ThemeEnum.AUTO` | 跟随应用主题明确传 `ThemeEnum.LIGHT/DARK`，避免 Vue 2 主题状态和系统主题不一致。 |
| `locale`                   | `"zh-CN"`        | 中文应用保持默认，英文应用传 `"en-US"`。                                         |
| `baseStyles`               | `true`           | 初次接入保持开启。                                                               |
| `plugins`                  | `[]`             | 传 `getActivePlugins(config.plugins)`，支持插件开关。                            |
| `disableViewPlugin`        | `false`          | `mode === "code"` 时设为 `true`。                                                |
| `defaultKeybindings`       | `true`           | 保持开启。                                                                       |
| `history`                  | `true`           | 保持开启。                                                                       |
| `indentWithTab`            | `true`           | 保持开启。                                                                       |
| `highlightActiveLine`      | `true`           | 源码模式有用。                                                                   |
| `lineWrapping`             | `true`           | 文档编辑建议开启。                                                               |
| `slashCommands.enabled`    | `true`           | 通过配置开关控制。                                                               |
| `selectionToolbar.enabled` | `true`           | 富文本体验建议开启。                                                             |
| `toc.enabled`              | `true`           | 内置面板或自定义侧栏二选一。                                                     |
| `attachments.enabled`      | `false`          | 有 uploader 后再开启。                                                           |

## 7. 附件上传接入

Vue 2 接入时，附件上传要明确区分 Mardora 与业务后端职责。

| 项目     | Mardora 负责                           | 业务负责                          |
| -------- | --------------------------------------- | --------------------------------- |
| 文件来源 | slash 选择、paste、drop。               | 决定是否开启 paste/drop。         |
| 类型判断 | 根据 MIME 判断 image/video/audio/file。 | 限制业务允许的 MIME、后缀、大小。 |
| 上传过程 | 插入上传中标记，调用 `uploader`。       | 上传到后端/OSS/S3/MinIO/CDN。     |
| 成功结果 | 把结果替换成 Markdown/HTML。            | 返回最终可访问 URL。              |
| 失败结果 | 插入 Upload failed 标记。               | 抛出错误并记录日志。              |

```ts
async function productionUploader(file: File, context: MardoraAttachmentUploadContext) {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("File is larger than 20MB");
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

  return response.json();
}
```

## 8. Preview 与输出模式

| API                                       | 作用                            | Vue 2 使用方式                               |
| ----------------------------------------- | ------------------------------- | -------------------------------------------- |
| `preview(markdown, config)`               | 生成 HTML 字符串。              | 预览模式和发布前调用。                       |
| `generateCSS(config)`                     | 生成和插件/主题一致的 CSS。     | 插入 `<style>` 或输出面板。                  |
| `extractPreviewTocFromMarkdown(markdown)` | 从 Markdown 生成 preview 目录。 | 预览模式使用，因为此时可能没有 editor view。 |

关键要求：`preview()` 和 `generateCSS()` 必须使用同一组 `plugins`、`theme`、`syntaxTheme`，否则 HTML 与 CSS 会不匹配。

## 9. 插件体系

Vue 2 不需要特殊插件写法。自定义插件仍然继承 `MardoraPlugin`：

```ts
import type { DecorationContext } from "mardora/editor";
import { MardoraPlugin } from "mardora/editor";

export class AuditPlugin extends MardoraPlugin {
  readonly name = "audit";
  readonly version = "1.0.0";

  buildDecorations(ctx: DecorationContext): void {
    // 读取 ctx.view.state.doc。
    // 向 ctx.decorations 追加 Decoration.range(...)。
  }
}
```

| 插件方法              | 用途                   |
| --------------------- | ---------------------- |
| `getExtensions()`     | 添加 CodeMirror 扩展。 |
| `getMarkdownConfig()` | 添加 Markdown 语法。   |
| `getKeymap()`         | 添加快捷键。           |
| `buildDecorations()`  | 编辑态 decoration。    |
| `renderToHTML()`      | 静态预览 HTML。        |
| `getPreviewStyles()`  | 静态预览 CSS。         |

## 10. 持久化与版本升级

Vue 2 playground 的策略是固定默认文档 id，并通过 `STORAGE_VERSION` 刷新默认文档，同时保留用户自建文档。

| 字段                   | 作用                 |
| ---------------------- | -------------------- |
| `STORAGE_CONTENTS_KEY` | 保存文档数组。       |
| `STORAGE_CURRENT_KEY`  | 保存当前文档索引。   |
| `STORAGE_VERSION_KEY`  | 保存默认文档版本。   |
| `STORAGE_VERSION`      | 默认文档变更时递增。 |

生产系统建议保存 Markdown 原文和业务元数据，不保存 CodeMirror 内部状态。

## 11. 验收清单

- 编辑、源码、预览、输出模式均可切换。
- Vue 2 state 与 CodeMirror doc 不会互相覆盖。
- 组件销毁后 `EditorView.destroy()` 已执行。
- 附件上传成功会插入图片、音视频或文件链接。
- 附件上传失败会留下用户可见失败标记。
- paste/drop 与页面其他上传区域没有事件冲突。
- `preview()` 与 `generateCSS()` 使用同一组插件和主题。
- TOC 在编辑态和预览态都能跳转。
- 默认文档升级能保留用户自建文档。
