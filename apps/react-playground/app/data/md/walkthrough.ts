export default `
# Draftly — 完整指南

**Draftly** 是一款基于 CodeMirror 6 的富 Markdown 编辑器扩展。它将一个标准的代码编辑器转变为美观的、WYSIWYG 风格的书写体验——在你输入时**就地**渲染标题、图片、数学公式、图表等。

本指南涵盖了每一项特性、插件以及 API。让我们开始吧。

---
## 1. 入门
### 安装
通过 npm 安装该包：

\`\`\`shell title="npm"
npm install draftly
\`\`\`

#### Peer Dependencies
Draftly 需要以下 CodeMirror 6 peer dependencies：

\`\`\`shell title="peer deps" line-numbers
npm install @codemirror/commands @codemirror/lang-markdown @codemirror/language @codemirror/language-data @codemirror/state @codemirror/view
\`\`\`

### 最小示例
\`draftly()\` 函数返回一个 CodeMirror 扩展包。把它放入任意 \`EditorView\` 中：

\`\`\`ts title="main.ts" line-numbers caption="这就是让一个富编辑器跑起来所需的全部代码。"
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { draftly } from "draftly/editor";
import { allPlugins } from "draftly/plugins";

const view = new EditorView({
  state: EditorState.create({
    doc: "# Hello, Draftly!",
    extensions: [draftly({ plugins: allPlugins })],
  }),
  parent: document.getElementById("editor")!,
});
\`\`\`

---
## 2. 配置
\`draftly()\` 函数接收一个 \`DraftlyConfig\` 对象。下面是一个包含全部选项的完整示例：

\`\`\`ts title="config.ts" line-numbers {4-15}
import { draftly } from "draftly/editor";
import { allPlugins } from "draftly/plugins";

const extensions = draftly({
  theme: "auto",                // "auto" | "dark" | "light"
  baseStyles: true,             // 应用默认样式
  plugins: allPlugins,          // 要加载的插件
  defaultKeybindings: true,     // 默认的 CodeMirror 快捷键
  history: true,                // 撤销 / 重做
  indentWithTab: true,          // Tab 缩进
  highlightActiveLine: true,    // 高亮当前行（原始模式）
  lineWrapping: true,           // 软换行
  disableViewPlugin: false,     // 禁用富文本渲染（原始模式）
  onNodesChange: (nodes) => {}, // AST 变更时的回调
});
\`\`\`

> 将 \`disableViewPlugin\` 设为 \`true\` 会把 Draftly 变成一个普通的 Markdown 编辑器——没有装饰、没有 widget，只有原始文本。

---
## 3. 斜杠命令与附件

在空行行首输入 \`/\` 即可打开 Draftly 紧凑的命令菜单。使用方向键在命令间移动，回车插入，Esc 关闭菜单。

媒体类命令使用浏览器的附件协议。在本 playground 中，上传通过本地 \`blob:\` URL 模拟，因此结果会立即预览。生产环境应用应提供一个 uploader，将文件存储到后端、OSS 或 MinIO 兼容的服务，并返回一个公开 URL。

你也可以将文件粘贴或拖入编辑器。Draftly 会插入一个上传标记，调用配置好的 uploader，并在上传成功后将标记替换为 Markdown 或 HTML。

---
## 4. 模块化导出
Draftly 提供三个入口，让你只导入所需内容：

| 入口               | 提供的内容 |
|--------------------|-----------|
| \`draftly/editor\`   | 核心 \`draftly()\` 函数、\`DraftlyPlugin\` 基类、工具函数 |
| \`draftly/plugins\`  | 所有内置插件 + \`essentialPlugins\` / \`allPlugins\` 集合 |
| \`draftly/preview\`  | 服务端 \`preview()\` 渲染器 + \`generateCSS()\` |

---
## 5. 插件系统
Draftly 中的每一项特性都是一个 **plugin**。插件继承自抽象类 \`DraftlyPlugin\`，可以：

- **提供装饰** — 应用到编辑器上的 mark、line 和 widget decoration
- **扩展 Markdown 解析器** — 通过 Lezer 实现自定义的 block/inline 语法
- **添加快捷键** — 作用域限定在该插件的键盘快捷键
- **提供主题** — 通过 \`createTheme()\` 提供 dark / light / auto CSS
- **渲染为 HTML** — 通过 \`renderToHTML()\` 进行静态预览渲染

#### 插件生命周期
1. **\`onRegister(ctx)\`** — 插件被添加时调用；接收编辑器配置。
2. **\`onViewReady(view)\`** — \`EditorView\` 挂载后调用一次。
3. **\`onViewUpdate(update)\`** — 每次文档/选区变更时调用。
4. **\`buildDecorations(ctx)\`** — 重建装饰时调用。
5. **\`onUnregister()\`** — 清理钩子。

#### 创建自定义插件
\`\`\`ts title="my-plugin.ts" line-numbers caption="一个最小化的自定义插件骨架。"
import { DraftlyPlugin, DecorationContext } from "draftly/editor";

class MyPlugin extends DraftlyPlugin {
  readonly name = "my-plugin";
  readonly version = "1.0.0";

  buildDecorations(ctx: DecorationContext) {
    // 在此处添加装饰
  }
}
\`\`\`

---
## 6. 内置插件 — 完整参考

Draftly 内置了 **12** 个插件。每个插件处理特定的 Markdown 结构，提供键盘快捷键，应用主题，并为预览渲染 HTML。

---
### 6.1 ParagraphPlugin
为段落之间添加垂直间距，留出视觉呼吸空间。

这是一个普通段落。请注意文本块之间舒适的间距。

---
### 6.2 HeadingPlugin
渲染 ATX 标题（\`#\` 到 \`######\`），字号按比例缩放。

**行为：** 当光标位于标题**之外**时，\`#\` 标记会被*隐藏*；编辑时会重新显示。

# 标题 1
## 标题 2
### 标题 3
#### 标题 4
##### 标题 5
###### 标题 6

---
### 6.3 InlinePlugin
处理行内文本格式，并提供智能的标记切换。当光标位于样式范围之外时，格式标记会被隐藏。

| 格式           | 语法           | 快捷键               | 示例 |
|---------------|----------------|----------------------|---------|
| **粗体**      | \`**text**\`     | \`Ctrl/Cmd + B\`       | **粗体** |
| *斜体*        | \`*text*\`       | \`Ctrl/Cmd + I\`       | *斜体* |
| ~~删除线~~    | \`~~text~~\`     | \`Ctrl/Cmd + Shift+S\` | ~~删除线~~ |
| ==高亮== | \`==text==\`     | \`Ctrl/Cmd + Shift+H\` | ==高亮文本== |
| ~下标~   | \`~text~\`       | \`Ctrl/Cmd + ,\`       | H~2~O |
| ^上标^ | \`^text^\`       | \`Ctrl/Cmd + .\`       | E = mc^2^ |

可自由组合：***粗斜体***、~~**删除粗体**~~、==**粗体高亮**==

---
### 6.4 LinkPlugin
提供完整的 [链接](https://draftly.dev) 支持，带有可交互的悬停提示和智能插入。

**特性：**
- **悬停** 链接可查看包含 URL 的提示
- **点击** 已渲染的链接可显示原始 Markdown
- **Ctrl+点击** 链接可在新标签页中打开
- **\`Ctrl/Cmd + K\`** 插入/切换链接

[访问 Draftly](https://github.com/neuronexul/draftly)

---
### 6.5 ListPlugin
支持无序列表、有序列表和带可交互复选框的任务列表。

**快捷键：**
| 操作            | 快捷键               |
|------------------|----------------------|
| 无序列表         | \`Ctrl/Cmd+Shift+8\` |
| 有序列表         | \`Ctrl/Cmd+Shift+7\` |
| 任务列表         | \`Ctrl/Cmd+Shift+9\` |

#### 无序列表
- 第一项
- 第二项
  - 嵌套项
  - 另一个嵌套项

#### 有序列表
1. 第一步
2. 第二步
   1. 子步骤
   2. 另一个子步骤

#### 任务列表
- [ ] 编写指南
- [x] 探索所有插件
- [ ] 创建自定义插件

---
### 6.6 ImagePlugin
就地渲染图片，采用 figure/figcaption 语义并支持懒加载。

**快捷键：** \`Ctrl/Cmd + Shift + I\` 插入图片。

**语法：** \`![alt text](url "optional title")\`

![Draftly Placeholder](https://res.cloudinary.com/djoo8ogmp/image/upload/v1746213279/uploaded/image_yjzjdl.png "A beautiful Minecraft sunset")

**行为：** 图片始终渲染在语法下方。点击图片时会显示原始 Markdown 以便编辑。损坏的图片会显示一条有用的错误信息。

---
### 6.7 CodePlugin
功能最丰富的插件。同时处理行内代码和围栏代码块，支持语法高亮、行号、高亮、标题、说明文字和复制按钮。

#### 行内代码
使用反引号表示行内代码：\`const x = 42;\` — 当光标移开时反引号会被隐藏。

**快捷键：**
| 操作            | 快捷键               |
|------------------|----------------------|
| 行内代码         | \`Ctrl/Cmd + E\`       |
| 代码块           | \`Ctrl/Cmd + Shift+E\` |

#### 围栏代码块
CodeInfo 行（紧跟 \` \` \` \` 之后）支持以下属性：

| 属性           | 语法                  | 说明 |
|----------------|-----------------------|-------------|
| 语言           | \`tsx\`                 | 语法高亮的语言 |
| 标题           | \`title="file.tsx"\`    | 头部标题 |
| 说明           | \`caption="A demo"\`    | 底部说明文字 |
| 行号           | \`line-numbers\`        | 显示行号 |
| 起始行         | \`line-numbers{10}\`    | 从第 10 行开始 |
| 行高亮         | \`{2-4,7}\`             | 高亮第 2—4 行和第 7 行 |
| 文本高亮       | \`/pattern/\`           | 高亮匹配正则的文本 |
| 指定匹配       | \`/pattern/2-4\`        | 仅高亮第 2—4 处匹配 |
| 复制按钮       | \`copy\`（默认开启）    | 剪贴板复制按钮 |

#### 示例：组合所有特性
\`\`\`tsx line-numbers{1} title="Counter.tsx" caption="A React counter component with state management." {1,4-6} /count/
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);

  return (
    <div>
      <button onClick={decrement}>-</button>
      <span>{count}</span>
      <button onClick={increment}>+</button>
    </div>
  );
}
\`\`\`

#### 示例：带行高亮的 Python
\`\`\`python line-numbers title="fibonacci.py" {4-6} /fibonacci/
def fibonacci(n):
    """Generate Fibonacci sequence up to n terms."""
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

for num in fibonacci(10):
    print(num)
\`\`\`

---
### 6.8 QuotePlugin
渲染带有样式化左边框的引用块。当光标移开时，\`>\` 标记会被隐藏。

> "种一棵树最好的时间是 20 年前，其次是现在。"
>
> — 中国谚语

---
### 6.9 MathPlugin (KaTeX)
使用 **KaTeX** 渲染 LaTeX 数学公式。通过自定义解析器同时支持行内（inline）和块级（display）模式。

#### 行内公式
公式 $E = mc^2$ 解释了质能等价关系。

二次方程求根公式为 $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$。

#### 块级公式（display 模式）
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

$$
\\begin{aligned}
\\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0} \\\\
\\nabla \\cdot \\mathbf{B} &= 0 \\\\
\\nabla \\times \\mathbf{E} &= -\\frac{\\partial \\mathbf{B}}{\\partial t} \\\\
\\nabla \\times \\mathbf{B} &= \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}
\\end{aligned}
$$

---
### 6.10 MermaidPlugin
通过 \` \`\`\`mermaid\` 语法的围栏代码块渲染 **Mermaid** 图表。支持 \`theme\` 属性以及带加载状态的异步渲染。

\`\`\`mermaid
graph TD
    A[Write Markdown] --> B{Does it render?}
    B -->|Yes| C[Ship it!]
    B -->|No| D[Check syntax]
    D --> A
\`\`\`

图表会实时渲染在代码块下方。点击渲染出的图表即可编辑其定义。

---
### 6.11 HTMLPlugin
支持在 Markdown 中使用原始 HTML——既支持**行内元素**，也支持**块级元素**。使用 **DOMPurify** 进行净化。

#### 行内 HTML
这段文字中嵌入了一个 <span style="color: #FF6B6B; font-weight: bold;">带行内样式的 span</span>。

#### HTML 块
<div style="text-align: center; padding: 1rem; border-radius: 0.5rem; border: 1px solid currentColor;">
  <strong>这是一个完整的 HTML 块</strong>
  <p style="margin: 0.5rem 0;">Draftly 会就地渲染它，并在点击时显示原始源码。</p>
</div>

---
## 7. 静态预览（服务端渲染）
Draftly 的 **preview** 模块可将 Markdown 渲染为语义化 HTML——非常适合服务端渲染、导出或静态站点生成。

\`\`\`ts title="preview-example.ts" line-numbers caption="在服务端将 Markdown 渲染为 HTML。"
import { preview } from "draftly/preview";
import { allPlugins } from "draftly/plugins";

const html = await preview("# Hello World\\n\\nSome **bold** text.", {
  plugins: allPlugins,
  wrapperClass: "draftly-preview",
  wrapperTag: "article",
  sanitize: true,
  theme: "auto",
});

console.log(html);
// <article class="draftly-preview">
//   <div class="cm-draftly-line-h1"><h1 class="cm-draftly-h1">Hello World</h1></div>
//   <p class="cm-draftly-paragraph">Some <span class="cm-draftly-strong">bold</span> text.</p>
// </article>
\`\`\`

### 生成 CSS
使用 \`generateCSS()\` 为预览提取所有插件样式：

\`\`\`ts title="css-gen.ts" line-numbers
import { generateCSS } from "draftly/preview";
import { allPlugins } from "draftly/plugins";

const css = generateCSS({
  plugins: allPlugins,
  theme: "auto",
  wrapperClass: "draftly-preview",
  includeBase: true,
});
\`\`\`

---
## 8. 主题
插件通过 \`createTheme()\` 使用一套**三层主题**系统：

| 层级     | 应用时机 |
|-----------|-------------|
| \`default\` | 始终 |
| \`dark\`    | 当 theme 为 \`"dark"\` 时 |
| \`light\`   | 当 theme 为 \`"light"\` 时 |

\`\`\`ts title="theme-example.ts" line-numbers caption="插件主题在内部是如何组织的。"
import { createTheme } from "draftly/editor";

const myTheme = createTheme({
  default: {
    ".cm-my-element": {
      fontSize: "1rem",
    },
  },
  dark: {
    ".cm-my-element": {
      color: "#58a6ff",
    },
  },
  light: {
    ".cm-my-element": {
      color: "#0366d6",
    },
  },
});
\`\`\`

---
## 9. 键盘快捷键 — 速查表

| 操作                | 快捷键               |
|----------------------|----------------------|
| **粗体**             | \`Ctrl/Cmd + B\`        |
| **斜体**             | \`Ctrl/Cmd + I\`        |
| **删除线**           | \`Ctrl/Cmd + Shift + S\` |
| **高亮**             | \`Ctrl/Cmd + Shift + H\` |
| **下标**             | \`Ctrl/Cmd + ,\`        |
| **上标**             | \`Ctrl/Cmd + .\`        |
| **行内代码**         | \`Ctrl/Cmd + E\`        |
| **代码块**           | \`Ctrl/Cmd + Shift + E\` |
| **链接**             | \`Ctrl/Cmd + K\`        |
| **图片**             | \`Ctrl/Cmd + Shift + I\` |
| **无序列表**         | \`Ctrl/Cmd + Shift + 8\` |
| **有序列表**         | \`Ctrl/Cmd + Shift + 7\` |
| **任务列表**         | \`Ctrl/Cmd + Shift + 9\` |
| **撤销**             | \`Ctrl/Cmd + Z\`        |
| **重做**             | \`Ctrl/Cmd + Shift + Z\` |

---
## 10. 架构概览
Draftly 基于清晰、分层的架构构建：

\`\`\`mermaid
graph LR
    A[draftly/editor] --> B[DraftlyPlugin]
    A --> C[View Plugin]
    A --> D[Theme System]
    B --> E[Decorations]
    B --> F[Markdown Parser]
    B --> G[Keymaps]
    B --> H[renderToHTML]
    H --> I[draftly/preview]
    I --> J[PreviewRenderer]
    I --> K[generateCSS]
\`\`\`

**关键设计模式：**
- **插件架构** — 所有特性都封装在具有清晰接口的插件中
- **光标感知渲染** — 当光标离开时隐藏语法标记，编辑时重新显示
- **Widget 装饰** — 复杂元素（图片、数学公式、Mermaid、复选框）通过 CodeMirror widget 渲染
- **预览一致性** — 装饰编辑器的同一套插件也会渲染静态 HTML 预览

---
## 11. 总结
Draftly 兼具两者之长：**Markdown 的精确性** 与 **WYSIWYG 编辑器的流畅性**。凭借其模块化的插件系统、完整的键盘快捷键覆盖、dark/light 主题，以及编辑器 + 预览的双重渲染——它是现代 Markdown 编辑的完整解决方案。

| 特性               | 状态 |
|-------------------|--------|
| 标题（1—6）       | ✅     |
| 粗体 / 斜体       | ✅     |
| 删除线            | ✅     |
| 高亮              | ✅     |
| 下标 / 上标       | ✅     |
| 链接              | ✅     |
| 图片              | ✅     |
| 列表（UL/OL）     | ✅     |
| 任务列表          | ✅     |
| 代码（行内）      | ✅     |
| 代码（围栏）      | ✅     |
| 引用块            | ✅     |
| 数学公式（KaTeX） | ✅     |
| Mermaid 图表      | ✅     |
| HTML（行内）      | ✅     |
| HTML（块级）      | ✅     |
| 静态预览          | ✅     |
| CSS 生成          | ✅     |
| dark / light 主题 | ✅     |
| 自定义插件        | ✅     |
`;
