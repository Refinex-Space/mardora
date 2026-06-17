---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: docs/README.md#superpowers-plans
---

# Selection Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Markora's core selected-text toolbar with inline formatting, link editing, color/highlight swatches, list conversion, and Vue2 playground validation.

**Architecture:** Add a core `editor/selection-toolbar` module beside the existing `slash` module. Keep document transformations in pure functions, keep floating placement in pure functions, and keep DOM concerns inside the toolbar menu/view plugin. Register the toolbar through `markora()` so every framework integration gets the same behavior.

**Tech Stack:** TypeScript, CodeMirror 6 `ViewPlugin`, Bun test, existing Markora SVG icon registry, existing Markora plugin and theme patterns.

---

## File Structure

- Create `packages/markora/src/editor/selection-toolbar/types.ts`
  - Shared command, range, palette, panel, layout, and runtime config types.
- Create `packages/markora/src/editor/selection-toolbar/commands.ts`
  - Pure document transformation helpers for inline markers, HTML wrappers, links, and list markers.
- Create `packages/markora/src/editor/selection-toolbar/position.ts`
  - Pure layout helper for toolbar and child panels.
- Create `packages/markora/src/editor/selection-toolbar/menu.ts`
  - DOM renderer for the toolbar, color panel, and link panel.
- Create `packages/markora/src/editor/selection-toolbar/theme.ts`
  - Base theme for black/white compact toolbar UI.
- Create `packages/markora/src/editor/selection-toolbar/extension.ts`
  - CodeMirror `ViewPlugin` that tracks selections, renders the menu, executes commands, and handles closing.
- Create `packages/markora/src/editor/selection-toolbar/index.ts`
  - Public exports for the toolbar module.
- Modify `packages/markora/src/editor/icons/index.ts`
  - Add toolbar icons: `bold`, `italic`, `strikethrough`, `underline`, `code`, `highlighter`, `baseline`, `copy`, `external-link`, `trash-2`.
- Modify `packages/markora/src/editor/markora.ts`
  - Add `selectionToolbar?: MarkoraSelectionToolbarConfig` to `MarkoraConfig`.
  - Register `selectionToolbar()` by default.
- Modify `packages/markora/src/editor/index.ts`
  - Export `./selection-toolbar`.
- Modify `playground/vue2-playground/src/shims-markora.d.ts`
  - Add the optional `selectionToolbar` config shape for the Vue2 TypeScript shim.
- Create `packages/markora/tests/selection-toolbar-commands.spec.ts`
  - Bun tests for command transformations.
- Create `packages/markora/tests/selection-toolbar-position.spec.ts`
  - Bun tests for toolbar and panel placement.
- Modify `packages/markora/tests/slash-insertions.spec.ts`
  - Extend icon registry test to cover new toolbar icon identifiers.

---

### Task 1: Add Toolbar Icon Names

**Files:**

- Modify: `packages/markora/src/editor/icons/index.ts`
- Test: `packages/markora/tests/slash-insertions.spec.ts`

- [ ] **Step 1: Write the failing icon coverage test**

Append this test to the existing `describe("defaultSlashCommands", ...)` block or add a new `describe("markora icons", ...)` block in `packages/markora/tests/slash-insertions.spec.ts`:

```ts
it("contains built-in icons required by the selection toolbar", () => {
  expect(
    [
      "bold",
      "italic",
      "strikethrough",
      "underline",
      "code",
      "highlighter",
      "baseline",
      "link",
      "list-ordered",
      "list",
      "list-todo",
      "copy",
      "external-link",
      "trash-2",
    ].every((icon) => hasMarkoraIcon(icon))
  ).toBe(true);
});
```

- [ ] **Step 2: Run the icon test and verify it fails**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/slash-insertions.spec.ts
```

Expected: FAIL because `hasMarkoraIcon("bold")` and the other new names return false.

- [ ] **Step 3: Add icon names and SVG definitions**

In `packages/markora/src/editor/icons/index.ts`, extend `IconElementName`:

```ts
type IconElementName = "circle" | "line" | "path" | "rect";
```

Extend `MarkoraIconName` with:

```ts
  | "baseline"
  | "bold"
  | "code"
  | "copy"
  | "external-link"
  | "highlighter"
  | "italic"
  | "strikethrough"
  | "trash-2"
  | "underline"
```

Add these entries to `iconDefinitions`:

```ts
  baseline: [
    { name: "path", attrs: { d: "M4 20h16" } },
    { name: "path", attrs: { d: "m6 16 6-12 6 12" } },
    { name: "path", attrs: { d: "M8 12h8" } },
  ],
  bold: [
    { name: "path", attrs: { d: "M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" } },
  ],
  code: [
    { name: "path", attrs: { d: "m16 18 6-6-6-6" } },
    { name: "path", attrs: { d: "m8 6-6 6 6 6" } },
  ],
  copy: [
    { name: "rect", attrs: { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" } },
    { name: "path", attrs: { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" } },
  ],
  "external-link": [
    { name: "path", attrs: { d: "M15 3h6v6" } },
    { name: "path", attrs: { d: "M10 14 21 3" } },
    { name: "path", attrs: { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" } },
  ],
  highlighter: [
    { name: "path", attrs: { d: "m9 11-6 6v3h9l3-3" } },
    { name: "path", attrs: { d: "m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" } },
  ],
  italic: [
    { name: "line", attrs: { x1: "19", x2: "10", y1: "4", y2: "4" } },
    { name: "line", attrs: { x1: "14", x2: "5", y1: "20", y2: "20" } },
    { name: "line", attrs: { x1: "15", x2: "9", y1: "4", y2: "20" } },
  ],
  strikethrough: [
    { name: "path", attrs: { d: "M16 4H9a3 3 0 0 0-2.83 4" } },
    { name: "path", attrs: { d: "M14 12a4 4 0 0 1 0 8H6" } },
    { name: "line", attrs: { x1: "4", x2: "20", y1: "12", y2: "12" } },
  ],
  "trash-2": [
    { name: "path", attrs: { d: "M10 11v6" } },
    { name: "path", attrs: { d: "M14 11v6" } },
    { name: "path", attrs: { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" } },
    { name: "path", attrs: { d: "M3 6h18" } },
    { name: "path", attrs: { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" } },
  ],
  underline: [
    { name: "path", attrs: { d: "M6 4v6a6 6 0 0 0 12 0V4" } },
    { name: "line", attrs: { x1: "4", x2: "20", y1: "20", y2: "20" } },
  ],
```

- [ ] **Step 4: Run the icon test and verify it passes**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/slash-insertions.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add packages/markora/src/editor/icons/index.ts packages/markora/tests/slash-insertions.spec.ts
git commit -m "feat(editor): 补充选区工具条内置图标"
```

---

### Task 2: Implement Positioning Pure Function

**Files:**

- Create: `packages/markora/src/editor/selection-toolbar/types.ts`
- Create: `packages/markora/src/editor/selection-toolbar/position.ts`
- Create: `packages/markora/src/editor/selection-toolbar/index.ts`
- Modify: `packages/markora/src/editor/index.ts`
- Test: `packages/markora/tests/selection-toolbar-position.spec.ts`

- [ ] **Step 1: Write the failing positioning tests**

Create `packages/markora/tests/selection-toolbar-position.spec.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { computeSelectionToolbarLayout } from "../src/editor/selection-toolbar";

describe("computeSelectionToolbarLayout", () => {
  it("places the toolbar above a selection when there is enough space", () => {
    expect(
      computeSelectionToolbarLayout({
        anchor: { left: 300, right: 500, top: 240, bottom: 264 },
        viewport: { width: 1000, height: 800 },
        floating: { width: 360, height: 42 },
      })
    ).toEqual({
      placement: "top",
      left: 220,
      top: 190,
      maxHeight: 742,
    });
  });

  it("places the toolbar below a selection when top space is too small", () => {
    expect(
      computeSelectionToolbarLayout({
        anchor: { left: 100, right: 220, top: 24, bottom: 48 },
        viewport: { width: 600, height: 500 },
        floating: { width: 360, height: 42 },
      })
    ).toEqual({
      placement: "bottom",
      left: 8,
      top: 56,
      maxHeight: 436,
    });
  });

  it("clamps the toolbar horizontally inside the viewport", () => {
    expect(
      computeSelectionToolbarLayout({
        anchor: { left: 880, right: 940, top: 300, bottom: 324 },
        viewport: { width: 960, height: 800 },
        floating: { width: 360, height: 42 },
      }).left
    ).toBe(592);
  });

  it("uses child panel width when it is wider than the toolbar", () => {
    expect(
      computeSelectionToolbarLayout({
        anchor: { left: 20, right: 80, top: 240, bottom: 264 },
        viewport: { width: 400, height: 600 },
        floating: { width: 340, height: 180 },
      })
    ).toMatchObject({
      placement: "top",
      left: 8,
    });
  });
});
```

- [ ] **Step 2: Run the positioning tests and verify they fail**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/selection-toolbar-position.spec.ts
```

Expected: FAIL because `../src/editor/selection-toolbar` does not exist.

- [ ] **Step 3: Add shared types**

Create `packages/markora/src/editor/selection-toolbar/types.ts`:

```ts
import type { MarkoraIconName } from "../icons";

export type MarkoraSelectionToolbarConfig = {
  enabled?: boolean;
};

export type SelectionToolbarPlacement = "top" | "bottom";

export type SelectionToolbarAnchorRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type SelectionToolbarViewport = {
  width: number;
  height: number;
};

export type SelectionToolbarFloatingSize = {
  width: number;
  height: number;
};

export type SelectionToolbarLayoutInput = {
  anchor: SelectionToolbarAnchorRect;
  viewport: SelectionToolbarViewport;
  floating: SelectionToolbarFloatingSize;
};

export type SelectionToolbarLayout = {
  placement: SelectionToolbarPlacement;
  left: number;
  top: number;
  maxHeight: number;
};

export type SelectionToolbarActionId =
  | "bold"
  | "italic"
  | "strike"
  | "underline"
  | "code"
  | "highlight"
  | "color"
  | "link"
  | "ordered-list"
  | "unordered-list"
  | "task-list";

export type SelectionToolbarButton = {
  id: SelectionToolbarActionId;
  label: string;
  icon: MarkoraIconName;
  active?: boolean;
};
```

- [ ] **Step 4: Implement the positioning helper**

Create `packages/markora/src/editor/selection-toolbar/position.ts`:

```ts
import type { SelectionToolbarLayout, SelectionToolbarLayoutInput, SelectionToolbarPlacement } from "./types";

const viewportPadding = 8;
const anchorGap = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeSelectionToolbarLayout(input: SelectionToolbarLayoutInput): SelectionToolbarLayout {
  const selectionCenter = (input.anchor.left + input.anchor.right) / 2;
  const maxLeft = Math.max(viewportPadding, input.viewport.width - input.floating.width - viewportPadding);
  const left = clamp(Math.round(selectionCenter - input.floating.width / 2), viewportPadding, maxLeft);
  const availableAbove = Math.max(1, input.anchor.top - anchorGap - viewportPadding);
  const availableBelow = Math.max(1, input.viewport.height - input.anchor.bottom - anchorGap - viewportPadding);
  const placement: SelectionToolbarPlacement =
    availableAbove >= input.floating.height || availableAbove >= availableBelow ? "top" : "bottom";

  if (placement === "top") {
    return {
      placement,
      left,
      top: Math.max(viewportPadding, Math.round(input.anchor.top - anchorGap - input.floating.height)),
      maxHeight: availableAbove,
    };
  }

  return {
    placement,
    left,
    top: Math.round(input.anchor.bottom + anchorGap),
    maxHeight: availableBelow,
  };
}
```

- [ ] **Step 5: Export the module**

Create `packages/markora/src/editor/selection-toolbar/index.ts`:

```ts
export * from "./types";
export * from "./position";
```

Modify `packages/markora/src/editor/index.ts`:

```ts
export * from "./selection-toolbar";
```

- [ ] **Step 6: Run the positioning tests and verify they pass**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/selection-toolbar-position.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

Run:

```bash
git add packages/markora/src/editor/selection-toolbar packages/markora/src/editor/index.ts packages/markora/tests/selection-toolbar-position.spec.ts
git commit -m "feat(editor): 添加选区工具条定位计算"
```

---

### Task 3: Implement Document Transformation Commands

**Files:**

- Modify: `packages/markora/src/editor/selection-toolbar/types.ts`
- Create: `packages/markora/src/editor/selection-toolbar/commands.ts`
- Modify: `packages/markora/src/editor/selection-toolbar/index.ts`
- Test: `packages/markora/tests/selection-toolbar-commands.spec.ts`

- [ ] **Step 1: Write failing command tests**

Create `packages/markora/tests/selection-toolbar-commands.spec.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  buildInlineFormatChange,
  buildLinkChange,
  buildListChange,
  parseSelectedLink,
} from "../src/editor/selection-toolbar";

describe("selection toolbar inline commands", () => {
  it("wraps selected text with markdown markers", () => {
    expect(buildInlineFormatChange({ doc: "hello world", from: 6, to: 11, marker: "**" })).toEqual({
      changes: { from: 6, to: 11, insert: "**world**" },
      selection: { anchor: 8, head: 13 },
    });
  });

  it("removes existing markdown markers around a full selection", () => {
    expect(buildInlineFormatChange({ doc: "hello **world**", from: 8, to: 13, marker: "**" })).toEqual({
      changes: [
        { from: 6, to: 8, insert: "" },
        { from: 13, to: 15, insert: "" },
      ],
      selection: { anchor: 6, head: 11 },
    });
  });

  it("wraps selected text with an html tag", () => {
    expect(buildInlineFormatChange({ doc: "hello world", from: 6, to: 11, htmlTag: "u" })).toEqual({
      changes: { from: 6, to: 11, insert: "<u>world</u>" },
      selection: { anchor: 9, head: 14 },
    });
  });

  it("wraps selected text with an html span style", () => {
    expect(
      buildInlineFormatChange({
        doc: "hello world",
        from: 6,
        to: 11,
        spanStyle: { property: "color", value: "#2563eb" },
      })
    ).toEqual({
      changes: { from: 6, to: 11, insert: '<span style="color: #2563eb">world</span>' },
      selection: { anchor: 35, head: 40 },
    });
  });
});

describe("selection toolbar link commands", () => {
  it("derives link defaults from a selected URL", () => {
    expect(parseSelectedLink("https://markora.dev")).toEqual({
      kind: "url",
      title: "",
      url: "https://markora.dev",
    });
  });

  it("parses an existing markdown link", () => {
    expect(parseSelectedLink("[Markora](https://markora.dev)")).toEqual({
      kind: "markdown-link",
      title: "Markora",
      url: "https://markora.dev",
    });
  });

  it("writes a markdown link", () => {
    expect(buildLinkChange({ from: 0, to: 7, title: "Markora", url: "https://markora.dev" })).toEqual({
      changes: { from: 0, to: 7, insert: "[Markora](https://markora.dev)" },
      selection: { anchor: 0, head: 28 },
    });
  });

  it("deletes a markdown link back to plain text", () => {
    expect(buildLinkChange({ from: 0, to: 28, title: "Markora", url: "", remove: true })).toEqual({
      changes: { from: 0, to: 28, insert: "Markora" },
      selection: { anchor: 0, head: 7 },
    });
  });
});

describe("selection toolbar list commands", () => {
  it("adds unordered markers to every selected line", () => {
    expect(buildListChange({ doc: "alpha\nbeta", from: 0, to: 10, kind: "unordered" })).toEqual({
      changes: [
        { from: 0, to: 0, insert: "- " },
        { from: 6, to: 6, insert: "- " },
      ],
    });
  });

  it("replaces unordered markers with ordered markers", () => {
    expect(buildListChange({ doc: "- alpha\n- beta", from: 0, to: 14, kind: "ordered" })).toEqual({
      changes: [
        { from: 0, to: 2, insert: "1. " },
        { from: 8, to: 10, insert: "2. " },
      ],
    });
  });

  it("removes existing task list markers", () => {
    expect(buildListChange({ doc: "- [ ] alpha\n- [x] beta", from: 0, to: 21, kind: "task" })).toEqual({
      changes: [
        { from: 0, to: 6, insert: "" },
        { from: 12, to: 18, insert: "" },
      ],
    });
  });
});
```

- [ ] **Step 2: Run command tests and verify they fail**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/selection-toolbar-commands.spec.ts
```

Expected: FAIL because command exports are missing.

- [ ] **Step 3: Add command types**

Append to `packages/markora/src/editor/selection-toolbar/types.ts`:

```ts
export type TextChange = {
  from: number;
  to: number;
  insert: string;
};

export type TextSelection = {
  anchor: number;
  head?: number;
};

export type TextCommandResult = {
  changes: TextChange | TextChange[];
  selection?: TextSelection;
};

export type InlineFormatInput = {
  doc: string;
  from: number;
  to: number;
  marker?: string;
  htmlTag?: "u";
  spanStyle?: {
    property: "color" | "background-color";
    value: string;
  };
};

export type ParsedSelectionLink =
  | { kind: "markdown-link"; title: string; url: string }
  | { kind: "url"; title: string; url: string }
  | { kind: "text"; title: string; url: string };

export type LinkChangeInput = {
  from: number;
  to: number;
  title: string;
  url: string;
  remove?: boolean;
};

export type SelectionToolbarListKind = "ordered" | "unordered" | "task";
```

- [ ] **Step 4: Implement command helpers**

Create `packages/markora/src/editor/selection-toolbar/commands.ts`:

```ts
import type {
  InlineFormatInput,
  LinkChangeInput,
  ParsedSelectionLink,
  SelectionToolbarListKind,
  TextChange,
  TextCommandResult,
} from "./types";

const markdownLinkPattern = /^\[([^\]]*)\]\(([^)]*)\)$/;
const urlPattern = /^(https?:\/\/|www\.)[^\s]+$/i;
const listMarkerPattern = /^(\s*)([-*+]|\d+\.)\s(\[[ xX]\]\s)?/;

function selectedText(input: Pick<InlineFormatInput, "doc" | "from" | "to">): string {
  return input.doc.slice(input.from, input.to);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildHtmlWrapper(input: InlineFormatInput, text: string): { open: string; close: string } {
  if (input.htmlTag) {
    return { open: `<${input.htmlTag}>`, close: `</${input.htmlTag}>` };
  }
  if (input.spanStyle) {
    return { open: `<span style="${input.spanStyle.property}: ${input.spanStyle.value}">`, close: "</span>" };
  }
  const marker = input.marker ?? "";
  return { open: marker, close: marker };
}

export function buildInlineFormatChange(input: InlineFormatInput): TextCommandResult {
  const text = selectedText(input);
  const { open, close } = buildHtmlWrapper(input, text);
  const beforeFrom = Math.max(0, input.from - open.length);
  const afterTo = Math.min(input.doc.length, input.to + close.length);
  const before = input.doc.slice(beforeFrom, input.from);
  const after = input.doc.slice(input.to, afterTo);

  if (before === open && after === close) {
    return {
      changes: [
        { from: beforeFrom, to: input.from, insert: "" },
        { from: input.to, to: afterTo, insert: "" },
      ],
      selection: { anchor: beforeFrom, head: beforeFrom + text.length },
    };
  }

  const insert = `${open}${text}${close}`;
  return {
    changes: { from: input.from, to: input.to, insert },
    selection: { anchor: input.from + open.length, head: input.from + open.length + text.length },
  };
}

export function parseSelectedLink(text: string): ParsedSelectionLink {
  const linkMatch = text.match(markdownLinkPattern);
  if (linkMatch) {
    return { kind: "markdown-link", title: linkMatch[1] ?? "", url: linkMatch[2] ?? "" };
  }
  if (urlPattern.test(text)) {
    return { kind: "url", title: "", url: text };
  }
  return { kind: "text", title: text, url: "" };
}

export function buildLinkChange(input: LinkChangeInput): TextCommandResult {
  if (input.remove) {
    return {
      changes: { from: input.from, to: input.to, insert: input.title },
      selection: { anchor: input.from, head: input.from + input.title.length },
    };
  }

  const insert = `[${input.title}](${input.url})`;
  return {
    changes: { from: input.from, to: input.to, insert },
    selection: { anchor: input.from, head: input.from + insert.length },
  };
}

function lineRanges(doc: string, from: number, to: number): Array<{ from: number; to: number; text: string }> {
  const ranges: Array<{ from: number; to: number; text: string }> = [];
  let position = 0;
  for (const text of doc.split("\n")) {
    const lineFrom = position;
    const lineTo = position + text.length;
    if (lineTo >= from && lineFrom <= to) {
      ranges.push({ from: lineFrom, to: lineTo, text });
    }
    position = lineTo + 1;
  }
  return ranges;
}

function markerFor(kind: SelectionToolbarListKind, order: number): string {
  if (kind === "ordered") return `${order}. `;
  if (kind === "task") return "- [ ] ";
  return "- ";
}

export function buildListChange(input: { doc: string; from: number; to: number; kind: SelectionToolbarListKind }): {
  changes: TextChange[];
} {
  const changes: TextChange[] = [];
  let order = 1;

  for (const line of lineRanges(input.doc, input.from, input.to)) {
    const match = line.text.match(listMarkerPattern);
    const actualMarker = markerFor(input.kind, order);

    if (match) {
      const indent = match[1] ?? "";
      const isOrdered = /^\d+\.$/.test(match[2] ?? "");
      const isUnordered = /^[-*+]$/.test(match[2] ?? "");
      const hasTask = !!match[3];
      const same =
        (input.kind === "ordered" && isOrdered && !hasTask) ||
        (input.kind === "unordered" && isUnordered && !hasTask) ||
        (input.kind === "task" && hasTask);

      changes.push({
        from: line.from,
        to: line.from + match[0].length,
        insert: same ? indent : indent + actualMarker,
      });
    } else {
      const indentLength = line.text.match(/^(\s*)/)?.[1]?.length ?? 0;
      changes.push({ from: line.from + indentLength, to: line.from + indentLength, insert: actualMarker });
    }

    if (input.kind === "ordered") order += 1;
  }

  return { changes };
}

export function stripSpanStyle(text: string, property: "color" | "background-color"): string {
  const pattern = new RegExp(`<span style="${escapeRegExp(property)}: #[0-9a-fA-F]{6}">([\\s\\S]*)<\\/span>`);
  return text.replace(pattern, "$1");
}
```

- [ ] **Step 5: Export command helpers**

Modify `packages/markora/src/editor/selection-toolbar/index.ts`:

```ts
export * from "./types";
export * from "./position";
export * from "./commands";
```

- [ ] **Step 6: Run command tests and verify they pass**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/selection-toolbar-commands.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

Run:

```bash
git add packages/markora/src/editor/selection-toolbar packages/markora/tests/selection-toolbar-commands.spec.ts
git commit -m "feat(editor): 添加选区工具条文本转换命令"
```

---

### Task 4: Render Toolbar Menu, Link Panel, and Color Panel

**Files:**

- Modify: `packages/markora/src/editor/selection-toolbar/types.ts`
- Create: `packages/markora/src/editor/selection-toolbar/menu.ts`
- Create: `packages/markora/src/editor/selection-toolbar/theme.ts`
- Modify: `packages/markora/src/editor/selection-toolbar/index.ts`

- [ ] **Step 1: Add menu state and callback types**

Append to `packages/markora/src/editor/selection-toolbar/types.ts`:

```ts
export type SelectionToolbarPanel = "toolbar" | "link" | "color" | "highlight";

export type SelectionToolbarPaletteItem = {
  id: string;
  label: string;
  value: string | null;
};

export type SelectionToolbarLinkState = {
  title: string;
  url: string;
  canRemove: boolean;
  error?: string;
  copied?: boolean;
};

export type SelectionToolbarMenuState = {
  panel: SelectionToolbarPanel;
  buttons: SelectionToolbarButton[];
  textColors: SelectionToolbarPaletteItem[];
  highlightColors: SelectionToolbarPaletteItem[];
  link: SelectionToolbarLinkState;
};

export type SelectionToolbarMenuCallbacks = {
  onAction: (id: SelectionToolbarActionId) => void;
  onColor: (value: string | null) => void;
  onHighlight: (value: string | null) => void;
  onLinkInput: (field: "title" | "url", value: string) => void;
  onLinkSubmit: () => void;
  onLinkCopy: () => void;
  onLinkOpen: () => void;
  onLinkRemove: () => void;
  onCancelPanel: () => void;
};
```

- [ ] **Step 2: Implement menu renderer**

Create `packages/markora/src/editor/selection-toolbar/menu.ts`:

```ts
import { createMarkoraIcon } from "../icons";
import type {
  SelectionToolbarButton,
  SelectionToolbarMenuCallbacks,
  SelectionToolbarMenuState,
  SelectionToolbarPaletteItem,
} from "./types";

function iconButton(button: SelectionToolbarButton, callbacks: SelectionToolbarMenuCallbacks): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = button.active
    ? "cm-markora-selection-toolbar-button cm-markora-selection-toolbar-button-active"
    : "cm-markora-selection-toolbar-button";
  element.setAttribute("aria-label", button.label);
  element.setAttribute("aria-pressed", String(!!button.active));
  element.dataset.markoraSelectionAction = button.id;
  element.addEventListener("mousedown", (event) => {
    event.preventDefault();
    callbacks.onAction(button.id);
  });

  const icon = createMarkoraIcon(button.icon);
  if (icon) {
    element.appendChild(icon);
  } else {
    element.textContent = button.label;
  }
  return element;
}

function divider(): HTMLSpanElement {
  const element = document.createElement("span");
  element.className = "cm-markora-selection-toolbar-divider";
  element.setAttribute("aria-hidden", "true");
  return element;
}

function appendToolbarButtons(
  root: HTMLElement,
  buttons: SelectionToolbarButton[],
  callbacks: SelectionToolbarMenuCallbacks
): void {
  const groups: SelectionToolbarButton[][] = [buttons.slice(0, 7), buttons.slice(7, 8), buttons.slice(8)];

  groups.forEach((group, index) => {
    if (index > 0) root.appendChild(divider());
    for (const button of group) root.appendChild(iconButton(button, callbacks));
  });
}

function paletteButton(
  item: SelectionToolbarPaletteItem,
  className: string,
  callback: (value: string | null) => void
): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.setAttribute("aria-label", item.label);
  element.title = item.label;
  element.dataset.markoraSwatch = item.id;
  if (item.value) element.style.setProperty("--markora-swatch-color", item.value);
  element.addEventListener("mousedown", (event) => {
    event.preventDefault();
    callback(item.value);
  });
  return element;
}

function appendPalette(
  root: HTMLElement,
  title: string,
  items: SelectionToolbarPaletteItem[],
  callback: (value: string | null) => void
): void {
  const group = document.createElement("div");
  group.className = "cm-markora-selection-toolbar-palette-group";

  const label = document.createElement("div");
  label.className = "cm-markora-selection-toolbar-palette-label";
  label.textContent = title;
  group.appendChild(label);

  const grid = document.createElement("div");
  grid.className = "cm-markora-selection-toolbar-swatch-grid";
  for (const item of items) {
    grid.appendChild(paletteButton(item, "cm-markora-selection-toolbar-swatch", callback));
  }
  group.appendChild(grid);
  root.appendChild(group);
}

function appendLinkPanel(
  root: HTMLElement,
  state: SelectionToolbarMenuState,
  callbacks: SelectionToolbarMenuCallbacks
): void {
  const title = document.createElement("input");
  title.className = "cm-markora-selection-toolbar-link-input";
  title.setAttribute("aria-label", "Link title");
  title.value = state.link.title;
  title.addEventListener("input", () => callbacks.onLinkInput("title", title.value));
  title.addEventListener("keydown", (event) => {
    if (event.key === "Enter") callbacks.onLinkSubmit();
    if (event.key === "Escape") callbacks.onCancelPanel();
  });

  const url = document.createElement("input");
  url.className = "cm-markora-selection-toolbar-link-input";
  url.setAttribute("aria-label", "Link URL");
  url.value = state.link.url;
  url.addEventListener("input", () => callbacks.onLinkInput("url", url.value));
  url.addEventListener("keydown", (event) => {
    if (event.key === "Enter") callbacks.onLinkSubmit();
    if (event.key === "Escape") callbacks.onCancelPanel();
  });

  const actions = document.createElement("div");
  actions.className = "cm-markora-selection-toolbar-link-actions";

  const follow = document.createElement("button");
  follow.type = "button";
  follow.className = "cm-markora-selection-toolbar-follow";
  follow.textContent = "Follow Link  ⌘ + click";
  follow.addEventListener("mousedown", (event) => {
    event.preventDefault();
    callbacks.onLinkOpen();
  });
  actions.appendChild(follow);

  for (const [label, icon, action] of [
    ["Copy link", "copy", callbacks.onLinkCopy],
    ["Open link", "external-link", callbacks.onLinkOpen],
    ["Remove link", "trash-2", callbacks.onLinkRemove],
  ] as const) {
    if (label === "Remove link" && !state.link.canRemove) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      label === "Remove link"
        ? "cm-markora-selection-toolbar-link-button cm-markora-selection-toolbar-link-button-danger"
        : "cm-markora-selection-toolbar-link-button";
    button.setAttribute("aria-label", label);
    const svg = createMarkoraIcon(icon);
    if (svg) button.appendChild(svg);
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      action();
    });
    actions.appendChild(button);
  }

  root.append(title, url);
  if (state.link.error) {
    const error = document.createElement("div");
    error.className = "cm-markora-selection-toolbar-error";
    error.textContent = state.link.error;
    root.appendChild(error);
  }
  root.appendChild(actions);
  queueMicrotask(() => url.focus());
}

export function createSelectionToolbarElement(
  state: SelectionToolbarMenuState,
  callbacks: SelectionToolbarMenuCallbacks
): HTMLElement {
  const root = document.createElement("div");
  root.className =
    state.panel === "toolbar"
      ? "cm-markora-selection-toolbar"
      : "cm-markora-selection-toolbar cm-markora-selection-toolbar-panel";
  root.setAttribute("role", "toolbar");
  root.addEventListener("mousedown", (event) => event.preventDefault());

  if (state.panel === "toolbar") {
    appendToolbarButtons(root, state.buttons, callbacks);
  } else if (state.panel === "link") {
    appendLinkPanel(root, state, callbacks);
  } else if (state.panel === "color") {
    appendPalette(root, "文字颜色", state.textColors, callbacks.onColor);
  } else {
    appendPalette(root, "高亮颜色", state.highlightColors, callbacks.onHighlight);
  }

  return root;
}
```

- [ ] **Step 3: Add toolbar theme**

Create `packages/markora/src/editor/selection-toolbar/theme.ts`:

```ts
import { EditorView } from "@codemirror/view";

export const selectionToolbarTheme = EditorView.baseTheme({
  ".cm-markora-selection-toolbar": {
    position: "fixed",
    zIndex: "1001",
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
    border: "1px solid rgba(24, 24, 27, 0.14)",
    borderRadius: "10px",
    background: "var(--markora-selection-toolbar-bg, #ffffff)",
    boxShadow: "0 14px 38px rgba(15, 23, 42, 0.16)",
    padding: "4px",
    color: "var(--markora-selection-toolbar-fg, #18181b)",
    fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)",
    userSelect: "none",
  },
  ".cm-markora-selection-toolbar-panel": {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    width: "336px",
    gap: "6px",
    padding: "8px",
  },
  ".cm-markora-selection-toolbar-button, .cm-markora-selection-toolbar-link-button": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "30px",
    height: "30px",
    border: "0",
    borderRadius: "7px",
    background: "transparent",
    color: "inherit",
    cursor: "default",
    padding: "0",
  },
  ".cm-markora-selection-toolbar-button:hover, .cm-markora-selection-toolbar-button-active": {
    background: "var(--markora-selection-toolbar-active, #f4f4f5)",
  },
  ".cm-markora-selection-toolbar-button svg, .cm-markora-selection-toolbar-link-button svg": {
    width: "16px",
    height: "16px",
    strokeWidth: "2",
  },
  ".cm-markora-selection-toolbar-divider": {
    width: "1px",
    height: "22px",
    margin: "0 4px",
    background: "var(--markora-selection-toolbar-border, #e4e4e7)",
  },
  ".cm-markora-selection-toolbar-link-input": {
    boxSizing: "border-box",
    width: "100%",
    border: "0",
    borderRadius: "7px",
    background: "var(--markora-selection-toolbar-input, #f4f4f5)",
    color: "inherit",
    font: "inherit",
    fontSize: "14px",
    outline: "none",
    padding: "8px 10px",
  },
  ".cm-markora-selection-toolbar-link-actions": {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  ".cm-markora-selection-toolbar-follow": {
    marginRight: "auto",
    border: "0",
    background: "transparent",
    color: "var(--markora-selection-toolbar-link, #2563eb)",
    cursor: "default",
    fontSize: "14px",
    padding: "0 4px",
  },
  ".cm-markora-selection-toolbar-link-button-danger": {
    color: "var(--markora-selection-toolbar-danger, #dc2626)",
  },
  ".cm-markora-selection-toolbar-error": {
    color: "var(--markora-selection-toolbar-danger, #dc2626)",
    fontSize: "12px",
    padding: "0 2px",
  },
  ".cm-markora-selection-toolbar-palette-label": {
    color: "var(--markora-selection-toolbar-muted, #71717a)",
    fontSize: "12px",
    padding: "0 2px 4px",
  },
  ".cm-markora-selection-toolbar-swatch-grid": {
    display: "grid",
    gridTemplateColumns: "repeat(8, 24px)",
    gap: "6px",
  },
  ".cm-markora-selection-toolbar-swatch": {
    width: "24px",
    height: "24px",
    border: "1px solid var(--markora-selection-toolbar-border, #e4e4e7)",
    borderRadius: "6px",
    background: "var(--markora-swatch-color, transparent)",
    padding: "0",
  },
  "&dark .cm-markora-selection-toolbar": {
    "--markora-selection-toolbar-bg": "#18181b",
    "--markora-selection-toolbar-fg": "#f4f4f5",
    "--markora-selection-toolbar-active": "#27272a",
    "--markora-selection-toolbar-border": "#3f3f46",
    "--markora-selection-toolbar-input": "#27272a",
    "--markora-selection-toolbar-muted": "#a1a1aa",
    "--markora-selection-toolbar-link": "#60a5fa",
    "--markora-selection-toolbar-danger": "#f87171",
  },
});
```

- [ ] **Step 4: Export menu and theme**

Modify `packages/markora/src/editor/selection-toolbar/index.ts`:

```ts
export * from "./types";
export * from "./position";
export * from "./commands";
export * from "./menu";
export * from "./theme";
```

- [ ] **Step 5: Run typecheck for DOM and type errors**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

Run:

```bash
git add packages/markora/src/editor/selection-toolbar
git commit -m "feat(editor): 渲染选区工具条界面"
```

---

### Task 5: Wire Toolbar ViewPlugin Into Markora

**Files:**

- Create: `packages/markora/src/editor/selection-toolbar/extension.ts`
- Modify: `packages/markora/src/editor/selection-toolbar/index.ts`
- Modify: `packages/markora/src/editor/markora.ts`
- Modify: `playground/vue2-playground/src/shims-markora.d.ts`

- [ ] **Step 1: Add extension exports**

Modify `packages/markora/src/editor/selection-toolbar/index.ts`:

```ts
export * from "./types";
export * from "./position";
export * from "./commands";
export * from "./menu";
export * from "./theme";
export * from "./extension";
```

- [ ] **Step 2: Implement the ViewPlugin extension**

Create `packages/markora/src/editor/selection-toolbar/extension.ts`:

```ts
import { Extension, Prec } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { buildInlineFormatChange, buildLinkChange, buildListChange, parseSelectedLink } from "./commands";
import { createSelectionToolbarElement } from "./menu";
import { computeSelectionToolbarLayout } from "./position";
import { selectionToolbarTheme } from "./theme";
import type {
  MarkoraSelectionToolbarConfig,
  SelectionToolbarActionId,
  SelectionToolbarButton,
  SelectionToolbarLinkState,
  SelectionToolbarMenuState,
  SelectionToolbarPaletteItem,
  SelectionToolbarPanel,
} from "./types";

const toolbarWidth = 392;
const toolbarHeight = 40;
const panelWidth = 336;
const panelHeight = 178;

const textColors: SelectionToolbarPaletteItem[] = [
  { id: "default", label: "默认文字颜色", value: null },
  { id: "gray", label: "灰色", value: "#71717a" },
  { id: "red", label: "红色", value: "#dc2626" },
  { id: "orange", label: "橙色", value: "#ea580c" },
  { id: "yellow", label: "黄色", value: "#ca8a04" },
  { id: "green", label: "绿色", value: "#16a34a" },
  { id: "blue", label: "蓝色", value: "#2563eb" },
  { id: "purple", label: "紫色", value: "#7c3aed" },
];

const highlightColors: SelectionToolbarPaletteItem[] = [
  { id: "default", label: "默认高亮", value: null },
  { id: "yellow", label: "黄色高亮", value: "#fef08a" },
  { id: "green", label: "绿色高亮", value: "#bbf7d0" },
  { id: "blue", label: "蓝色高亮", value: "#bfdbfe" },
  { id: "pink", label: "粉色高亮", value: "#fbcfe8" },
  { id: "purple", label: "紫色高亮", value: "#ddd6fe" },
];

function defaultButtons(): SelectionToolbarButton[] {
  return [
    { id: "bold", label: "加粗", icon: "bold" },
    { id: "italic", label: "斜体", icon: "italic" },
    { id: "strike", label: "删除线", icon: "strikethrough" },
    { id: "underline", label: "下划线", icon: "underline" },
    { id: "code", label: "行内代码", icon: "code" },
    { id: "highlight", label: "高亮", icon: "highlighter" },
    { id: "color", label: "文字颜色", icon: "baseline" },
    { id: "link", label: "链接", icon: "link" },
    { id: "ordered-list", label: "有序列表", icon: "list-ordered" },
    { id: "unordered-list", label: "无序列表", icon: "list" },
    { id: "task-list", label: "任务列表", icon: "list-todo" },
  ];
}

function isValidUrl(value: string): boolean {
  return /^(https?:\/\/|www\.)[^\s]+$/i.test(value);
}

class SelectionToolbarViewPlugin {
  private menu: HTMLElement | null = null;
  private panel: SelectionToolbarPanel = "toolbar";
  private savedRange: { from: number; to: number; text: string } | null = null;
  private link: SelectionToolbarLinkState = { title: "", url: "", canRemove: false };
  private renderVersion = 0;

  constructor(private readonly view: EditorView) {
    this.view.dom.ownerDocument.addEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.updateState();
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged) {
      this.updateState();
    }
  }

  destroy(): void {
    this.view.dom.ownerDocument.removeEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.removeMenu();
  }

  private readonly handleDocumentMouseDown = (event: MouseEvent): void => {
    if (!this.menu) return;
    const target = event.target;
    if (target instanceof Node && (this.menu.contains(target) || this.view.dom.contains(target))) return;
    this.close();
  };

  private updateState(): void {
    const selection = this.view.state.selection.main;
    if (selection.empty || !this.view.hasFocus || this.view.dom.classList.contains("cm-markora-slash-open")) {
      this.close();
      return;
    }

    this.savedRange = {
      from: selection.from,
      to: selection.to,
      text: this.view.state.sliceDoc(selection.from, selection.to),
    };
    this.renderMenu();
  }

  private close(): void {
    this.panel = "toolbar";
    this.savedRange = null;
    this.removeMenu();
  }

  private removeMenu(): void {
    this.renderVersion += 1;
    this.menu?.remove();
    this.menu = null;
  }

  private menuState(): SelectionToolbarMenuState {
    return {
      panel: this.panel,
      buttons: defaultButtons(),
      textColors,
      highlightColors,
      link: this.link,
    };
  }

  private renderMenu(): void {
    const range = this.savedRange;
    if (!range) return;
    const renderVersion = ++this.renderVersion;
    const floating =
      this.panel === "toolbar"
        ? { width: toolbarWidth, height: toolbarHeight }
        : { width: panelWidth, height: panelHeight };
    this.removeMenu();

    this.view.requestMeasure({
      read: (view) => {
        const from = view.coordsAtPos(range.from);
        const to = view.coordsAtPos(range.to);
        if (!from || !to) return null;
        return {
          left: Math.min(from.left, to.left),
          right: Math.max(from.right, to.right),
          top: Math.min(from.top, to.top),
          bottom: Math.max(from.bottom, to.bottom),
        };
      },
      write: (anchor) => {
        if (renderVersion !== this.renderVersion || !anchor) return;
        const win = this.view.dom.ownerDocument.defaultView ?? window;
        const layout = computeSelectionToolbarLayout({
          anchor,
          viewport: { width: win.innerWidth, height: win.innerHeight },
          floating,
        });
        this.menu = createSelectionToolbarElement(this.menuState(), {
          onAction: (id) => this.handleAction(id),
          onColor: (value) => this.applyColor(value),
          onHighlight: (value) => this.applyHighlight(value),
          onLinkInput: (field, value) => {
            this.link = { ...this.link, [field]: value, error: undefined };
          },
          onLinkSubmit: () => this.submitLink(),
          onLinkCopy: () => void this.copyLink(),
          onLinkOpen: () => this.openLink(),
          onLinkRemove: () => this.removeLink(),
          onCancelPanel: () => {
            this.panel = "toolbar";
            this.renderMenu();
          },
        });
        this.menu.style.left = `${layout.left}px`;
        this.menu.style.top = `${layout.top}px`;
        this.menu.style.maxHeight = `${layout.maxHeight}px`;
        this.menu.dataset.markoraSelectionPlacement = layout.placement;
        this.view.dom.appendChild(this.menu);
      },
    });
  }

  private dispatchResult(result: { changes: unknown; selection?: unknown }): void {
    this.view.dispatch({
      changes: result.changes as never,
      selection: result.selection as never,
      scrollIntoView: true,
    });
    this.view.focus();
    this.close();
  }

  private handleAction(id: SelectionToolbarActionId): void {
    const range = this.savedRange;
    if (!range) return;
    if (id === "link") {
      const parsed = parseSelectedLink(range.text);
      this.link = { title: parsed.title || range.text, url: parsed.url, canRemove: parsed.kind === "markdown-link" };
      this.panel = "link";
      this.renderMenu();
      return;
    }
    if (id === "color") {
      this.panel = "color";
      this.renderMenu();
      return;
    }
    if (id === "highlight") {
      this.panel = "highlight";
      this.renderMenu();
      return;
    }
    if (id === "ordered-list" || id === "unordered-list" || id === "task-list") {
      const kind = id === "ordered-list" ? "ordered" : id === "task-list" ? "task" : "unordered";
      this.dispatchResult(
        buildListChange({ doc: this.view.state.doc.toString(), from: range.from, to: range.to, kind })
      );
      return;
    }
    const marker =
      id === "bold" ? "**" : id === "italic" ? "*" : id === "strike" ? "~~" : id === "code" ? "`" : undefined;
    const result =
      id === "underline"
        ? buildInlineFormatChange({ doc: this.view.state.doc.toString(), from: range.from, to: range.to, htmlTag: "u" })
        : buildInlineFormatChange({ doc: this.view.state.doc.toString(), from: range.from, to: range.to, marker });
    this.dispatchResult(result);
  }

  private applyColor(value: string | null): void {
    const range = this.savedRange;
    if (!range || !value) return;
    this.dispatchResult(
      buildInlineFormatChange({
        doc: this.view.state.doc.toString(),
        from: range.from,
        to: range.to,
        spanStyle: { property: "color", value },
      })
    );
  }

  private applyHighlight(value: string | null): void {
    const range = this.savedRange;
    if (!range) return;
    const result = value
      ? buildInlineFormatChange({
          doc: this.view.state.doc.toString(),
          from: range.from,
          to: range.to,
          spanStyle: { property: "background-color", value },
        })
      : buildInlineFormatChange({ doc: this.view.state.doc.toString(), from: range.from, to: range.to, marker: "==" });
    this.dispatchResult(result);
  }

  private submitLink(): void {
    const range = this.savedRange;
    if (!range) return;
    if (!this.link.url || !isValidUrl(this.link.url)) {
      this.link = { ...this.link, error: "请输入有效链接" };
      this.renderMenu();
      return;
    }
    const title = this.link.title || range.text || this.link.url;
    this.dispatchResult(buildLinkChange({ from: range.from, to: range.to, title, url: this.link.url }));
  }

  private removeLink(): void {
    const range = this.savedRange;
    if (!range) return;
    this.dispatchResult(
      buildLinkChange({ from: range.from, to: range.to, title: this.link.title || range.text, url: "", remove: true })
    );
  }

  private async copyLink(): Promise<void> {
    if (!this.link.url) return;
    await this.view.dom.ownerDocument.defaultView?.navigator.clipboard?.writeText(this.link.url);
    this.link = { ...this.link, copied: true };
    this.renderMenu();
  }

  private openLink(): void {
    if (!this.link.url || !isValidUrl(this.link.url)) return;
    const url = this.link.url.startsWith("http") ? this.link.url : `https://${this.link.url}`;
    this.view.dom.ownerDocument.defaultView?.open(url, "_blank", "noopener,noreferrer");
  }
}

export function selectionToolbar(config: MarkoraSelectionToolbarConfig = {}): Extension[] {
  if (config.enabled === false) return [];
  const plugin = ViewPlugin.define((view) => new SelectionToolbarViewPlugin(view));
  return [
    selectionToolbarTheme,
    plugin,
    Prec.highest(
      EditorView.domEventHandlers({
        keydown(event, view) {
          const value = view.plugin(plugin);
          if (!value || event.key !== "Escape") return false;
          event.preventDefault();
          return true;
        },
      })
    ),
  ];
}
```

- [ ] **Step 3: Register the toolbar in `markora()`**

Modify `packages/markora/src/editor/markora.ts` imports:

```ts
import type { MarkoraSelectionToolbarConfig } from "./selection-toolbar";
import { selectionToolbar } from "./selection-toolbar";
```

Add to `MarkoraConfig`:

```ts
  /** Selected text floating toolbar configuration */
  selectionToolbar?: MarkoraSelectionToolbarConfig;
```

Add to config destructuring:

```ts
    selectionToolbar: configSelectionToolbar = { enabled: true },
```

Add to composed extensions after `attachments(configAttachments)`:

```ts
    selectionToolbar(configSelectionToolbar),
```

- [ ] **Step 4: Update Vue2 shim**

Modify the local `MarkoraConfig` declaration in `playground/vue2-playground/src/shims-markora.d.ts` to include:

```ts
    selectionToolbar?: {
      enabled?: boolean;
    };
```

- [ ] **Step 5: Run typecheck and focused tests**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora typecheck
pnpm --config.package-manager-strict=false --dir packages/markora test tests/selection-toolbar-commands.spec.ts tests/selection-toolbar-position.spec.ts
```

Expected: both commands PASS.

- [ ] **Step 6: Commit Task 5**

Run:

```bash
git add packages/markora/src/editor/selection-toolbar packages/markora/src/editor/markora.ts playground/vue2-playground/src/shims-markora.d.ts
git commit -m "feat(editor): 接入选中文本工具条扩展"
```

---

### Task 6: Harden UX Details and State Guards

**Files:**

- Modify: `packages/markora/src/editor/selection-toolbar/commands.ts`
- Modify: `packages/markora/src/editor/selection-toolbar/extension.ts`
- Modify: `packages/markora/src/editor/selection-toolbar/theme.ts`
- Test: `packages/markora/tests/selection-toolbar-commands.spec.ts`

- [ ] **Step 1: Add failing tests for range and clear behavior**

Append these tests to `packages/markora/tests/selection-toolbar-commands.spec.ts`:

```ts
it("does not build a link change when the url is empty", () => {
  expect(() => buildLinkChange({ from: 0, to: 4, title: "text", url: "" })).toThrow("Link URL is required");
});

it("clears color span wrappers", () => {
  expect(
    buildInlineFormatChange({
      doc: '<span style="color: #2563eb">blue</span>',
      from: 0,
      to: 41,
      spanStyle: { property: "color", value: "#2563eb" },
      clear: true,
    })
  ).toEqual({
    changes: { from: 0, to: 41, insert: "blue" },
    selection: { anchor: 0, head: 4 },
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/selection-toolbar-commands.spec.ts
```

Expected: FAIL because `clear` is not typed and empty URLs are not rejected.

- [ ] **Step 3: Add `clear` support to inline command types**

Modify `InlineFormatInput` in `packages/markora/src/editor/selection-toolbar/types.ts`:

```ts
export type InlineFormatInput = {
  doc: string;
  from: number;
  to: number;
  marker?: string;
  htmlTag?: "u";
  spanStyle?: {
    property: "color" | "background-color";
    value: string;
  };
  clear?: boolean;
};
```

- [ ] **Step 4: Harden command implementations**

Modify `packages/markora/src/editor/selection-toolbar/commands.ts`:

```ts
export function buildInlineFormatChange(input: InlineFormatInput): TextCommandResult {
  const text = selectedText(input);
  const { open, close } = buildHtmlWrapper(input, text);

  if (input.clear) {
    const tagPattern = input.spanStyle
      ? new RegExp(
          `^<span style="${escapeRegExp(input.spanStyle.property)}: ${escapeRegExp(input.spanStyle.value)}">([\\s\\S]*)<\\/span>$`
        )
      : input.htmlTag
        ? new RegExp(`^<${input.htmlTag}>([\\s\\S]*)<\\/${input.htmlTag}>$`)
        : null;
    const match = tagPattern ? text.match(tagPattern) : null;
    const insert = match?.[1] ?? text;
    return {
      changes: { from: input.from, to: input.to, insert },
      selection: { anchor: input.from, head: input.from + insert.length },
    };
  }

  const beforeFrom = Math.max(0, input.from - open.length);
  const afterTo = Math.min(input.doc.length, input.to + close.length);
  const before = input.doc.slice(beforeFrom, input.from);
  const after = input.doc.slice(input.to, afterTo);

  if (before === open && after === close) {
    return {
      changes: [
        { from: beforeFrom, to: input.from, insert: "" },
        { from: input.to, to: afterTo, insert: "" },
      ],
      selection: { anchor: beforeFrom, head: beforeFrom + text.length },
    };
  }

  const insert = `${open}${text}${close}`;
  return {
    changes: { from: input.from, to: input.to, insert },
    selection: { anchor: input.from + open.length, head: input.from + open.length + text.length },
  };
}

export function buildLinkChange(input: LinkChangeInput): TextCommandResult {
  if (input.remove) {
    return {
      changes: { from: input.from, to: input.to, insert: input.title },
      selection: { anchor: input.from, head: input.from + input.title.length },
    };
  }
  if (!input.url.trim()) {
    throw new Error("Link URL is required");
  }

  const insert = `[${input.title}](${input.url})`;
  return {
    changes: { from: input.from, to: input.to, insert },
    selection: { anchor: input.from, head: input.from + insert.length },
  };
}
```

- [ ] **Step 5: Guard saved range before applying changes**

In `packages/markora/src/editor/selection-toolbar/extension.ts`, add:

```ts
  private isSavedRangeCurrent(): boolean {
    if (!this.savedRange) return false;
    return this.view.state.sliceDoc(this.savedRange.from, this.savedRange.to) === this.savedRange.text;
  }
```

At the top of `dispatchResult`, add:

```ts
if (!this.isSavedRangeCurrent()) {
  this.close();
  return;
}
```

- [ ] **Step 6: Make Escape close panel or toolbar**

In `selectionToolbar()` keydown handler, replace the Escape block with:

```ts
        keydown(event, view) {
          const value = view.plugin(plugin);
          if (!value || event.key !== "Escape") return false;
          value.closeFromKeyboard();
          event.preventDefault();
          return true;
        },
```

Add this public method to `SelectionToolbarViewPlugin`:

```ts
  closeFromKeyboard(): void {
    if (this.panel !== "toolbar") {
      this.panel = "toolbar";
      this.renderMenu();
      return;
    }
    this.close();
  }
```

- [ ] **Step 7: Run tests and typecheck**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/selection-toolbar-commands.spec.ts
pnpm --config.package-manager-strict=false --dir packages/markora typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit Task 6**

Run:

```bash
git add packages/markora/src/editor/selection-toolbar packages/markora/tests/selection-toolbar-commands.spec.ts
git commit -m "fix(editor): 加固选区工具条状态边界"
```

---

### Task 7: Build and Verify Vue2 Playground Runtime

**Files:**

- Modify only if type errors require it: `playground/vue2-playground/src/shims-markora.d.ts`
- Runtime build output: `packages/markora/dist` generated by build and typically ignored by git.

- [ ] **Step 1: Run full package checks**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test
pnpm --config.package-manager-strict=false --dir packages/markora typecheck
pnpm --config.package-manager-strict=false --dir packages/markora lint
pnpm --config.package-manager-strict=false --dir packages/markora build
```

Expected:

- `test`: PASS.
- `typecheck`: PASS.
- `lint`: PASS or only pre-existing warnings already present in the repo.
- `build`: PASS.

- [ ] **Step 2: Build Vue2 playground**

Run:

```bash
pnpm --config.package-manager-strict=false --filter vue2-playground build
```

Expected: PASS. Existing Vue CLI asset size warnings are acceptable.

- [ ] **Step 3: Start or reuse Vue2 dev server**

If `http://localhost:3001/` is already serving the Vue2 playground, keep it. Otherwise run:

```bash
pnpm --config.package-manager-strict=false --filter vue2-playground dev -- --port 3001
```

Expected: the dev server serves the playground at `http://localhost:3001/`.

- [ ] **Step 4: Verify selected text toolbar manually in Browser**

In the in-app browser at `http://localhost:3001/`:

1. Select normal text in Live mode.
2. Verify the toolbar appears near the selection.
3. Click bold, italic, strike, underline, inline code, default highlight, text color, ordered list, unordered list, task list.
4. Verify the document source changes according to the spec.
5. Open the link panel, set title and URL, submit, copy URL, open URL, delete link.
6. Open slash menu with `/` and verify the selection toolbar is not visible at the same time.
7. Select text near top, bottom, left, and right edges and verify the toolbar/panels remain visible.
8. Switch to dark theme and verify contrast and layout.

Expected: all listed interactions work without console errors.

- [ ] **Step 5: Check browser console logs**

Use Browser developer logs or equivalent check.

Expected: no new `error` logs from Markora selection toolbar interactions.

- [ ] **Step 6: Commit verification-only shim changes if any**

If Step 2 or Step 4 required shim-only adjustments, commit them:

```bash
git add playground/vue2-playground/src/shims-markora.d.ts
git commit -m "fix(playground): 同步选区工具条类型声明"
```

If no files changed, skip this commit.

---

### Task 8: Final Review and Delivery

**Files:**

- Review all files changed since the plan started.

- [ ] **Step 1: Inspect git status**

Run:

```bash
git status --short
```

Expected: only intended source/test files are modified or the tree is clean. `.superpowers/` visual companion files remain untracked and are not staged.

- [ ] **Step 2: Inspect final diff**

Run:

```bash
git diff --stat
git diff --check
```

Expected:

- `git diff --check`: no output and exit 0.
- Diff only covers selection toolbar implementation, tests, icons, config, and Vue2 shim if needed.

- [ ] **Step 3: Run final verification**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test
pnpm --config.package-manager-strict=false --dir packages/markora typecheck
pnpm --config.package-manager-strict=false --dir packages/markora build
pnpm --config.package-manager-strict=false --dir packages/markora lint
pnpm --config.package-manager-strict=false --filter vue2-playground build
git diff --check
```

Expected:

- All commands pass.
- If lint emits the known existing warnings in `plugin.ts` or `syntax-theme.ts`, record them as pre-existing warnings and do not broaden scope.

- [ ] **Step 4: Produce delivery summary**

Final response must include:

- Modified files/modules.
- Commands run and pass/fail summary.
- Browser verification summary.
- Remaining risks.
- Rollback method:

```text
Rollback by reverting the selection-toolbar commits. This removes the toolbar module, MarkoraConfig.selectionToolbar registration, icon additions, tests, and Vue2 shim changes while leaving slash menu and existing plugins intact.
```
