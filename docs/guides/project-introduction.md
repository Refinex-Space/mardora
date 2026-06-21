---
owner: refinex
updated: 2026-06-21
status: active
referenced_by: docs/README.md#product-and-integration-guides
---

# 项目介绍

本文是 Mardora 的产品级技术参考文档。它定义 Mardora 能解决什么问题、提供哪些 API、每个配置项的含义和默认值、附件上传的真实能力边界，以及业务团队应该如何把它接入到自己的项目中。

Mardora 的定位很明确：它是一个基于 CodeMirror 6 的 Markdown 编辑器能力包，而不是某个前端框架的黑盒组件。业务应用负责页面布局、状态管理、数据保存和文件存储；Mardora 负责把 CodeMirror 6 组装成可扩展的 Markdown 编辑器，并提供编辑态渲染、插件体系、slash commands、附件上传入口、选区工具栏、目录、静态预览 HTML 和 CSS 生成。

当前 `1.3.2` 文档按 playground 同等能力整理。业务侧按本文和对应框架指南接入后，应能获得编辑、源码、预览、输出、插件开关、附件、slash commands、选区工具栏、链接卡片、TOC、主题和 i18n 的完整能力链路。

## 1. 能力边界

| 能力                  | Mardora 是否提供 | 说明                                                                                                                                             |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| CodeMirror 6 扩展组装 | 是               | `mardora()` 返回 `Extension[]`，可直接放入 `EditorState.create()`。                                                                              |
| Markdown 解析         | 是               | 基于 `@codemirror/lang-markdown` 与 Lezer Markdown，支持插件追加 `MarkdownConfig`。                                                              |
| 编辑态所见即所得装饰  | 是               | 由内置 view plugin 与各个 `MardoraPlugin` 生成 decoration/widget。                                                                               |
| 内置 Markdown 插件    | 是               | 覆盖段落、标题、行内格式、链接、列表、表格、HTML、图片、数学公式、Mermaid、代码块、引用/Callout、分割线、Emoji。表格支持 Live 模式行列句柄菜单。 |
| Slash commands        | 是               | 行首输入 `/` 打开命令菜单，可插入基础 Markdown、Callout 或触发附件选择。                                                                         |
| 附件上传入口          | 是               | 提供文件选择、粘贴、拖拽接入点，调用业务传入的 `uploader`，成功后替换为 Markdown/HTML。                                                          |
| 附件存储服务          | 否               | Mardora 不上传到 OSS/S3/后端，也不签名 URL；这些必须由业务 `uploader` 实现。                                                                     |
| 选区工具栏            | 是               | 选择文本后显示浮动工具栏，支持格式、链接、颜色、高亮和列表操作；按钮 tooltip 和面板文案支持 i18n。                                               |
| 链接卡片              | 是               | 独占行链接可切换为卡片，使用隐藏元信息注释持久化；目标站点元信息由业务服务端 resolver 解析。                                                     |
| 编辑器内目录          | 是               | 可从标题生成目录，支持活动标题、宽度调整和可选本地持久化。                                                                                       |
| 静态预览              | 是               | `preview()` 输出 HTML，`generateCSS()` 输出同主题和插件匹配的 CSS。                                                                              |
| 数据持久化            | 否               | 业务侧应自行接入 localStorage、接口、数据库或文档服务。                                                                                          |
| Vue/React 组件封装    | 否               | Mardora 提供框架无关 API；Vue/React 接入方式见对应指南。                                                                                         |

## 2. 安装与内置依赖

Mardora 发布包名为 `mardora`。核心 CodeMirror 6 依赖由 Mardora 作为 dependencies 固定并随包安装，业务项目只需安装 Mardora。

```shell
npm install mardora
```

如果业务自己实现类似 playground 的 HTML/CSS 输出面板，可按需选择安装对应的 CodeMirror language/theme 包；Mardora 核心编辑与预览不需要这些包。

## 3. 导出入口

| 导出入口          | 推荐用途                                                         | 典型导入                                                    |
| ----------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| `mardora`         | 聚合入口，适合快速验证。                                         | `import { mardora, allPlugins } from "mardora";`            |
| `mardora/editor`  | 编辑器核心、配置类型、主题、i18n、附件、slash、TOC、选区工具栏。 | `import { mardora, ThemeEnum } from "mardora/editor";`      |
| `mardora/plugins` | 内置插件与插件集合。                                             | `import { allPlugins, CodePlugin } from "mardora/plugins";` |
| `mardora/preview` | 静态 HTML、CSS、目录提取。                                       | `import { preview, generateCSS } from "mardora/preview";`   |
| `mardora/lib`     | 底层输入处理工具。                                               | 按需使用。                                                  |

发布产物提供 ESM、CJS 和 TypeScript declarations。生产项目建议使用子路径导入，减少不必要的依赖面。

## 4. 最小编辑器

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
        // 跟随系统主题；也可以明确使用 ThemeEnum.LIGHT 或 ThemeEnum.DARK。
        theme: ThemeEnum.AUTO,

        // allPlugins 启用全部内置 Markdown 能力。
        plugins: allPlugins,

        // 默认会启用编辑态 WYSIWYG view plugin。
        disableViewPlugin: false,
      }),
    ],
  }),
});

// 单页应用卸载时必须执行，避免事件监听和 DOM 节点泄漏。
// view.destroy();
```

## 5. `MardoraConfig` 配置总表

`mardora(config)` 返回 CodeMirror 6 `Extension[]`。以下默认值来自当前源码实现。

| 属性                  | 类型                             | 默认值               | 作用                                        | 建议                                                   |
| --------------------- | -------------------------------- | -------------------- | ------------------------------------------- | ------------------------------------------------------ |
| `theme`               | `ThemeEnum`                      | `ThemeEnum.AUTO`     | 控制 Mardora 内置样式使用 auto/dark/light。 | 和应用主题、CodeMirror theme 同步。                    |
| `locale`              | `"zh-CN" \| "en-US"`             | `"zh-CN"`            | 编辑器内置 UI 文案语言。                    | 中文产品使用默认值；英文产品设为 `"en-US"`。           |
| `i18n.locale`         | `"zh-CN" \| "en-US"`             | `undefined`          | 也可通过 i18n 配置 locale。                 | 优先级低于 `slashCommands.locale`，高于 `locale`。     |
| `baseStyles`          | `boolean`                        | `true`               | 是否注入 Mardora 插件基础样式。             | 首次接入保持 `true`；完全自定义视觉时再关闭。          |
| `contentWidth`        | `"default" \| "full" \| object`  | `"default"`          | 控制 Live 编辑态正文内容宽度。              | 知识库/IDE 工作区可设为 `"full"`；长文阅读列保持默认。 |
| `fonts`               | `MardoraFontConfig`              | 内置系统字体栈       | 控制文档、代码和 Mardora UI 字体。          | 传合法 CSS `font-family` 值；预览 CSS 使用同一配置。   |
| `plugins`             | `MardoraPlugin[]`                | `[]`                 | 要启用的 Markdown 插件。                    | playground 质量使用 `allPlugins`。                     |
| `markdown`            | `MarkdownConfig[]`               | `[]`                 | 追加 Lezer Markdown 解析扩展。              | 自定义语法或接入第三方 Markdown 扩展时使用。           |
| `extensions`          | `Extension[]`                    | `[]`                 | 追加 CodeMirror 扩展。                      | 放业务扩展，例如 update listener、只读、主题补丁等。   |
| `keymap`              | `KeyBinding[]`                   | `[]`                 | 追加快捷键。                                | 只放业务快捷键；插件快捷键由插件自身提供。             |
| `disableViewPlugin`   | `boolean`                        | `false`              | 禁用 WYSIWYG 装饰，回到原始 Markdown 编辑。 | 源码模式设为 `true`。                                  |
| `defaultKeybindings`  | `boolean`                        | `true`               | 启用 CodeMirror 默认快捷键。                | 通常保持开启。                                         |
| `history`             | `boolean`                        | `true`               | 启用撤销/重做历史。                         | 编辑器必须能力，通常保持开启。                         |
| `indentWithTab`       | `boolean`                        | `true`               | 启用 Tab 缩进。                             | 文档、代码块编辑建议开启。                             |
| `highlightActiveLine` | `boolean`                        | `true`               | 原始模式下高亮当前行。                      | 仅在 `disableViewPlugin: true` 时实际加入。            |
| `lineWrapping`        | `boolean`                        | `true`               | 软换行。                                    | 文档编辑建议开启。                                     |
| `onNodesChange`       | `(nodes: MardoraNode[]) => void` | `undefined`          | 语法树节点变化回调。                        | 用于调试面板，不建议在生产路径做重计算。               |
| `slashCommands`       | `MardoraSlashCommandsConfig`     | `{ enabled: true }`  | Slash command 菜单配置。                    | 保持开启可提升编辑效率。                               |
| `attachments`         | `MardoraAttachmentsConfig`       | `{ enabled: false }` | 附件上传入口配置。                          | 有上传需求时必须传 `uploader`。                        |
| `selectionToolbar`    | `MardoraSelectionToolbarConfig`  | `{ enabled: true }`  | 选中文本后的浮动工具栏。                    | 富编辑体验建议开启。                                   |
| `toc`                 | `MardoraTocConfig`               | `{ enabled: true }`  | 编辑器内目录面板。                          | 复杂长文建议开启；自定义侧栏时可关闭内置 UI 只用回调。 |
| `headingFold`         | `MardoraHeadingFoldConfig`       | `{ enabled: true }`  | Live 编辑态标题分节折叠。                   | 长文默认开启；源码模式或自定义折叠 UI 可关闭。         |
| `linkPreview`         | `MardoraLinkPreviewConfig`       | `{ enabled: true }`  | 链接卡片形态切换和元信息 resolver。         | 生产环境用服务端 resolver 抓取网页元信息。             |

## 6. 附件上传能力

Mardora 的附件能力是“上传入口 + Markdown 替换协议”，不是存储系统。业务侧要实现 `uploader(file, context)`。

### 6.1 上传流程

1. 用户通过 slash media 命令、粘贴、拖拽选择文件。
2. Mardora 根据 MIME type 判断附件类型：`image`、`video`、`audio`、`file`。
3. Mardora 在当前选区插入临时标记，例如图片是 `![name](mardora-upload://task-id)`。
4. Mardora 调用业务传入的 `uploader(file, context)`。
5. `uploader` 返回 `{ url, name?, title?, mimeType? }` 后，Mardora 替换临时标记。
6. 如果 `uploader` 抛错，Mardora 把临时标记替换为 `[Upload failed: name](mardora-upload://task-id)`。

### 6.2 `MardoraAttachmentsConfig`

| 属性           | 类型                        | 默认值               | 作用                         | 建议                                   |
| -------------- | --------------------------- | -------------------- | ---------------------------- | -------------------------------------- |
| `enabled`      | `boolean`                   | `false`              | 是否启用附件上传扩展。       | 有上传需求设为 `true`。                |
| `uploader`     | `MardoraAttachmentUploader` | `undefined`          | 实际上传函数。               | 必填；没有它时附件扩展不会注册。       |
| `accept.image` | `string[]`                  | 事件侧默认 `["*/*"]` | image 类型允许的 MIME/后缀。 | 推荐 `["image/*"]`。                   |
| `accept.video` | `string[]`                  | 事件侧默认 `["*/*"]` | video 类型允许的 MIME/后缀。 | 推荐 `["video/*"]`。                   |
| `accept.audio` | `string[]`                  | 事件侧默认 `["*/*"]` | audio 类型允许的 MIME/后缀。 | 推荐 `["audio/*"]`。                   |
| `accept.file`  | `string[]`                  | 事件侧默认 `["*/*"]` | 普通文件允许的 MIME/后缀。   | 生产环境建议限制后缀和大小。           |
| `enablePaste`  | `boolean`                   | `true`               | 是否处理剪贴板文件。         | 如产品不希望粘贴上传，设为 `false`。   |
| `enableDrop`   | `boolean`                   | `true`               | 是否处理拖拽文件。           | 如页面已有拖拽区域冲突，设为 `false`。 |

### 6.3 `uploader` 上下文

| 字段           | 类型                                      | 含义                                                   |
| -------------- | ----------------------------------------- | ------------------------------------------------------ |
| `kind`         | `"image" \| "video" \| "audio" \| "file"` | Mardora 根据 MIME type 或 slash 命令判断出的附件类型。 |
| `source`       | `"slash" \| "paste" \| "drop" \| "api"`   | 上传来源。当前内置来源包含 slash、paste、drop。        |
| `documentText` | `string`                                  | 触发上传时的完整 Markdown 文本。                       |
| `selection`    | `{ from: number; to: number }`            | 临时上传标记插入后的选择范围。                         |

### 6.4 返回值如何变成 Markdown

| `kind`  | 成功后插入内容                           |
| ------- | ---------------------------------------- |
| `image` | `![name](url)` 或 `![name](url "title")` |
| `video` | `<video src="url" controls></video>`     |
| `audio` | `<audio src="url" controls></audio>`     |
| `file`  | `[name](url)`                            |

### 6.5 生产 uploader 示例

```ts
import type { MardoraAttachmentUploader } from "mardora/editor";

export const uploader: MardoraAttachmentUploader = async (file, context) => {
  // 业务侧必须自行做安全校验；Mardora 只负责把 File 交给这里。
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("File is larger than 20MB");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("kind", context.kind);
  form.append("source", context.source);

  const response = await fetch("/api/mardora/uploads", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    // 抛错后 Mardora 会保留失败标记，用户能看到上传失败。
    throw new Error("Upload failed");
  }

  const result = (await response.json()) as {
    url: string;
    name?: string;
    title?: string;
    mimeType?: string;
  };

  // url 必须是编辑器和预览页可访问的最终地址。
  return result;
};
```

## 7. Slash commands

Slash commands 在光标位于可识别的行首 `/query` 时打开菜单。默认命令按 locale 本地化。

### 7.1 配置表

| 属性       | 类型                    | 默认值          | 作用                      | 建议                                           |
| ---------- | ----------------------- | --------------- | ------------------------- | ---------------------------------------------- |
| `enabled`  | `boolean`               | `true`          | 是否启用菜单。            | 文档编辑产品建议开启。                         |
| `locale`   | `"zh-CN" \| "en-US"`    | 继承全局 locale | 覆盖 slash 菜单文案语言。 | 只在 slash 语言要独立于全局时设置。            |
| `commands` | `MardoraSlashCommand[]` | 默认命令集合    | 自定义命令列表。          | 传入后会替换默认命令，业务需自行合并默认命令。 |

### 7.2 默认命令

| 分组    | 命令 id                             | 插入内容或行为                                                              |
| ------- | ----------------------------------- | --------------------------------------------------------------------------- |
| `basic` | `paragraph`                         | 清除 slash 查询，回到普通文本。                                             |
| `basic` | `heading-1` 到 `heading-6`          | 插入 `# ` 到 `###### `。                                                    |
| `basic` | `quote`                             | 插入 `> `。                                                                 |
| `basic` | `callout-note` 到 `callout-caution` | 插入 `NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION` Callout 模板。        |
| `basic` | `ordered-list`                      | 插入 `1. `。                                                                |
| `basic` | `unordered-list`                    | 插入 `- `。                                                                 |
| `basic` | `task-list`                         | 插入 `- [ ] `。                                                             |
| `basic` | `table`                             | 插入 2 列基础 Markdown 表格。                                               |
| `basic` | `divider`                           | 插入 `---`。                                                                |
| `basic` | `link`                              | 插入 `[]()` 并把光标放入标题位置。                                          |
| `media` | `file`                              | 有 uploader 时打开文件选择；否则插入 `[filename](url)`。                    |
| `media` | `image`                             | 有 uploader 时打开图片选择；否则插入 `![image](url)`。                      |
| `media` | `video`                             | 有 uploader 时打开视频选择；否则插入 `<video src="url" controls></video>`。 |
| `media` | `audio`                             | 有 uploader 时打开音频选择；否则插入 `<audio src="url" controls></audio>`。 |

## 8. 选区工具栏

选中文本后，Mardora 可以显示浮动工具栏。

| 配置                       | 类型                 | 默认值     | 说明                                                         |
| -------------------------- | -------------------- | ---------- | ------------------------------------------------------------ |
| `selectionToolbar.enabled` | `boolean`            | `true`     | 设为 `false` 可关闭整个工具栏。                              |
| `selectionToolbar.locale`  | `"zh-CN" \| "en-US"` | 继承全局值 | 覆盖选区工具栏 tooltip、链接面板、颜色面板和块类型菜单文案。 |

| 动作             | 插入或转换                                                                |
| ---------------- | ------------------------------------------------------------------------- |
| `block-type`     | 将选中行转换为普通文本或 1-6 级标题。                                     |
| `bold`           | `**text**`                                                                |
| `italic`         | `*text*`                                                                  |
| `strike`         | `~~text~~`                                                                |
| `underline`      | `<u>text</u>`                                                             |
| `code`           | `` `text` ``                                                              |
| `highlight`      | 打开高亮色面板，输出 `<span style="background-color: ...">`。             |
| `color`          | 打开文字色面板，输出 `<span style="color: ...">`。                        |
| `link`           | 打开链接面板，输出 `[title](url)`；支持复制、打开、移除和独占行链接卡片。 |
| `ordered-list`   | 将选中行转换为有序列表。                                                  |
| `unordered-list` | 将选中行转换为无序列表。                                                  |
| `task-list`      | 将选中行转换为任务列表。                                                  |

标题源码标记 `#` 至 `######` 在 Live 编辑态保持隐藏。需要切换标题层级或降级为普通文本时，选中标题文本后使用工具栏最左侧的块类型菜单。

## 9. 链接卡片

点击 Live 编辑态中的链接不会再展开 `[title](url)` 源码，而是打开链接面板。链接面板可编辑标题和 URL，也可复制、打开、移除链接。若链接独占一行，面板会启用 `Embed Link` 按钮；行内链接不会启用该按钮，避免把段落中的局部链接转换成块级卡片。

点击 `Embed Link` 后，Mardora 会在链接下一行写入一条隐藏元信息注释：

```text
[Mardora - Take back control of your writing](https://github.com/Refinex-Space/mardora)
<!--mardora-link-preview:v1 {"kind":"link","url":"https://github.com/Refinex-Space/mardora","title":"Octarine - Take back control of your writing","domain":"octarine.app","image":"https://github.com/Refinex-Space/mardora/img/og/base.png","description":"Private, markdown-based note-taking app with a focus on speed, simplicity and data ownership. Write faster, think clearer."}-->
```

这条注释是 Mardora 的持久化协议：源码仍是可读 Markdown，其他 Markdown 工具会把它当作普通 HTML 注释；Mardora Live 编辑态和 `mardora/preview` 会把“独占行链接 + 下一行匹配注释”渲染为卡片，并消费注释，避免把注释显示给读者。元信息中的 `url` 必须和上一行链接 URL 归一化后一致，否则不会渲染为卡片。

```ts
import { mardora, type MardoraLinkPreviewMetadata } from "mardora/editor";

const extensions = mardora({
  linkPreview: {
    enabled: true,
    async resolve({ url, title }): Promise<MardoraLinkPreviewMetadata> {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error("Failed to resolve link preview");
      const metadata = await response.json();
      return {
        kind: "link",
        url: metadata.url || url,
        title: metadata.title || title || url,
        domain: metadata.domain,
        image: metadata.image,
        description: metadata.description,
      };
    },
  },
});
```

Mardora core 不直接抓取任意外站，避免把 CORS、SSRF、超时、缓存和隐私边界放进编辑器包。生产环境建议在服务端 resolver 中只允许 `http:` / `https:`，拒绝私网和 loopback 地址，设置 3-5 秒超时、重定向次数和响应体大小上限，只解析 `text/html`，优先读取 `og:*`、`twitter:*` 和 `<title>`，并按规范化 URL 缓存解析结果。

## 10. 目录 TOC

`toc` 可生成编辑器内目录面板，也可通过回调把目录交给业务侧自定义渲染。

| 属性              | 类型                    | 默认值                  | 作用                                | 建议                                               |
| ----------------- | ----------------------- | ----------------------- | ----------------------------------- | -------------------------------------------------- |
| `enabled`         | `boolean`               | `true`                  | 是否显示内置目录面板。              | 使用自定义侧栏时设为 `false`，保留 `onTocChange`。 |
| `onTocChange`     | `(items) => void`       | `undefined`             | 目录变化和 active 项变化时触发。    | 自定义目录、同步导航时使用。                       |
| `minLevel`        | `2 \| 3 \| 4 \| 5 \| 6` | `2`                     | 收集的最小标题层级。                | 文档正文通常从 H2 开始。                           |
| `maxLevel`        | `2 \| 3 \| 4 \| 5 \| 6` | `6`                     | 收集的最大标题层级。                | 想减少目录噪音可设为 `3` 或 `4`。                  |
| `defaultExpanded` | `boolean`               | `true`                  | 目录初始展开。                      | 窄屏或嵌入式场景可设为 `false`。                   |
| `defaultWidth`    | `number`                | `240`                   | 初始宽度，受 min/max 限制。         | 240 适合多数文档编辑器。                           |
| `minWidth`        | `number`                | `180`，且最低不小于 120 | 可调整的最小宽度。                  | 不建议低于 180。                                   |
| `maxWidth`        | `number`                | `360`                   | 可调整的最大宽度。                  | 复杂标题可提高到 420。                             |
| `storageKey`      | `string`                | `undefined`             | 保存展开状态和宽度到 localStorage。 | 每个业务编辑器实例使用唯一 key。                   |

`extractPreviewTocFromMarkdown(markdown, config, markdownConfig)` 可在没有编辑器实例时提取预览目录。它返回的 item 不包含 `from/to`，适合预览页用 `id` 滚动定位。

### 10.1 标题折叠

`headingFold` 只作用于 Live 编辑态，不改变 Markdown 原文，也不影响静态 preview。默认对 H2-H5 标题显示左侧级别提示，例如 `H2`、`H3`；标题行 hover 或光标聚焦时切换为折叠箭头。点击后会折叠该标题到下一个同级或更高级标题之前的内容，再次点击展开。

| 属性       | 类型               | 默认值 | 作用                 | 建议                                          |
| ---------- | ------------------ | ------ | -------------------- | --------------------------------------------- |
| `enabled`  | `boolean`          | `true` | 是否启用标题折叠。   | 源码模式、自定义折叠 UI 或只读 preview 可关。 |
| `minLevel` | `2 \| 3 \| 4 \| 5` | `2`    | 可折叠的最小标题级别 | 长文通常保持 H2。                             |
| `maxLevel` | `2 \| 3 \| 4 \| 5` | `5`    | 可折叠的最大标题级别 | H6 通常作为更细粒度标题，不默认折叠。         |

## 11. Preview API

Preview 用于把 Markdown 生成可展示或可保存的 HTML/CSS。

### 11.1 `preview(markdown, config)`

| 属性           | 类型                                     | 默认值              | 作用                       | 建议                                     |
| -------------- | ---------------------------------------- | ------------------- | -------------------------- | ---------------------------------------- |
| `plugins`      | `MardoraPlugin[]`                        | `[]`                | 用哪些插件参与 HTML 渲染。 | 必须和编辑器插件保持一致。               |
| `markdown`     | `MarkdownConfig[]`                       | `[]`                | 追加 Markdown 解析扩展。   | 必须和编辑器中的自定义语法保持一致。     |
| `wrapperClass` | `string`                                 | `"mardora-preview"` | 外层 class。               | 用稳定 class 作用域隔离 CSS。            |
| `wrapperTag`   | `"article" \| "div" \| "section"`        | `"article"`         | 外层标签。                 | 文档页用 `article`，应用面板可用 `div`。 |
| `sanitize`     | `boolean`                                | `true`              | 是否清洗 HTML。            | 面向用户输入时保持 `true`。              |
| `theme`        | `ThemeEnum`                              | `ThemeEnum.AUTO`    | 主题。                     | 和编辑器主题保持一致。                   |
| `syntaxTheme`  | `SyntaxThemeInput \| SyntaxThemeInput[]` | `undefined`         | 代码高亮 CSS 来源。        | 与 CodeMirror theme 保持一致。           |

### 11.2 `generateCSS(config)`

| 属性           | 类型                                     | 默认值              | 作用                                       | 建议                                |
| -------------- | ---------------------------------------- | ------------------- | ------------------------------------------ | ----------------------------------- |
| `plugins`      | `MardoraPlugin[]`                        | `[]`                | 从插件提取 preview CSS。                   | 必须和 `preview()` 使用同一组插件。 |
| `theme`        | `ThemeEnum`                              | `ThemeEnum.AUTO`    | 输出 dark/light/auto 对应 CSS。            | 和 `preview()` 一致。               |
| `wrapperClass` | `string`                                 | `"mardora-preview"` | CSS 作用域 class。                         | 和 `preview.wrapperClass` 一致。    |
| `includeBase`  | `boolean`                                | `true`              | 是否包含 `.mardora-preview` 基础 padding。 | 自定义容器 spacing 时可关闭。       |
| `fonts`        | `MardoraFontConfig`                      | 内置系统字体栈      | 输出文档、代码和 Mardora UI 字体变量。     | 和编辑器 `mardora({ fonts })` 一致。 |
| `syntaxTheme`  | `SyntaxThemeInput \| SyntaxThemeInput[]` | `undefined`         | 输出代码高亮 CSS。                         | 和编辑器 syntax theme 一致。        |

## 12. 插件体系

每个插件都是 `MardoraPlugin` 子类。插件可以参与编辑器扩展、Markdown 解析、快捷键、编辑态 decoration、preview HTML 和 preview CSS。

| 成员                                    | 默认值                            | 用途                                 |
| --------------------------------------- | --------------------------------- | ------------------------------------ |
| `name`                                  | 必填                              | 插件唯一标识。                       |
| `version`                               | 必填                              | 插件版本，CSS 输出会用到。           |
| `decorationPriority`                    | `100`，`DecorationPlugin` 为 `50` | decoration 排序优先级。              |
| `dependencies`                          | `[]`                              | 记录依赖插件名，当前不自动解析依赖。 |
| `requiredNodes`                         | `[]`                              | 声明插件处理的 Lezer 节点名。        |
| `theme`                                 | 空主题                            | 返回 default/dark/light 样式对象。   |
| `getExtensions()`                       | `[]`                              | 追加 CodeMirror 扩展。               |
| `getMarkdownConfig()`                   | `null`                            | 追加 Lezer Markdown 语法。           |
| `getKeymap()`                           | `[]`                              | 追加快捷键。                         |
| `buildDecorations(ctx)`                 | 空实现                            | 向编辑态添加 decoration。            |
| `onRegister(ctx)`                       | 保存 context                      | 注册时调用。                         |
| `onUnregister()`                        | 清空 context                      | 卸载时调用。                         |
| `onViewReady(view)`                     | 空实现                            | `EditorView` 就绪时调用。            |
| `onViewUpdate(update)`                  | 空实现                            | 文档、选区、视口变化时调用。         |
| `renderToHTML(node, children, ctx)`     | `undefined`                       | 自定义 preview HTML。                |
| `getPreviewStyles(theme, wrapperClass)` | 从 `theme` 转 CSS                 | 输出 preview CSS。                   |

```ts
import type { SyntaxNode } from "@lezer/common";
import type { DecorationContext } from "mardora/editor";
import { MardoraPlugin } from "mardora/editor";

export class MentionPlugin extends MardoraPlugin {
  readonly name = "mention";
  readonly version = "1.0.0";

  // 声明关注的节点便于维护者理解插件职责。
  readonly requiredNodes = ["Paragraph"] as const;

  buildDecorations(ctx: DecorationContext): void {
    // ctx.view 是当前 EditorView。
    // ctx.decorations 是要追加 decoration 的数组。
    // 这里可以扫描 ctx.view.state.doc 并追加 Decoration.range(...)。
  }

  renderToHTML(node: SyntaxNode, children: string): string | null {
    // 返回 null 表示交给默认 renderer 或其他插件处理。
    if (node.name !== "Paragraph") return null;

    // preview 输出必须自行保证语义和安全边界。
    return `<p data-plugin="mention">${children}</p>`;
  }
}
```

## 13. 内置插件

| 插件              | 主要能力                                                                                                                                                   | 是否在 `allPlugins` 中 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `ParagraphPlugin` | 段落 spacing 与 preview 段落。                                                                                                                             | 是                     |
| `HeadingPlugin`   | H1-H6 标题、标题锚点、TOC 相关输出。                                                                                                                       | 是                     |
| `InlinePlugin`    | 粗体、斜体、删除线、高亮、上标、下标。                                                                                                                     | 是                     |
| `LinkPlugin`      | Markdown 链接、链接快捷键、preview 链接。                                                                                                                  | 是                     |
| `ListPlugin`      | 无序、有序、任务列表。                                                                                                                                     | 是                     |
| `TablePlugin`     | GFM 表格解析、编辑态表格、preview 表格，以及 Live 模式行列句柄菜单。行列菜单支持插入、移动、复制、删除行列和删除表格；这些 UI 状态不会写入浏览器文本选区。 | 是                     |
| `HTMLPlugin`      | HTML block/tag/comment。                                                                                                                                   | 是                     |
| `ImagePlugin`     | 图片语法、figure/figcaption、图片快捷键。                                                                                                                  | 是                     |
| `MathPlugin`      | 行内数学、块级数学，基于 KaTeX。                                                                                                                           | 是                     |
| `MermaidPlugin`   | Mermaid fenced block。                                                                                                                                     | 是                     |
| `CodePlugin`      | 行内代码、围栏代码块、语法高亮、行号、标题、说明、复制。                                                                                                   | 是                     |
| `QuotePlugin`     | 引用块和 GFM Callout 告警块。                                                                                                                              | 是                     |
| `HRPlugin`        | 水平分割线。                                                                                                                                               | 是                     |
| `EmojiPlugin`     | Emoji 语法。                                                                                                                                               | 是                     |

### 13.1 GFM Callout 告警块

`QuotePlugin` 兼容 GitHub Flavored Markdown 的 Callout 语法。Callout 本质上仍然保存为标准 Markdown 引用块，Mardora 在编辑态和 preview 中识别第一行控制标记并渲染为告警块。

```markdown
> [!NOTE]
> 补充信息，读者在继续阅读时可能会用到。
```

支持的类型包括 `NOTE`、`TIP`、`IMPORTANT`、`WARNING` 和 `CAUTION`，大小写不敏感。静态 preview 会隐藏 `[!TYPE]` 控制行，并输出 `cm-mardora-callout` 与 `cm-mardora-callout-{type}` 类名；普通 `>` 引用块保持原有渲染。

| 类型        | 适用场景                   | 典型误用                |
| ----------- | -------------------------- | ----------------------- |
| `NOTE`      | 补充上下文、次要说明       | 把所有“注意”都写成 NOTE |
| `TIP`       | 技巧、捷径、推荐做法       | 与 IMPORTANT 混淆       |
| `IMPORTANT` | 流程中不能跳过的步骤       | 用于普通提示            |
| `WARNING`   | 操作有风险，可能造成错误   | 与 CAUTION 混用         |
| `CAUTION`   | 操作有严重后果，如数据丢失 | 用于日常提醒            |

## 14. 完整接入建议

达到 playground 同等质量，不只是调用 `mardora()`。建议按以下顺序接入：

1. 安装 Mardora。
2. 创建编辑器容器，给容器稳定高度和滚动区域。
3. 使用 `allPlugins` 跑通编辑态。
4. 接入应用状态同步，例如 `EditorView.updateListener` 或 React `onChange`。
5. 接入源码模式：`disableViewPlugin: true`。
6. 接入 preview：同一组插件调用 `preview()` 和 `generateCSS()`。
7. 接入附件上传：提供真实 `uploader`，限制大小、类型和权限。
8. 接入链接卡片：提供服务端 `linkPreview.resolve`，并定义元信息缓存与失败兜底策略。
9. 接入 slash commands 和 selection toolbar。
10. 接入 TOC：内置面板或业务自定义侧栏。
11. 接入持久化：保存 Markdown 原文，不保存编辑器内部状态。
12. 在组件卸载时销毁 `EditorView`，释放 `blob:` URL 和事件监听。
13. 用 typecheck、build、单测和浏览器手测验证核心链路。

## 15. 生产验收清单

- 编辑器可输入、撤销、重做、Tab 缩进、软换行。
- `allPlugins` 全启用时，各类 Markdown 都能编辑和 preview。
- `preview()` 与 `generateCSS()` 的插件、主题、syntax theme 与编辑器一致。
- 附件上传能处理成功、失败、超限、无权限、网络错误。
- 上传返回 URL 在编辑器、预览页、发布页都可访问。
- 粘贴和拖拽不会与页面其他上传区域冲突。
- Slash media 命令在有 uploader 时打开文件选择，没有 uploader 时插入 fallback 语法。
- 选区工具栏在鼠标选择和键盘选择后都能工作，tooltip、链接面板和颜色面板文案符合当前 locale。
- 独占行链接可切换为链接卡片，行内链接不会被错误转换；resolver 失败时保留普通链接能力。
- TOC 在长文中能正确定位 active 标题。
- 组件卸载时 `EditorView.destroy()` 已执行。
- 用户 Markdown 原文已持久化，默认文档升级策略已定义。
