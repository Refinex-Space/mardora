---
owner: refinex
updated: 2026-06-18
status: active
referenced_by: docs/README.md#superpowers-specs
---

# Mardora 表格行列控件设计

## Goal

为 Mardora Live 编辑模式中的 Markdown 表格增加行列级操作控件。用户 hover 或将光标定位到表格单元格时，可以在当前行左侧和当前列顶部看到小句柄；点击句柄后进入行或列操作态，显示对应菜单，并支持插入、移动、复制、删除行列以及删除整张表格。

该能力应保持核心包框架无关，React、Vue2、Vue3 接入方默认获得一致体验。

## Context

当前 `TablePlugin` 已具备：

- GFM 表格解析和 preview 渲染。
- 以 `ParsedTable` 表达 `headers`、`alignments`、`rows`。
- `formatTableMarkdown()` 将表格标准化写回 Markdown。
- `replaceTable()` 重写整张表格并恢复光标。
- 末尾 hover 追加行、追加列控件。
- 单元格点击坐标到 Markdown 源文本位置的映射。
- 显式表格 caret，避免 table layout 隐藏 CodeMirror 原生光标。

当前缺口：

- 追加行列只支持末尾。
- 没有行间/列间插入。
- 没有移动、复制、删除行列的可视菜单。
- 没有整行/整列可视选中态。

Draftly 上游没有现成的行列句柄菜单实现，不能直接搬移；本能力需要基于 Mardora 当前更完整的表格坐标映射继续扩展。

## Non-Goals

- 不支持合并单元格、拆分单元格、列宽拖拽。
- 不支持多行、多列批量选择。
- 不把行/列选中写入浏览器原生文本选区。
- 不新增 React、Vue、Radix 或其他 UI 依赖到 `packages/mardora`。
- 不改变静态 preview 表格行为；行列控件只属于 Live 编辑模式。
- 不新增公开配置项，第一版默认随 `TablePlugin` 开启。

## Design Principles

- 行列选中是 Mardora 自己的 UI 状态，不是 CodeMirror 文本选区，也不是浏览器 native selection。
- 普通点击单元格仍只定位光标。
- 拖选表格文字仍产生真实文本选区，并继续触发选中文本工具条。
- 点击行/列句柄必须 `preventDefault()` 和 `stopPropagation()`，避免清空或污染正文选区。
- 菜单命令通过纯表格数据变换实现，最后复用 `formatTableMarkdown()` 与 `replaceTable()` 统一写回。
- overlay 与菜单 DOM 不参与 table layout，避免影响表格单元格宽高和鼠标命中。

## UX

### Hover And Focus Handles

当鼠标 hover 到某个单元格，或光标位于某个单元格内：

- 在该单元格对应行的最左侧边框中点显示行句柄。
- 在该单元格对应列的顶部边框中点显示列句柄。
- 句柄为小型圆角按钮，内部使用三点图标。
- 未 hover、未聚焦表格且菜单未打开时隐藏句柄。
- 表格末尾已有的 `+` 追加行/列控件继续保留，但需要与新句柄视觉统一。

### Row Handle

点击行句柄：

- 当前 body 行进入选中态。
- 该行所有单元格显示浅蓝或主题化选中背景与细描边。
- 句柄旁显示菜单。
- 菜单项：
  - 在上方插入一行
  - 在下方插入一行
  - 当前行上移
  - 当前行下移
  - 拷贝行
  - 删除行
  - 删除表格

行操作只作用于 body 行。表头行不提供行菜单；表头所在行 hover 时仅显示列句柄。

### Column Handle

点击列句柄：

- 当前列进入选中态，包含表头和全部 body 单元格。
- 该列所有单元格显示选中背景与细描边。
- 句柄旁显示菜单。
- 菜单项：
  - 在左侧插入列
  - 在右侧插入列
  - 左移列
  - 右移列
  - 拷贝列
  - 删除列
  - 删除表格

列操作作用于表头、delimiter alignment 和所有 body 行。

### Menu Behavior

- 菜单打开时，当前句柄和选中态保持显示。
- 点击菜单外部、按 Escape、文档变化、选区离开当前表格时关闭菜单。
- 执行菜单命令后关闭菜单，并把光标定位到受影响行/列的合理单元格。
- 对不可执行项禁用：
  - 第一行 body 不能上移。
  - 最后一行 body 不能下移。
  - 第一列不能左移。
  - 最后一列不能右移。
  - 只有一列时不能删除列。

### Copy Semantics

`拷贝行` 和 `拷贝列` 不写系统剪贴板，而是复制当前行/列并插入到当前位置之后：

- 拷贝行：复制当前 body 行，插入到当前行下方。
- 拷贝列：复制当前列，插入到当前列右侧，并复制该列 alignment。

## Architecture

继续以 `packages/mardora/src/plugins/table-plugin.ts` 为入口，但将复杂度拆成内部小模块，避免单文件继续膨胀。

建议文件结构：

- `packages/mardora/src/plugins/table-plugin.ts`
  - 保留插件注册、Markdown config、preview 渲染、既有 keymap 和能力整合。
  - 调用新的 overlay extension 与纯表格操作 helper。

- `packages/mardora/src/plugins/table-model.ts`
  - 承载 `Alignment`、`ParsedTable`、`TableInfo`、`TableCellInfo` 类型。
  - 承载表格解析、标准化、格式化、行列变换纯函数。

- `packages/mardora/src/plugins/table-controls.ts`
  - CodeMirror `ViewPlugin` 或内部 extension。
  - 维护 hover cell、active handle、active menu。
  - 负责 overlay DOM 创建、定位、事件监听和销毁。

- `packages/mardora/src/plugins/table-controls-theme.ts`
  - 行列句柄、菜单、选中态样式。
  - 继承现有 `createTheme()` 体系，覆盖 light/dark。

如果实现阶段判断拆文件会引入过多改动，可以先在 `table-plugin.ts` 内完成，但必须保持 pure helper 与 DOM 控件分区清晰。

## Data Model

新增内部状态：

```ts
type TableControlKind = "row" | "column";

interface ActiveTableControl {
  readonly tableFrom: number;
  readonly kind: TableControlKind;
  readonly rowIndex?: number;
  readonly columnIndex?: number;
  readonly menuOpen: boolean;
}
```

扩展单元格 decoration 的 DOM attributes：

```html
data-mardora-table-cell="true"
data-mardora-table-from="..."
data-mardora-row-index="..."
data-mardora-row-kind="header|body"
data-mardora-column-index="..."
data-mardora-content-from="..."
data-mardora-content-to="..."
```

这些 attribute 只用于核心内部命中和 overlay 定位，不作为公开 API 承诺。

## Commands

所有命令从 `ParsedTable` 纯变换开始，最后统一通过 `replaceTable()` 写回。

### Row Commands

- `insertRowAbove(rowIndex)`：在当前 body 行上方插入空行。
- `insertRowBelow(rowIndex)`：在当前 body 行下方插入空行。
- `moveRowUp(rowIndex)`：与上一 body 行交换。
- `moveRowDown(rowIndex)`：与下一 body 行交换。
- `copyRow(rowIndex)`：复制当前 body 行，插入到当前行下方。
- `deleteRow(rowIndex)`：删除当前 body 行；若只剩一行 body，则清空该行而不删除。
- `deleteTable()`：删除整张表格，并确保周边 Markdown 间距不产生多余空行。

`rowIndex` 使用 `TableInfo.cellsByRow` 里的逻辑行索引：`0` 是 header，body 行从 `1` 开始。写入 `ParsedTable.rows` 时转换为 `bodyIndex = rowIndex - 1`。

### Column Commands

- `insertColumnLeft(columnIndex)`：在当前列左侧插入空列，alignment 默认 `left`。
- `insertColumnRight(columnIndex)`：在当前列右侧插入空列。
- `moveColumnLeft(columnIndex)`：当前列与左侧列交换，包括 header、alignment、body cells。
- `moveColumnRight(columnIndex)`：当前列与右侧列交换。
- `copyColumn(columnIndex)`：复制当前列到右侧，包括 alignment。
- `deleteColumn(columnIndex)`：删除当前列；只有一列时禁用。
- `deleteTable()`：同上。

## Rendering And Positioning

句柄和菜单使用 overlay DOM：

- overlay 容器挂在 `view.dom` 下。
- 使用 `view.requestMeasure()` 读取目标单元格 `getBoundingClientRect()`。
- 写阶段更新 overlay 的 `style.left/top`。
- 行句柄锚定当前行第一个可见单元格左边界中点。
- 列句柄锚定当前列表头单元格顶部边界中点。
- 菜单锚定被点击句柄，贴边并限制在 viewport 内。
- 滚动、viewport 变化、文档变化、selectionSet 时重新测量。

选中态使用 decoration class：

- 行选中：给目标 body 行所有单元格追加 `cm-mardora-table-cell-row-selected`。
- 列选中：给目标列所有单元格追加 `cm-mardora-table-cell-column-selected`。
- 不修改 editor selection。

## Event Handling

新增 DOM 事件规则：

- `mousemove`：当目标是 `.cm-mardora-table-cell` 时更新 hover cell。
- `mouseleave`：离开表格且菜单未打开时清空 hover。
- `mousedown` on handle：阻止默认行为，打开对应菜单。
- `mousedown` outside menu/handle/table：关闭菜单。
- `keydown Escape`：关闭菜单。

现有 `handleTableMouseDown()` 仍只处理 `.cm-mardora-table-cell` 内普通单元格点击。句柄和菜单事件必须先被控件层消费，不能落入普通单元格点击逻辑。

## Accessibility

- 句柄使用 `<button type="button">`。
- 行句柄 `aria-label="Table row actions"`。
- 列句柄 `aria-label="Table column actions"`。
- 菜单使用 `role="menu"`。
- 菜单项使用 `<button type="button" role="menuitem">`。
- 禁用项使用 `disabled` 和 `aria-disabled="true"`。
- Escape 关闭菜单。

## Testing

### Unit Tests

新增 `packages/mardora/tests/table-commands.spec.ts`：

- 在上方/下方插入 body 行。
- 第一行 body 上移禁用，最后一行 body 下移禁用。
- body 行上移/下移保持其他行顺序。
- 拷贝 body 行插入到下方。
- 删除多行表格中的 body 行。
- 删除最后一个 body 行时保留空行。
- 左侧/右侧插入列。
- 第一列左移禁用，最后一列右移禁用。
- 列左移/右移同步 header、alignment、body cells。
- 拷贝列同步 header、alignment、body cells。
- 删除列同步 header、alignment、body cells。
- 只有一列时删除列禁用。
- 删除表格返回正确 change range 和 selection。

纯 helper 测试优先，不依赖浏览器 DOM。

### Browser Verification

在 React playground `http://localhost:3001/` 验证：

- 单击表格单元格只定位光标，不产生文本选区。
- 拖选表格文字仍能选中文本并显示选中文本工具条。
- hover 单元格出现行/列句柄。
- 点击行句柄显示行选中态和行菜单。
- 行菜单七个命令行为正确。
- 点击列句柄显示列选中态和列菜单。
- 列菜单七个命令行为正确。
- 菜单打开时滚动页面，句柄和菜单位置不明显漂移。
- 点击外部或 Escape 关闭菜单。
- 浅色和暗色主题可读。
- 宽表横向滚动时句柄定位仍跟随目标行/列。

### Workspace Checks

最小检查：

```bash
bun run --cwd packages/mardora test
bun run --cwd packages/mardora typecheck
```

共享核心变更后全量检查：

```bash
bun run lint
bun run build
```

## Risks

- overlay 定位需要处理编辑器滚动、页面滚动、宽表横向滚动和 viewport resize。
- 如果句柄事件没有完全阻止默认行为，可能再次干扰表格光标定位或文本拖选。
- `table-plugin.ts` 已经偏大，继续堆叠会增加维护成本；实现阶段应优先拆出纯表格命令和控件 DOM。
- 删除表格需要谨慎处理前后空行，避免合并相邻 Markdown 块或留下多余空白。

## Done When

- 当前单元格 hover 或光标定位后显示对应行/列句柄。
- 行句柄菜单支持插入、移动、复制、删除行和删除表格。
- 列句柄菜单支持插入、移动、复制、删除列和删除表格。
- 行/列选中态不污染 CodeMirror 文本选区。
- 普通表格光标定位和表格文字拖选不退化。
- React、Vue2、Vue3 playground 默认获得该能力。
- 核心单元测试、typecheck、lint、build 通过。
