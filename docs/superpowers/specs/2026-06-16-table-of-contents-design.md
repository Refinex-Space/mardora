---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: docs/README.md#superpowers-specs
---

# Markora 内置目录设计

## Goal

为 Markora 设计内置目录能力。该能力默认开启，接入方可以直接使用 Markora 提供的右侧目录 UI；如果接入方希望自定义目录，也可以关闭默认 UI，通过 `onTocChange` 获取结构化目录数据自行渲染。

目录应覆盖 Live 编辑模式和 View 预览模式，渲染范围为 `h2` 到 `h6`，不包含 `h1`。

## Context

当前 Markora 的交互型编辑器能力位于 `packages/markora/src/editor/*`，例如 slash menu、附件上传、选中文本工具条；`packages/markora/src/plugins/*` 主要用于 Markdown 节点装饰与预览渲染。因此目录能力应作为内置 editor/preview 能力设计，而不是放入现有 Markdown plugin 目录。

Vue2 playground 的 `Contents`、`Developer Panel`、顶部工具栏只是演示站点外壳，不属于 `packages/markora` 对接入方交付的能力。接入方实际感知的是中间 Markora 编辑/预览区域，目录应出现在该区域右侧。

## Decisions

- 默认视觉方向采用完整目录 Panel，而不是轻量 rail。
- 默认提供内置目录 UI。
- 接入方可关闭默认 UI，并通过 `onTocChange` 使用目录数据自定义 UI。
- 目录覆盖 Live 和 View 模式。
- 目录状态默认不持久化；只有配置 `storageKey` 时才由 Markora 写入 localStorage。
- 持久化只保存展开状态和宽度，不保存目录数据。

## Public API

在 `MarkoraConfig` 中新增 `toc` 配置：

```ts
export interface MarkoraTocConfig {
  enabled?: boolean;
  onTocChange?: (items: MarkoraTocItem[]) => void;
  minLevel?: 2 | 3 | 4 | 5 | 6;
  maxLevel?: 2 | 3 | 4 | 5 | 6;
  defaultExpanded?: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
}
```

默认值：

```ts
const defaultTocConfig = {
  enabled: true,
  minLevel: 2,
  maxLevel: 6,
  defaultExpanded: true,
  defaultWidth: 240,
  minWidth: 180,
  maxWidth: 360,
};
```

目录项结构：

```ts
export interface MarkoraTocItem {
  id: string;
  level: 2 | 3 | 4 | 5 | 6;
  text: string;
  from?: number;
  to?: number;
  active: boolean;
}
```

语义：

- `toc` 省略时，内置目录 UI 默认开启。
- `toc.enabled = false` 时，不渲染内置目录 UI，但仍提取目录并触发 `onTocChange`。
- `toc.onTocChange` 在 Live 和 View 模式都可触发。
- `toc.storageKey` 不传时，Markora 不写宿主 localStorage。
- `toc.storageKey` 传入时，仅保存目录面板 `expanded` 与 `width`。

## TOC Extraction

Live 模式从 CodeMirror state 与 Lezer Markdown 语法树中提取标题。提取规则：

- 只包含 `h2` 到 `h6`，默认忽略 `h1`。
- 支持通过 `minLevel` 和 `maxLevel` 收窄范围。
- 标题文本应取纯文本内容，不包含 Markdown 标记。
- 空标题不进入目录。
- 生成稳定 `id`，基于标题文本 slug。
- 重复标题使用递增后缀，例如 `getting-started`、`getting-started-2`。
- 中文标题应保留可读 slug 或使用稳定编码策略，不能产生空 id。

View 模式从 preview 渲染结果中提取 `h2` 到 `h6`。preview renderer 应给相关 heading 自动补 `id`，并复用同一套 slug 去重规则，保证点击跳转稳定。

## Built-in UI

内置 UI 采用完整右侧目录 Panel：

- 面板位于 Markora 编辑/预览区域右侧。
- 面板和正文之间有清晰但克制的分割线。
- 面板标题区包含目录图标和 `目录` 文案。
- 右侧提供展开/折叠按钮。
- 默认展开。
- 折叠后保留窄条入口，点击可恢复展开。
- 宽度默认 `240px`。
- 可拖拽分割线调整宽度。
- 宽度限制默认 `180px` 到 `360px`。
- 拖拽时禁用页面文本选择，释放后更新运行时状态，并在配置 `storageKey` 时持久化。

目录项样式：

- hover 时显示浅背景，文字变深。
- active 项必须有明显区分度，使用黑色文字、浅背景和左侧 2px 指示线。
- `h2` 不缩进，`h3` 到 `h6` 逐级缩进。
- 最大缩进需要克制，避免深层标题被挤压。
- 长标题单行省略，并使用 `title` 展示完整文本。
- 无 `h2-h6` 时显示轻量空状态 `暂无目录`。

响应式：

- 编辑区域宽度不足时，内置目录 UI 自动折叠或隐藏。
- 即使 UI 折叠或隐藏，也继续触发 `onTocChange`。

## Interaction

点击跳转：

- Live 模式点击目录项时，调用 CodeMirror `scrollIntoView` 跳转到对应 heading，并将光标或选区移动到 heading 行。
- View 模式点击目录项时，在 preview 容器内滚动到对应 heading DOM。
- 跳转后立即更新 active 项，避免高亮滞后。

Active 计算：

- 基于当前滚动位置选中最接近容器顶部的可见 heading。
- 当滚动位置处于文档顶部且还未到第一个 `h2-h6` 时，第一个目录项可以作为 active。
- 当文档滚动到底部时，最后一个已越过顶部阈值的 heading 作为 active。

展开和宽度：

- `defaultExpanded` 控制初始展开状态。
- `defaultWidth` 控制初始宽度，并受 `minWidth`、`maxWidth` 约束。
- 用户操作展开/折叠、拖拽宽度后，运行时状态立即生效。
- 当存在 `storageKey` 时，用户操作结果写入 localStorage，并优先于默认值恢复。

## Implementation Plan Shape

建议拆分模块：

- `packages/markora/src/editor/table-of-contents/types.ts`
  定义公开配置、目录项、内部状态类型。

- `packages/markora/src/editor/table-of-contents/slug.ts`
  负责 heading slug 与重复 id 去重。

- `packages/markora/src/editor/table-of-contents/extract.ts`
  从 Live 模式的 CodeMirror state / Lezer tree 提取 `MarkoraTocItem`。

- `packages/markora/src/editor/table-of-contents/extension.ts`
  Live 模式 ViewPlugin，负责监听文档、滚动、视口变化，计算目录项、active 项，渲染默认目录面板。

- `packages/markora/src/editor/table-of-contents/panel.ts`
  原生 DOM 构建目录 Panel，不依赖 Vue 或 React。

- `packages/markora/src/editor/table-of-contents/theme.ts`
  内置 Panel 样式。

- `packages/markora/src/editor/table-of-contents/storage.ts`
  处理 `storageKey` 对应的展开状态和宽度读写。

- `packages/markora/src/preview/toc.ts`
  View 模式提取 heading、补 id、生成目录数据。

- `packages/markora/src/editor/markora.ts`
  增加 `toc` 配置，默认启用内置目录扩展。

- `playground/vue2-playground`
  Feature Options 增加 TOC 开关；Live 和 View 模式展示内置目录；Code 和 Output 不展示内置目录。

## Testing

单元测试：

- slug 生成支持英文、中文、符号、重复标题。
- `h1` 被排除，`h2-h6` 被包含。
- `minLevel` / `maxLevel` 能正确过滤目录范围。
- 空标题不会进入目录。
- width clamp 正确限制 `minWidth` 与 `maxWidth`。
- `storageKey` 只保存和恢复 `expanded` 与 `width`。

集成与浏览器验证：

- Live 模式渲染右侧目录。
- View 模式渲染右侧目录。
- 点击目录项可以跳转到对应 heading。
- 滚动正文时 active 项更新。
- hover 和 active 样式符合黑白体系。
- 展开/折叠可用，默认展开。
- 拖拽分割线可调整宽度，并受最小/最大宽度限制。
- `toc.enabled = false` 时默认 UI 不显示，但 `onTocChange` 仍收到数据。
- Vue2 playground build 通过。

## Risks

- Live 与 View 两套提取路径需要共享 slug 规则，否则同一文档在不同模式下 id 不一致。
- CodeMirror 虚拟渲染可能导致 active 计算不能只依赖 DOM heading，需要优先使用文档位置和 `coordsAtPos`。
- 目录默认开启会占用编辑区域宽度，需要响应式折叠策略避免窄屏体验退化。
- 内部 localStorage 持久化必须仅在显式传入 `storageKey` 时启用，避免污染宿主产品。

## Done When

- Markora 默认展示右侧完整目录 Panel。
- 接入方可以通过 `toc.enabled = false` 关闭默认 UI。
- 接入方可以通过 `onTocChange` 获取 Live 和 View 目录数据。
- 目录只渲染 `h2-h6`。
- 点击目录项可跳转。
- hover、active、展开/折叠、拖拽宽度均可用。
- 宽度受 `minWidth` / `maxWidth` 约束。
- `storageKey` 按需持久化展开状态和宽度。
- Vue2 playground 能演示 Live + View 目录能力。
