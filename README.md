<h1 align="center">Markora</h1>

<p align="center">
  <strong>基于 CodeMirror 6 的框架无关 Markdown 编辑器、插件体系与静态预览工具包。</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@refinex/markora"><img src="https://img.shields.io/npm/v/@refinex/markora?style=flat-square&color=blue" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@refinex/markora"><img src="https://img.shields.io/npm/dm/@refinex/markora?style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/Refinex-Space/markora/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@refinex/markora?style=flat-square" alt="license" /></a>
  <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/CodeMirror-6-orange?style=flat-square" alt="CodeMirror 6" />
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> •
  <a href="#能力范围">能力范围</a> •
  <a href="#接入指南">接入指南</a> •
  <a href="#api-入口">API 入口</a> •
  <a href="#本地开发">本地开发</a> •
  <a href="#发布检查">发布检查</a>
</p>

---

## 项目定位

Markora 是一个面向业务系统的 Markdown 编辑器能力包。它不绑定 React、Vue 或任何应用框架，而是把 CodeMirror 6、Lezer Markdown、编辑态装饰、内置 Markdown 插件、slash commands、附件入口、选区工具栏、目录 TOC、静态 HTML 预览和 CSS 生成组织成稳定 API。

业务应用负责页面布局、状态管理、权限、数据保存、文件存储和发布流程；Markora 负责提供可组合的 Markdown 编辑与预览能力。

当前版本目标是 `1.0.0`：用户可以按文档接入，得到与仓库内 React、Vue2、Vue3 playground 对齐的完整能力形态。

## 快速开始

### 安装

```bash
npm install @refinex/markora
```

Markora 已内置运行所需的 CodeMirror 6 核心依赖，并通过 `@refinex/markora/editor` 导出常用编辑器 API。业务只有在自行构建类似 playground 的 HTML/CSS 输出面板时，才需要按需安装额外的 CodeMirror language/theme 包。

### 最小编辑器

```ts
import { EditorState, EditorView, markora, ThemeEnum } from "@refinex/markora/editor";
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

// 单页应用卸载时执行：
// view.destroy();
```

### Playground 同等能力配置

```ts
import type { MarkoraAttachmentUploader } from "@refinex/markora/editor";
import { markora, ThemeEnum } from "@refinex/markora/editor";
import { allPlugins } from "@refinex/markora/plugins";

const uploader: MarkoraAttachmentUploader = async (file, context) => {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", context.kind);
  form.append("source", context.source);

  const response = await fetch("/api/markora/uploads", {
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
};

const extensions = markora({
  theme: ThemeEnum.AUTO,
  locale: "zh-CN",
  plugins: allPlugins,
  baseStyles: true,
  disableViewPlugin: false,
  defaultKeybindings: true,
  history: true,
  indentWithTab: true,
  highlightActiveLine: true,
  lineWrapping: true,
  slashCommands: {
    enabled: true,
  },
  selectionToolbar: {
    enabled: true,
  },
  toc: {
    enabled: true,
    storageKey: "markora:toc",
  },
  attachments: {
    enabled: true,
    uploader,
    enablePaste: true,
    enableDrop: true,
    accept: {
      image: ["image/*"],
      video: ["video/*"],
      audio: ["audio/*"],
      file: ["*/*"],
    },
  },
});
```

## 能力范围

| 能力                  | 状态   | 说明                                                                                                 |
| --------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| CodeMirror 6 扩展组装 | 支持   | `markora()` 返回 `Extension[]`，可直接放入 CodeMirror。                                              |
| 编辑态富 Markdown     | 支持   | 保留 Markdown 源文本，同时通过 decoration/widget 提供接近 WYSIWYG 的编辑体验。                       |
| 内置 Markdown 插件    | 支持   | 段落、标题、行内格式、链接、列表、表格、HTML、图片、数学公式、Mermaid、代码块、引用、分割线、Emoji。 |
| Slash commands        | 支持   | 行首输入 `/` 打开命令菜单，支持基础 Markdown 块和媒体命令。                                          |
| 附件上传入口          | 支持   | 文件选择、粘贴、拖拽会调用业务侧 `uploader`，成功后替换为 Markdown/HTML。                            |
| 附件存储服务          | 不提供 | OSS/S3/后端上传、签名 URL、权限、扫描、删除、进度条由业务系统实现。                                  |
| 选区工具栏            | 支持   | 文本选区后提供加粗、斜体、删除线、下划线、行内代码、链接、颜色、高亮和列表操作。                     |
| 目录 TOC              | 支持   | 编辑态内置目录面板，也可通过回调或 preview TOC API 自定义侧栏。                                      |
| 静态预览              | 支持   | `preview()` 输出 HTML，`generateCSS()` 输出同插件和主题匹配的 CSS。                                  |
| i18n                  | 支持   | 内置 UI 支持 `"zh-CN"` 和 `"en-US"`。                                                                |
| 框架组件              | 不提供 | React/Vue 接入由业务组件持有生命周期；仓库 playground 提供参考实现。                                 |

## 静态预览

```ts
import { ThemeEnum } from "@refinex/markora/editor";
import { allPlugins } from "@refinex/markora/plugins";
import { generateCSS, preview } from "@refinex/markora/preview";

const markdown = "# Hello\n\nThis is **Markora**.";

const html = await preview(markdown, {
  theme: ThemeEnum.LIGHT,
  plugins: allPlugins,
  sanitize: true,
  wrapperTag: "article",
  wrapperClass: "markora-preview",
});

const css = generateCSS({
  theme: ThemeEnum.LIGHT,
  plugins: allPlugins,
  includeBase: true,
  wrapperClass: "markora-preview",
});
```

生产环境必须让 `preview()` 和 `generateCSS()` 使用同一组 `plugins`、`theme`、`wrapperClass` 和语法高亮主题，否则 HTML 与 CSS 可能不匹配。

## 接入指南

完整接入不是只调用 `markora()`，还需要处理框架生命周期、状态同步、预览输出、附件上传、TOC、主题和持久化策略。请优先阅读：

- [项目介绍与 API 总览](docs/guides/project-introduction.md)
- [React 接入指南](docs/guides/react-integration.md)
- [Vue2 接入指南](docs/guides/vue2-integration.md)
- [Vue3 接入指南](docs/guides/vue3-integration.md)

达到 playground 同等质量时，建议至少完成：

1. 安装 `@refinex/markora`。
2. 使用 `allPlugins` 跑通编辑态和 preview。
3. 使用应用状态保存 Markdown 原文，不保存 `EditorView` 内部状态。
4. 用 `disableViewPlugin: true` 提供源码模式。
5. 用 `preview()` 与 `generateCSS()` 提供预览和输出模式。
6. 提供真实 `attachments.uploader`，并在业务侧处理大小、类型、权限、失败和最终 URL。
7. 开启 slash commands、selection toolbar 和 TOC。
8. 在组件卸载时执行 `EditorView.destroy()` 并释放 `blob:` URL。

## API 入口

| 入口                       | 用途                                                             |
| -------------------------- | ---------------------------------------------------------------- |
| `@refinex/markora`         | 聚合入口，兼容快速验证。                                         |
| `@refinex/markora/editor`  | 编辑器核心、配置类型、主题、i18n、附件、slash、TOC、选区工具栏。 |
| `@refinex/markora/plugins` | 内置插件与 `allPlugins`。                                        |
| `@refinex/markora/preview` | 静态 HTML、CSS、目录提取。                                       |
| `@refinex/markora/lib`     | 底层输入处理工具。                                               |

核心配置见 [项目介绍与 API 总览](docs/guides/project-introduction.md#5-markoraconfig-配置总表)。

## 本地开发

本仓库是 Bun workspace + Turborepo monorepo。

```bash
bun install
bun run dev
```

常用入口：

| 目标                  | 命令                                            | 地址                               |
| --------------------- | ----------------------------------------------- | ---------------------------------- |
| React playground      | `bun run --cwd playground/react-playground dev` | `http://localhost:3000`            |
| React playground 页面 | 同上                                            | `http://localhost:3000/playground` |
| Vue2 playground       | `bun run --cwd playground/vue2-playground dev`  | `http://localhost:3001`            |
| Vue3 playground       | `bun run --cwd playground/vue3-playground dev`  | `http://localhost:3003`            |
| 核心包 watch          | `bun run --cwd packages/markora dev`            | 输出 `packages/markora/dist`       |

Vue playground 通过 `@refinex/markora/editor` 等包导出消费核心包。若核心源码刚有修改，先运行：

```bash
bun run --cwd packages/markora build
```

## 发布检查

```bash
bun run --cwd packages/markora test
bun run --cwd packages/markora typecheck
bun run build
bun run lint
```

公开 API、配置语义、导出类型或发布包行为变化时，按仓库发布流程添加 Changeset，并在发布前运行：

```bash
bun run changeset
bun run version-packages
bun run release
```

## 许可证

[MIT](LICENSE) © Refinex-Space
