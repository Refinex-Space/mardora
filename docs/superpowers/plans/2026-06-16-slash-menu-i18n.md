# Slash Menu I18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Chinese and English localization for the Draftly slash command menu, defaulting to Chinese and allowing integrators to opt into English.

**Architecture:** Add a tiny core i18n layer in `packages/draftly/src/editor/i18n.ts`, then route the resolved locale into slash menu commands and menu chrome. Keep default command behavior source-compatible by preserving `defaultSlashCommands` as the Chinese command list while adding `getDefaultSlashCommands(locale)`.

**Tech Stack:** TypeScript, CodeMirror 6 extensions, Bun test, Vue 2.6 + Vue CLI 4 playground.

---

## File Structure

- Create `packages/draftly/src/editor/i18n.ts`: shared `DraftlyLocale`, default locale, and locale resolver.
- Modify `packages/draftly/src/editor/slash/types.ts`: add `locale` to slash config and export `DraftlySlashMessages`.
- Modify `packages/draftly/src/editor/slash/default-commands.ts`: replace the fixed command array with localized command definitions and `getDefaultSlashCommands(locale)`.
- Modify `packages/draftly/src/editor/slash/menu.ts`: accept localized menu messages instead of hard-coded group/footer/empty strings.
- Modify `packages/draftly/src/editor/slash/extension.ts`: resolve locale and pass localized commands/messages into the view plugin.
- Modify `packages/draftly/src/editor/draftly.ts`: add top-level `locale` and `i18n.locale`, then pass the resolved locale to slash commands.
- Modify `packages/draftly/src/editor/index.ts`: export the i18n types.
- Create `packages/draftly/tests/slash-i18n.spec.ts`: cover command localization, search aliases, menu chrome, slash config resolution, and custom command preservation.
- Modify `apps/vue2-playground/src/types.ts`: add `PlaygroundLocale` and `config.locale`.
- Modify `apps/vue2-playground/src/state/playgroundConfig.ts`: default to `zh-CN`.
- Modify `apps/vue2-playground/src/components/playground/Devbar.vue`: add a Language segmented control.
- Modify `apps/vue2-playground/src/components/playground/EditorPane.vue`: pass `locale: this.config.locale` to `draftly()`.
- Modify `apps/vue2-playground/src/shims-draftly.d.ts`: add the legacy app type declarations for `locale`.
- Modify `apps/vue2-playground/tests/unit/playgroundConfig.spec.ts`: assert the new locale default and current feature defaults.

---

## Task 1: Core Locale Types and Slash Menu Messages

**Files:**
- Create: `packages/draftly/src/editor/i18n.ts`
- Modify: `packages/draftly/src/editor/index.ts`
- Modify: `packages/draftly/src/editor/slash/types.ts`
- Modify: `packages/draftly/src/editor/slash/menu.ts`
- Test: `packages/draftly/tests/slash-i18n.spec.ts`

- [ ] **Step 1: Add failing tests for menu messages and locale fallback**

Create `packages/draftly/tests/slash-i18n.spec.ts` with this initial content:

```ts
import { afterEach, describe, expect, it } from "bun:test";
import { defaultDraftlyLocale, resolveDraftlyLocale } from "../src/editor";
import { createSlashMenuElement, getSlashMessages } from "../src/editor/slash";
import type { DraftlySlashCommand } from "../src/editor/slash";

class FakeElement {
  className = "";
  type = "";
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  private readonly attrs = new Map<string, string>();
  private readonly listeners = new Map<string, Array<(event: Event) => void>>();
  private ownTextContent = "";

  constructor(readonly tagName: string) {}

  get textContent(): string {
    return `${this.ownTextContent}${this.children.map((child) => child.textContent).join("")}`;
  }

  set textContent(value: string) {
    this.ownTextContent = value;
  }

  set innerHTML(value: string) {
    this.ownTextContent = value.replace(/<[^>]+>/g, "");
  }

  append(...children: FakeElement[]): void {
    for (const child of children) this.appendChild(child);
  }

  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const results: FakeElement[] = [];
    const visit = (node: FakeElement) => {
      if (selector.startsWith(".") && node.className.split(/\s+/).includes(selector.slice(1))) {
        results.push(node);
      }
      for (const child of node.children) visit(child);
    };
    visit(this);
    return results;
  }
}

function installFakeDom(): void {
  globalThis.document = {
    createElement: (tagName: string) => new FakeElement(tagName),
    createElementNS: (_namespace: string, tagName: string) => new FakeElement(tagName),
  } as unknown as Document;
}

afterEach(() => {
  delete (globalThis as typeof globalThis & { document?: Document }).document;
});

const commands: DraftlySlashCommand[] = [
  {
    id: "paragraph",
    group: "basic",
    title: "Text",
    aliases: ["文本", "text"],
    icon: "type",
    hint: "",
    run: () => true,
  },
  {
    id: "image",
    group: "media",
    title: "Image",
    aliases: ["图片", "image"],
    icon: "image",
    hint: "img",
    run: () => true,
  },
];

describe("slash i18n", () => {
  it("defaults to Chinese locale", () => {
    expect(defaultDraftlyLocale).toBe("zh-CN");
    expect(resolveDraftlyLocale()).toBe("zh-CN");
    expect(resolveDraftlyLocale("en-US")).toBe("en-US");
    expect(resolveDraftlyLocale("fr-FR" as never)).toBe("zh-CN");
  });

  it("renders Chinese slash menu chrome by default", () => {
    installFakeDom();
    const menu = createSlashMenuElement({ commands, activeIndex: 0, messages: getSlashMessages("zh-CN") }, { onHover: () => undefined, onSelect: () => undefined });

    expect(menu.textContent).toContain("基本区块");
    expect(menu.textContent).toContain("媒体");
    expect(menu.textContent).toContain("关闭菜单");
  });

  it("renders English slash menu chrome", () => {
    installFakeDom();
    const menu = createSlashMenuElement({ commands: [], activeIndex: 0, messages: getSlashMessages("en-US") }, { onHover: () => undefined, onSelect: () => undefined });

    expect(menu.textContent).toContain("No matching commands");
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/draftly test slash-i18n.spec.ts
```

Expected: FAIL because `defaultDraftlyLocale`, `resolveDraftlyLocale`, `getSlashMessages`, and the `messages` state property do not exist.

- [ ] **Step 3: Add core i18n helpers**

Create `packages/draftly/src/editor/i18n.ts`:

```ts
export type DraftlyLocale = "zh-CN" | "en-US";

export type DraftlyI18nConfig = {
  locale?: DraftlyLocale;
};

export const defaultDraftlyLocale: DraftlyLocale = "zh-CN";

const supportedDraftlyLocales = new Set<DraftlyLocale>(["zh-CN", "en-US"]);

export function resolveDraftlyLocale(locale?: DraftlyLocale): DraftlyLocale {
  return locale && supportedDraftlyLocales.has(locale) ? locale : defaultDraftlyLocale;
}
```

Modify `packages/draftly/src/editor/index.ts` to export the new module:

```ts
export * from "./draftly";
export * from "./icons";
export * from "./i18n";
export * from "./selection-toolbar";
export * from "./slash";
export * from "./table-of-contents";
```

- [ ] **Step 4: Add slash message types and dictionary**

Modify `packages/draftly/src/editor/slash/types.ts`:

```ts
import type { EditorView } from "@codemirror/view";
import type { DraftlyAttachmentKind } from "../attachments";
import type { DraftlyLocale } from "../i18n";

export type DraftlySlashCommandGroup = "basic" | "media";

export type DraftlySlashMessages = {
  groups: Record<DraftlySlashCommandGroup, string>;
  empty: string;
  close: string;
  closeHint: string;
};

export type DraftlySlashCommandContext = {
  view: EditorView;
  queryRange: { from: number; to: number };
  requestAttachment?: (kind: DraftlyAttachmentKind, context: DraftlySlashCommandContext) => boolean;
};

export type DraftlySlashCommand = {
  id: string;
  group: DraftlySlashCommandGroup;
  title: string;
  aliases: string[];
  icon: string;
  hint: string;
  run: (context: DraftlySlashCommandContext) => boolean;
};

export type DraftlySlashQuery = {
  from: number;
  to: number;
  query: string;
};

export type DraftlySlashCommandsConfig = {
  enabled?: boolean;
  locale?: DraftlyLocale;
  commands?: DraftlySlashCommand[];
};
```

Add to `packages/draftly/src/editor/slash/menu.ts`:

```ts
import type { DraftlyLocale } from "../i18n";
import type { DraftlySlashCommand, DraftlySlashMessages } from "./types";
```

Replace the hard-coded `groupLabels` with:

```ts
const slashMessages: Record<DraftlyLocale, DraftlySlashMessages> = {
  "zh-CN": {
    groups: {
      basic: "基本区块",
      media: "媒体",
    },
    empty: "没有匹配的命令",
    close: "关闭菜单",
    closeHint: "esc",
  },
  "en-US": {
    groups: {
      basic: "Basic blocks",
      media: "Media",
    },
    empty: "No matching commands",
    close: "Close menu",
    closeHint: "esc",
  },
};

export function getSlashMessages(locale: DraftlyLocale): DraftlySlashMessages {
  return slashMessages[locale];
}
```

Update `DraftlySlashMenuState`:

```ts
export type DraftlySlashMenuState = {
  commands: DraftlySlashCommand[];
  activeIndex: number;
  messages: DraftlySlashMessages;
};
```

Replace menu text reads:

```ts
empty.textContent = state.messages.empty;
label.textContent = state.messages.groups[currentGroup];
footer.innerHTML = `<span>${state.messages.close}</span><span>${state.messages.closeHint}</span>`;
```

- [ ] **Step 5: Run the new test and verify it passes**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/draftly test slash-i18n.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit core message plumbing**

Run:

```bash
git add packages/draftly/src/editor/i18n.ts packages/draftly/src/editor/index.ts packages/draftly/src/editor/slash/types.ts packages/draftly/src/editor/slash/menu.ts packages/draftly/tests/slash-i18n.spec.ts
git commit -m "feat(i18n): 添加 slash 菜单基础文案字典"
```

---

## Task 2: Locale-Aware Default Slash Commands

**Files:**
- Modify: `packages/draftly/src/editor/slash/default-commands.ts`
- Test: `packages/draftly/tests/slash-i18n.spec.ts`
- Test: `packages/draftly/tests/slash-query.spec.ts`

- [ ] **Step 1: Add failing tests for localized commands and bilingual search**

Append to `packages/draftly/tests/slash-i18n.spec.ts`:

```ts
import { filterSlashCommands } from "../src/editor/slash";
import { defaultSlashCommands, getDefaultSlashCommands } from "../src/editor/slash";

describe("localized default slash commands", () => {
  it("keeps defaultSlashCommands Chinese for compatibility", () => {
    expect(defaultSlashCommands.find((command) => command.id === "paragraph")?.title).toBe("文本");
    expect(defaultSlashCommands.find((command) => command.id === "image")?.title).toBe("图片");
  });

  it("returns English command titles for en-US", () => {
    const commands = getDefaultSlashCommands("en-US");

    expect(commands.find((command) => command.id === "paragraph")?.title).toBe("Text");
    expect(commands.find((command) => command.id === "ordered-list")?.title).toBe("Numbered list");
    expect(commands.find((command) => command.id === "image")?.title).toBe("Image");
  });

  it("supports Chinese and English search terms in both locales", () => {
    const zhCommands = getDefaultSlashCommands("zh-CN");
    const enCommands = getDefaultSlashCommands("en-US");

    expect(filterSlashCommands(zhCommands, "图片").map((command) => command.id)).toEqual(["image"]);
    expect(filterSlashCommands(zhCommands, "image").map((command) => command.id)).toEqual(["image"]);
    expect(filterSlashCommands(enCommands, "图片").map((command) => command.id)).toEqual(["image"]);
    expect(filterSlashCommands(enCommands, "image").map((command) => command.id)).toEqual(["image"]);
    expect(filterSlashCommands(enCommands, "标题").map((command) => command.id)).toEqual([
      "heading-1",
      "heading-2",
      "heading-3",
      "heading-4",
      "heading-5",
      "heading-6",
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/draftly test slash-i18n.spec.ts
```

Expected: FAIL because `getDefaultSlashCommands` does not exist.

- [ ] **Step 3: Implement localized command metadata**

In `packages/draftly/src/editor/slash/default-commands.ts`, import locale type:

```ts
import type { DraftlyLocale } from "../i18n";
```

Add localized titles and aliases:

```ts
type LocalizedSlashCommandCopy = {
  title: string;
  aliases: string[];
};

const commandCopy: Record<DraftlyLocale, Record<string, LocalizedSlashCommandCopy>> = {
  "zh-CN": {
    paragraph: { title: "文本", aliases: ["text", "plain", "wenben"] },
    "heading-1": { title: "标题 1", aliases: ["h1", "heading", "heading1", "biaoti", "标题"] },
    "heading-2": { title: "标题 2", aliases: ["h2", "heading", "heading2", "biaoti", "标题"] },
    "heading-3": { title: "标题 3", aliases: ["h3", "heading", "heading3", "biaoti", "标题"] },
    "heading-4": { title: "标题 4", aliases: ["h4", "heading", "heading4", "biaoti", "标题"] },
    "heading-5": { title: "标题 5", aliases: ["h5", "heading", "heading5", "biaoti", "标题"] },
    "heading-6": { title: "标题 6", aliases: ["h6", "heading", "heading6", "biaoti", "标题"] },
    quote: { title: "引用", aliases: ["quote", "blockquote", "yinyong"] },
    "ordered-list": { title: "有序列表", aliases: ["ol", "ordered", "numbered", "youxu", "有序"] },
    "unordered-list": { title: "项目符号列表", aliases: ["ul", "bullet", "unordered", "bulleted", "wuxu", "无序"] },
    "task-list": { title: "待办清单", aliases: ["todo", "task", "check", "daiban", "待办"] },
    table: { title: "表格", aliases: ["table", "biaoge"] },
    divider: { title: "分隔线", aliases: ["hr", "divider", "line", "fengexian", "分隔"] },
    link: { title: "链接", aliases: ["link", "url", "lianjie"] },
    file: { title: "文件", aliases: ["file", "wenjian"] },
    image: { title: "图片", aliases: ["image", "img", "tu", "tupian", "图片"] },
    video: { title: "视频", aliases: ["video", "shipin"] },
    audio: { title: "音频", aliases: ["audio", "music", "yinpin"] },
  },
  "en-US": {
    paragraph: { title: "Text", aliases: ["文本", "text", "plain", "wenben"] },
    "heading-1": { title: "Heading 1", aliases: ["标题", "h1", "heading", "heading1", "biaoti"] },
    "heading-2": { title: "Heading 2", aliases: ["标题", "h2", "heading", "heading2", "biaoti"] },
    "heading-3": { title: "Heading 3", aliases: ["标题", "h3", "heading", "heading3", "biaoti"] },
    "heading-4": { title: "Heading 4", aliases: ["标题", "h4", "heading", "heading4", "biaoti"] },
    "heading-5": { title: "Heading 5", aliases: ["标题", "h5", "heading", "heading5", "biaoti"] },
    "heading-6": { title: "Heading 6", aliases: ["标题", "h6", "heading", "heading6", "biaoti"] },
    quote: { title: "Quote", aliases: ["引用", "quote", "blockquote", "yinyong"] },
    "ordered-list": { title: "Numbered list", aliases: ["有序", "ol", "ordered", "numbered", "youxu"] },
    "unordered-list": { title: "Bulleted list", aliases: ["无序", "ul", "bullet", "unordered", "bulleted", "wuxu"] },
    "task-list": { title: "To-do list", aliases: ["待办", "todo", "task", "check", "daiban"] },
    table: { title: "Table", aliases: ["表格", "table", "biaoge"] },
    divider: { title: "Divider", aliases: ["分隔", "hr", "divider", "line", "fengexian"] },
    link: { title: "Link", aliases: ["链接", "link", "url", "lianjie"] },
    file: { title: "File", aliases: ["文件", "file", "wenjian"] },
    image: { title: "Image", aliases: ["图片", "image", "img", "tu", "tupian"] },
    video: { title: "Video", aliases: ["视频", "video", "shipin"] },
    audio: { title: "Audio", aliases: ["音频", "audio", "music", "yinpin"] },
  },
};
```

Use a helper to build command metadata:

```ts
function commandMeta(locale: DraftlyLocale, id: string, group: DraftlySlashCommand["group"], icon: string, hint: string): Omit<DraftlySlashCommand, "run"> {
  const copy = commandCopy[locale][id];
  if (!copy) {
    throw new Error(`Missing slash command copy: ${locale}:${id}`);
  }

  return {
    id,
    group,
    title: copy.title,
    aliases: copy.aliases,
    icon,
    hint,
  };
}
```

Replace the exported array with:

```ts
export function getDefaultSlashCommands(locale: DraftlyLocale = "zh-CN"): DraftlySlashCommand[] {
  return [
    markdownCommand(commandMeta(locale, "paragraph", "basic", "type", ""), "", 0),
    markdownCommand(commandMeta(locale, "heading-1", "basic", "heading-1", "#"), "# "),
    markdownCommand(commandMeta(locale, "heading-2", "basic", "heading-2", "##"), "## "),
    markdownCommand(commandMeta(locale, "heading-3", "basic", "heading-3", "###"), "### "),
    markdownCommand(commandMeta(locale, "heading-4", "basic", "heading-4", "####"), "#### "),
    markdownCommand(commandMeta(locale, "heading-5", "basic", "heading-5", "#####"), "##### "),
    markdownCommand(commandMeta(locale, "heading-6", "basic", "heading-6", "######"), "###### "),
    markdownCommand(commandMeta(locale, "quote", "basic", "text-quote", ">"), "> "),
    markdownCommand(commandMeta(locale, "ordered-list", "basic", "list-ordered", "1."), "1. "),
    markdownCommand(commandMeta(locale, "unordered-list", "basic", "list", "-"), "- "),
    markdownCommand(commandMeta(locale, "task-list", "basic", "list-todo", "[]"), "- [ ] "),
    markdownCommand(commandMeta(locale, "table", "basic", "table", "| |"), "| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n", 2),
    markdownCommand(commandMeta(locale, "divider", "basic", "minus", "---"), "---\n"),
    markdownCommand(commandMeta(locale, "link", "basic", "link", "[]()"), "[]()", 1),
    mediaCommand(commandMeta(locale, "file", "media", "file", "file"), "file"),
    mediaCommand(commandMeta(locale, "image", "media", "image", "img"), "image"),
    mediaCommand(commandMeta(locale, "video", "media", "play", "video"), "video"),
    mediaCommand(commandMeta(locale, "audio", "media", "music-2", "audio"), "audio"),
  ];
}

export const defaultSlashCommands: DraftlySlashCommand[] = getDefaultSlashCommands("zh-CN");
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/draftly test slash-i18n.spec.ts slash-query.spec.ts slash-insertions.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit localized default commands**

Run:

```bash
git add packages/draftly/src/editor/slash/default-commands.ts packages/draftly/tests/slash-i18n.spec.ts
git commit -m "feat(i18n): 支持 slash 默认命令中英文文案"
```

---

## Task 3: Wire Locale Through Slash Extension and Draftly Config

**Files:**
- Modify: `packages/draftly/src/editor/slash/extension.ts`
- Modify: `packages/draftly/src/editor/draftly.ts`
- Test: `packages/draftly/tests/slash-i18n.spec.ts`

- [ ] **Step 1: Add failing tests for runtime locale resolution and custom commands**

Append to `packages/draftly/tests/slash-i18n.spec.ts`:

```ts
import { createSlashRuntimeConfig } from "../src/editor/slash";

describe("slash runtime i18n config", () => {
  it("uses English default commands when slash locale is en-US", () => {
    const runtime = createSlashRuntimeConfig({ locale: "en-US" });

    expect(runtime.commands.find((command) => command.id === "paragraph")?.title).toBe("Text");
    expect(runtime.messages.close).toBe("Close menu");
  });

  it("preserves custom command titles while localizing menu chrome", () => {
    const custom: DraftlySlashCommand[] = [
      {
        id: "custom",
        group: "basic",
        title: "自定义命令",
        aliases: ["custom"],
        icon: "type",
        hint: "",
        run: () => true,
      },
    ];
    const runtime = createSlashRuntimeConfig({ locale: "en-US", commands: custom });

    expect(runtime.commands).toBe(custom);
    expect(runtime.commands[0]?.title).toBe("自定义命令");
    expect(runtime.messages.groups.basic).toBe("Basic blocks");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/draftly test slash-i18n.spec.ts
```

Expected: FAIL because `createSlashRuntimeConfig` does not exist and `slashCommands()` still uses the fixed Chinese defaults.

- [ ] **Step 3: Implement slash runtime normalization**

Modify imports in `packages/draftly/src/editor/slash/extension.ts`:

```ts
import type { DraftlyLocale } from "../i18n";
import { resolveDraftlyLocale } from "../i18n";
import { getDefaultSlashCommands } from "./default-commands";
import { createSlashMenuElement, getSlashMessages } from "./menu";
import type { DraftlySlashCommand, DraftlySlashCommandsConfig, DraftlySlashMessages, DraftlySlashQuery } from "./types";
```

Update runtime config:

```ts
export type DraftlySlashRuntimeConfig = DraftlySlashCommandsConfig & {
  attachmentUploader?: DraftlyAttachmentUploader | undefined;
  inheritedLocale?: DraftlyLocale | undefined;
};

export type ResolvedDraftlySlashRuntimeConfig = Required<Pick<DraftlySlashRuntimeConfig, "commands">> &
  DraftlySlashRuntimeConfig & {
    locale: DraftlyLocale;
    messages: DraftlySlashMessages;
  };

export function createSlashRuntimeConfig(config: DraftlySlashRuntimeConfig = {}): ResolvedDraftlySlashRuntimeConfig {
  const locale = resolveDraftlyLocale(config.locale ?? config.inheritedLocale);
  return {
    ...config,
    locale,
    commands: config.commands ?? getDefaultSlashCommands(locale),
    messages: getSlashMessages(locale),
  };
}
```

Change the plugin constructor type:

```ts
constructor(
  private readonly view: EditorView,
  private readonly config: ResolvedDraftlySlashRuntimeConfig
) {
  this.view.dom.ownerDocument.addEventListener("keydown", this.handleDocumentKeydown, true);
  this.updateState();
}
```

Pass messages when rendering:

```ts
this.menu = createSlashMenuElement(
  { commands: this.commands, activeIndex: this.activeIndex, messages: this.config.messages },
  {
    onHover: (index) => {
      this.activeIndex = index;
      this.syncActiveItem("nearest");
    },
    onSelect: (index) => {
      this.select(index);
    },
  }
);
```

Replace normalization in `slashCommands()`:

```ts
const normalizedConfig = createSlashRuntimeConfig(config);
```

- [ ] **Step 4: Add top-level Draftly locale config**

Modify `packages/draftly/src/editor/draftly.ts` imports:

```ts
import type { DraftlyI18nConfig, DraftlyLocale } from "./i18n";
import { resolveDraftlyLocale } from "./i18n";
```

Add to `DraftlyConfig`:

```ts
/** Editor UI locale. Defaults to Simplified Chinese. */
locale?: DraftlyLocale;

/** Internationalization configuration for editor-owned UI text */
i18n?: DraftlyI18nConfig;
```

In `draftly(config: DraftlyConfig = {})`, destructure:

```ts
const {
  locale: configLocale,
  i18n: configI18n = {},
  theme: configTheme = ThemeEnum.LIGHT,
  ...
} = config;
```

Before composing extensions, resolve:

```ts
const resolvedLocale = resolveDraftlyLocale(configSlashCommands.locale ?? configI18n.locale ?? configLocale);
```

Pass inherited locale to slash:

```ts
slashCommands({
  ...configSlashCommands,
  inheritedLocale: resolvedLocale,
  attachmentUploader: configAttachments.uploader,
}),
```

- [ ] **Step 5: Run focused package checks**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/draftly test slash-i18n.spec.ts slash-query.spec.ts slash-insertions.spec.ts
pnpm --config.package-manager-strict=false --dir packages/draftly typecheck
```

Expected: both commands PASS.

- [ ] **Step 6: Commit locale wiring**

Run:

```bash
git add packages/draftly/src/editor/slash/extension.ts packages/draftly/src/editor/draftly.ts packages/draftly/tests/slash-i18n.spec.ts
git commit -m "feat(i18n): 串联 Draftly locale 到 slash 菜单"
```

---

## Task 4: Vue2 Playground Language Control

**Files:**
- Modify: `apps/vue2-playground/src/types.ts`
- Modify: `apps/vue2-playground/src/state/playgroundConfig.ts`
- Modify: `apps/vue2-playground/src/components/playground/Devbar.vue`
- Modify: `apps/vue2-playground/src/components/playground/EditorPane.vue`
- Modify: `apps/vue2-playground/src/shims-draftly.d.ts`
- Test: `apps/vue2-playground/tests/unit/playgroundConfig.spec.ts`

- [ ] **Step 1: Add failing playground config assertions**

Modify `apps/vue2-playground/tests/unit/playgroundConfig.spec.ts`:

```ts
  it("defaults to Chinese locale", () => {
    const config = createDefaultConfig();

    expect(config.locale).toBe("zh-CN");
  });

  it("enables slash commands, attachment uploads, and table of contents by default", () => {
    const config = createDefaultConfig();

    expect(config.features).toEqual({
      slashCommands: true,
      attachments: true,
      pasteDropUploads: true,
      tableOfContents: true,
    });
  });
```

Replace the old `enables slash commands and attachment uploads by default` test with the updated version above.

- [ ] **Step 2: Run Vue2 unit test and verify it fails**

Run:

```bash
pnpm --config.package-manager-strict=false --filter vue2-playground test:unit playgroundConfig.spec.ts
```

Expected: FAIL because `config.locale` does not exist.

- [ ] **Step 3: Add playground locale type and default**

Modify `apps/vue2-playground/src/types.ts`:

```ts
export type PlaygroundLocale = "zh-CN" | "en-US";
```

Add to `PlaygroundConfig`:

```ts
  locale: PlaygroundLocale;
```

Modify `apps/vue2-playground/src/state/playgroundConfig.ts`:

```ts
export function createDefaultConfig(): PlaygroundConfig {
  return {
    locale: "zh-CN",
    editor: {
      baseStyles: true,
      defaultKeybindings: true,
      history: true,
      indentWithTab: true,
      highlightActiveLine: true,
      lineWrapping: true,
    },
    preview: {
      includeBase: true,
      sanitize: true,
      contentWidth: "regular",
    },
    features: {
      slashCommands: true,
      attachments: true,
      pasteDropUploads: true,
      tableOfContents: true,
    },
    plugins: createDefaultPluginConfig(),
  };
}
```

- [ ] **Step 4: Add Devbar language selector**

Modify imports in `apps/vue2-playground/src/components/playground/Devbar.vue`:

```ts
import type { PlaygroundConfig, PreviewContentWidth, PlaygroundLocale } from "@/types";
```

Add this UI block in the Preview Options section after Content Width:

```vue
          <div class="option-row">
            <span class="switch-copy">
              <span class="switch-label">Language</span>
              <span class="switch-description">Adjust Draftly-owned editor UI text</span>
            </span>
            <div class="segmented-control" role="group" aria-label="Language">
              <button
                v-for="item in localeOptions"
                :key="item.value"
                type="button"
                class="segmented-control-button"
                :class="{ 'segmented-control-button-active': config.locale === item.value }"
                @click="updateLocale(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
```

Add data:

```ts
      localeOptions: [
        { value: "zh-CN" as PlaygroundLocale, label: "中文" },
        { value: "en-US" as PlaygroundLocale, label: "English" },
      ],
```

Add method:

```ts
    updateLocale(value: PlaygroundLocale) {
      const nextConfig = cloneConfig(this.config);
      nextConfig.locale = value;
      this.$emit("update-config", nextConfig);
    },
```

- [ ] **Step 5: Pass locale into Draftly and shims**

Modify `apps/vue2-playground/src/components/playground/EditorPane.vue` inside `draftly({ ... })`:

```ts
              locale: this.config.locale,
```

Place it near `theme`:

```ts
              theme: this.draftlyTheme(),
              locale: this.config.locale,
              baseStyles: this.config.editor.baseStyles,
```

Modify `apps/vue2-playground/src/shims-draftly.d.ts`:

```ts
    locale?: "zh-CN" | "en-US";
```

Add that property inside the declared `draftly(config?: { ... })` object.

- [ ] **Step 6: Run Vue2 checks**

Run:

```bash
pnpm --config.package-manager-strict=false --filter vue2-playground test:unit playgroundConfig.spec.ts
pnpm --config.package-manager-strict=false --filter vue2-playground build
```

Expected: both commands PASS. Build may print existing bundle size warnings.

- [ ] **Step 7: Commit Vue2 playground locale control**

Run:

```bash
git add apps/vue2-playground/src/types.ts apps/vue2-playground/src/state/playgroundConfig.ts apps/vue2-playground/src/components/playground/Devbar.vue apps/vue2-playground/src/components/playground/EditorPane.vue apps/vue2-playground/src/shims-draftly.d.ts apps/vue2-playground/tests/unit/playgroundConfig.spec.ts
git commit -m "feat(playground): 增加 slash 菜单语言调试项"
```

---

## Task 5: Browser Verification and Final Checks

**Files:**
- No new source files expected.
- Validate: `packages/draftly`, `apps/vue2-playground`, browser at `http://localhost:3001/`.

- [ ] **Step 1: Run package and app checks**

Run:

```bash
pnpm --config.package-manager-strict=false --dir packages/draftly test slash-i18n.spec.ts slash-query.spec.ts slash-insertions.spec.ts
pnpm --config.package-manager-strict=false --dir packages/draftly typecheck
pnpm --config.package-manager-strict=false --filter vue2-playground test:unit playgroundConfig.spec.ts
pnpm --config.package-manager-strict=false --filter vue2-playground build
git diff --check
```

Expected:

- Draftly focused tests PASS.
- Draftly typecheck PASS.
- Vue2 playground focused unit test PASS.
- Vue2 playground build PASS with only existing bundle size warnings.
- `git diff --check` produces no output.

- [ ] **Step 2: Verify default Chinese slash menu in browser**

Use the in-app browser at `http://localhost:3001/`.

Manual or browser automation steps:

1. Reload the page.
2. Ensure Developer Panel > Preview Options > Language is `中文`.
3. In Live mode, place the cursor on an empty line.
4. Type `/`.
5. Verify the menu contains:
   - `基本区块`
   - `文本`
   - `标题 1`
   - `媒体`
   - `图片`
   - `关闭菜单`

- [ ] **Step 3: Verify English slash menu in browser**

Manual or browser automation steps:

1. Developer Panel > Preview Options > Language: click `English`.
2. Place cursor on an empty line.
3. Type `/`.
4. Verify the menu contains:
   - `Basic blocks`
   - `Text`
   - `Heading 1`
   - `Media`
   - `Image`
   - `Close menu`

- [ ] **Step 4: Verify bilingual search**

Manual or browser automation steps:

1. With Language set to `English`, type `/图片`.
2. Verify the `Image` command is visible.
3. Close the menu.
4. Set Language to `中文`.
5. Type `/image`.
6. Verify the `图片` command is visible.

- [ ] **Step 5: Inspect final diff and status**

Run:

```bash
git status --short
git log --oneline -5
```

Expected:

- `git status --short` is clean after the task commits.
- Recent commits show the four implementation commits from Tasks 1-4.
