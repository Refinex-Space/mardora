<h1 align="center">Markora</h1>

<p align="center">
  <strong>面向 Web 的现代化、可扩展 Markdown 编辑器与预览工具包。</strong>
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
  <a href="#项目概览">项目概览</a> •
  <a href="#本地运行">本地运行</a> •
  <a href="#安装">安装</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#使用方式">使用方式</a> •
  <a href="#功能特性">功能特性</a> •
  <a href="#api-参考">API</a> •
  <a href="#许可证">许可证</a>
</p>

---

## 项目概览

**Markora** 是一个基于 **CodeMirror 6** 构建的可插拔 Markdown 编辑与预览工具包。它提供接近富文本的编辑体验，同时保留标准 Markdown 源文本；也提供静态 HTML 渲染能力，适合博客、文档站、内容管理系统和只读预览场景。

### 为什么选择 Markora？

- **现代架构**：基于 CodeMirror 6 与 Lezer 增量解析。
- **富编辑体验**：在保留 Markdown 控制权的同时提供所见即所得式编辑。
- **可扩展插件系统**：可扩展渲染、快捷键、主题与语法。
- **静态预览**：将 Markdown 渲染为语义化 HTML，并与编辑器保持视觉一致。
- **主题能力**：内置亮色、暗色与跟随系统主题模式。
- **模块化导出**：按需导入 `markora/editor`、`markora/preview`、`markora/plugins` 等模块。

---

## 本地运行

本仓库是 Bun workspace + Turborepo 项目，包含 React、Vue2、Vue3 演示环境、核心包 `packages/markora` 以及共享配置和 UI 包。

### 环境要求

- Node.js `>= 20`
- Bun `1.3.5` 或兼容版本

如果本机尚未安装 Bun，请先参考 Bun 官方安装方式安装；本仓库以 `bun.lock` 和根目录 `packageManager` 字段为准。

### 启动开发环境

在仓库根目录执行：

```bash
bun install
bun run dev
```

`bun run dev` 会通过 Turbo 启动所有声明了 `dev` 脚本的 workspace：

- `playground/react-playground`：运行 Next.js 开发服务器，默认地址为 `http://localhost:3000`
- `playground/vue2-playground`：运行 Vue CLI 开发服务器，默认地址为 `http://localhost:3001`
- `playground/vue3-playground`：运行 Vite 开发服务器，默认地址为 `http://localhost:3003`
- `packages/markora`：运行 `tsup --watch`，监听核心库源码并输出构建产物

如果只想启动 React 演示站点：

```bash
bun run --cwd playground/react-playground dev
```

启动后打开：

```text
http://localhost:3000
```

编辑器 Playground 页面位于：

```text
http://localhost:3000/playground
```

### Vue Playgrounds

仓库还包含 `playground/vue2-playground` 和 `playground/vue3-playground`，用于验证 Markora 在 Vue 2.6 + Vue CLI 4 + Webpack 4 以及 Vue 3 + Vite 环境中的接入效果。它们与 React `/playground` 能力对齐，但实现上独立于 Next.js 演示站点，可独立演进。

启动前先构建 Markora 包：

```bash
bun run --cwd packages/markora build
```

然后进入 Vue2 playground 使用常见 Vue CLI 命令：

```bash
cd playground/vue2-playground
npm run dev
```

Vue CLI 开发服务器默认监听：

```text
http://localhost:3001
```

Vue3 playground 使用 Vite：

```bash
cd playground/vue3-playground
npm run dev
```

Vite 开发服务器默认监听：

```text
http://localhost:3003
```

常用命令：

| 命令                | 说明                               |
| ------------------- | ---------------------------------- |
| `npm run dev`       | 启动当前 Vue playground 开发服务器。 |
| `npm run build`     | 构建当前 Vue playground。          |
| `npm run test:unit` | 运行当前 Vue playground 单元测试。 |

### 生产构建与本地预览

```bash
bun run build
bun run --cwd playground/react-playground start
```

`bun run build` 会通过 Turbo 构建相关 workspace；`bun run --cwd playground/react-playground start` 会启动 Next.js 生产服务，默认同样监听 `http://localhost:3000`。

### 常用命令

| 命令                                       | 说明                                          |
| ------------------------------------------ | --------------------------------------------- |
| `bun install`                              | 安装 workspace 依赖。                         |
| `bun run dev`                              | 启动所有 workspace 的开发任务。               |
| `bun run build`                            | 构建仓库内相关包与应用。                      |
| `bun run lint`                             | 运行 Turbo lint 任务。                        |
| `bun run format`                           | 使用 Prettier 格式化 `ts`、`tsx`、`md` 文件。 |
| `bun run --cwd playground/react-playground typecheck` | 对 React playground 执行 TypeScript 类型检查。 |
| `bun run --cwd packages/markora typecheck` | 对核心库执行 TypeScript 类型检查。            |

---

## 安装

在你的项目中使用偏好的包管理器安装：

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

Markora 依赖下列 CodeMirror 包作为 peer dependencies。请确保它们已经安装到你的项目中：

```bash
npm install @codemirror/commands @codemirror/lang-markdown @codemirror/language @codemirror/language-data @codemirror/state @codemirror/view
```

---

## 快速开始

最小接入示例：

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

## 使用方式

Markora 同时支持交互式编辑和静态预览。你可以把它作为 CodeMirror extension 使用，也可以把 Markdown 渲染为只读 HTML。

### 编辑器集成

下面是使用 `@uiw/react-codemirror` 的完整示例：

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

#### 编辑器配置 `MarkoraConfig`

| 配置项                | 类型                             | 默认值           | 说明                                     |
| --------------------- | -------------------------------- | ---------------- | ---------------------------------------- |
| `theme`               | `ThemeEnum`                      | `ThemeEnum.AUTO` | 主题模式：`LIGHT`、`DARK` 或 `AUTO`。    |
| `themeStyle`          | `Extension`                      | `undefined`      | CodeMirror 主题扩展，例如 `githubDark`。 |
| `plugins`             | `MarkoraPlugin[]`                | `[]`             | 启用的解析和渲染插件。                   |
| `baseStyles`          | `boolean`                        | `true`           | 是否加载默认基础样式。                   |
| `disableViewPlugin`   | `boolean`                        | `false`          | 是否关闭富渲染，退回原始 Markdown 模式。 |
| `defaultKeybindings`  | `boolean`                        | `true`           | 是否启用默认 CodeMirror 快捷键。         |
| `history`             | `boolean`                        | `true`           | 是否启用撤销和重做历史。                 |
| `indentWithTab`       | `boolean`                        | `true`           | 是否使用 Tab 缩进。                      |
| `highlightActiveLine` | `boolean`                        | `true`           | 是否在原始模式下高亮当前行。             |
| `lineWrapping`        | `boolean`                        | `true`           | 是否启用自动换行。                       |
| `onNodesChange`       | `(nodes: MarkoraNode[]) => void` | `undefined`      | 文档更新时触发，返回解析后的 AST。       |
| `markdown`            | `MarkdownConfig[]`               | `[]`             | 额外的 Lezer Markdown 解析扩展。         |
| `extensions`          | `Extension[]`                    | `[]`             | 额外的 CodeMirror extensions。           |
| `keymap`              | `KeyBinding[]`                   | `[]`             | 额外的快捷键绑定。                       |

### 静态预览

将 Markdown 渲染为语义化 HTML，适用于服务端渲染、静态站点生成和只读预览。

```tsx
import { preview, generateCSS, allPlugins, ThemeEnum } from "markora";

const markdown = `
# Hello World

This is a **bold** statement with some \`inline code\`.

- Item 1
- Item 2
- Item 3
`;

// 生成 HTML
const html = preview(markdown, {
  theme: ThemeEnum.LIGHT,
  plugins: allPlugins,
  sanitize: true,
  wrapperClass: "prose",
});

// 生成匹配的 CSS
const css = generateCSS({
  theme: ThemeEnum.LIGHT,
  plugins: allPlugins,
  wrapperClass: "prose",
  includeBase: true,
});

// 在应用中使用
function ArticlePreview() {
  return (
    <>
      <style>{css}</style>
      <article dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
```

#### 预览配置 `PreviewConfig`

| 配置项         | 类型               | 默认值              | 说明                                |
| -------------- | ------------------ | ------------------- | ----------------------------------- |
| `plugins`      | `MarkoraPlugin[]`  | `[]`                | 用于渲染的插件。                    |
| `theme`        | `ThemeEnum`        | `ThemeEnum.AUTO`    | 主题模式。                          |
| `sanitize`     | `boolean`          | `true`              | 是否通过 DOMPurify 清理 HTML 输出。 |
| `wrapperClass` | `string`           | `"markora-preview"` | 包裹元素的 CSS class。              |
| `wrapperTag`   | `string`           | `"article"`         | 包裹元素的 HTML 标签。              |
| `markdown`     | `MarkdownConfig[]` | `[]`                | 额外的 Markdown 解析扩展。          |

---

## 功能特性

### 富文本式编辑

Markora 的 `ViewPlugin` 会装饰编辑器内容，隐藏 Markdown 标记并在原位渲染样式，从而在保留纯文本源内容的前提下提供接近所见即所得的体验。

- **行内格式**：原位展示加粗、斜体、删除线和行内代码。
- **标题**：按层级渲染合适的字号和字重。
- **列表**：支持有序列表和无序列表。
- **图片**：支持行内图片、替代文本和标题说明。
- **链接**：提供可点击链接和视觉区分。
- **代码块**：支持带语言检测的语法高亮。

### 插件架构

Markora 中的功能都通过插件组织。插件可以提供：

- **CodeMirror Extensions**：自定义 decorations、widgets 和行为。
- **Markdown Parser Extensions**：扩展 Lezer 解析器以支持自定义语法。
- **Keymaps**：添加键盘快捷键。
- **Themes**：根据当前主题注入样式。
- **Preview Renderers**：定义静态 HTML 中元素的渲染方式。

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

### AST 访问

通过 `onNodesChange` 回调可以访问解析后的文档结构，适合构建：

- 目录
- 文档大纲
- 导航面包屑
- 字数和行数统计

```typescript
type MarkoraNode = {
  from: number; // 起始位置
  to: number; // 结束位置
  name: string; // 节点类型，例如 "Heading" 或 "Paragraph"
  children: MarkoraNode[];
  isSelected: boolean; // 光标是否位于当前节点内
};
```

### 主题能力

Markora 提供自动亮暗模式支持：

- **自动检测**：通过 `ThemeEnum.AUTO` 跟随系统偏好。
- **手动控制**：可强制使用 `ThemeEnum.LIGHT` 或 `ThemeEnum.DARK`。
- **自定义主题**：通过 `themeStyle` 传入任意 CodeMirror 主题。
- **预览一致性**：通过 CSS 生成能力保持预览与编辑器视觉一致。

### 模块化导入

按需导入可以减少最终 bundle 体积：

```typescript
// 完整包
import { markora, preview, allPlugins } from "markora";

// 仅编辑器
import { markora, MarkoraPlugin } from "markora/editor";

// 仅预览
import { preview, generateCSS } from "markora/preview";

// 单独插件
import { HeadingPlugin, ListPlugin } from "markora/plugins";
```

---

## API 参考

### 导出项

| 导出            | 路径              | 说明                                    |
| --------------- | ----------------- | --------------------------------------- |
| `markora`       | `markora/editor`  | 主编辑器 extension factory。            |
| `MarkoraPlugin` | `markora/editor`  | 创建插件的基类。                        |
| `ThemeEnum`     | `markora/editor`  | 主题模式枚举：`AUTO`、`LIGHT`、`DARK`。 |
| `MarkoraNode`   | `markora/editor`  | AST 节点类型。                          |
| `preview`       | `markora/preview` | 将 Markdown 渲染为 HTML 的函数。        |
| `generateCSS`   | `markora/preview` | 生成预览样式 CSS 的函数。               |
| `allPlugins`    | `markora/plugins` | 所有内置插件数组。                      |

---

## 浏览器支持

Markora 支持现代浏览器：

| 浏览器  | 版本 |
| ------- | ---- |
| Chrome  | 88+  |
| Firefox | 78+  |
| Safari  | 14+  |
| Edge    | 88+  |

---

## 贡献

欢迎提交贡献。请在发起 pull request 前阅读 [贡献指南](CONTRIBUTING.md)。

---

## 许可证

[MIT](LICENSE) © [Refinex-Space](https://github.com/Refinex-Space)
