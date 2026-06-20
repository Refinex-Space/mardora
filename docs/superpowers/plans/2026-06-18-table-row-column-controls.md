---
owner: refinex
updated: 2026-06-18
status: active
referenced_by: docs/README.md#superpowers-plans
---

# Table Row And Column Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add framework-agnostic table row and column handles to Mardora Live tables, with row/column selection styling and menus for insertion, movement, copy, deletion, and deleting the whole table.

**Architecture:** Move reusable Markdown table parsing/formatting and row/column transforms into pure helpers first, then add a DOM overlay `ViewPlugin` for handles and menus. Keep visual row/column selection as Mardora decoration state, not browser native selection or CodeMirror text selection, so normal table caret placement and text dragging remain stable.

**Tech Stack:** TypeScript, CodeMirror 6 `ViewPlugin`, CodeMirror decorations, Bun tests, existing Mardora plugin/theme patterns, browser validation on the React playground at `http://localhost:3001/`.

---

## File Structure

- Create `packages/mardora/src/plugins/table-model.ts`
  - Own table types, parsing, normalization, formatting, row/column pure transforms, and delete-table change helpers.
- Create `packages/mardora/src/plugins/table-controls.ts`
  - Own overlay state, row/column handle DOM, menu DOM, outside-click handling, Escape handling, and action dispatch callbacks.
- Create `packages/mardora/src/plugins/table-controls-theme.ts`
  - Own row/column handle, menu, overlay, and selected row/column cell styles.
- Modify `packages/mardora/src/plugins/table-plugin.ts`
  - Import model helpers, register controls extension, add cell data attributes, add selected row/column classes, and keep existing caret/mouse mapping behavior intact.
- Create `packages/mardora/tests/table-commands.spec.ts`
  - Cover pure row/column transforms and delete-table changes.
- Create `packages/mardora/tests/table-controls-state.spec.ts`
  - Cover small pure helpers for menu item enabled/disabled state and active-control matching.
- Modify `docs/guides/project-introduction.md`
  - Document that `TablePlugin` includes row/column controls in Live mode.
- Modify playground guide data copies that mirror project introduction:
  - `playground/react-playground/app/data/md/project-introduction.ts`
  - `playground/react-playground/app/data/md/project-introduction.en.ts`
  - `playground/vue2-playground/src/data/md/project-introduction.ts`
  - `playground/vue2-playground/src/data/md/project-introduction.en.ts`
  - `playground/vue3-playground/src/data/md/project-introduction.ts`
  - `playground/vue3-playground/src/data/md/project-introduction.en.ts`

---

## Task 1: Extract Table Model And Preserve Existing Behavior

**Files:**

- Create: `packages/mardora/src/plugins/table-model.ts`
- Modify: `packages/mardora/src/plugins/table-plugin.ts`
- Test: `packages/mardora/tests/table-commands.spec.ts`

- [ ] **Step 1: Write baseline table model tests**

Create `packages/mardora/tests/table-commands.spec.ts` with this initial coverage:

```ts
import { describe, expect, it } from "bun:test";
import {
  formatTableMarkdown,
  normalizeParsedTable,
  parseTableMarkdown,
  splitTableLine,
} from "../src/plugins/table-model";

describe("table model parsing and formatting", () => {
  it("splits escaped pipes without creating extra cells", () => {
    expect(splitTableLine("| Name | Value \\| detail |")).toEqual([" Name ", " Value \\| detail "]);
  });

  it("normalizes ragged rows into a stable markdown table", () => {
    const parsed = parseTableMarkdown("| A | B |\n| --- | ---: |\n| one |\n| two | three |");

    expect(parsed).not.toBeNull();
    expect(formatTableMarkdown(normalizeParsedTable(parsed!))).toBe(
      ["| A   |     B |", "| --- | ----: |", "| one |       |", "| two | three |"].join("\n")
    );
  });
});
```

- [ ] **Step 2: Run the new focused test and verify it fails**

Run:

```bash
bun run --cwd packages/mardora test tests/table-commands.spec.ts
```

Expected: FAIL because `../src/plugins/table-model` does not exist.

- [ ] **Step 3: Move model types and pure helpers into `table-model.ts`**

Create `packages/mardora/src/plugins/table-model.ts` by moving these definitions out of `table-plugin.ts` and exporting them:

```ts
import { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

export type Alignment = "left" | "center" | "right";
export type TableRowKind = "header" | "body";

export interface ParsedTable {
  headers: string[];
  alignments: Alignment[];
  rows: string[][];
}

export interface TableCellInfo {
  rowKind: TableRowKind;
  rowIndex: number;
  columnIndex: number;
  from: number;
  to: number;
  contentFrom: number;
  contentTo: number;
  lineFrom: number;
  lineNumber: number;
  rawText: string;
}

export interface TableInfo {
  from: number;
  to: number;
  startLineNumber: number;
  delimiterLineNumber: number;
  endLineNumber: number;
  columnCount: number;
  alignments: Alignment[];
  cellsByRow: TableCellInfo[][];
  headerCells: TableCellInfo[];
  bodyCells: TableCellInfo[][];
}
```

Move and export the existing pure helpers without changing their behavior:

```ts
export const BREAK_TAG = "<br />";
export const BREAK_TAG_REGEX = /<br\s*\/?>/gi;
export const DELIMITER_CELL_PATTERN = /^:?-{3,}:?$/;

export function isEscaped(text: string, index: number): boolean;
export function getPipePositions(lineText: string): number[];
export function splitTableLine(lineText: string): string[];
export function isTableRowLine(lineText: string): boolean;
export function parseAlignment(cell: string): Alignment;
export function parseDelimiterAlignments(lineText: string): Alignment[] | null;
export function splitTableAndTrailingMarkdown(markdown: string): { tableMarkdown: string; trailingMarkdown: string };
export function canonicalizeBreakTags(text: string): string;
export function escapeUnescapedPipes(text: string): string;
export function normalizeCellContent(text: string): string;
export function renderWidth(text: string): number;
export function padCell(text: string, width: number, alignment: Alignment): string;
export function delimiterCell(width: number, alignment: Alignment): string;
export function parseTableMarkdown(markdown: string): ParsedTable | null;
export function normalizeParsedTable(parsed: ParsedTable): ParsedTable;
export function formatTableMarkdown(parsed: ParsedTable): string;
export function buildEmptyRow(columnCount: number): string[];
export function getVisibleBounds(rawCellText: string): { startOffset: number; endOffset: number };
export function isBodyRowEmpty(row: TableCellInfo[]): boolean;
export function buildTableFromInfo(tableInfo: TableInfo): ParsedTable;
export function getRowLineIndex(rowIndex: number): number;
export function getCellAnchorInFormattedTable(
  formattedTable: string,
  rowIndex: number,
  columnIndex: number,
  offset?: number
): number;
export function createTableInsert(
  state: EditorState,
  from: number,
  to: number,
  tableMarkdown: string
): { from: number; to: number; insert: string; prefixLength: number };
export function readTableInfo(state: EditorState, nodeFrom: number, nodeTo: number): TableInfo | null;
export function getTableInfoAtPosition(state: EditorState, position: number): TableInfo | null;
export function findCellAtPosition(tableInfo: TableInfo, position: number): TableCellInfo | null;
export function clampCellPosition(cell: TableCellInfo, position: number): number;
export function collectBreakRanges(tableInfo: TableInfo): Array<{ from: number; to: number }>;
```

Use the exact existing implementations from `table-plugin.ts`. Do not rewrite parsing logic during extraction.

- [ ] **Step 4: Update `table-plugin.ts` imports**

Remove the moved local definitions from `packages/mardora/src/plugins/table-plugin.ts` and import them:

```ts
import {
  BREAK_TAG,
  BREAK_TAG_REGEX,
  Alignment,
  ParsedTable,
  TableCellInfo,
  TableInfo,
  buildEmptyRow,
  buildTableFromInfo,
  clampCellPosition,
  collectBreakRanges,
  createTableInsert,
  findCellAtPosition,
  formatTableMarkdown,
  getCellAnchorInFormattedTable,
  getPipePositions,
  getTableInfoAtPosition,
  getVisibleBounds,
  isBodyRowEmpty,
  isTableRowLine,
  normalizeCellContent,
  normalizeParsedTable,
  parseDelimiterAlignments,
  parseTableMarkdown,
  readTableInfo,
  splitTableAndTrailingMarkdown,
} from "./table-model";
```

- [ ] **Step 5: Run the focused tests**

Run:

```bash
bun run --cwd packages/mardora test tests/table-commands.spec.ts
bun run --cwd packages/mardora test
```

Expected: both PASS, proving extraction did not break existing table or editor tests.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add packages/mardora/src/plugins/table-model.ts packages/mardora/src/plugins/table-plugin.ts packages/mardora/tests/table-commands.spec.ts
git commit -m "refactor(table): 抽离表格模型工具"
```

---

## Task 2: Add Pure Row And Column Commands

**Files:**

- Modify: `packages/mardora/src/plugins/table-model.ts`
- Modify: `packages/mardora/tests/table-commands.spec.ts`

- [ ] **Step 1: Add failing row command tests**

Append to `packages/mardora/tests/table-commands.spec.ts`:

```ts
import {
  copyTableColumn,
  copyTableRow,
  deleteTableColumn,
  deleteTableRow,
  insertTableColumn,
  insertTableRow,
  moveTableColumn,
  moveTableRow,
} from "../src/plugins/table-model";

const sampleTable = () =>
  normalizeParsedTable({
    headers: ["Name", "Role", "Notes"],
    alignments: ["left", "center", "right"],
    rows: [
      ["Ada", "Engineer", "One"],
      ["Linus", "Maintainer", "Two"],
      ["Grace", "Architect", "Three"],
    ],
  });

describe("table row commands", () => {
  it("inserts rows above and below a body row", () => {
    expect(insertTableRow(sampleTable(), 1, "above").rows.map((row) => row.join(","))).toEqual([
      ",,",
      "Ada,Engineer,One",
      "Linus,Maintainer,Two",
      "Grace,Architect,Three",
    ]);

    expect(insertTableRow(sampleTable(), 1, "below").rows.map((row) => row.join(","))).toEqual([
      "Ada,Engineer,One",
      ",,",
      "Linus,Maintainer,Two",
      "Grace,Architect,Three",
    ]);
  });

  it("moves body rows within bounds", () => {
    expect(moveTableRow(sampleTable(), 2, "up").rows.map((row) => row[0])).toEqual(["Linus", "Ada", "Grace"]);
    expect(moveTableRow(sampleTable(), 2, "down").rows.map((row) => row[0])).toEqual(["Ada", "Grace", "Linus"]);
    expect(moveTableRow(sampleTable(), 1, "up")).toEqual(sampleTable());
    expect(moveTableRow(sampleTable(), 3, "down")).toEqual(sampleTable());
  });

  it("copies and deletes body rows", () => {
    expect(copyTableRow(sampleTable(), 2).rows.map((row) => row[0])).toEqual(["Ada", "Linus", "Linus", "Grace"]);
    expect(deleteTableRow(sampleTable(), 2).rows.map((row) => row[0])).toEqual(["Ada", "Grace"]);
  });

  it("clears the last remaining body row instead of removing it", () => {
    const oneRow = normalizeParsedTable({ headers: ["A", "B"], alignments: ["left", "left"], rows: [["x", "y"]] });
    expect(deleteTableRow(oneRow, 1).rows).toEqual([["", ""]]);
  });
});
```

- [ ] **Step 2: Add failing column command tests**

Append to the same test file:

```ts
describe("table column commands", () => {
  it("inserts columns left and right", () => {
    expect(insertTableColumn(sampleTable(), 1, "left").headers).toEqual(["", "Name", "Role", "Notes"]);
    expect(insertTableColumn(sampleTable(), 1, "right").headers).toEqual(["Name", "", "Role", "Notes"]);
  });

  it("moves columns within bounds", () => {
    expect(moveTableColumn(sampleTable(), 1, "left")).toEqual(sampleTable());
    expect(moveTableColumn(sampleTable(), 2, "left").headers).toEqual(["Role", "Name", "Notes"]);
    expect(moveTableColumn(sampleTable(), 2, "right").headers).toEqual(["Name", "Notes", "Role"]);
    expect(moveTableColumn(sampleTable(), 3, "right")).toEqual(sampleTable());
  });

  it("copies a column with alignment and body values", () => {
    const copied = copyTableColumn(sampleTable(), 2);
    expect(copied.headers).toEqual(["Name", "Role", "Role", "Notes"]);
    expect(copied.alignments).toEqual(["left", "center", "center", "right"]);
    expect(copied.rows[0]).toEqual(["Ada", "Engineer", "Engineer", "One"]);
  });

  it("deletes a column but keeps a single-column table intact", () => {
    const deleted = deleteTableColumn(sampleTable(), 2);
    expect(deleted.headers).toEqual(["Name", "Notes"]);
    expect(deleted.alignments).toEqual(["left", "right"]);
    expect(deleted.rows[0]).toEqual(["Ada", "One"]);

    const oneColumn = normalizeParsedTable({ headers: ["A"], alignments: ["left"], rows: [["x"]] });
    expect(deleteTableColumn(oneColumn, 1)).toEqual(oneColumn);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
bun run --cwd packages/mardora test tests/table-commands.spec.ts
```

Expected: FAIL because row/column command exports do not exist.

- [ ] **Step 4: Implement row command helpers**

Add to `packages/mardora/src/plugins/table-model.ts`:

```ts
export type InsertSide = "above" | "below";
export type HorizontalSide = "left" | "right";
export type MoveDirection = "up" | "down" | "left" | "right";

function bodyIndexFromRowIndex(rowIndex: number): number {
  return rowIndex - 1;
}

function cloneParsedTable(parsed: ParsedTable): ParsedTable {
  const normalized = normalizeParsedTable(parsed);
  return {
    headers: [...normalized.headers],
    alignments: [...normalized.alignments],
    rows: normalized.rows.map((row) => [...row]),
  };
}

export function insertTableRow(parsed: ParsedTable, rowIndex: number, side: InsertSide): ParsedTable {
  const next = cloneParsedTable(parsed);
  const bodyIndex = Math.max(0, Math.min(bodyIndexFromRowIndex(rowIndex), next.rows.length));
  const insertAt = side === "above" ? bodyIndex : bodyIndex + 1;
  next.rows.splice(Math.max(0, Math.min(insertAt, next.rows.length)), 0, buildEmptyRow(next.headers.length));
  return next;
}

export function moveTableRow(parsed: ParsedTable, rowIndex: number, direction: Extract<MoveDirection, "up" | "down">): ParsedTable {
  const next = cloneParsedTable(parsed);
  const bodyIndex = bodyIndexFromRowIndex(rowIndex);
  const targetIndex = direction === "up" ? bodyIndex - 1 : bodyIndex + 1;
  if (bodyIndex < 0 || bodyIndex >= next.rows.length || targetIndex < 0 || targetIndex >= next.rows.length) {
    return next;
  }
  const current = next.rows[bodyIndex]!;
  next.rows[bodyIndex] = next.rows[targetIndex]!;
  next.rows[targetIndex] = current;
  return next;
}

export function copyTableRow(parsed: ParsedTable, rowIndex: number): ParsedTable {
  const next = cloneParsedTable(parsed);
  const bodyIndex = bodyIndexFromRowIndex(rowIndex);
  if (bodyIndex < 0 || bodyIndex >= next.rows.length) {
    return next;
  }
  next.rows.splice(bodyIndex + 1, 0, [...next.rows[bodyIndex]!]);
  return next;
}

export function deleteTableRow(parsed: ParsedTable, rowIndex: number): ParsedTable {
  const next = cloneParsedTable(parsed);
  const bodyIndex = bodyIndexFromRowIndex(rowIndex);
  if (bodyIndex < 0 || bodyIndex >= next.rows.length) {
    return next;
  }
  if (next.rows.length <= 1) {
    next.rows[0] = buildEmptyRow(next.headers.length);
    return next;
  }
  next.rows.splice(bodyIndex, 1);
  return next;
}
```

- [ ] **Step 5: Implement column command helpers**

Add to `packages/mardora/src/plugins/table-model.ts`:

```ts
function columnArrayIndex(columnIndex: number): number {
  return columnIndex - 1;
}

function swapArrayItems<T>(items: T[], left: number, right: number): void {
  const current = items[left]!;
  items[left] = items[right]!;
  items[right] = current;
}

export function insertTableColumn(parsed: ParsedTable, columnIndex: number, side: HorizontalSide): ParsedTable {
  const next = cloneParsedTable(parsed);
  const currentIndex = Math.max(0, Math.min(columnArrayIndex(columnIndex), next.headers.length));
  const insertAt = side === "left" ? currentIndex : currentIndex + 1;
  const safeInsertAt = Math.max(0, Math.min(insertAt, next.headers.length));
  next.headers.splice(safeInsertAt, 0, "");
  next.alignments.splice(safeInsertAt, 0, "left");
  for (const row of next.rows) {
    row.splice(safeInsertAt, 0, "");
  }
  return next;
}

export function moveTableColumn(
  parsed: ParsedTable,
  columnIndex: number,
  direction: Extract<MoveDirection, "left" | "right">
): ParsedTable {
  const next = cloneParsedTable(parsed);
  const currentIndex = columnArrayIndex(columnIndex);
  const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || currentIndex >= next.headers.length || targetIndex < 0 || targetIndex >= next.headers.length) {
    return next;
  }
  swapArrayItems(next.headers, currentIndex, targetIndex);
  swapArrayItems(next.alignments, currentIndex, targetIndex);
  for (const row of next.rows) {
    swapArrayItems(row, currentIndex, targetIndex);
  }
  return next;
}

export function copyTableColumn(parsed: ParsedTable, columnIndex: number): ParsedTable {
  const next = cloneParsedTable(parsed);
  const currentIndex = columnArrayIndex(columnIndex);
  if (currentIndex < 0 || currentIndex >= next.headers.length) {
    return next;
  }
  next.headers.splice(currentIndex + 1, 0, next.headers[currentIndex] || "");
  next.alignments.splice(currentIndex + 1, 0, next.alignments[currentIndex] || "left");
  for (const row of next.rows) {
    row.splice(currentIndex + 1, 0, row[currentIndex] || "");
  }
  return next;
}

export function deleteTableColumn(parsed: ParsedTable, columnIndex: number): ParsedTable {
  const next = cloneParsedTable(parsed);
  if (next.headers.length <= 1) {
    return next;
  }
  const currentIndex = columnArrayIndex(columnIndex);
  if (currentIndex < 0 || currentIndex >= next.headers.length) {
    return next;
  }
  next.headers.splice(currentIndex, 1);
  next.alignments.splice(currentIndex, 1);
  for (const row of next.rows) {
    row.splice(currentIndex, 1);
  }
  return next;
}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
bun run --cwd packages/mardora test tests/table-commands.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

Run:

```bash
git add packages/mardora/src/plugins/table-model.ts packages/mardora/tests/table-commands.spec.ts
git commit -m "feat(table): 增加表格行列变换命令"
```

---

## Task 3: Add Control State And Menu Rules

**Files:**

- Create: `packages/mardora/src/plugins/table-controls.ts`
- Test: `packages/mardora/tests/table-controls-state.spec.ts`

- [ ] **Step 1: Write menu state tests**

Create `packages/mardora/tests/table-controls-state.spec.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { createTableControlMenuState } from "../src/plugins/table-controls";

describe("createTableControlMenuState", () => {
  it("disables row movement at body row boundaries", () => {
    expect(createTableControlMenuState({ kind: "row", rowIndex: 1, bodyRowCount: 3, columnCount: 2 })).toMatchObject({
      canMoveRowUp: false,
      canMoveRowDown: true,
      canDeleteRow: true,
    });

    expect(createTableControlMenuState({ kind: "row", rowIndex: 3, bodyRowCount: 3, columnCount: 2 })).toMatchObject({
      canMoveRowUp: true,
      canMoveRowDown: false,
      canDeleteRow: true,
    });
  });

  it("disables column movement and deletion at column boundaries", () => {
    expect(createTableControlMenuState({ kind: "column", columnIndex: 1, bodyRowCount: 3, columnCount: 1 })).toMatchObject({
      canMoveColumnLeft: false,
      canMoveColumnRight: false,
      canDeleteColumn: false,
    });

    expect(createTableControlMenuState({ kind: "column", columnIndex: 2, bodyRowCount: 3, columnCount: 3 })).toMatchObject({
      canMoveColumnLeft: true,
      canMoveColumnRight: true,
      canDeleteColumn: true,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
bun run --cwd packages/mardora test tests/table-controls-state.spec.ts
```

Expected: FAIL because `table-controls.ts` does not exist.

- [ ] **Step 3: Add exported control types and pure menu-state helper**

Create `packages/mardora/src/plugins/table-controls.ts`:

```ts
export type TableControlKind = "row" | "column";
export type TableControlAction =
  | "insert-row-above"
  | "insert-row-below"
  | "move-row-up"
  | "move-row-down"
  | "copy-row"
  | "delete-row"
  | "insert-column-left"
  | "insert-column-right"
  | "move-column-left"
  | "move-column-right"
  | "copy-column"
  | "delete-column"
  | "delete-table";

export interface ActiveTableControl {
  readonly tableFrom: number;
  readonly kind: TableControlKind;
  readonly rowIndex?: number;
  readonly columnIndex?: number;
  readonly menuOpen: boolean;
}

export interface TableMenuStateInput {
  readonly kind: TableControlKind;
  readonly rowIndex?: number;
  readonly columnIndex?: number;
  readonly bodyRowCount: number;
  readonly columnCount: number;
}

export interface TableControlMenuState {
  readonly canMoveRowUp: boolean;
  readonly canMoveRowDown: boolean;
  readonly canDeleteRow: boolean;
  readonly canMoveColumnLeft: boolean;
  readonly canMoveColumnRight: boolean;
  readonly canDeleteColumn: boolean;
}

export function createTableControlMenuState(input: TableMenuStateInput): TableControlMenuState {
  const rowIndex = input.rowIndex ?? 0;
  const columnIndex = input.columnIndex ?? 0;
  return {
    canMoveRowUp: input.kind === "row" && rowIndex > 1,
    canMoveRowDown: input.kind === "row" && rowIndex >= 1 && rowIndex < input.bodyRowCount,
    canDeleteRow: input.kind === "row" && rowIndex >= 1,
    canMoveColumnLeft: input.kind === "column" && columnIndex > 1,
    canMoveColumnRight: input.kind === "column" && columnIndex >= 1 && columnIndex < input.columnCount,
    canDeleteColumn: input.kind === "column" && input.columnCount > 1,
  };
}
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
bun run --cwd packages/mardora test tests/table-controls-state.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add packages/mardora/src/plugins/table-controls.ts packages/mardora/tests/table-controls-state.spec.ts
git commit -m "feat(table): 增加表格控件状态规则"
```

---

## Task 4: Wire Overlay Handles, Menus, And Table Actions

**Files:**

- Modify: `packages/mardora/src/plugins/table-controls.ts`
- Modify: `packages/mardora/src/plugins/table-plugin.ts`
- Modify: `packages/mardora/src/plugins/table-model.ts`
- Test: `packages/mardora/tests/table-controls-state.spec.ts`
- Test: `packages/mardora/tests/table-commands.spec.ts`

- [ ] **Step 1: Add active-control effect and extension skeleton**

Extend `packages/mardora/src/plugins/table-controls.ts`:

```ts
import { Extension, StateEffect, StateField } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import type { TableInfo } from "./table-model";

export const setActiveTableControlEffect = StateEffect.define<ActiveTableControl | null>();

export const activeTableControlField = StateField.define<ActiveTableControl | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setActiveTableControlEffect)) {
        return effect.value;
      }
    }
    if (transaction.docChanged) {
      return null;
    }
    return value;
  },
});

export interface TableControlsConfig {
  readonly getTableInfoAtPosition: (view: EditorView, position: number) => TableInfo | null;
  readonly getTableInfoByFrom: (view: EditorView, tableFrom: number) => TableInfo | null;
  readonly runAction: (view: EditorView, control: ActiveTableControl, action: TableControlAction) => void;
}

export function tableControls(config: TableControlsConfig): Extension[] {
  const plugin = ViewPlugin.define((view) => new TableControlsView(view, config));
  return [
    activeTableControlField,
    plugin,
    EditorView.domEventHandlers({
      keydown(event, view) {
        if (event.key !== "Escape" || !view.state.field(activeTableControlField, false)) {
          return false;
        }
        view.dispatch({ effects: setActiveTableControlEffect.of(null) });
        event.preventDefault();
        return true;
      },
    }),
  ];
}
```

- [ ] **Step 2: Implement overlay DOM class**

Add this class in `packages/mardora/src/plugins/table-controls.ts` and fill in methods exactly as described:

```ts
class TableControlsView {
  private readonly overlay: HTMLElement;
  private hoverControl: ActiveTableControl | null = null;

  constructor(
    private readonly view: EditorView,
    private readonly config: TableControlsConfig
  ) {
    this.overlay = view.dom.ownerDocument.createElement("div");
    this.overlay.className = "cm-mardora-table-controls-overlay";
    this.overlay.addEventListener("mousedown", this.handleOverlayMouseDown);
    view.dom.appendChild(this.overlay);
    view.dom.addEventListener("mousemove", this.handleMouseMove);
    view.dom.addEventListener("mouseleave", this.handleMouseLeave);
    view.dom.ownerDocument.addEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.render();
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.selectionSet || update.viewportChanged || update.geometryChanged) {
      this.render();
    }
  }

  destroy(): void {
    this.view.dom.removeEventListener("mousemove", this.handleMouseMove);
    this.view.dom.removeEventListener("mouseleave", this.handleMouseLeave);
    this.view.dom.ownerDocument.removeEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.overlay.removeEventListener("mousedown", this.handleOverlayMouseDown);
    this.overlay.remove();
  }
}
```

Inside the class, implement these methods:

```ts
private readonly handleMouseMove = (event: MouseEvent): void => {
  const cell = event.target instanceof Element ? event.target.closest(".cm-mardora-table-cell") : null;
  if (!cell || !this.view.dom.contains(cell)) {
    if (!this.currentControl()?.menuOpen) {
      this.hoverControl = null;
      this.render();
    }
    return;
  }

  const tableFrom = Number(cell.getAttribute("data-mardora-table-from"));
  const rowIndex = Number(cell.getAttribute("data-mardora-row-index"));
  const columnIndex = Number(cell.getAttribute("data-mardora-column-index"));
  const rowKind = cell.getAttribute("data-mardora-row-kind");
  if (!Number.isFinite(tableFrom) || !Number.isFinite(rowIndex) || !Number.isFinite(columnIndex)) {
    return;
  }

  this.hoverControl =
    rowKind === "body"
      ? { tableFrom, kind: "row", rowIndex, columnIndex, menuOpen: false }
      : { tableFrom, kind: "column", columnIndex, menuOpen: false };
  this.render();
};

private readonly handleMouseLeave = (): void => {
  if (this.currentControl()?.menuOpen) {
    return;
  }
  this.hoverControl = null;
  this.render();
};

private readonly handleDocumentMouseDown = (event: MouseEvent): void => {
  if (event.target instanceof Node && (this.overlay.contains(event.target) || this.view.dom.contains(event.target))) {
    return;
  }
  this.view.dispatch({ effects: setActiveTableControlEffect.of(null) });
};

private readonly handleOverlayMouseDown = (event: MouseEvent): void => {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest<HTMLElement>("[data-mardora-table-control-action]");
  if (!button) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();

  const control = this.currentControl();
  if (!control) {
    return;
  }

  const action = button.dataset.mardoraTableControlAction as TableControlAction;
  if (button.getAttribute("aria-disabled") === "true") {
    return;
  }

  if (action === "open-row-menu" || action === "open-column-menu") {
    this.view.dispatch({ effects: setActiveTableControlEffect.of({ ...control, menuOpen: true }) });
    return;
  }

  this.config.runAction(this.view, control, action);
  this.hoverControl = null;
  this.view.dispatch({ effects: setActiveTableControlEffect.of(null) });
};

private currentControl(): ActiveTableControl | null {
  return this.view.state.field(activeTableControlField, false) ?? this.hoverControl;
}
```

- [ ] **Step 3: Implement rendering helpers**

Add methods to `TableControlsView`:

```ts
private render(): void {
  const control = this.currentControl();
  this.overlay.replaceChildren();
  if (!control) {
    return;
  }

  const table = this.config.getTableInfoByFrom(this.view, control.tableFrom);
  if (!table) {
    return;
  }

  const rowButton = control.rowIndex && control.rowIndex > 0 ? this.createHandle("row", control) : null;
  const columnButton = typeof control.columnIndex === "number" ? this.createHandle("column", control) : null;
  if (rowButton) this.overlay.appendChild(rowButton);
  if (columnButton) this.overlay.appendChild(columnButton);
  if (control.menuOpen) this.overlay.appendChild(this.createMenu(control, table));
  this.positionOverlay(control, table);
}

private createHandle(kind: TableControlKind, control: ActiveTableControl): HTMLButtonElement {
  const button = this.view.dom.ownerDocument.createElement("button");
  button.type = "button";
  button.className = `cm-mardora-table-handle cm-mardora-table-${kind}-handle`;
  button.dataset.mardoraTableControlAction = kind === "row" ? "open-row-menu" : "open-column-menu";
  button.setAttribute("aria-label", kind === "row" ? "Table row actions" : "Table column actions");
  button.innerHTML = "<span></span><span></span><span></span>";
  return button;
}

private createMenu(control: ActiveTableControl, table: TableInfo): HTMLElement {
  const state = createTableControlMenuState({
    kind: control.kind,
    rowIndex: control.rowIndex,
    columnIndex: control.columnIndex === undefined ? undefined : control.columnIndex + 1,
    bodyRowCount: table.bodyCells.length,
    columnCount: table.columnCount,
  });
  const menu = this.view.dom.ownerDocument.createElement("div");
  menu.className = "cm-mardora-table-control-menu";
  menu.setAttribute("role", "menu");

  const items =
    control.kind === "row"
      ? [
          ["insert-row-above", "在上方插入一行", true],
          ["insert-row-below", "在下方插入一行", true],
          ["move-row-up", "当前行上移", state.canMoveRowUp],
          ["move-row-down", "当前行下移", state.canMoveRowDown],
          ["copy-row", "拷贝行", true],
          ["delete-row", "删除行", state.canDeleteRow],
          ["delete-table", "删除表格", true],
        ]
      : [
          ["insert-column-left", "在左侧插入列", true],
          ["insert-column-right", "在右侧插入列", true],
          ["move-column-left", "左移列", state.canMoveColumnLeft],
          ["move-column-right", "右移列", state.canMoveColumnRight],
          ["copy-column", "拷贝列", true],
          ["delete-column", "删除列", state.canDeleteColumn],
          ["delete-table", "删除表格", true],
        ];

  for (const [action, label, enabled] of items) {
    const item = this.view.dom.ownerDocument.createElement("button");
    item.type = "button";
    item.className = "cm-mardora-table-control-menu-item";
    item.dataset.mardoraTableControlAction = action;
    item.setAttribute("role", "menuitem");
    item.setAttribute("aria-disabled", enabled ? "false" : "true");
    if (!enabled) item.disabled = true;
    item.textContent = label;
    menu.appendChild(item);
  }
  return menu;
}
```

Implement `positionOverlay()` with `requestMeasure()`:

```ts
private positionOverlay(control: ActiveTableControl, table: TableInfo): void {
  this.view.requestMeasure({
    read: () => {
      const column = control.columnIndex ?? 0;
      const header = table.headerCells[column];
      const row = control.rowIndex ? table.cellsByRow[control.rowIndex] : null;
      const rowCell = row?.[0] ?? null;
      const columnCell = header ?? null;
      const editorRect = this.view.dom.getBoundingClientRect();
      return {
        editorRect,
        rowRect: rowCell ? this.view.domAtPos(rowCell.contentFrom).node.parentElement?.closest(".cm-mardora-table-cell")?.getBoundingClientRect() ?? null : null,
        columnRect: columnCell ? this.view.domAtPos(columnCell.contentFrom).node.parentElement?.closest(".cm-mardora-table-cell")?.getBoundingClientRect() ?? null : null,
      };
    },
    write: (measure) => {
      const rowHandle = this.overlay.querySelector<HTMLElement>(".cm-mardora-table-row-handle");
      const columnHandle = this.overlay.querySelector<HTMLElement>(".cm-mardora-table-column-handle");
      if (rowHandle && measure.rowRect) {
        rowHandle.style.left = `${measure.rowRect.left - measure.editorRect.left - 14}px`;
        rowHandle.style.top = `${measure.rowRect.top - measure.editorRect.top + measure.rowRect.height / 2 - 14}px`;
      }
      if (columnHandle && measure.columnRect) {
        columnHandle.style.left = `${measure.columnRect.left - measure.editorRect.left + measure.columnRect.width / 2 - 18}px`;
        columnHandle.style.top = `${measure.columnRect.top - measure.editorRect.top - 18}px`;
      }
      const menu = this.overlay.querySelector<HTMLElement>(".cm-mardora-table-control-menu");
      const anchor = control.kind === "row" ? rowHandle : columnHandle;
      if (menu && anchor) {
        menu.style.left = `${Number.parseFloat(anchor.style.left) + 34}px`;
        menu.style.top = `${Number.parseFloat(anchor.style.top)}px`;
      }
    },
  });
}
```

If `domAtPos(...).node.parentElement` does not resolve the decorated cell reliably in implementation, replace it with a query using the data attributes added in Step 4:

```ts
this.view.dom.querySelector(
  `.cm-mardora-table-cell[data-mardora-table-from="${table.from}"][data-mardora-row-index="${rowIndex}"][data-mardora-column-index="${columnIndex}"]`
);
```

- [ ] **Step 4: Add cell attributes and selected-cell classes in `table-plugin.ts`**

Modify `getCellDecoration()` to include:

```ts
"data-mardora-table-from": String(cell.tableFrom),
"data-mardora-row-index": String(cell.rowIndex),
"data-mardora-row-kind": cell.rowKind,
"data-mardora-column-index": String(cell.columnIndex),
```

Add `tableFrom` to `TableCellInfo` in `table-model.ts` and set it inside `readTableInfo()` when creating each cell:

```ts
tableFrom: startLine.from,
```

Modify cell class creation to accept the active control from `activeTableControlField`:

```ts
const activeControl = view.state.field(activeTableControlField, false);
const isRowSelected =
  activeControl?.kind === "row" &&
  activeControl.tableFrom === tableInfo.from &&
  activeControl.rowIndex === cell.rowIndex;
const isColumnSelected =
  activeControl?.kind === "column" &&
  activeControl.tableFrom === tableInfo.from &&
  activeControl.columnIndex === cell.columnIndex;
```

Append these classes when true:

```ts
isRowSelected ? "cm-mardora-table-cell-row-selected" : "",
isColumnSelected ? "cm-mardora-table-cell-column-selected" : "",
```

- [ ] **Step 5: Register controls extension and implement action dispatch**

In `table-plugin.ts`, import:

```ts
import { activeTableControlField, tableControls, ActiveTableControl, TableControlAction } from "./table-controls";
import {
  copyTableColumn,
  copyTableRow,
  deleteTableColumn,
  deleteTableRow,
  insertTableColumn,
  insertTableRow,
  moveTableColumn,
  moveTableRow,
} from "./table-model";
```

Add `tableControls(...)` to `getExtensions()`:

```ts
tableControls({
  getTableInfoAtPosition: (view, position) => getTableInfoAtPosition(view.state, position),
  getTableInfoByFrom: (view, tableFrom) => getTableInfoAtPosition(view.state, tableFrom),
  runAction: (view, control, action) => this.runTableControlAction(view, control, action),
}),
```

Add method:

```ts
private runTableControlAction(view: EditorView, control: ActiveTableControl, action: TableControlAction): void {
  const tableInfo = getTableInfoAtPosition(view.state, control.tableFrom);
  if (!tableInfo) return;

  if (action === "delete-table") {
    view.dispatch({
      changes: { from: tableInfo.from, to: tableInfo.to, insert: "" },
      selection: { anchor: tableInfo.from },
      scrollIntoView: true,
    });
    return;
  }

  const parsed = normalizeParsedTable(buildTableFromInfo(tableInfo));
  const rowIndex = control.rowIndex ?? 1;
  const columnIndex = (control.columnIndex ?? 0) + 1;

  const next =
    action === "insert-row-above"
      ? insertTableRow(parsed, rowIndex, "above")
      : action === "insert-row-below"
        ? insertTableRow(parsed, rowIndex, "below")
        : action === "move-row-up"
          ? moveTableRow(parsed, rowIndex, "up")
          : action === "move-row-down"
            ? moveTableRow(parsed, rowIndex, "down")
            : action === "copy-row"
              ? copyTableRow(parsed, rowIndex)
              : action === "delete-row"
                ? deleteTableRow(parsed, rowIndex)
                : action === "insert-column-left"
                  ? insertTableColumn(parsed, columnIndex, "left")
                  : action === "insert-column-right"
                    ? insertTableColumn(parsed, columnIndex, "right")
                    : action === "move-column-left"
                      ? moveTableColumn(parsed, columnIndex, "left")
                      : action === "move-column-right"
                        ? moveTableColumn(parsed, columnIndex, "right")
                        : action === "copy-column"
                          ? copyTableColumn(parsed, columnIndex)
                          : action === "delete-column"
                            ? deleteTableColumn(parsed, columnIndex)
                            : parsed;

  const targetRow =
    action === "insert-row-above" ? rowIndex : action === "insert-row-below" || action === "copy-row" ? rowIndex + 1 : rowIndex;
  const targetColumn =
    action === "insert-column-left" ? Math.max(0, columnIndex - 1) : action === "insert-column-right" || action === "copy-column" ? columnIndex : Math.max(0, Math.min(columnIndex - 1, next.headers.length - 1));

  this.replaceTable(view, tableInfo, next, Math.max(0, Math.min(targetRow, next.rows.length)), targetColumn);
}
```

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```bash
bun run --cwd packages/mardora test tests/table-commands.spec.ts
bun run --cwd packages/mardora test tests/table-controls-state.spec.ts
bun run --cwd packages/mardora typecheck
```

Expected: all PASS.

- [ ] **Step 7: Commit Task 4**

Run:

```bash
git add packages/mardora/src/plugins/table-controls.ts packages/mardora/src/plugins/table-model.ts packages/mardora/src/plugins/table-plugin.ts packages/mardora/tests/table-commands.spec.ts packages/mardora/tests/table-controls-state.spec.ts
git commit -m "feat(table): 接入表格行列控件"
```

---

## Task 5: Add Table Control Theme And Polish Event Safety

**Files:**

- Create: `packages/mardora/src/plugins/table-controls-theme.ts`
- Modify: `packages/mardora/src/plugins/table-plugin.ts`
- Modify: `packages/mardora/src/plugins/table-controls.ts`

- [ ] **Step 1: Create the theme module**

Create `packages/mardora/src/plugins/table-controls-theme.ts`:

```ts
import { createTheme } from "../editor";

export const tableControlsTheme = createTheme({
  default: {
    ".cm-mardora-table-wrapper": {
      overflow: "visible",
    },
    ".cm-mardora-table-controls-overlay": {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: "20",
    },
    ".cm-mardora-table-handle": {
      position: "absolute",
      width: "1.75rem",
      height: "1.75rem",
      border: "1px solid var(--color-border, #d7dee7)",
      borderRadius: "0.5rem",
      backgroundColor: "var(--color-background, #ffffff)",
      color: "var(--color-muted-foreground, #64748b)",
      boxShadow: "0 8px 18px rgba(15, 23, 42, 0.14)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.125rem",
      pointerEvents: "auto",
      opacity: "1",
      cursor: "pointer",
    },
    ".cm-mardora-table-handle span": {
      width: "0.25rem",
      height: "0.25rem",
      borderRadius: "999px",
      backgroundColor: "currentColor",
      display: "block",
    },
    ".cm-mardora-table-row-handle": {
      flexDirection: "column",
    },
    ".cm-mardora-table-control-menu": {
      position: "absolute",
      minWidth: "12rem",
      padding: "0.25rem",
      border: "1px solid var(--color-border, #d7dee7)",
      borderRadius: "0.5rem",
      backgroundColor: "var(--color-background, #ffffff)",
      boxShadow: "0 18px 44px rgba(15, 23, 42, 0.16)",
      pointerEvents: "auto",
    },
    ".cm-mardora-table-control-menu-item": {
      width: "100%",
      minHeight: "2rem",
      border: "0",
      borderRadius: "0.375rem",
      backgroundColor: "transparent",
      color: "var(--color-text, #0f172a)",
      display: "flex",
      alignItems: "center",
      padding: "0 0.625rem",
      fontSize: "0.875rem",
      textAlign: "left",
      cursor: "pointer",
    },
    ".cm-mardora-table-control-menu-item:hover": {
      backgroundColor: "rgba(15, 23, 42, 0.06)",
    },
    ".cm-mardora-table-control-menu-item:disabled": {
      color: "var(--color-muted-foreground, #94a3b8)",
      cursor: "not-allowed",
    },
    ".cm-mardora-table-cell-row-selected, .cm-mardora-table-cell-column-selected": {
      backgroundColor: "rgba(37, 99, 235, 0.12)",
      boxShadow: "inset 0 0 0 1px rgba(37, 99, 235, 0.38)",
    },
  },
  dark: {
    ".cm-mardora-table-handle": {
      borderColor: "var(--color-border, #30363d)",
      backgroundColor: "var(--color-background, #161b22)",
      color: "var(--color-muted-foreground, #94a3b8)",
      boxShadow: "0 12px 28px rgba(0, 0, 0, 0.35)",
    },
    ".cm-mardora-table-control-menu": {
      borderColor: "var(--color-border, #30363d)",
      backgroundColor: "var(--color-background, #161b22)",
      boxShadow: "0 18px 44px rgba(0, 0, 0, 0.42)",
    },
    ".cm-mardora-table-control-menu-item": {
      color: "var(--color-text, #e6edf3)",
    },
    ".cm-mardora-table-control-menu-item:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
    ".cm-mardora-table-cell-row-selected, .cm-mardora-table-cell-column-selected": {
      backgroundColor: "rgba(96, 165, 250, 0.18)",
      boxShadow: "inset 0 0 0 1px rgba(96, 165, 250, 0.5)",
    },
  },
});
```

- [ ] **Step 2: Register the theme with `TablePlugin`**

In `table-plugin.ts`, import:

```ts
import { tableControlsTheme } from "./table-controls-theme";
```

Add the controls theme extension to `getExtensions()` beside the existing table controls extension:

```ts
tableControlsTheme(this.mardoraConfig?.theme || ThemeEnum.AUTO),
```

- [ ] **Step 3: Add event safety guards**

In `handleTableMouseDown()` in `table-plugin.ts`, add this before resolving `.cm-mardora-table-cell`:

```ts
if (event.target instanceof Element && event.target.closest(".cm-mardora-table-controls-overlay")) {
  return false;
}
```

In `table-controls.ts`, ensure every handle/menu `mousedown` path calls both:

```ts
event.preventDefault();
event.stopPropagation();
```

- [ ] **Step 4: Run focused checks**

Run:

```bash
bun run --cwd packages/mardora test tests/table-controls-state.spec.ts
bun run --cwd packages/mardora typecheck
```

Expected: both PASS.

- [ ] **Step 5: Commit Task 5**

Run:

```bash
git add packages/mardora/src/plugins/table-controls-theme.ts packages/mardora/src/plugins/table-controls.ts packages/mardora/src/plugins/table-plugin.ts
git commit -m "style(table): 增加表格行列控件样式"
```

---

## Task 6: Update User-Facing Guides

**Files:**

- Modify: `docs/guides/project-introduction.md`
- Modify: `playground/react-playground/app/data/md/project-introduction.ts`
- Modify: `playground/react-playground/app/data/md/project-introduction.en.ts`
- Modify: `playground/vue2-playground/src/data/md/project-introduction.ts`
- Modify: `playground/vue2-playground/src/data/md/project-introduction.en.ts`
- Modify: `playground/vue3-playground/src/data/md/project-introduction.ts`
- Modify: `playground/vue3-playground/src/data/md/project-introduction.en.ts`

- [ ] **Step 1: Update the main project guide**

In `docs/guides/project-introduction.md`, update the `TablePlugin` capability description to mention:

```md
`TablePlugin` 提供 GFM 表格解析、编辑态表格、preview 表格，以及 Live 模式中的行列句柄菜单。行列菜单支持插入、移动、复制、删除行列和删除表格；这些 UI 状态不会写入浏览器文本选区。
```

- [ ] **Step 2: Mirror the wording into playground data**

Apply the same Chinese wording to:

```text
playground/react-playground/app/data/md/project-introduction.ts
playground/vue2-playground/src/data/md/project-introduction.ts
playground/vue3-playground/src/data/md/project-introduction.ts
```

Apply this English wording to `.en.ts` files:

```text
`TablePlugin` provides GFM table parsing, edit-state tables, preview table output, and Live-mode row/column handle menus. Row and column menus support insert, move, copy, delete, and delete-table actions without writing row/column UI state into the browser text selection.
```

- [ ] **Step 3: Run docs/data search check**

Run:

```bash
rg -n "row/column handle|行列句柄|TablePlugin.*preview table|TablePlugin.*preview 表格" docs/guides playground/*-playground
```

Expected: updated guide/data files contain the new wording.

- [ ] **Step 4: Commit Task 6**

Run:

```bash
git add docs/guides/project-introduction.md playground/react-playground/app/data/md/project-introduction.ts playground/react-playground/app/data/md/project-introduction.en.ts playground/vue2-playground/src/data/md/project-introduction.ts playground/vue2-playground/src/data/md/project-introduction.en.ts playground/vue3-playground/src/data/md/project-introduction.ts playground/vue3-playground/src/data/md/project-introduction.en.ts
git commit -m "docs(table): 说明表格行列控件能力"
```

---

## Task 7: Verification And Browser QA

**Files:**

- No source edits expected unless verification exposes defects.

- [ ] **Step 1: Run smallest relevant checks**

Run:

```bash
bun run --cwd packages/mardora test tests/table-commands.spec.ts
bun run --cwd packages/mardora test tests/table-controls-state.spec.ts
bun run --cwd packages/mardora typecheck
```

Expected: all PASS.

- [ ] **Step 2: Run core package test suite**

Run:

```bash
bun run --cwd packages/mardora test
```

Expected: PASS.

- [ ] **Step 3: Run workspace-wide checks**

Run:

```bash
bun run lint
bun run build
```

Expected: PASS. Existing non-fatal build warnings may remain, but no new errors.

- [ ] **Step 4: Start or reuse the React playground**

If `http://localhost:3001/` is already served, reuse it. Otherwise run:

```bash
bun run --cwd playground/react-playground dev
```

Expected: playground is available at `http://localhost:3001/` or the next available local port shown by Next.js.

- [ ] **Step 5: Browser-verify table caret and text selection regression cases**

In the browser:

- Open the project introduction document.
- Single-click inside a table body cell.
- Confirm no browser text selection is created.
- Confirm exactly one table caret appears in the clicked cell.
- Drag-select normal text inside a table cell.
- Confirm selected text remains stable and the selection toolbar appears once.

- [ ] **Step 6: Browser-verify row controls**

In the browser:

- Hover a body cell.
- Confirm the left row handle appears at that row.
- Click the row handle.
- Confirm the entire row is visually selected and the row menu opens.
- Verify these actions:
  - 在上方插入一行
  - 在下方插入一行
  - 当前行上移
  - 当前行下移
  - 拷贝行
  - 删除行
  - 删除表格

- [ ] **Step 7: Browser-verify column controls**

In the browser:

- Hover a cell.
- Confirm the top column handle appears above that column.
- Click the column handle.
- Confirm the whole column is visually selected and the column menu opens.
- Verify these actions:
  - 在左侧插入列
  - 在右侧插入列
  - 左移列
  - 右移列
  - 拷贝列
  - 删除列
  - 删除表格

- [ ] **Step 8: Browser-verify closing, theme, and wide-table behavior**

In the browser:

- Press Escape while a menu is open; confirm the menu closes.
- Click outside the editor; confirm the menu closes.
- Toggle dark theme; confirm handles, menu, and selected cells are readable.
- Use or create a wide table; horizontally scroll if available; confirm handles still align to the active row/column.

- [ ] **Step 9: Commit verification fixes if needed**

If browser QA requires fixes, commit them with a focused message:

```bash
git status --short
git add packages/mardora/src/plugins/table-controls.ts packages/mardora/src/plugins/table-controls-theme.ts packages/mardora/src/plugins/table-model.ts packages/mardora/src/plugins/table-plugin.ts packages/mardora/tests/table-commands.spec.ts packages/mardora/tests/table-controls-state.spec.ts
git commit -m "fix(table): 修复表格控件交互细节"
```

If `git status --short` shows a different exact file list, stage the exact files shown by that command instead of unrelated files. If no fixes are needed, do not create an empty commit.

---

## Self-Review Checklist

- [ ] Every spec requirement has a matching task.
- [ ] Row/column UI state never becomes a browser native text selection.
- [ ] Single-click table caret placement still works.
- [ ] Drag-selecting table text still works and can show the selection toolbar.
- [ ] Row/column command helpers are covered by focused unit tests.
- [ ] Table controls do not add framework dependencies to `packages/mardora`.
- [ ] User-facing docs and playground guide data mention the final table capability.
- [ ] `bun run --cwd packages/mardora test`, `typecheck`, `bun run lint`, and `bun run build` pass.
