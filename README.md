<h1 align="center">Mardora</h1>

<p align="center">
  <strong>基于 CodeMirror 6 的框架无关 Markdown 编辑器、插件体系与静态预览工具包。</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mardora"><img src="https://img.shields.io/npm/v/mardora?style=flat-square&color=blue" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/mardora"><img src="https://img.shields.io/npm/dm/mardora?style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/Refinex-Space/mardora/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/mardora?style=flat-square" alt="license" /></a>
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

Mardora 是一个面向业务系统的 Markdown 编辑器能力包。它不绑定 React、Vue 或任何应用框架，而是把 CodeMirror 6、Lezer Markdown、编辑态装饰、内置 Markdown 插件、slash commands、附件入口、选区工具栏、目录 TOC、静态 HTML 预览和 CSS 生成组织成稳定 API。

业务应用负责页面布局、状态管理、权限、数据保存、文件存储和发布流程；Mardora 负责提供可组合的 Markdown 编辑与预览能力。

当前版本目标是 `1.3.1`：用户可以按文档接入，得到与仓库内 React、Vue2、Vue3 playground 对齐的完整能力形态。

![alt text](./docs/assets/%20playground.png)

## 快速开始

### 安装

```bash
npm install mardora
```

Mardora 已内置运行所需的 CodeMirror 6 核心依赖，并通过 `mardora/editor` 导出常用编辑器 API。业务只有在自行构建类似 playground 的 HTML/CSS 输出面板时，才需要按需安装额外的 CodeMirror language/theme 包。

### 最小编辑器

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

// 单页应用卸载时执行：
// view.destroy();
```

### Playground 同等能力配置

```ts
import type { MardoraAttachmentUploader } from "mardora/editor";
import { mardora, ThemeEnum } from "mardora/editor";
import { allPlugins } from "mardora/plugins";

const uploader: MardoraAttachmentUploader = async (file, context) => {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", context.kind);
  form.append("source", context.source);

  const response = await fetch("/api/mardora/uploads", {
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

const extensions = mardora({
  theme: ThemeEnum.AUTO,
  locale: "zh-CN",
  plugins: allPlugins,
  baseStyles: true,
  fonts: {
    document: '"Songti SC", serif',
    code: '"JetBrains Mono", ui-monospace, monospace',
    ui: '"SF Pro Text", system-ui, sans-serif',
  },
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
  linkPreview: {
    enabled: true,
    async resolve({ url, title }) {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error("Failed to resolve link preview");
      }
      return response.json();
    },
  },
  toc: {
    enabled: true,
    storageKey: "mardora:toc",
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

| 能力                  | 状态   | 说明                                                                                                         |
| --------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| CodeMirror 6 扩展组装 | 支持   | `mardora()` 返回 `Extension[]`，可直接放入 CodeMirror。                                                      |
| 编辑态富 Markdown     | 支持   | 保留 Markdown 源文本，同时通过 decoration/widget 提供接近 WYSIWYG 的编辑体验。                               |
| 内置 Markdown 插件    | 支持   | 段落、标题、行内格式、链接、列表、表格、HTML、图片、数学公式、Mermaid、代码块、引用/Callout、分割线、Emoji。 |
| Slash commands        | 支持   | 行首输入 `/` 打开命令菜单，支持基础 Markdown 块、Callout 和媒体命令。                                        |
| 附件上传入口          | 支持   | 文件选择、粘贴、拖拽会调用业务侧 `uploader`，成功后替换为 Markdown/HTML。                                    |
| 附件存储服务          | 不提供 | OSS/S3/后端上传、签名 URL、权限、扫描、删除、进度条由业务系统实现。                                          |
| 选区工具栏            | 支持   | 文本选区后提供加粗、斜体、删除线、下划线、行内代码、链接、颜色、高亮和列表操作；按钮 tooltip 跟随 locale。   |
| 链接卡片              | 支持   | 独占行链接可切换为卡片，Markdown 中使用隐藏元信息注释持久化，解析目标站点元信息由业务服务端 resolver 完成。  |
| 目录 TOC              | 支持   | 编辑态内置目录面板，也可通过回调或 preview TOC API 自定义侧栏。                                              |
| 正文宽度控制          | 支持   | `contentWidth` 可在可读列宽、全宽工作区和自定义 max-width 之间切换。                                         |
| 静态预览              | 支持   | `preview()` 输出 HTML，`generateCSS()` 输出同插件和主题匹配的 CSS。                                          |
| i18n                  | 支持   | 内置 UI 支持 `"zh-CN"` 和 `"en-US"`。                                                                        |
| 框架组件              | 不提供 | React/Vue 接入由业务组件持有生命周期；仓库 playground 提供参考实现。                                         |

## Callout 告警块

`QuotePlugin` 支持 GitHub Flavored Markdown Callout 语法，支持 `NOTE`、`TIP`、`IMPORTANT`、`WARNING` 和 `CAUTION` 五种类型。
Slash commands 内置了五种 Callout 快捷插入命令，可直接插入对应模板。

```markdown
> [!WARNING]
> 需要读者立即注意的潜在风险，忽视可能导致问题。
```

编辑态和静态预览会将其渲染为 `cm-mardora-callout cm-mardora-callout-warning`，普通 `>` 引用仍保持普通引用块。

## 链接卡片

Live 编辑态中点击链接会打开链接面板，而不是展开 `[title](url)` 源码。链接面板支持编辑标题和 URL、复制、打开、移除；当链接独占一行时可切换为卡片形态，行内链接会禁用卡片切换，避免破坏段落结构。

卡片形态仍然保存为可读 Markdown：上一行是普通链接，下一行是 Mardora 专用隐藏元信息注释。其他 Markdown 工具会把它当作普通 HTML 注释，Mardora Live 编辑态和 `preview()` 会把匹配的“独占行链接 + 注释”渲染为卡片。

```text
[Mardora - Take back control of your writing](https://github.com/Refinex-Space/mardora)
<!--mardora-link-preview:v1 {"kind":"link","url":"https://github.com/Refinex-Space/mardora","title":"Octarine - Take back control of your writing","domain":"octarine.app","image":"https://github.com/Refinex-Space/mardora/img/og/base.png","description":"Private, markdown-based note-taking app with a focus on speed, simplicity and data ownership. Write faster, think clearer."}-->
```

Mardora core 不直接抓取任意外站。生产环境应通过 `linkPreview.resolve` 调用业务服务端接口解析目标站点元信息，并在服务端限制协议、私网地址、重定向次数、超时、响应体大小和内容类型，优先读取 `og:*`、`twitter:*` 和 `<title>`。

## 静态预览

```ts
import { ThemeEnum } from "mardora/editor";
import { allPlugins } from "mardora/plugins";
import { generateCSS, preview } from "mardora/preview";

const markdown = "# Hello\n\nThis is **Mardora**.";

const html = await preview(markdown, {
  theme: ThemeEnum.LIGHT,
  plugins: allPlugins,
  sanitize: true,
  wrapperTag: "article",
  wrapperClass: "mardora-preview",
});

const css = generateCSS({
  theme: ThemeEnum.LIGHT,
  plugins: allPlugins,
  fonts: {
    document: '"Songti SC", serif',
    code: '"JetBrains Mono", ui-monospace, monospace',
    ui: '"SF Pro Text", system-ui, sans-serif',
  },
  includeBase: true,
  wrapperClass: "mardora-preview",
});
```

`fonts` 接收合法 CSS `font-family` 值，分别控制文章正文/标题、代码块/行内代码、Mardora 自有 UI 控件。未配置时 Mardora 使用内置系统 sans 与等宽字体栈。

生产环境必须让 `preview()` 和 `generateCSS()` 使用同一组 `plugins`、`theme`、`wrapperClass`、`fonts` 和语法高亮主题，否则 HTML 与 CSS 可能不匹配。

## 接入指南

完整接入不是只调用 `mardora()`，还需要处理框架生命周期、状态同步、预览输出、附件上传、链接卡片解析、TOC、主题和持久化策略。请优先阅读：

- [项目介绍与 API 总览](docs/guides/project-introduction.md)
- [React 接入指南](docs/guides/react-integration.md)
- [Vue2 接入指南](docs/guides/vue2-integration.md)
- [Vue3 接入指南](docs/guides/vue3-integration.md)

达到 playground 同等质量时，建议至少完成：

1. 安装 `mardora`。
2. 使用 `allPlugins` 跑通编辑态和 preview。
3. 使用应用状态保存 Markdown 原文，不保存 `EditorView` 内部状态。
4. 用 `disableViewPlugin: true` 提供源码模式。
5. 用 `preview()` 与 `generateCSS()` 提供预览和输出模式。
6. 提供真实 `attachments.uploader`，并在业务侧处理大小、类型、权限、失败和最终 URL。
7. 提供 `linkPreview.resolve` 服务端解析入口，用于链接卡片元信息。
8. 开启 slash commands、selection toolbar 和 TOC。
9. 在组件卸载时执行 `EditorView.destroy()` 并释放 `blob:` URL。

## API 入口

| 入口              | 用途                                                             |
| ----------------- | ---------------------------------------------------------------- |
| `mardora`         | 聚合入口，兼容快速验证。                                         |
| `mardora/editor`  | 编辑器核心、配置类型、主题、i18n、附件、slash、TOC、选区工具栏。 |
| `mardora/plugins` | 内置插件与 `allPlugins`。                                        |
| `mardora/preview` | 静态 HTML、CSS、目录提取。                                       |
| `mardora/lib`     | 底层输入处理工具。                                               |

核心配置见 [项目介绍与 API 总览](docs/guides/project-introduction.md#5-mardoraconfig-配置总表)。

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
| 核心包 watch          | `bun run --cwd packages/mardora dev`            | 输出 `packages/mardora/dist`       |

Vue playground 通过 `mardora/editor` 等包导出消费核心包。若核心源码刚有修改，先运行：

```bash
bun run --cwd packages/mardora build
```

## 发布检查

```bash
bun run --cwd packages/mardora test
bun run --cwd packages/mardora typecheck
bun run harness:check
bun run build
bun run lint
```

发布到 npm 前还应确认 `packages/mardora/package.json` 的 `version`、根 `package.json`、`bun.lock` 和 `packages/mardora/README.md` 已同步；`packages/mardora/README.md` 是 npm 包页面的主要文档入口。

公开 API、配置语义、导出类型或发布包行为变化时，按仓库发布流程添加 Changeset，并在发布前运行：

```bash
bun run changeset
bun run version-packages
bun run release
```

## 许可证

[MIT](LICENSE) © Refinex-Space
