# Slash Commands and Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact Notion-like slash command menu and a framework-agnostic browser attachment upload protocol to Markora, then verify it in both React and Vue2 playgrounds.

**Architecture:** Implement two focused core modules under `packages/markora/src/editor`: `slash` owns command matching, menu state, menu DOM, and command execution; `attachments` owns file kind detection, upload markers, upload result formatting, paste/drop/file selection, and async replacement. The existing `markora()` entry point composes both modules through optional config, while React and Vue2 playgrounds provide mock uploaders that return local `blob:` URLs.

**Tech Stack:** TypeScript, CodeMirror 6 `ViewPlugin`, `EditorView.domEventHandlers`, Bun test for core helper coverage, Next.js React playground, Vue 2.6 + Vue CLI 4 playground.

---

## File Structure

- Create `packages/markora/src/editor/slash/types.ts`: public slash command types and menu config.
- Create `packages/markora/src/editor/slash/default-commands.ts`: default basic block and media command definitions.
- Create `packages/markora/src/editor/slash/query.ts`: line-start trigger detection and command filtering.
- Create `packages/markora/src/editor/slash/insertions.ts`: reusable Markdown insertion helpers.
- Create `packages/markora/src/editor/slash/menu.ts`: framework-free compact menu DOM renderer.
- Create `packages/markora/src/editor/slash/theme.ts`: compact Notion-like slash menu theme.
- Create `packages/markora/src/editor/slash/extension.ts`: CodeMirror extension and view plugin for slash command lifecycle.
- Create `packages/markora/src/editor/slash/index.ts`: slash module exports.
- Create `packages/markora/src/editor/attachments/types.ts`: public attachment types and config.
- Create `packages/markora/src/editor/attachments/format.ts`: file kind detection, accept matching, output formatting, and upload marker formatting.
- Create `packages/markora/src/editor/attachments/extension.ts`: CodeMirror extension for file picking, paste, drop, and async upload replacement.
- Create `packages/markora/src/editor/attachments/index.ts`: attachment module exports.
- Modify `packages/markora/src/editor/markora.ts`: add `slashCommands` and `attachments` config and compose extensions.
- Modify `packages/markora/src/editor/index.ts`: export slash and attachment APIs.
- Modify `packages/markora/package.json`: add a `test` script for Bun unit tests.
- Create `packages/markora/tests/slash-query.spec.ts`: slash trigger and filtering tests.
- Create `packages/markora/tests/slash-insertions.spec.ts`: basic command insertion tests.
- Create `packages/markora/tests/attachments-format.spec.ts`: attachment kind, accept, marker, and output formatting tests.
- Create `packages/markora/tests/attachments-upload.spec.ts`: async marker replacement behavior tests.
- Modify `playground/react-playground/app/playground/page.tsx`: pass slash and attachment config with mock uploader.
- Modify `playground/react-playground/app/playground/devbar.tsx`: add slash/attachment/paste-drop toggles.
- Modify `playground/react-playground/app/data/md/walkthrough.ts`: add usage documentation for the React playground.
- Modify `playground/vue2-playground/src/types.ts`: add playground config toggles for slash and attachments.
- Modify `playground/vue2-playground/src/state/playgroundConfig.ts`: add default feature toggles.
- Modify `playground/vue2-playground/src/components/playground/Devbar.vue`: add Vue2 devbar switches.
- Modify `playground/vue2-playground/src/components/playground/EditorPane.vue`: pass slash and attachment config with mock uploader.
- Modify `playground/vue2-playground/src/shims-markora.d.ts`: update temporary type declarations only if package exports are still unavailable to Vue CLI 4 during local development.
- Modify `playground/vue2-playground/src/data/md/walkthrough.ts`: add usage documentation for the Vue2 playground.
- Modify `packages/markora/README.md`: document slash commands and attachment uploader integration.
- Modify `packages/markora/CHANGELOG.md`: add the unreleased feature summary.

## Task 1: Add Core Test Entry and Slash Query Helpers

**Files:**
- Modify: `packages/markora/package.json`
- Create: `packages/markora/src/editor/slash/types.ts`
- Create: `packages/markora/src/editor/slash/query.ts`
- Create: `packages/markora/src/editor/slash/index.ts`
- Create: `packages/markora/tests/slash-query.spec.ts`

- [ ] **Step 1: Add the markora core test script**

Modify `packages/markora/package.json` scripts to include `test`:

```json
{
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "test": "bun test tests"
  }
}
```

- [ ] **Step 2: Write failing slash query tests**

Create `packages/markora/tests/slash-query.spec.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { detectSlashQuery, filterSlashCommands } from "../src/editor/slash";
import type { MarkoraSlashCommand } from "../src/editor/slash";

const commands: MarkoraSlashCommand[] = [
  {
    id: "paragraph",
    group: "basic",
    title: "文本",
    aliases: ["text", "plain"],
    icon: "T",
    hint: "",
    run: () => true,
  },
  {
    id: "heading-1",
    group: "basic",
    title: "标题 1",
    aliases: ["h1", "heading"],
    icon: "H1",
    hint: "#",
    run: () => true,
  },
  {
    id: "image",
    group: "media",
    title: "图片",
    aliases: ["image", "img", "tu"],
    icon: "IMG",
    hint: "img",
    run: () => true,
  },
];

describe("detectSlashQuery", () => {
  it("detects an empty slash query at the start of an empty line", () => {
    expect(detectSlashQuery("/", 1)).toEqual({ from: 0, to: 1, query: "" });
  });

  it("detects a line-start query with Chinese text", () => {
    expect(detectSlashQuery("/图", 2)).toEqual({ from: 0, to: 2, query: "图" });
  });

  it("detects a line-start query after a previous line", () => {
    const doc = "hello\n/heading";
    expect(detectSlashQuery(doc, doc.length)).toEqual({ from: 6, to: 14, query: "heading" });
  });

  it("does not trigger for a slash in the middle of body text", () => {
    expect(detectSlashQuery("hello /img", 10)).toBeNull();
  });

  it("does not trigger when cursor is before the query end", () => {
    expect(detectSlashQuery("/image", 3)).toEqual({ from: 0, to: 3, query: "im" });
  });
});

describe("filterSlashCommands", () => {
  it("returns all commands for an empty query", () => {
    expect(filterSlashCommands(commands, "").map((command) => command.id)).toEqual(["paragraph", "heading-1", "image"]);
  });

  it("matches aliases case-insensitively", () => {
    expect(filterSlashCommands(commands, "IMG").map((command) => command.id)).toEqual(["image"]);
  });

  it("matches Chinese titles", () => {
    expect(filterSlashCommands(commands, "标题").map((command) => command.id)).toEqual(["heading-1"]);
  });
});
```

- [ ] **Step 3: Run the failing test**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora test -- slash-query.spec.ts
```

Expected: FAIL because `packages/markora/src/editor/slash` does not exist.

- [ ] **Step 4: Add slash types and query helpers**

Create `packages/markora/src/editor/slash/types.ts`:

```ts
import type { EditorView } from "@codemirror/view";

export type MarkoraSlashCommandGroup = "basic" | "media";

export type MarkoraSlashCommandContext = {
  view: EditorView;
  queryRange: { from: number; to: number };
};

export type MarkoraSlashCommand = {
  id: string;
  group: MarkoraSlashCommandGroup;
  title: string;
  aliases: string[];
  icon: string;
  hint: string;
  run: (context: MarkoraSlashCommandContext) => boolean;
};

export type MarkoraSlashQuery = {
  from: number;
  to: number;
  query: string;
};

export type MarkoraSlashCommandsConfig = {
  enabled?: boolean;
  commands?: MarkoraSlashCommand[];
};
```

Create `packages/markora/src/editor/slash/query.ts`:

```ts
import type { MarkoraSlashCommand, MarkoraSlashQuery } from "./types";

const slashLinePattern = /^\/([^\s]*)$/;

export function detectSlashQuery(documentText: string, cursorPosition: number): MarkoraSlashQuery | null {
  const safeCursor = Math.max(0, Math.min(cursorPosition, documentText.length));
  const lineStart = documentText.lastIndexOf("\n", safeCursor - 1) + 1;
  const lineTextBeforeCursor = documentText.slice(lineStart, safeCursor);
  const match = lineTextBeforeCursor.match(slashLinePattern);

  if (!match) {
    return null;
  }

  return {
    from: lineStart,
    to: safeCursor,
    query: match[1] ?? "",
  };
}

export function filterSlashCommands(commands: readonly MarkoraSlashCommand[], query: string): MarkoraSlashCommand[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return [...commands];
  }

  return commands.filter((command) => {
    const searchable = [command.title, command.id, command.hint, ...command.aliases]
      .join(" ")
      .toLocaleLowerCase();
    return searchable.includes(normalizedQuery);
  });
}
```

Create `packages/markora/src/editor/slash/index.ts`:

```ts
export * from "./types";
export * from "./query";
```

- [ ] **Step 5: Run the slash query test**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora test -- slash-query.spec.ts
```

Expected: PASS for all slash query tests.

- [ ] **Step 6: Commit**

```bash
git add packages/markora/package.json packages/markora/src/editor/slash packages/markora/tests/slash-query.spec.ts
git commit -m "test(editor): 添加斜杆命令查询测试"
```

## Task 2: Add Slash Command Insertion Helpers and Defaults

**Files:**
- Create: `packages/markora/src/editor/slash/insertions.ts`
- Create: `packages/markora/src/editor/slash/default-commands.ts`
- Modify: `packages/markora/src/editor/slash/index.ts`
- Create: `packages/markora/tests/slash-insertions.spec.ts`

- [ ] **Step 1: Write failing insertion tests**

Create `packages/markora/tests/slash-insertions.spec.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { buildSlashReplacement, defaultSlashCommands } from "../src/editor/slash";

describe("buildSlashReplacement", () => {
  it("replaces the slash query with heading markdown", () => {
    expect(buildSlashReplacement({ marker: "# ", cursorOffset: 2 }, { from: 0, to: 3, query: "h1" })).toEqual({
      changes: { from: 0, to: 3, insert: "# " },
      selectionAnchor: 2,
    });
  });

  it("places the cursor inside a link template", () => {
    expect(buildSlashReplacement({ marker: "[]()", cursorOffset: 1 }, { from: 4, to: 9, query: "link" })).toEqual({
      changes: { from: 4, to: 9, insert: "[]()" },
      selectionAnchor: 5,
    });
  });

  it("moves the cursor after a divider block", () => {
    expect(buildSlashReplacement({ marker: "---\n", cursorOffset: 4 }, { from: 0, to: 1, query: "" })).toEqual({
      changes: { from: 0, to: 1, insert: "---\n" },
      selectionAnchor: 4,
    });
  });
});

describe("defaultSlashCommands", () => {
  it("contains the required basic block commands", () => {
    expect(defaultSlashCommands.filter((command) => command.group === "basic").map((command) => command.id)).toEqual([
      "paragraph",
      "heading-1",
      "heading-2",
      "heading-3",
      "heading-4",
      "heading-5",
      "heading-6",
      "quote",
      "ordered-list",
      "unordered-list",
      "task-list",
      "table",
      "divider",
      "link",
    ]);
  });

  it("contains the required media commands", () => {
    expect(defaultSlashCommands.filter((command) => command.group === "media").map((command) => command.id)).toEqual([
      "file",
      "image",
      "video",
      "audio",
    ]);
  });
});
```

- [ ] **Step 2: Run the failing insertion test**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora test -- slash-insertions.spec.ts
```

Expected: FAIL because `buildSlashReplacement` and `defaultSlashCommands` are not exported.

- [ ] **Step 3: Add insertion helpers**

Create `packages/markora/src/editor/slash/insertions.ts`:

```ts
import type { ChangeSpec } from "@codemirror/state";
import type { MarkoraSlashQuery } from "./types";

export type MarkoraSlashReplacementTemplate = {
  marker: string;
  cursorOffset: number;
};

export type MarkoraSlashReplacement = {
  changes: ChangeSpec;
  selectionAnchor: number;
};

export function buildSlashReplacement(
  template: MarkoraSlashReplacementTemplate,
  query: MarkoraSlashQuery
): MarkoraSlashReplacement {
  return {
    changes: {
      from: query.from,
      to: query.to,
      insert: template.marker,
    },
    selectionAnchor: query.from + template.cursorOffset,
  };
}
```

- [ ] **Step 4: Add default command definitions**

Create `packages/markora/src/editor/slash/default-commands.ts`:

```ts
import type { MarkoraSlashCommand } from "./types";
import { buildSlashReplacement } from "./insertions";

function markdownCommand(
  command: Omit<MarkoraSlashCommand, "run">,
  marker: string,
  cursorOffset: number = marker.length
): MarkoraSlashCommand {
  return {
    ...command,
    run: ({ view, queryRange }) => {
      const replacement = buildSlashReplacement({ marker, cursorOffset }, { ...queryRange, query: "" });
      view.dispatch({
        changes: replacement.changes,
        selection: { anchor: replacement.selectionAnchor },
        scrollIntoView: true,
      });
      view.focus();
      return true;
    },
  };
}

export const defaultSlashCommands: MarkoraSlashCommand[] = [
  markdownCommand({ id: "paragraph", group: "basic", title: "文本", aliases: ["text", "plain"], icon: "T", hint: "" }, "", 0),
  markdownCommand({ id: "heading-1", group: "basic", title: "标题 1", aliases: ["h1", "heading1"], icon: "H1", hint: "#" }, "# "),
  markdownCommand({ id: "heading-2", group: "basic", title: "标题 2", aliases: ["h2", "heading2"], icon: "H2", hint: "##" }, "## "),
  markdownCommand({ id: "heading-3", group: "basic", title: "标题 3", aliases: ["h3", "heading3"], icon: "H3", hint: "###" }, "### "),
  markdownCommand({ id: "heading-4", group: "basic", title: "标题 4", aliases: ["h4", "heading4"], icon: "H4", hint: "####" }, "#### "),
  markdownCommand({ id: "heading-5", group: "basic", title: "标题 5", aliases: ["h5", "heading5"], icon: "H5", hint: "#####" }, "##### "),
  markdownCommand({ id: "heading-6", group: "basic", title: "标题 6", aliases: ["h6", "heading6"], icon: "H6", hint: "######" }, "###### "),
  markdownCommand({ id: "quote", group: "basic", title: "引用", aliases: ["quote", "blockquote"], icon: "“", hint: ">" }, "> "),
  markdownCommand({ id: "ordered-list", group: "basic", title: "有序列表", aliases: ["ol", "ordered"], icon: "1.", hint: "1." }, "1. "),
  markdownCommand({ id: "unordered-list", group: "basic", title: "无顺列表", aliases: ["ul", "bullet", "unordered"], icon: "•", hint: "-" }, "- "),
  markdownCommand({ id: "task-list", group: "basic", title: "待办清单", aliases: ["todo", "task", "check"], icon: "☑", hint: "[]" }, "- [ ] "),
  markdownCommand(
    { id: "table", group: "basic", title: "表格", aliases: ["table"], icon: "▦", hint: "| |" },
    "| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n",
    2
  ),
  markdownCommand({ id: "divider", group: "basic", title: "分隔线", aliases: ["hr", "divider"], icon: "—", hint: "---" }, "---\n"),
  markdownCommand({ id: "link", group: "basic", title: "链接", aliases: ["link", "url"], icon: "↗", hint: "[]()" }, "[]()", 1),
  markdownCommand({ id: "file", group: "media", title: "文件", aliases: ["file"], icon: "▤", hint: "file" }, "[filename](url)", 1),
  markdownCommand({ id: "image", group: "media", title: "图片", aliases: ["image", "img", "tu"], icon: "▧", hint: "img" }, "![image](url)", 2),
  markdownCommand({ id: "video", group: "media", title: "视频", aliases: ["video"], icon: "▶", hint: "video" }, '<video src="url" controls></video>', 12),
  markdownCommand({ id: "audio", group: "media", title: "音频", aliases: ["audio"], icon: "♪", hint: "audio" }, '<audio src="url" controls></audio>', 12),
];
```

- [ ] **Step 5: Export insertion helpers and defaults**

Modify `packages/markora/src/editor/slash/index.ts`:

```ts
export * from "./types";
export * from "./query";
export * from "./insertions";
export * from "./default-commands";
```

- [ ] **Step 6: Run insertion tests**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora test -- slash-insertions.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/markora/src/editor/slash packages/markora/tests/slash-insertions.spec.ts
git commit -m "feat(editor): 添加默认斜杆命令"
```

## Task 3: Add Attachment Formatting Helpers

**Files:**
- Create: `packages/markora/src/editor/attachments/types.ts`
- Create: `packages/markora/src/editor/attachments/format.ts`
- Create: `packages/markora/src/editor/attachments/index.ts`
- Create: `packages/markora/tests/attachments-format.spec.ts`

- [ ] **Step 1: Write failing attachment formatting tests**

Create `packages/markora/tests/attachments-format.spec.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  createUploadMarker,
  detectAttachmentKind,
  formatAttachmentMarkdown,
  isAcceptedAttachment,
} from "../src/editor/attachments";

describe("detectAttachmentKind", () => {
  it("detects image, video, audio, and file kinds from mime type", () => {
    expect(detectAttachmentKind({ name: "a.png", type: "image/png" })).toBe("image");
    expect(detectAttachmentKind({ name: "a.mp4", type: "video/mp4" })).toBe("video");
    expect(detectAttachmentKind({ name: "a.mp3", type: "audio/mpeg" })).toBe("audio");
    expect(detectAttachmentKind({ name: "a.pdf", type: "application/pdf" })).toBe("file");
  });
});

describe("formatAttachmentMarkdown", () => {
  it("formats image markdown with and without title", () => {
    expect(formatAttachmentMarkdown("image", { url: "https://cdn/a.png", name: "a.png" })).toBe("![a.png](https://cdn/a.png)");
    expect(formatAttachmentMarkdown("image", { url: "https://cdn/a.png", name: "a.png", title: "A" })).toBe(
      '![a.png](https://cdn/a.png "A")'
    );
  });

  it("formats video, audio, and file outputs", () => {
    expect(formatAttachmentMarkdown("video", { url: "https://cdn/a.mp4", name: "a.mp4" })).toBe(
      '<video src="https://cdn/a.mp4" controls></video>'
    );
    expect(formatAttachmentMarkdown("audio", { url: "https://cdn/a.mp3", name: "a.mp3" })).toBe(
      '<audio src="https://cdn/a.mp3" controls></audio>'
    );
    expect(formatAttachmentMarkdown("file", { url: "https://cdn/a.pdf", name: "a.pdf" })).toBe("[a.pdf](https://cdn/a.pdf)");
  });
});

describe("createUploadMarker", () => {
  it("creates stable visible upload markers", () => {
    expect(createUploadMarker({ taskId: "task-1", kind: "image", name: "a.png", state: "uploading" })).toBe(
      "![a.png](markora-upload://task-1)"
    );
    expect(createUploadMarker({ taskId: "task-1", kind: "file", name: "a.pdf", state: "failed" })).toBe(
      "[Upload failed: a.pdf](markora-upload://task-1)"
    );
  });
});

describe("isAcceptedAttachment", () => {
  it("matches wildcard accept rules", () => {
    expect(isAcceptedAttachment({ name: "a.png", type: "image/png" }, ["image/*"])).toBe(true);
    expect(isAcceptedAttachment({ name: "a.mp4", type: "video/mp4" }, ["image/*"])).toBe(false);
    expect(isAcceptedAttachment({ name: "a.pdf", type: "application/pdf" }, ["*/*"])).toBe(true);
  });
});
```

- [ ] **Step 2: Run the failing formatting test**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora test -- attachments-format.spec.ts
```

Expected: FAIL because `packages/markora/src/editor/attachments` does not exist.

- [ ] **Step 3: Add attachment types**

Create `packages/markora/src/editor/attachments/types.ts`:

```ts
export type MarkoraAttachmentKind = "image" | "video" | "audio" | "file";

export type MarkoraAttachmentUploadSource = "slash" | "paste" | "drop" | "api";

export type MarkoraAttachmentUploadContext = {
  kind: MarkoraAttachmentKind;
  source: MarkoraAttachmentUploadSource;
  documentText: string;
  selection: { from: number; to: number };
};

export type MarkoraAttachmentUploadResult = {
  url: string;
  name?: string;
  title?: string;
  mimeType?: string;
};

export type MarkoraAttachmentUploader = (
  file: File,
  context: MarkoraAttachmentUploadContext
) => Promise<MarkoraAttachmentUploadResult>;

export type MarkoraAttachmentAccept = Partial<Record<MarkoraAttachmentKind, string[]>>;

export type MarkoraAttachmentsConfig = {
  enabled?: boolean;
  uploader?: MarkoraAttachmentUploader;
  accept?: MarkoraAttachmentAccept;
  enablePaste?: boolean;
  enableDrop?: boolean;
};

export type MarkoraFileLike = {
  name: string;
  type: string;
};
```

- [ ] **Step 4: Add attachment formatting helpers**

Create `packages/markora/src/editor/attachments/format.ts`:

```ts
import type { MarkoraAttachmentKind, MarkoraAttachmentUploadResult, MarkoraFileLike } from "./types";

export type MarkoraUploadMarkerState = "uploading" | "failed";

export type MarkoraUploadMarkerInput = {
  taskId: string;
  kind: MarkoraAttachmentKind;
  name: string;
  state: MarkoraUploadMarkerState;
};

export function detectAttachmentKind(file: MarkoraFileLike): MarkoraAttachmentKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export function isAcceptedAttachment(file: MarkoraFileLike, acceptRules: readonly string[]): boolean {
  if (acceptRules.includes("*/*")) return true;

  return acceptRules.some((rule) => {
    if (rule.endsWith("/*")) {
      return file.type.startsWith(rule.slice(0, -1));
    }

    if (rule.startsWith(".")) {
      return file.name.toLocaleLowerCase().endsWith(rule.toLocaleLowerCase());
    }

    return file.type === rule;
  });
}

export function createUploadMarker(input: MarkoraUploadMarkerInput): string {
  if (input.state === "failed") {
    return `[Upload failed: ${input.name}](markora-upload://${input.taskId})`;
  }

  if (input.kind === "image") {
    return `![${input.name}](markora-upload://${input.taskId})`;
  }

  return `[Uploading ${input.name}](markora-upload://${input.taskId})`;
}

export function formatAttachmentMarkdown(
  kind: MarkoraAttachmentKind,
  result: MarkoraAttachmentUploadResult
): string {
  const name = result.name || "attachment";

  if (kind === "image") {
    return result.title ? `![${name}](${result.url} "${result.title}")` : `![${name}](${result.url})`;
  }

  if (kind === "video") {
    return `<video src="${result.url}" controls></video>`;
  }

  if (kind === "audio") {
    return `<audio src="${result.url}" controls></audio>`;
  }

  return `[${name}](${result.url})`;
}
```

- [ ] **Step 5: Export attachment helpers**

Create `packages/markora/src/editor/attachments/index.ts`:

```ts
export * from "./types";
export * from "./format";
```

- [ ] **Step 6: Run formatting tests**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora test -- attachments-format.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/markora/src/editor/attachments packages/markora/tests/attachments-format.spec.ts
git commit -m "feat(editor): 添加附件格式化协议"
```

## Task 4: Add Attachment Upload Extension

**Files:**
- Create: `packages/markora/src/editor/attachments/extension.ts`
- Modify: `packages/markora/src/editor/attachments/index.ts`
- Create: `packages/markora/tests/attachments-upload.spec.ts`

- [ ] **Step 1: Write failing async upload tests**

Create `packages/markora/tests/attachments-upload.spec.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { uploadAttachmentFile } from "../src/editor/attachments";

function createView(doc: string): EditorView {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  return new EditorView({
    parent,
    state: EditorState.create({ doc }),
  });
}

function createFile(name: string, type: string): File {
  return new File(["content"], name, { type });
}

describe("uploadAttachmentFile", () => {
  it("inserts an upload marker and replaces it on success", async () => {
    const view = createView("/");
    view.dispatch({ selection: { anchor: 1 } });

    await uploadAttachmentFile(view, createFile("a.png", "image/png"), {
      kind: "image",
      source: "slash",
      range: { from: 0, to: 1 },
      uploader: async () => ({ url: "https://cdn/a.png", name: "a.png" }),
    });

    expect(view.state.doc.toString()).toBe("![a.png](https://cdn/a.png)");
    view.destroy();
  });

  it("keeps a failed marker on uploader rejection", async () => {
    const view = createView("/");
    view.dispatch({ selection: { anchor: 1 } });

    await uploadAttachmentFile(view, createFile("a.pdf", "application/pdf"), {
      kind: "file",
      source: "paste",
      range: { from: 0, to: 1 },
      uploader: async () => {
        throw new Error("upload failed");
      },
    });

    expect(view.state.doc.toString()).toContain("[Upload failed: a.pdf](markora-upload://");
    view.destroy();
  });

  it("does not resurrect a marker that the user deleted before upload completion", async () => {
    const view = createView("/");
    view.dispatch({ selection: { anchor: 1 } });
    let resolveUpload: (value: { url: string; name: string }) => void = () => {};

    const uploadPromise = uploadAttachmentFile(view, createFile("a.png", "image/png"), {
      kind: "image",
      source: "drop",
      range: { from: 0, to: 1 },
      uploader: async () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    });

    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "" } });
    resolveUpload({ url: "https://cdn/a.png", name: "a.png" });
    await uploadPromise;

    expect(view.state.doc.toString()).toBe("");
    view.destroy();
  });
});
```

- [ ] **Step 2: Run the failing upload test**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora test -- attachments-upload.spec.ts
```

Expected: FAIL because `uploadAttachmentFile` is not exported.

- [ ] **Step 3: Add upload extension utilities**

Create `packages/markora/src/editor/attachments/extension.ts`:

```ts
import { EditorSelection, Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  createUploadMarker,
  detectAttachmentKind,
  formatAttachmentMarkdown,
  isAcceptedAttachment,
} from "./format";
import type {
  MarkoraAttachmentKind,
  MarkoraAttachmentsConfig,
  MarkoraAttachmentUploadSource,
  MarkoraAttachmentUploader,
} from "./types";

let uploadSequence = 0;

export type MarkoraUploadAttachmentOptions = {
  kind?: MarkoraAttachmentKind;
  source: MarkoraAttachmentUploadSource;
  range?: { from: number; to: number };
  uploader: MarkoraAttachmentUploader;
};

function nextUploadTaskId(): string {
  uploadSequence += 1;
  return `task-${Date.now()}-${uploadSequence}`;
}

function findMarkerRange(view: EditorView, taskId: string): { from: number; to: number } | null {
  const doc = view.state.doc.toString();
  const marker = `markora-upload://${taskId}`;
  const markerIndex = doc.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const line = view.state.doc.lineAt(markerIndex);
  return { from: line.from, to: line.to };
}

export async function uploadAttachmentFile(
  view: EditorView,
  file: File,
  options: MarkoraUploadAttachmentOptions
): Promise<void> {
  const kind = options.kind ?? detectAttachmentKind(file);
  const range = options.range ?? {
    from: view.state.selection.main.from,
    to: view.state.selection.main.to,
  };
  const taskId = nextUploadTaskId();
  const marker = createUploadMarker({ taskId, kind, name: file.name, state: "uploading" });

  view.dispatch({
    changes: { from: range.from, to: range.to, insert: marker },
    selection: EditorSelection.cursor(range.from + marker.length),
    scrollIntoView: true,
  });

  try {
    const result = await options.uploader(file, {
      kind,
      source: options.source,
      documentText: view.state.doc.toString(),
      selection: { from: range.from, to: range.from + marker.length },
    });
    const markerRange = findMarkerRange(view, taskId);

    if (!markerRange) {
      return;
    }

    const output = formatAttachmentMarkdown(kind, {
      ...result,
      name: result.name ?? file.name,
      mimeType: result.mimeType ?? file.type,
    });

    view.dispatch({
      changes: { from: markerRange.from, to: markerRange.to, insert: output },
      selection: EditorSelection.cursor(markerRange.from + output.length),
      scrollIntoView: true,
    });
  } catch {
    const markerRange = findMarkerRange(view, taskId);

    if (!markerRange) {
      return;
    }

    const failedMarker = createUploadMarker({ taskId, kind, name: file.name, state: "failed" });
    view.dispatch({
      changes: { from: markerRange.from, to: markerRange.to, insert: failedMarker },
      selection: EditorSelection.cursor(markerRange.from + failedMarker.length),
      scrollIntoView: true,
    });
  }
}

function getFilesFromEvent(event: ClipboardEvent | DragEvent): File[] {
  const files = event instanceof ClipboardEvent ? event.clipboardData?.files : event.dataTransfer?.files;
  return files ? Array.from(files) : [];
}

function uploadFilesFromEvent(
  view: EditorView,
  event: ClipboardEvent | DragEvent,
  source: MarkoraAttachmentUploadSource,
  config: Required<Pick<MarkoraAttachmentsConfig, "uploader">> & MarkoraAttachmentsConfig
): boolean {
  const files = getFilesFromEvent(event);
  if (files.length === 0) {
    return false;
  }

  event.preventDefault();

  for (const file of files) {
    const kind = detectAttachmentKind(file);
    const acceptRules = config.accept?.[kind] ?? ["*/*"];

    if (!isAcceptedAttachment(file, acceptRules)) {
      continue;
    }

    void uploadAttachmentFile(view, file, {
      kind,
      source,
      uploader: config.uploader,
    });
  }

  return true;
}

export function attachments(config: MarkoraAttachmentsConfig = {}): Extension[] {
  if (config.enabled === false || !config.uploader) {
    return [];
  }

  const normalizedConfig = {
    enablePaste: true,
    enableDrop: true,
    ...config,
    uploader: config.uploader,
  };

  return [
    EditorView.domEventHandlers({
      paste(event, view) {
        if (!normalizedConfig.enablePaste) {
          return false;
        }
        return uploadFilesFromEvent(view, event, "paste", normalizedConfig);
      },
      drop(event, view) {
        if (!normalizedConfig.enableDrop) {
          return false;
        }
        return uploadFilesFromEvent(view, event, "drop", normalizedConfig);
      },
    }),
  ];
}
```

- [ ] **Step 4: Export upload utilities**

Modify `packages/markora/src/editor/attachments/index.ts`:

```ts
export * from "./types";
export * from "./format";
export * from "./extension";
```

- [ ] **Step 5: Run upload tests**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora test -- attachments-upload.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/markora/src/editor/attachments packages/markora/tests/attachments-upload.spec.ts
git commit -m "feat(editor): 添加附件上传扩展"
```

## Task 5: Add Slash Menu View Extension

**Files:**
- Create: `packages/markora/src/editor/slash/menu.ts`
- Create: `packages/markora/src/editor/slash/theme.ts`
- Create: `packages/markora/src/editor/slash/extension.ts`
- Modify: `packages/markora/src/editor/slash/index.ts`
- Modify: `packages/markora/src/editor/slash/default-commands.ts`

- [ ] **Step 1: Add media command dispatch support**

Modify `packages/markora/src/editor/slash/types.ts` so `MarkoraSlashCommandsConfig` can connect media commands to attachments:

```ts
import type { EditorView } from "@codemirror/view";
import type { MarkoraAttachmentKind } from "../attachments";

export type MarkoraSlashCommandGroup = "basic" | "media";

export type MarkoraSlashCommandContext = {
  view: EditorView;
  queryRange: { from: number; to: number };
  requestAttachment?: (kind: MarkoraAttachmentKind, context: MarkoraSlashCommandContext) => boolean;
};

export type MarkoraSlashCommand = {
  id: string;
  group: MarkoraSlashCommandGroup;
  title: string;
  aliases: string[];
  icon: string;
  hint: string;
  run: (context: MarkoraSlashCommandContext) => boolean;
};

export type MarkoraSlashQuery = {
  from: number;
  to: number;
  query: string;
};

export type MarkoraSlashCommandsConfig = {
  enabled?: boolean;
  commands?: MarkoraSlashCommand[];
};
```

Modify the four media commands in `packages/markora/src/editor/slash/default-commands.ts`:

```ts
function mediaCommand(command: Omit<MarkoraSlashCommand, "run">, kind: "image" | "video" | "audio" | "file"): MarkoraSlashCommand {
  return {
    ...command,
    run: (context) => {
      if (context.requestAttachment?.(kind, context)) {
        return true;
      }

      const fallbackByKind = {
        image: "![image](url)",
        video: '<video src="url" controls></video>',
        audio: '<audio src="url" controls></audio>',
        file: "[filename](url)",
      };
      const replacement = buildSlashReplacement(
        { marker: fallbackByKind[kind], cursorOffset: kind === "file" ? 1 : fallbackByKind[kind].indexOf("url") },
        { ...context.queryRange, query: "" }
      );
      context.view.dispatch({
        changes: replacement.changes,
        selection: { anchor: replacement.selectionAnchor },
        scrollIntoView: true,
      });
      context.view.focus();
      return true;
    },
  };
}
```

Replace the existing media command entries with:

```ts
mediaCommand({ id: "file", group: "media", title: "文件", aliases: ["file"], icon: "▤", hint: "file" }, "file"),
mediaCommand({ id: "image", group: "media", title: "图片", aliases: ["image", "img", "tu"], icon: "▧", hint: "img" }, "image"),
mediaCommand({ id: "video", group: "media", title: "视频", aliases: ["video"], icon: "▶", hint: "video" }, "video"),
mediaCommand({ id: "audio", group: "media", title: "音频", aliases: ["audio"], icon: "♪", hint: "audio" }, "audio"),
```

- [ ] **Step 2: Add the compact menu renderer**

Create `packages/markora/src/editor/slash/menu.ts`:

```ts
import type { MarkoraSlashCommand } from "./types";

export type MarkoraSlashMenuState = {
  commands: MarkoraSlashCommand[];
  activeIndex: number;
};

export type MarkoraSlashMenuCallbacks = {
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
};

const groupLabels: Record<MarkoraSlashCommand["group"], string> = {
  basic: "基本区块",
  media: "媒体",
};

export function createSlashMenuElement(
  state: MarkoraSlashMenuState,
  callbacks: MarkoraSlashMenuCallbacks
): HTMLElement {
  const root = document.createElement("div");
  root.className = "cm-markora-slash-menu";
  root.setAttribute("role", "listbox");

  if (state.commands.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cm-markora-slash-empty";
    empty.textContent = "没有匹配的命令";
    root.appendChild(empty);
    return root;
  }

  let currentGroup: MarkoraSlashCommand["group"] | null = null;

  for (const [index, command] of state.commands.entries()) {
    if (command.group !== currentGroup) {
      currentGroup = command.group;
      const label = document.createElement("div");
      label.className = "cm-markora-slash-group";
      label.textContent = groupLabels[currentGroup];
      root.appendChild(label);
    }

    const item = document.createElement("button");
    item.type = "button";
    item.className = index === state.activeIndex ? "cm-markora-slash-item cm-markora-slash-item-active" : "cm-markora-slash-item";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(index === state.activeIndex));
    item.addEventListener("mouseenter", () => callbacks.onHover(index));
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      callbacks.onSelect(index);
    });

    const icon = document.createElement("span");
    icon.className = "cm-markora-slash-icon";
    icon.textContent = command.icon;

    const title = document.createElement("span");
    title.className = "cm-markora-slash-title";
    title.textContent = command.title;

    const hint = document.createElement("span");
    hint.className = "cm-markora-slash-hint";
    hint.textContent = command.hint;

    item.append(icon, title, hint);
    root.appendChild(item);
  }

  const footer = document.createElement("div");
  footer.className = "cm-markora-slash-footer";
  footer.innerHTML = "<span>关闭菜单</span><span>esc</span>";
  root.appendChild(footer);

  return root;
}
```

- [ ] **Step 3: Add the slash extension**

Create `packages/markora/src/editor/slash/extension.ts`:

```ts
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { EditorView as CodeMirrorEditorView } from "@codemirror/view";
import type { MarkoraAttachmentKind, MarkoraAttachmentUploader } from "../attachments";
import { uploadAttachmentFile } from "../attachments";
import { defaultSlashCommands } from "./default-commands";
import { detectSlashQuery, filterSlashCommands } from "./query";
import { createSlashMenuElement } from "./menu";
import { slashMenuTheme } from "./theme";
import type { MarkoraSlashCommand, MarkoraSlashCommandsConfig, MarkoraSlashQuery } from "./types";

export type MarkoraSlashRuntimeConfig = MarkoraSlashCommandsConfig & {
  attachmentUploader?: MarkoraAttachmentUploader;
};

function requestFile(kind: MarkoraAttachmentKind): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      kind === "image" ? "image/*" : kind === "video" ? "video/*" : kind === "audio" ? "audio/*" : "*/*";
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.click();
  });
}

class SlashCommandViewPlugin {
  private query: MarkoraSlashQuery | null = null;
  private commands: MarkoraSlashCommand[] = [];
  private activeIndex = 0;
  private menu: HTMLElement | null = null;

  constructor(
    private readonly view: EditorView,
    private readonly config: Required<Pick<MarkoraSlashRuntimeConfig, "commands">> & MarkoraSlashRuntimeConfig
  ) {
    this.updateState();
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.selectionSet || update.viewportChanged) {
      this.updateState();
    }
  }

  destroy(): void {
    this.removeMenu();
  }

  move(delta: number): boolean {
    if (!this.query || this.commands.length === 0) return false;
    this.activeIndex = (this.activeIndex + delta + this.commands.length) % this.commands.length;
    this.renderMenu();
    return true;
  }

  close(): boolean {
    if (!this.query) return false;
    this.query = null;
    this.commands = [];
    this.removeMenu();
    return true;
  }

  selectActive(): boolean {
    if (!this.query || this.commands.length === 0) return false;
    return this.select(this.activeIndex);
  }

  private select(index: number): boolean {
    const command = this.commands[index];
    if (!this.query || !command) return false;

    const queryRange = { from: this.query.from, to: this.query.to };
    this.close();

    return command.run({
      view: this.view,
      queryRange,
      requestAttachment: (kind, context) => this.requestAttachment(kind, context.queryRange),
    });
  }

  private requestAttachment(kind: MarkoraAttachmentKind, queryRange: { from: number; to: number }): boolean {
    if (!this.config.attachmentUploader) {
      return false;
    }

    void requestFile(kind).then((file) => {
      if (!file || !this.config.attachmentUploader) return;
      void uploadAttachmentFile(this.view, file, {
        kind,
        source: "slash",
        range: queryRange,
        uploader: this.config.attachmentUploader,
      });
    });

    return true;
  }

  private updateState(): void {
    const cursor = this.view.state.selection.main.head;
    const query = detectSlashQuery(this.view.state.doc.toString(), cursor);

    if (!query) {
      this.query = null;
      this.commands = [];
      this.removeMenu();
      return;
    }

    this.query = query;
    this.commands = filterSlashCommands(this.config.commands, query.query);
    this.activeIndex = Math.min(this.activeIndex, Math.max(0, this.commands.length - 1));
    this.renderMenu();
  }

  private renderMenu(): void {
    if (!this.query) return;
    this.removeMenu();

    const coords = this.view.coordsAtPos(this.query.from);
    if (!coords) return;

    this.menu = createSlashMenuElement(
      { commands: this.commands, activeIndex: this.activeIndex },
      {
        onHover: (index) => {
          this.activeIndex = index;
          this.renderMenu();
        },
        onSelect: (index) => {
          this.select(index);
        },
      }
    );

    this.menu.style.left = `${coords.left}px`;
    this.menu.style.top = `${coords.bottom + 6}px`;
    document.body.appendChild(this.menu);
  }

  private removeMenu(): void {
    this.menu?.remove();
    this.menu = null;
  }
}

export function slashCommands(config: MarkoraSlashRuntimeConfig = {}): Extension[] {
  if (config.enabled === false) {
    return [];
  }

  const normalizedConfig = {
    commands: config.commands ?? defaultSlashCommands,
    attachmentUploader: config.attachmentUploader,
  };

  const plugin = ViewPlugin.define((view) => new SlashCommandViewPlugin(view, normalizedConfig));

  return [
    slashMenuTheme,
    plugin,
    CodeMirrorEditorView.domEventHandlers({
      keydown(event, view) {
        const value = view.plugin(plugin);
        if (!value) return false;

        if (event.key === "ArrowDown") {
          const handled = value.move(1);
          if (handled) event.preventDefault();
          return handled;
        }

        if (event.key === "ArrowUp") {
          const handled = value.move(-1);
          if (handled) event.preventDefault();
          return handled;
        }

        if (event.key === "Enter") {
          const handled = value.selectActive();
          if (handled) event.preventDefault();
          return handled;
        }

        if (event.key === "Escape") {
          const handled = value.close();
          if (handled) event.preventDefault();
          return handled;
        }

        return false;
      },
    }),
  ];
}
```

- [ ] **Step 4: Add compact slash menu theme**

Create `packages/markora/src/editor/slash/theme.ts`:

```ts
import { EditorView } from "@codemirror/view";

export const slashMenuTheme = EditorView.baseTheme({
  ".cm-markora-slash-menu": {
    position: "fixed",
    zIndex: "1000",
    width: "328px",
    maxHeight: "420px",
    overflowY: "auto",
    border: "1px solid rgba(120, 113, 108, 0.22)",
    borderRadius: "12px",
    background: "var(--markora-slash-bg, #ffffff)",
    boxShadow: "0 18px 48px rgba(15, 23, 42, 0.16)",
    padding: "8px 0 0",
    fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)",
  },
  ".cm-markora-slash-group": {
    padding: "8px 14px 6px",
    color: "var(--markora-slash-muted, #a8a29e)",
    fontSize: "12px",
    fontWeight: "700",
  },
  ".cm-markora-slash-item": {
    display: "grid",
    gridTemplateColumns: "34px 1fr auto",
    alignItems: "center",
    width: "100%",
    minHeight: "34px",
    border: "0",
    padding: "0 14px",
    background: "transparent",
    color: "var(--markora-slash-fg, #27272a)",
    textAlign: "left",
    cursor: "default",
  },
  ".cm-markora-slash-item-active": {
    background: "var(--markora-slash-active, #f4f4f5)",
  },
  ".cm-markora-slash-icon": {
    color: "var(--markora-slash-icon, #3f3f46)",
    fontSize: "14px",
    fontWeight: "650",
    textAlign: "center",
  },
  ".cm-markora-slash-title": {
    overflow: "hidden",
    color: "inherit",
    fontSize: "14px",
    fontWeight: "560",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ".cm-markora-slash-hint": {
    marginLeft: "12px",
    color: "var(--markora-slash-muted, #a8a29e)",
    fontSize: "12px",
    fontWeight: "600",
  },
  ".cm-markora-slash-footer": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: "40px",
    marginTop: "6px",
    borderTop: "1px solid rgba(120, 113, 108, 0.18)",
    padding: "0 14px",
    color: "var(--markora-slash-fg, #27272a)",
    fontSize: "14px",
  },
  ".cm-markora-slash-footer span:last-child": {
    color: "var(--markora-slash-muted, #a8a29e)",
    fontSize: "12px",
    fontWeight: "650",
  },
  ".cm-markora-slash-empty": {
    padding: "14px",
    color: "var(--markora-slash-muted, #a8a29e)",
    fontSize: "13px",
  },
  "&dark .cm-markora-slash-menu": {
    "--markora-slash-bg": "#18181b",
    "--markora-slash-fg": "#f4f4f5",
    "--markora-slash-muted": "#a1a1aa",
    "--markora-slash-active": "#27272a",
    "--markora-slash-icon": "#e4e4e7",
  },
});
```

- [ ] **Step 5: Export slash extension and theme**

Modify `packages/markora/src/editor/slash/index.ts`:

```ts
export * from "./types";
export * from "./query";
export * from "./insertions";
export * from "./default-commands";
export * from "./menu";
export * from "./theme";
export * from "./extension";
```

- [ ] **Step 6: Run core tests and typecheck**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora test
pnpm --config.package-manager-strict=false --filter markora typecheck
```

Expected: tests PASS and typecheck PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/markora/src/editor/slash
git commit -m "feat(editor): 添加斜杆菜单扩展"
```

## Task 6: Compose Slash and Attachments in `markora()`

**Files:**
- Modify: `packages/markora/src/editor/markora.ts`
- Modify: `packages/markora/src/editor/index.ts`
- Modify: `packages/markora/tests/slash-insertions.spec.ts`

- [ ] **Step 1: Add config coverage test**

Append to `packages/markora/tests/slash-insertions.spec.ts`:

```ts
import { markora } from "../src/editor";

describe("markora extension composition", () => {
  it("returns extensions when slash commands and attachments are enabled", () => {
    const extensions = markora({
      slashCommands: { enabled: true },
      attachments: {
        enabled: true,
        uploader: async () => ({ url: "https://cdn/file.png" }),
      },
    });

    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
  });

  it("allows slash commands and attachments to be disabled", () => {
    const extensions = markora({
      slashCommands: { enabled: false },
      attachments: { enabled: false },
    });

    expect(Array.isArray(extensions)).toBe(true);
  });
});
```

- [ ] **Step 2: Run failing composition test**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora test -- slash-insertions.spec.ts
```

Expected: FAIL because `MarkoraConfig` does not include `slashCommands` and `attachments`.

- [ ] **Step 3: Add config fields and compose extensions**

Modify imports at the top of `packages/markora/src/editor/markora.ts`:

```ts
import type { MarkoraSlashCommandsConfig } from "./slash";
import { slashCommands } from "./slash";
import type { MarkoraAttachmentsConfig } from "./attachments";
import { attachments } from "./attachments";
```

Add fields to `MarkoraConfig`:

```ts
  /** Slash command menu configuration */
  slashCommands?: MarkoraSlashCommandsConfig;

  /** Browser attachment upload configuration */
  attachments?: MarkoraAttachmentsConfig;
```

Destructure the fields inside `markora()`:

```ts
    slashCommands: configSlashCommands = { enabled: true },
    attachments: configAttachments = { enabled: false },
```

Add extension composition before `pluginExtensions`:

```ts
    slashCommands({
      ...configSlashCommands,
      attachmentUploader: configAttachments.uploader,
    }),
    attachments(configAttachments),
```

The `composedExtensions` section should include the new entries:

```ts
  const composedExtensions: Extension[] = [
    Prec.high(markdownSupport),
    Prec.high(keymap.of(markdownKeymap)),
    markoraExtensions,
    baseExtensions,
    slashCommands({
      ...configSlashCommands,
      attachmentUploader: configAttachments.uploader,
    }),
    attachments(configAttachments),
    pluginExtensions,
    pluginKeymaps.length > 0 ? keymap.of(pluginKeymaps) : [],
    configKeymap.length > 0 ? keymap.of(configKeymap) : [],
    extensions,
  ];
```

- [ ] **Step 4: Export new modules from editor index**

Modify `packages/markora/src/editor/index.ts`:

```ts
export * from "./markora";
export * from "./plugin";
export * from "./utils";
export * from "./theme";
export * from "./slash";
export * from "./attachments";
```

Keep `packages/markora/src/index.ts` unchanged if it already exports `./editor`.

- [ ] **Step 5: Run core checks**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora test
pnpm --config.package-manager-strict=false --filter markora lint
pnpm --config.package-manager-strict=false --filter markora typecheck
pnpm --config.package-manager-strict=false --filter markora build
```

Expected: PASS for tests, lint, typecheck, and build.

- [ ] **Step 6: Commit**

```bash
git add packages/markora/src/editor packages/markora/tests/slash-insertions.spec.ts
git commit -m "feat(editor): 集成斜杆菜单与附件配置"
```

## Task 7: Integrate React Playground

**Files:**
- Modify: `playground/react-playground/app/playground/page.tsx`
- Modify: `playground/react-playground/app/playground/devbar.tsx`
- Modify: `playground/react-playground/app/data/md/walkthrough.ts`

- [ ] **Step 1: Add playground config fields**

Modify the `PlaygroundConfig` type in `playground/react-playground/app/playground/page.tsx`:

```ts
export type PlaygroundConfig = {
  editor: {
    baseStyles: boolean;
    defaultKeybindings: boolean;
    history: boolean;
    indentWithTab: boolean;
    highlightActiveLine: boolean;
    lineWrapping: boolean;
  };
  preview: {
    includeBase: boolean;
    sanitize: boolean;
  };
  features: {
    slashCommands: boolean;
    attachments: boolean;
    pasteDropUploads: boolean;
  };
  plugins: PluginConfig;
};
```

Modify `defaultConfig`:

```ts
const defaultConfig: PlaygroundConfig = {
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
  },
  features: {
    slashCommands: true,
    attachments: true,
    pasteDropUploads: true,
  },
  plugins: defaultPluginConfig,
};
```

- [ ] **Step 2: Add mock uploader lifecycle**

Add these refs and helper inside `Page()` in `playground/react-playground/app/playground/page.tsx`:

```ts
const objectUrlsRef = useRef<string[]>([]);

const mockUploader = useCallback(async (file: File) => {
  const url = URL.createObjectURL(file);
  objectUrlsRef.current.push(url);
  return {
    url,
    name: file.name,
    mimeType: file.type,
  };
}, []);

useEffect(() => {
  return () => {
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current = [];
  };
}, []);
```

- [ ] **Step 3: Pass slash and attachment config to `markora()`**

Modify the `markora({ ... })` call in `playground/react-playground/app/playground/page.tsx`:

```ts
slashCommands: {
  enabled: config.features.slashCommands,
},
attachments: {
  enabled: config.features.attachments,
  uploader: config.features.attachments ? mockUploader : undefined,
  enablePaste: config.features.pasteDropUploads,
  enableDrop: config.features.pasteDropUploads,
  accept: {
    image: ["image/*"],
    video: ["video/*"],
    audio: ["audio/*"],
    file: ["*/*"],
  },
},
```

Add `mockUploader` and `config.features` to the `useMemo` dependency list for `defaultExtensions`.

- [ ] **Step 4: Add feature switches to the React devbar**

In `playground/react-playground/app/playground/devbar.tsx`, add a "Feature Options" accordion section using the existing switch row pattern:

```tsx
<AccordionItem value="features">
  <AccordionTrigger>Feature Options</AccordionTrigger>
  <AccordionContent>
    <OptionSwitch
      label="Slash Commands"
      description="Open the command menu with line-start slash input"
      checked={config.features.slashCommands}
      onCheckedChange={(checked) =>
        setConfig((current) => ({
          ...current,
          features: { ...current.features, slashCommands: checked },
        }))
      }
    />
    <OptionSwitch
      label="Attachments"
      description="Enable local file selection through media commands"
      checked={config.features.attachments}
      onCheckedChange={(checked) =>
        setConfig((current) => ({
          ...current,
          features: { ...current.features, attachments: checked },
        }))
      }
    />
    <OptionSwitch
      label="Paste/Drop Uploads"
      description="Upload pasted or dropped files with the mock uploader"
      checked={config.features.pasteDropUploads}
      onCheckedChange={(checked) =>
        setConfig((current) => ({
          ...current,
          features: { ...current.features, pasteDropUploads: checked },
        }))
      }
    />
  </AccordionContent>
</AccordionItem>
```

- [ ] **Step 5: Document React playground behavior**

Append this section to `playground/react-playground/app/data/md/walkthrough.ts` near the editor feature overview:

```md
## Slash Commands and Attachments

Type \`/\` at the start of an empty line to open Markora's compact command menu. Use arrow keys to move through commands, Enter to insert, and Esc to close the menu.

Media commands use the browser attachment protocol. In this playground, uploads are mocked with local \`blob:\` URLs so the result previews immediately. Production apps should provide an uploader that stores the file in a backend, OSS, or MinIO-compatible service and returns a public URL.

You can also paste or drag files into the editor. Markora inserts an upload marker, calls the configured uploader, and replaces the marker with Markdown or HTML when the upload succeeds.
```

- [ ] **Step 6: Run React checks**

Run:

```bash
pnpm --config.package-manager-strict=false --filter web typecheck
pnpm --config.package-manager-strict=false --filter web build
```

Expected: typecheck PASS and build PASS. If `next lint` is unavailable in Next 16, record that `web` lint is not executable and use typecheck/build as the gate.

- [ ] **Step 7: Commit**

```bash
git add playground/react-playground/app/playground/page.tsx playground/react-playground/app/playground/devbar.tsx playground/react-playground/app/data/md/walkthrough.ts
git commit -m "feat(playground): 接入斜杆菜单与附件上传"
```

## Task 8: Integrate Vue2 Playground

**Files:**
- Modify: `playground/vue2-playground/src/types.ts`
- Modify: `playground/vue2-playground/src/state/playgroundConfig.ts`
- Modify: `playground/vue2-playground/src/components/playground/Devbar.vue`
- Modify: `playground/vue2-playground/src/components/playground/EditorPane.vue`
- Modify: `playground/vue2-playground/src/shims-markora.d.ts`
- Modify: `playground/vue2-playground/src/data/md/walkthrough.ts`

- [ ] **Step 1: Add Vue2 feature config types**

Modify `playground/vue2-playground/src/types.ts` so `PlaygroundConfig` contains:

```ts
  features: {
    slashCommands: boolean;
    attachments: boolean;
    pasteDropUploads: boolean;
  };
```

- [ ] **Step 2: Add Vue2 default feature config**

Modify `playground/vue2-playground/src/state/playgroundConfig.ts` default config:

```ts
features: {
  slashCommands: true,
  attachments: true,
  pasteDropUploads: true,
},
```

Update the unit test in `playground/vue2-playground/tests/unit/playgroundConfig.spec.ts`:

```ts
it("enables slash commands and attachment features by default", () => {
  expect(defaultConfig.features).toEqual({
    slashCommands: true,
    attachments: true,
    pasteDropUploads: true,
  });
});
```

- [ ] **Step 3: Add mock uploader to `EditorPane.vue`**

In `playground/vue2-playground/src/components/playground/EditorPane.vue`, add `objectUrls` to `data()`:

```ts
objectUrls: [] as string[],
```

Add cleanup in `beforeDestroy()`:

```ts
for (const url of this.objectUrls) {
  URL.revokeObjectURL(url);
}
this.objectUrls = [];
```

Add a method:

```ts
async mockUploader(file: File) {
  const url = URL.createObjectURL(file);
  this.objectUrls.push(url);
  return {
    url,
    name: file.name,
    mimeType: file.type,
  };
},
```

- [ ] **Step 4: Pass slash and attachment config in Vue2**

Modify the `markora({ ... })` call in `EditorPane.vue`:

```ts
slashCommands: {
  enabled: this.config.features.slashCommands,
},
attachments: {
  enabled: this.config.features.attachments,
  uploader: this.config.features.attachments ? this.mockUploader : undefined,
  enablePaste: this.config.features.pasteDropUploads,
  enableDrop: this.config.features.pasteDropUploads,
  accept: {
    image: ["image/*"],
    video: ["video/*"],
    audio: ["audio/*"],
    file: ["*/*"],
  },
},
```

- [ ] **Step 5: Update Vue2 markora shim if needed**

If Vue2 lint or build cannot see the new package exports, update `playground/vue2-playground/src/shims-markora.d.ts` inside `declare module "markora/editor"`:

```ts
  export type MarkoraAttachmentKind = "image" | "video" | "audio" | "file";

  export type MarkoraAttachmentUploadContext = {
    kind: MarkoraAttachmentKind;
    source: "slash" | "paste" | "drop" | "api";
    documentText: string;
    selection: { from: number; to: number };
  };

  export type MarkoraAttachmentUploadResult = {
    url: string;
    name?: string;
    title?: string;
    mimeType?: string;
  };

  export type MarkoraAttachmentUploader = (
    file: File,
    context: MarkoraAttachmentUploadContext
  ) => Promise<MarkoraAttachmentUploadResult>;
```

And extend the `markora(config?: { ... })` shape:

```ts
    slashCommands?: {
      enabled?: boolean;
    };
    attachments?: {
      enabled?: boolean;
      uploader?: MarkoraAttachmentUploader;
      enablePaste?: boolean;
      enableDrop?: boolean;
      accept?: Partial<Record<MarkoraAttachmentKind, string[]>>;
    };
```

- [ ] **Step 6: Add feature switches to `Devbar.vue`**

In `playground/vue2-playground/src/components/playground/Devbar.vue`, add a "Feature Options" section with three switch rows following the existing section pattern:

```vue
<div class="devbar-section">
  <button class="section-header" type="button" @click="toggleSection('features')">
    <span>Feature Options</span>
    <span>{{ openSections.features ? '^' : 'v' }}</span>
  </button>
  <div v-if="openSections.features" class="section-content">
    <label class="switch-row">
      <span>
        <strong>Slash Commands</strong>
        <small>Open the command menu with line-start slash input</small>
      </span>
      <input
        type="checkbox"
        :checked="config.features.slashCommands"
        @change="updateFeature('slashCommands', ($event.target as HTMLInputElement).checked)"
      />
    </label>
    <label class="switch-row">
      <span>
        <strong>Attachments</strong>
        <small>Enable local file selection through media commands</small>
      </span>
      <input
        type="checkbox"
        :checked="config.features.attachments"
        @change="updateFeature('attachments', ($event.target as HTMLInputElement).checked)"
      />
    </label>
    <label class="switch-row">
      <span>
        <strong>Paste/Drop Uploads</strong>
        <small>Upload pasted or dropped files with the mock uploader</small>
      </span>
      <input
        type="checkbox"
        :checked="config.features.pasteDropUploads"
        @change="updateFeature('pasteDropUploads', ($event.target as HTMLInputElement).checked)"
      />
    </label>
  </div>
</div>
```

Add the method:

```ts
updateFeature(key: "slashCommands" | "attachments" | "pasteDropUploads", value: boolean) {
  this.$emit("update-config", {
    ...this.config,
    features: {
      ...this.config.features,
      [key]: value,
    },
  });
},
```

- [ ] **Step 7: Document Vue2 playground behavior**

Append this section to `playground/vue2-playground/src/data/md/walkthrough.ts`:

```md
## Slash Commands and Attachments

Type \`/\` at the start of an empty line to open Markora's compact command menu. Use arrow keys to move through commands, Enter to insert, and Esc to close the menu.

This Vue2 playground uses the same core Markora attachment protocol as the React playground. Uploads are mocked with local \`blob:\` URLs, so they are useful for local preview but are not persistent. Production Vue2 integrations should provide an uploader that stores the file in a backend, OSS, or MinIO-compatible service and returns a URL.

Pasted and dropped files also use this uploader when Paste/Drop Uploads is enabled.
```

- [ ] **Step 8: Run Vue2 checks**

Run:

```bash
pnpm --config.package-manager-strict=false --filter vue2-playground test:unit
pnpm --config.package-manager-strict=false --filter vue2-playground lint
pnpm --config.package-manager-strict=false --filter vue2-playground build
```

Expected: unit tests PASS, lint PASS, build PASS.

- [ ] **Step 9: Commit**

```bash
git add playground/vue2-playground/src playground/vue2-playground/tests/unit/playgroundConfig.spec.ts
git commit -m "feat(playground): 在 Vue2 演示站点接入斜杆菜单"
```

## Task 9: Document Core Integration

**Files:**
- Modify: `packages/markora/README.md`
- Modify: `packages/markora/CHANGELOG.md`

- [ ] **Step 1: Add README integration docs**

Add this section to `packages/markora/README.md` after the basic editor setup:

````md
## Slash Commands

Markora includes a compact slash command menu for common Markdown blocks. Type `/` at the start of an empty line or line-start query to open the menu.

```ts
import { markora } from "markora/editor";
import { allPlugins } from "markora/plugins";

const extensions = markora({
  plugins: allPlugins,
  slashCommands: {
    enabled: true,
  },
});
```

The default menu includes text, headings 1-6, quote, ordered list, unordered list, task list, table, divider, link, file, image, video, and audio commands.

## Attachments

Attachment uploads are provided by the host application. Markora receives a browser `File`, calls your uploader, and inserts Markdown or HTML when the upload succeeds.

```ts
const extensions = markora({
  attachments: {
    enabled: true,
    uploader: async (file, context) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", context.kind);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      return {
        url: result.url,
        name: file.name,
        mimeType: file.type,
      };
    },
    accept: {
      image: ["image/*"],
      video: ["video/*"],
      audio: ["audio/*"],
      file: ["*/*"],
    },
  },
});
```

Images are inserted as `![name](url)`, videos as `<video src="url" controls></video>`, audio as `<audio src="url" controls></audio>`, and files as `[name](url)`.
````

- [ ] **Step 2: Add changelog entry**

Add this entry near the top of `packages/markora/CHANGELOG.md`:

```md
## Unreleased

- Added a framework-agnostic slash command menu for common Markdown block insertion.
- Added an attachment upload protocol for slash media commands, paste, and drag-and-drop.
```

- [ ] **Step 3: Run doc-sensitive checks**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora typecheck
pnpm --config.package-manager-strict=false --filter markora build
```

Expected: typecheck PASS and build PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/markora/README.md packages/markora/CHANGELOG.md
git commit -m "docs(editor): 说明斜杆菜单与附件上传协议"
```

## Task 10: Final Verification and Browser QA

**Files:**
- No source files expected.
- Use Browser plugin for local React and Vue2 playground checks.

- [ ] **Step 1: Run repository gates**

Run:

```bash
pnpm --config.package-manager-strict=false --filter markora test
pnpm --config.package-manager-strict=false --filter markora lint
pnpm --config.package-manager-strict=false --filter markora typecheck
pnpm --config.package-manager-strict=false --filter markora build
pnpm --config.package-manager-strict=false --filter web typecheck
pnpm --config.package-manager-strict=false --filter web build
pnpm --config.package-manager-strict=false --filter vue2-playground test:unit
pnpm --config.package-manager-strict=false --filter vue2-playground lint
pnpm --config.package-manager-strict=false --filter vue2-playground build
git diff --check
```

Expected: all commands PASS. If `web` build reports known Next.js warnings without failing, record the warnings in the implementation summary.

- [ ] **Step 2: Verify React playground in browser**

Start the React playground:

```bash
pnpm --config.package-manager-strict=false --filter web dev
```

Open the reported local URL in Browser and verify:

- type `/` on an empty line opens the compact menu;
- type `/标题` filters to heading commands;
- `ArrowDown`, `ArrowUp`, `Enter`, and `Esc` work;
- selecting Heading 2 inserts `## `;
- selecting Image opens a file picker;
- dropping or pasting an image inserts an upload marker and then a `blob:` URL image;
- disabling Slash Commands hides the menu;
- disabling Paste/Drop Uploads stops paste/drop upload handling.

Stop the dev server after verification.

- [ ] **Step 3: Verify Vue2 playground in browser**

Start the Vue2 playground:

```bash
pnpm --config.package-manager-strict=false --filter vue2-playground dev
```

Open the reported local URL in Browser and verify:

- type `/` on an empty line opens the compact menu;
- type `/图` filters to the image command;
- `ArrowDown`, `ArrowUp`, `Enter`, and `Esc` work;
- selecting Table inserts the Markdown table template;
- selecting File opens a file picker and inserts a `blob:` URL link after mock upload;
- disabling Slash Commands hides the menu;
- disabling Attachments keeps non-media commands working and prevents file selection upload.

Stop the dev server after verification.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git status --short
git diff --stat HEAD
git diff -- packages/markora/src/editor/markora.ts packages/markora/src/editor/slash packages/markora/src/editor/attachments
```

Expected:

- only intended files are modified;
- no `.superpowers/` files are staged;
- no independent lockfile such as `package-lock.json` or `pnpm-lock.yaml` was added.

- [ ] **Step 5: Commit verification-only cleanup if needed**

If final verification requires small source or doc fixes, commit them:

```bash
git add <fixed-files>
git commit -m "fix(editor): 修正斜杆菜单验证问题"
```

If no source or doc fixes are needed, do not create an empty commit.
