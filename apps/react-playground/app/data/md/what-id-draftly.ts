export default `
## Draftly - 所见即所得
消除书写与预览之间的屏障。

**Draftly** 是一款基于强大的 CodeMirror 6 框架构建的现代、直观的 Markdown 编辑器，致力于为纯文本提供真正的 **所见即所得（WYSIWYG）** 体验。告别对原始 ~~Markdown 语法~~ 的分心；借助 _Draftly_，你的文档会在输入时即时转化为美观、可读的预览，同时底层 Markdown 始终可访问、可编辑。

![My PlaceHolder](https://res.cloudinary.com/djoo8ogmp/image/upload/v1746213279/uploaded/image_yjzjdl.png "Hello From Minecraft")
### 为什么选择 Draftly？
- **🚀 现代架构：** 基于 CodeMirror 6 构建，配合增量式 Lezer 解析。
- **🎨 富文本编辑：** WYSIWYG 风格的体验，同时拥有完整的 Markdown 控制力。
- **🔌 可扩展的插件系统：** 可添加自定义渲染、快捷键和语法。
- **🖼️ 静态预览：** 将 Markdown 渲染为语义化 HTML，视觉一致。
- **🌗 主题：** 一等公民式地支持浅色与深色模式。
- **📦 模块化导出：** 只导入你需要的内容（draftly/editor、draftly/preview、draftly/plugins）。

### 示例：
到目前为止，我们已经看到了标题、图片和列表。接下来探索一些你可以借助 Draftly 使用的其他特性。

#### 排版
排版支持行内样式。**粗体** 也可以写成 __粗体__。*斜体* 可以写成 _斜体_。我们还支持 ~~删除线~~。\`行内代码\` 可用于展示代码片段。

- **下标：** 2H~2~O => 2H~2~ + O~2~
- **上标：** a^2^ + b^2^ = (a+b)^2^

#### 代码块：
代码块适用于展示大段代码。code 插件包含若干额外特性，可通过 CodeInfo（首行）进行配置。
- **Language** - 紧跟代码标记（\`\`\`）之后的第一个内容即语言。这是唯一的位置参数。
- **title=** 代码块的标题。如未提供，头部将显示 *language*。
- **caption=** 显示在代码块下方的说明文字。
- **line-numbers** 是否显示行号。还可接收一个数值作为起始行号（例如 \`line-numbers{5}\`）。
- **/pattern/** 高亮匹配的内容。若无参数，则高亮所有匹配项。\`/pattern/3\` 仅高亮第 3 处匹配。\`/pattern/2-4\` 高亮第 2 至第 4 处匹配。
- **{line_no}** 行高亮。\`{2}\` 高亮第 2 行。\`{2-4}\` 高亮第 2 至第 4 行。两种模式可用逗号合并。\`{2,4-6,9}\` 高亮第 2、4、5、6、9 行。

\`\`\`tsx line-numbers title="hello.tsx" caption="This component renders 'Hello World'" /Hello World/1-5,8-10,19 {2,6-8}
"use client";
import React from "react";

export default function page(props: Props) {
  return (
    <div className="w-full h-full grid place-items-center">
        <h1>Hello World</h1>
    </div>
  )
}
\`\`\`

#### 有序列表与任务列表
1. 这是一个 **有序列表** 的示例。
2. 这是第二行
   1. 这是一个嵌套列表
   2. 这是嵌套的第二行
- [ ] 这是一个任务列表
- [x] 这是一个已勾选的任务列表项

#### 数学公式（KaTeX）：
- 行内公式：$\\min_{(w\\in\\mathbb R^d)}\\sum_{i=1}^n(w^Tx_i-y_i)^2$
- 块级公式：

$$
\\begin{aligned}

\\nabla_w \\left( \\frac{1}{2 \\sigma^2} \\sum_{i=1}^n(w^Tx_i-y_i)^2 \\right)
      &= \\frac{1}{2\\sigma^2} \\sum_{i=1}^n \\nabla_w(w^Tx_i-y_i)^2 \\\\
      &= \\frac{1}{2\\sigma^2} \\sum_{i=1}^n 2(w^Tx_i-y_i)x_i\\\\
      &= \\frac{1}{\\sigma^2} \\sum_{i=1}^n (w^Tx_i-y_i)x_i

\\end{aligned}
$$

#### HTML：
**Draftly** 同时支持行内 **HTML**、**HTML 块** 和 **注释**。<span style="border: 1px solid; padding: 0 0.5rem;">行内 HTML</span>

<div style="display: grid; place-items: center">
  <svg viewBox="0 0 200 200" width="400px" xmlns="http://www.w3.org/2000/svg" aria-labelledby="t">
    <image href="https://res.cloudinary.com/djoo8ogmp/image/upload/w_500/v1770482161/uploaded/image-1770482148521_vpqle9.webp"
      width="200" height="200"
      preserveAspectRatio="xMidYMid slice"
      clip-path="url(#blobClip)"/>
    <clipPath id="blobClip">
      <path d="M43.1,-68.5C56.2,-58.6,67.5,-47.3,72.3,-33.9C77.2,-20.5,75.5,-4.9,74.2,11.3C72.9,27.6,71.9,44.5,63.8,57.2C55.7,69.8,40.6,78.2,25.5,79.2C10.4,80.1,-4.7,73.6,-20.9,69.6C-37.1,65.5,-54.5,63.9,-66,54.8C-77.5,45.8,-83.2,29.3,-85.7,12.3C-88.3,-4.8,-87.7,-22.3,-79.6,-34.8C-71.5,-47.3,-55.8,-54.9,-41.3,-64.2C-26.7,-73.6,-13.4,-84.7,0.8,-86C15,-87.2,29.9,-78.5,43.1,-68.5Z"
        transform="translate(100 100)"/>
    </clipPath>
    <path
      class="blob"
      d="M43.1,-68.5C56.2,-58.6,67.5,-47.3,72.3,-33.9C77.2,-20.5,75.5,-4.9,74.2,11.3C72.9,27.6,71.9,44.5,63.8,57.2C55.7,69.8,40.6,78.2,25.5,79.2C10.4,80.1,-4.7,73.6,-20.9,69.6C-37.1,65.5,-54.5,63.9,-66,54.8C-77.5,45.8,-83.2,29.3,-85.7,12.3C-88.3,-4.8,-87.7,-22.3,-79.6,-34.8C-71.5,-47.3,-55.8,-54.9,-41.3,-64.2C-26.7,-73.6,-13.4,-84.7,0.8,-86C15,-87.2,29.9,-78.5,43.1,-68.5Z"
      transform="translate(100 100)"
      fill="url(#imgFill)"
    />
    <path
      id="text"
      d="M43.1,-68.5C56.2,-58.6,67.5,-47.3,72.3,-33.9C77.2,-20.5,75.5,-4.9,74.2,11.3C72.9,27.6,71.9,44.5,63.8,57.2C55.7,69.8,40.6,78.2,25.5,79.2C10.4,80.1,-4.7,73.6,-20.9,69.6C-37.1,65.5,-54.5,63.9,-66,54.8C-77.5,45.8,-83.2,29.3,-85.7,12.3C-88.3,-4.8,-87.7,-22.3,-79.6,-34.8C-71.5,-47.3,-55.8,-54.9,-41.3,-64.2C-26.7,-73.6,-13.4,-84.7,0.8,-86C15,-87.2,29.9,-78.5,43.1,-68.5Z"
      transform="translate(100 100)"
      fill="none" stroke="none"
      pathLength="100"
    />
    <text class="text-content" fill="currentColor">
      <textPath href="#text" startOffset="0%">❤ MADE WITH LOVE ❤ MADE WITH LOVE ❤ MADE WITH LOVE ❤ MADE WITH LOVE
        <animate attributeName="startOffset" from="0%" to="100%" dur="15s" repeatCount="indefinite" />
      </textPath>
      <textPath href="#text" startOffset="100%">❤ MADE WITH LOVE ❤ MADE WITH LOVE ❤ MADE WITH LOVE ❤ MADE WITH LOVE
        <animate attributeName="startOffset" from="-100%" to="0%" dur="15s" repeatCount="indefinite" />
      </textPath>
    </text>
  </svg>
  <style>
    svg{
      max-width: 70vw;
      max-height: 80vh;
      aspect-ratio: 1/1;
    }
    svg>#blobClip{
      transform-origin: center;
      transition: ease-out transform .4s;
    }
    svg:hover>#blobClip{
      transform: scale(1.15) translate(0%, 0%);
    }
    svg:hover>.text-content{
      fill: white;
      mix-blend-mode: overlay;
    }
    .text-content {
      font: 700 10px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      fill: currentColor;
      mix-blend-mode: normal;
      transition: ease fill .5s;
    }
  </style>
</div>

## 安装
通过你偏好的包管理器安装该包：
\`\`\`shell title="npm"
npm install draftly
\`\`\`

#### Peer Dependencies
Draftly 需要以下 CodeMirror 包作为 peer dependencies。请确保它们已安装在你的项目中：
\`\`\`shell title="npm"
npm install @codemirror/commands @codemirror/lang-markdown @codemirror/language @codemirror/language-data @codemirror/state @codemirror/view
\`\`\`

#### 快速开始
几秒钟即可上手。
\`\`\`js title="index.js" line-numbers
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { draftly } from "draftly/editor";
import { allPlugin } from "draftly/plugins";

const view = new EditorView({
  state: EditorState.create({
    doc: "# Hello, Draftly!",
    extensions: [draftly({ plugins: allPlugins })],
  }),
  parent: document.getElementById("editor")!,
});
\`\`\`

总而言之，**Draftly** 代表了 Markdown 编辑领域的一次重大飞跃，有效消除了书写与预览之间的屏障。借助 CodeMirror 6 现代、高性能的能力，它提供了一种流畅、实时的 WYSIWYG 体验，能够直观地渲染从基础排版到代码块、KaTeX 数学公式等复杂元素的一切内容。这种 Markdown 原始能力与富文本编辑器即时视觉反馈的无缝融合，创造了一个专注、高效且强大的环境，使其成为写作者、开发者和学者的卓越工具。

由于 **LiveMD 仍处于早期阶段并正在积极开发中**，我们诚邀你共同塑造它的未来。你的反馈无比珍贵，我们也欢迎你为这一开源项目贡献代码。
`;
