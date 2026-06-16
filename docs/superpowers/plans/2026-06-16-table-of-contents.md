# Markora Table of Contents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Markora's default built-in table-of-contents panel for Live and View modes, while allowing consumers to disable the default UI and use `onTocChange` data for custom rendering.

**Architecture:** Add a focused `packages/markora/src/editor/table-of-contents` module for shared types, slugging, storage, Live extraction, panel DOM, theme, and the CodeMirror extension. Add preview-side TOC helpers and heading-id support so View mode uses the same heading id rules. Wire the feature into `markora()` by default and into the Vue2 playground feature switches.

**Tech Stack:** TypeScript, CodeMirror 6 ViewPlugin, Lezer Markdown syntax tree, Markora preview renderer, Vue 2.6 playground, Bun tests, tsup.

---

## File Structure

- Create `packages/markora/src/editor/table-of-contents/types.ts`
  Public `MarkoraTocConfig`, `MarkoraTocItem`, resolved config, and internal panel state types.
- Create `packages/markora/src/editor/table-of-contents/slug.ts`
  Shared heading id generation for Live and View modes.
- Create `packages/markora/src/editor/table-of-contents/storage.ts`
  Optional localStorage persistence for panel `expanded` and `width`.
- Create `packages/markora/src/editor/table-of-contents/extract.ts`
  Extract `h2-h6` headings from CodeMirror/Lezer state.
- Create `packages/markora/src/editor/table-of-contents/panel.ts`
  Build the built-in DOM panel and wire click, toggle, and resize callbacks.
- Create `packages/markora/src/editor/table-of-contents/theme.ts`
  Built-in panel CSS.
- Create `packages/markora/src/editor/table-of-contents/extension.ts`
  Live-mode ViewPlugin for TOC data, active item, panel render, click jump, and resize state.
- Create `packages/markora/src/editor/table-of-contents/index.ts`
  Public exports for editor consumers.
- Modify `packages/markora/src/editor/markora.ts`
  Add `toc` config, default it on, and include the TOC extension.
- Modify `packages/markora/src/editor/index.ts`
  Export the TOC module.
- Create `packages/markora/src/preview/toc.ts`
  Generate preview TOC items from Markdown and attach heading ids to rendered preview DOM.
- Modify `packages/markora/src/preview/types.ts`
  Add optional TOC context fields.
- Modify `packages/markora/src/preview/context.ts`
  Pass heading id lookup through `PreviewContext`.
- Modify `packages/markora/src/preview/renderer.ts`
  Compute heading ids before rendering and expose them through preview context.
- Modify `packages/markora/src/plugins/heading-plugin.ts`
  Add `id` attributes for `h2-h6` when preview context provides one.
- Modify `packages/markora/src/preview/index.ts`
  Export preview TOC helpers.
- Create `packages/markora/tests/toc-slug-storage.spec.ts`
  Cover slugging, duplicate ids, config defaults, and storage.
- Create `packages/markora/tests/toc-extract.spec.ts`
  Cover Live extraction from Markdown syntax tree.
- Create `packages/markora/tests/toc-preview.spec.ts`
  Cover preview TOC extraction and heading ids.
- Create `packages/markora/tests/toc-panel.spec.ts`
  Cover panel DOM states and interaction callbacks.
- Modify `packages/markora/src/editor/icons/index.ts`
  Add `table-of-contents` and a collapse/expand icon if missing.
- Modify `playground/vue2-playground/src/types.ts`
  Add `features.tableOfContents`.
- Modify `playground/vue2-playground/src/state/playgroundConfig.ts`
  Default TOC feature on.
- Modify `playground/vue2-playground/src/components/playground/Devbar.vue`
  Add the Feature Options switch.
- Modify `playground/vue2-playground/src/components/playground/EditorPane.vue`
  Pass `toc` config to Live mode and render built-in View-mode TOC around preview.
- Modify `playground/vue2-playground/src/styles.css`
  Reserve the right-side in-editor space and keep the playground frame stable.

---

## Task 1: Shared TOC Types, Config, Slugging, And Storage

**Files:**
- Create: `packages/markora/src/editor/table-of-contents/types.ts`
- Create: `packages/markora/src/editor/table-of-contents/slug.ts`
- Create: `packages/markora/src/editor/table-of-contents/storage.ts`
- Create: `packages/markora/src/editor/table-of-contents/index.ts`
- Create: `packages/markora/tests/toc-slug-storage.spec.ts`

- [ ] **Step 1: Write failing tests for slugging, config defaults, and storage**

Create `packages/markora/tests/toc-slug-storage.spec.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  clampTocWidth,
  createTocSlugger,
  readTocPanelState,
  resolveTocConfig,
  writeTocPanelState,
} from "../src/editor/table-of-contents";

describe("table of contents slugging", () => {
  it("creates readable ids and suffixes duplicate headings", () => {
    const slugger = createTocSlugger();

    expect(slugger("Getting Started")).toBe("getting-started");
    expect(slugger("Getting Started")).toBe("getting-started-2");
    expect(slugger("标题 与 API")).toBe("标题-与-api");
    expect(slugger("!!!")).toBe("heading");
    expect(slugger("!!!")).toBe("heading-2");
  });
});

describe("resolveTocConfig", () => {
  it("defaults to enabled h2-h6 panel settings", () => {
    expect(resolveTocConfig()).toMatchObject({
      enabled: true,
      minLevel: 2,
      maxLevel: 6,
      defaultExpanded: true,
      defaultWidth: 240,
      minWidth: 180,
      maxWidth: 360,
    });
  });

  it("clamps invalid width boundaries into a usable range", () => {
    const config = resolveTocConfig({ defaultWidth: 999, minWidth: 220, maxWidth: 300 });

    expect(config.defaultWidth).toBe(300);
    expect(clampTocWidth(100, config)).toBe(220);
    expect(clampTocWidth(999, config)).toBe(300);
  });
});

describe("toc panel storage", () => {
  it("does not read or write without a storage key", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };

    writeTocPanelState(undefined, { expanded: false, width: 300 }, adapter);

    expect(storage.size).toBe(0);
    expect(readTocPanelState(undefined, adapter)).toBeNull();
  });

  it("round-trips expanded and width when a storage key is configured", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };

    writeTocPanelState("markora:toc", { expanded: false, width: 320 }, adapter);

    expect(readTocPanelState("markora:toc", adapter)).toEqual({ expanded: false, width: 320 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/toc-slug-storage.spec.ts
```

Expected: FAIL because `../src/editor/table-of-contents` does not exist.

- [ ] **Step 3: Implement shared types**

Create `packages/markora/src/editor/table-of-contents/types.ts`:

```ts
export type MarkoraTocLevel = 2 | 3 | 4 | 5 | 6;

export interface MarkoraTocItem {
  id: string;
  level: MarkoraTocLevel;
  text: string;
  from?: number;
  to?: number;
  active: boolean;
}

export interface MarkoraTocConfig {
  enabled?: boolean;
  onTocChange?: (items: MarkoraTocItem[]) => void;
  minLevel?: MarkoraTocLevel;
  maxLevel?: MarkoraTocLevel;
  defaultExpanded?: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
}

export interface ResolvedMarkoraTocConfig {
  enabled: boolean;
  onTocChange?: (items: MarkoraTocItem[]) => void;
  minLevel: MarkoraTocLevel;
  maxLevel: MarkoraTocLevel;
  defaultExpanded: boolean;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  storageKey?: string;
}

export interface TocPanelState {
  expanded: boolean;
  width: number;
}

export interface TocStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}
```

- [ ] **Step 4: Implement config and slug utilities**

Create `packages/markora/src/editor/table-of-contents/slug.ts`:

```ts
import type { MarkoraTocConfig, ResolvedMarkoraTocConfig } from "./types";

const defaultMinWidth = 180;
const defaultMaxWidth = 360;
const defaultWidth = 240;

export function clampTocWidth(width: number, config: Pick<ResolvedMarkoraTocConfig, "minWidth" | "maxWidth">): number {
  return Math.min(Math.max(width, config.minWidth), config.maxWidth);
}

export function resolveTocConfig(config: MarkoraTocConfig = {}): ResolvedMarkoraTocConfig {
  const minWidth = Math.max(120, config.minWidth ?? defaultMinWidth);
  const maxWidth = Math.max(minWidth, config.maxWidth ?? defaultMaxWidth);
  const minLevel = config.minLevel ?? 2;
  const maxLevel = config.maxLevel ?? 6;
  const resolved: ResolvedMarkoraTocConfig = {
    enabled: config.enabled !== false,
    onTocChange: config.onTocChange,
    minLevel: minLevel <= maxLevel ? minLevel : maxLevel,
    maxLevel: maxLevel >= minLevel ? maxLevel : minLevel,
    defaultExpanded: config.defaultExpanded !== false,
    defaultWidth: defaultWidth,
    minWidth,
    maxWidth,
    storageKey: config.storageKey,
  };
  resolved.defaultWidth = clampTocWidth(config.defaultWidth ?? defaultWidth, resolved);
  return resolved;
}

function normalizeHeadingText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function createTocSlugger(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = normalizeHeadingText(text) || "heading";
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
}
```

- [ ] **Step 5: Implement storage helpers**

Create `packages/markora/src/editor/table-of-contents/storage.ts`:

```ts
import type { TocPanelState, TocStorageAdapter } from "./types";

function defaultStorage(): TocStorageAdapter | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function readTocPanelState(storageKey?: string, storage: TocStorageAdapter | null = defaultStorage()): TocPanelState | null {
  if (!storageKey || !storage) return null;
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TocPanelState>;
    if (typeof parsed.expanded !== "boolean" || typeof parsed.width !== "number") return null;
    return { expanded: parsed.expanded, width: parsed.width };
  } catch {
    return null;
  }
}

export function writeTocPanelState(
  storageKey: string | undefined,
  state: TocPanelState,
  storage: TocStorageAdapter | null = defaultStorage()
): void {
  if (!storageKey || !storage) return;
  try {
    storage.setItem(storageKey, JSON.stringify({ expanded: state.expanded, width: state.width }));
  } catch {
    // Storage can fail in private mode or restricted host environments.
  }
}
```

- [ ] **Step 6: Add module exports**

Create `packages/markora/src/editor/table-of-contents/index.ts`:

```ts
export * from "./types";
export * from "./slug";
export * from "./storage";
```

- [ ] **Step 7: Run tests to verify Task 1 passes**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/toc-slug-storage.spec.ts
```

Expected: PASS for `toc-slug-storage.spec.ts`.

- [ ] **Step 8: Commit Task 1**

```bash
git add packages/markora/src/editor/table-of-contents packages/markora/tests/toc-slug-storage.spec.ts
git commit -m "feat(editor): 添加目录配置与基础工具"
```

---

## Task 2: Live Mode Heading Extraction

**Files:**
- Create: `packages/markora/src/editor/table-of-contents/extract.ts`
- Modify: `packages/markora/src/editor/table-of-contents/index.ts`
- Create: `packages/markora/tests/toc-extract.spec.ts`

- [ ] **Step 1: Write failing extraction tests**

Create `packages/markora/tests/toc-extract.spec.ts`:

```ts
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "bun:test";
import { extractTocItemsFromState } from "../src/editor/table-of-contents";

function stateFromDoc(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
}

describe("extractTocItemsFromState", () => {
  it("extracts only h2-h6 by default", () => {
    const state = stateFromDoc(["# Title", "## Intro", "### Details", "###### Deep", "####### Not a heading"].join("\n\n"));

    expect(extractTocItemsFromState(state)).toEqual([
      expect.objectContaining({ id: "intro", level: 2, text: "Intro", active: false }),
      expect.objectContaining({ id: "details", level: 3, text: "Details", active: false }),
      expect.objectContaining({ id: "deep", level: 6, text: "Deep", active: false }),
    ]);
  });

  it("respects configured heading levels", () => {
    const state = stateFromDoc(["## Intro", "### Details", "#### Deep"].join("\n\n"));

    expect(extractTocItemsFromState(state, { minLevel: 3, maxLevel: 4 }).map((item) => item.text)).toEqual(["Details", "Deep"]);
  });

  it("strips markdown markers and skips empty headings", () => {
    const state = stateFromDoc(["## **Bold** Heading", "##", "## `Code` Heading", "## **Bold** Heading"].join("\n\n"));

    expect(extractTocItemsFromState(state).map((item) => ({ id: item.id, text: item.text }))).toEqual([
      { id: "bold-heading", text: "Bold Heading" },
      { id: "code-heading", text: "Code Heading" },
      { id: "bold-heading-2", text: "Bold Heading" },
    ]);
  });

  it("returns source positions for clicking and active calculations", () => {
    const state = stateFromDoc("paragraph\n\n## Intro\n\nbody");
    const [item] = extractTocItemsFromState(state);

    expect(item.from).toBeGreaterThan(0);
    expect(item.to).toBeGreaterThan(item.from!);
    expect(state.sliceDoc(item.from!, item.to!)).toContain("Intro");
    expect(syntaxTree(state).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/toc-extract.spec.ts
```

Expected: FAIL because `extractTocItemsFromState` is not exported.

- [ ] **Step 3: Implement Live extraction**

Create `packages/markora/src/editor/table-of-contents/extract.ts`:

```ts
import type { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNodeRef } from "@lezer/common";
import type { MarkoraTocConfig, MarkoraTocItem, MarkoraTocLevel } from "./types";
import { createTocSlugger, resolveTocConfig } from "./slug";

const headingPattern = /^ATXHeading([1-6])$/;

function headingLevel(node: SyntaxNodeRef): MarkoraTocLevel | null {
  const match = headingPattern.exec(node.name);
  if (!match) return null;
  const level = Number(match[1]);
  return level >= 2 && level <= 6 ? (level as MarkoraTocLevel) : null;
}

function stripMarkdownInline(text: string): string {
  return text
    .replace(/^#{1,6}\s*/, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function extractTocItemsFromState(state: EditorState, config: MarkoraTocConfig = {}): MarkoraTocItem[] {
  const resolved = resolveTocConfig(config);
  const slug = createTocSlugger();
  const items: MarkoraTocItem[] = [];

  syntaxTree(state).iterate({
    enter: (node) => {
      const level = headingLevel(node);
      if (!level || level < resolved.minLevel || level > resolved.maxLevel) return;
      const text = stripMarkdownInline(state.sliceDoc(node.from, node.to));
      if (!text) return;
      items.push({
        id: slug(text),
        level,
        text,
        from: node.from,
        to: node.to,
        active: false,
      });
    },
  });

  return items;
}
```

- [ ] **Step 4: Export extraction**

Modify `packages/markora/src/editor/table-of-contents/index.ts`:

```ts
export * from "./types";
export * from "./slug";
export * from "./storage";
export * from "./extract";
```

- [ ] **Step 5: Run extraction tests**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/toc-extract.spec.ts
```

Expected: PASS for extraction tests.

- [ ] **Step 6: Commit Task 2**

```bash
git add packages/markora/src/editor/table-of-contents packages/markora/tests/toc-extract.spec.ts
git commit -m "feat(editor): 提取文档目录标题数据"
```

---

## Task 3: Built-In TOC Panel DOM And Theme

**Files:**
- Create: `packages/markora/src/editor/table-of-contents/panel.ts`
- Create: `packages/markora/src/editor/table-of-contents/theme.ts`
- Modify: `packages/markora/src/editor/table-of-contents/index.ts`
- Modify: `packages/markora/src/editor/icons/index.ts`
- Create: `packages/markora/tests/toc-panel.spec.ts`

- [ ] **Step 1: Write failing panel tests**

Create `packages/markora/tests/toc-panel.spec.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { createTocPanelElement } from "../src/editor/table-of-contents";

describe("createTocPanelElement", () => {
  it("renders full panel items with active and nested states", () => {
    const calls: string[] = [];
    const panel = createTocPanelElement(
      {
        expanded: true,
        width: 240,
        items: [
          { id: "intro", level: 2, text: "Intro", from: 0, to: 8, active: true },
          { id: "details", level: 3, text: "Details", from: 10, to: 22, active: false },
        ],
      },
      {
        onSelect: (item) => calls.push(item.id),
        onToggle: () => calls.push("toggle"),
        onResizeStart: () => calls.push("resize"),
      }
    );

    expect(panel.className).toContain("cm-markora-toc");
    expect(panel.getAttribute("data-markora-toc-expanded")).toBe("true");
    expect(panel.querySelectorAll(".cm-markora-toc-item").length).toBe(2);
    expect(panel.querySelector(".cm-markora-toc-item-active")?.textContent).toContain("Intro");
    expect(panel.querySelector('[data-markora-toc-level="3"]')?.textContent).toContain("Details");

    panel.querySelector<HTMLButtonElement>(".cm-markora-toc-item")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(calls).toEqual(["intro"]);
  });

  it("renders collapsed rail and empty state", () => {
    const panel = createTocPanelElement(
      { expanded: false, width: 240, items: [] },
      { onSelect: () => undefined, onToggle: () => undefined, onResizeStart: () => undefined }
    );

    expect(panel.getAttribute("data-markora-toc-expanded")).toBe("false");
    expect(panel.textContent).toContain("目录");
  });
});
```

- [ ] **Step 2: Run panel tests to verify they fail**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/toc-panel.spec.ts
```

Expected: FAIL because `createTocPanelElement` does not exist.

- [ ] **Step 3: Add the table-of-contents icon**

Modify `packages/markora/src/editor/icons/index.ts` by adding this icon entry to the built-in icon map:

```ts
"table-of-contents": [
  { name: "path", attrs: { d: "M16 5H3" } },
  { name: "path", attrs: { d: "M16 12H3" } },
  { name: "path", attrs: { d: "M16 19H3" } },
  { name: "path", attrs: { d: "M21 5h.01" } },
  { name: "path", attrs: { d: "M21 12h.01" } },
  { name: "path", attrs: { d: "M21 19h.01" } },
],
```

- [ ] **Step 4: Implement panel DOM builder**

Create `packages/markora/src/editor/table-of-contents/panel.ts`:

```ts
import { createMarkoraIcon } from "../icons";
import type { MarkoraTocItem } from "./types";

export interface TocPanelRenderState {
  expanded: boolean;
  width: number;
  items: MarkoraTocItem[];
}

export interface TocPanelCallbacks {
  onSelect(item: MarkoraTocItem): void;
  onToggle(): void;
  onResizeStart(event: MouseEvent): void;
}

function appendIcon(parent: HTMLElement, name: string): void {
  const icon = createMarkoraIcon(name);
  if (icon) parent.appendChild(icon);
}

function createHeader(callbacks: TocPanelCallbacks): HTMLElement {
  const header = document.createElement("div");
  header.className = "cm-markora-toc-header";

  const title = document.createElement("div");
  title.className = "cm-markora-toc-title";
  appendIcon(title, "table-of-contents");
  const text = document.createElement("span");
  text.textContent = "目录";
  title.appendChild(text);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "cm-markora-toc-toggle";
  toggle.setAttribute("aria-label", "Toggle table of contents");
  toggle.textContent = "‹";
  toggle.addEventListener("click", callbacks.onToggle);

  header.append(title, toggle);
  return header;
}

function createCollapsed(callbacks: TocPanelCallbacks): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cm-markora-toc-collapsed";
  button.setAttribute("aria-label", "Open table of contents");
  appendIcon(button, "table-of-contents");
  const label = document.createElement("span");
  label.textContent = "目录";
  button.appendChild(label);
  button.addEventListener("click", callbacks.onToggle);
  return button;
}

function createItem(item: MarkoraTocItem, callbacks: TocPanelCallbacks): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = item.active ? "cm-markora-toc-item cm-markora-toc-item-active" : "cm-markora-toc-item";
  button.dataset.markoraTocId = item.id;
  button.dataset.markoraTocLevel = String(item.level);
  button.title = item.text;
  button.textContent = item.text;
  button.addEventListener("click", () => callbacks.onSelect(item));
  return button;
}

export function createTocPanelElement(state: TocPanelRenderState, callbacks: TocPanelCallbacks): HTMLElement {
  const root = document.createElement("aside");
  root.className = "cm-markora-toc";
  root.dataset.markoraTocExpanded = String(state.expanded);
  root.style.setProperty("--markora-toc-width", `${state.width}px`);

  const resize = document.createElement("div");
  resize.className = "cm-markora-toc-resize";
  resize.addEventListener("mousedown", callbacks.onResizeStart);
  root.appendChild(resize);

  if (!state.expanded) {
    root.appendChild(createCollapsed(callbacks));
    return root;
  }

  root.appendChild(createHeader(callbacks));

  const list = document.createElement("nav");
  list.className = "cm-markora-toc-list";
  if (state.items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cm-markora-toc-empty";
    empty.textContent = "暂无目录";
    list.appendChild(empty);
  } else {
    for (const item of state.items) list.appendChild(createItem(item, callbacks));
  }
  root.appendChild(list);
  return root;
}
```

- [ ] **Step 5: Implement panel theme**

Create `packages/markora/src/editor/table-of-contents/theme.ts`:

```ts
import { EditorView } from "@codemirror/view";

export const tocTheme = EditorView.baseTheme({
  ".cm-markora-toc": {
    position: "relative",
    flex: "0 0 var(--markora-toc-width, 240px)",
    width: "var(--markora-toc-width, 240px)",
    minWidth: "0",
    height: "100%",
    borderLeft: "1px solid var(--markora-toc-border, #e4e4e7)",
    background: "var(--markora-toc-bg, #ffffff)",
    color: "var(--markora-toc-fg, #27272a)",
    userSelect: "none",
  },
  ".cm-markora-toc[data-markora-toc-expanded='false']": {
    flexBasis: "42px",
    width: "42px",
  },
  ".cm-markora-toc-resize": {
    position: "absolute",
    top: "0",
    bottom: "0",
    left: "-3px",
    width: "6px",
    cursor: "col-resize",
  },
  ".cm-markora-toc-resize::after": {
    position: "absolute",
    top: "40%",
    left: "2px",
    width: "2px",
    height: "58px",
    borderRadius: "999px",
    background: "var(--markora-toc-handle, #d4d4d8)",
    content: "''",
  },
  ".cm-markora-toc-header": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "44px",
    padding: "0 10px 0 14px",
  },
  ".cm-markora-toc-title": {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: "600",
  },
  ".cm-markora-toc-title svg, .cm-markora-toc-collapsed svg": {
    width: "16px",
    height: "16px",
  },
  ".cm-markora-toc-toggle, .cm-markora-toc-collapsed, .cm-markora-toc-item": {
    border: "0",
    background: "transparent",
    color: "inherit",
    cursor: "default",
    font: "inherit",
  },
  ".cm-markora-toc-toggle": {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
  },
  ".cm-markora-toc-toggle:hover, .cm-markora-toc-collapsed:hover, .cm-markora-toc-item:hover": {
    background: "var(--markora-toc-hover, #f4f4f5)",
  },
  ".cm-markora-toc-collapsed": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: "6px",
    width: "100%",
    height: "100%",
    color: "var(--markora-toc-muted, #71717a)",
    fontSize: "12px",
  },
  ".cm-markora-toc-list": {
    overflow: "auto",
    height: "calc(100% - 44px)",
    padding: "4px 10px 16px 12px",
  },
  ".cm-markora-toc-item": {
    display: "block",
    width: "100%",
    overflow: "hidden",
    minHeight: "30px",
    padding: "0 8px",
    borderLeft: "2px solid transparent",
    borderRadius: "6px",
    color: "var(--markora-toc-muted, #71717a)",
    lineHeight: "30px",
    textAlign: "left",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ".cm-markora-toc-item[data-markora-toc-level='3']": { paddingLeft: "18px" },
  ".cm-markora-toc-item[data-markora-toc-level='4']": { paddingLeft: "28px" },
  ".cm-markora-toc-item[data-markora-toc-level='5']": { paddingLeft: "38px" },
  ".cm-markora-toc-item[data-markora-toc-level='6']": { paddingLeft: "48px" },
  ".cm-markora-toc-item-active": {
    borderLeftColor: "var(--markora-toc-active, #18181b)",
    background: "var(--markora-toc-hover, #f4f4f5)",
    color: "var(--markora-toc-active, #18181b)",
    fontWeight: "600",
  },
  ".cm-markora-toc-empty": {
    padding: "12px 8px",
    color: "var(--markora-toc-muted, #71717a)",
    fontSize: "13px",
  },
  "&dark .cm-markora-toc": {
    "--markora-toc-bg": "#18181b",
    "--markora-toc-fg": "#f4f4f5",
    "--markora-toc-border": "#3f3f46",
    "--markora-toc-handle": "#52525b",
    "--markora-toc-hover": "#27272a",
    "--markora-toc-muted": "#a1a1aa",
    "--markora-toc-active": "#f4f4f5",
  },
});
```

- [ ] **Step 6: Export panel and theme**

Modify `packages/markora/src/editor/table-of-contents/index.ts`:

```ts
export * from "./types";
export * from "./slug";
export * from "./storage";
export * from "./extract";
export * from "./panel";
export * from "./theme";
```

- [ ] **Step 7: Run panel tests**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/toc-panel.spec.ts
```

Expected: PASS for panel tests.

- [ ] **Step 8: Commit Task 3**

```bash
git add packages/markora/src/editor/icons/index.ts packages/markora/src/editor/table-of-contents packages/markora/tests/toc-panel.spec.ts
git commit -m "feat(editor): 添加内置目录面板"
```

---

## Task 4: Live Mode TOC Extension And Core Markora Config

**Files:**
- Create: `packages/markora/src/editor/table-of-contents/extension.ts`
- Modify: `packages/markora/src/editor/table-of-contents/index.ts`
- Modify: `packages/markora/src/editor/markora.ts`
- Modify: `packages/markora/src/editor/index.ts`
- Create: `packages/markora/tests/toc-extension.spec.ts`

- [ ] **Step 1: Write failing composition tests**

Create `packages/markora/tests/toc-extension.spec.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { markora } from "../src/editor";
import { tableOfContents } from "../src/editor/table-of-contents";

describe("tableOfContents extension composition", () => {
  it("returns extensions when enabled", () => {
    expect(tableOfContents({ enabled: true }).length).toBeGreaterThan(0);
  });

  it("still returns data extensions when default UI is disabled", () => {
    const calls: unknown[] = [];

    expect(tableOfContents({ enabled: false, onTocChange: (items) => calls.push(items) }).length).toBeGreaterThan(0);
  });

  it("is included by markora by default", () => {
    expect(markora().flat(Infinity).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/toc-extension.spec.ts
```

Expected: FAIL because `tableOfContents` is not exported.

- [ ] **Step 3: Implement Live extension**

Create `packages/markora/src/editor/table-of-contents/extension.ts`:

```ts
import { EditorSelection, Extension, Prec } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { extractTocItemsFromState } from "./extract";
import { createTocPanelElement } from "./panel";
import { clampTocWidth, resolveTocConfig } from "./slug";
import { readTocPanelState, writeTocPanelState } from "./storage";
import { tocTheme } from "./theme";
import type { MarkoraTocConfig, MarkoraTocItem, ResolvedMarkoraTocConfig, TocPanelState } from "./types";

function sameItems(a: MarkoraTocItem[], b: MarkoraTocItem[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

class TocViewPlugin {
  private panel: HTMLElement | null = null;
  private config: ResolvedMarkoraTocConfig;
  private panelState: TocPanelState;
  private items: MarkoraTocItem[] = [];

  constructor(private readonly view: EditorView, rawConfig: MarkoraTocConfig) {
    this.config = resolveTocConfig(rawConfig);
    const stored = readTocPanelState(this.config.storageKey);
    this.panelState = {
      expanded: stored?.expanded ?? this.config.defaultExpanded,
      width: clampTocWidth(stored?.width ?? this.config.defaultWidth, this.config),
    };
    this.view.scrollDOM.addEventListener("scroll", this.handleScroll, { passive: true });
    this.recompute();
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged || update.geometryChanged) this.recompute();
  }

  destroy(): void {
    this.view.scrollDOM.removeEventListener("scroll", this.handleScroll);
    this.panel?.remove();
    this.panel = null;
  }

  private readonly handleScroll = (): void => {
    this.updateActiveItem();
  };

  private recompute(): void {
    const next = extractTocItemsFromState(this.view.state, this.config);
    this.items = this.withActive(next);
    this.config.onTocChange?.(this.items);
    this.render();
  }

  private withActive(items: MarkoraTocItem[]): MarkoraTocItem[] {
    if (items.length === 0) return [];
    const viewportTop = this.view.scrollDOM.getBoundingClientRect().top + 24;
    let activeIndex = 0;
    items.forEach((item, index) => {
      if (typeof item.from !== "number") return;
      const coords = this.view.coordsAtPos(item.from);
      if (coords && coords.top <= viewportTop) activeIndex = index;
    });
    return items.map((item, index) => ({ ...item, active: index === activeIndex }));
  }

  private updateActiveItem(): void {
    const next = this.withActive(this.items);
    if (sameItems(next, this.items)) return;
    this.items = next;
    this.config.onTocChange?.(this.items);
    this.render();
  }

  private render(): void {
    if (!this.config.enabled) return;
    const nextPanel = createTocPanelElement(
      { expanded: this.panelState.expanded, width: this.panelState.width, items: this.items },
      {
        onSelect: (item) => this.selectItem(item),
        onToggle: () => this.toggle(),
        onResizeStart: (event) => this.startResize(event),
      }
    );
    this.panel?.replaceWith(nextPanel);
    if (!this.panel) this.view.dom.appendChild(nextPanel);
    this.panel = nextPanel;
  }

  private selectItem(item: MarkoraTocItem): void {
    if (typeof item.from !== "number") return;
    this.view.dispatch({
      selection: EditorSelection.cursor(item.from),
      effects: EditorView.scrollIntoView(item.from, { y: "start" }),
    });
    this.view.focus();
    this.updateActiveItem();
  }

  private persistPanelState(): void {
    writeTocPanelState(this.config.storageKey, this.panelState);
  }

  private toggle(): void {
    this.panelState = { ...this.panelState, expanded: !this.panelState.expanded };
    this.persistPanelState();
    this.render();
  }

  private startResize(event: MouseEvent): void {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = this.panelState.width;
    const doc = this.view.dom.ownerDocument;
    doc.body.classList.add("cm-markora-toc-resizing");

    const move = (moveEvent: MouseEvent) => {
      const nextWidth = clampTocWidth(startWidth - (moveEvent.clientX - startX), this.config);
      this.panelState = { ...this.panelState, width: nextWidth };
      this.render();
    };
    const up = () => {
      doc.body.classList.remove("cm-markora-toc-resizing");
      doc.removeEventListener("mousemove", move);
      doc.removeEventListener("mouseup", up);
      this.persistPanelState();
    };

    doc.addEventListener("mousemove", move);
    doc.addEventListener("mouseup", up);
  }
}

export function tableOfContents(config: MarkoraTocConfig = {}): Extension[] {
  return [
    tocTheme,
    Prec.low(
      ViewPlugin.define((view) => new TocViewPlugin(view, config))
    ),
  ];
}
```

- [ ] **Step 4: Export the extension**

Modify `packages/markora/src/editor/table-of-contents/index.ts`:

```ts
export * from "./types";
export * from "./slug";
export * from "./storage";
export * from "./extract";
export * from "./panel";
export * from "./theme";
export * from "./extension";
```

Modify `packages/markora/src/editor/index.ts`:

```ts
export * from "./markora";
export * from "./plugin";
export * from "./utils";
export * from "./theme";
export * from "./icons";
export * from "./slash";
export * from "./attachments";
export * from "./selection-toolbar";
export * from "./table-of-contents";
```

- [ ] **Step 5: Wire into markora config**

Modify `packages/markora/src/editor/markora.ts`:

```ts
import type { MarkoraTocConfig } from "./table-of-contents";
import { tableOfContents } from "./table-of-contents";
```

Add this to `MarkoraConfig`:

```ts
/** Table of contents configuration */
toc?: MarkoraTocConfig;
```

Add this default in `markora()` destructuring:

```ts
toc: configToc = { enabled: true },
```

Add this extension after `selectionToolbar(configSelectionToolbar)`:

```ts
tableOfContents(configToc),
```

- [ ] **Step 6: Run extension tests and typecheck**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/toc-extension.spec.ts
pnpm --config.package-manager-strict=false --dir packages/markora typecheck
```

Expected: tests PASS and typecheck exits 0.

- [ ] **Step 7: Commit Task 4**

```bash
git add packages/markora/src/editor packages/markora/tests/toc-extension.spec.ts
git commit -m "feat(editor): 默认启用内置目录扩展"
```

---

## Task 5: Preview TOC Data And Heading IDs

**Files:**
- Create: `packages/markora/src/preview/toc.ts`
- Modify: `packages/markora/src/preview/types.ts`
- Modify: `packages/markora/src/preview/context.ts`
- Modify: `packages/markora/src/preview/renderer.ts`
- Modify: `packages/markora/src/plugins/heading-plugin.ts`
- Modify: `packages/markora/src/preview/index.ts`
- Create: `packages/markora/tests/toc-preview.spec.ts`

- [ ] **Step 1: Write failing preview tests**

Create `packages/markora/tests/toc-preview.spec.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { HeadingPlugin } from "../src/plugins";
import { preview, extractPreviewTocFromMarkdown } from "../src/preview";

describe("preview table of contents", () => {
  it("extracts h2-h6 using the shared slug rules", async () => {
    const items = extractPreviewTocFromMarkdown(["# Title", "## Intro", "### Details", "## Intro"].join("\n\n"));

    expect(items).toEqual([
      expect.objectContaining({ id: "intro", level: 2, text: "Intro", active: false }),
      expect.objectContaining({ id: "details", level: 3, text: "Details", active: false }),
      expect.objectContaining({ id: "intro-2", level: 2, text: "Intro", active: false }),
    ]);
  });

  it("adds ids to rendered heading tags for h2-h6", async () => {
    const html = await preview("## Intro\n\n### Details", {
      plugins: [new HeadingPlugin()],
      sanitize: true,
    });

    expect(html).toContain('<h2 id="intro"');
    expect(html).toContain('<h3 id="details"');
  });
});
```

- [ ] **Step 2: Run preview tests to verify they fail**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/toc-preview.spec.ts
```

Expected: FAIL because `extractPreviewTocFromMarkdown` and heading ids do not exist.

- [ ] **Step 3: Implement preview TOC extraction**

Create `packages/markora/src/preview/toc.ts`:

```ts
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import type { MarkdownConfig } from "@lezer/markdown";
import type { MarkoraTocConfig, MarkoraTocItem } from "../editor/table-of-contents";
import { extractTocItemsFromState } from "../editor/table-of-contents";

export function extractPreviewTocFromMarkdown(doc: string, config: MarkoraTocConfig = {}, markdownConfig: MarkdownConfig[] = []): MarkoraTocItem[] {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage, extensions: markdownConfig })],
  });
  return extractTocItemsFromState(state, config).map((item) => ({ ...item, from: undefined, to: undefined }));
}
```

- [ ] **Step 4: Extend preview context types**

Modify `packages/markora/src/preview/types.ts` to add `headingIdForNode` to `PreviewContext`:

```ts
/** Return a stable heading id for TOC-aware heading renderers */
headingIdForNode?(node: import("@lezer/common").SyntaxNode): string | null;
```

Modify `packages/markora/src/preview/context.ts` so `createPreviewContext` accepts and returns this optional function:

```ts
export function createPreviewContext(
  doc: string,
  theme: ThemeEnum,
  renderChildren: (node: SyntaxNode) => Promise<string>,
  sanitize: boolean = true,
  syntaxHighlighters?: readonly Highlighter[],
  headingIdForNode?: (node: SyntaxNode) => string | null
): PreviewContext {
  return {
    sliceDoc: (from, to) => doc.slice(from, to),
    theme,
    renderChildren,
    sanitize: (html) => (sanitize ? DOMPurify.sanitize(html) : html),
    syntaxHighlighters,
    headingIdForNode,
  };
}
```

- [ ] **Step 5: Compute heading ids in PreviewRenderer**

Modify `packages/markora/src/preview/renderer.ts`:

```ts
import { EditorState } from "@codemirror/state";
import { extractTocItemsFromState } from "../editor/table-of-contents";
```

Inside `render()`, after parsing `tree`, build a map from heading range to id:

```ts
const state = EditorState.create({
  doc: this.doc,
  extensions: [markdownSupport],
});
const tocItems = extractTocItemsFromState(state);
const headingIds = new Map(tocItems.map((item) => [`${item.from}:${item.to}`, item.id]));
this.ctx = createPreviewContext(
  this.doc,
  this.theme,
  this.renderChildren.bind(this),
  this.sanitizeHtml,
  resolveSyntaxHighlighters(this.syntaxTheme, true),
  (node) => headingIds.get(`${node.from}:${node.to}`) ?? null
);
```

Keep the final render call:

```ts
return await this.renderNode(tree.topNode);
```

- [ ] **Step 6: Add heading ids in HeadingPlugin preview HTML**

Modify `packages/markora/src/plugins/heading-plugin.ts` imports:

```ts
import type { PreviewContext } from "../preview/types";
```

Modify the render method:

```ts
override renderToHTML(node: SyntaxNode, children: string, ctx: PreviewContext): string | null {
  if (node.name === "HeaderMark") {
    return "";
  }

  if (!HEADING_TYPES.includes(node.name)) {
    return null;
  }

  const level = parseInt(node.name.slice(-1), 10);
  const lineClass = headingLineDecorations[`heading-${level}` as keyof typeof headingLineDecorations].spec.class;
  const headingClass = headingMarkDecorations[`heading-${level}` as keyof typeof headingMarkDecorations].spec.class;
  const id = level >= 2 ? ctx.headingIdForNode?.(node) : null;
  const idAttr = id ? ` id="${id}"` : "";

  return `<div class="${lineClass}">
      <h${level}${idAttr} class="${headingClass}">${children}</h${level}>
    </div>\n`;
}
```

- [ ] **Step 7: Export preview helper**

Modify `packages/markora/src/preview/index.ts`:

```ts
export { extractPreviewTocFromMarkdown } from "./toc";
```

- [ ] **Step 8: Run preview tests and typecheck**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora test tests/toc-preview.spec.ts
pnpm --config.package-manager-strict=false --dir packages/markora typecheck
```

Expected: tests PASS and typecheck exits 0.

- [ ] **Step 9: Commit Task 5**

```bash
git add packages/markora/src/preview packages/markora/src/plugins/heading-plugin.ts packages/markora/tests/toc-preview.spec.ts
git commit -m "feat(preview): 支持预览目录数据与标题锚点"
```

---

## Task 6: Vue2 Playground Integration

**Files:**
- Modify: `playground/vue2-playground/src/types.ts`
- Modify: `playground/vue2-playground/src/state/playgroundConfig.ts`
- Modify: `playground/vue2-playground/src/components/playground/Devbar.vue`
- Modify: `playground/vue2-playground/src/components/playground/EditorPane.vue`
- Modify: `playground/vue2-playground/src/styles.css`

- [ ] **Step 1: Add feature type and default**

Modify `playground/vue2-playground/src/types.ts`:

```ts
features: {
  slashCommands: boolean;
  attachments: boolean;
  pasteDropUploads: boolean;
  tableOfContents: boolean;
};
```

Modify `playground/vue2-playground/src/state/playgroundConfig.ts`:

```ts
features: {
  slashCommands: true,
  attachments: true,
  pasteDropUploads: true,
  tableOfContents: true,
},
```

- [ ] **Step 2: Add Devbar feature switch**

Modify `playground/vue2-playground/src/components/playground/Devbar.vue` `featureOptions`:

```ts
featureOptions: [
  { key: "slashCommands" as FeatureOptionKey, label: "Slash Commands", description: "Open the command menu with line-start slash input" },
  { key: "attachments" as FeatureOptionKey, label: "Attachments", description: "Enable local file selection through media commands" },
  { key: "pasteDropUploads" as FeatureOptionKey, label: "Paste/Drop Uploads", description: "Upload pasted or dropped files with the mock uploader" },
  { key: "tableOfContents" as FeatureOptionKey, label: "Table of Contents", description: "Show the built-in right-side document outline" },
],
```

- [ ] **Step 3: Pass Live TOC config**

Modify the `markora({ ... })` call in `playground/vue2-playground/src/components/playground/EditorPane.vue`:

```ts
toc: {
  enabled: this.config.features.tableOfContents && this.mode === "live",
  storageKey: "markora-vue2-playground:toc",
},
```

- [ ] **Step 4: Add View mode TOC wrapper**

Modify the View template in `EditorPane.vue` from:

```vue
<div v-else-if="mode === 'view'" ref="previewHost" class="preview-host">
  <div v-html="previewOutput.html" />
</div>
```

to:

```vue
<div v-else-if="mode === 'view'" class="preview-with-toc">
  <div ref="previewHost" class="preview-host">
    <div v-html="previewOutput.html" />
  </div>
  <aside v-if="config.features.tableOfContents" class="vue2-preview-toc">
    <div class="vue2-preview-toc-header">目录</div>
    <button
      v-for="item in previewToc"
      :key="item.id"
      type="button"
      class="vue2-preview-toc-item"
      :class="{ 'vue2-preview-toc-item-active': item.active }"
      :data-level="item.level"
      :title="item.text"
      @click="jumpPreviewToc(item.id)"
    >
      {{ item.text }}
    </button>
    <div v-if="previewToc.length === 0" class="vue2-preview-toc-empty">暂无目录</div>
  </aside>
</div>
```

- [ ] **Step 5: Add preview TOC state and methods**

Modify `EditorPane.vue` imports:

```ts
import type { MarkoraNode, MarkoraTocItem } from "markora/editor";
import { extractPreviewTocFromMarkdown } from "markora/preview";
```

Add data:

```ts
previewToc: [] as MarkoraTocItem[],
```

At the end of `renderPreview()`, after `this.previewOutput = ...`, add:

```ts
this.previewToc = extractPreviewTocFromMarkdown(this.content.content);
```

Add method:

```ts
jumpPreviewToc(id: string) {
  const host = this.$refs.previewHost as HTMLElement | undefined;
  const target = host?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (!host || !target) return;
  host.scrollTo({
    top: target.offsetTop - 24,
    behavior: "smooth",
  });
  this.previewToc = this.previewToc.map((item) => ({ ...item, active: item.id === id }));
},
```

- [ ] **Step 6: Add playground styles**

Modify `playground/vue2-playground/src/styles.css`:

```css
.preview-with-toc {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.preview-with-toc .preview-host {
  flex: 1 1 auto;
  min-width: 0;
}

.vue2-preview-toc {
  flex: 0 0 240px;
  width: 240px;
  min-width: 180px;
  max-width: 360px;
  border-left: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.vue2-preview-toc-header {
  height: 44px;
  padding: 13px 14px;
  font-size: 13px;
  font-weight: 600;
}

.vue2-preview-toc-item {
  display: block;
  width: calc(100% - 20px);
  min-height: 30px;
  margin: 0 10px;
  overflow: hidden;
  border: 0;
  border-left: 2px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  line-height: 30px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vue2-preview-toc-item:hover,
.vue2-preview-toc-item-active {
  background: var(--accent);
  color: var(--text);
}

.vue2-preview-toc-item-active {
  border-left-color: var(--primary);
  font-weight: 600;
}

.vue2-preview-toc-item[data-level="3"] { padding-left: 16px; }
.vue2-preview-toc-item[data-level="4"] { padding-left: 26px; }
.vue2-preview-toc-item[data-level="5"] { padding-left: 36px; }
.vue2-preview-toc-item[data-level="6"] { padding-left: 46px; }

.vue2-preview-toc-empty {
  padding: 12px 18px;
  color: var(--muted);
  font-size: 13px;
}
```

- [ ] **Step 7: Run Vue2 type/build verification**

Run:

```bash
pnpm --config.package-manager-strict=false --filter vue2-playground build
```

Expected: build exits 0. Existing Vue CLI asset-size warnings are acceptable.

- [ ] **Step 8: Commit Task 6**

```bash
git add playground/vue2-playground/src
git commit -m "feat(playground): 演示内置目录能力"
```

---

## Task 7: Full Verification And Browser QA

**Files:**
- Verify all modified source and test files.

- [ ] **Step 1: Run package checks**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/markora typecheck
pnpm --config.package-manager-strict=false --dir packages/markora test
pnpm --config.package-manager-strict=false --dir packages/markora build
pnpm --config.package-manager-strict=false --dir packages/markora lint
pnpm --config.package-manager-strict=false --filter vue2-playground build
git diff --check
```

Expected:

- typecheck exits 0.
- tests exit 0.
- package build exits 0.
- lint exits 0 errors. Existing warnings are acceptable only if they predate this work and are called out.
- Vue2 build exits 0. Existing asset-size warnings are acceptable.
- `git diff --check` exits 0.

- [ ] **Step 2: Start or reuse Vue2 playground dev server**

Run:

```bash
pnpm --config.package-manager-strict=false --filter vue2-playground dev
```

Expected: local dev server starts and prints a localhost URL.

- [ ] **Step 3: Browser verify Live mode**

Open the Vue2 playground URL and verify:

- Live mode shows the built-in right-side TOC panel inside the editor area.
- The panel default state is expanded.
- The panel only includes h2-h6 headings.
- Hovering a TOC item changes background and text color.
- The active item has black text, background, and left indicator.
- Clicking a TOC item scrolls the editor to the matching heading.
- Dragging the divider changes width and stops at min/max bounds.
- Collapsing the panel leaves a narrow entry rail and can reopen.

- [ ] **Step 4: Browser verify View mode**

Switch to View mode and verify:

- View mode shows a right-side TOC panel.
- Clicking TOC items scrolls the preview container to headings.
- Rendered headings have stable ids.
- Duplicate headings use suffixed ids.

- [ ] **Step 5: Browser verify disable/custom data path**

In Developer Panel > Feature Options, turn off Table of Contents and verify:

- Live default TOC UI disappears.
- View default TOC UI disappears.
- Editing the document still does not throw runtime errors.

- [ ] **Step 6: Final commit if verification required cleanup**

If browser QA required code changes, commit them:

```bash
git add packages/markora playground/vue2-playground
git commit -m "fix(editor): 完善目录交互验证问题"
```

If no code changes were needed, do not create an empty commit.

---

## Coverage Checklist

- Built-in default TOC UI: Task 4 and Task 6.
- Disable default UI with `toc.enabled = false`: Task 4 tests and Task 7 QA.
- `onTocChange` data path: Task 4 extension.
- Live mode data extraction: Task 2.
- View mode data extraction: Task 5 and Task 6.
- h2-h6 only: Task 2 and Task 5 tests.
- Click jump: Task 4 and Task 6.
- Hover and active styles: Task 3 and Task 7.
- Expand/collapse: Task 3 and Task 4.
- Drag width with min/max: Task 1, Task 4, and Task 7.
- `storageKey` optional persistence: Task 1 and Task 4.
- Vue2 playground demonstration: Task 6.
