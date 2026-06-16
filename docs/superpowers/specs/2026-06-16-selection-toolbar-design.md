---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: docs/README.md#superpowers-specs
---

# Markora 选中文本工具条设计

## Goal

在 Markora 核心编辑器层实现类似 Notion、飞书、语雀的选中文本工具条。工具条在用户选中非空文本时出现，提供常用行内格式、链接、列表、文字颜色和高亮能力，并保持与 slash 菜单一致的黑白、紧凑、轻量浮层质感。

## Context

当前 Markora 已具备：

- `packages/markora/src/editor/slash`：slash 菜单的浮层、定位、键盘交互和主题。
- `packages/markora/src/editor/icons`：内置 SVG 图标库。
- `packages/markora/src/plugins/inline-plugin.ts`：加粗、斜体、删除线、高亮等 Markdown 行内渲染和快捷键。
- `packages/markora/src/plugins/link-plugin.ts`：Markdown 链接渲染、编辑和 `Mod-k` 快捷键。
- `packages/markora/src/plugins/list-plugin.ts`：有序列表、无序列表、任务列表转换和渲染。
- Vue2 playground 通过 `markora()` 配置接入核心能力，不应实现私有工具条逻辑。

本设计将选中文本工具条作为 Markora 核心能力交付，确保 React、Vue2、Vue3 等接入方能力一致。

## Non-Goals

- 不新增生产依赖。
- 不实现任意 HEX 输入或系统取色器。
- 不做复杂 AST 级交叉嵌套重写；第一版只保证完整选区包裹、移除和常见 Markdown/HTML 格式可靠。
- 不在 Vue2 playground 内实现私有工具条。

## Public API

在 `MarkoraConfig` 中新增配置：

```ts
selectionToolbar?: {
  enabled?: boolean;
}
```

默认启用：`selectionToolbar: { enabled: true }`。如果某个接入方需要完全自定义 UI，可显式关闭。

## Architecture

新增核心模块：

- `packages/markora/src/editor/selection-toolbar/extension.ts`
  - CodeMirror `ViewPlugin`。
  - 监听选区、文档、viewport 和焦点变化。
  - 控制工具条显示、关闭、重新定位和命令执行。

- `packages/markora/src/editor/selection-toolbar/commands.ts`
  - 纯命令层。
  - 负责把选区转换为 Markdown/HTML。
  - 覆盖包裹、移除、链接解析、列表行转换等逻辑。

- `packages/markora/src/editor/selection-toolbar/menu.ts`
  - DOM 渲染层。
  - 渲染工具条、按钮、分隔线、链接面板、颜色面板。
  - 使用内置 SVG 图标，不使用 emoji。

- `packages/markora/src/editor/selection-toolbar/position.ts`
  - 浮层定位纯函数。
  - 计算工具条和子面板相对选区的最佳方向、左右贴边和最大尺寸。

- `packages/markora/src/editor/selection-toolbar/theme.ts`
  - 工具条基础样式。
  - 与 slash 菜单保持一致的黑白视觉语言、圆角、阴影、按钮尺寸和暗色主题变量。

- `packages/markora/src/editor/icons/index.ts`
  - 补充工具条所需图标：bold、italic、strikethrough、underline、code、highlighter、baseline、copy、external-link、trash-2。

## Display Rules

工具条仅在以下条件同时满足时显示：

- 编辑器处于可编辑状态。
- 编辑器聚焦，或工具条/子面板正在交互中。
- 主选区为非空文本选区。
- slash 菜单未打开。

关闭条件：

- 选区变为空。
- 用户输入正文或文档发生会使原选区失效的变化。
- 按 Escape。
- 点击编辑器和工具条外部。
- 切换文档、模式、主题或销毁编辑器。

工具条 `mousedown` 必须阻止默认行为，避免按钮点击导致编辑器选区丢失。链接和颜色面板打开时保存原始选区快照，提交命令时用快照写回。

## Positioning

定位锚点来自选区矩形：

- 使用 `view.coordsAtPos(selection.from)` 和 `view.coordsAtPos(selection.to)` 获取选区边界。
- 单行选区以选区中心为横向锚点。
- 多行选区锚定第一行选区中心，避免工具条覆盖过多正文。

布局规则：

- 默认显示在选区上方，间距 8px。
- 上方空间不足时显示在下方。
- 左右溢出时按 viewport padding 修正。
- 页面滚动、编辑器滚动、viewport resize、selectionSet、docChanged 时重新测量。
- 链接面板和颜色面板比工具条更宽时，也需要使用同一贴边和翻转规则。

## Commands

### Inline Formatting

命令对非空选区生效。若选区已被同类型标记完整包裹，再次点击移除标记。

| 功能 | 输出 |
| --- | --- |
| 加粗 | `**text**` |
| 斜体 | `*text*` |
| 删除线 | `~~text~~` |
| 行内代码 | `` `text` `` |
| 高亮默认色 | `==text==` |
| 下划线 | `<u>text</u>` |
| 文字颜色 | `<span style="color: #xxxxxx">text</span>` |
| 高亮指定色 | `<span style="background-color: #xxxxxx">text</span>` |

颜色只允许内置色板值。清除颜色或清除高亮时，移除对应 span 或标记并恢复普通文本。

### Link

点击链接按钮进入链接面板，不立即修改文档。

面板字段：

- 显示文本：默认取当前选区；若选区是已有 Markdown 链接，则读取 link text。
- 链接地址：若选区本身是 URL，则默认填 URL；若选区是已有 Markdown 链接，则读取 href。

操作：

- Enter 提交，写入 `[title](url)`。
- Escape 取消。
- `Follow Link` 在 URL 有效时新标签打开。
- 复制按钮复制 URL，成功后短暂显示 copied 状态。
- 删除按钮仅在已有链接时显示，执行后写回普通显示文本。

URL 为空不提交。非法 URL 不直接写入文档，面板保留输入态并显示轻量错误态。

### Lists

有序列表、无序列表、任务列表作用于选区覆盖的每一行，并与 `ListPlugin` 快捷键行为一致：

- 同类型再次点击则移除 marker。
- 不同列表类型则替换 marker。
- 保留原缩进。
- 有序列表从 `1.` 重新编号。

## Visual Design

工具条：

- 黑白主色，浅色背景为白色，暗色背景为接近 `#18181b`。
- 按钮尺寸约 30px x 30px。
- SVG 图标约 16px，继承 `currentColor`。
- 分隔线 1px，按功能分组。
- active 态使用轻背景，不使用重色块。
- 圆角、阴影与 slash 菜单一致但更轻。

链接面板：

- 宽度约 320-340px。
- 两个紧凑输入框。
- 底部操作区包含 Follow Link、复制、打开、删除。
- 删除使用危险态 hover，但默认不抢视觉焦点。

颜色面板：

- 使用 swatch，不用文字按钮。
- 文字色：默认、灰、红、橙、黄、绿、蓝、紫。
- 高亮色：默认、黄、绿、蓝、粉、紫。
- 每个 swatch 有 `aria-label` 和 hover title。

## Accessibility

- 所有按钮使用 `<button type="button">`。
- 每个按钮提供 `aria-label`。
- active 状态使用 `aria-pressed`。
- 链接面板输入框有可访问 label。
- Escape 可关闭子面板或工具条。
- Enter 可提交链接面板。
- 不依赖 emoji 传达含义。

## Testing

### Unit Tests

新增 `packages/markora/tests/selection-toolbar-commands.spec.ts`：

- 行内格式包裹与移除。
- 下划线、文字色、高亮色的 HTML 输出和清除。
- 链接解析、写回、删除还原。
- URL 选区与普通文本选区的链接默认值。
- 多行有序、无序、任务列表转换、移除和替换。

新增 `packages/markora/tests/selection-toolbar-position.spec.ts`：

- 上方空间足够时向上展开。
- 上方空间不足时向下展开。
- 左右贴边修正。
- 子面板较宽时不溢出 viewport。

### Integration Verification

在 Vue2 playground 验证：

- 选中文本出现工具条。
- 每个按钮写入符合协议的 Markdown/HTML。
- 链接面板支持标题、URL、复制、打开、删除还原。
- 色板写入文字色和高亮色，清除可恢复普通文本。
- 多行选区列表转换符合预期。
- slash 菜单打开时工具条不显示。
- 顶部、底部、左右边缘选区时工具条和子面板不被遮挡。
- 点击工具条不丢失原选区。
- 暗色主题视觉一致。

命令验证：

- `pnpm --config.package-manager-strict=false --dir packages/markora test`
- `pnpm --config.package-manager-strict=false --dir packages/markora typecheck`
- `pnpm --config.package-manager-strict=false --dir packages/markora build`
- `pnpm --config.package-manager-strict=false --dir packages/markora lint`
- `pnpm --config.package-manager-strict=false --filter vue2-playground build`

## Risks

- Markdown 和 HTML 混合输出会增加后续清除格式的复杂度，需用命令单测覆盖常见清除路径。
- 链接面板输入期间原选区可能失效，必须在提交前校验原 range 内容仍可识别。
- 工具条和 slash 菜单都属于浮层能力，后续可考虑提取共享的 overlay positioning 工具，第一版只复用算法思路，不做大范围重构。

## Rollback

如需回滚，删除 `selection-toolbar` 模块，移除 `MarkoraConfig.selectionToolbar` 和 `markora()` 中的扩展注册，并保留已有 slash 菜单、图标库和插件行为不变。
